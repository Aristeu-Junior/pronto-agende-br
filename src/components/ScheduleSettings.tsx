import React, { useState } from 'react';
import { CalendarBlank, Plus, X } from '@phosphor-icons/react';
import { BusinessConfig, DaySchedule, StaffMember, WorkSchedule } from '../types';
import {
  SLOT_INTERVAL_OPTIONS,
  WEEKDAY_LONG,
  formatDateBR,
  getSchedule,
  localISODate,
  minToTime,
  timeToMin,
} from '../utils/schedule';

interface ScheduleSettingsProps {
  staff: StaffMember[];
  business: BusinessConfig;
  onUpdateStaff: (staffId: string, patch: Partial<StaffMember>) => void;
  onUpdateBusiness: (patch: Partial<BusinessConfig>) => void;
}

const NOTICE_OPTIONS = [
  { value: 0, label: 'Sem antecedência' },
  { value: 30, label: '30 minutos' },
  { value: 60, label: '1 hora' },
  { value: 120, label: '2 horas' },
  { value: 240, label: '4 horas' },
  { value: 1440, label: '1 dia' },
];

const WINDOW_OPTIONS = [7, 14, 30, 60, 90];

const inputCls =
  'w-full rounded-lg border border-stone-800 bg-stone-900 px-2.5 py-1.5 text-xs text-stone-100 focus:border-amber-500 focus:outline-none';

