import { FeeSplitRule, PaymentMethod } from '../types';
import { calculatePartnerSplit, formatBRL } from './validators';

export const formatCurrencyBRL = formatBRL;

export const PAYMENT_METHOD_LABELS: Record<PaymentMethod, string> = {
  PIX: 'Pix Instantâneo',
  DEBIT_CARD: 'Cartão Débito',
  CREDIT_CARD: 'Cartão Crédito',
  CASH: 'Dinheiro',
  CLIENT_PASS: 'Pacote / Assinatura',
};

export const FEE_SPLIT_RULE_LABELS: Record<FeeSplitRule, string> = {
  PROPORTIONAL: 'Proporcional (Divide taxa entre Barbearia e Barbeiro)',
  STAFF_100: '100% Descontado do Barbeiro',
  SALON_100: '100% Absorvido pela Barbearia',
};

export interface TransactionSplitParams {
  subtotalServices: number;
  subtotalProducts: number;
  discountAmount: number;
  tipAmount: number;
  paymentMethod: PaymentMethod;
  feeSplitRule: FeeSplitRule;
  staffServiceCommissionPct: number;
  staffProductCommissionPct: number;
  assistantSharePct: number;
  isFirstVisitBoost: boolean;
  boostCommissionPct: number;
}

export function calculateTransactionSplit(params: TransactionSplitParams) {
  const split = calculatePartnerSplit({
    subtotalServices: params.subtotalServices,
    subtotalProducts: params.subtotalProducts,
    discountAmount: params.discountAmount,
    tipAmount: params.tipAmount,
    serviceCommissionPct: params.staffServiceCommissionPct,
    productCommissionPct: params.staffProductCommissionPct,
    assistantSharePct: params.assistantSharePct,
    hasAssistant: params.assistantSharePct > 0,
    paymentMethod: params.paymentMethod,
    feeSplitRule: params.feeSplitRule,
    isFirstVisitBoost: params.isFirstVisitBoost,
    boostCommissionPct: params.boostCommissionPct,
  });

  return {
    subtotalServices: params.subtotalServices,
    subtotalProducts: params.subtotalProducts,
    discountAmount: params.discountAmount,
    tipAmount: params.tipAmount,
    ...split,
  };
}
