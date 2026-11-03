import React, { useMemo, useState } from 'react';
import {
  CheckCircle as CheckCircle2,
  CreditCard,
  CurrencyDollar as DollarSign,
  FileText,
  Paperclip,
  QrCode,
  Receipt,
  Scissors,
  Trash as Trash2,
  Wallet,
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
    setReceiptFileName(file.name);
  };

  const handleFinalizeCheckout = (e: React.FormEvent) => {
    e.preventDefault();
    if (activeTotalPrice <= 0) return;

    const finalClientName = clientNameInput.trim() || 'Cliente Avulso (Balcão)';
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

  const openAppointments = appointments.filter(
    (a) => a.status !== 'COMPLETED' && a.status !== 'CANCELLED'
  );

  return (
    <div className="space-y-6">
      {/* Resumo Rápido do Caixa do Dia */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5">
        <div className="bg-stone-900/80 border border-stone-800 rounded-2xl p-4">
          <span className="text-[11px] uppercase tracking-wider text-stone-400">
            Total Recebido Hoje
          </span>
          <div className="text-xl font-bold font-mono text-emerald-400 mt-1">
            {formatCurrencyBRL(dailySummary.totalGross)}
          </div>
          <div className="text-[11px] text-stone-400 mt-0.5">
            {transactions.length} atendimento(s) pagos
          </div>
        </div>

        <div className="bg-stone-900/80 border border-stone-800 rounded-2xl p-4">
          <span className="text-[11px] uppercase tracking-wider text-stone-400">
            Recebido em Pix
          </span>
          <div className="text-xl font-bold font-mono text-amber-400 mt-1">
            {formatCurrencyBRL(dailySummary.pixTotal)}
          </div>
          <div className="text-[11px] text-stone-400 mt-0.5">
            Cartão: {formatCurrencyBRL(dailySummary.cardTotal)} | Dinheiro:{' '}
            {formatCurrencyBRL(dailySummary.cashTotal)}
          </div>
        </div>

        <div className="bg-stone-900/80 border border-stone-800 rounded-2xl p-4">
          <span className="text-[11px] uppercase tracking-wider text-stone-400">
            Comissão dos Barbeiros
          </span>
          <div className="text-xl font-bold font-mono text-stone-100 mt-1">
            {formatCurrencyBRL(dailySummary.totalBarber)}
          </div>
          <div className="text-[11px] text-stone-400 mt-0.5">
            Parte líquida da equipe
          </div>
        </div>

        <div className="bg-stone-900/80 border border-stone-800 rounded-2xl p-4">
          <span className="text-[11px] uppercase tracking-wider text-stone-400">
            Lucro Líquido da Barbearia
          </span>
          <div className="text-xl font-bold font-mono text-stone-100 mt-1">
            {formatCurrencyBRL(dailySummary.totalSalon)}
          </div>
          <div className="text-[11px] text-stone-400 mt-0.5">
            Livre no caixa após comissão
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left 7 Cols: Registrar Pagamento Simples em 3 Passos */}
        <form
          onSubmit={handleFinalizeCheckout}
          className="lg:col-span-7 bg-stone-900/60 border border-stone-800/80 rounded-2xl p-5 space-y-5"
        >
          <div className="flex items-center justify-between border-b border-stone-800 pb-3">
            <div className="flex items-center gap-2.5">
              <Wallet className="w-5 h-5 text-amber-400" />
              <div>
                <h2 className="text-base font-bold text-stone-100">
                  Lançar Recebimento no Caixa (Em 3 Passos Simples)
                </h2>
                <p className="text-xs text-stone-400">
                  Escolha quem cortou, confira ou edite o valor do corte e confirme como o cliente pagou.
                </p>
              </div>
            </div>
          </div>

          {/* Atalho: Puxar da Agenda de Hoje */}
          {openAppointments.length > 0 && (
            <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/25 space-y-2">
              <span className="block text-[11px] font-semibold uppercase tracking-wider text-amber-300">
                Puxar cliente agendado hoje com 1 clique:
              </span>
              <div className="flex flex-wrap gap-2">
                {openAppointments.map((apt) => (
                  <button
                    key={apt.id}
                    type="button"
                    onClick={() => handleLoadAppointment(apt)}
                    className="px-3 py-1.5 rounded-lg bg-stone-950/90 hover:bg-amber-500 hover:text-stone-950 text-stone-200 border border-amber-500/30 text-xs font-semibold transition-all cursor-pointer"
                  >
                    {apt.startTime} - {apt.clientName}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* PASSO 1: Cliente e Barbeiro */}
          <div className="space-y-3">
            <div className="text-xs font-bold uppercase tracking-wider text-amber-400">
              Passo 1: Quem foi atendido e por qual barbeiro?
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-stone-300 mb-1">
                  Nome do Cliente (Digite ou escolha)
                </label>
                <input
                  type="text"
                  list="pos-clients-list"
                  value={clientNameInput}
                  onChange={(e) => setClientNameInput(e.target.value)}
                  placeholder="Ex: João Silva ou Cliente Balcão"
                  className="w-full bg-stone-950 border border-stone-800 rounded-xl px-3.5 py-2.5 text-sm text-stone-100 focus:outline-none focus:border-amber-500"
                />
                <datalist id="pos-clients-list">
                  {clients.map((c) => (
                    <option key={c.id} value={c.fullName} />
                  ))}
                </datalist>
              </div>

              <div>
                <label className="block text-xs font-medium text-stone-300 mb-1">
                  Barbeiro que realizou o serviço
                </label>
                <select
                  value={selectedStaffId}
                  onChange={(e) => setSelectedStaffId(e.target.value)}
                  className="w-full bg-stone-950 border border-stone-800 rounded-xl px-3.5 py-2.5 text-sm text-stone-100 focus:outline-none focus:border-amber-500"
                >
                  {staff.map((st) => (
                    <option key={st.id} value={st.id}>
                      {st.name} (Comissão {st.defaultServiceCommissionPct}%)
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* PASSO 2: Serviço e Valor Cobrado (Editável) */}
          <div className="space-y-3 pt-2 border-t border-stone-800/80">
            <div className="text-xs font-bold uppercase tracking-wider text-amber-400">
              Passo 2: Qual serviço foi feito e qual o valor cobrado?
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
              {services.map((srv) => {
                const isSelected = selectedServiceIds.includes(srv.id);
                return (
                  <button
                    key={srv.id}
                    type="button"
                    onClick={() => toggleService(srv.id)}
                    className={`flex items-center justify-between p-3 rounded-xl border text-left transition-all cursor-pointer ${
                      isSelected
                        ? 'bg-amber-500/15 border-amber-500/50 text-stone-100'
                        : 'bg-stone-950/60 border-stone-800/80 text-stone-400 hover:text-stone-200'
                    }`}
                  >
                    <div className="pr-2">
                      <div className="text-xs font-semibold flex items-center gap-1.5">
                        <Scissors className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                        <span>{srv.name}</span>
                      </div>
                    </div>
                    <span className="font-mono text-xs font-bold text-amber-400 shrink-0">
                      {formatCurrencyBRL(srv.price)}
                    </span>
                  </button>
                );
              })}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
              <div>
                <label className="block text-xs font-medium text-stone-300 mb-1">
                  Valor Cobrado do Cliente (R$) - Editável na hora
                </label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={
                    customTotalInput !== ''
                      ? customTotalInput
                      : String(defaultServicesSum)
                  }
                  onChange={(e) => setCustomTotalInput(e.target.value)}
                  className="w-full bg-stone-950 border border-amber-500/50 rounded-xl px-3.5 py-2.5 text-base font-mono font-bold text-amber-400 focus:outline-none focus:border-amber-500"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-stone-300 mb-1">
                  Desconto Concedido (R$)
                </label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={discountInput}
                  onChange={(e) => setDiscountInput(e.target.value)}
                  className="w-full bg-stone-950 border border-stone-800 rounded-xl px-3.5 py-2.5 text-sm font-mono text-stone-100 focus:outline-none focus:border-amber-500"
                />
              </div>
            </div>
          </div>

          {/* PASSO 3: Forma de Pagamento e Comprovante */}
          <div className="space-y-3 pt-2 border-t border-stone-800/80">
            <div className="text-xs font-bold uppercase tracking-wider text-amber-400">
              Passo 3: Como o cliente pagou?
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
              {(
                ['PIX', 'DEBIT_CARD', 'CREDIT_CARD', 'CASH'] as PaymentMethod[]
              ).map((method) => {
                const active = paymentMethod === method;
                return (
                  <button
                    key={method}
                    type="button"
                    onClick={() => setPaymentMethod(method)}
                    className={`p-3 rounded-xl border text-left transition-all cursor-pointer ${
                      active
                        ? 'bg-emerald-500/15 border-emerald-500/50 text-emerald-300'
                        : 'bg-stone-950 border-stone-800 text-stone-400 hover:text-stone-200'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      {method === 'PIX' && <QrCode className="w-4 h-4" />}
                      {(method === 'DEBIT_CARD' ||
                        method === 'CREDIT_CARD') && (
                        <CreditCard className="w-4 h-4" />
                      )}
                      {method === 'CASH' && <DollarSign className="w-4 h-4" />}
                      <span className="text-[10px] font-mono">
                        {method === 'PIX' || method === 'CASH'
                          ? '0% taxa'
                          : method === 'DEBIT_CARD'
                          ? '1,49%'
                          : '3,99%'}
                      </span>
                    </div>
                    <div className="text-xs font-bold">
                      {PAYMENT_METHOD_LABELS[method]}
                    </div>
                  </button>
                );
              })}
            </div>

            {/* Anexar Comprovante Pix / Maquininha */}
            <div className="p-3 rounded-xl bg-stone-950/90 border border-stone-800 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div className="text-xs text-stone-300">
                <span className="font-semibold text-stone-200 block">
                  Comprovante de Pix / Recibo (Opcional):
                </span>
                <span className="text-stone-400 text-[11px]">
                  {receiptFileName
                    ? `Arquivo anexado: ${receiptFileName}`
                    : 'Anexe foto do comprovante ou extrato se desejar guardar no histórico'}
                </span>
              </div>
              <label className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-stone-800 hover:bg-stone-700 text-amber-300 text-xs font-semibold cursor-pointer shrink-0">
                <Paperclip className="w-3.5 h-3.5" />
                {receiptFileName ? 'Trocar Comprovante' : 'Anexar Comprovante'}
                <input
                  type="file"
                  accept="image/*,.pdf"
                  onChange={handleAttachReceipt}
                  className="hidden"
                />
              </label>
            </div>
          </div>

          <button
            type="submit"
            disabled={splitBreakdown.totalAmount <= 0}
            className="w-full flex items-center justify-center gap-2 py-3.5 px-4 rounded-xl bg-emerald-500 hover:bg-emerald-400 disabled:opacity-40 text-stone-950 font-bold text-sm shadow-lg shadow-emerald-500/10 transition-all cursor-pointer"
          >
            <CheckCircle2 className="w-4 h-4" />
            Confirmar Recebimento de {formatCurrencyBRL(splitBreakdown.totalAmount)}
          </button>

          {justClosedSuccess && (
            <div className="p-3 rounded-xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 text-xs font-semibold text-center">
              Pagamento registrado no Caixa e somado ao faturamento do dia!
            </div>
          )}
        </form>

        {/* Right 5 Cols: Divisão Transparente + Extrato de Recebimentos do Dia */}
        <div className="lg:col-span-5 space-y-5">
          {/* Card Explicativo Simples da Divisão */}
          <div className="bg-stone-900 border border-stone-800 rounded-2xl p-5 space-y-3">
            <div className="flex items-center justify-between border-b border-stone-800 pb-3">
              <div className="flex items-center gap-2">
                <Receipt className="w-4 h-4 text-amber-400" />
                <h3 className="text-sm font-bold text-stone-100">
                  Para onde vai o dinheiro deste corte?
                </h3>
              </div>
              <span className="font-mono text-base font-bold text-emerald-400">
                {formatCurrencyBRL(splitBreakdown.totalAmount)}
              </span>
            </div>

            <div className="space-y-2 text-xs">
              <div className="flex justify-between text-stone-300">
                <span>Valor cobrado do cliente:</span>
                <span className="font-mono font-semibold">
                  {formatCurrencyBRL(splitBreakdown.totalAmount)}
                </span>
              </div>

              {splitBreakdown.acquirerFeeAmount > 0 && (
                <div className="flex justify-between text-rose-300">
                  <span>
                    Taxa da maquininha ({splitBreakdown.acquirerFeePct}%):
                  </span>
                  <span className="font-mono">
                    - {formatCurrencyBRL(splitBreakdown.acquirerFeeAmount)}
                  </span>
                </div>
              )}

              <div className="p-3 rounded-xl bg-stone-950 border border-stone-800 space-y-2 mt-2">
                <div className="flex justify-between items-center text-emerald-400 font-semibold">
                  <span>
                    Parte do Barbeiro ({selectedStaff?.name ?? 'Barbeiro'}):
                  </span>
                  <span className="font-mono text-sm">
                    {formatCurrencyBRL(splitBreakdown.staffNetCommission)}
                  </span>
                </div>
                <div className="flex justify-between items-center text-amber-400 font-semibold border-t border-stone-800 pt-2">
                  <span>Parte que fica no Caixa da Barbearia:</span>
                  <span className="font-mono text-sm">
                    {formatCurrencyBRL(splitBreakdown.salonNetShare)}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Lista de Recebimentos / Extrato do Dia */}
          <div className="bg-stone-900/50 border border-stone-800/80 rounded-2xl p-4 space-y-3">
            <h4 className="text-xs font-bold uppercase tracking-wider text-stone-300 flex items-center justify-between">
              <span>Extrato de Cortes Recebidos Hoje ({transactions.length})</span>
              <span className="font-mono text-emerald-400">
                Total: {formatCurrencyBRL(dailySummary.totalGross)}
              </span>
            </h4>

            {transactions.length === 0 ? (
              <div className="p-6 text-center text-xs text-stone-400 border border-dashed border-stone-800 rounded-xl">
                Nenhum recebimento lançado hoje ainda. Quando fechar um corte ao lado, ele aparecerá aqui.
              </div>
            ) : (
              <div className="space-y-2 max-h-80 overflow-y-auto pr-1">
                {transactions.map((tx) => (
                  <div
                    key={tx.id}
                    className="p-3 rounded-xl bg-stone-950/80 border border-stone-800/80 flex items-center justify-between gap-2 text-xs"
                  >
                    <div>
                      <div className="font-semibold text-stone-200 flex items-center gap-1.5">
                        <span>{tx.clientName}</span>
                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-stone-800 text-amber-300 font-mono">
                          {PAYMENT_METHOD_LABELS[tx.paymentMethod]}
                        </span>
                      </div>
                      <div className="text-stone-400 text-[11px] mt-0.5">
                        {tx.closedAt} • Barbeiro: {tx.staffName} (
                        {formatCurrencyBRL(tx.staffNetCommission)})
                      </div>
                      {tx.receiptAttachmentName && (
                        <div className="inline-flex items-center gap-1 text-[10px] text-emerald-400 mt-1">
                          <FileText className="w-3 h-3" />
                          Comprovante: {tx.receiptAttachmentName}
                        </div>
                      )}
                    </div>

                    <div className="flex items-center gap-2">
                      <div className="text-right font-mono">
                        <div className="font-bold text-emerald-400 text-sm">
                          {formatCurrencyBRL(tx.totalAmount)}
                        </div>
                        <div className="text-[10px] text-stone-400">
                          Caixa: {formatCurrencyBRL(tx.salonNetShare)}
                        </div>
                      </div>
                      {onDeleteTransaction && (
                        <button
                          type="button"
                          onClick={() => onDeleteTransaction(tx.id)}
                          title="Excluir lançamento"
                          className="p-1.5 rounded-lg text-stone-500 hover:text-rose-400 hover:bg-stone-900 cursor-pointer"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
