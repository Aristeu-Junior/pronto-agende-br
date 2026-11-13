import React, { useEffect, useMemo, useState } from 'react';
import {
  CalendarCheck,
  CheckCircle,
  CurrencyDollar,
  FunnelSimple,
  Lightning,
  MagnifyingGlass,
  Paperclip,
  PencilSimple,
  Plus,
  Scissors,
  Trash,
  WarningCircle,
  WhatsappLogo,
} from '@phosphor-icons/react';
import {
  Appointment,
  AppointmentStatus,
  BusinessConfig,
  Client,
  ServiceItem,
  StaffMember,
} from '../types';
import { formatBRL, formatPhoneBR, isValidPhoneBR } from '../utils/validators';
import { LightDismissDialog } from './LightDismissDialog';
import { MonthCalendar } from './MonthCalendar';
import { SlotPicker } from './SlotPicker';
import { HelpTip } from './HelpTip';
import {
  addDaysISO,
  formatDateBR,
  formatDateLong,
  getDayState,
  getFreeSlots,
  getSchedule,
  hasConflict,
  localISODate,
  servicesSpan,
  weekSummary,
} from '../utils/schedule';

interface AgendaModuleProps {
  business: BusinessConfig;
  staff: StaffMember[];
  services: ServiceItem[];
  clients: Client[];
  appointments: Appointment[];
  onUpdateStatus: (appointmentId: string, status: AppointmentStatus) => void;
  onUpdateAppointment: (appointmentId: string, patch: Partial<Appointment>) => void;
  onDeleteAppointment: (appointmentId: string) => void;
  onCreateAppointment: (apt: Omit<Appointment, 'id'>) => void;
  onOpenInPos: (appointment: Appointment) => void;
  onOpenReminders?: () => void;
  onUpdateStaff?: (staffId: string, patch: Partial<StaffMember>) => void;
}

const STATUS_META: Record<
  AppointmentStatus,
  { label: string; bg: string; text: string; border: string }
> = {
  IN_SERVICE: {
    label: 'Em Atendimento',
    bg: 'bg-emerald-500',
    text: 'text-stone-100',
    border: 'border-emerald-500',
  },
  CONFIRMED: {
    label: 'Confirmado',
    bg: 'bg-tint-100',
    text: 'text-stone-100',
    border: 'border-stone-800',
  },
  PENDING: {
    label: 'Aguardando',
    bg: 'bg-amber-950',
    text: 'text-amber-800',
    border: 'border-amber-800/30',
  },
  COMPLETED: {
    label: 'Concluído',
    bg: 'bg-emerald-950',
    text: 'text-emerald-800',
    border: 'border-emerald-500',
  },
  NO_SHOW: {
    label: 'Faltou',
    bg: 'bg-amber-950',
    text: 'text-amber-800',
    border: 'border-amber-800/30',
  },
  CANCELLED: {
    label: 'Cancelado',
    bg: 'bg-tint-50',
    text: 'text-stone-400',
    border: 'border-stone-800',
  },
};

