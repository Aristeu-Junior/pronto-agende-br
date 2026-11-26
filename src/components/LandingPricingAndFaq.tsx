import React, { useState } from 'react';
import { ArrowRight, CaretDown, Check } from '@phosphor-icons/react';
import {
  BillingCycle,
  buildSalesWhatsAppUrl,
  LANDING_FAQS,
  LANDING_PLANS,
  TRIAL_CTA_LABEL,
} from '../config/landing';

interface LandingPricingSectionProps {
  isAuthenticated?: boolean;
  loginHref: string;
}

const brl = (value: number, fractionDigits = 0) =>
  `R$ ${value.toLocaleString('pt-BR', {
    minimumFractionDigits: fractionDigits,
    maximumFractionDigits: fractionDigits,
  })}`;

export const LandingPricingSection: React.FC<LandingPricingSectionProps> = () => {
  // Anual já vem selecionado para o cliente enxergar o melhor preço primeiro.
  const [billingCycle, setBillingCycle] = useState<BillingCycle>('annual');

  return (
    <div className="space-y-10">
      <div className="flex flex-col items-center gap-5 text-center">
        <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-stone-100">
          Planos
        </h2>
        <div
          role="group"
          aria-label="Ciclo de cobrança dos planos"
          className="inline-flex rounded-2xl border border-stone-800 bg-stone-900 p-1"
        >
          {(['monthly', 'annual'] as const).map((cycle) => (
            <button
              key={cycle}
              type="button"
              onClick={() => setBillingCycle(cycle)}
              aria-pressed={billingCycle === cycle}
              className={`inline-flex items-center gap-1.5 rounded-xl px-4 py-2 text-xs font-bold transition-all cursor-pointer ${
                billingCycle === cycle
                  ? 'bg-amber-500 text-stone-950'
                  : 'text-stone-300 hover:text-stone-100'
              }`}
            >
              <span>{cycle === 'monthly' ? 'Mensal' : 'Anual'}</span>
              {cycle === 'annual' && (
                <span className="font-mono text-[10px] font-bold">Desconto</span>
              )}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5 items-stretch">
        {LANDING_PLANS.map((plan) => {
          const tier = billingCycle === 'annual' ? plan.annual : plan.monthly;
          const periodLabel =
            tier === null
              ? plan.customPeriodLabel
              : billingCycle === 'annual'
              ? '/ano'
              : '/mês';

          const primaryHref = plan.useWhatsappPrimary
            ? buildSalesWhatsAppUrl(plan.name, billingCycle)
            : plan.ctaHref;
          const external = primaryHref.startsWith('http');

          return (
            <div
              key={plan.id}
              className={`flex flex-col justify-between gap-6 rounded-3xl bg-stone-900 p-6 sm:p-7 ${
                plan.highlighted
                  ? 'border-2 border-amber-500'
                  : 'border border-stone-800'
              }`}
            >
              <div className="space-y-5">
                <h3 className="text-lg font-bold text-stone-100">{plan.name}</h3>
                <div className="space-y-1">
                  {tier !== null && (
                    <p className="font-mono num-tabular text-sm text-stone-400 line-through">
                      {brl(tier.was)}
                    </p>
                  )}
                  <div className="flex items-baseline gap-1.5">
                    <span className="font-mono num-tabular text-3xl font-bold text-stone-100">
                      {tier !== null ? brl(tier.price) : plan.customPriceLabel}
                    </span>
                    <span className="text-xs font-medium text-stone-400">
                      {periodLabel}
                    </span>
                  </div>
                  {tier !== null && billingCycle === 'annual' && (
                    <p className="text-[11px] font-medium text-stone-400">
                      equivale a {brl(tier.price / 12, 2)} por mês
                    </p>
                  )}
                </div>
                <ul className="space-y-2.5">
                  {plan.features.map((feat) => (
                    <li
                      key={feat}
                      className="flex items-start gap-2 text-xs text-stone-200"
                    >
                      <Check
                        className="mt-0.5 h-4 w-4 shrink-0 text-emerald-700"
                        weight="bold"
                      />
                      <span>{feat}</span>
                    </li>
                  ))}
                </ul>
              </div>

              <a
                href={primaryHref}
                target={external ? '_blank' : undefined}
                rel={external ? 'noopener noreferrer' : undefined}
                className={`inline-flex items-center justify-center gap-2 rounded-2xl px-5 py-3 text-xs font-bold ${
                  plan.highlighted
                    ? 'bg-amber-500 hover:bg-amber-600 text-stone-950'
                    : 'border border-stone-800 bg-tint-50 hover:border-amber-500 text-stone-100'
                }`}
              >
                <span>{plan.ctaLabel}</span>
                <ArrowRight className="h-4 w-4" weight="bold" />
              </a>
            </div>
          );
        })}
      </div>

      <div className="flex flex-col sm:flex-row items-center justify-center gap-4 rounded-3xl border border-stone-800 bg-stone-900 px-6 py-5 text-center sm:text-left">
        <p className="text-sm font-bold text-stone-100">
          Ainda na dúvida de qual plano escolher?
        </p>
        <a
          href="#/cadastro"
          className="inline-flex items-center justify-center gap-2 rounded-2xl bg-amber-500 hover:bg-amber-600 px-5 py-3 text-xs font-bold text-stone-950"
        >
          <span>{TRIAL_CTA_LABEL}</span>
          <ArrowRight className="h-4 w-4" weight="bold" />
        </a>
      </div>
    </div>
  );
};

export const LandingFaqSection: React.FC = () => (
  <div className="max-w-3xl mx-auto px-4 sm:px-6 space-y-8">
    <h2 className="text-center text-2xl sm:text-3xl font-bold tracking-tight text-stone-100">
      Dúvidas
    </h2>
    <div className="landing-faq space-y-3">
      {LANDING_FAQS.map((faq) => (
        <details
          key={faq.question}
          className="rounded-2xl border border-stone-800 bg-stone-900 overflow-hidden"
        >
          <summary className="flex items-center justify-between gap-4 px-5 py-4 text-sm font-bold text-stone-100 cursor-pointer">
            <span>{faq.question}</span>
            <CaretDown
              className="faq-chevron h-4 w-4 shrink-0 text-amber-500"
              weight="bold"
            />
          </summary>
          <div className="px-5 pb-4 text-xs sm:text-sm leading-relaxed text-stone-300 border-t border-stone-800/60 pt-3">
            {faq.answer}
          </div>
        </details>
      ))}
    </div>
  </div>
);
