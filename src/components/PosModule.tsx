import React, { useEffect, useMemo, useState } from 'react';
import {
  Calculator,
  CheckCircle,
  CreditCard,
  CurrencyDollar,
  Minus,
  Package,
  Plus,
  QrCode,
  Receipt,
  Ticket,
  UserSwitch,
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
  onChangeFeeSplitRule,
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
        'Adicione pelo menos 1 serviço ou 1 produto de prateleira para fechar a comanda.'
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
    <section aria-label="Ponto de Venda e Calculadora Lei do Salão Parceiro">
      <div className="border-b border-[#DEDAD0] bg-white px-4 py-4 sm:px-6 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h1 className="text-xl font-semibold tracking-tight text-[#141413] sm:text-2xl">
            PDV Conjugado & Motor Salão Parceiro
          </h1>
          <p className="mt-1 text-sm text-[#4A4843]">
            Unifica caixa de serviços + estoque (Reservio) com desconto de taxa de maquininha, auxiliar e Lei nº 13.352/2016 (Trinks).
          </p>
        </div>

        {/* Seletor rápido da regra de rateio de taxa de cartão */}
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs font-medium text-[#4A4843]">
            Regra da Taxa de Maquininha:
          </span>
          {(
            [
              { id: 'PROPORTIONAL', label: 'Proporcional (Ex: 55%/45%)' },
              { id: 'STAFF_100', label: '100% Profissional' },
              { id: 'SALON_100', label: '100% Salão' },
            ] as Array<{ id: FeeSplitRule; label: string }>
          ).map((rule) => (
            <button
              key={rule.id}
              type="button"
              onClick={() => onChangeFeeSplitRule(rule.id)}
              className={`min-h-[36px] rounded-lg border px-3 py-1.5 text-xs font-medium ${
                business.feeSplitRule === rule.id
                  ? 'border-[#0F766E] bg-[#E6F4F1] text-[#0F766E]'
                  : 'border-[#DEDAD0] bg-white text-[#4A4843] hover:bg-[#F6F5F0]'
              }`}
            >
              {rule.label}
            </button>
          ))}
        </div>
      </div>

      {lastReceiptName && (
        <div
          role="status"
          className="border-b border-[#0F766E]/30 bg-[#E6F4F1] px-4 py-3 sm:px-6 flex items-center justify-between text-xs text-[#0F766E]"
        >
          <span className="flex items-center gap-2 font-medium">
            <CheckCircle size={17} weight="fill" />
            <span>
              Comanda de <strong>{lastReceiptName}</strong> liquidada com sucesso e lançada no razão de comissões!
            </span>
          </span>
          <button
            type="button"
            onClick={() => setLastReceiptName('')}
            className="underline font-semibold"
          >
            Ocultar aviso
          </button>
        </div>
      )}

      <form
        onSubmit={handleCheckout}
        noValidate
        className="grid grid-cols-1 lg:grid-cols-12 divide-y lg:divide-y-0 lg:divide-x divide-[#DEDAD0] bg-white"
      >
        {/* Coluna Esquerda (7 cols): Composição da Comanda */}
        <div className="lg:col-span-7 p-4 sm:p-6 space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="flex flex-col gap-1.5">
              <label htmlFor="pos-client" className="text-xs font-semibold text-[#141413]">
                Cliente da Comanda
              </label>
              <select
                id="pos-client"
                value={selectedClientId}
                onChange={(e) => setSelectedClientId(e.target.value)}
                className="min-h-[40px] rounded-lg border border-[#DEDAD0] bg-white px-3 text-xs text-[#141413]"
              >
                {clients.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.fullName} ({c.passes.length > 0 ? 'Passe Ativo' : 'Avulso'})
                  </option>
                ))}
              </select>
            </div>

            <div className="flex flex-col gap-1.5">
              <label htmlFor="pos-staff" className="text-xs font-semibold text-[#141413]">
                Profissional Principal
              </label>
              <select
                id="pos-staff"
                value={selectedStaffId}
                onChange={(e) => setSelectedStaffId(e.target.value)}
                className="min-h-[40px] rounded-lg border border-[#DEDAD0] bg-white px-3 text-xs text-[#141413]"
              >
                {professionals.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name} ({p.defaultServiceCommissionPct}% serv.)
                  </option>
                ))}
              </select>
            </div>

            <div className="flex flex-col gap-1.5">
              <label htmlFor="pos-assistant" className="text-xs font-semibold text-[#141413]">
                Auxiliar / Lavatório (Opcional)
              </label>
              <select
                id="pos-assistant"
                value={selectedAssistantId}
                onChange={(e) => setSelectedAssistantId(e.target.value)}
                className="min-h-[40px] rounded-lg border border-[#DEDAD0] bg-white px-3 text-xs text-[#141413]"
              >
                <option value="">Sem auxiliar no atendimento</option>
                {assistants.map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.name} (-{avgAssistantSharePct}% cota aux.)
                  </option>
                ))}
              </select>
            </div>
          </div>

          {activeClientPass && (
            <div className="rounded-lg border border-[#0F766E]/40 bg-[#E6F4F1]/60 p-3.5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
              <div className="text-xs text-[#141413]">
                <strong className="font-semibold text-[#0F766E] flex items-center gap-1.5">
                  <Ticket size={16} weight="fill" />
                  <span>Passe Pré-Pago Encontrado: {activeClientPass.name}</span>
                </strong>
                <span className="block mt-0.5 text-[#4A4843]">
                  Saldo disponível: <strong className="num-tabular">{activeClientPass.remainingSessions}</strong> de{' '}
                  <strong className="num-tabular">{activeClientPass.totalSessions}</strong> sessões.
                </span>
              </div>
              <button
                type="button"
                onClick={() => setPaymentMethod('CLIENT_PASS')}
                className="shrink-0 rounded-lg bg-[#0F766E] px-3 py-1.5 text-xs font-semibold text-white hover:bg-[#0B5C56]"
              >
                Usar Saldo do Passe
              </button>
            </div>
          )}

          {/* Serviços Executados */}
          <div>
            <h2 className="text-sm font-semibold text-[#141413]">
              Serviços Realizados na Cadeira
            </h2>
            <div className="mt-2 divide-y divide-[#DEDAD0] rounded-lg border border-[#DEDAD0]">
              {services.map((srv) => {
                const selected = selectedServiceIds.includes(srv.id);
                return (
                  <label
                    key={srv.id}
                    className={`flex cursor-pointer items-center justify-between px-3.5 py-2.5 text-xs ${
                      selected ? 'bg-[#E6F4F1]/40' : 'bg-white hover:bg-[#F6F5F0]/60'
                    }`}
                  >
                    <span className="flex items-center gap-2.5">
                      <input
                        type="checkbox"
                        checked={selected}
                        onChange={() => toggleService(srv.id)}
                        className="h-4 w-4 accent-[#0F766E]"
                      />
                      <span>
                        <strong className="font-medium text-[#141413]">{srv.name}</strong>
                        <span className="num-tabular block text-[11px] text-[#6E6A63]">
                          {srv.durationMinutes} min · Auxiliar: {srv.assistantSharePct}%
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

          {/* Produtos de Prateleira (Controle de Estoque Reservio/Trinks) */}
          <div>
            <h2 className="text-sm font-semibold text-[#141413]">
              Produtos de Revenda (Baixa Automática de Estoque)
            </h2>
            <div className="mt-2 divide-y divide-[#DEDAD0] rounded-lg border border-[#DEDAD0]">
              {products.map((prd) => {
                const qty = productCart[prd.id] || 0;
                const lowStock = prd.stockQuantity <= prd.minStockAlert;
                return (
                  <div
                    key={prd.id}
                    className="flex items-center justify-between px-3.5 py-2.5 text-xs bg-white"
                  >
                    <div>
                      <span className="font-medium text-[#141413]">{prd.name}</span>
                      <span className="num-tabular block text-[11px] text-[#6E6A63]">
                        SKU: {prd.sku} · Estoque:{' '}
                        <strong
                          className={
                            lowStock ? 'text-[#B45309] font-semibold' : 'text-[#141413]'
                          }
                        >
                          {prd.stockQuantity} un.
                        </strong>{' '}
                        · Comissão: {prd.commissionPct}%
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
                          className="h-7 w-7 inline-flex items-center justify-center text-[#141413] hover:bg-[#EFECE6]"
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
                          className="h-7 w-7 inline-flex items-center justify-center text-[#141413] hover:bg-[#EFECE6]"
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

        {/* Coluna Direita (5 cols): Checkout & Demonstrativo Salão Parceiro */}
        <div className="lg:col-span-5 bg-[#F6F5F0]/60 p-4 sm:p-6 space-y-5">
          <div>
            <h2 className="text-base font-semibold text-[#141413]">
              Meio de Recebimento & Descontos
            </h2>
            <div className="mt-2.5 grid grid-cols-2 sm:grid-cols-3 gap-2">
              {(
                [
                  { id: 'PIX', label: 'Pix Instantâneo', fee: '0,00%' },
                  { id: 'DEBIT_CARD', label: 'Cartão Débito', fee: '1,99%' },
                  { id: 'CREDIT_CARD', label: 'Cartão Crédito', fee: '3,99%' },
                  { id: 'CASH', label: 'Dinheiro', fee: '0,00%' },
                  { id: 'CLIENT_PASS', label: 'Abater Passe', fee: 'Pacote' },
                ] as Array<{ id: PaymentMethod; label: string; fee: string }>
              ).map((m) => (
                <button
                  key={m.id}
                  type="button"
                  onClick={() => setPaymentMethod(m.id)}
                  className={`rounded-lg border p-2.5 text-left text-xs ${
                    paymentMethod === m.id
                      ? 'border-[#0F766E] bg-[#E6F4F1] text-[#0F766E]'
                      : 'border-[#DEDAD0] bg-white text-[#141413] hover:bg-[#F6F5F0]'
                  }`}
                >
                  <span className="font-semibold block">{m.label}</span>
                  <span className="num-tabular text-[11px] text-[#6E6A63]">
                    Taxa: {m.fee}
                  </span>
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1">
              <label htmlFor="pos-discount" className="text-xs font-medium text-[#141413]">
                Abatimento / Sinal Pix (R$)
              </label>
              <input
                id="pos-discount"
                type="number"
                min={0}
                step={0.5}
                value={discountAmount}
                onChange={(e) => setDiscountAmount(Math.max(0, Number(e.target.value)))}
                className="num-tabular min-h-[38px] rounded-lg border border-[#DEDAD0] bg-white px-3 text-xs text-[#141413]"
              />
            </div>

            <div className="flex flex-col gap-1">
              <label htmlFor="pos-tip" className="text-xs font-medium text-[#141413]">
                Gorjeta / Caixinha 100% Prof. (R$)
              </label>
              <input
                id="pos-tip"
                type="number"
                min={0}
                step={1}
                value={tipAmount}
                onChange={(e) => setTipAmount(Math.max(0, Number(e.target.value)))}
                className="num-tabular min-h-[38px] rounded-lg border border-[#DEDAD0] bg-white px-3 text-xs text-[#141413]"
              />
            </div>
          </div>

          <label className="flex cursor-pointer items-center gap-2.5 rounded-lg border border-[#DEDAD0] bg-white px-3.5 py-2.5 text-xs">
            <input
              type="checkbox"
              checked={isFirstVisitBoost}
              onChange={(e) => setIsFirstVisitBoost(e.target.checked)}
              className="h-4 w-4 accent-[#0F766E]"
            />
            <span>
              Cliente captado na <strong>1ª Visita via Marketplace Boost</strong> (retém{' '}
              <span className="num-tabular font-semibold">{business.boostCommissionPct}%</span>{' '}
              apenas sobre o serviço base)
            </span>
          </label>

          {/* Espelho Contábil Lei do Salão Parceiro */}
          <div className="rounded-lg border border-[#DEDAD0] bg-white p-4 space-y-2.5 text-xs">
            <div className="flex items-center justify-between border-b border-[#DEDAD0] pb-2 font-semibold text-[#141413]">
              <span className="flex items-center gap-1.5">
                <Calculator size={16} weight="bold" />
                <span>Demonstrativo Salão Parceiro (Lei 13.352/2016)</span>
              </span>
              <span className="num-tabular text-[#0F766E]">Ao Vivo</span>
            </div>

            <div className="flex justify-between text-[#4A4843]">
              <span>Subtotal Serviços + Produtos:</span>
              <span className="num-tabular font-medium text-[#141413]">
                {formatBRL(subtotalServices + subtotalProducts)}
              </span>
            </div>

            {discountAmount > 0 && (
              <div className="flex justify-between text-[#0F766E]">
                <span>(-) Sinal Pix / Desconto Aplicado:</span>
                <span className="num-tabular font-medium">
                  - {formatBRL(discountAmount)}
                </span>
              </div>
            )}

            <div className="flex justify-between text-[#4A4843]">
              <span>
                (-) Taxa Adquirente ({splitResult.acquirerFeePct.toFixed(2)}%):
              </span>
              <span className="num-tabular font-medium text-[#B45309]">
                - {formatBRL(splitResult.acquirerFeeAmount)}
              </span>
            </div>

            {splitResult.boostFeeAmount > 0 && (
              <div className="flex justify-between text-[#4A4843]">
                <span>(-) Taxa Captação Boost (1ª visita):</span>
                <span className="num-tabular font-medium text-[#B45309]">
                  - {formatBRL(splitResult.boostFeeAmount)}
                </span>
              </div>
            )}

            <div className="border-t border-[#DEDAD0] pt-2.5 space-y-1.5">
              <div className="flex justify-between">
                <span className="text-[#4A4843]">
                  Comissão Bruta ({currentStaff?.name}):
                </span>
                <span className="num-tabular font-medium text-[#141413]">
                  {formatBRL(splitResult.staffGrossCommission)}
                </span>
              </div>

              <div className="flex justify-between text-[#6E6A63]">
                <span>(-) Desconto Taxa Maquininha no Profissional:</span>
                <span className="num-tabular">
                  - {formatBRL(splitResult.staffDeductedFee)}
                </span>
              </div>

              {splitResult.assistantCommission > 0 && (
                <div className="flex justify-between text-[#6E6A63]">
                  <span>
                    (-) Repasse Auxiliar ({currentAssistant?.name}):
                  </span>
                  <span className="num-tabular font-medium text-[#141413]">
                    - {formatBRL(splitResult.assistantCommission)}
                  </span>
                </div>
              )}

              <div className="flex justify-between rounded bg-[#E6F4F1] px-2.5 py-2 font-semibold text-[#0F766E]">
                <span>Cota-Parte Líquida Profissional:</span>
                <span className="num-tabular text-sm">
                  {formatBRL(splitResult.staffNetCommission)}
                </span>
              </div>

              <div className="flex justify-between px-2.5 py-1 font-semibold text-[#141413]">
                <span>Cota-Parte Líquida Salão:</span>
                <span className="num-tabular text-sm">
                  {formatBRL(splitResult.salonNetShare)}
                </span>
              </div>
            </div>

            <div className="border-t border-[#DEDAD0] pt-3 flex items-center justify-between">
              <span className="text-sm font-semibold text-[#141413]">
                Total a Cobrar do Cliente
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
            className="w-full min-h-[46px] inline-flex items-center justify-center gap-2 rounded-lg bg-[#0F766E] px-5 py-3 text-sm font-semibold text-white hover:bg-[#0B5C56]"
          >
            <Receipt size={19} weight="bold" />
            <span>Liquidar Comanda & Emitir Comprovante</span>
          </button>
        </div>
      </form>

      {/* Histórico Recente de Comandas Liquidadas (Tabela Responsiva @container) */}
      <div className="border-t border-[#DEDAD0] bg-white p-4 sm:p-6">
        <h2 id="pos-history-caption" className="text-base font-semibold text-[#141413] mb-3">
          Últimos Fechamentos de Caixa & Rateio de Comissões
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
                '--label-2': '"Profissional / Auxiliar"',
                '--label-3': '"Meio / Taxa"',
                '--label-4': '"Total Cobrado"',
                '--label-5': '"Líquido Profissional"',
                '--label-6': '"Líquido Salão"',
              } as React.CSSProperties
            }
          >
            <thead>
              <tr className="border-b border-[#DEDAD0] text-xs font-semibold text-[#4A4843]">
                <th className="px-4 py-3">Cliente & Horário</th>
                <th className="px-4 py-3">Profissional / Auxiliar</th>
                <th className="px-4 py-3">Meio / Taxa</th>
                <th className="px-4 py-3">Total Cobrado</th>
                <th className="px-4 py-3">Líquido Profissional</th>
                <th className="px-4 py-3">Líquido Salão</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#DEDAD0] text-xs">
              {transactions.map((tx) => (
                <tr key={tx.id} className="hover:bg-[#F6F5F0]/50">
                  <th scope="row" className="px-4 py-3 text-left">
                    <span className="font-semibold text-[#141413] block">
                      {tx.clientName}
                    </span>
                    <span className="num-tabular text-[11px] font-normal text-[#6E6A63]">
                      {tx.closedAt}
                    </span>
                  </th>
                  <td className="px-4 py-3">
                    <span className="font-medium text-[#141413]">{tx.staffName}</span>
                    {tx.assistantName && (
                      <span className="block text-[11px] text-[#6E6A63]">
                        Aux: {tx.assistantName} ({formatBRL(tx.assistantCommission)})
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3 num-tabular">
                    {tx.paymentMethod} (-{formatBRL(tx.acquirerFeeAmount)})
                  </td>
                  <td data-numeric="true" className="px-4 py-3 font-semibold text-[#141413]">
                    {formatBRL(tx.totalAmount)}
                  </td>
                  <td data-numeric="true" className="px-4 py-3 font-semibold text-[#0F766E]">
                    {formatBRL(tx.staffNetCommission)}
                  </td>
                  <td data-numeric="true" className="px-4 py-3 font-medium text-[#141413]">
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
