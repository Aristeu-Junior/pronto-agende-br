import React, { useEffect, useMemo, useState } from 'react';
import {
  CalendarPlus,
  CheckCircle,
  Clock,
  Copy,
  GlobeHemisphereWest,
  MapPin,
  QrCode,
  ShieldCheck,
  ShieldWarning,
  Star,
  Storefront,
  UserCheck,
  WhatsappLogo,
} from '@phosphor-icons/react';
import {
  Appointment,
  BusinessConfig,
  Client,
  OriginChannel,
  ServiceItem,
  StaffMember,
} from '../types';
import { formatBRL, formatPhoneBR, isValidPhoneBR } from '../utils/validators';

interface PublicBookingModuleProps {
  business: BusinessConfig;
  staff: StaffMember[];
  services: ServiceItem[];
  clients: Client[];
  initialOrigin?: OriginChannel;
  onCreatePublicBooking: (apt: Omit<Appointment, 'id'>) => void;
  onNavigateToAgenda: () => void;
}

const AVAILABLE_SLOTS = ['16:00', '16:45', '17:30', '18:15', '19:00'];

export const PublicBookingModule: React.FC<PublicBookingModuleProps> = ({
  business,
  staff,
  services,
  clients,
  initialOrigin,
  onCreatePublicBooking,
  onNavigateToAgenda,
}) => {
  const professionals = useMemo(
    () => staff.filter((s) => s.role === 'PROFESSIONAL'),
    [staff]
  );

  const [simulatedOrigin, setSimulatedOrigin] = useState<OriginChannel>(
    initialOrigin || 'GOOGLE_RESERVE'
  );

  useEffect(() => {
    if (initialOrigin) {
      setSimulatedOrigin(initialOrigin);
    }
  }, [initialOrigin]);
  const [selectedServiceIds, setSelectedServiceIds] = useState<string[]>([
    services[0]?.id || 'srv_corte_degrade',
  ]);
  const [selectedStaffId, setSelectedStaffId] = useState<string>(
    professionals[0]?.id || 'st_caio'
  );
  const [selectedSlot, setSelectedSlot] = useState<string>('16:45');
  const [customerName, setCustomerName] = useState<string>(
    'Henrique Albuquerque'
  );
  const [customerPhone, setCustomerPhone] =
    useState<string>('(11) 98812-4501');
  const [pixPaidConfirmed, setPixPaidConfirmed] = useState<boolean>(false);
  const [pixCopied, setPixCopied] = useState<boolean>(false);
  const [formError, setFormError] = useState<string>('');
  const [bookingConfirmed, setBookingConfirmed] = useState<boolean>(false);

  const isQuotaReached =
    business.planTier === 'FREE' &&
    business.monthlyBookingsUsed >= business.monthlyBookingsLimit;

  const matchedClient = useMemo(() => {
    const cleanInput = customerPhone.replace(/\D/g, '');
    if (!cleanInput) return null;
    return (
      clients.find(
        (c) => c.phoneWhatsapp.replace(/\D/g, '') === cleanInput
      ) || null
    );
  }, [clients, customerPhone]);

  const requiresPixDeposit = Boolean(
    matchedClient && matchedClient.noShowCount >= 2
  );

  const selectedServices = useMemo(
    () => services.filter((s) => selectedServiceIds.includes(s.id)),
    [services, selectedServiceIds]
  );

  const totalAmount = useMemo(
    () => selectedServices.reduce((acc, s) => acc + s.price, 0),
    [selectedServices]
  );

  const totalDuration = useMemo(
    () => selectedServices.reduce((acc, s) => acc + s.durationMinutes, 0),
    [selectedServices]
  );

  const requiredDepositAmount = requiresPixDeposit
    ? Number(((totalAmount * business.noShowDepositPercent) / 100).toFixed(2))
    : 0;

  const toggleService = (id: string) => {
    setBookingConfirmed(false);
    setFormError('');
    setSelectedServiceIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  const applyPresetProfile = (type: 'LOYAL' | 'NOSHOW' | 'NEW_BOOST') => {
    setBookingConfirmed(false);
    setFormError('');
    if (type === 'LOYAL') {
      setCustomerName('Henrique Albuquerque');
      setCustomerPhone('(11) 98812-4501');
      setSimulatedOrigin('DIRECT_LINK');
      setPixPaidConfirmed(false);
    } else if (type === 'NOSHOW') {
      setCustomerName('Breno Siqueira Tavares');
      setCustomerPhone('(11) 99104-8372');
      setSimulatedOrigin('GOOGLE_RESERVE');
      setPixPaidConfirmed(false);
    } else {
      setCustomerName('Lucas Evangelista');
      setCustomerPhone('(11) 99540-2219');
      setSimulatedOrigin('MARKETPLACE_BOOST');
      setPixPaidConfirmed(false);
    }
  };

  const handleConfirmPublicBooking = (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedServiceIds.length === 0) {
      setFormError('Selecione ao menos 1 serviço para continuar.');
      return;
    }
    if (customerName.trim().length < 3) {
      setFormError('Informe seu nome para identificar a reserva.');
      return;
    }
    if (!isValidPhoneBR(customerPhone)) {
      setFormError('Informe seu WhatsApp com DDD (10 ou 11 dígitos).');
      return;
    }
    if (requiresPixDeposit && !pixPaidConfirmed) {
      setFormError(
        `Para confirmar seu horário, conclua a validação do Sinal Pix de ${formatBRL(requiredDepositAmount)}.`
      );
      return;
    }

    const [h, m] = selectedSlot.split(':').map(Number);
    const endMinutes = h * 60 + m + totalDuration;
    const endH = String(Math.floor(endMinutes / 60)).padStart(2, '0');
    const endM = String(endMinutes % 60).padStart(2, '0');

    onCreatePublicBooking({
      clientId: matchedClient?.id || `cli_pub_${Date.now()}`,
      clientName: customerName.trim(),
      clientPhone: customerPhone,
      staffId: selectedStaffId,
      serviceIds: selectedServiceIds,
      date: '2026-10-31',
      startTime: selectedSlot,
      endTime: `${endH}:${endM}`,
      status: 'CONFIRMED',
      isWalkIn: false,
      isFirstVisitBoost:
        simulatedOrigin === 'MARKETPLACE_BOOST' && !matchedClient,
      originChannel: simulatedOrigin,
      deviceFingerprint: `bf_pub_${simulatedOrigin.toLowerCase()}_98a1`,
      depositPixPaid: requiredDepositAmount,
      notes:
        simulatedOrigin === 'GOOGLE_RESERVE'
          ? 'Reserva pública via integração Reserve with Google.'
          : simulatedOrigin === 'MARKETPLACE_BOOST'
          ? 'Cliente novo originado pela Vitrine Marketplace Boost.'
          : 'Reserva pública via Link Próprio da Barbearia.',
    });

    setFormError('');
    setBookingConfirmed(true);
  };

  return (
    <section aria-label="Página Pública de Agendamento do Negócio e Simulador Google Reserve">
      {/* Barra de Simulação de Origem & Perfis para Teste das Regras Unificadas */}
      <div className="border-b border-[#DEDAD0] bg-white px-4 py-4 sm:px-6">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h1 className="text-xl font-semibold tracking-tight text-[#141413] sm:text-2xl">
              Página Pública do Negócio & Integração Google Reserve
            </h1>
            <p className="mt-1 text-sm text-[#4A4843]">
              Visão mobile-first do cliente final unindo Google Reserve (Trinks), atribuição Boost (_bf Booksy) e cadastro sem atrito (Reservio).
            </p>
          </div>

          {/* Botões rápidos para testar os cenários de regras de negócio */}
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => applyPresetProfile('LOYAL')}
              className="rounded-lg border border-[#DEDAD0] bg-[#F6F5F0] px-3 py-1.5 text-xs font-medium text-[#141413] hover:bg-[#EFECE6]"
            >
              Testar Cliente Fiel (Sem Sinal)
            </button>
            <button
              type="button"
              onClick={() => applyPresetProfile('NOSHOW')}
              className="rounded-lg border border-[#B45309]/40 bg-[#FEF3C7] px-3 py-1.5 text-xs font-medium text-[#B45309] hover:bg-[#FDE68A]"
            >
              Testar Cliente c/ 2 Faltas (Exige Sinal Pix)
            </button>
            <button
              type="button"
              onClick={() => applyPresetProfile('NEW_BOOST')}
              className="rounded-lg border border-[#0F766E]/40 bg-[#E6F4F1] px-3 py-1.5 text-xs font-medium text-[#0F766E]"
            >
              Testar Novo Cliente via Boost (15%)
            </button>
          </div>
        </div>
      </div>

      {/* Container Mobile-First do Estabelecimento + Resumo Lateral */}
      <div className="grid grid-cols-1 lg:grid-cols-12 divide-y lg:divide-y-0 lg:divide-x divide-[#DEDAD0] bg-white">
        <div className="lg:col-span-7 p-4 sm:p-6 space-y-6">
          {/* Cabeçalho Público da Barbearia */}
          <div className="rounded-lg border border-[#DEDAD0] bg-[#F6F5F0]/70 p-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="text-lg font-bold text-[#141413]">
                  {business.name}
                </h2>
                {business.bestBadge && (
                  <span className="inline-flex items-center gap-1 rounded bg-[#141413] px-2 py-0.5 text-[11px] font-semibold text-white">
                    <Star size={12} weight="fill" />
                    <span>Top Avaliado Pinheiros</span>
                  </span>
                )}
              </div>
              <p className="mt-1 flex items-center gap-1.5 text-xs text-[#4A4843]">
                <MapPin size={14} weight="bold" />
                <span>
                  {business.address} · {business.neighborhood}, {business.cityState}
                </span>
              </p>
            </div>

            <div className="text-left sm:text-right">
              <span className="num-tabular text-lg font-bold text-[#0F766E]">
                {business.reviewsRank.toFixed(1)} / 5.0
              </span>
              <span className="num-tabular block text-[11px] text-[#6E6A63]">
                {business.reviewsCount} avaliações verificadas
              </span>
            </div>
          </div>

          {/* Seletor de Canal de Origem Simulado */}
          <div>
            <span className="block text-xs font-semibold text-[#141413] mb-2">
              Canal de Entrada do Cliente (Rastreamento de Origem Auditável)
            </span>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
              {(
                [
                  {
                    id: 'GOOGLE_RESERVE',
                    title: 'Reservar com Google',
                    desc: 'Busca Google / Maps (0% taxa)',
                  },
                  {
                    id: 'DIRECT_LINK',
                    title: 'Link da Bio / QR Code',
                    desc: 'Cliente orgânico (0% taxa)',
                  },
                  {
                    id: 'MARKETPLACE_BOOST',
                    title: 'Vitrine Boost',
                    desc: '15% só na 1ª visita inédita',
                  },
                ] as Array<{ id: OriginChannel; title: string; desc: string }>
              ).map((ch) => (
                <button
                  key={ch.id}
                  type="button"
                  onClick={() => setSimulatedOrigin(ch.id)}
                  className={`rounded-lg border p-3 text-left text-xs ${
                    simulatedOrigin === ch.id
                      ? 'border-[#0F766E] bg-[#E6F4F1] text-[#0F766E]'
                      : 'border-[#DEDAD0] bg-white text-[#141413] hover:bg-[#F6F5F0]'
                  }`}
                >
                  <span className="font-semibold block">{ch.title}</span>
                  <span className="text-[11px] text-[#4A4843]">{ch.desc}</span>
                </button>
              ))}
            </div>
          </div>

          {isQuotaReached ? (
            <div
              role="alert"
              className="rounded-lg border border-[#B45309]/40 bg-[#FEF3C7] p-5 space-y-3"
            >
              <h3 className="text-base font-semibold text-[#B45309]">
                Agenda Online do Mês Completa ({business.monthlyBookingsUsed}/
                {business.monthlyBookingsLimit} reservas no Plano Grátis)
              </h3>
              <p className="text-xs text-[#4A4843] leading-relaxed">
                Ao contrário do Reservio (que exibe erro técnico bloqueante), o ProntoAgende direciona o cliente automaticamente para o WhatsApp da recepção enquanto o gestor continua operando o caixa e encaixes normalmente.
              </p>
            </div>
          ) : (
            <form onSubmit={handleConfirmPublicBooking} className="space-y-5" noValidate>
              {/* Etapa 1: Serviços */}
              <div>
                <h3 className="text-sm font-semibold text-[#141413]">
                  1. Escolha os Serviços Desejados
                </h3>
                <div className="mt-2 divide-y divide-[#DEDAD0] rounded-lg border border-[#DEDAD0]">
                  {services.map((srv) => {
                    const checked = selectedServiceIds.includes(srv.id);
                    return (
                      <label
                        key={srv.id}
                        className={`flex cursor-pointer items-center justify-between px-4 py-3 text-xs ${
                          checked ? 'bg-[#E6F4F1]/45' : 'bg-white hover:bg-[#F6F5F0]/60'
                        }`}
                      >
                        <span className="flex items-center gap-3">
                          <input
                            type="checkbox"
                            checked={checked}
                            onChange={() => toggleService(srv.id)}
                            className="h-4 w-4 accent-[#0F766E]"
                          />
                          <span>
                            <strong className="font-medium text-[#141413] block">
                              {srv.name}
                            </strong>
                            <span className="num-tabular text-[11px] text-[#6E6A63]">
                              Duração estimada: {srv.durationMinutes} min
                            </span>
                          </span>
                        </span>
                        <span className="num-tabular font-semibold text-[#141413]">
                          {formatBRL(srv.price)}
                        </span>
                      </label>
                    );
                  })}
                </div>
              </div>

              {/* Etapa 2: Profissional e Horário */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label
                    htmlFor="pub-staff"
                    className="block text-sm font-semibold text-[#141413] mb-2"
                  >
                    2. Profissional Preferido
                  </label>
                  <select
                    id="pub-staff"
                    value={selectedStaffId}
                    onChange={(e) => setSelectedStaffId(e.target.value)}
                    className="min-h-[42px] w-full rounded-lg border border-[#DEDAD0] bg-white px-3 text-xs text-[#141413]"
                  >
                    {professionals.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name} — {p.chairLabel}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <span className="block text-sm font-semibold text-[#141413] mb-2">
                    3. Horário Disponível Hoje (31/10)
                  </span>
                  <div className="flex flex-wrap gap-1.5">
                    {AVAILABLE_SLOTS.map((slot) => (
                      <button
                        key={slot}
                        type="button"
                        onClick={() => setSelectedSlot(slot)}
                        className={`num-tabular min-h-[38px] rounded-lg border px-3 py-1.5 text-xs font-semibold ${
                          selectedSlot === slot
                            ? 'border-[#0F766E] bg-[#0F766E] text-white'
                            : 'border-[#DEDAD0] bg-white text-[#141413] hover:bg-[#F6F5F0]'
                        }`}
                      >
                        {slot}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Etapa 4: Identificação Sem Senha (Nome + WhatsApp) */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                <div className="flex flex-col gap-1.5">
                  <label
                    htmlFor="pub-name"
                    className="text-xs font-semibold text-[#141413]"
                  >
                    Seu Nome
                  </label>
                  <input
                    id="pub-name"
                    type="text"
                    value={customerName}
                    onChange={(e) => setCustomerName(e.target.value)}
                    className="min-h-[40px] rounded-lg border border-[#DEDAD0] bg-white px-3 text-sm text-[#141413]"
                  />
                </div>

                <div className="flex flex-col gap-1.5">
                  <label
                    htmlFor="pub-phone"
                    className="text-xs font-semibold text-[#141413]"
                  >
                    Seu WhatsApp (Confirmação Automática)
                  </label>
                  <input
                    id="pub-phone"
                    type="tel"
                    inputMode="numeric"
                    value={customerPhone}
                    onChange={(e) => {
                      setCustomerPhone(formatPhoneBR(e.target.value));
                      setFormError('');
                    }}
                    className="num-tabular min-h-[40px] rounded-lg border border-[#DEDAD0] bg-white px-3 text-sm text-[#141413]"
                  />
                </div>
              </div>

              {/* Regra Dinâmica Anti-No-Show: Exige Sinal Pix apenas se noShowCount >= 2 */}
              {requiresPixDeposit ? (
                <div className="rounded-lg border border-[#B45309]/40 bg-[#FEF3C7]/70 p-4 space-y-3">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <strong className="text-xs font-semibold text-[#B45309] flex items-center gap-1.5">
                        <ShieldWarning size={17} weight="fill" />
                        <span>
                          Garantia Anti-No-Show Ativada ({matchedClient?.noShowCount} faltas anteriores registradas)
                        </span>
                      </strong>
                      <p className="mt-1 text-xs text-[#4A4843]">
                        Para reservar este horário, é necessário adiantar o Sinal Pix de{' '}
                        <strong className="num-tabular text-[#141413]">
                          {business.noShowDepositPercent}% ({formatBRL(requiredDepositAmount)})
                        </strong>
                        , abatido integralmente na comanda final.
                      </p>
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setPixCopied(true)}
                      className="inline-flex items-center gap-1.5 rounded-lg border border-[#DEDAD0] bg-white px-3 py-1.5 text-xs font-medium text-[#141413]"
                    >
                      <Copy size={15} weight="bold" />
                      <span>
                        {pixCopied
                          ? 'Código Pix Copiado!'
                          : 'Copiar Chave Pix Copia-e-Cola'}
                      </span>
                    </button>

                    <label className="inline-flex cursor-pointer items-center gap-2 rounded-lg border border-[#0F766E] bg-[#E6F4F1] px-3 py-1.5 text-xs font-semibold text-[#0F766E]">
                      <input
                        type="checkbox"
                        checked={pixPaidConfirmed}
                        onChange={(e) => {
                          setPixPaidConfirmed(e.target.checked);
                          if (formError) setFormError('');
                        }}
                        className="h-4 w-4 accent-[#0F766E]"
                      />
                      <span>Simular Pagamento Pix Confirmado ({formatBRL(requiredDepositAmount)})</span>
                    </label>
                  </div>
                </div>
              ) : (
                <div className="rounded-lg border border-[#0F766E]/30 bg-[#E6F4F1]/60 p-3 text-xs text-[#0F766E] flex items-center gap-2">
                  <ShieldCheck size={18} weight="fill" />
                  <span>
                    <strong>Score de Presença Positivo:</strong> Reserva liberada em 1 clique sem cobrança antecipada. Cancelamento gratuito até {business.cancelNoticeHours}h antes.
                  </span>
                </div>
              )}

              {formError && (
                <p role="alert" className="text-xs font-medium text-[#B91C1C]">
                  {formError}
                </p>
              )}

              <button
                type="submit"
                className="w-full min-h-[46px] inline-flex items-center justify-center gap-2 rounded-lg bg-[#0F766E] px-5 py-3 text-sm font-semibold text-white hover:bg-[#0B5C56]"
              >
                <CalendarPlus size={19} weight="bold" />
                <span>
                  Confirmar Agendamento ({formatBRL(totalAmount)} · {selectedSlot})
                </span>
              </button>
            </form>
          )}
        </div>

        {/* Coluna Direita (5 cols): Telemetria de Conversão & Confirmação ao Vivo */}
        <aside className="lg:col-span-5 bg-[#F6F5F0]/50 p-4 sm:p-6 space-y-4">
          <h2 className="text-base font-semibold text-[#141413]">
            Espelho de Regras Aplicadas na Reserva Pública
          </h2>

          {bookingConfirmed && (
            <div
              role="status"
              className="rounded-lg border border-[#0F766E] bg-[#E6F4F1] p-4 space-y-3 text-xs text-[#141413]"
            >
              <strong className="flex items-center gap-1.5 text-sm font-semibold text-[#0F766E]">
                <CheckCircle size={18} weight="fill" />
                <span>Horário Confirmado e Inserido na Agenda!</span>
              </strong>
              <p className="text-[#4A4843]">
                A reserva de <strong>{customerName}</strong> às{' '}
                <strong className="num-tabular">{selectedSlot}</strong> já está visível no Quadro de Cadeiras do gestor.
              </p>
              <button
                type="button"
                onClick={onNavigateToAgenda}
                className="rounded-lg bg-[#0F766E] px-3.5 py-2 text-xs font-semibold text-white hover:bg-[#0B5C56]"
              >
                Ver Horário no Quadro de Cadeiras
              </button>
            </div>
          )}

          <div className="rounded-lg border border-[#DEDAD0] bg-white p-4 space-y-3 text-xs">
            <div className="flex justify-between border-b border-[#DEDAD0] pb-2">
              <span className="text-[#4A4843]">Canal de Origem Detectado:</span>
              <span className="font-semibold text-[#141413]">{simulatedOrigin}</span>
            </div>

            <div className="flex justify-between border-b border-[#DEDAD0] pb-2">
              <span className="text-[#4A4843]">Histórico do WhatsApp Informado:</span>
              <span className="font-medium text-[#141413]">
                {matchedClient
                  ? `${matchedClient.visitsCount} visitas / ${matchedClient.noShowCount} faltas`
                  : 'Cliente Inédito na Base'}
              </span>
            </div>

            <div className="flex justify-between border-b border-[#DEDAD0] pb-2">
              <span className="text-[#4A4843]">Comissão de Marketplace (Boost):</span>
              <span className="num-tabular font-semibold text-[#0F766E]">
                {simulatedOrigin === 'MARKETPLACE_BOOST' && !matchedClient
                  ? `15% na 1ª visita (${formatBRL((totalAmount * 15) / 100)})`
                  : 'R$ 0,00 (100% Isento)'}
              </span>
            </div>

            <div className="flex justify-between">
              <span className="text-[#4A4843]">Cota Mensal Freemium:</span>
              <span className="num-tabular font-semibold text-[#141413]">
                {business.monthlyBookingsUsed} /{' '}
                {business.planTier === 'PRO'
                  ? 'Ilimitado'
                  : business.monthlyBookingsLimit}
              </span>
            </div>
          </div>
        </aside>
      </div>
    </section>
  );
};
