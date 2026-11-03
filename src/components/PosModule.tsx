import React, { useEffect, useMemo, useState } from 'react';
import {
  Calculator,
  CheckCircle,
  Minus,
  Plus,
  Receipt,
  Ticket,
} from '@phosphor-icons/react';
import {
  Appointment,
  BusinessConfig,
  Client,
  FeeSplitRule,
  InventoryProduct,
  PaymentMethod,
  PosTransaction,
  ServiceItem,
  StaffMember,
} from '../types';
import { calculatePartnerSplit, formatBRL } from '../utils/validators';

interface PosModuleProps {
  business: BusinessConfig;
  staff: StaffMember[];
  services: ServiceItem[];
  products: InventoryProduct[];
  clients: Client[];
  transactions: PosTransaction[];
  initialAppointment: Appointment | null;
  onCompleteSale: (tx: Omit<PosTransaction, 'id' | 'closedAt'>) => void;
  onChangeFeeSplitRule: (rule: FeeSplitRule) => void;
}

export const PosModule: React.FC<PosModuleProps> = ({
  business,
  staff,
  services,
  products,
  clients,
  transactions,
  initialAppointment,
  onCompleteSale,
}) => {
  const professionals = useMemo(
    () => staff.filter((s) => s.role === 'PROFESSIONAL'),
    [staff]
  );
  const assistants = useMemo(
    () => staff.filter((s) => s.role === 'ASSISTANT'),
    [staff]
  );

  const [selectedClientId, setSelectedClientId] = useState<string>(
    initialAppointment?.clientId &&
      clients.some((c) => c.id === initialAppointment.clientId)
      ? initialAppointment.clientId
      : clients[0]?.id || ''
  );
  const [selectedStaffId, setSelectedStaffId] = useState<string>(
    initialAppointment?.staffId || professionals[0]?.id || 'st_caio'
  );
  const [selectedAssistantId, setSelectedAssistantId] = useState<string>(
    initialAppointment?.assistantStaffId || ''
  );
  const [selectedServiceIds, setSelectedServiceIds] = useState<string[]>(
    initialAppointment?.serviceIds || ['srv_corte_degrade']
  );
  const [productCart, setProductCart] = useState<Record<string, number>>({});
  const [discountAmount, setDiscountAmount] = useState<number>(
    initialAppointment?.depositPixPaid || 0
  );
  const [tipAmount, setTipAmount] = useState<number>(0);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('PIX');
  const [isFirstVisitBoost, setIsFirstVisitBoost] = useState<boolean>(
    Boolean(initialAppointment?.isFirstVisitBoost)
  );
  const [formError, setFormError] = useState<string>('');
  const [lastReceiptName, setLastReceiptName] = useState<string>('');

  useEffect(() => {
    if (!initialAppointment) return;
    const matchedClient = clients.find((c) => c.id === initialAppointment.clientId);
    if (matchedClient) {
      setSelectedClientId(matchedClient.id);
    }
    setSelectedStaffId(initialAppointment.staffId);
    setSelectedAssistantId(initialAppointment.assistantStaffId || '');
    setSelectedServiceIds(initialAppointment.serviceIds);
    setDiscountAmount(initialAppointment.depositPixPaid || 0);
    setIsFirstVisitBoost(Boolean(initialAppointment.isFirstVisitBoost));
  }, [initialAppointment, clients]);

  const currentClient = clients.find((c) => c.id === selectedClientId);
  const currentStaff =
    professionals.find((p) => p.id === selectedStaffId) || professionals[0];
  const currentAssistant = assistants.find((a) => a.id === selectedAssistantId);

  const activeClientPass = useMemo(() => {
    if (!currentClient) return null;
    return (
      currentClient.passes.find(
        (p) =>
          p.remainingSessions > 0 && selectedServiceIds.includes(p.serviceId)
      ) || null
    );
  }, [currentClient, selectedServiceIds]);

  const subtotalServices = useMemo(() => {
    return services
      .filter((s) => selectedServiceIds.includes(s.id))
      .reduce((acc, s) => acc + s.price, 0);
  }, [services, selectedServiceIds]);

  const subtotalProducts = useMemo(() => {
    return Object.entries(productCart).reduce((acc, [prdId, qty]) => {
      const prd = products.find((p) => p.id === prdId);
      return acc + (prd ? prd.price * qty : 0);
    }, 0);
  }, [productCart, products]);

  const avgAssistantSharePct = useMemo(() => {
    const chosen = services.filter((s) => selectedServiceIds.includes(s.id));
    if (chosen.length === 0) return 6;
    const totalPct = chosen.reduce((acc, s) => acc + s.assistantSharePct, 0);
    return Number((totalPct / chosen.length).toFixed(1));
  }, [services, selectedServiceIds]);

  const splitResult = useMemo(() => {
    return calculatePartnerSplit({
      subtotalServices,
      subtotalProducts,
      discountAmount,
      tipAmount,
      serviceCommissionPct: currentStaff?.defaultServiceCommissionPct || 50,
      productCommissionPct: currentStaff?.defaultProductCommissionPct || 10,
      assistantSharePct: avgAssistantSharePct,
      hasAssistant: Boolean(selectedAssistantId),
      paymentMethod,
      feeSplitRule: business.feeSplitRule,
      isFirstVisitBoost,
      boostCommissionPct: business.boostCommissionPct,
    });
  }, [
    subtotalServices,
    subtotalProducts,
    discountAmount,
    tipAmount,
    currentStaff,
    avgAssistantSharePct,
    selectedAssistantId,
    paymentMethod,
    business.feeSplitRule,
    isFirstVisitBoost,
    business.boostCommissionPct,
  ]);

  const toggleService = (id: string) => {
    setFormError('');
    setSelectedServiceIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  const updateProductQty = (productId: string, delta: number) => {
    setFormError('');
    const product = products.find((p) => p.id === productId);
    if (!product) return;

    setProductCart((prev) => {
      const current = prev[productId] || 0;
      const next = Math.max(0, Math.min(product.stockQuantity, current + delta));
      if (next === 0) {
        const clone = { ...prev };
        delete clone[productId];
        return clone;
      }
      return { ...prev, [productId]: next };
    });
  };

  const handleCheckout = (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedServiceIds.length === 0 && Object.keys(productCart).length === 0) {
      setFormError(
        'Adicione pelo menos 1 serviço ou 1 produto para fechar a comanda.'
      );
      return;
    }

    const clientName =
      initialAppointment?.clientName ||
      currentClient?.fullName ||
      'Cliente Balcão';

    onCompleteSale({
      appointmentId: initialAppointment?.id,
      clientId: currentClient?.id || 'cli_walkin',
      clientName,
      staffId: currentStaff.id,
      staffName: currentStaff.name,
      assistantStaffId: currentAssistant?.id,
      assistantName: currentAssistant?.name,
      serviceIds: selectedServiceIds,
      productItems: Object.entries(productCart).map(([productId, quantity]) => ({
        productId,
        quantity,
      })),
      paymentMethod,
      subtotalServices,
      subtotalProducts,
      discountAmount,
      tipAmount,
      totalAmount: splitResult.totalAmount,
      acquirerFeePct: splitResult.acquirerFeePct,
      acquirerFeeAmount: splitResult.acquirerFeeAmount,
      boostFeeAmount: splitResult.boostFeeAmount,
      staffGrossCommission: splitResult.staffGrossCommission,
      staffDeductedFee: splitResult.staffDeductedFee,
      assistantCommission: splitResult.assistantCommission,
      staffNetCommission: splitResult.staffNetCommission,
      salonNetShare: splitResult.salonNetShare,
      originChannel:
        initialAppointment?.originChannel ||
        (isFirstVisitBoost ? 'MARKETPLACE_BOOST' : 'DIRECT_LINK'),
    });

    setLastReceiptName(clientName);
    setProductCart({});
    setTipAmount(0);
    setFormError('');
  };

  return (
    <section aria-label="Caixa e Comissões">
      <div className="border-b border-[#DEDAD0] bg-white px-4 py-4 sm:px-6">
        <h1 className="text-xl font-semibold tracking-tight text-[#141413]">
          Caixa & Comissões
        </h1>
        <p className="mt-0.5 text-xs text-[#4A4843]">
          Feche a comanda e calcule automaticamente o valor do profissional e do estabelecimento.
        </p>
      </div>

      {lastReceiptName && (
        <div
          role="status"
          className="border-b border-[#0F766E]/30 bg-[#E6F4F1] px-4 py-3 sm:px-6 flex items-center justify-between text-xs text-[#0F766E]"
        >
          <span className="flex items-center gap-2 font-medium">
            <CheckCircle size={17} weight="fill" />
            <span>
              Comanda de <strong>{lastReceiptName}</strong> fechada com sucesso!
            </span>
          </span>
          <button
            type="button"
            onClick={() => setLastReceiptName('')}
            className="underline font-semibold"
          >
            Fechar aviso
          </button>
        </div>
      )}

      <form
        onSubmit={handleCheckout}
        noValidate
        className="grid grid-cols-1 lg:grid-cols-12 divide-y lg:divide-y-0 lg:divide-x divide-[#DEDAD0] bg-white"
      >
        {/* Coluna Esquerda (7 cols): Itens da Comanda */}
        <div className="lg:col-span-7 p-4 sm:p-6 space-y-5">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="flex flex-col gap-1">
              <label htmlFor="pos-client" className="text-xs font-semibold text-[#141413]">
                Cliente
              </label>
              <select
                id="pos-client"
                value={selectedClientId}
                onChange={(e) => setSelectedClientId(e.target.value)}
                className="min-h-[38px] rounded-lg border border-[#DEDAD0] bg-white px-3 text-xs text-[#141413]"
              >
                {clients.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.fullName} {c.passes.length > 0 ? '(Com pacote ativo)' : ''}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex flex-col gap-1">
              <label htmlFor="pos-staff" className="text-xs font-semibold text-[#141413]">
                Profissional
              </label>
              <select
                id="pos-staff"
                value={selectedStaffId}
                onChange={(e) => setSelectedStaffId(e.target.value)}
                className="min-h-[38px] rounded-lg border border-[#DEDAD0] bg-white px-3 text-xs text-[#141413]"
              >
                {professionals.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name} ({p.defaultServiceCommissionPct}%)
                  </option>
                ))}
              </select>
            </div>
          </div>

          {activeClientPass && (
            <div className="rounded-lg border border-[#0F766E]/40 bg-[#E6F4F1]/60 p-3 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
              <div className="text-xs text-[#141413]">
                <strong className="font-semibold text-[#0F766E] flex items-center gap-1.5">
                  <Ticket size={15} weight="fill" />
                  <span>Pacote ativo: {activeClientPass.name}</span>
                </strong>
                <span className="block mt-0.5 text-[#4A4843]">
                  Restam <strong className="num-tabular">{activeClientPass.remainingSessions}</strong> de{' '}
                  <strong className="num-tabular">{activeClientPass.totalSessions}</strong> sessões.
                </span>
              </div>
              <button
                type="button"
                onClick={() => setPaymentMethod('CLIENT_PASS')}
                className="shrink-0 rounded-lg bg-[#0F766E] px-3 py-1.5 text-xs font-semibold text-white hover:bg-[#0B5C56]"
              >
                Usar Sessão do Pacote
              </button>
            </div>
          )}

          {/* Serviços */}
          <div>
            <h2 className="text-xs font-semibold uppercase tracking-wider text-[#4A4843]">
              Serviços Realizados
            </h2>
            <div className="mt-2 divide-y divide-[#DEDAD0] rounded-lg border border-[#DEDAD0]">
              {services.map((srv) => {
                const selected = selectedServiceIds.includes(srv.id);
                return (
                  <label
                    key={srv.id}
                    className={`flex cursor-pointer items-center justify-between px-3.5 py-2.5 text-xs ${
                      selected ? 'bg-[#E6F4F1]/40' : 'bg-white'
                    }`}
                  >
                    <span className="flex items-center gap-2.5">
                      <input
                        type="checkbox"
                        checked={selected}
                        onChange={() => toggleService(srv.id)}
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

          {/* Produtos (Opcional) */}
          <div>
            <h2 className="text-xs font-semibold uppercase tracking-wider text-[#4A4843]">
              Produtos Adicionais (Estoque)
            </h2>
            <div className="mt-2 divide-y divide-[#DEDAD0] rounded-lg border border-[#DEDAD0]">
              {products.map((prd) => {
                const qty = productCart[prd.id] || 0;
                return (
                  <div
                    key={prd.id}
                    className="flex items-center justify-between px-3.5 py-2 text-xs bg-white"
                  >
                    <div>
                      <span className="font-medium text-[#141413]">{prd.name}</span>
                      <span className="num-tabular block text-[11px] text-[#6E6A63]">
                        Estoque: {prd.stockQuantity} un.
                      </span>
                    </div>

                    <div className="flex items-center gap-3">
                      <span className="num-tabular font-semibold text-[#141413]">
                        {formatBRL(prd.price)}
                      </span>
                      <div className="flex items-center rounded-lg border border-[#DEDAD0] bg-[#F6F5F0]">
                        <button
                          type="button"
                          onClick={() => updateProductQty(prd.id, -1)}
                          aria-label={`Diminuir quantidade de ${prd.name}`}
                          className="h-7 w-7 inline-flex items-center justify-center text-[#141413]"
                        >
                          <Minus size={12} weight="bold" />
                        </button>
                        <span className="num-tabular w-7 text-center text-xs font-semibold">
                          {qty}
                        </span>
                        <button
                          type="button"
                          onClick={() => updateProductQty(prd.id, 1)}
                          aria-label={`Aumentar quantidade de ${prd.name}`}
                          className="h-7 w-7 inline-flex items-center justify-center text-[#141413]"
                        >
                          <Plus size={12} weight="bold" />
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Coluna Direita (5 cols): Pagamento e Resumo */}
        <div className="lg:col-span-5 bg-[#F6F5F0]/60 p-4 sm:p-6 space-y-4">
          <div>
            <h2 className="text-sm font-semibold text-[#141413]">
              Forma de Pagamento
            </h2>
            <div className="mt-2 grid grid-cols-2 sm:grid-cols-3 gap-2">
              {(
                [
                  { id: 'PIX', label: 'Pix', fee: 'Sem taxa' },
                  { id: 'DEBIT_CARD', label: 'Débito', fee: '1,99%' },
                  { id: 'CREDIT_CARD', label: 'Crédito', fee: '3,99%' },
                  { id: 'CASH', label: 'Dinheiro', fee: 'Sem taxa' },
                  { id: 'CLIENT_PASS', label: 'Pacote', fee: 'Pré-pago' },
                ] as Array<{ id: PaymentMethod; label: string; fee: string }>
              ).map((m) => (
                <button
                  key={m.id}
                  type="button"
                  onClick={() => setPaymentMethod(m.id)}
                  className={`rounded-lg border p-2.5 text-left text-xs ${
                    paymentMethod === m.id
                      ? 'border-[#0F766E] bg-[#E6F4F1] text-[#0F766E]'
                      : 'border-[#DEDAD0] bg-white text-[#141413]'
                  }`}
                >
                  <span className="font-semibold block">{m.label}</span>
                  <span className="num-tabular text-[11px] text-[#6E6A63]">
                    {m.fee}
                  </span>
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1">
              <label htmlFor="pos-discount" className="text-xs font-medium text-[#141413]">
                Desconto / Sinal (R$)
              </label>
              <input
                id="pos-discount"
                type="number"
                min={0}
                step={0.5}
                value={discountAmount}
                onChange={(e) => setDiscountAmount(Math.max(0, Number(e.target.value)))}
                className="num-tabular min-h-[36px] rounded-lg border border-[#DEDAD0] bg-white px-3 text-xs text-[#141413]"
              />
            </div>

            <div className="flex flex-col gap-1">
              <label htmlFor="pos-tip" className="text-xs font-medium text-[#141413]">
                Gorjeta (R$)
              </label>
              <input
                id="pos-tip"
                type="number"
                min={0}
                step={1}
                value={tipAmount}
                onChange={(e) => setTipAmount(Math.max(0, Number(e.target.value)))}
                className="num-tabular min-h-[36px] rounded-lg border border-[#DEDAD0] bg-white px-3 text-xs text-[#141413]"
              />
            </div>
          </div>

          {/* Resumo Simplificado */}
          <div className="rounded-lg border border-[#DEDAD0] bg-white p-4 space-y-2.5 text-xs">
            <div className="flex items-center justify-between border-b border-[#DEDAD0] pb-2 font-semibold text-[#141413]">
              <span className="flex items-center gap-1.5">
                <Calculator size={15} weight="bold" />
                <span>Resumo da Comanda</span>
              </span>
            </div>

            <div className="flex justify-between text-[#4A4843]">
              <span>Subtotal:</span>
              <span className="num-tabular font-medium text-[#141413]">
                {formatBRL(subtotalServices + subtotalProducts)}
              </span>
            </div>

            {discountAmount > 0 && (
              <div className="flex justify-between text-[#0F766E]">
                <span>(-) Desconto / Sinal:</span>
                <span className="num-tabular font-medium">
                  - {formatBRL(discountAmount)}
                </span>
              </div>
            )}

            {splitResult.acquirerFeeAmount > 0 && (
              <div className="flex justify-between text-[#4A4843]">
                <span>(-) Taxa da Maquininha ({splitResult.acquirerFeePct.toFixed(2)}%):</span>
                <span className="num-tabular font-medium text-[#B45309]">
                  - {formatBRL(splitResult.acquirerFeeAmount)}
                </span>
              </div>
            )}

            <div className="border-t border-[#DEDAD0] pt-2.5 space-y-1.5">
              <div className="flex justify-between rounded bg-[#E6F4F1] px-2.5 py-2 font-semibold text-[#0F766E]">
                <span>Valor Líquido Profissional ({currentStaff?.name.split(' ')[0]}):</span>
                <span className="num-tabular text-sm">
                  {formatBRL(splitResult.staffNetCommission)}
                </span>
              </div>

              <div className="flex justify-between px-2.5 py-1 font-semibold text-[#141413]">
                <span>Valor Líquido Estabelecimento:</span>
                <span className="num-tabular text-sm">
                  {formatBRL(splitResult.salonNetShare)}
                </span>
              </div>
            </div>

            <div className="border-t border-[#DEDAD0] pt-3 flex items-center justify-between">
              <span className="text-sm font-semibold text-[#141413]">
                Total a Receber
              </span>
              <span className="num-tabular text-xl font-bold text-[#141413]">
                {formatBRL(splitResult.totalAmount)}
              </span>
            </div>
          </div>

          {formError && (
            <p role="alert" className="text-xs font-medium text-[#B91C1C]">
              {formError}
            </p>
          )}

          <button
            type="submit"
            className="w-full min-h-[44px] inline-flex items-center justify-center gap-2 rounded-lg bg-[#0F766E] px-5 py-2.5 text-sm font-semibold text-white hover:bg-[#0B5C56]"
          >
            <Receipt size={18} weight="bold" />
            <span>Finalizar Pagamento</span>
          </button>
        </div>
      </form>

      {/* Histórico Recente */}
      <div className="border-t border-[#DEDAD0] bg-white p-4 sm:p-6">
        <h2 id="pos-history-caption" className="text-sm font-semibold text-[#141413] mb-3">
          Últimos Pagamentos Recebidos
        </h2>
        <div
          tabIndex={0}
          role="region"
          aria-labelledby="pos-history-caption"
          className="table-wrapper"
        >
          <table
            style={
              {
                '--label-2': '"Profissional"',
                '--label-3': '"Forma"',
                '--label-4': '"Total"',
                '--label-5': '"Profissional"',
                '--label-6': '"Salão"',
              } as React.CSSProperties
            }
          >
            <thead>
              <tr className="border-b border-[#DEDAD0] text-xs font-semibold text-[#4A4843]">
                <th className="px-4 py-2.5">Cliente</th>
                <th className="px-4 py-2.5">Profissional</th>
                <th className="px-4 py-2.5">Pagamento</th>
                <th className="px-4 py-2.5">Total</th>
                <th className="px-4 py-2.5">Comissão</th>
                <th className="px-4 py-2.5">Salão</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#DEDAD0] text-xs">
              {transactions.map((tx) => (
                <tr key={tx.id}>
                  <th scope="row" className="px-4 py-2.5 text-left">
                    <span className="font-semibold text-[#141413] block">
                      {tx.clientName}
                    </span>
                    <span className="num-tabular text-[11px] font-normal text-[#6E6A63]">
                      {tx.closedAt}
                    </span>
                  </th>
                  <td className="px-4 py-2.5 font-medium text-[#141413]">
                    {tx.staffName}
                  </td>
                  <td className="px-4 py-2.5 num-tabular">
                    {tx.paymentMethod}
                  </td>
                  <td data-numeric="true" className="px-4 py-2.5 font-semibold text-[#141413]">
                    {formatBRL(tx.totalAmount)}
                  </td>
                  <td data-numeric="true" className="px-4 py-2.5 font-semibold text-[#0F766E]">
                    {formatBRL(tx.staffNetCommission)}
                  </td>
                  <td data-numeric="true" className="px-4 py-2.5 font-medium text-[#141413]">
                    {formatBRL(tx.salonNetShare)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </section>
  );
};
