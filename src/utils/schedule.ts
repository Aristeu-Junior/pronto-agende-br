import {
  Appointment,
  BusinessConfig,
  DaySchedule,
  ServiceItem,
  StaffMember,
  WorkSchedule,
} from '../types';

export const WEEKDAY_SHORT = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
export const WEEKDAY_LONG = [
  'Domingo',
  'Segunda',
  'Terça',
  'Quarta',
  'Quinta',
  'Sexta',
  'Sábado',
];
export const MONTH_NAMES = [
  'Janeiro',
  'Fevereiro',
  'Março',
  'Abril',
  'Maio',
  'Junho',
  'Julho',
  'Agosto',
  'Setembro',
  'Outubro',
  'Novembro',
  'Dezembro',
];

const pad = (n: number) => String(n).padStart(2, '0');

/** Data local YYYY-MM-DD. Não usa UTC: evita virar o dia às 21h no Brasil. */
export function localISODate(d: Date = new Date()): string {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

/** YYYY-MM-DD para Date local ao meio-dia (evita erro de fuso no dia da semana). */
export function parseISODate(iso: string): Date {
  const [y, m, d] = iso.split('-').map(Number);
  return new Date(y, (m || 1) - 1, d || 1, 12, 0, 0, 0);
}

export function addDaysISO(iso: string, days: number): string {
  const d = parseISODate(iso);
  d.setDate(d.getDate() + days);
  return localISODate(d);
}

export function weekdayOf(iso: string): number {
  return parseISODate(iso).getDay();
}

export function formatDateBR(iso: string): string {
  const [y, m, d] = iso.split('-');
  return `${d}/${m}/${y}`;
}

export function formatDateLong(iso: string): string {
  const d = parseISODate(iso);
  return `${WEEKDAY_LONG[d.getDay()]}, ${pad(d.getDate())}/${pad(d.getMonth() + 1)}`;
}

export function timeToMin(t: string): number {
  const [h, m] = t.split(':').map(Number);
  return (h || 0) * 60 + (m || 0);
}

export function minToTime(min: number): string {
  return `${pad(Math.floor(min / 60))}:${pad(min % 60)}`;
}

export const SLOT_INTERVAL_OPTIONS = [10, 15, 20, 30, 40, 45, 60];

export function defaultSchedule(): WorkSchedule {
  const workday = (): DaySchedule => ({
    enabled: true,
    start: '09:00',
    end: '19:00',
    breakStart: '12:00',
    breakEnd: '13:00',
  });
  const off = (): DaySchedule => ({ enabled: false, start: '09:00', end: '13:00' });
  return {
    days: [off(), workday(), workday(), workday(), workday(), workday(), off()],
    slotIntervalMinutes: 30,
    blockedDates: [],
  };
}

/** Escala do profissional. Completa o que faltar em dados salvos antes deste recurso. */
export function getSchedule(staff?: StaffMember): WorkSchedule {
  const base = defaultSchedule();
  const s = staff?.schedule;
  if (!s) return base;
  const days = base.days.map((d, i) => ({ ...d, ...(s.days?.[i] ?? {}) }));
  const interval = SLOT_INTERVAL_OPTIONS.includes(s.slotIntervalMinutes)
    ? s.slotIntervalMinutes
    : base.slotIntervalMinutes;
  return {
    days,
    slotIntervalMinutes: interval,
    blockedDates: Array.isArray(s.blockedDates) ? s.blockedDates : [],
  };
}

export type DayState = 'OPEN' | 'DAY_OFF' | 'BLOCKED';

export function getDayState(staff: StaffMember | undefined, iso: string): DayState {
  const sch = getSchedule(staff);
  if (sch.blockedDates.includes(iso)) return 'BLOCKED';
  const day = sch.days[weekdayOf(iso)];
  if (!day?.enabled || timeToMin(day.end) <= timeToMin(day.start)) return 'DAY_OFF';
  return 'OPEN';
}

/** Duração total e folga final de um conjunto de serviços. */
export function servicesSpan(services: ServiceItem[]): {
  duration: number;
  buffer: number;
} {
  const duration = services.reduce((acc, s) => acc + s.durationMinutes, 0);
  const buffer = services.reduce((acc, s) => Math.max(acc, s.bufferAfterMinutes), 0);
  return { duration: duration || 30, buffer };
}

export interface SlotQuery {
  staff: StaffMember | undefined;
  date: string;
  durationMinutes: number;
  bufferMinutes?: number;
  appointments: Appointment[];
  /** momento atual, injetável para teste */
  now?: Date;
  minNoticeMinutes?: number;
  /** agendamento a ignorar (ao reagendar) */
  ignoreAppointmentId?: string;
}

const isActive = (a: Appointment) => a.status !== 'CANCELLED' && a.status !== 'NO_SHOW';

/** Horários de início livres no dia: escala, intervalo, pausa, agendamentos e antecedência. */
export function getFreeSlots(q: SlotQuery): string[] {
  if (!q.staff) return [];
  if (getDayState(q.staff, q.date) !== 'OPEN') return [];
  const now = q.now ?? new Date();
  if (q.date < localISODate(now)) return [];

  const sch = getSchedule(q.staff);
  const day = sch.days[weekdayOf(q.date)];
  const open = timeToMin(day.start);
  const close = timeToMin(day.end);
  const hasBreak =
    !!day.breakStart && !!day.breakEnd && timeToMin(day.breakEnd) > timeToMin(day.breakStart);
  const brStart = hasBreak ? timeToMin(day.breakStart as string) : 0;
  const brEnd = hasBreak ? timeToMin(day.breakEnd as string) : 0;
  const step = Math.max(5, sch.slotIntervalMinutes);
  const need = q.durationMinutes;
  const buffer = q.bufferMinutes ?? 0;
  const notice = q.minNoticeMinutes ?? 0;
  const limit = now.getTime() + notice * 60000;

  const busy = q.appointments
    .filter(
      (a) =>
        a.staffId === q.staff!.id &&
        a.date === q.date &&
        isActive(a) &&
        a.id !== q.ignoreAppointmentId
    )
    .map((a) => [timeToMin(a.startTime), timeToMin(a.endTime)] as const);

  const slots: string[] = [];
  for (let start = open; start + need <= close; start += step) {
    const end = start + need;
    if (hasBreak && start < brEnd && end > brStart) continue;
    // a folga vale dos dois lados, igual à restrição no_overlap do servidor
    if (busy.some(([bs, be]) => start < be + buffer && end + buffer > bs)) continue;
    const when = parseISODate(q.date);
    when.setHours(Math.floor(start / 60), start % 60, 0, 0);
    if (when.getTime() < limit) continue;
    slots.push(minToTime(start));
  }
  return slots;
}

/** Conflito entre um horário manual e outro agendamento do mesmo profissional. */
export function hasConflict(
  appointments: Appointment[],
  staffId: string,
  date: string,
  startTime: string,
  endTime: string,
  ignoreId?: string
): boolean {
  const s = timeToMin(startTime);
  const e = timeToMin(endTime);
  return appointments.some(
    (a) =>
      a.staffId === staffId &&
      a.date === date &&
      isActive(a) &&
      a.id !== ignoreId &&
      s < timeToMin(a.endTime) &&
      e > timeToMin(a.startTime)
  );
}

/** Primeiro e último dia reservável pelo cliente. */
export function bookingWindow(
  business: Pick<BusinessConfig, 'maxAdvanceDays'>,
  now: Date = new Date()
): { min: string; max: string } {
  const today = localISODate(now);
  const maxDays =
    business.maxAdvanceDays && business.maxAdvanceDays > 0 ? business.maxAdvanceDays : 30;
  return { min: today, max: addDaysISO(today, maxDays) };
}

export function weekSummary(staff: StaffMember | undefined): string {
  const sch = getSchedule(staff);
  const parts: string[] = [];
  sch.days.forEach((d, i) => {
    if (d.enabled) parts.push(`${WEEKDAY_SHORT[i]} ${d.start}–${d.end}`);
  });
  return parts.length ? parts.join(' · ') : 'Sem dias de atendimento';
}
