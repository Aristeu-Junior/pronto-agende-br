import { HelpTip } from './HelpTip';
import React, { useMemo, useState } from 'react';
import {
  CaretDown,
  CheckCircle as CheckCircle2,
  CreditCard,
  CurrencyDollar as DollarSign,
  FileText,
  Paperclip,
  QrCode,
  Trash as Trash2,
} from '@phosphor-icons/react';
import {
  Appointment,
  BusinessConfig,
  Client,
  PaymentMethod,
  PosTransaction,
  ServiceItem,
  StaffMember,
} from '../types';
import {
  calculateTransactionSplit,
  formatCurrencyBRL,
  PAYMENT_METHOD_LABELS,
} from '../utils/finance';
import { sanitizeUserText, validateSafeReceiptFile } from '../utils/security';
import { localISODate } from '../utils/schedule';

interface PosModuleProps {
  business: BusinessConfig;
  staff: StaffMember[];
  services: ServiceItem[];
  clients: Client[];
  appointments: Appointment[];
  transactions: PosTransaction[];
  pendingCheckoutAppointmentId: string | null;
  onCompleteTransaction: (tx: PosTransaction, appointmentId?: string) => void;
  onDeleteTransaction?: (txId: string) => void;
}

export const PosModule: React.FC<PosModuleProps> = ({
  business,
  staff,
  services,
  clients,
  appointments,
  transactions,
  pendingCheckoutAppointmentId,
  onCompleteTransaction,
  onDeleteTransaction,
}) => {
  const preselectedApt = appointments.find(
    (a) => a.id === pendingCheckoutAppointmentId
  );

  const professionals = staff.filter((s) => s.role === 'PROFESSIONAL');

  const [clientNameInput, setClientNameInput] = useState<string>(
    preselectedApt?.clientName ?? ''
  );
  const [selectedStaffId, setSelectedStaffId] = useState<string>(
    preselectedApt?.staffId ?? professionals[0]?.id ?? staff[0]?.id ?? ''
  );
  const [selectedServiceIds, setSelectedServiceIds] = useState<string[]>(
    preselectedApt?.serviceIds ?? (services[0] ? [services[0].id] : [])
  );

  // Editable custom price for the cut/service
  const defaultServicesSum = useMemo(() => {
    if (preselectedApt?.customPrice !== undefined) {
      return preselectedApt.customPrice;
    }
    return selectedServiceIds.reduce((acc, id) => {
      const srv = services.find((s) => s.id === id);
      return acc + (srv?.price ?? 0);
    }, 0);
  }, [selectedServiceIds, services, preselectedApt]);

  const [customTotalInput, setCustomTotalInput] = useState<string>('');
  const [discountInput, setDiscountInput] = useState<string>('0');
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('PIX');
  const [receiptFileName, setReceiptFileName] = useState<string>(
    preselectedApt?.paymentProofName ?? ''
  );
  const [justClosedSuccess, setJustClosedSuccess] = useState(false);

  const activeTotalPrice =
    customTotalInput.trim() !== ''
      ? Math.max(0, Number(customTotalInput) || 0)
      : defaultServicesSum;

  const selectedStaff =
    staff.find((s) => s.id === selectedStaffId) ?? staff[0];

  const splitBreakdown = useMemo(() => {
    const discountAmount = Math.max(0, Number(discountInput) || 0);
    const serviceCommPct = selectedStaff?.defaultServiceCommissionPct ?? 50;

    return calculateTransactionSplit({
      subtotalServices: activeTotalPrice,
      subtotalProducts: 0,
      discountAmount,
      tipAmount: 0,
      paymentMethod,
      feeSplitRule: business.feeSplitRule,
      staffServiceCommissionPct: serviceCommPct,
      staffProductCommissionPct: 0,
      assistantSharePct: 0,
      isFirstVisitBoost: false,
      boostCommissionPct: 0,
    });
  }, [
    activeTotalPrice,
    discountInput,
    paymentMethod,
    business.feeSplitRule,
    selectedStaff,
  ]);

  const toggleService = (id: string) => {
    setCustomTotalInput(''); // recalculate from selected services
    setSelectedServiceIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  const handleLoadAppointment = (apt: Appointment) => {
    setClientNameInput(apt.clientName);
    setSelectedStaffId(apt.staffId);
    setSelectedServiceIds(apt.serviceIds);
    if (apt.customPrice !== undefined) {
      setCustomTotalInput(String(apt.customPrice));
    } else {
      setCustomTotalInput('');
    }
    if (apt.paymentProofName) {
      setReceiptFileName(apt.paymentProofName);
    }
  };

  const handleAttachReceipt = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const check = validateSafeReceiptFile(file);
    if (!check.valid) {
      alert(check.reason);
      e.target.value = '';
      return;
    }
    setReceiptFileName(check.safeName);
  };

  const handleFinalizeCheckout = (e: React.FormEvent) => {
    e.preventDefault();
    if (activeTotalPrice <= 0) return;

    const finalClientName =
      sanitizeUserText(clientNameInput.trim(), 80) || 'Cliente Avulso (Balcão)';
    const matchedClient = clients.find(
      (c) => c.fullName.toLowerCase() === finalClientName.toLowerCase()
    );

    const newTx: PosTransaction = {
      id: `tx_${Date.now()}`,
      appointmentId: preselectedApt?.id,
      clientId: matchedClient?.id ?? `cli_${Date.now()}`,
      clientName: finalClientName,
      staffId: selectedStaff?.id ?? 'st_01',
      staffName: selectedStaff?.name ?? 'Barbeiro',
      closedAt: new Date().toLocaleTimeString('pt-BR', {
        hour: '2-digit',
        minute: '2-digit',
      }),
      serviceIds: selectedServiceIds,
      productItems: [],
      paymentMethod,
      subtotalServices: splitBreakdown.subtotalServices,
      subtotalProducts: 0,
      discountAmount: splitBreakdown.discountAmount,
      tipAmount: 0,
      totalAmount: splitBreakdown.totalAmount,
      acquirerFeePct: splitBreakdown.acquirerFeePct,
      acquirerFeeAmount: splitBreakdown.acquirerFeeAmount,
      boostFeeAmount: 0,
      staffGrossCommission: splitBreakdown.staffGrossCommission,
      staffDeductedFee: splitBreakdown.staffDeductedFee,
      assistantCommission: 0,
      staffNetCommission: splitBreakdown.staffNetCommission,
      salonNetShare: splitBreakdown.salonNetShare,
      originChannel: preselectedApt?.originChannel ?? 'DIRECT_LINK',
      receiptAttachmentName: receiptFileName || undefined,
    };

    onCompleteTransaction(newTx, preselectedApt?.id);
    setClientNameInput('');
    setCustomTotalInput('');
    setDiscountInput('0');
    setReceiptFileName('');
    setJustClosedSuccess(true);
    setTimeout(() => setJustClosedSuccess(false), 3000);
  };

  // Summary of the day
  const dailySummary = useMemo(() => {
    return transactions.reduce(
      (acc, tx) => {
        acc.totalGross += tx.totalAmount;
        acc.totalSalon += tx.salonNetShare;
        acc.totalBarber += tx.staffNetCommission;
        if (tx.paymentMethod === 'PIX') acc.pixTotal += tx.totalAmount;
        if (
          tx.paymentMethod === 'CREDIT_CARD' ||
          tx.paymentMethod === 'DEBIT_CARD'
        ) {
          acc.cardTotal += tx.totalAmount;
        }
        if (tx.paymentMethod === 'CASH') acc.cashTotal += tx.totalAmount;
        return acc;
      },
      {
        totalGross: 0,
        totalSalon: 0,
        totalBarber: 0,
        pixTotal: 0,
        cardTotal: 0,
        cashTotal: 0,
      }
    );
  }, [transactions]);

  const [showDetails, setShowDetails] = useState(false);
  const todayISO = localISODate();
  const openAppointments = appointments.filter(
    (a) =>
      a.date === todayISO && a.status !== 'COMPLETED' && a.status !== 'CANCELLED'
  );

  const stepBadge = 'flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-stone-800 text-xs font-bold text-stone-300';
  const field =
    'w-full bg-stone-950 border border-stone-800 rounded-xl px-3.5 py-2.5 text-sm text-stone-100 focus:outline-none focus:border-amber-500';

  return (
    <div className="mx-auto max-w-3xl space-y-4">
      {/* Resumo do dia: um número só; o resto abre sob demanda */}
      <section data-tour="caixa-summary" className="rounded-2xl border border-stone-800 bg-stone-900 p-5">
        <div className="flex items-end justify-between gap-3">
          <div>
            <span className="text-xs text-stone-400">Recebido hoje</span>
            <div className="mt-0.5 font-mono text-3xl font-bold text-stone-100">
              {formatCurrencyBRL(dailySummary.totalGross)}
            </div>
            <div className="mt-0.5 text-xs text-stone-400">{transactions.length} atendimento(s) pagos</div>
          </div>
          <button
            type="button"
            onClick={() => setShowDetails((v) => !v)}
            aria-expanded={showDetails}
            className="inline-flex items-center gap-1 rounded-lg px-2 py-2 text-xs font-semibold text-stone-300 hover:text-stone-100 cursor-pointer"
          >
            {showDetails ? 'Esconder detalhes' : 'Ver detalhes'}
            <CaretDown className={`h-3.5 w-3.5 transition-transform ${showDetails ? 'rotate-180' : ''}`} aria-hidden="true" />
          </button>
        </div>
        {showDetails && (
          <dl className="mt-4 grid grid-cols-2 gap-x-4 gap-y-3 border-t border-stone-800 pt-4 text-xs sm:grid-cols-3">
            <div>
              <dt className="text-stone-400">Pix</dt>
              <dd className="mt-0.5 font-mono text-sm font-semibold text-stone-100">{formatCurrencyBRL(dailySummary.pixTotal)}</dd>
            </div>
            <div>
              <dt className="text-stone-400">Cartão</dt>
              <dd className="mt-0.5 font-mono text-sm font-semibold text-stone-100">{formatCurrencyBRL(dailySummary.cardTotal)}</dd>
            </div>
            <div>
              <dt className="text-stone-400">Dinheiro</dt>
              <dd className="mt-0.5 font-mono text-sm font-semibold text-stone-100">{formatCurrencyBRL(dailySummary.cashTotal)}</dd>
            </div>
            <div>
              <dt className="text-stone-400">Comissão dos barbeiros</dt>
              <dd className="mt-0.5 font-mono text-sm font-semibold text-stone-100">{formatCurrencyBRL(dailySummary.totalBarber)}</dd>
            </div>
            <div>
              <dt className="text-stone-400">Fica na barbearia</dt>
              <dd className="mt-0.5 font-mono text-sm font-semibold text-stone-100">{formatCurrencyBRL(dailySummary.totalSalon)}</dd>
            </div>
          </dl>
        )}
      </section>

      {/* Novo recebimento */}
      <form onSubmit={handleFinalizeCheckout} className="space-y-5 rounded-2xl border border-stone-800 bg-stone-900 p-5">
        <div>
          <h2 className="flex items-center gap-2 text-base font-bold text-stone-100">
            Novo recebimento
            <HelpTip
              label="Caixa"
              text="Registre aqui cada atendimento pago: quem atendeu, o serviço, o valor e como o cliente pagou. O quadro do topo soma o dia, e os detalhes mostram Pix, cartão, dinheiro e a comissão dos barbeiros."
            />
          </h2>
          <p className="mt-0.5 text-xs text-stone-400">Preencha em 3 passos e confirme.</p>
        </div>

        {openAppointments.length > 0 && (
          <div data-tour="caixa-agenda" className="space-y-2 rounded-xl border border-stone-800 bg-tint-50 p-3">
            <span className="block text-xs text-stone-300">Agendados hoje. Toque para preencher:</span>
            <div className="flex flex-wrap gap-2">
              {openAppointments.map((apt) => (
                <button
                  key={apt.id}
                  type="button"
                  onClick={() => handleLoadAppointment(apt)}
                  className="rounded-lg border border-stone-800 bg-stone-950 px-3 py-1.5 text-xs font-semibold text-stone-100 hover:border-amber-500 cursor-pointer"
                >
                  {apt.startTime} · {apt.clientName}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Passo 1 */}
        <div data-tour="caixa-step1" className="space-y-3">
          <div className="flex items-center gap-2.5">
            <span className={stepBadge}>1</span>
            <span className="text-sm font-semibold text-stone-100">Quem foi atendido</span>
          </div>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-xs font-medium text-stone-300">Cliente</label>
              <input
                type="text"
                list="pos-clients-list"
                value={clientNameInput}
                onChange={(e) => setClientNameInput(e.target.value)}
                placeholder="Digite ou escolha"
                className={field}
              />
              <datalist id="pos-clients-list">
                {clients.map((c) => (
                  <option key={c.id} value={c.fullName} />
                ))}
              </datalist>
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-stone-300">Barbeiro</label>
              <select value={selectedStaffId} onChange={(e) => setSelectedStaffId(e.target.value)} className={field}>
                {staff.map((st) => (
                  <option key={st.id} value={st.id}>
                    {st.name} (comissão {st.defaultServiceCommissionPct}%)
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Passo 2 */}
        <div data-tour="caixa-step2" className="space-y-3 border-t border-stone-800 pt-5">
          <div className="flex items-center gap-2.5">
            <span className={stepBadge}>2</span>
            <span className="text-sm font-semibold text-stone-100">Serviço e valor</span>
          </div>
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            {services.map((srv) => {
              const isSelected = selectedServiceIds.includes(srv.id);
              return (
                <button
                  key={srv.id}
                  type="button"
                  onClick={() => toggleService(srv.id)}
                  aria-pressed={isSelected}
                  className={`flex items-center justify-between gap-2 rounded-xl border p-3 text-left cursor-pointer ${
                    isSelected
                      ? 'border-amber-500 bg-amber-950 text-stone-100'
                      : 'border-stone-800 bg-stone-950 text-stone-300 hover:border-stone-700'
                  }`}
                >
                  <span className="text-xs font-semibold">{srv.name}</span>
                  <span className="shrink-0 font-mono text-xs font-semibold text-stone-100">{formatCurrencyBRL(srv.price)}</span>
                </button>
              );
            })}
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-stone-300">Valor cobrado (R$). Pode mudar na hora.</label>
            <input
              type="number"
              step="0.01"
              min="0"
              value={customTotalInput !== '' ? customTotalInput : String(defaultServicesSum)}
              onChange={(e) => setCustomTotalInput(e.target.value)}
              className={`${field} font-mono text-base font-semibold`}
            />
          </div>

          <details className="group rounded-xl border border-stone-800 bg-stone-950">
            <summary className="flex cursor-pointer list-none items-center justify-between gap-2 px-3.5 py-3 text-xs font-semibold text-stone-300">
              <span>Desconto e comprovante (opcional)</span>
              <CaretDown className="h-3.5 w-3.5 transition-transform group-open:rotate-180" aria-hidden="true" />
            </summary>
            <div className="space-y-3 border-t border-stone-800 p-3.5">
              <div>
                <label className="mb-1 block text-xs font-medium text-stone-300">Desconto concedido (R$)</label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={discountInput}
                  onChange={(e) => setDiscountInput(e.target.value)}
                  className={`${field} font-mono`}
                />
              </div>
              <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                <span className="text-xs text-stone-400">
                  {receiptFileName ? `Anexado: ${receiptFileName}` : 'Foto do comprovante do Pix ou da maquininha, se quiser guardar.'}
                </span>
                <label className="inline-flex shrink-0 cursor-pointer items-center gap-1.5 rounded-xl border border-stone-800 px-3 py-2 text-xs font-semibold text-stone-100 hover:border-stone-700">
                  <Paperclip className="h-3.5 w-3.5" />
                  {receiptFileName ? 'Trocar comprovante' : 'Anexar comprovante'}
                  <input type="file" accept="image/*,.pdf" onChange={handleAttachReceipt} className="hidden" />
                </label>
              </div>
            </div>
          </details>
        </div>

        {/* Passo 3 */}
        <div data-tour="caixa-step3" className="space-y-3 border-t border-stone-800 pt-5">
          <div className="flex items-center gap-2.5">
            <span className={stepBadge}>3</span>
            <span className="text-sm font-semibold text-stone-100">Como o cliente pagou</span>
          </div>
          <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-4">
            {(['PIX', 'DEBIT_CARD', 'CREDIT_CARD', 'CASH'] as PaymentMethod[]).map((method) => {
              const active = paymentMethod === method;
              return (
                <button
                  key={method}
                  type="button"
                  onClick={() => setPaymentMethod(method)}
                  aria-pressed={active}
                  className={`rounded-xl border p-3 text-left cursor-pointer ${
                    active ? 'border-amber-500 bg-amber-950 text-stone-100' : 'border-stone-800 bg-stone-950 text-stone-300 hover:border-stone-700'
                  }`}
                >
                  <div className="mb-1 flex items-center justify-between">
                    {method === 'PIX' && <QrCode className="h-4 w-4" />}
                    {(method === 'DEBIT_CARD' || method === 'CREDIT_CARD') && <CreditCard className="h-4 w-4" />}
                    {method === 'CASH' && <DollarSign className="h-4 w-4" />}
                    <span className="font-mono text-[11px] text-stone-400">
                      {method === 'PIX' || method === 'CASH' ? 'sem taxa' : method === 'DEBIT_CARD' ? '1,49%' : '3,99%'}
                    </span>
                  </div>
                  <div className="text-xs font-semibold">{PAYMENT_METHOD_LABELS[method]}</div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Divisão do valor: uma linha, detalhes sob demanda */}
        <div data-tour="caixa-split" className="rounded-xl border border-stone-800 bg-tint-50">
          <details className="group">
            <summary className="flex cursor-pointer list-none items-center justify-between gap-2 px-3.5 py-3 text-xs">
              <span className="text-stone-300">
                Barbeiro recebe{' '}
                <strong className="font-mono text-stone-100">{formatCurrencyBRL(splitBreakdown.staffNetCommission)}</strong> · Barbearia fica com{' '}
                <strong className="font-mono text-stone-100">{formatCurrencyBRL(splitBreakdown.salonNetShare)}</strong>
              </span>
              <CaretDown className="h-3.5 w-3.5 shrink-0 text-stone-400 transition-transform group-open:rotate-180" aria-hidden="true" />
            </summary>
            <div className="space-y-1.5 border-t border-stone-800 px-3.5 py-3 text-xs text-stone-300">
              <div className="flex justify-between">
                <span>Valor cobrado</span>
                <span className="font-mono">{formatCurrencyBRL(splitBreakdown.totalAmount)}</span>
              </div>
              {splitBreakdown.acquirerFeeAmount > 0 && (
                <div className="flex justify-between">
                  <span>Taxa da maquininha ({splitBreakdown.acquirerFeePct}%)</span>
                  <span className="font-mono">- {formatCurrencyBRL(splitBreakdown.acquirerFeeAmount)}</span>
                </div>
              )}
              <div className="flex justify-between">
                <span>Parte de {selectedStaff?.name ?? 'o barbeiro'}</span>
                <span className="font-mono">{formatCurrencyBRL(splitBreakdown.staffNetCommission)}</span>
              </div>
              <div className="flex justify-between">
                <span>Parte da barbearia</span>
                <span className="font-mono">{formatCurrencyBRL(splitBreakdown.salonNetShare)}</span>
              </div>
            </div>
          </details>
        </div>

        <button
          data-tour="caixa-confirm"
          type="submit"
          disabled={splitBreakdown.totalAmount <= 0}
          className="flex w-full items-center justify-center gap-2 rounded-xl bg-emerald-500 px-4 py-3.5 text-sm font-bold text-ink-dark hover:bg-emerald-600 disabled:opacity-40 cursor-pointer"
        >
          <CheckCircle2 className="h-4 w-4" />
          Confirmar recebimento de {formatCurrencyBRL(splitBreakdown.totalAmount)}
        </button>

        {justClosedSuccess && (
          <div role="status" className="rounded-xl border border-stone-800 bg-emerald-950 p-3 text-center text-xs font-semibold text-emerald-800">
            Pagamento registrado e somado ao dia.
          </div>
        )}
      </form>

      {/* Extrato do dia, recolhido */}
      <details data-tour="caixa-extrato" className="group rounded-2xl border border-stone-800 bg-stone-900">
        <summary className="flex cursor-pointer list-none items-center justify-between gap-3 px-5 py-4">
          <span>
            <span className="block text-sm font-bold text-stone-100">Recebimentos de hoje ({transactions.length})</span>
            <span className="mt-0.5 block text-xs text-stone-400">Total {formatCurrencyBRL(dailySummary.totalGross)}</span>
          </span>
          <CaretDown className="h-4 w-4 shrink-0 text-stone-400 transition-transform group-open:rotate-180" aria-hidden="true" />
        </summary>
        <div className="border-t border-stone-800 p-4">
          {transactions.length === 0 ? (
            <div className="rounded-xl border border-dashed border-stone-800 p-6 text-center text-xs text-stone-400">
              Nenhum recebimento hoje ainda. Quando você confirmar um, ele aparece aqui.
            </div>
          ) : (
            <ul className="max-h-80 space-y-2 overflow-y-auto pr-1">
              {transactions.map((tx) => (
                <li
                  key={tx.id}
                  className="flex items-center justify-between gap-2 rounded-xl border border-stone-800 bg-stone-950 p-3 text-xs"
                >
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-1.5 font-semibold text-stone-100">
                      <span className="truncate">{tx.clientName}</span>
                      <span className="rounded bg-stone-800 px-1.5 py-0.5 font-mono text-[11px] text-stone-300">
                        {PAYMENT_METHOD_LABELS[tx.paymentMethod]}
                      </span>
                    </div>
                    <div className="mt-0.5 text-[11px] text-stone-400">
                      {tx.closedAt} · {tx.staffName} ({formatCurrencyBRL(tx.staffNetCommission)})
                    </div>
                    {tx.receiptAttachmentName && (
                      <div className="mt-1 inline-flex items-center gap-1 text-[11px] text-stone-400">
                        <FileText className="h-3 w-3" />
                        {tx.receiptAttachmentName}
                      </div>
                    )}
                  </div>
                  <div className="flex shrink-0 items-center gap-2">
                    <div className="text-right font-mono">
                      <div className="text-sm font-bold text-stone-100">{formatCurrencyBRL(tx.totalAmount)}</div>
                      <div className="text-[11px] text-stone-400">Barbearia: {formatCurrencyBRL(tx.salonNetShare)}</div>
                    </div>
                    {onDeleteTransaction && (
                      <button
                        type="button"
                        onClick={() => onDeleteTransaction(tx.id)}
                        title="Excluir lançamento"
                        aria-label="Excluir lançamento"
                        className="rounded-lg p-1.5 text-stone-500 hover:text-amber-800 hover:bg-stone-900 cursor-pointer"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </details>
    </div>
  );
};
