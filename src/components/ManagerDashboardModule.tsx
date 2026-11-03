import React, { useMemo } from 'react';
import {
  ArrowUpRight,
  ChartBar,
  CheckCircle,
  CurrencyDollar,
  GearSix,
  GlobeHemisphereWest,
  Lightning,
  ShieldCheck,
  TrendUp,
  Users,
} from '@phosphor-icons/react';
import {
  Appointment,
  BusinessConfig,
  Client,
  FeeSplitRule,
  PosTransaction,
  StaffMember,
} from '../types';
import { formatBRL } from '../utils/validators';

interface ManagerDashboardModuleProps {
  business: BusinessConfig;
  staff: StaffMember[];
  appointments: Appointment[];
  transactions: PosTransaction[];
  clients: Client[];
  onUpdateBusiness: (patch: Partial<BusinessConfig>) => void;
  onResetDemoData: () => void;
}

export const ManagerDashboardModule: React.FC<ManagerDashboardModuleProps> = ({
  business,
  staff,
  appointments,
  transactions,
  clients,
  onUpdateBusiness,
  onResetDemoData,
}) => {
  const metrics = useMemo(() => {
    const grossRevenue = transactions.reduce((acc, t) => acc + t.totalAmount, 0);
    const totalStaffPayout = transactions.reduce(
      (acc, t) => acc + t.staffNetCommission + t.assistantCommission,
      0
    );
    const netSalonRevenue = transactions.reduce(
      (acc, t) => acc + t.salonNetShare,
      0
    );
    const totalAcquirerFees = transactions.reduce(
      (acc, t) => acc + t.acquirerFeeAmount,
      0
    );

    const byOrigin = {
      GOOGLE_RESERVE: appointments.filter(
        (a) => a.originChannel === 'GOOGLE_RESERVE'
      ).length,
      DIRECT_LINK: appointments.filter((a) => a.originChannel === 'DIRECT_LINK')
        .length,
      MARKETPLACE_BOOST: appointments.filter(
        (a) => a.originChannel === 'MARKETPLACE_BOOST'
      ).length,
      WALK_IN: appointments.filter((a) => a.originChannel === 'WALK_IN').length,
    };

    const protectedDeposits = appointments.reduce(
      (acc, a) => acc + a.depositPixPaid,
      0
    );

    return {
      grossRevenue,
      totalStaffPayout,
      netSalonRevenue,
      totalAcquirerFees,
      byOrigin,
      protectedDeposits,
    };
  }, [transactions, appointments]);

  const staffCommissionRows = useMemo(() => {
    return staff.map((member) => {
      const asPrimary = transactions
        .filter((t) => t.staffId === member.id)
        .reduce((acc, t) => acc + t.staffNetCommission, 0);
      const asAssistant = transactions
        .filter((t) => t.assistantStaffId === member.id)
        .reduce((acc, t) => acc + t.assistantCommission, 0);
      const deductedFees = transactions
        .filter((t) => t.staffId === member.id)
        .reduce((acc, t) => acc + t.staffDeductedFee, 0);
      const count = transactions.filter(
        (t) => t.staffId === member.id || t.assistantStaffId === member.id
      ).length;

      return {
        member,
        count,
        deductedFees,
        netTotal: asPrimary + asAssistant,
      };
    });
  }, [staff, transactions]);

  return (
    <section aria-label="Painel Executivo do Gestor e Regras Unificadas">
      <div className="border-b border-[#DEDAD0] bg-white px-4 py-4 sm:px-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl font-semibold tracking-tight text-[#141413] sm:text-2xl">
            Painel do Gestor, DRE Diário & Regras de Negócio
          </h1>
          <p className="mt-1 text-sm text-[#4A4843]">
            Consolida faturamento líquido (Salão vs. Parceiros), origem de captação e controle do plano Freemium.
          </p>
        </div>

        <button
          type="button"
          onClick={onResetDemoData}
          className="self-start sm:self-center rounded-lg border border-[#DEDAD0] bg-[#F6F5F0] px-3.5 py-2 text-xs font-medium text-[#141413] hover:bg-[#EFECE6]"
        >
          Restaurar Dados Iniciais de Demonstração
        </button>
      </div>

      {/* Faixa Contínua de Indicadores Financeiros (Sem Caixas Aninhadas — Linha Divisória 1px) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 divide-y sm:divide-y-0 sm:divide-x divide-[#DEDAD0] border-b border-[#DEDAD0] bg-white">
        <div className="p-5">
          <span className="text-xs font-medium text-[#4A4843]">
            Receita Bruta Liquidada (Caixa)
          </span>
          <div className="num-tabular mt-1.5 text-2xl font-bold text-[#141413]">
            {formatBRL(metrics.grossRevenue)}
          </div>
          <span className="num-tabular mt-1 block text-xs text-[#6E6A63]">
            Taxas maquininha descontadas: {formatBRL(metrics.totalAcquirerFees)}
          </span>
        </div>

        <div className="p-5">
          <span className="text-xs font-medium text-[#4A4843]">
            Cota-Parte Líquida Profissionais & Auxiliar
          </span>
          <div className="num-tabular mt-1.5 text-2xl font-bold text-[#0F766E]">
            {formatBRL(metrics.totalStaffPayout)}
          </div>
          <span className="mt-1 block text-xs text-[#6E6A63]">
            Isento de tributação sobre receita do salão (Lei 13.352)
          </span>
        </div>

        <div className="p-5">
          <span className="text-xs font-medium text-[#4A4843]">
            Cota-Parte Líquida do Estabelecimento
          </span>
          <div className="num-tabular mt-1.5 text-2xl font-bold text-[#141413]">
            {formatBRL(metrics.netSalonRevenue)}
          </div>
          <span className="mt-1 block text-xs text-[#6E6A63]">
            Margem real após comissões e taxas de cartão
          </span>
        </div>

        <div className="p-5">
          <span className="text-xs font-medium text-[#4A4843]">
            Sinais Pix Anti-No-Show Retidos Hoje
          </span>
          <div className="num-tabular mt-1.5 text-2xl font-bold text-[#141413]">
            {formatBRL(metrics.protectedDeposits)}
          </div>
          <span className="mt-1 block text-xs text-[#6E6A63]">
            Proteção ativa para clientes com 2+ faltas
          </span>
        </div>
      </div>

      {/* Corpo Principal: Regras de Negócio & Cota Freemium (6 cols) + Razão de Comissões e Origem (6 cols) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 divide-y lg:divide-y-0 lg:divide-x divide-[#DEDAD0] bg-white">
        <div className="lg:col-span-6 p-4 sm:p-6 space-y-6">
          {/* Controle da Cota Freemium (Estilo Reservio + Soft-Cap Brasileiro) */}
          <div className="rounded-lg border border-[#DEDAD0] bg-[#F6F5F0]/60 p-4 space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="text-base font-semibold text-[#141413]">
                Plano Atual:{' '}
                {business.planTier === 'FREE'
                  ? 'Plano Gratuito Vitalício (Até 60 reservas/mês)'
                  : 'Plano Pro Ilimitado (R$ 79,90/mês)'}
              </h2>
              <button
                type="button"
                onClick={() =>
                  onUpdateBusiness({
                    planTier: business.planTier === 'FREE' ? 'PRO' : 'FREE',
                  })
                }
                className="rounded-lg bg-[#0F766E] px-3 py-1.5 text-xs font-semibold text-white hover:bg-[#0B5C56]"
              >
                {business.planTier === 'FREE'
                  ? 'Ativar Plano Pro Ilimitado'
                  : 'Voltar para Plano Grátis'}
              </button>
            </div>

            <div className="space-y-1.5 text-xs">
              <div className="flex justify-between text-[#4A4843]">
                <span>Uso da Cota no Mês Civil:</span>
                <span className="num-tabular font-semibold text-[#141413]">
                  {business.monthlyBookingsUsed} de{' '}
                  {business.planTier === 'PRO'
                    ? 'Ilimitado'
                    : business.monthlyBookingsLimit}{' '}
                  agendamentos
                </span>
              </div>
              <div className="h-2.5 w-full overflow-hidden rounded-full bg-[#DEDAD0]">
                <div
                  className="h-full bg-[#0F766E] transition-all"
                  style={{
                    width:
                      business.planTier === 'PRO'
                        ? '28%'
                        : `${Math.min(
                            100,
                            (business.monthlyBookingsUsed /
                              business.monthlyBookingsLimit) *
                              100
                          )}%`,
                  }}
                />
              </div>
            </div>

            <div className="flex flex-wrap gap-2 pt-1">
              <button
                type="button"
                onClick={() => onUpdateBusiness({ monthlyBookingsUsed: 60, planTier: 'FREE' })}
                className="rounded border border-[#DEDAD0] bg-white px-2.5 py-1 text-xs font-medium text-[#141413] hover:bg-[#EFECE6]"
              >
                Simular Cota Atingida (60/60)
              </button>
              <button
                type="button"
                onClick={() => onUpdateBusiness({ monthlyBookingsUsed: 48 })}
                className="rounded border border-[#DEDAD0] bg-white px-2.5 py-1 text-xs font-medium text-[#141413] hover:bg-[#EFECE6]"
              >
                Restaurar Cota (48/60)
              </button>
            </div>
          </div>

          {/* Parametrização das Regras de Negócio Unificadas */}
          <div className="space-y-4">
            <h2 className="text-base font-semibold text-[#141413]">
              Parametrização das Regras de Negócio (Trinks + Booksy + Reservio)
            </h2>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="flex flex-col gap-1.5">
                <label
                  htmlFor="cfg-fee-rule"
                  className="text-xs font-semibold text-[#141413]"
                >
                  Rateio da Taxa de Maquininha (Trinks)
                </label>
                <select
                  id="cfg-fee-rule"
                  value={business.feeSplitRule}
                  onChange={(e) =>
                    onUpdateBusiness({
                      feeSplitRule: e.target.value as FeeSplitRule,
                    })
                  }
                  className="min-h-[40px] rounded-lg border border-[#DEDAD0] bg-white px-3 text-xs text-[#141413]"
                >
                  <option value="PROPORTIONAL">
                    Proporcional à Comissão (Padrão Salão Parceiro)
                  </option>
                  <option value="STAFF_100">
                    Descontar 100% do Profissional
                  </option>
                  <option value="SALON_100">
                    Estabelecimento Absorve 100%
                  </option>
                </select>
              </div>

              <div className="flex flex-col gap-1.5">
                <label
                  htmlFor="cfg-noshow-pct"
                  className="text-xs font-semibold text-[#141413]"
                >
                  Sinal Pix Anti-No-Show p/ Reincidentes (%)
                </label>
                <input
                  id="cfg-noshow-pct"
                  type="number"
                  min={10}
                  max={100}
                  step={5}
                  value={business.noShowDepositPercent}
                  onChange={(e) =>
                    onUpdateBusiness({
                      noShowDepositPercent: Math.max(
                        10,
                        Math.min(100, Number(e.target.value))
                      ),
                    })
                  }
                  className="num-tabular min-h-[40px] rounded-lg border border-[#DEDAD0] bg-white px-3 text-xs text-[#141413]"
                />
              </div>
            </div>

            <div className="divide-y divide-[#DEDAD0] rounded-lg border border-[#DEDAD0]">
              <label className="flex cursor-pointer items-center justify-between p-3.5 text-xs">
                <div>
                  <strong className="font-semibold text-[#141413] block">
                    Integração Botão "Reservar com Google" (Busca + Google Maps)
                  </strong>
                  <span className="text-[#4A4843]">
                    Sincroniza slots livres diretamente no card da empresa no Google (0% comissão).
                  </span>
                </div>
                <input
                  type="checkbox"
                  checked={business.googleReserveEnabled}
                  onChange={(e) =>
                    onUpdateBusiness({ googleReserveEnabled: e.target.checked })
                  }
                  className="h-4 w-4 accent-[#0F766E]"
                />
              </label>

              <label className="flex cursor-pointer items-center justify-between p-3.5 text-xs">
                <div>
                  <strong className="font-semibold text-[#141413] block">
                    Impulsionamento Vitrine Boost (Taxa Justa 15% apenas na 1ª visita)
                  </strong>
                  <span className="text-[#4A4843]">
                    Destaca a barbearia na vitrine regional; clientes do seu link próprio nunca pagam taxa.
                  </span>
                </div>
                <input
                  type="checkbox"
                  checked={business.boostEnabled}
                  onChange={(e) =>
                    onUpdateBusiness({ boostEnabled: e.target.checked })
                  }
                  className="h-4 w-4 accent-[#0F766E]"
                />
              </label>
            </div>
          </div>
        </div>

        {/* Coluna Direita (6 cols): Folha de Repasse de Comissões & Origem dos Agendamentos */}
        <div className="lg:col-span-6 p-4 sm:p-6 space-y-6">
          <div>
            <h2 className="text-base font-semibold text-[#141413] mb-3">
              Folha de Repasse de Comissões por Profissional & Auxiliar
            </h2>
            <div className="divide-y divide-[#DEDAD0] rounded-lg border border-[#DEDAD0]">
              {staffCommissionRows.map(({ member, count, deductedFees, netTotal }) => (
                <div
                  key={member.id}
                  className="flex items-center justify-between px-4 py-3 text-xs"
                >
                  <div>
                    <span className="font-semibold text-[#141413] block">
                      {member.name} ({member.chairLabel})
                    </span>
                    <span className="num-tabular text-[11px] text-[#6E6A63]">
                      {count} comandas liquidadas · Taxa cartão descontada:{' '}
                      {formatBRL(deductedFees)}
                    </span>
                  </div>
                  <div className="text-right">
                    <span className="num-tabular text-sm font-bold text-[#0F766E] block">
                      {formatBRL(netTotal)}
                    </span>
                    <span className="text-[11px] text-[#6E6A63]">
                      Líquido a repassar
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div>
            <h2 className="text-base font-semibold text-[#141413] mb-3">
              Atribuição Auditável de Origem dos Agendamentos do Dia
            </h2>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 text-xs">
              <div className="rounded-lg border border-[#DEDAD0] bg-[#F6F5F0]/60 p-3">
                <span className="text-[#4A4843] block">Google Reserve</span>
                <span className="num-tabular mt-1 text-xl font-bold text-[#141413] block">
                  {metrics.byOrigin.GOOGLE_RESERVE}
                </span>
                <span className="text-[11px] text-[#0F766E]">Isento de taxa</span>
              </div>

              <div className="rounded-lg border border-[#DEDAD0] bg-[#F6F5F0]/60 p-3">
                <span className="text-[#4A4843] block">Link Próprio / Bio</span>
                <span className="num-tabular mt-1 text-xl font-bold text-[#141413] block">
                  {metrics.byOrigin.DIRECT_LINK}
                </span>
                <span className="text-[11px] text-[#0F766E]">Isento de taxa</span>
              </div>

              <div className="rounded-lg border border-[#DEDAD0] bg-[#F6F5F0]/60 p-3">
                <span className="text-[#4A4843] block">Encaixes Walk-in</span>
                <span className="num-tabular mt-1 text-xl font-bold text-[#141413] block">
                  {metrics.byOrigin.WALK_IN}
                </span>
                <span className="text-[11px] text-[#0F766E]">Recepção 2 toques</span>
              </div>

              <div className="rounded-lg border border-[#DEDAD0] bg-[#F6F5F0]/60 p-3">
                <span className="text-[#4A4843] block">Vitrine Boost</span>
                <span className="num-tabular mt-1 text-xl font-bold text-[#141413] block">
                  {metrics.byOrigin.MARKETPLACE_BOOST}
                </span>
                <span className="text-[11px] text-[#4A4843]">15% na 1ª visita</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};
