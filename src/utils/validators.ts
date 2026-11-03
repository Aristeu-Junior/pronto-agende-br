import { FeeSplitRule, PaymentMethod } from '../types';

/**
 * Validação oficial de CPF (Módulo 11)
 */
export function isValidCPF(rawCpf: string): boolean {
  const digits = rawCpf.replace(/\D/g, '');
  if (!digits || digits.length !== 11) return false;
  if (/^(\d)\1{10}$/.test(digits)) return false;

  let sum = 0;
  for (let i = 1; i <= 9; i++) {
    sum += parseInt(digits.substring(i - 1, i), 10) * (11 - i);
  }
  let remainder = (sum * 10) % 11;
  if (remainder === 10 || remainder === 11) remainder = 0;
  if (remainder !== parseInt(digits.substring(9, 10), 10)) return false;

  sum = 0;
  for (let i = 1; i <= 10; i++) {
    sum += parseInt(digits.substring(i - 1, i), 10) * (12 - i);
  }
  remainder = (sum * 10) % 11;
  if (remainder === 10 || remainder === 11) remainder = 0;
  if (remainder !== parseInt(digits.substring(10, 11), 10)) return false;

  return true;
}

export function formatCPF(value: string): string {
  const digits = value.replace(/\D/g, '').slice(0, 11);
  if (digits.length <= 3) return digits;
  if (digits.length <= 6) return `${digits.slice(0, 3)}.${digits.slice(3)}`;
  if (digits.length <= 9) return `${digits.slice(0, 3)}.${digits.slice(3, 6)}.${digits.slice(6)}`;
  return `${digits.slice(0, 3)}.${digits.slice(3, 6)}.${digits.slice(6, 9)}-${digits.slice(9, 11)}`;
}

export function formatPhoneBR(value: string): string {
  const digits = value.replace(/\D/g, '').slice(0, 11);
  if (digits.length === 0) return '';
  if (digits.length <= 2) return `(${digits}`;
  if (digits.length <= 6) return `(${digits.slice(0, 2)}) ${digits.slice(2)}`;
  if (digits.length <= 10) {
    return `(${digits.slice(0, 2)}) ${digits.slice(2, 6)}-${digits.slice(6)}`;
  }
  return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7, 11)}`;
}

export function isValidPhoneBR(value: string): boolean {
  const digits = value.replace(/\D/g, '');
  return digits.length === 10 || digits.length === 11;
}

export function formatBRL(amount: number): string {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
    minimumFractionDigits: 2,
  }).format(amount);
}

export function getPaymentFeePct(method: PaymentMethod): number {
  switch (method) {
    case 'PIX':
      return 0;
    case 'CASH':
      return 0;
    case 'CLIENT_PASS':
      return 0;
    case 'DEBIT_CARD':
      return 1.99;
    case 'CREDIT_CARD':
      return 3.99;
  }
}

export interface PartnerSplitInput {
  subtotalServices: number;
  subtotalProducts: number;
  discountAmount: number;
  tipAmount: number;
  serviceCommissionPct: number;
  productCommissionPct: number;
  assistantSharePct: number;
  hasAssistant: boolean;
  paymentMethod: PaymentMethod;
  feeSplitRule: FeeSplitRule;
  isFirstVisitBoost: boolean;
  boostCommissionPct: number;
}

export interface PartnerSplitResult {
  totalAmount: number;
  acquirerFeePct: number;
  acquirerFeeAmount: number;
  boostFeeAmount: number;
  staffGrossCommission: number;
  staffDeductedFee: number;
  assistantCommission: number;
  staffNetCommission: number;
  salonNetShare: number;
}

/**
 * Motor unificado de cálculo Salão Parceiro (Lei 13.352/2016) + Rateio de Taxa de Maquininha + Captação 1ª Visita
 */
export function calculatePartnerSplit(input: PartnerSplitInput): PartnerSplitResult {
  const netServices = Math.max(0, input.subtotalServices - input.discountAmount);
  const totalAmount =
    input.paymentMethod === 'CLIENT_PASS'
      ? input.subtotalProducts + input.tipAmount
      : netServices + input.subtotalProducts + input.tipAmount;

  const acquirerFeePct = getPaymentFeePct(input.paymentMethod);
  const acquirerFeeAmount = Number(((totalAmount * acquirerFeePct) / 100).toFixed(2));

  // Taxa de captação incide apenas sobre o preço líquido do serviço na 1ª visita via Vitrine
  const boostFeeAmount = input.isFirstVisitBoost
    ? Number(((netServices * input.boostCommissionPct) / 100).toFixed(2))
    : 0;

  const grossServiceComm = (netServices * input.serviceCommissionPct) / 100;
  const grossProductComm = (input.subtotalProducts * input.productCommissionPct) / 100;
  const staffGrossCommission = Number((grossServiceComm + grossProductComm + input.tipAmount).toFixed(2));

  // Rateio da taxa da maquininha conforme regra do estabelecimento
  let staffDeductedFee = 0;
  if (acquirerFeeAmount > 0) {
    if (input.feeSplitRule === 'PROPORTIONAL') {
      const effectiveRatio = totalAmount > 0 ? staffGrossCommission / totalAmount : 0.5;
      staffDeductedFee = Number((acquirerFeeAmount * effectiveRatio).toFixed(2));
    } else if (input.feeSplitRule === 'STAFF_100') {
      staffDeductedFee = acquirerFeeAmount;
    } else {
      staffDeductedFee = 0;
    }
  }

  // Cota do auxiliar/assistente (se houver assistente vinculado ao atendimento)
  const assistantCommission = input.hasAssistant
    ? Number(((netServices * input.assistantSharePct) / 100).toFixed(2))
    : 0;

  const staffNetCommission = Number(
    Math.max(0, staffGrossCommission - staffDeductedFee - assistantCommission).toFixed(2)
  );

  const salonNetShare = Number(
    Math.max(
      0,
      totalAmount - acquirerFeeAmount - boostFeeAmount - staffNetCommission - assistantCommission
    ).toFixed(2)
  );

  return {
    totalAmount: Number(totalAmount.toFixed(2)),
    acquirerFeePct,
    acquirerFeeAmount,
    boostFeeAmount,
    staffGrossCommission,
    staffDeductedFee,
    assistantCommission,
    staffNetCommission,
    salonNetShare,
  };
}
