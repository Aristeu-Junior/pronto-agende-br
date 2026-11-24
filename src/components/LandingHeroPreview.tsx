import React, { useEffect, useMemo, useState } from 'react';
import {
  CalendarCheck,
  CheckCircle,
  Clock,
  CurrencyDollar,
  DeviceMobile,
  Pause,
  Play,
  QrCode,
  Scissors,
  WhatsappLogo,
} from '@phosphor-icons/react';
import { PaymentMethod } from '../types';
import { calculatePartnerSplit, formatBRL } from '../utils/validators';

type PreviewStage = 0 | 1 | 2;

const STAGES: Array<{
  id: PreviewStage;
  step: string;
  label: string;
}> = [
  { id: 0, step: '01', label: 'Cliente agenda' },
  { id: 1, step: '02', label: 'Cai na Agenda' },
  { id: 2, step: '03', label: 'Caixa & Comissão' },
];

const DEMO_SERVICES = [
  { id: 'corte', name: 'Corte Masculino', durationMinutes: 40, price: 45 },
  { id: 'barba', name: 'Barba Completa', durationMinutes: 30, price: 35 },
  { id: 'combo', name: 'Combo Corte + Barba', durationMinutes: 60, price: 70 },
] as const;

const DEMO_SLOTS = ['13:30', '14:30', '16:00', '17:30'] as const;

const PAYMENT_OPTIONS: Array<{
  id: Extract<PaymentMethod, 'PIX' | 'DEBIT_CARD' | 'CREDIT_CARD'>;
  label: string;
  feeTag: string;
}> = [
  { id: 'PIX', label: 'Pix', feeTag: '0%' },
  { id: 'DEBIT_CARD', label: 'Débito', feeTag: '1,99%' },
  { id: 'CREDIT_CARD', label: 'Crédito', feeTag: '3,99%' },
];