export const AgendaModule: React.FC<AgendaModuleProps> = ({
  business,
  staff,
  services,
  clients,
  appointments,
  onUpdateStatus,
  onUpdateAppointment,
  onDeleteAppointment,
  onCreateAppointment,
  onOpenInPos,
  onOpenReminders,
  onUpdateStaff,
}) => {
  const professionals = useMemo(
    () => staff.filter((s) => s.role === 'PROFESSIONAL'),
    [staff]
  );

  const [selectedStaffId, setSelectedStaffId] = useState<string>('ALL');
  const [selectedStatus, setSelectedStatus] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedDate, setSelectedDate] = useState<string>(localISODate());
  const [calendarOpen, setCalendarOpen] = useState<boolean>(false);
  const [pendingSlot, setPendingSlot] = useState<string>('');
  const [newAptDate, setNewAptDate] = useState<string>(localISODate());
  const [editDate, setEditDate] = useState<string>(localISODate());
  const [editError, setEditError] = useState<string>('');
  const [selectedAptId, setSelectedAptId] = useState<string>(
    appointments[0]?.id || ''
  );

  // Estado de edição inline do agendamento selecionado na direita
  const [editClientName, setEditClientName] = useState<string>('');
  const [editClientPhone, setEditClientPhone] = useState<string>('');
  const [editStartTime, setEditStartTime] = useState<string>('');
  const [editStaffId, setEditStaffId] = useState<string>('');
  const [editServiceIds, setEditServiceIds] = useState<string[]>([]);
  const [editCustomPrice, setEditCustomPrice] = useState<string>('');
  const [editDepositPaid, setEditDepositPaid] = useState<string>('0');
  const [editProofName, setEditProofName] = useState<string>('');
  const [editNotes, setEditNotes] = useState<string>('');
  const [savedSuccess, setSavedSuccess] = useState<boolean>(false);

  // Encaixe rápido
  const [walkInOpen, setWalkInOpen] = useState<boolean>(false);
  const [walkInName, setWalkInName] = useState<string>('');
  const [walkInPhone, setWalkInPhone] = useState<string>('');
  const [walkInStaffId, setWalkInStaffId] = useState<string>(
    professionals[0]?.id || ''
  );
  const [walkInServiceId, setWalkInServiceId] = useState<string>(
    services[0]?.id || ''
  );
  const [walkInPrice, setWalkInPrice] = useState<string>(
    String(services[0]?.price || 45)
  );
  const [walkInError, setWalkInError] = useState<string>('');

  // Novo agendamento completo
  const [newAptOpen, setNewAptOpen] = useState<boolean>(false);
  const [newAptClientName, setNewAptClientName] = useState<string>('');
  const [newAptClientPhone, setNewAptClientPhone] = useState<string>('');
  const [newAptStaffId, setNewAptStaffId] = useState<string>(
    professionals[0]?.id || ''
  );
  const [newAptServiceIds, setNewAptServiceIds] = useState<string[]>(
    services[0] ? [services[0].id] : []
  );
  const [newAptTime, setNewAptTime] = useState<string>('');
  const [newAptDeposit, setNewAptDeposit] = useState<string>('0');
  const [newAptError, setNewAptError] = useState<string>('');

  const filteredAppointments = useMemo(() => {
    const searching = searchQuery.trim() !== '';
    return appointments
      .filter((apt) => {
        if (!searching && apt.date !== selectedDate) return false;
        if (selectedStaffId !== 'ALL' && apt.staffId !== selectedStaffId) {
          return false;
        }
        if (selectedStatus !== 'ALL' && apt.status !== selectedStatus) {
          return false;
        }
        if (searchQuery.trim() !== '') {
          const q = searchQuery.toLowerCase();
          return (
            apt.clientName.toLowerCase().includes(q) ||
            apt.clientPhone.toLowerCase().includes(q)
          );
        }
        return true;
      })
      .sort((a, b) =>
        a.date === b.date
          ? a.startTime.localeCompare(b.startTime)
          : a.date.localeCompare(b.date)
      );
  }, [appointments, selectedStaffId, selectedStatus, searchQuery, selectedDate]);

  const activeAppointment = useMemo(() => {
    return (
      filteredAppointments.find((a) => a.id === selectedAptId) ||
      filteredAppointments[0] ||
      null
    );
  }, [filteredAppointments, selectedAptId]);

  const getServicesForApt = (serviceIds: string[]) =>
    services.filter((s) => serviceIds.includes(s.id));

  const getAptTotal = (apt: Appointment) => {
    if (typeof apt.customPrice === 'number' && apt.customPrice >= 0) {
      return apt.customPrice;
    }
    return getServicesForApt(apt.serviceIds).reduce((acc, s) => acc + s.price, 0);
  };

  const getStaffById = (id?: string) => staff.find((s) => s.id === id);

  const dayStaff = useMemo(
    () =>
      selectedStaffId === 'ALL'
        ? professionals
        : professionals.filter((p) => p.id === selectedStaffId),
    [professionals, selectedStaffId]
  );

  const calendarMarker = (iso: string) => {
    const count = appointments.filter(
      (a) =>
        a.date === iso &&
        a.status !== 'CANCELLED' &&
        (selectedStaffId === 'ALL' || a.staffId === selectedStaffId)
    ).length;
    const closed =
      dayStaff.length > 0 && dayStaff.every((p) => getDayState(p, iso) !== 'OPEN');
    return { count, closed };
  };

  const defaultSpan = servicesSpan(services.slice(0, 1));
  const daySlots = (staffMember: StaffMember) =>
    getFreeSlots({
      staff: staffMember,
      date: selectedDate,
      durationMinutes: defaultSpan.duration,
      bufferMinutes: defaultSpan.buffer,
      appointments,
    });

  const toggleDayOff = (staffMember: StaffMember) => {
    if (!onUpdateStaff) return;
    const sch = getSchedule(staffMember);
    const blocked = sch.blockedDates.includes(selectedDate)
      ? sch.blockedDates.filter((d) => d !== selectedDate)
      : [...sch.blockedDates, selectedDate].sort();
    onUpdateStaff(staffMember.id, { schedule: { ...sch, blockedDates: blocked } });
  };

  const openNewAptWithSlot = (staffId: string, time: string) => {
    setNewAptStaffId(staffId);
    setPendingSlot(time);
    setNewAptOpen(true);
  };

  useEffect(() => {
    if (!newAptOpen) return;
    setNewAptDate(selectedDate);
    setNewAptTime(pendingSlot);
    setPendingSlot('');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [newAptOpen]);

  const newAptSpan = servicesSpan(getServicesForApt(newAptServiceIds));
  const newAptSlots = useMemo(
    () =>
      getFreeSlots({
        staff: professionals.find((p) => p.id === newAptStaffId),
        date: newAptDate,
        durationMinutes: newAptSpan.duration,
        bufferMinutes: newAptSpan.buffer,
        appointments,
      }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [professionals, newAptStaffId, newAptDate, newAptSpan.duration, newAptSpan.buffer, appointments]
  );

  const editSpan = servicesSpan(getServicesForApt(editServiceIds));
  const editSlots = useMemo(
    () =>
      getFreeSlots({
        staff: professionals.find((p) => p.id === editStaffId),
        date: editDate,
        durationMinutes: editSpan.duration,
        bufferMinutes: editSpan.buffer,
        appointments,
        ignoreAppointmentId: activeAppointment?.id,
      }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [professionals, editStaffId, editDate, editSpan.duration, editSpan.buffer, appointments, activeAppointment?.id]
  );

  // Sincroniza formulário de edição lateral ao trocar de agendamento
  useEffect(() => {
    if (!activeAppointment) return;
    setEditClientName(activeAppointment.clientName);
    setEditClientPhone(activeAppointment.clientPhone);
    setEditStartTime(activeAppointment.startTime);
    setEditDate(activeAppointment.date);
    setEditError('');
    setEditStaffId(activeAppointment.staffId);
    setEditServiceIds(activeAppointment.serviceIds);
    setEditCustomPrice(String(getAptTotal(activeAppointment)));
    setEditDepositPaid(String(activeAppointment.depositPixPaid || 0));
    setEditProofName(activeAppointment.paymentProofName || '');
    setEditNotes(activeAppointment.notes || '');
    setSavedSuccess(false);
  }, [activeAppointment?.id, activeAppointment?.depositPixPaid, activeAppointment?.depositRequested]);

  const handleSaveInlineEdits = (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeAppointment) return;

    const chosenServices = getServicesForApt(editServiceIds);
    const totalDuration =
      chosenServices.reduce((acc, s) => acc + s.durationMinutes, 0) || 40;
    const [h, m] = (editStartTime || '14:00').split(':').map(Number);
    const endMinutes = (h || 14) * 60 + (m || 0) + totalDuration;
    const endH = String(Math.floor(endMinutes / 60)).padStart(2, '0');
    const endM = String(endMinutes % 60).padStart(2, '0');

    if (
      hasConflict(
        appointments,
        editStaffId,
        editDate,
        editStartTime,
        `${endH}:${endM}`,
        activeAppointment.id
      )
    ) {
      setEditError('Esse horário já está ocupado por outro agendamento. Escolha um horário livre.');
      return;
    }
    setEditError('');

    onUpdateAppointment(activeAppointment.id, {
      clientName: editClientName.trim() || 'Cliente',
      clientPhone: editClientPhone.trim(),
      date: editDate,
      startTime: editStartTime,
      endTime: `${endH}:${endM}`,
      staffId: editStaffId,
      serviceIds: editServiceIds,
      customPrice: Math.max(0, Number(editCustomPrice) || 0),
      depositPixPaid: Math.max(0, Number(editDepositPaid) || 0),
      paymentProofName: editProofName || undefined,
      notes: editNotes.trim(),
    });

    setSavedSuccess(true);
    window.setTimeout(() => setSavedSuccess(false), 2000);
  };

  const toggleEditService = (srvId: string) => {
    setEditServiceIds((prev) => {
      const next = prev.includes(srvId)
        ? prev.filter((id) => id !== srvId)
        : [...prev, srvId];
      const newSum = services
        .filter((s) => next.includes(s.id))
        .reduce((acc, s) => acc + s.price, 0);
      setEditCustomPrice(String(newSum));
      return next;
    });
  };

  const handleSendRealWhatsApp = (apt: Appointment) => {
    const cleanPhone = apt.clientPhone.replace(/\D/g, '');
    const fullPhone = cleanPhone.startsWith('55')
      ? cleanPhone
      : `55${cleanPhone}`;
    const srvNames = getServicesForApt(apt.serviceIds)
      .map((s) => s.name)
      .join(' + ');
    const profName = getStaffById(apt.staffId)?.name || 'Barbeiro';
    const total = formatBRL(getAptTotal(apt));
    const msg = `Olá, *${apt.clientName}*! Tudo bem?\n\nPassando para confirmar seu horário na *${business.name}*:\n- *Horário:* ${apt.date === localISODate() ? 'Hoje' : formatDateLong(apt.date)} às ${apt.startTime}\n- *Serviço:* ${srvNames} (${total})\n- *Profissional:* ${profName}\n\nPodemos confirmar sua presença?`;

    window.open(
      `https://wa.me/${fullPhone}?text=${encodeURIComponent(msg)}`,
      '_blank',
      'noopener,noreferrer'
    );
  };

  const handleWalkInSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmedName = walkInName.trim() || 'Cliente Balcão';
    const srv = services.find((s) => s.id === walkInServiceId) || services[0];
    const now = new Date();
    const startH = String(now.getHours()).padStart(2, '0');
    const startM = String(now.getMinutes()).padStart(2, '0');
    const startTime = `${startH}:${startM}`;
    const duration = srv?.durationMinutes || 40;
    const totalMinutes = now.getHours() * 60 + now.getMinutes() + duration;
    const endH = String(Math.floor(totalMinutes / 60) % 24).padStart(2, '0');
    const endM = String(totalMinutes % 60).padStart(2, '0');

    onCreateAppointment({
      clientId: `cli_walkin_${Date.now()}`,
      clientName: trimmedName,
      clientPhone: walkInPhone.trim() || '',
      staffId: walkInStaffId || professionals[0]?.id || 'st_01',
      serviceIds: srv ? [srv.id] : [],
      customPrice: Math.max(0, Number(walkInPrice) || srv?.price || 0),
      date: localISODate(),
      startTime,
      endTime: `${endH}:${endM}`,
      status: 'IN_SERVICE',
      isWalkIn: true,
      originChannel: 'WALK_IN',
      deviceFingerprint: 'walkin',
      depositPixPaid: 0,
      notes: 'Encaixe presencial de balcão.',
    });

    setWalkInName('');
    setWalkInPhone('');
    setWalkInError('');
    setWalkInOpen(false);
  };

  const handleNewAppointmentSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newAptClientName.trim()) {
      setNewAptError('Digite o nome do cliente.');
      return;
    }
    if (newAptServiceIds.length === 0) {
      setNewAptError('Selecione pelo menos 1 serviço.');
      return;
    }

    if (!newAptTime) {
      setNewAptError('Escolha um horário livre.');
      return;
    }
    const totalDuration =
      getServicesForApt(newAptServiceIds).reduce(
        (acc, s) => acc + s.durationMinutes,
        0
      ) || 40;
    const [h, m] = newAptTime.split(':').map(Number);
    const endTotal = (h || 14) * 60 + (m || 0) + totalDuration;
    const endH = String(Math.floor(endTotal / 60) % 24).padStart(2, '0');
    const endM = String(endTotal % 60).padStart(2, '0');
    const defaultTotal = getServicesForApt(newAptServiceIds).reduce(
      (acc, s) => acc + s.price,
      0
    );

    if (
      hasConflict(
        appointments,
        newAptStaffId || professionals[0]?.id || 'st_01',
        newAptDate,
        newAptTime,
        `${String(Math.floor(endTotal / 60) % 24).padStart(2, '0')}:${String(endTotal % 60).padStart(2, '0')}`
      )
    ) {
      setNewAptError('Esse horário já está ocupado. Escolha um horário livre.');
      return;
    }

    onCreateAppointment({
      clientId: `cli_${Date.now()}`,
      clientName: newAptClientName.trim(),
      clientPhone: newAptClientPhone.trim(),
      staffId: newAptStaffId || professionals[0]?.id || 'st_01',
      serviceIds: newAptServiceIds,
      customPrice: defaultTotal,
      date: newAptDate,
      startTime: newAptTime,
      endTime: `${endH}:${endM}`,
      status: 'CONFIRMED',
      isWalkIn: false,
      originChannel: 'DIRECT_LINK',
      deviceFingerprint: `manual_${Date.now()}`,
      depositPixPaid: Math.max(0, Number(newAptDeposit) || 0),
      notes: '',
    });

    setNewAptClientName('');
    setNewAptClientPhone('');
    setNewAptDeposit('0');
    setNewAptError('');
    setNewAptOpen(false);
    setSelectedDate(newAptDate);
  };

  const toggleNewAptService = (id: string) => {
    setNewAptServiceIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  return (
    <section aria-label="Agenda do Dia e Encaixes">
      {/* Cabeçalho */}
      <div className="border-b border-stone-800 bg-stone-950 px-4 py-4 sm:px-6">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="flex items-center gap-2 text-xl font-semibold tracking-tight text-stone-100">
              Agenda do Dia
              <HelpTip
                label="Agenda do Dia"
                text="Seus horários do dia. Escolha a data no calendário, veja quem vem e toque em um agendamento para editar ou chamar no WhatsApp. Use Encaixe Rápido para quem chega sem hora marcada."
              />
            </h1>
            <p className="mt-0.5 text-xs text-stone-300">
              Clique em qualquer agendamento para editar horário, valor, sinal pago ou enviar WhatsApp.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {onOpenReminders && (
              <button
                type="button"
                data-tour="agenda-reminders"
                onClick={onOpenReminders}
                className="inline-flex min-h-[40px] items-center gap-1.5 rounded-lg border border-stone-800 bg-stone-950 px-3.5 py-2 text-xs font-semibold text-stone-100"
              >
                <span>Lembretes WhatsApp</span>
              </button>
            )}
            <button
              type="button"
              onClick={() => {
                setWalkInError('');
                setWalkInStaffId(professionals[0]?.id || '');
                setWalkInServiceId(services[0]?.id || '');
                setWalkInPrice(String(services[0]?.price || 45));
                setWalkInOpen(true);
              }}
              className="inline-flex min-h-[40px] items-center gap-1.5 rounded-lg border border-stone-800 bg-tint-100 px-3.5 py-2 text-xs font-semibold text-stone-100"
            >
              <Lightning size={15} weight="fill" className="text-amber-500" />
              <span>+ Encaixe Rápido</span>
            </button>

            <button
              type="button"
              data-tour="agenda-new"
              onClick={() => {
                setNewAptError('');
                setNewAptStaffId(professionals[0]?.id || '');
                setNewAptServiceIds(services[0] ? [services[0].id] : []);
                setNewAptOpen(true);
              }}
              className="inline-flex min-h-[40px] items-center gap-1.5 rounded-lg bg-amber-500 px-4 py-2 text-xs font-semibold text-white hover:bg-amber-600"
            >
              <Plus size={15} weight="bold" />
              <span>+ Novo Agendamento</span>
            </button>
          </div>
        </div>

        {/* Filtros */}
        <div data-tour="agenda-filters" className="mt-4 pt-3 border-t border-stone-800 grid grid-cols-1 gap-2.5 md:grid-cols-12">
          <div className="md:col-span-6 flex items-center gap-1.5 overflow-x-auto pb-1">
            <button
              type="button"
              onClick={() => setSelectedStaffId('ALL')}
              className={`min-h-[36px] shrink-0 rounded-lg px-3 py-1.5 text-xs font-medium border ${
                selectedStaffId === 'ALL'
                  ? 'border-amber-500 bg-amber-950 text-amber-500'
                  : 'border-stone-800 bg-stone-950 text-stone-300'
              }`}
            >
              Todos ({professionals.length})
            </button>
            {professionals.map((prof) => {
              const count = appointments.filter(
                (a) => a.staffId === prof.id && a.status !== 'CANCELLED'
              ).length;
              const isSelected = selectedStaffId === prof.id;
              return (
                <button
                  key={prof.id}
                  type="button"
                  onClick={() => setSelectedStaffId(prof.id)}
                  className={`min-h-[36px] shrink-0 rounded-lg px-3 py-1.5 text-xs font-medium border flex items-center gap-1.5 ${
                    isSelected
                      ? 'border-amber-500 bg-amber-950 text-amber-500'
                      : 'border-stone-800 bg-stone-950 text-stone-300'
                  }`}
                >
                  <span>{prof.name.split(' ')[0]}</span>
                  <span className="num-tabular rounded bg-tint-50 px-1.5 py-0.5 text-[11px] text-stone-100">
                    {count}
                  </span>
                </button>
              );
            })}
          </div>

          <div className="md:col-span-3">
            <div className="relative flex items-center">
              <FunnelSimple
                size={15}
                className="pointer-events-none absolute left-3 text-stone-400"
              />
              <select
                aria-label="Filtrar por status"
                value={selectedStatus}
                onChange={(e) => setSelectedStatus(e.target.value)}
                className="min-h-[36px] w-full rounded-lg border border-stone-800 bg-stone-950 pl-8 pr-3 text-xs font-medium text-stone-100"
              >
                <option value="ALL">Todos os status</option>
                <option value="IN_SERVICE">Em Atendimento</option>
                <option value="CONFIRMED">Confirmados</option>
                <option value="PENDING">Aguardando</option>
                <option value="COMPLETED">Concluídos</option>
                <option value="NO_SHOW">Faltou</option>
              </select>
            </div>
          </div>

          <div className="md:col-span-3">
            <div className="relative flex items-center">
              <MagnifyingGlass
                size={15}
                className="pointer-events-none absolute left-3 text-stone-400"
              />
              <input
                type="search"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Buscar cliente..."
                className="min-h-[36px] w-full rounded-lg border border-stone-800 bg-stone-950 pl-8 pr-3 text-xs text-stone-100"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Calendário vivo + resumo do dia */}
      <div className="grid grid-cols-1 gap-4 border-b border-stone-800 bg-stone-950 px-4 py-4 sm:px-6 lg:grid-cols-12">
        <div data-tour="agenda-calendar" className="lg:col-span-4">
          <button
            type="button"
            onClick={() => setCalendarOpen((v) => !v)}
            aria-expanded={calendarOpen}
            className="mb-2 min-h-[36px] w-full rounded-lg border border-stone-800 px-3 text-xs font-semibold text-stone-100 lg:hidden"
          >
            {calendarOpen ? 'Fechar calendário' : 'Abrir calendário'}
          </button>
          <div className={`${calendarOpen ? 'block' : 'hidden'} lg:block`}>
            <MonthCalendar
              value={selectedDate}
              onChange={(iso) => {
                setSelectedDate(iso);
                setCalendarOpen(false);
              }}
              getMarker={calendarMarker}
            />
          </div>
        </div>

        <div className="lg:col-span-8">
          <div data-tour="agenda-day" className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                aria-label="Dia anterior"
                onClick={() => setSelectedDate(addDaysISO(selectedDate, -1))}
                className="min-h-[36px] rounded-lg border border-stone-800 px-3 text-sm font-semibold text-stone-100"
              >
                ‹
              </button>
              <h2 className="min-w-[10rem] text-center text-sm font-semibold text-stone-100">
                {formatDateLong(selectedDate)}
                {selectedDate === localISODate() ? ' · hoje' : ''}
              </h2>
              <button
                type="button"
                aria-label="Próximo dia"
                onClick={() => setSelectedDate(addDaysISO(selectedDate, 1))}
                className="min-h-[36px] rounded-lg border border-stone-800 px-3 text-sm font-semibold text-stone-100"
              >
                ›
              </button>
              {selectedDate !== localISODate() && (
                <button
                  type="button"
                  onClick={() => setSelectedDate(localISODate())}
                  className="min-h-[36px] rounded-lg px-2 text-xs font-semibold text-amber-600"
                >
                  Ir para hoje
                </button>
              )}
            </div>
          </div>

          <div className="mt-3 space-y-3">
            {dayStaff.length === 0 && (
              <p className="text-xs text-stone-300">Cadastre um barbeiro em Ajustes para montar a escala.</p>
            )}
            {dayStaff.map((member) => {
              const state = getDayState(member, selectedDate);
              const sch = getSchedule(member);
              const day = sch.days[new Date(selectedDate + 'T12:00:00').getDay()];
              const free = state === 'OPEN' ? daySlots(member) : [];
              const isPast = selectedDate < localISODate();
              return (
                <div key={member.id} className="rounded-xl border border-stone-800 p-3">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div>
                      <span className="text-xs font-semibold text-stone-100">{member.name}</span>
                      <span className="ml-2 text-[11px] text-stone-400">
                        {state === 'OPEN'
                          ? `Atende ${day.start}–${day.end}${day.breakStart && day.breakEnd ? ` · pausa ${day.breakStart}–${day.breakEnd}` : ''} · de ${sch.slotIntervalMinutes} em ${sch.slotIntervalMinutes} min`
                          : state === 'BLOCKED'
                            ? 'Folga marcada'
                            : 'Fora da escala'}
                      </span>
                    </div>
                    {onUpdateStaff && !isPast && (
                      <button
                        type="button"
                        onClick={() => toggleDayOff(member)}
                        className="min-h-[32px] rounded-lg border border-stone-800 px-2.5 text-[11px] font-semibold text-stone-300 hover:border-amber-500"
                      >
                        {state === 'BLOCKED' ? 'Remover folga' : 'Marcar folga neste dia'}
                      </button>
                    )}
                  </div>
                  {state === 'OPEN' && !isPast && (
                    <div className="mt-2">
                      <p className="mb-1.5 text-[11px] text-stone-400">
                        {free.length > 0
                          ? `${free.length} ${free.length === 1 ? 'horário livre' : 'horários livres'} (toque para agendar):`
                          : 'Dia lotado: sem horários livres.'}
                      </p>
                      {free.length > 0 && (
                        <div className="flex flex-wrap gap-1.5">
                          {free.slice(0, 14).map((t) => (
                            <button
                              key={t}
                              type="button"
                              onClick={() => openNewAptWithSlot(member.id, t)}
                              className="num-tabular min-h-[36px] rounded-lg border border-stone-800 bg-stone-950 px-3 text-xs font-semibold text-stone-100 hover:border-amber-500"
                            >
                              {t}
                            </button>
                          ))}
                          {free.length > 14 && (
                            <span className="self-center text-[11px] text-stone-400">+{free.length - 14}</span>
                          )}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
            <p className="text-[11px] text-stone-400">
              {dayStaff.length === 1 ? weekSummary(dayStaff[0]) : 'Escala de cada barbeiro: Ajustes › Escala de Trabalho.'}
            </p>
          </div>
        </div>
      </div>

      {/* Lista + Painel de Edição Direta */}
      <div className="grid grid-cols-1 lg:grid-cols-12 divide-y lg:divide-y-0 lg:divide-x divide-stone-800 bg-stone-950">
        <div data-tour="agenda-list" className="lg:col-span-7">
          {filteredAppointments.length === 0 ? (
            <div className="px-6 py-14 text-center">
              <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full border border-stone-800 bg-tint-50 text-stone-300">
                <CalendarCheck size={24} />
              </div>
              <h2 className="mt-3 text-sm font-semibold text-stone-100">
                Nenhum agendamento neste dia
              </h2>
              <p className="mx-auto mt-1 max-w-md text-xs text-stone-300">
                Escolha um horário livre acima, crie um agendamento ou lance um encaixe rápido de balcão.
              </p>
              <div className="mt-4 flex flex-wrap items-center justify-center gap-2">
                <button
                  type="button"
                  onClick={() => setWalkInOpen(true)}
                  className="rounded-lg border border-stone-800 bg-stone-950 px-4 py-2 text-xs font-semibold text-stone-100"
                >
                  + Encaixe Rápido
                </button>
                <button
                  type="button"
                  onClick={() => setNewAptOpen(true)}
                  className="rounded-lg bg-amber-500 px-4 py-2 text-xs font-semibold text-white"
                >
                  + Novo Agendamento
                </button>
              </div>
            </div>
          ) : (
            <div className="divide-y divide-stone-800">
              {filteredAppointments.map((apt) => {
                const prof = getStaffById(apt.staffId);
                const aptServices = getServicesForApt(apt.serviceIds);
                const total = getAptTotal(apt);
                const statusInfo = STATUS_META[apt.status];
                const isSelected = activeAppointment?.id === apt.id;

                return (
                  <div
                    key={apt.id}
                    onClick={() => setSelectedAptId(apt.id)}
                    className={`cursor-pointer px-4 py-3.5 sm:px-6 transition-colors ${
                      isSelected ? 'bg-amber-950/45' : 'hover:bg-tint-50/60'
                    }`}
                  >
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                      <div className="flex items-start gap-3">
                        <div className="min-w-[70px] rounded-lg border border-stone-800 bg-tint-50 px-2.5 py-1.5 text-center">
                          <time className="num-tabular block text-sm font-semibold text-stone-100">
                            {apt.startTime}
                          </time>
                          <span className="num-tabular block text-[11px] text-stone-400">
                            {apt.endTime}
                          </span>
                        </div>

                        <div>
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="text-sm font-semibold text-stone-100">
                              {apt.clientName}
                            </span>
                            <span
                              className={`inline-flex items-center rounded border px-2 py-0.5 text-[11px] font-medium ${statusInfo.bg} ${statusInfo.text} ${statusInfo.border}`}
                            >
                              {statusInfo.label}
                            </span>
                            {apt.depositPixPaid > 0 && (
                              <span className="num-tabular rounded bg-amber-950 px-2 py-0.5 text-[11px] font-semibold text-amber-500">
                                Sinal pago: {formatBRL(apt.depositPixPaid)}
                              </span>
                            )}
                          </div>

                          <p className="mt-0.5 text-xs text-stone-300">
                            {aptServices.map((s) => s.name).join(' + ') || 'Serviço personalizado'}
                          </p>

                          <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-stone-400">
                            <span>{prof?.name}</span>
                            {apt.clientPhone && (
                              <>
                                <span>·</span>
                                <span className="num-tabular">{apt.clientPhone}</span>
                              </>
                            )}
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center justify-between sm:flex-col sm:items-end gap-2 border-t sm:border-t-0 pt-2 sm:pt-0 border-stone-800">
                        <span className="num-tabular text-sm font-semibold text-stone-100">
                          {formatBRL(total)}
                        </span>

                        <div
                          className="flex items-center gap-1.5"
                          onClick={(e) => e.stopPropagation()}
                        >
                          {apt.clientPhone && (
                            <button
                              type="button"
                              onClick={() => handleSendRealWhatsApp(apt)}
                              title="Enviar confirmação no WhatsApp"
                              className="inline-flex items-center gap-1 rounded-lg border border-stone-800 bg-stone-950 px-2.5 py-1 text-xs font-medium text-amber-500"
                            >
                              <WhatsappLogo size={14} weight="bold" />
                              <span>WhatsApp</span>
                            </button>
                          )}
                          {apt.status !== 'COMPLETED' && apt.status !== 'CANCELLED' && (
                            <button
                              type="button"
                              onClick={() => onOpenInPos(apt)}
                              className="inline-flex items-center gap-1 rounded-lg bg-amber-500 px-2.5 py-1 text-xs font-semibold text-white hover:bg-amber-600"
                            >
                              <CurrencyDollar size={13} weight="bold" />
                              <span>Receber</span>
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Coluna Direita (5 cols): Editor Completo do Agendamento Selecionado */}
        <aside className="lg:col-span-5 bg-tint-50/50 p-4 sm:p-5">
          {activeAppointment ? (
            <form onSubmit={handleSaveInlineEdits} className="space-y-4">
              <div className="flex items-center justify-between border-b border-stone-800 pb-3">
                <div className="flex items-center gap-2">
                  <PencilSimple size={16} weight="bold" className="text-amber-500" />
                  <h2 className="text-sm font-semibold text-stone-100">
                    Editar Agendamento
                  </h2>
                </div>

                <select
                  aria-label="Status do agendamento"
                  value={activeAppointment.status}
                  onChange={(e) =>
                    onUpdateStatus(
                      activeAppointment.id,
                      e.target.value as AppointmentStatus
                    )
                  }
                  className="rounded-lg border border-stone-800 bg-stone-950 px-2.5 py-1 text-xs font-semibold text-stone-100"
                >
                  <option value="PENDING">Aguardando</option>
                  <option value="CONFIRMED">Confirmado</option>
                  <option value="IN_SERVICE">Em Atendimento</option>
                  <option value="COMPLETED">Concluído</option>
                  <option value="NO_SHOW">Faltou</option>
                  <option value="CANCELLED">Cancelado</option>
                </select>
              </div>

              {activeAppointment.depositRequested ? (
                <div className="flex flex-col gap-2 rounded-lg border border-amber-500/40 bg-amber-950 p-3 text-xs text-stone-100 sm:flex-row sm:items-center sm:justify-between">
                  <span>
                    <strong>Sinal pedido: {formatBRL(activeAppointment.depositRequested)}.</strong>{' '}
                    Confira o Pix no seu banco antes de confirmar.
                    {activeAppointment.paymentProofName
                      ? ` Comprovante: ${activeAppointment.paymentProofName}.`
                      : ''}
                  </span>
                  <button
                    type="button"
                    onClick={() =>
                      onUpdateAppointment(activeAppointment.id, {
                        depositPixPaid:
                          (activeAppointment.depositPixPaid || 0) +
                          (activeAppointment.depositRequested || 0),
                        depositRequested: 0,
                        status: 'CONFIRMED',
                      })
                    }
                    className="min-h-[36px] shrink-0 rounded-lg bg-emerald-500 px-3 py-1.5 font-bold text-ink-dark"
                  >
                    Confirmar sinal recebido
                  </button>
                </div>
              ) : null}

              {editError && (
                <p role="alert" className="text-xs font-medium text-amber-800">
                  {editError}
                </p>
              )}

              <div className="flex flex-col gap-1.5">
                <span className="text-xs font-medium text-stone-100">
                  Reagendar: horários livres em {formatDateBR(editDate)}
                </span>
                <SlotPicker
                  slots={editSlots}
                  value={editStartTime}
                  onChange={(t) => {
                    setEditStartTime(t);
                    setEditError('');
                  }}
                  emptyMessage="Sem horários livres nessa data para esse profissional."
                />
              </div>

              {savedSuccess && (
                <div className="rounded-lg border border-amber-500/40 bg-amber-950 px-3 py-2 text-xs font-semibold text-amber-500 flex items-center gap-1.5">
                  <CheckCircle size={15} weight="fill" />
                  <span>Alterações salvas na agenda!</span>
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                <div className="flex flex-col gap-1">
                  <label className="text-xs font-medium text-stone-100">
                    Nome do Cliente
                  </label>
                  <input
                    type="text"
                    value={editClientName}
                    onChange={(e) => setEditClientName(e.target.value)}
                    className="min-h-[36px] rounded-lg border border-stone-800 bg-stone-950 px-3 text-xs text-stone-100"
                  />
                </div>

                <div className="flex flex-col gap-1">
                  <label className="text-xs font-medium text-stone-100">
                    WhatsApp do Cliente
                  </label>
                  <input
                    type="tel"
                    inputMode="numeric"
                    value={editClientPhone}
                    onChange={(e) => setEditClientPhone(formatPhoneBR(e.target.value))}
                    placeholder="(11) 99999-0000"
                    className="num-tabular min-h-[36px] rounded-lg border border-stone-800 bg-stone-950 px-3 text-xs text-stone-100"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                <div className="flex flex-col gap-1">
                  <label className="text-xs font-medium text-stone-100">
                    Data
                  </label>
                  <input
                    type="date"
                    value={editDate}
                    onChange={(e) => {
                      setEditDate(e.target.value);
                      setEditError('');
                    }}
                    className="num-tabular min-h-[36px] rounded-lg border border-stone-800 bg-stone-950 px-3 text-xs text-stone-100"
                  />
                </div>

                <div className="flex flex-col gap-1">
                  <label className="text-xs font-medium text-stone-100">
                    Horário
                  </label>
                  <input
                    type="time"
                    value={editStartTime}
                    onChange={(e) => {
                      setEditStartTime(e.target.value);
                      setEditError('');
                    }}
                    className="num-tabular min-h-[36px] rounded-lg border border-stone-800 bg-stone-950 px-3 text-xs text-stone-100"
                  />
                </div>

                <div className="flex flex-col gap-1">
                  <label className="text-xs font-medium text-stone-100">
                    Barbeiro / Profissional
                  </label>
                  <select
                    value={editStaffId}
                    onChange={(e) => setEditStaffId(e.target.value)}
                    className="min-h-[36px] rounded-lg border border-stone-800 bg-stone-950 px-3 text-xs text-stone-100"
                  >
                    {professionals.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Serviços do agendamento */}
              <div className="flex flex-col gap-1">
                <span className="text-xs font-medium text-stone-100">
                  Serviços
                </span>
                <div className="divide-y divide-stone-800 rounded-lg border border-stone-800 bg-stone-950">
                  {services.map((srv) => {
                    const checked = editServiceIds.includes(srv.id);
                    return (
                      <label
                        key={srv.id}
                        className="flex cursor-pointer items-center justify-between px-3 py-2 text-xs"
                      >
                        <span className="flex items-center gap-2">
                          <input
                            type="checkbox"
                            checked={checked}
                            onChange={() => toggleEditService(srv.id)}
                            className="h-4 w-4 accent-amber-500"
                          />
                          <span className="font-medium text-stone-100">{srv.name}</span>
                        </span>
                        <span className="num-tabular text-stone-300">
                          {formatBRL(srv.price)}
                        </span>
                      </label>
                    );
                  })}
                </div>
              </div>

              {/* Preço Cobrado e Sinal Pago */}
              <div className="grid grid-cols-2 gap-2.5">
                <div className="flex flex-col gap-1">
                  <label className="text-xs font-medium text-stone-100">
                    Valor Total do Corte (R$)
                  </label>
                  <input
                    type="number"
                    min={0}
                    step={1}
                    value={editCustomPrice}
                    onChange={(e) => setEditCustomPrice(e.target.value)}
                    className="num-tabular min-h-[36px] rounded-lg border border-stone-800 bg-stone-950 px-3 text-xs font-semibold text-stone-100"
                  />
                </div>

                <div className="flex flex-col gap-1">
                  <label className="text-xs font-medium text-stone-100">
                    Sinal / Adiantamento Pago (R$)
                  </label>
                  <input
                    type="number"
                    min={0}
                    step={1}
                    value={editDepositPaid}
                    onChange={(e) => setEditDepositPaid(e.target.value)}
                    className="num-tabular min-h-[36px] rounded-lg border border-stone-800 bg-stone-950 px-3 text-xs text-amber-500 font-semibold"
                  />
                </div>
              </div>

              {/* Comprovante de Sinal / Observações */}
              <div className="flex flex-col gap-1">
                <label className="text-xs font-medium text-stone-100">
                  Anexar Comprovante Pix / Sinal (Opcional)
                </label>
                <label className="flex cursor-pointer items-center justify-between rounded-lg border border-dashed border-stone-800 bg-stone-950 px-3 py-2 text-xs text-stone-300">
                  <span className="inline-flex items-center gap-1.5 truncate">
                    <Paperclip size={14} weight="bold" className="text-amber-500" />
                    <span className="truncate">
                      {editProofName || 'Selecionar imagem ou PDF do comprovante...'}
                    </span>
                  </span>
                  <input
                    type="file"
                    accept="image/*,.pdf"
                    className="hidden"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) setEditProofName(file.name);
                    }}
                  />
                </label>
              </div>

              <div className="flex flex-col gap-1">
                <label className="text-xs font-medium text-stone-100">
                  Observações do Cliente
                </label>
                <textarea
                  rows={2}
                  value={editNotes}
                  onChange={(e) => setEditNotes(e.target.value)}
                  placeholder="Ex.: Degradê baixo, confirmar 1h antes..."
                  className="rounded-lg border border-stone-800 bg-stone-950 p-2.5 text-xs text-stone-100"
                />
              </div>

              <div className="space-y-2 pt-1">
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="submit"
                    className="min-h-[38px] inline-flex items-center justify-center gap-1.5 rounded-lg bg-amber-500 px-3 py-2 text-xs font-semibold text-white hover:bg-amber-600"
                  >
                    <CheckCircle size={15} weight="bold" />
                    <span>Salvar Alterações</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => onOpenInPos(activeAppointment)}
                    className="min-h-[38px] inline-flex items-center justify-center gap-1.5 rounded-lg border border-amber-500 bg-amber-950 px-3 py-2 text-xs font-semibold text-amber-500"
                  >
                    <CurrencyDollar size={15} weight="bold" />
                    <span>Receber no Caixa</span>
                  </button>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => handleSendRealWhatsApp(activeAppointment)}
                    className="min-h-[36px] inline-flex items-center justify-center gap-1.5 rounded-lg border border-stone-800 bg-stone-950 px-3 py-1.5 text-xs font-medium text-stone-100"
                  >
                    <WhatsappLogo size={15} weight="bold" className="text-amber-500" />
                    <span>Mandar WhatsApp</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => onDeleteAppointment(activeAppointment.id)}
                    className="min-h-[36px] inline-flex items-center justify-center gap-1.5 rounded-lg border border-amber-800/30 bg-amber-950/60 px-3 py-1.5 text-xs font-medium text-amber-800"
                  >
                    <Trash size={14} />
                    <span>Excluir Horário</span>
                  </button>
                </div>
              </div>
            </form>
          ) : (
            <div className="py-10 text-center text-xs text-stone-400">
              Clique em um horário na lista (ou crie um novo) para editar todos os dados aqui.
            </div>
          )}
        </aside>
      </div>

      {/* Modal 1: Encaixe Rápido */}
      <LightDismissDialog
        open={walkInOpen}
        onClose={() => setWalkInOpen(false)}
        title="Encaixe Rápido de Balcão"
        subtitle="Para clientes que chegaram agora sem hora marcada."
      >
        <form onSubmit={handleWalkInSubmit} className="space-y-4" noValidate>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="flex flex-col gap-1">
              <label htmlFor="walkin-name" className="text-xs font-semibold text-stone-100">
                Nome do Cliente
              </label>
              <input
                id="walkin-name"
                type="text"
                value={walkInName}
                onChange={(e) => setWalkInName(e.target.value)}
                placeholder="Ex.: Lucas"
                className="min-h-[38px] rounded-lg border border-stone-800 bg-stone-950 px-3 text-xs text-stone-100"
              />
            </div>

            <div className="flex flex-col gap-1">
              <label htmlFor="walkin-phone" className="text-xs font-semibold text-stone-100">
                WhatsApp (Opcional)
              </label>
              <input
                id="walkin-phone"
                type="tel"
                inputMode="numeric"
                value={walkInPhone}
                onChange={(e) => setWalkInPhone(formatPhoneBR(e.target.value))}
                placeholder="(11) 99999-0000"
                className="num-tabular min-h-[38px] rounded-lg border border-stone-800 bg-stone-950 px-3 text-xs text-stone-100"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="flex flex-col gap-1">
              <label htmlFor="walkin-service" className="text-xs font-semibold text-stone-100">
                Serviço
              </label>
              <select
                id="walkin-service"
                value={walkInServiceId}
                onChange={(e) => {
                  setWalkInServiceId(e.target.value);
                  const found = services.find((s) => s.id === e.target.value);
                  if (found) setWalkInPrice(String(found.price));
                }}
                className="min-h-[38px] w-full rounded-lg border border-stone-800 bg-stone-950 px-3 text-xs text-stone-100"
              >
                {services.map((srv) => (
                  <option key={srv.id} value={srv.id}>
                    {srv.name} — {formatBRL(srv.price)}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex flex-col gap-1">
              <label htmlFor="walkin-price" className="text-xs font-semibold text-stone-100">
                Valor Cobrado (R$)
              </label>
              <input
                id="walkin-price"
                type="number"
                min={0}
                step={1}
                value={walkInPrice}
                onChange={(e) => setWalkInPrice(e.target.value)}
                className="num-tabular min-h-[38px] rounded-lg border border-stone-800 bg-stone-950 px-3 text-xs font-semibold text-stone-100"
              />
            </div>
          </div>

          {walkInError && (
            <p role="alert" className="text-xs font-medium text-amber-800">
              {walkInError}
            </p>
          )}

          <div className="flex items-center justify-end gap-2 border-t border-stone-800 pt-3">
            <button
              type="button"
              onClick={() => setWalkInOpen(false)}
              className="min-h-[38px] rounded-lg border border-stone-800 bg-stone-950 px-4 py-1.5 text-xs font-medium text-stone-300"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="min-h-[38px] inline-flex items-center gap-1.5 rounded-lg bg-amber-500 px-4 py-1.5 text-xs font-semibold text-white hover:bg-amber-600"
            >
              <Scissors size={15} weight="bold" />
              <span>Adicionar na Agenda</span>
            </button>
          </div>
        </form>
      </LightDismissDialog>

      {/* Modal 2: Novo Agendamento */}
      <LightDismissDialog
        open={newAptOpen}
        onClose={() => setNewAptOpen(false)}
        title="Novo Agendamento"
        subtitle="Preencha os dados do cliente ou selecione um cliente já cadastrado."
      >
        <form onSubmit={handleNewAppointmentSubmit} className="space-y-4" noValidate>
          {clients.length > 0 && (
            <div className="flex flex-col gap-1">
              <label className="text-xs font-semibold text-stone-100">
                Preencher com Cliente Cadastrado (Opcional)
              </label>
              <select
                defaultValue=""
                onChange={(e) => {
                  const found = clients.find((c) => c.id === e.target.value);
                  if (found) {
                    setNewAptClientName(found.fullName);
                    setNewAptClientPhone(found.phoneWhatsapp);
                  }
                }}
                className="min-h-[38px] rounded-lg border border-stone-800 bg-stone-950 px-3 text-xs text-stone-100"
              >
                <option value="">Digitar manualmente abaixo...</option>
                {clients.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.fullName} — {c.phoneWhatsapp}
                  </option>
                ))}
              </select>
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="flex flex-col gap-1">
              <label className="text-xs font-semibold text-stone-100">
                Nome do Cliente *
              </label>
              <input
                type="text"
                value={newAptClientName}
                onChange={(e) => setNewAptClientName(e.target.value)}
                placeholder="Ex.: Matheus"
                className="min-h-[38px] rounded-lg border border-stone-800 bg-stone-950 px-3 text-xs text-stone-100"
              />
            </div>

            <div className="flex flex-col gap-1">
              <label className="text-xs font-semibold text-stone-100">
                WhatsApp
              </label>
              <input
                type="tel"
                inputMode="numeric"
                value={newAptClientPhone}
                onChange={(e) => setNewAptClientPhone(formatPhoneBR(e.target.value))}
                placeholder="(11) 99999-0000"
                className="num-tabular min-h-[38px] rounded-lg border border-stone-800 bg-stone-950 px-3 text-xs text-stone-100"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
            <div className="flex flex-col gap-1">
              <label className="text-xs font-semibold text-stone-100">
                Profissional
              </label>
              <select
                value={newAptStaffId}
                onChange={(e) => setNewAptStaffId(e.target.value)}
                className="min-h-[38px] rounded-lg border border-stone-800 bg-stone-950 px-3 text-xs text-stone-100"
              >
                {professionals.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex flex-col gap-1">
              <label className="text-xs font-semibold text-stone-100">
                Data
              </label>
              <input
                type="date"
                value={newAptDate}
                min={localISODate()}
                onChange={(e) => {
                  setNewAptDate(e.target.value);
                  setNewAptTime('');
                  if (newAptError) setNewAptError('');
                }}
                className="num-tabular min-h-[38px] rounded-lg border border-stone-800 bg-stone-950 px-3 text-xs text-stone-100"
              />
            </div>

            <div className="flex flex-col gap-1">
              <label className="text-xs font-semibold text-stone-100">
                Sinal Pix Pago (R$)
              </label>
              <input
                type="number"
                min={0}
                step={1}
                value={newAptDeposit}
                onChange={(e) => setNewAptDeposit(e.target.value)}
                className="num-tabular min-h-[38px] rounded-lg border border-stone-800 bg-stone-950 px-3 text-xs text-stone-100"
              />
            </div>
          </div>

          <div className="flex flex-col gap-1.5">
            <span className="text-xs font-semibold text-stone-100">
              Horários livres em {formatDateBR(newAptDate)}
            </span>
            <SlotPicker
              slots={newAptSlots}
              value={newAptTime}
              onChange={(t) => {
                setNewAptTime(t);
                if (newAptError) setNewAptError('');
              }}
              emptyMessage="Sem horários livres para esse profissional e serviço nessa data (dia de folga, fora da escala ou lotado)."
            />
            <label className="mt-1 flex items-center gap-2 text-xs text-stone-300">
              Outro horário
              <input
                type="time"
                value={newAptTime}
                onChange={(e) => {
                  setNewAptTime(e.target.value);
                  if (newAptError) setNewAptError('');
                }}
                className="num-tabular min-h-[36px] rounded-lg border border-stone-800 bg-stone-950 px-3 text-xs text-stone-100"
              />
              <span className="text-[11px]">(fora da grade; o sistema avisa se houver conflito)</span>
            </label>
          </div>

          <div className="flex flex-col gap-1">
            <span className="text-xs font-semibold text-stone-100">
              Serviços
            </span>
            <div className="divide-y divide-stone-800 rounded-lg border border-stone-800 bg-tint-50/50">
              {services.map((srv) => {
                const checked = newAptServiceIds.includes(srv.id);
                return (
                  <label
                    key={srv.id}
                    className="flex cursor-pointer items-center justify-between px-3 py-2 text-xs"
                  >
                    <span className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={() => {
                          toggleNewAptService(srv.id);
                          if (newAptError) setNewAptError('');
                        }}
                        className="h-4 w-4 accent-amber-500"
                      />
                      <span className="font-medium text-stone-100">{srv.name}</span>
                    </span>
                    <span className="num-tabular font-semibold text-stone-100">
                      {formatBRL(srv.price)}
                    </span>
                  </label>
                );
              })}
            </div>
          </div>

          {newAptError && (
            <p role="alert" className="text-xs font-medium text-amber-800">
              {newAptError}
            </p>
          )}

          <div className="flex items-center justify-end gap-2 border-t border-stone-800 pt-3">
            <button
              type="button"
              onClick={() => setNewAptOpen(false)}
              className="min-h-[38px] rounded-lg border border-stone-800 bg-stone-950 px-4 py-1.5 text-xs font-medium text-stone-300"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="min-h-[38px] inline-flex items-center gap-1.5 rounded-lg bg-amber-500 px-4 py-1.5 text-xs font-semibold text-white hover:bg-amber-600"
            >
              <CheckCircle size={15} weight="bold" />
              <span>Salvar Agendamento</span>
            </button>
          </div>
        </form>
      </LightDismissDialog>
    </section>
  );
};
