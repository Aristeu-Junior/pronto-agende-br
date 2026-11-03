import React, { useMemo, useState } from 'react';
import {
  CalendarCheck,
  CheckCircle,
  Clock,
  CurrencyDollar,
  FunnelSimple,
  Lightning,
  MagnifyingGlass,
  Plus,
  Scissors,
  UserCheck,
  UserPlus,
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
    label: 'Na Cadeira',
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
    label: 'Finalizado',
    bg: 'bg-[#F6F5F0]',
    text: 'text-[#6E6A63]',
    border: 'border-[#DEDAD0]',
  },
  NO_SHOW: {
    label: 'Faltou (No-Show)',
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
  GOOGLE_RESERVE: 'Google Reserve',
  MARKETPLACE_BOOST: 'Boost 1ª Visita',
  DIRECT_LINK: 'Link Próprio',
  WALK_IN: 'Walk-in Balcão',
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
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);

  // Express Walk-in state (Booksy 2-tap workflow)
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

  // Standard New Appointment Modal state
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

  const handleSimulateSync = () => {
    setIsRefreshing(true);
    window.setTimeout(() => {
      setIsRefreshing(false);
    }, 550);
  };

  const handleWalkInSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmedName = walkInName.trim() || 'Cliente Balcão (Walk-in)';
    if (walkInPhone.trim() !== '' && !isValidPhoneBR(walkInPhone)) {
      setWalkInError(
        'Informe um WhatsApp válido com DDD (10 ou 11 dígitos) ou deixe em branco para encaixe rápido.'
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
      notes: 'Encaixe presencial lançado direto na cadeira.',
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
    <section aria-label="Quadro Operacional de Agenda e Encaixes">
      {/* Barra de Controle de Cadeiras e Ações Rápidas */}
      <div className="border-b border-[#DEDAD0] bg-white px-4 py-4 sm:px-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h1 className="text-xl font-semibold tracking-tight text-[#141413] sm:text-2xl">
              Quadro de Cadeiras & Fila do Dia
            </h1>
            <p className="mt-1 text-sm text-[#4A4843]">
              Sábado, <time dateTime="2026-10-31">31/10/2026</time> ·{' '}
              <span className="num-tabular font-medium text-[#141413]">
                {appointments.filter((a) => a.status !== 'CANCELLED').length}
              </span>{' '}
              atendimentos programados · Regra de taxa:{' '}
              <strong className="font-medium text-[#141413]">
                {business.feeSplitRule === 'PROPORTIONAL'
                  ? 'Rateio Proporcional (Salão Parceiro)'
                  : business.feeSplitRule === 'STAFF_100'
                  ? '100% Profissional'
                  : '100% Salão'}
              </strong>
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            <button
              type="button"
              onClick={handleSimulateSync}
              className="inline-flex min-h-[42px] items-center gap-2 rounded-lg border border-[#DEDAD0] bg-[#F6F5F0] px-3.5 py-2 text-sm font-medium text-[#141413] hover:bg-[#EFECE6]"
            >
              <Clock size={17} weight="regular" />
              <span>Sincronizar Google Reserve</span>
            </button>

            <button
              type="button"
              onClick={() => {
                setWalkInError('');
                setWalkInOpen(true);
              }}
              className="inline-flex min-h-[42px] items-center gap-2 rounded-lg border border-[#141413] bg-[#141413] px-4 py-2 text-sm font-medium text-white hover:bg-[#2B2A28]"
            >
              <Lightning size={17} weight="fill" />
              <span>+ Encaixe Walk-in (2 Toques)</span>
            </button>

            <button
              type="button"
              onClick={() => {
                setNewAptError('');
                setNewAptOpen(true);
              }}
              className="inline-flex min-h-[42px] items-center gap-2 rounded-lg bg-[#0F766E] px-4 py-2 text-sm font-medium text-white hover:bg-[#0B5C56]"
            >
              <Plus size={17} weight="bold" />
              <span>Novo Agendamento</span>
            </button>
          </div>
        </div>

        {/* Filtros por Cadeira/Profissional, Status e Busca */}
        <div className="mt-4 pt-4 border-t border-[#DEDAD0] grid grid-cols-1 gap-3 md:grid-cols-12">
          <div className="md:col-span-6 flex items-center gap-1.5 overflow-x-auto pb-1">
            <button
              type="button"
              onClick={() => setSelectedStaffId('ALL')}
              className={`min-h-[38px] shrink-0 rounded-lg px-3 py-1.5 text-xs font-medium border ${
                selectedStaffId === 'ALL'
                  ? 'border-[#0F766E] bg-[#E6F4F1] text-[#0F766E]'
                  : 'border-[#DEDAD0] bg-white text-[#4A4843] hover:bg-[#F6F5F0]'
              }`}
            >
              Todas as Cadeiras ({professionals.length})
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
                  className={`min-h-[38px] shrink-0 rounded-lg px-3 py-1.5 text-xs font-medium border flex items-center gap-2 ${
                    isSelected
                      ? 'border-[#0F766E] bg-[#E6F4F1] text-[#0F766E]'
                      : 'border-[#DEDAD0] bg-white text-[#4A4843] hover:bg-[#F6F5F0]'
                  }`}
                >
                  <span className="num-tabular font-semibold">{prof.chairLabel}:</span>
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
                size={16}
                className="pointer-events-none absolute left-3 text-[#6E6A63]"
              />
              <select
                id="filter-status-select"
                value={selectedStatus}
                onChange={(e) => setSelectedStatus(e.target.value)}
                className="min-h-[38px] w-full rounded-lg border border-[#DEDAD0] bg-white pl-9 pr-3 text-xs font-medium text-[#141413]"
              >
                <option value="ALL">Status: Todos os horários</option>
                <option value="IN_SERVICE">Na Cadeira (Em atendimento)</option>
                <option value="CONFIRMED">Confirmados</option>
                <option value="PENDING">Aguardando Confirmação</option>
                <option value="COMPLETED">Finalizados no PDV</option>
                <option value="NO_SHOW">Faltou (No-Show)</option>
              </select>
            </div>
          </div>

          <div className="md:col-span-3">
            <label htmlFor="agenda-search-input" className="sr-only">
              Buscar cliente na agenda
            </label>
            <div className="relative flex items-center">
              <MagnifyingGlass
                size={16}
                className="pointer-events-none absolute left-3 text-[#6E6A63]"
              />
              <input
                id="agenda-search-input"
                type="search"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Buscar cliente ou WhatsApp..."
                className="min-h-[38px] w-full rounded-lg border border-[#DEDAD0] bg-white pl-9 pr-3 text-xs text-[#141413] placeholder:text-[#6E6A63]"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Grade Construtiva Principal: 8 colunas (Linha do Tempo) + 4 colunas (Inspetor Contextual) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 divide-y lg:divide-y-0 lg:divide-x divide-[#DEDAD0] bg-white">
        {/* Coluna Esquerda: Lista de Horários & Bilhetes de Cadeira */}
        <div className="lg:col-span-8">
          {isRefreshing ? (
            <div
              role="status"
              aria-label="Sincronizando horários da agenda"
              className="divide-y divide-[#DEDAD0]"
            >
              {[1, 2, 3, 4].map((skeletonIdx) => (
                <div key={skeletonIdx} className="p-5 animate-pulse flex items-center gap-4">
                  <div className="h-12 w-20 rounded bg-[#EFECE6]" />
                  <div className="flex-1 space-y-2.5">
                    <div className="h-4 w-48 rounded bg-[#EFECE6]" />
                    <div className="h-3.5 w-72 rounded bg-[#F6F5F0]" />
                  </div>
                  <div className="h-8 w-24 rounded bg-[#EFECE6]" />
                </div>
              ))}
            </div>
          ) : filteredAppointments.length === 0 ? (
            <div className="px-6 py-14 text-center">
              <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full border border-[#DEDAD0] bg-[#F6F5F0] text-[#4A4843]">
                <CalendarCheck size={24} />
              </div>
              <h2 className="mt-4 text-base font-semibold text-[#141413]">
                Nenhum horário encontrado para este filtro
              </h2>
              <p className="mx-auto mt-1 max-w-[46ch] text-sm text-[#4A4843]">
                Limpe os filtros ativos ou lance um encaixe rápido presencial (Walk-in) para preencher a cadeira livre.
              </p>
              <div className="mt-5 flex flex-wrap items-center justify-center gap-3">
                <button
                  type="button"
                  onClick={() => {
                    setSelectedStaffId('ALL');
                    setSelectedStatus('ALL');
                    setSearchQuery('');
                  }}
                  className="rounded-lg border border-[#DEDAD0] bg-white px-4 py-2 text-xs font-medium text-[#141413] hover:bg-[#F6F5F0]"
                >
                  Mostrar todos os horários
                </button>
                <button
                  type="button"
                  onClick={() => setWalkInOpen(true)}
                  className="rounded-lg bg-[#0F766E] px-4 py-2 text-xs font-medium text-white hover:bg-[#0B5C56]"
                >
                  + Lançar Encaixe Walk-in
                </button>
              </div>
            </div>
          ) : (
            <div className="divide-y divide-[#DEDAD0]">
              {filteredAppointments.map((apt) => {
                const prof = getStaffById(apt.staffId);
                const aux = getStaffById(apt.assistantStaffId);
                const aptServices = getServicesForApt(apt.serviceIds);
                const total = getAptTotal(apt.serviceIds);
                const statusInfo = STATUS_META[apt.status];
                const isSelected = activeAppointment?.id === apt.id;

                return (
                  <div
                    key={apt.id}
                    onClick={() => setSelectedAptId(apt.id)}
                    className={`cursor-pointer px-4 py-4 sm:px-6 transition-colors ${
                      isSelected ? 'bg-[#E6F4F1]/45' : 'hover:bg-[#F6F5F0]/70'
                    }`}
                  >
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                      {/* Bloco de Horário Monoespaçado + Identificação */}
                      <div className="flex items-start gap-3.5">
                        <div className="min-w-[78px] rounded-lg border border-[#DEDAD0] bg-[#F6F5F0] px-2.5 py-2 text-center">
                          <time className="num-tabular block text-sm font-semibold text-[#141413]">
                            {apt.startTime}
                          </time>
                          <span className="num-tabular block text-[11px] text-[#6E6A63]">
                            até {apt.endTime}
                          </span>
                        </div>

                        <div>
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="text-base font-semibold text-[#141413]">
                              {apt.clientName}
                            </span>
                            <span
                              className={`inline-flex items-center rounded border px-2 py-0.5 text-[11px] font-medium ${statusInfo.bg} ${statusInfo.text} ${statusInfo.border}`}
                            >
                              {statusInfo.label}
                            </span>
                            <span className="inline-flex items-center rounded border border-[#DEDAD0] bg-white px-2 py-0.5 text-[11px] font-medium text-[#4A4843]">
                              {ORIGIN_LABELS[apt.originChannel]}
                            </span>
                            {apt.depositPixPaid > 0 && (
                              <span className="num-tabular inline-flex items-center rounded border border-[#0F766E]/30 bg-[#E6F4F1] px-2 py-0.5 text-[11px] font-medium text-[#0F766E]">
                                Sinal Pix: {formatBRL(apt.depositPixPaid)}
                              </span>
                            )}
                          </div>

                          <p className="mt-1 text-xs text-[#4A4843]">
                            {aptServices.map((s) => s.name).join(' + ')}
                          </p>

                          <div className="mt-1.5 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-[#6E6A63]">
                            <span>
                              <strong className="font-medium text-[#141413]">
                                {prof?.chairLabel}:
                              </strong>{' '}
                              {prof?.name}
                            </span>
                            {aux && (
                              <span>
                                Auxiliar: <strong className="font-medium">{aux.name}</strong>
                              </span>
                            )}
                            <span className="num-tabular">{apt.clientPhone}</span>
                          </div>
                        </div>
                      </div>

                      {/* Bloco Direito: Valor e Ações Operacionais Rápidas */}
                      <div className="flex items-center justify-between sm:flex-col sm:items-end gap-2 border-t sm:border-t-0 pt-2.5 sm:pt-0 border-[#DEDAD0]">
                        <div className="text-left sm:text-right">
                          <span className="num-tabular text-base font-semibold text-[#141413]">
                            {formatBRL(total)}
                          </span>
                          <span className="block text-[11px] text-[#6E6A63]">
                            {apt.isFirstVisitBoost
                              ? 'Taxa Boost 15% (1ª visita)'
                              : 'Isento de taxa marketplace'}
                          </span>
                        </div>

                        <div
                          className="flex items-center gap-1.5"
                          onClick={(e) => e.stopPropagation()}
                        >
                          {apt.status === 'PENDING' && (
                            <button
                              type="button"
                              onClick={() => onUpdateStatus(apt.id, 'CONFIRMED')}
                              className="rounded border border-[#DEDAD0] bg-white px-2.5 py-1 text-xs font-medium text-[#141413] hover:bg-[#EFECE6]"
                            >
                              Confirmar
                            </button>
                          )}
                          {(apt.status === 'CONFIRMED' || apt.status === 'PENDING') && (
                            <button
                              type="button"
                              onClick={() => onUpdateStatus(apt.id, 'IN_SERVICE')}
                              className="rounded border border-[#141413] bg-[#141413] px-2.5 py-1 text-xs font-medium text-white hover:bg-[#2B2A28]"
                            >
                              Iniciar Cadeira
                            </button>
                          )}
                          {apt.status !== 'COMPLETED' && apt.status !== 'CANCELLED' && (
                            <button
                              type="button"
                              onClick={() => onOpenInPos(apt)}
                              className="inline-flex items-center gap-1 rounded bg-[#0F766E] px-2.5 py-1 text-xs font-medium text-white hover:bg-[#0B5C56]"
                            >
                              <CurrencyDollar size={14} weight="bold" />
                              <span>Fechar PDV</span>
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

        {/* Coluna Direita: Inspetor Operacional da Cadeira / Ficha de Comanda */}
        <aside className="lg:col-span-4 bg-[#F6F5F0]/50 p-5 sm:p-6">
          {activeAppointment ? (
            <div>
              <div className="flex items-start justify-between gap-3 border-b border-[#DEDAD0] pb-4">
                <div>
                  <h2 className="text-lg font-semibold text-[#141413]">
                    {activeAppointment.clientName}
                  </h2>
                  <p className="num-tabular mt-0.5 text-xs text-[#4A4843]">
                    WhatsApp: {activeAppointment.clientPhone} · Horário:{' '}
                    {activeAppointment.startTime}–{activeAppointment.endTime}
                  </p>
                </div>
                <span
                  className={`rounded border px-2.5 py-1 text-xs font-medium ${
                    STATUS_META[activeAppointment.status].bg
                  } ${STATUS_META[activeAppointment.status].text} ${
                    STATUS_META[activeAppointment.status].border
                  }`}
                >
                  {STATUS_META[activeAppointment.status].label}
                </span>
              </div>

              {/* Detalhamento de Serviços e Rateio Previsto */}
              <div className="mt-4 space-y-3">
                <div className="rounded-lg border border-[#DEDAD0] bg-white p-3.5">
                  <div className="flex items-center justify-between text-xs text-[#4A4843]">
                    <span>Profissional Designado</span>
                    <span className="font-semibold text-[#141413]">
                      {getStaffById(activeAppointment.staffId)?.name} (
                      {getStaffById(activeAppointment.staffId)?.chairLabel})
                    </span>
                  </div>
                  {activeAppointment.assistantStaffId && (
                    <div className="mt-2 flex items-center justify-between border-t border-[#DEDAD0] pt-2 text-xs text-[#4A4843]">
                      <span>Auxiliar Vinculado (Regra Trinks)</span>
                      <span className="font-medium text-[#141413]">
                        {getStaffById(activeAppointment.assistantStaffId)?.name}
                      </span>
                    </div>
                  )}
                  <div className="mt-2 flex items-center justify-between border-t border-[#DEDAD0] pt-2 text-xs text-[#4A4843]">
                    <span>Canal de Aquisição</span>
                    <span className="font-medium text-[#141413]">
                      {ORIGIN_LABELS[activeAppointment.originChannel]}
                    </span>
                  </div>
                  <div className="mt-2 flex items-center justify-between border-t border-[#DEDAD0] pt-2 text-xs text-[#4A4843]">
                    <span>Device Fingerprint (_bf)</span>
                    <span className="num-tabular text-[11px] text-[#6E6A63]">
                      {activeAppointment.deviceFingerprint}
                    </span>
                  </div>
                </div>

                {/* Lista de procedimentos */}
                <div className="rounded-lg border border-[#DEDAD0] bg-white divide-y divide-[#DEDAD0]">
                  {getServicesForApt(activeAppointment.serviceIds).map((srv) => (
                    <div
                      key={srv.id}
                      className="flex items-center justify-between px-3.5 py-2.5 text-xs"
                    >
                      <div>
                        <span className="font-medium text-[#141413]">{srv.name}</span>
                        <span className="num-tabular block text-[11px] text-[#6E6A63]">
                          {srv.durationMinutes} min · Comissão base {srv.customCommissionPct}%
                        </span>
                      </div>
                      <span className="num-tabular font-semibold text-[#141413]">
                        {formatBRL(srv.price)}
                      </span>
                    </div>
                  ))}
                  <div className="flex items-center justify-between bg-[#EFECE6]/50 px-3.5 py-2.5 text-xs font-semibold text-[#141413]">
                    <span>Total dos Serviços</span>
                    <span className="num-tabular text-sm">
                      {formatBRL(getAptTotal(activeAppointment.serviceIds))}
                    </span>
                  </div>
                </div>

                {activeAppointment.notes && (
                  <div className="rounded-lg border border-[#DEDAD0] bg-white p-3 text-xs text-[#4A4843]">
                    <strong className="block font-semibold text-[#141413]">
                      Observações de Bancada:
                    </strong>
                    <p className="mt-1 leading-relaxed">{activeAppointment.notes}</p>
                  </div>
                )}

                {/* Controles de Ciclo de Vida do Atendimento */}
                <div className="pt-2 space-y-2">
                  <button
                    type="button"
                    onClick={() => onOpenInPos(activeAppointment)}
                    className="w-full min-h-[42px] inline-flex items-center justify-center gap-2 rounded-lg bg-[#0F766E] px-4 py-2.5 text-sm font-medium text-white hover:bg-[#0B5C56]"
                  >
                    <CurrencyDollar size={18} weight="bold" />
                    <span>Abrir Comanda no PDV & Calcular Rateio</span>
                  </button>

                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => onTriggerWhatsAppReminder(activeAppointment)}
                      className="min-h-[38px] inline-flex items-center justify-center gap-1.5 rounded-lg border border-[#DEDAD0] bg-white px-3 py-2 text-xs font-medium text-[#141413] hover:bg-[#EFECE6]"
                    >
                      <WhatsappLogo size={16} weight="regular" />
                      <span>Lembrete WhatsApp</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => onUpdateStatus(activeAppointment.id, 'NO_SHOW')}
                      className="min-h-[38px] inline-flex items-center justify-center gap-1.5 rounded-lg border border-[#B91C1C]/30 bg-[#FEE2E2]/60 px-3 py-2 text-xs font-medium text-[#B91C1C] hover:bg-[#FEE2E2]"
                    >
                      <WarningCircle size={16} weight="regular" />
                      <span>Marcar No-Show</span>
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="py-12 text-center text-sm text-[#6E6A63]">
              Selecione um agendamento na grade ao lado para inspecionar detalhes e acionar o PDV.
            </div>
          )}
        </aside>
      </div>

      {/* Modal Nativo <dialog closedby="any"> 1: Encaixe Walk-in Expresso em 2 Toques (Booksy) */}
      <LightDismissDialog
        open={walkInOpen}
        onClose={() => setWalkInOpen(false)}
        title="Lançar Encaixe Walk-in Presencial"
        subtitle="Fluxo rápido de balcão (Booksy): exige apenas cadeira e serviço. Sem burocracia de CPF."
      >
        <form onSubmit={handleWalkInSubmit} className="space-y-4" noValidate>
          <div className="flex flex-col gap-1.5">
            <label htmlFor="walkin-staff" className="text-xs font-semibold text-[#141413]">
              1. Escolha a Cadeira / Profissional Disponível
            </label>
            <div id="walkin-staff" className="grid grid-cols-1 sm:grid-cols-3 gap-2">
              {professionals.map((prof) => (
                <button
                  key={prof.id}
                  type="button"
                  onClick={() => setWalkInStaffId(prof.id)}
                  className={`rounded-lg border p-3 text-left text-xs ${
                    walkInStaffId === prof.id
                      ? 'border-[#0F766E] bg-[#E6F4F1] text-[#0F766E]'
                      : 'border-[#DEDAD0] bg-white text-[#141413] hover:bg-[#F6F5F0]'
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
              2. Escolha o Serviço Principal
            </label>
            <select
              id="walkin-service"
              value={walkInServiceId}
              onChange={(e) => setWalkInServiceId(e.target.value)}
              className="min-h-[42px] w-full rounded-lg border border-[#DEDAD0] bg-white px-3 text-sm text-[#141413]"
            >
              {services.map((srv) => (
                <option key={srv.id} value={srv.id}>
                  {srv.name} — {formatBRL(srv.price)} ({srv.durationMinutes} min)
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
            <div className="flex flex-col gap-1.5">
              <label htmlFor="walkin-name" className="text-xs font-medium text-[#141413]">
                Nome ou Apelido do Cliente (Opcional)
              </label>
              <input
                id="walkin-name"
                type="text"
                value={walkInName}
                onChange={(e) => setWalkInName(e.target.value)}
                placeholder="Ex.: Diego (Balcão)"
                className="min-h-[40px] rounded-lg border border-[#DEDAD0] bg-white px-3 text-sm text-[#141413]"
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <label htmlFor="walkin-phone" className="text-xs font-medium text-[#141413]">
                WhatsApp p/ Recibo (Opcional)
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
                className="num-tabular min-h-[40px] rounded-lg border border-[#DEDAD0] bg-white px-3 text-sm text-[#141413]"
              />
            </div>
          </div>

          {walkInError && (
            <p role="alert" className="text-xs font-medium text-[#B91C1C]">
              {walkInError}
            </p>
          )}

          <div className="flex items-center justify-end gap-2.5 border-t border-[#DEDAD0] pt-4">
            <button
              type="button"
              onClick={() => setWalkInOpen(false)}
              className="min-h-[40px] rounded-lg border border-[#DEDAD0] bg-white px-4 py-2 text-xs font-medium text-[#4A4843] hover:bg-[#F6F5F0]"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="min-h-[40px] inline-flex items-center gap-2 rounded-lg bg-[#0F766E] px-5 py-2 text-xs font-semibold text-white hover:bg-[#0B5C56]"
            >
              <Scissors size={16} weight="bold" />
              <span>Ocupar Cadeira Agora</span>
            </button>
          </div>
        </form>
      </LightDismissDialog>

      {/* Modal Nativo <dialog closedby="any"> 2: Novo Agendamento Completo */}
      <LightDismissDialog
        open={newAptOpen}
        onClose={() => setNewAptOpen(false)}
        title="Novo Agendamento na Grade"
        subtitle="Vincula cliente da base, verifica score de faltas (Sinal Pix) e permite designar auxiliar."
      >
        <form onSubmit={handleNewAppointmentSubmit} className="space-y-4" noValidate>
          <div className="flex flex-col gap-1.5">
            <label htmlFor="newapt-client" className="text-xs font-semibold text-[#141413]">
              Cliente Cadastrado
            </label>
            <select
              id="newapt-client"
              value={newAptClientId}
              onChange={(e) => setNewAptClientId(e.target.value)}
              className="min-h-[42px] rounded-lg border border-[#DEDAD0] bg-white px-3 text-sm text-[#141413]"
            >
              {clients.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.fullName} — {c.phoneWhatsapp}
                  {c.noShowCount >= 2 ? ` (Alerta: ${c.noShowCount} faltas)` : ''}
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="flex flex-col gap-1.5">
              <label htmlFor="newapt-staff" className="text-xs font-semibold text-[#141413]">
                Profissional Principal
              </label>
              <select
                id="newapt-staff"
                value={newAptStaffId}
                onChange={(e) => setNewAptStaffId(e.target.value)}
                className="min-h-[40px] rounded-lg border border-[#DEDAD0] bg-white px-3 text-xs text-[#141413]"
              >
                {professionals.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.chairLabel} — {p.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex flex-col gap-1.5">
              <label htmlFor="newapt-aux" className="text-xs font-semibold text-[#141413]">
                Auxiliar / Assistente (Trinks)
              </label>
              <select
                id="newapt-aux"
                value={newAptAssistantId}
                onChange={(e) => setNewAptAssistantId(e.target.value)}
                className="min-h-[40px] rounded-lg border border-[#DEDAD0] bg-white px-3 text-xs text-[#141413]"
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

            <div className="flex flex-col gap-1.5">
              <label htmlFor="newapt-time" className="text-xs font-semibold text-[#141413]">
                Horário de Início
              </label>
              <input
                id="newapt-time"
                type="time"
                value={newAptTime}
                onChange={(e) => setNewAptTime(e.target.value)}
                className="num-tabular min-h-[40px] rounded-lg border border-[#DEDAD0] bg-white px-3 text-xs text-[#141413]"
              />
            </div>
          </div>

          <div className="flex flex-col gap-1.5">
            <span className="text-xs font-semibold text-[#141413]">
              Serviços Selecionados
            </span>
            <div className="divide-y divide-[#DEDAD0] rounded-lg border border-[#DEDAD0] bg-[#F6F5F0]/50">
              {services.map((srv) => {
                const checked = newAptServiceIds.includes(srv.id);
                return (
                  <label
                    key={srv.id}
                    className="flex cursor-pointer items-center justify-between px-3.5 py-2.5 text-xs hover:bg-white"
                  >
                    <span className="flex items-center gap-2.5">
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

          <div className="flex items-center justify-end gap-2.5 border-t border-[#DEDAD0] pt-4">
            <button
              type="button"
              onClick={() => setNewAptOpen(false)}
              className="min-h-[40px] rounded-lg border border-[#DEDAD0] bg-white px-4 py-2 text-xs font-medium text-[#4A4843]"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="min-h-[40px] inline-flex items-center gap-2 rounded-lg bg-[#0F766E] px-5 py-2 text-xs font-semibold text-white hover:bg-[#0B5C56]"
            >
              <CheckCircle size={16} weight="bold" />
              <span>Confirmar Horário</span>
            </button>
          </div>
        </form>
      </LightDismissDialog>
    </section>
  );
};