export const LandingHeroPreview: React.FC = () => {
  const [stage, setStage] = useState<PreviewStage>(0);
  const [paused, setPaused] = useState<boolean>(() => {
    try {
      return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    } catch {
      return false;
    }
  });

  const [selectedServiceId, setSelectedServiceId] = useState<string>('combo');
  const [selectedSlot, setSelectedSlot] = useState<string>('14:30');
  const [depositConfirmed, setDepositConfirmed] = useState<boolean>(true);
  const [paymentMethod, setPaymentMethod] =
    useState<Extract<PaymentMethod, 'PIX' | 'DEBIT_CARD' | 'CREDIT_CARD'>>('PIX');

  useEffect(() => {
    if (paused) return;
    const timer = window.setInterval(() => {
      setStage((prev) => ((prev + 1) % 3) as PreviewStage);
    }, 3500);
    return () => window.clearInterval(timer);
  }, [paused]);

  const selectedService =
    DEMO_SERVICES.find((s) => s.id === selectedServiceId) ?? DEMO_SERVICES[2];
  const depositAmount = Number((selectedService.price * 0.3).toFixed(2));

  const split = useMemo(
    () =>
      calculatePartnerSplit({
        subtotalServices: selectedService.price,
        subtotalProducts: 0,
        discountAmount: 0,
        tipAmount: 0,
        serviceCommissionPct: 50,
        productCommissionPct: 0,
        assistantSharePct: 0,
        hasAssistant: false,
        paymentMethod,
        feeSplitRule: 'PROPORTIONAL',
        isFirstVisitBoost: false,
        boostCommissionPct: 0,
      }),
    [selectedService.price, paymentMethod]
  );

  const activePaymentOption =
    PAYMENT_OPTIONS.find((p) => p.id === paymentMethod) ?? PAYMENT_OPTIONS[0];

  return (
    <div className="relative rounded-3xl border border-stone-800 bg-stone-900 p-4 sm:p-5 shadow-2xl shadow-amber-500/5">
      {/* Barra superior do mockup */}
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-stone-800 pb-3.5">
        <div className="flex items-center gap-2">
          <span className="inline-flex h-2.5 w-2.5 rounded-full bg-emerald-500" />
          <span className="font-mono text-[11px] font-semibold uppercase tracking-wider text-stone-300">
            Simulação interativa do app
          </span>
        </div>

        <button
          type="button"
          onClick={() => setPaused((p) => !p)}
          data-compact
          className="inline-flex items-center gap-1.5 rounded-lg border border-stone-800 bg-tint-50 px-2.5 py-1 text-[11px] font-semibold text-stone-300 hover:border-amber-500/50 hover:text-stone-100 cursor-pointer"
        >
          {paused ? (
            <>
              <Play className="h-3.5 w-3.5 text-amber-500" weight="fill" />
              <span>Retomar</span>
            </>
          ) : (
            <>
              <Pause className="h-3.5 w-3.5 text-amber-500" weight="fill" />
              <span>Pausar</span>
            </>
          )}
        </button>
      </div>

      {/* Seletor das 3 etapas */}
      <div
        role="tablist"
        aria-label="Etapas do atendimento no ProntoAgende"
        className="mt-3.5 grid grid-cols-3 gap-1.5 rounded-2xl border border-stone-800 bg-tint-50 p-1"
      >
        {STAGES.map((item) => {
          const active = stage === item.id;
          return (
            <button
              key={item.id}
              type="button"
              role="tab"
              aria-selected={active}
              onClick={() => setStage(item.id)}
              data-compact
              className={`flex flex-col sm:flex-row items-center justify-center gap-1 rounded-xl px-2 py-2 text-[11px] font-semibold transition-all cursor-pointer ${
                active
                  ? 'bg-amber-500 text-stone-950 shadow-sm'
                  : 'text-stone-400 hover:text-stone-100'
              }`}
            >
              <span className="font-mono text-[10px] opacity-80">{item.step}</span>
              <span className="truncate">{item.label}</span>
            </button>
          );
        })}
      </div>

      {/* Área animada de demonstração interativa */}
      <div key={stage} className="tab-enter mt-4 min-h-[304px] flex flex-col justify-between">
        {stage === 0 && (
          <div className="space-y-3 rounded-2xl border border-stone-800 bg-tint-50 p-4">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2 min-w-0">
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-amber-500 text-stone-950">
                  <DeviceMobile className="h-4 w-4" weight="bold" />
                </div>
                <div className="min-w-0">
                  <p className="text-xs font-bold text-stone-100 truncate">
                    Link de Reserva no Celular
                  </p>
                  <p className="font-mono text-[11px] text-stone-400 truncate">
                    #/reserva/barbearia-centro
                  </p>
                </div>
              </div>
              <span className="shrink-0 rounded-full bg-emerald-950 px-2.5 py-0.5 text-[11px] font-bold text-emerald-700">
                Sem app
              </span>
            </div>

            {/* Seleção interativa de serviço */}
            <div className="space-y-1.5">
              <p className="text-[11px] font-semibold text-stone-400">
                Escolha o serviço para simular:
              </p>
              <div className="grid grid-cols-1 gap-1.5">
                {DEMO_SERVICES.map((srv) => {
                  const selected = srv.id === selectedService.id;
                  return (
                    <button
                      key={srv.id}
                      type="button"
                      data-compact
                      onClick={() => {
                        setPaused(true);
                        setSelectedServiceId(srv.id);
                      }}
                      className={`w-full rounded-xl border px-3 py-2 flex items-center justify-between gap-2 text-left transition-all cursor-pointer ${
                        selected
                          ? 'border-amber-500 bg-stone-900 shadow-sm'
                          : 'border-stone-800 bg-stone-900/60 hover:border-stone-700'
                      }`}
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        <Scissors
                          className={`h-3.5 w-3.5 shrink-0 ${
                            selected ? 'text-amber-500' : 'text-stone-400'
                          }`}
                          weight="bold"
                        />
                        <span className="truncate text-xs font-bold text-stone-100">
                          {srv.name}
                        </span>
                        <span className="text-[11px] text-stone-400 shrink-0">
                          · {srv.durationMinutes} min
                        </span>
                      </div>
                      <span
                        className={`font-mono num-tabular text-xs font-bold shrink-0 ${
                          selected ? 'text-amber-800' : 'text-stone-300'
                        }`}
                      >
                        {formatBRL(srv.price)}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Seleção interativa de horário */}
            <div>
              <p className="mb-1.5 text-[11px] font-semibold text-stone-400">
                Horários livres na escala (toque para trocar):
              </p>
              <div className="grid grid-cols-4 gap-2">
                {DEMO_SLOTS.map((slot) => {
                  const selected = slot === selectedSlot;
                  return (
                    <button
                      key={slot}
                      type="button"
                      data-compact
                      onClick={() => {
                        setPaused(true);
                        setSelectedSlot(slot);
                      }}
                      className={`rounded-xl border py-2 text-center font-mono num-tabular text-xs font-bold transition-all cursor-pointer ${
                        selected
                          ? 'border-amber-500 bg-amber-500 text-stone-950'
                          : 'border-stone-800 bg-stone-900 text-stone-300 hover:border-stone-700'
                      }`}
                    >
                      {slot}
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="flex items-center justify-between rounded-xl border border-stone-800 bg-stone-900 px-3 py-2 text-xs">
              <span className="inline-flex items-center gap-1.5 text-stone-300">
                <QrCode className="h-4 w-4 text-amber-500" />
                Sinal Pix opcional (30%)
              </span>
              <span className="font-mono num-tabular font-bold text-emerald-700">
                {formatBRL(depositAmount)}
              </span>
            </div>
          </div>
        )}

        {stage === 1 && (
          <div className="space-y-3 rounded-2xl border border-stone-800 bg-tint-50 p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-amber-950 text-amber-800">
                  <CalendarCheck className="h-4 w-4" weight="bold" />
                </div>
                <div>
                  <p className="text-xs font-bold text-stone-100">
                    Agenda do Dia · Barbeiro Rafael
                  </p>
                  <p className="text-[11px] text-stone-400">
                    Sem conflito de horário (bloqueio no servidor)
                  </p>
                </div>
              </div>
              <span className="rounded-full bg-amber-950 px-2.5 py-0.5 font-mono text-[11px] font-bold text-amber-800">
                Hoje
              </span>
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between rounded-xl border border-stone-800 bg-stone-900 px-3.5 py-2.5 opacity-75">
                <div className="flex items-center gap-3">
                  <span className="font-mono num-tabular text-xs font-bold text-stone-400">
                    09:30
                  </span>
                  <div>
                    <p className="text-xs font-semibold text-stone-200">
                      Matheus Almeida
                    </p>
                    <p className="text-[11px] text-stone-400">Corte Masculino</p>
                  </div>
                </div>
                <span className="rounded-lg bg-tint-100 px-2 py-0.5 text-[11px] font-semibold text-stone-400">
                  Concluído
                </span>
              </div>

              {/* Card dinâmico refletindo serviço + horário da Etapa 1 */}
              <div className="rounded-xl border-2 border-amber-500 bg-stone-900 p-3.5 shadow-md shadow-amber-500/10 space-y-2.5">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <span className="rounded-lg bg-amber-500 px-2 py-1 font-mono num-tabular text-xs font-bold text-stone-950 shrink-0">
                      {selectedSlot}
                    </span>
                    <div className="min-w-0">
                      <p className="truncate text-xs font-bold text-stone-100">
                        Lucas Ferreira · Link 24h
                      </p>
                      <p className="truncate text-[11px] text-stone-400">
                        {selectedService.name} ({selectedService.durationMinutes} min) ·{' '}
                        <span className="font-mono num-tabular font-semibold text-stone-200">
                          {formatBRL(selectedService.price)}
                        </span>
                      </p>
                    </div>
                  </div>
                  <span
                    className={`inline-flex shrink-0 items-center gap-1 rounded-lg px-2.5 py-1 text-[11px] font-bold ${
                      depositConfirmed
                        ? 'bg-emerald-950 text-emerald-700'
                        : 'bg-amber-950 text-amber-800'
                    }`}
                  >
                    {depositConfirmed ? (
                      <>
                        <CheckCircle className="h-3.5 w-3.5" weight="fill" />
                        <span>Confirmado</span>
                      </>
                    ) : (
                      <>
                        <Clock className="h-3.5 w-3.5" weight="bold" />
                        <span>Aguardando sinal</span>
                      </>
                    )}
                  </span>
                </div>

                <div className="flex flex-wrap items-center justify-between gap-2 border-t border-stone-800 pt-2">
                  <span className="text-[11px] text-stone-400">
                    Sinal Pix:{' '}
                    <strong className="font-mono num-tabular text-stone-200">
                      {formatBRL(depositAmount)}
                    </strong>
                  </span>
                  <button
                    type="button"
                    data-compact
                    onClick={() => {
                      setPaused(true);
                      setDepositConfirmed((prev) => !prev);
                    }}
                    className={`rounded-lg px-2.5 py-1 text-[11px] font-bold transition-all cursor-pointer ${
                      depositConfirmed
                        ? 'border border-stone-800 bg-tint-50 text-stone-300 hover:border-amber-500'
                        : 'bg-emerald-500 text-ink-dark hover:bg-emerald-600'
                    }`}
                  >
                    {depositConfirmed
                      ? 'Simular sinal pendente'
                      : 'Confirmar sinal Pix'}
                  </button>
                </div>
              </div>

              <div className="flex items-center justify-between rounded-xl border border-stone-800 bg-stone-900 px-3.5 py-2 text-xs">
                <div className="flex items-center gap-2 text-stone-300">
                  <WhatsappLogo className="h-4 w-4 text-emerald-700" weight="bold" />
                  <span>Lembrete personalizado pronto para o cliente</span>
                </div>
                <span className="font-mono text-[11px] font-bold text-emerald-700">
                  1 clique
                </span>
              </div>
            </div>
          </div>
        )}

        {stage === 2 && (
          <div className="space-y-3 rounded-2xl border border-stone-800 bg-tint-50 p-4">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2 min-w-0">
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-emerald-500 text-ink-dark">
                  <CurrencyDollar className="h-4 w-4" weight="bold" />
                </div>
                <div className="min-w-0">
                  <p className="text-xs font-bold text-stone-100 truncate">
                    Caixa / PDV · Salão Parceiro
                  </p>
                  <p className="text-[11px] text-stone-400 truncate">
                    Troque o pagamento para recalcular taxa e comissão
                  </p>
                </div>
              </div>
              <span className="shrink-0 rounded-full bg-emerald-950 px-2.5 py-0.5 text-[11px] font-bold text-emerald-700 font-mono">
                {activePaymentOption.label} · {activePaymentOption.feeTag}
              </span>
            </div>

            {/* Alternador de forma de pagamento */}
            <div className="grid grid-cols-3 gap-2">
              {PAYMENT_OPTIONS.map((opt) => {
                const active = opt.id === paymentMethod;
                return (
                  <button
                    key={opt.id}
                    type="button"
                    data-compact
                    onClick={() => {
                      setPaused(true);
                      setPaymentMethod(opt.id);
                    }}
                    className={`rounded-xl border px-2.5 py-2 text-center transition-all cursor-pointer ${
                      active
                        ? 'border-amber-500 bg-amber-500 text-stone-950 shadow-sm'
                        : 'border-stone-800 bg-stone-900 text-stone-300 hover:border-stone-700'
                    }`}
                  >
                    <span className="block text-xs font-bold">{opt.label}</span>
                    <span className="block font-mono text-[10px] opacity-85">
                      {opt.feeTag} taxa
                    </span>
                  </button>
                );
              })}
            </div>

            <div className="rounded-2xl border border-stone-800 bg-stone-900 p-3.5 space-y-2">
              <div className="flex items-center justify-between text-xs text-stone-300">
                <span>Valor ({selectedService.name})</span>
                <span className="font-mono num-tabular text-sm font-bold text-stone-100">
                  {formatBRL(split.totalAmount)}
                </span>
              </div>
              <div className="flex items-center justify-between text-xs text-stone-400">
                <span>
                  {depositConfirmed ? 'Sinal Pix já abatido' : 'Sinal Pix opcional'}
                </span>
                <span className="font-mono num-tabular font-semibold text-emerald-700">
                  {depositConfirmed ? `- ${formatBRL(depositAmount)}` : formatBRL(0)}
                </span>
              </div>
              <div className="flex items-center justify-between text-xs text-stone-400">
                <span>Taxa maquininha ({split.acquirerFeePct}%) · Proporcional</span>
                <span className="font-mono num-tabular font-semibold text-amber-800">
                  - {formatBRL(split.acquirerFeeAmount)}
                </span>
              </div>
              <div className="border-t border-stone-800 pt-2 flex items-center justify-between text-xs">
                <span className="font-semibold text-stone-300">
                  Líquido do Barbeiro (50%)
                </span>
                <span className="font-mono num-tabular text-sm font-bold text-emerald-700">
                  {formatBRL(split.staffNetCommission)}
                </span>
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className="font-semibold text-stone-300">
                  Líquido da Barbearia
                </span>
                <span className="font-mono num-tabular text-sm font-bold text-amber-800">
                  {formatBRL(split.salonNetShare)}
                </span>
              </div>
            </div>
          </div>
        )}

        {/* Indicador de progresso inferior */}
        <div className="mt-3 flex items-center justify-between text-[11px] text-stone-400">
          <span>
            Etapa {stage + 1} de 3 · Clique nos serviços, horários e pagamentos
          </span>
          <span className="font-mono">prontoagende.com.br</span>
        </div>
      </div>
    </div>
  );
};
