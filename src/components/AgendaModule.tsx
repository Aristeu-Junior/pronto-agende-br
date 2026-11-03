import React, { useMemo, useState } from 'react';
import {
  CalendarCheck,
  CheckCircle,
  CurrencyDollar,
  FunnelSimple,
  Lightning,
  MagnifyingGlass,
  Plus,
  Scissors,
  WarningCircle,
  WhatsappLogo,
} from '@phosphor-icons/react';
import {
  Appointment,
  AppointmentStatus,
  BusinessConfig,
  Client,
  OriginChannel,
  ServiceItem,
  StaffMember,
} from '../types';
import { formatBRL, formatPhoneBR, isValidPhoneBR } from '../utils/validators';
import { LightDismissDialog } from './LightDismissDialog';

interface AgendaModuleProps {
  business: BusinessConfig;
  staff: StaffMember[];
  services: ServiceItem[];
  clients: Client[];
  appointments: Appointment[];
  onUpdateStatus: (appointmentId: string, status: AppointmentStatus) => void;
  onCreateAppointment: (apt: Omit<Appointment, 'id'>) => void;
  onOpenInPos: (appointment: Appointment) => void;
  onTriggerWhatsAppReminder: (appointment: Appointment) => void;
}

const STATUS_META: Record<
  AppointmentStatus,
  { label: string; bg: string; text: string; border: string }
> = {
  IN_SERVICE: {
    label: 'Em Atendimento',
    bg: 'bg-[#E6F4F1]',
    text: 'text-[#0F766E]',
    border: 'border-[#0F766E]/30',
  },
  CONFIRMED: {
    label: 'Confirmado',
    bg: 'bg-[#EFECE6]',
    text: 'text-[#141413]',
    border: 'border-[#DEDAD0]',
  },
  PENDING: {
    label: 'Aguardando',
    bg: 'bg-[#FEF3C7]',
    text: 'text-[#B45309]',
    border: 'border-[#B45309]/30',
  },
  COMPLETED: {
    label: 'Concluído',
    bg: 'bg-[#F6F5F0]',
    text: 'text-[#6E6A63]',
    border: 'border-[#DEDAD0]',
  },
  NO_SHOW: {
    label: 'Faltou',
    bg: 'bg-[#FEE2E2]',
    text: 'text-[#B91C1C]',
    border: 'border-[#B91C1C]/30',
  },
  CANCELLED: {
    label: 'Cancelado',
    bg: 'bg-[#F6F5F0]',
    text: 'text-[#6E6A63]',
    border: 'border-[#DEDAD0]',
  },
};

const ORIGIN_LABELS: Record<OriginChannel, string> = {
  GOOGLE_RESERVE: 'Google',
  MARKETPLACE_BOOST: 'Vitrine Local',
  DIRECT_LINK: 'Link Direto',
  WALK_IN: 'Balcão',
};