export const ScheduleSettings: React.FC<ScheduleSettingsProps> = ({
  staff,
  business,
  onUpdateStaff,
  onUpdateBusiness,
}) => {
  const professionals = staff.filter((s) => s.role === 'PROFESSIONAL');
  const [staffId, setStaffId] = useState(professionals[0]?.id ?? '');
  const [newBlocked, setNewBlocked] = useState('');
  const current = professionals.find((s) => s.id === staffId) ?? professionals[0];
  const schedule = getSchedule(current);

  const save = (next: WorkSchedule) => {
    if (!current) return;
    const firstOpen = next.days.find((d) => d.enabled);
    onUpdateStaff(current.id, {
      schedule: next,
      workingHours: firstOpen ? `${firstOpen.start} - ${firstOpen.end}` : 'Sem atendimento',
    });
  };

  const patchDay = (index: number, patch: Partial<DaySchedule>) => {
    const days = schedule.days.map((d, i) => (i === index ? { ...d, ...patch } : d));
    save({ ...schedule, days });
  };

  const weekdays = () => {
    const pattern = schedule.days[1];
    save({
      ...schedule,
      days: schedule.days.map((d, i) =>
        i >= 1 && i <= 5 ? { ...pattern, enabled: true } : { ...d, enabled: false }
      ),
    });
  };

  const addBlocked = () => {
    if (!newBlocked || schedule.blockedDates.includes(newBlocked)) return;
    save({ ...schedule, blockedDates: [...schedule.blockedDates, newBlocked].sort() });
    setNewBlocked('');
  };

  const removeBlocked = (iso: string) =>
    save({ ...schedule, blockedDates: schedule.blockedDates.filter((d) => d !== iso) });

  if (!current) {
    return (
      <section className="rounded-2xl border border-stone-800 bg-stone-900 p-5">
        <h2 className="text-base font-bold text-stone-100">Escala de Trabalho</h2>
        <p className="mt-1 text-xs text-stone-400">Cadastre um barbeiro para definir a escala.</p>
      </section>
    );
  }

  return (
    <section className="rounded-2xl border border-stone-800 bg-stone-900 p-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex items-start gap-2.5">
          <CalendarBlank className="mt-0.5 h-5 w-5 text-amber-700" />
          <div>
            <h2 className="text-base font-bold text-stone-100">Escala de Trabalho</h2>
            <p className="text-xs text-stone-400">
              Defina os dias, o horário e o intervalo entre atendimentos. O cliente só enxerga os horários livres
              dentro da escala.
            </p>
          </div>
        </div>
        {professionals.length > 1 && (
          <select
            value={current.id}
            onChange={(e) => setStaffId(e.target.value)}
            aria-label="Barbeiro"
            className={`${inputCls} sm:w-56`}
          >
            {professionals.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>
        )}
      </div>

      <div className="mt-4 grid gap-5 lg:grid-cols-2">
        <div>
          <div className="mb-2 flex items-center justify-between">
            <h3 className="text-xs font-semibold uppercase tracking-wide text-stone-300">Dias e horários</h3>
            <button
              type="button"
              onClick={weekdays}
              className="text-xs font-semibold text-amber-700 hover:text-amber-800 cursor-pointer"
            >
              Aplicar segunda a sexta
            </button>
          </div>
          <div className="divide-y divide-stone-800/60 rounded-xl border border-stone-800">
            {schedule.days.map((d, i) => {
              const invalid = d.enabled && timeToMin(d.end) <= timeToMin(d.start);
              const hasBreak = !!d.breakStart && !!d.breakEnd;
              return (
                <div key={i} className="px-3 py-2.5">
                  <div className="flex items-center gap-3">
                    <label className="flex w-28 shrink-0 items-center gap-2 text-xs font-medium text-stone-200 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={d.enabled}
                        onChange={(e) => patchDay(i, { enabled: e.target.checked })}
                      />
                      {WEEKDAY_LONG[i]}
                    </label>
                    {d.enabled ? (
                      <div className="flex flex-1 items-center gap-1.5">
                        <input
                          type="time"
                          value={d.start}
                          aria-label={`Início ${WEEKDAY_LONG[i]}`}
                          onChange={(e) => patchDay(i, { start: e.target.value })}
                          className={inputCls}
                        />
                        <span className="text-xs text-stone-500">às</span>
                        <input
                          type="time"
                          value={d.end}
                          aria-label={`Fim ${WEEKDAY_LONG[i]}`}
                          onChange={(e) => patchDay(i, { end: e.target.value })}
                          className={inputCls}
                        />
                      </div>
                    ) : (
                      <span className="text-xs text-stone-500">Folga</span>
                    )}
                  </div>
                  {d.enabled && (
                    <div className="mt-1.5 flex items-center gap-2 pl-[7.75rem]">
                      {hasBreak ? (
                        <>
                          <span className="text-[11px] text-stone-400">Pausa</span>
                          <input
                            type="time"
                            value={d.breakStart}
                            aria-label={`Início da pausa ${WEEKDAY_LONG[i]}`}
                            onChange={(e) => patchDay(i, { breakStart: e.target.value })}
                            className={`${inputCls} !w-24`}
                          />
                          <span className="text-[11px] text-stone-500">às</span>
                          <input
                            type="time"
                            value={d.breakEnd}
                            aria-label={`Fim da pausa ${WEEKDAY_LONG[i]}`}
                            onChange={(e) => patchDay(i, { breakEnd: e.target.value })}
                            className={`${inputCls} !w-24`}
                          />
                          <button
                            type="button"
                            aria-label="Remover pausa"
                            onClick={() => patchDay(i, { breakStart: '', breakEnd: '' })}
                            className="text-stone-500 hover:text-amber-700 cursor-pointer"
                          >
                            <X className="h-3.5 w-3.5" />
                          </button>
                        </>
                      ) : (
                        <button
                          type="button"
                          onClick={() => patchDay(i, { breakStart: '12:00', breakEnd: '13:00' })}
                          className="text-[11px] font-semibold text-amber-700 hover:text-amber-800 cursor-pointer"
                        >
                          + Adicionar pausa (almoço)
                        </button>
                      )}
                    </div>
                  )}
                  {invalid && (
                    <p className="mt-1 pl-[7.75rem] text-[11px] font-medium text-rose-700">
                      O fim precisa ser depois do início.
                    </p>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        <div className="space-y-5">
          <div>
            <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-stone-300">
              Intervalo entre horários
            </h3>
            <div className="flex flex-wrap gap-1.5">
              {SLOT_INTERVAL_OPTIONS.map((m) => (
                <button
                  key={m}
                  type="button"
                  onClick={() => save({ ...schedule, slotIntervalMinutes: m })}
                  className={`rounded-lg border px-3 py-1.5 text-xs font-semibold cursor-pointer ${
                    schedule.slotIntervalMinutes === m
                      ? 'border-amber-500 bg-amber-500 text-stone-950'
                      : 'border-stone-800 text-stone-300 hover:border-amber-500'
                  }`}
                >
                  {m} min
                </button>
              ))}
            </div>
            <p className="mt-1.5 text-[11px] text-stone-400">
              Os horários aparecem de {schedule.slotIntervalMinutes} em {schedule.slotIntervalMinutes} minutos, por
              exemplo {minToTime(15 * 60 + 30)}, {minToTime(15 * 60 + 30 + schedule.slotIntervalMinutes)}, {minToTime(15 * 60 + 30 + 2 * schedule.slotIntervalMinutes)}…
            </p>
          </div>

          <div>
            <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-stone-300">
              Folgas e feriados
            </h3>
            <div className="flex gap-2">
              <input
                type="date"
                value={newBlocked}
                min={localISODate()}
                onChange={(e) => setNewBlocked(e.target.value)}
                aria-label="Data da folga"
                className={inputCls}
              />
              <button
                type="button"
                onClick={addBlocked}
                disabled={!newBlocked}
                className="inline-flex shrink-0 items-center gap-1 rounded-lg bg-amber-500 px-3 py-1.5 text-xs font-bold text-stone-950 disabled:opacity-40 cursor-pointer"
              >
                <Plus className="h-3.5 w-3.5" /> Bloquear
              </button>
            </div>
            {schedule.blockedDates.length === 0 ? (
              <p className="mt-2 text-[11px] text-stone-400">Nenhum dia bloqueado.</p>
            ) : (
              <ul className="mt-2 flex flex-wrap gap-1.5">
                {schedule.blockedDates.map((iso) => (
                  <li
                    key={iso}
                    className="inline-flex items-center gap-1.5 rounded-full border border-stone-800 bg-stone-800/60 px-2.5 py-1 text-xs text-stone-200"
                  >
                    {formatDateBR(iso)}
                    <button
                      type="button"
                      aria-label={`Remover ${formatDateBR(iso)}`}
                      onClick={() => removeBlocked(iso)}
                      className="text-stone-500 hover:text-amber-700 cursor-pointer"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <label className="block">
              <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-stone-300">
                Antecedência mínima
              </span>
              <select
                value={business.minNoticeMinutes ?? 60}
                onChange={(e) => onUpdateBusiness({ minNoticeMinutes: Number(e.target.value) })}
                className={inputCls}
              >
                {NOTICE_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </select>
            </label>
            <label className="block">
              <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-stone-300">
                Agendar até
              </span>
              <select
                value={business.maxAdvanceDays ?? 30}
                onChange={(e) => onUpdateBusiness({ maxAdvanceDays: Number(e.target.value) })}
                className={inputCls}
              >
                {WINDOW_OPTIONS.map((d) => (
                  <option key={d} value={d}>
                    {d} dias à frente
                  </option>
                ))}
              </select>
            </label>
          </div>
        </div>
      </div>
    </section>
  );
};
