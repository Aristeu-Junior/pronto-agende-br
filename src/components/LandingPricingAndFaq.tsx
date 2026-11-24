import React, { useMemo, useState } from 'react';
import {
  ArrowRight,
  CaretDown,
  Check,
  CheckCircle,
  ShieldCheck,
  WhatsappLogo,
} from '@phosphor-icons/react';
import {
  BillingCycle,
  buildSalesWhatsAppUrl,
  INCLUDED_IN_ALL_PLANS,
  LANDING_FAQ_CATEGORIES,
  LANDING_FAQS,
  LANDING_PLANS,
  LandingFaqCategory,
} from '../config/landing';
import { SpotlightCard } from './SpotlightCard';

interface LandingPricingSectionProps {
  isAuthenticated?: boolean;
  loginHref: string;
}

export const LandingPricingSection: React.FC<LandingPricingSectionProps> = ({
  isAuthenticated = false,
  loginHref,
}) => {
  const [billingCycle, setBillingCycle] = useState<BillingCycle>('monthly');

  const salesWhatsappHref = buildSalesWhatsAppUrl(undefined, billingCycle);
  const isGeneralWhatsappExternal = salesWhatsappHref.startsWith('http');

  return (
    <div className="space-y-10">
      <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-5">
        <div className="max-w-2xl space-y-2">
          <span className="font-mono text-xs font-bold uppercase tracking-widest text-amber-800">
            Planos &amp; Contratação
          </span>
          <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-stone-100">
            Escolha o plano ideal para o tamanho do seu negócio
          </h2>
          <p className="text-sm text-stone-300">
            Sem fidelidade, sem taxa escondida por agendamento e ativação no mesmo
            dia após o cadastro ou confirmação pelo WhatsApp.
          </p>
        </div>

        {/* Seletor Mensal / Anual (-20%) + WhatsApp */}
        <div className="flex flex-wrap items-center gap-3">
          <div
            role="group"
            aria-label="Ciclo de cobrança dos planos"
            className="inline-flex rounded-2xl border border-stone-800 bg-stone-900 p-1 shadow-sm"
          >
            <button
              type="button"
              onClick={() => setBillingCycle('monthly')}
              aria-pressed={billingCycle === 'monthly'}
              className={`rounded-xl px-3.5 py-2 text-xs font-bold transition-all cursor-pointer ${
                billingCycle === 'monthly'
                  ? 'bg-amber-500 text-stone-950 shadow-sm'
                  : 'text-stone-300 hover:text-stone-100'
              }`}
            >
              Mensal
            </button>
            <button
              type="button"
              onClick={() => setBillingCycle('annual')}
              aria-pressed={billingCycle === 'annual'}
              className={`inline-flex items-center gap-1.5 rounded-xl px-3.5 py-2 text-xs font-bold transition-all cursor-pointer ${
                billingCycle === 'annual'
                  ? 'bg-amber-500 text-stone-950 shadow-sm'
                  : 'text-stone-300 hover:text-stone-100'
              }`}
            >
              <span>Anual</span>
              <span
                className={`rounded-full px-1.5 py-0.5 font-mono text-[10px] font-bold ${
                  billingCycle === 'annual'
                    ? 'bg-stone-950/20 text-stone-950'
                    : 'bg-emerald-950 text-emerald-700'
                }`}
              >
                -20%
              </span>
            </button>
          </div>

          <a
            href={salesWhatsappHref}
            target={isGeneralWhatsappExternal ? '_blank' : undefined}
            rel={isGeneralWhatsappExternal ? 'noopener noreferrer' : undefined}
            className="inline-flex items-center gap-2 rounded-xl border border-stone-800 bg-stone-900 px-4 py-2.5 text-xs font-bold text-stone-100 hover:border-emerald-600"
          >
            <WhatsappLogo className="h-4 w-4 text-emerald-700" weight="bold" />
            <span>Tirar dúvida comercial</span>
          </a>
        </div>
      </div>

      {/* Cards de planos com SpotlightCard */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-stretch">
        {LANDING_PLANS.map((plan) => {
          const displayedPrice =
            billingCycle === 'annual' && plan.priceAnnualMonthlyValue !== null
              ? `R$ ${plan.priceAnnualMonthlyValue}`
              : plan.priceMonthlyValue !== null
              ? `R$ ${plan.priceMonthlyValue}`
              : plan.priceMonthly;

          const whatsappPlanUrl = buildSalesWhatsAppUrl(plan.name, billingCycle);
          const primaryHref = plan.useWhatsappPrimary
            ? whatsappPlanUrl
            : plan.ctaHref;
          const isPrimaryExternal = primaryHref.startsWith('http');
          const isWhatsappSecondaryExternal =
            whatsappPlanUrl.startsWith('http');

          return (
            <SpotlightCard
              key={plan.id}
              className={`rounded-3xl p-6 sm:p-7 transition-all ${
                plan.highlighted
                  ? 'border-2 border-amber-500 bg-stone-900 shadow-xl shadow-amber-500/10'
                  : 'border border-stone-800 bg-stone-900'
              }`}
            >
              <div className="h-full flex flex-col justify-between space-y-6">
                <div className="space-y-4">
                  <div className="flex items-center justify-between gap-2">
                    <h3 className="text-lg font-bold text-stone-100">
                      {plan.name}
                    </h3>
                    {plan.badge && (
                      <span className="rounded-full bg-amber-500 px-3 py-0.5 text-[11px] font-bold text-stone-950">
                        {plan.badge}
                      </span>
                    )}
                  </div>

                  <div className="space-y-1">
                    <div className="flex items-baseline gap-1.5">
                      <span className="font-mono num-tabular text-3xl font-bold text-stone-100">
                        {displayedPrice}
                      </span>
                      <span className="text-xs font-medium text-stone-400">
                        {plan.periodLabel}
                      </span>
                    </div>
                    {billingCycle === 'annual' && plan.annualSavingsLabel && (
                      <span className="inline-flex items-center rounded-full bg-emerald-950 px-2.5 py-0.5 font-mono text-[11px] font-bold text-emerald-700">
                        {plan.annualSavingsLabel}
                      </span>
                    )}
                  </div>

                  <p className="text-xs leading-relaxed text-stone-300">
                    {plan.description}
                  </p>

                  <ul className="space-y-2.5 border-t border-stone-800 pt-4">
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

                <div className="space-y-2.5">
                  <a
                    href={primaryHref}
                    target={isPrimaryExternal ? '_blank' : undefined}
                    rel={isPrimaryExternal ? 'noopener noreferrer' : undefined}
                    className={`w-full inline-flex items-center justify-center gap-2 rounded-2xl px-5 py-3 text-xs font-bold transition-all ${
                      plan.highlighted
                        ? 'bg-amber-500 hover:bg-amber-600 text-stone-950 shadow-md shadow-amber-500/20'
                        : 'border border-stone-800 bg-tint-50 hover:border-amber-500 text-stone-100'
                    }`}
                  >
                    <span>{plan.ctaLabel}</span>
                    <ArrowRight className="h-4 w-4" weight="bold" />
                  </a>

                  {!plan.useWhatsappPrimary && (
                    <a
                      href={whatsappPlanUrl}
                      target={isWhatsappSecondaryExternal ? '_blank' : undefined}
                      rel={
                        isWhatsappSecondaryExternal
                          ? 'noopener noreferrer'
                          : undefined
                      }
                      className="w-full inline-flex items-center justify-center gap-1.5 text-[11px] font-semibold text-stone-400 hover:text-emerald-700"
                    >
                      <WhatsappLogo className="h-3.5 w-3.5" weight="bold" />
                      <span>Falar sobre este plano no WhatsApp</span>
                    </a>
                  )}
                </div>
              </div>
            </SpotlightCard>
          );
        })}
      </div>

      {/* Faixa Incluso em todos os planos */}
      <div className="rounded-2xl border border-stone-800 bg-tint-50 p-4 sm:p-5 space-y-3">
        <p className="font-mono text-[11px] font-bold uppercase tracking-wider text-stone-400 text-center">
          Incluso em todos os planos
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5">
          {INCLUDED_IN_ALL_PLANS.map((item) => (
            <div
              key={item}
              className="flex items-center justify-center sm:justify-start gap-2 rounded-xl border border-stone-800 bg-stone-900 px-3.5 py-2.5 text-xs font-semibold text-stone-200"
            >
              <CheckCircle
                className="h-4 w-4 shrink-0 text-emerald-700"
                weight="fill"
              />
              <span>{item}</span>
            </div>
          ))}
        </div>
      </div>

      <p className="text-center text-xs text-stone-400">
        Já tem conta aprovada na barbearia?{' '}
        <a
          href={loginHref}
          className="font-bold text-amber-800 hover:underline"
        >
          {isAuthenticated
            ? 'Abrir meu painel agora →'
            : 'Fazer login como barbeiro →'}
        </a>
      </p>
    </div>
  );
};

export const LandingFaqSection: React.FC = () => {
  const [selectedCategory, setSelectedCategory] = useState<
    'ALL' | LandingFaqCategory
  >('ALL');
  const [openQuestions, setOpenQuestions] = useState<Record<string, boolean>>(
    {}
  );

  const filteredFaqs = useMemo(() => {
    if (selectedCategory === 'ALL') return LANDING_FAQS;
    return LANDING_FAQS.filter((f) => f.category === selectedCategory);
  }, [selectedCategory]);

  const allExpanded =
    filteredFaqs.length > 0 &&
    filteredFaqs.every((faq) => Boolean(openQuestions[faq.question]));

  const toggleAllFaqs = () => {
    const nextValue = !allExpanded;
    setOpenQuestions((prev) => {
      const next = { ...prev };
      for (const faq of filteredFaqs) {
        next[faq.question] = nextValue;
      }
      return next;
    });
  };

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 space-y-8">
      <div className="text-center space-y-2">
        <span className="font-mono text-xs font-bold uppercase tracking-widest text-amber-800">
          Perguntas Frequentes
        </span>
        <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-stone-100">
          Tire suas dúvidas antes de começar
        </h2>
      </div>

      {/* Filtros por categoria + Expandir/Recolher todas */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div
          role="group"
          aria-label="Filtrar dúvidas por assunto"
          className="flex flex-wrap gap-1.5"
        >
          {LANDING_FAQ_CATEGORIES.map((cat) => {
            const active = selectedCategory === cat.id;
            return (
              <button
                key={cat.id}
                type="button"
                aria-pressed={active}
                onClick={() => setSelectedCategory(cat.id)}
                className={`rounded-xl border px-3 py-1.5 text-xs font-bold transition-all cursor-pointer ${
                  active
                    ? 'border-amber-500 bg-amber-500 text-stone-950 shadow-sm'
                    : 'border-stone-800 bg-stone-900 text-stone-300 hover:border-amber-500/60'
                }`}
              >
                {cat.label}
              </button>
            );
          })}
        </div>

        <button
          type="button"
          onClick={toggleAllFaqs}
          aria-expanded={allExpanded}
          className="self-start sm:self-auto rounded-xl border border-stone-800 bg-stone-900 px-3.5 py-1.5 text-xs font-semibold text-stone-200 hover:border-amber-500 cursor-pointer shrink-0"
        >
          {allExpanded ? 'Recolher todas' : 'Expandir todas'}
        </button>
      </div>

      <div className="landing-faq space-y-3">
        {filteredFaqs.map((faq) => {
          const isOpen = Boolean(openQuestions[faq.question]);
          return (
            <details
              key={faq.question}
              open={isOpen}
              onToggle={(e) => {
                const open = e.currentTarget.open;
                setOpenQuestions((prev) =>
                  prev[faq.question] === open
                    ? prev
                    : { ...prev, [faq.question]: open }
                );
              }}
              className="rounded-2xl border border-stone-800 bg-stone-900 overflow-hidden"
            >
              <summary className="flex items-center justify-between gap-4 px-5 py-4 text-sm font-bold text-stone-100 hover:bg-tint-50 transition-colors">
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
          );
        })}
      </div>

      {/* Faixa de segurança & conformidade */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2">
        {[
          'Banco em São Paulo',
          'Isolamento RLS por loja',
          'Proteção MFA & Antibot',
          'Conforme LGPD',
        ].map((sec) => (
          <div
            key={sec}
            className="flex items-center justify-center gap-1.5 rounded-xl border border-stone-800 bg-stone-900 px-3 py-2.5 text-[11px] font-semibold text-stone-300"
          >
            <ShieldCheck
              className="h-3.5 w-3.5 shrink-0 text-emerald-700"
              weight="fill"
            />
            <span>{sec}</span>
          </div>
        ))}
      </div>
    </div>
  );
};