export const AgendaModule: React.FC<AgendaModuleProps> = ({
  business,
  staff,
  services,
  clients,
  appointments,
  onUpdateStatus,
  onCreateAppointment,
  onOpenInPos,
  onTriggerWhatsAppReminder,
}) => {
  const professionals = useMemo(
    () => staff.filter((s) => s.role === 'PROFESSIONAL'),
    [staff]
  );

  const [selectedStaffId, setSelectedStaffId] = useState<string>('ALL');
  const [selectedStatus, setSelectedStatus] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedAptId, setSelectedAptId] = useState<string>(
    appointments[0]?.id || ''
  );

  // Encaixe rápido de balcão
  const [walkInOpen, setWalkInOpen] = useState<boolean>(false);
  const [walkInName, setWalkInName] = useState<string>('');
  const [walkInPhone, setWalkInPhone] = useState<string>('');
  const [walkInStaffId, setWalkInStaffId] = useState<string>(
    professionals[0]?.id || 'st_caio'
  );
  const [walkInServiceId, setWalkInServiceId] = useState<string>(
    services[0]?.id || 'srv_corte_degrade'
  );
  const [walkInError, setWalkInError] = useState<string>('');

  // Novo agendamento padrão
  const [newAptOpen, setNewAptOpen] = useState<boolean>(false);
  const [newAptClientId, setNewAptClientId] = useState<string>(
    clients[0]?.id || ''
  );
  const [newAptStaffId, setNewAptStaffId] = useState<string>(
    professionals[0]?.id || 'st_caio'
  );
  const [newAptAssistantId, setNewAptAssistantId] = useState<string>('');
  const [newAptServiceIds, setNewAptServiceIds] = useState<string[]>([
    services[0]?.id || 'srv_corte_degrade',
  ]);
  const [newAptTime, setNewAptTime] = useState<string>('16:30');
  const [newAptError, setNewAptError] = useState<string>('');

  const filteredAppointments = useMemo(() => {
    return appointments
      .filter((apt) => {
        if (selectedStaffId !== 'ALL' && apt.staffId !== selectedStaffId) {
          return false;
        }
        if (selectedStatus !== 'ALL' && apt.status !== selectedStatus) {
          return false;
        }
        if (searchQuery.trim() !== '') {
          const q = searchQuery.toLowerCase();
          const matchName = apt.clientName.toLowerCase().includes(q);
          const matchPhone = apt.clientPhone.toLowerCase().includes(q);
          return matchName || matchPhone;
        }
        return true;
      })
      .sort((a, b) => a.startTime.localeCompare(b.startTime));
  }, [appointments, selectedStaffId, selectedStatus, searchQuery]);

  const activeAppointment = useMemo(() => {
    return (
      filteredAppointments.find((a) => a.id === selectedAptId) ||
      filteredAppointments[0] ||
      null
    );
  }, [filteredAppointments, selectedAptId]);

  const getServicesForApt = (serviceIds: string[]) =>
    services.filter((s) => serviceIds.includes(s.id));

  const getAptTotal = (serviceIds: string[]) =>
    getServicesForApt(serviceIds).reduce((acc, s) => acc + s.price, 0);

  const getStaffById = (id?: string) => staff.find((s) => s.id === id);

  const handleWalkInSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmedName = walkInName.trim() || 'Cliente Balcão';
    if (walkInPhone.trim() !== '' && !isValidPhoneBR(walkInPhone)) {
      setWalkInError(
        'Informe um WhatsApp válido com DDD ou deixe em branco para encaixe rápido.'
      );
      return;
    }
    const srv = services.find((s) => s.id === walkInServiceId) || services[0];
    const now = new Date();
    const startH = String(Math.min(19, Math.max(9, now.getHours()))).padStart(
      2,
      '0'
    );
    const startM = now.getMinutes() < 30 ? '15' : '45';
    const startTime = `${startH}:${startM}`;
    const totalMinutes =
      parseInt(startH, 10) * 60 + parseInt(startM, 10) + srv.durationMinutes;
    const endH = String(Math.floor(totalMinutes / 60)).padStart(2, '0');
    const endM = String(totalMinutes % 60).padStart(2, '0');

    onCreateAppointment({
      clientId: `cli_walkin_${Date.now()}`,
      clientName: trimmedName,
      clientPhone: walkInPhone.trim() || '(11) 90000-0000',
      staffId: walkInStaffId,
      serviceIds: [srv.id],
      date: '2026-10-31',
      startTime,
      endTime: `${endH}:${endM}`,
      status: 'IN_SERVICE',
      isWalkIn: true,
      originChannel: 'WALK_IN',
      deviceFingerprint: 'walkin_pos_terminal',
      depositPixPaid: 0,
      notes: 'Encaixe presencial lançado na recepção.',
    });

    setWalkInName('');
    setWalkInPhone('');
    setWalkInError('');
    setWalkInOpen(false);
  };

  const handleNewAppointmentSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (newAptServiceIds.length === 0) {
      setNewAptError('Selecione ao menos 1 serviço para reservar o horário.');
      return;
    }
    const client = clients.find((c) => c.id === newAptClientId);
    if (!client) {
      setNewAptError('Selecione um cliente cadastrado.');
      return;
    }

    const totalDuration = getServicesForApt(newAptServiceIds).reduce(
      (acc, s) => acc + s.durationMinutes,
      0
    );
    const [h, m] = newAptTime.split(':').map(Number);
    const endTotal = h * 60 + m + totalDuration;
    const endH = String(Math.floor(endTotal / 60)).padStart(2, '0');
    const endM = String(endTotal % 60).padStart(2, '0');

    const requiresPixDeposit = client.noShowCount >= 2;
    const totalValue = getAptTotal(newAptServiceIds);
    const depositAmount = requiresPixDeposit
      ? Number(((totalValue * business.noShowDepositPercent) / 100).toFixed(2))
      : 0;

    onCreateAppointment({
      clientId: client.id,
      clientName: client.fullName,
      clientPhone: client.phoneWhatsapp,
      staffId: newAptStaffId,
      assistantStaffId: newAptAssistantId || undefined,
      serviceIds: newAptServiceIds,
      date: '2026-10-31',
      startTime: newAptTime,
      endTime: `${endH}:${endM}`,
      status: 'CONFIRMED',
      isWalkIn: false,
      originChannel: 'DIRECT_LINK',
      deviceFingerprint: `manual_${Date.now()}`,
      depositPixPaid: depositAmount,
      notes: requiresPixDeposit
        ? `Cliente com ${client.noShowCount} faltas anteriores. Sinal Pix de ${formatBRL(depositAmount)} registrado.`
        : 'Agendamento registrado pela recepção.',
    });

    setNewAptError('');
    setNewAptOpen(false);
  };

  const toggleNewAptService = (id: string) => {
    setNewAptServiceIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  return (
    <section aria-label="Agenda do Dia e Encaixes">
      {/* Cabeçalho Direto e Simples */}
      <div className="border-b border-[#DEDAD0] bg-white px-4 py-4 sm:px-6">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-xl font-semibold tracking-tight text-[#141413]">
              Agenda do Dia
            </h1>
            <p className="mt-0.5 text-xs text-[#4A4843]">
              Hoje ·{' '}
              <strong className="num-tabular text-[#141413]">
                {appointments.filter((a) => a.status !== 'CANCELLED').length}
              </strong>{' '}
              horários marcados
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => {
                setWalkInError('');
                setWalkInOpen(true);
              }}
              className="inline-flex min-h-[40px] items-center gap-1.5 rounded-lg border border-[#DEDAD0] bg-[#EFECE6] px-3.5 py-2 text-xs font-semibold text-[#141413] hover:opacity-90"
            >
              <Lightning size={15} weight="fill" className="text-[#0F766E]" />
              <span>Encaixe Rápido</span>
            </button>

            <button
              type="button"
              onClick={() => {
                setNewAptError('');
                setNewAptOpen(true);
              }}
              className="inline-flex min-h-[40px] items-center gap-1.5 rounded-lg bg-[#0F766E] px-4 py-2 text-xs font-semibold text-white hover:bg-[#0B5C56]"
            >
              <Plus size={15} weight="bold" />
              <span>Novo Agendamento</span>
            </button>
          </div>
        </div>

        {/* Filtros Essenciais */}
        <div className="mt-4 pt-3 border-t border-[#DEDAD0] grid grid-cols-1 gap-2.5 md:grid-cols-12">
          <div className="md:col-span-6 flex items-center gap-1.5 overflow-x-auto pb-1">
            <button
              type="button"
              onClick={() => setSelectedStaffId('ALL')}
              className={`min-h-[36px] shrink-0 rounded-lg px-3 py-1.5 text-xs font-medium border ${
                selectedStaffId === 'ALL'
                  ? 'border-[#0F766E] bg-[#E6F4F1] text-[#0F766E]'
                  : 'border-[#DEDAD0] bg-white text-[#4A4843]'
              }`}
            >
              Todas ({professionals.length})
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
                      ? 'border-[#0F766E] bg-[#E6F4F1] text-[#0F766E]'
                      : 'border-[#DEDAD0] bg-white text-[#4A4843]'
                  }`}
                >
                  <span>{prof.name.split(' ')[0]}</span>
                  <span className="num-tabular rounded bg-[#F6F5F0] px-1.5 py-0.5 text-[11px] text-[#141413]">
                    {count}
                  </span>
                </button>
              );
            })}
          </div>

          <div className="md:col-span-3">
            <label htmlFor="filter-status-select" className="sr-only">
              Filtrar por status
            </label>
            <div className="relative flex items-center">
              <FunnelSimple
                size={15}
                className="pointer-events-none absolute left-3 text-[#6E6A63]"
              />
              <select
                id="filter-status-select"
                value={selectedStatus}
                onChange={(e) => setSelectedStatus(e.target.value)}
                className="min-h-[36px] w-full rounded-lg border border-[#DEDAD0] bg-white pl-8 pr-3 text-xs font-medium text-[#141413]"
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
            <label htmlFor="agenda-search-input" className="sr-only">
              Buscar cliente na agenda
            </label>
            <div className="relative flex items-center">
              <MagnifyingGlass
                size={15}
                className="pointer-events-none absolute left-3 text-[#6E6A63]"
              />
              <input
                id="agenda-search-input"
                type="search"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Buscar cliente..."
                className="min-h-[36px] w-full rounded-lg border border-[#DEDAD0] bg-white pl-8 pr-3 text-xs text-[#141413] placeholder:text-[#6E6A63]"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Lista de Horários + Resumo Simples ao Lado */}
      <div className="grid grid-cols-1 lg:grid-cols-12 divide-y lg:divide-y-0 lg:divide-x divide-[#DEDAD0] bg-white">
        <div className="lg:col-span-8">
          {filteredAppointments.length === 0 ? (
            <div className="px-6 py-12 text-center">
              <div className="mx-auto flex h-11 w-11 items-center justify-center rounded-full border border-[#DEDAD0] bg-[#F6F5F0] text-[#4A4843]">
                <CalendarCheck size={22} />
              </div>
              <h2 className="mt-3 text-sm font-semibold text-[#141413]">
                Nenhum horário encontrado
              </h2>
              <div className="mt-4 flex flex-wrap items-center justify-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setSelectedStaffId('ALL');
                    setSelectedStatus('ALL');
                    setSearchQuery('');
                  }}
                  className="rounded-lg border border-[#DEDAD0] bg-white px-3.5 py-2 text-xs font-medium text-[#141413]"
                >
                  Mostrar todos
                </button>
                <button
                  type="button"
                  onClick={() => setWalkInOpen(true)}
                  className="rounded-lg bg-[#0F766E] px-3.5 py-2 text-xs font-medium text-white"
                >
                  + Encaixe Rápido
                </button>
              </div>
            </div>
          ) : (
            <div className="divide-y divide-[#DEDAD0]">
              {filteredAppointments.map((apt) => {
                const prof = getStaffById(apt.staffId);
                const aptServices = getServicesForApt(apt.serviceIds);
                const total = getAptTotal(apt.serviceIds);
                const statusInfo = STATUS_META[apt.status];
                const isSelected = activeAppointment?.id === apt.id;

                return (
                  <div
                    key={apt.id}
                    onClick={() => setSelectedAptId(apt.id)}
                    className={`cursor-pointer px-4 py-3.5 sm:px-6 transition-colors ${
                      isSelected ? 'bg-[#E6F4F1]/45' : 'hover:bg-[#F6F5F0]/60'
                    }`}
                  >
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                      <div className="flex items-start gap-3">
                        <div className="min-w-[70px] rounded-lg border border-[#DEDAD0] bg-[#F6F5F0] px-2.5 py-1.5 text-center">
                          <time className="num-tabular block text-sm font-semibold text-[#141413]">
                            {apt.startTime}
                          </time>
                          <span className="num-tabular block text-[11px] text-[#6E6A63]">
                            {apt.endTime}
                          </span>
                        </div>

                        <div>
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="text-sm font-semibold text-[#141413]">
                              {apt.clientName}
                            </span>
                            <span
                              className={`inline-flex items-center rounded border px-2 py-0.5 text-[11px] font-medium ${statusInfo.bg} ${statusInfo.text} ${statusInfo.border}`}
                            >
                              {statusInfo.label}
                            </span>
                          </div>

                          <p className="mt-0.5 text-xs text-[#4A4843]">
                            {aptServices.map((s) => s.name).join(' + ')}
                          </p>

                          <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-[#6E6A63]">
                            <span>{prof?.name}</span>
                            <span>·</span>
                            <span className="num-tabular">{apt.clientPhone}</span>
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center justify-between sm:flex-col sm:items-end gap-2 border-t sm:border-t-0 pt-2 sm:pt-0 border-[#DEDAD0]">
                        <span className="num-tabular text-sm font-semibold text-[#141413]">
                          {formatBRL(total)}
                        </span>

                        <div
                          className="flex items-center gap-1.5"
                          onClick={(e) => e.stopPropagation()}
                        >
                          {(apt.status === 'CONFIRMED' || apt.status === 'PENDING') && (
                            <button
                              type="button"
                              onClick={() => onUpdateStatus(apt.id, 'IN_SERVICE')}
                              className="rounded-lg border border-[#DEDAD0] bg-[#EFECE6] px-2.5 py-1 text-xs font-medium text-[#141413]"
                            >
                              Atender
                            </button>
                          )}
                          {apt.status !== 'COMPLETED' && apt.status !== 'CANCELLED' && (
                            <button
                              type="button"
                              onClick={() => onOpenInPos(apt)}
                              className="inline-flex items-center gap-1 rounded-lg bg-[#0F766E] px-2.5 py-1 text-xs font-semibold text-white hover:bg-[#0B5C56]"
                            >
                              <CurrencyDollar size={13} weight="bold" />
                              <span>Cobrar</span>
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

        {/* Coluna Direita: Detalhes Rápidos do Atendimento Selecionado */}
        <aside className="lg:col-span-4 bg-[#F6F5F0]/50 p-4 sm:p-5">
          {activeAppointment ? (
            <div className="space-y-4">
              <div className="flex items-start justify-between gap-2 border-b border-[#DEDAD0] pb-3">
                <div>
                  <h2 className="text-base font-semibold text-[#141413]">
                    {activeAppointment.clientName}
                  </h2>
                  <p className="num-tabular text-xs text-[#4A4843]">
                    {activeAppointment.clientPhone} · {activeAppointment.startTime} às{' '}
                    {activeAppointment.endTime}
                  </p>
                </div>
                <span
                  className={`rounded border px-2 py-0.5 text-xs font-medium ${
                    STATUS_META[activeAppointment.status].bg
                  } ${STATUS_META[activeAppointment.status].text} ${
                    STATUS_META[activeAppointment.status].border
                  }`}
                >
                  {STATUS_META[activeAppointment.status].label}
                </span>
              </div>

              <div className="rounded-lg border border-[#DEDAD0] bg-white p-3 space-y-2 text-xs">
                <div className="flex justify-between text-[#4A4843]">
                  <span>Profissional</span>
                  <span className="font-semibold text-[#141413]">
                    {getStaffById(activeAppointment.staffId)?.name}
                  </span>
                </div>
                <div className="flex justify-between border-t border-[#DEDAD0] pt-2 text-[#4A4843]">
                  <span>Origem</span>
                  <span className="font-medium text-[#141413]">
                    {ORIGIN_LABELS[activeAppointment.originChannel]}
                  </span>
                </div>
              </div>

              <div className="rounded-lg border border-[#DEDAD0] bg-white divide-y divide-[#DEDAD0]">
                {getServicesForApt(activeAppointment.serviceIds).map((srv) => (
                  <div
                    key={srv.id}
                    className="flex items-center justify-between px-3 py-2 text-xs"
                  >
                    <span className="font-medium text-[#141413]">{srv.name}</span>
                    <span className="num-tabular font-semibold text-[#141413]">
                      {formatBRL(srv.price)}
                    </span>
                  </div>
                ))}
                <div className="flex items-center justify-between bg-[#EFECE6]/50 px-3 py-2 text-xs font-semibold text-[#141413]">
                  <span>Total</span>
                  <span className="num-tabular text-sm">
                    {formatBRL(getAptTotal(activeAppointment.serviceIds))}
                  </span>
                </div>
              </div>

              {activeAppointment.notes && (
                <div className="rounded-lg border border-[#DEDAD0] bg-white p-3 text-xs text-[#4A4843]">
                  <strong className="block font-semibold text-[#141413]">
                    Observações:
                  </strong>
                  <p className="mt-1">{activeAppointment.notes}</p>
                </div>
              )}

              <div className="space-y-2 pt-1">
                <button
                  type="button"
                  onClick={() => onOpenInPos(activeAppointment)}
                  className="w-full min-h-[40px] inline-flex items-center justify-center gap-2 rounded-lg bg-[#0F766E] px-4 py-2 text-xs font-semibold text-white hover:bg-[#0B5C56]"
                >
                  <CurrencyDollar size={16} weight="bold" />
                  <span>Abrir no Caixa (PDV)</span>
                </button>

                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => onTriggerWhatsAppReminder(activeAppointment)}
                    className="min-h-[36px] inline-flex items-center justify-center gap-1.5 rounded-lg border border-[#DEDAD0] bg-white px-3 py-1.5 text-xs font-medium text-[#141413]"
                  >
                    <WhatsappLogo size={15} />
                    <span>Lembrete</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => onUpdateStatus(activeAppointment.id, 'NO_SHOW')}
                    className="min-h-[36px] inline-flex items-center justify-center gap-1.5 rounded-lg border border-[#B91C1C]/30 bg-[#FEE2E2]/60 px-3 py-1.5 text-xs font-medium text-[#B91C1C]"
                  >
                    <WarningCircle size={15} />
                    <span>Marcar Falta</span>
                  </button>
                </div>
              </div>
            </div>
          ) : (
            <div className="py-10 text-center text-xs text-[#6E6A63]">
              Selecione um atendimento para ver os detalhes.
            </div>
          )}
        </aside>
      </div>

      {/* Modal 1: Encaixe Rápido */}
      <LightDismissDialog
        open={walkInOpen}
        onClose={() => setWalkInOpen(false)}
        title="Encaixe Rápido de Balcão"
        subtitle="Selecione o profissional e o serviço para iniciar o atendimento imediatamente."
      >
        <form onSubmit={handleWalkInSubmit} className="space-y-4" noValidate>
          <div className="flex flex-col gap-1.5">
            <label htmlFor="walkin-staff" className="text-xs font-semibold text-[#141413]">
              1. Profissional Disponível
            </label>
            <div id="walkin-staff" className="grid grid-cols-1 sm:grid-cols-3 gap-2">
              {professionals.map((prof) => (
                <button
                  key={prof.id}
                  type="button"
                  onClick={() => setWalkInStaffId(prof.id)}
                  className={`rounded-lg border p-2.5 text-left text-xs ${
                    walkInStaffId === prof.id
                      ? 'border-[#0F766E] bg-[#E6F4F1] text-[#0F766E]'
                      : 'border-[#DEDAD0] bg-white text-[#141413]'
                  }`}
                >
                  <span className="num-tabular font-semibold block">{prof.chairLabel}</span>
                  <span className="font-medium">{prof.name}</span>
                </button>
              ))}
            </div>
          </div>

          <div className="flex flex-col gap-1.5">
            <label htmlFor="walkin-service" className="text-xs font-semibold text-[#141413]">
              2. Serviço
            </label>
            <select
              id="walkin-service"
              value={walkInServiceId}
              onChange={(e) => setWalkInServiceId(e.target.value)}
              className="min-h-[40px] w-full rounded-lg border border-[#DEDAD0] bg-white px-3 text-xs text-[#141413]"
            >
              {services.map((srv) => (
                <option key={srv.id} value={srv.id}>
                  {srv.name} — {formatBRL(srv.price)} ({srv.durationMinutes} min)
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="flex flex-col gap-1">
              <label htmlFor="walkin-name" className="text-xs font-medium text-[#141413]">
                Nome do Cliente (Opcional)
              </label>
              <input
                id="walkin-name"
                type="text"
                value={walkInName}
                onChange={(e) => setWalkInName(e.target.value)}
                placeholder="Ex.: Diego"
                className="min-h-[38px] rounded-lg border border-[#DEDAD0] bg-white px-3 text-xs text-[#141413]"
              />
            </div>

            <div className="flex flex-col gap-1">
              <label htmlFor="walkin-phone" className="text-xs font-medium text-[#141413]">
                WhatsApp (Opcional)
              </label>
              <input
                id="walkin-phone"
                type="tel"
                inputMode="numeric"
                value={walkInPhone}
                onChange={(e) => {
                  setWalkInPhone(formatPhoneBR(e.target.value));
                  if (walkInError) setWalkInError('');
                }}
                placeholder="(11) 99999-0000"
                className="num-tabular min-h-[38px] rounded-lg border border-[#DEDAD0] bg-white px-3 text-xs text-[#141413]"
              />
            </div>
          </div>

          {walkInError && (
            <p role="alert" className="text-xs font-medium text-[#B91C1C]">
              {walkInError}
            </p>
          )}

          <div className="flex items-center justify-end gap-2 border-t border-[#DEDAD0] pt-3">
            <button
              type="button"
              onClick={() => setWalkInOpen(false)}
              className="min-h-[38px] rounded-lg border border-[#DEDAD0] bg-white px-4 py-1.5 text-xs font-medium text-[#4A4843]"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="min-h-[38px] inline-flex items-center gap-1.5 rounded-lg bg-[#0F766E] px-4 py-1.5 text-xs font-semibold text-white hover:bg-[#0B5C56]"
            >
              <Scissors size={15} weight="bold" />
              <span>Iniciar Atendimento</span>
            </button>
          </div>
        </form>
      </LightDismissDialog>

      {/* Modal 2: Novo Agendamento */}
      <LightDismissDialog
        open={newAptOpen}
        onClose={() => setNewAptOpen(false)}
        title="Novo Agendamento"
        subtitle="Escolha o cliente, profissional, horário e serviços."
      >
        <form onSubmit={handleNewAppointmentSubmit} className="space-y-4" noValidate>
          <div className="flex flex-col gap-1">
            <label htmlFor="newapt-client" className="text-xs font-semibold text-[#141413]">
              Cliente
            </label>
            <select
              id="newapt-client"
              value={newAptClientId}
              onChange={(e) => setNewAptClientId(e.target.value)}
              className="min-h-[40px] rounded-lg border border-[#DEDAD0] bg-white px-3 text-xs text-[#141413]"
            >
              {clients.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.fullName} — {c.phoneWhatsapp}
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
            <div className="flex flex-col gap-1">
              <label htmlFor="newapt-staff" className="text-xs font-semibold text-[#141413]">
                Profissional
              </label>
              <select
                id="newapt-staff"
                value={newAptStaffId}
                onChange={(e) => setNewAptStaffId(e.target.value)}
                className="min-h-[38px] rounded-lg border border-[#DEDAD0] bg-white px-3 text-xs text-[#141413]"
              >
                {professionals.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex flex-col gap-1">
              <label htmlFor="newapt-aux" className="text-xs font-semibold text-[#141413]">
                Auxiliar (Opcional)
              </label>
              <select
                id="newapt-aux"
                value={newAptAssistantId}
                onChange={(e) => setNewAptAssistantId(e.target.value)}
                className="min-h-[38px] rounded-lg border border-[#DEDAD0] bg-white px-3 text-xs text-[#141413]"
              >
                <option value="">Sem auxiliar</option>
                {staff
                  .filter((s) => s.role === 'ASSISTANT')
                  .map((a) => (
                    <option key={a.id} value={a.id}>
                      {a.name}
                    </option>
                  ))}
              </select>
            </div>

            <div className="flex flex-col gap-1">
              <label htmlFor="newapt-time" className="text-xs font-semibold text-[#141413]">
                Horário
              </label>
              <input
                id="newapt-time"
                type="time"
                value={newAptTime}
                onChange={(e) => setNewAptTime(e.target.value)}
                className="num-tabular min-h-[38px] rounded-lg border border-[#DEDAD0] bg-white px-3 text-xs text-[#141413]"
              />
            </div>
          </div>

          <div className="flex flex-col gap-1">
            <span className="text-xs font-semibold text-[#141413]">
              Serviços
            </span>
            <div className="divide-y divide-[#DEDAD0] rounded-lg border border-[#DEDAD0] bg-[#F6F5F0]/50">
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
                        className="h-4 w-4 accent-[#0F766E]"
                      />
                      <span className="font-medium text-[#141413]">{srv.name}</span>
                    </span>
                    <span className="num-tabular font-semibold text-[#141413]">
                      {formatBRL(srv.price)}
                    </span>
                  </label>
                );
              })}
            </div>
          </div>

          {newAptError && (
            <p role="alert" className="text-xs font-medium text-[#B91C1C]">
              {newAptError}
            </p>
          )}

          <div className="flex items-center justify-end gap-2 border-t border-[#DEDAD0] pt-3">
            <button
              type="button"
              onClick={() => setNewAptOpen(false)}
              className="min-h-[38px] rounded-lg border border-[#DEDAD0] bg-white px-4 py-1.5 text-xs font-medium text-[#4A4843]"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="min-h-[38px] inline-flex items-center gap-1.5 rounded-lg bg-[#0F766E] px-4 py-1.5 text-xs font-semibold text-white hover:bg-[#0B5C56]"
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
