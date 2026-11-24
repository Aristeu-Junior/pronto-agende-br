import React, { useEffect, useRef, useState } from 'react';
import {
  ArrowRight,
  CaretDown,
  Check,
  CheckCircle,
  Clock,
  List,
  RocketLaunch,
  Scissors,
  ShieldCheck,
  SignIn,
  SquaresFour,
  UserPlus,
  WhatsappLogo,
  X,
} from '@phosphor-icons/react';
import ThemeToggle from './ThemeToggle';
import { LandingPreloader } from './LandingPreloader';
import { LandingHeroPreview } from './LandingHeroPreview';
import { LandingCenterStage } from './LandingCenterStage';
import { SpotlightCard } from './SpotlightCard';
import {
  buildSalesWhatsAppUrl,
  LANDING_FAQS,
  LANDING_PLANS,
  LANDING_STEPS,
} from '../config/landing';
import { COMPANY } from '../config/legal';

function useRevealOnScroll<T extends HTMLElement>() {
  const ref = useRef<T | null>(null);
  const [visible, setVisible] = useState<boolean>(() => {
    try {
      return (
        window.matchMedia('(prefers-reduced-motion: reduce)').matches ||
        typeof IntersectionObserver === 'undefined'
      );
    } catch {
      return true;
    }
  });

  useEffect(() => {
    if (visible) return;
    const node = ref.current;
    if (!node || typeof IntersectionObserver === 'undefined') {
      setVisible(true);
      return;
    }
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) {
          setVisible(true);
          observer.disconnect();
        }
      },
      { threshold: 0.08, rootMargin: '0px 0px -32px 0px' }
    );
    observer.observe(node);
    return () => observer.disconnect();
  }, [visible]);

  return { ref, visible };
}

export const LandingPage: React.FC<{ isAuthenticated?: boolean }> = ({
  isAuthenticated = false,
}) => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  const statsReveal = useRevealOnScroll<HTMLElement>();
  const featuresReveal = useRevealOnScroll<HTMLElement>();
  const stepsReveal = useRevealOnScroll<HTMLElement>();
  const plansReveal = useRevealOnScroll<HTMLElement>();
  const faqReveal = useRevealOnScroll<HTMLElement>();

  // Atualiza header compactado + fallback para barra de progresso de scroll
  useEffect(() => {
    const onScroll = () => {
      const y = window.scrollY;
      setScrolled(y > 16);
      const doc = document.documentElement;
      const maxScroll = Math.max(1, doc.scrollHeight - doc.clientHeight);
      const progress = Math.min(1, Math.max(0, y / maxScroll));
      doc.style.setProperty('--scroll-progress', progress.toFixed(4));
    };
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  const scrollToSection = (sectionId: string) => {
    setMobileMenuOpen(false);
    const el = document.getElementById(sectionId);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  const loginHref = isAuthenticated ? '#/app' : '#/entrar';
  const loginLabel = isAuthenticated ? 'Abrir meu painel' : 'Entrar';
  const salesWhatsappHref = buildSalesWhatsAppUrl();
  const isWhatsappExternal = salesWhatsappHref.startsWith('http');

  return (
    <div className="min-h-[100dvh] bg-stone-950 text-stone-100 flex flex-col">
      {/* Barra de progresso de leitura no topo */}
      <div className="landing-scroll-progress" aria-hidden="true" />

      {/* Preloader coreografado */}
      <LandingPreloader />

      {/* Header fixo com login do barbeiro no canto superior direito */}
      <header
        className={`sticky top-0 z-40 transition-all border-b ${
          scrolled
            ? 'bg-stone-950/92 backdrop-blur-md border-stone-800 shadow-sm'
            : 'bg-stone-950/80 backdrop-blur-sm border-stone-800/60'
        }`}
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-3">
          {/* Identidade da marca */}
          <a
            href="#/"
            onClick={(e) => {
              e.preventDefault();
              window.scrollTo({ top: 0, behavior: 'smooth' });
              if (window.location.hash !== '#/' && window.location.hash !== '') {
                window.location.hash = '#/';
              }
            }}
            className="flex items-center gap-2.5 min-w-0"
          >
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-amber-500 text-stone-950 shadow-md shadow-amber-500/20">
              <Scissors className="h-5 w-5" weight="bold" />
            </div>
            <div className="flex items-center gap-1.5 min-w-0">
              <span className="truncate font-bold tracking-tight text-base text-stone-100">
                ProntoAgende
              </span>
              <span className="rounded bg-amber-950 px-1.5 py-0.5 font-mono text-[10px] font-bold uppercase tracking-widest text-amber-800 border border-stone-800">
                BR
              </span>
            </div>
          </a>

          {/* Navegação desktop */}
          <nav
            aria-label="Seções do site"
            className="hidden lg:flex items-center gap-6 text-xs font-semibold text-stone-300"
          >
            <button
              type="button"
              onClick={() => scrollToSection('recursos')}
              className="hover:text-amber-800 cursor-pointer"
            >
              Recursos
            </button>
            <button
              type="button"
              onClick={() => scrollToSection('como-funciona')}
              className="hover:text-amber-800 cursor-pointer"
            >
              Como funciona
            </button>
            <button
              type="button"
              onClick={() => scrollToSection('planos')}
              className="hover:text-amber-800 cursor-pointer"
            >
              Planos e Preços
            </button>
            <button
              type="button"
              onClick={() => scrollToSection('duvidas')}
              className="hover:text-amber-800 cursor-pointer"
            >
              Dúvidas
            </button>
          </nav>

          {/* Ações à direita: Tema + Contratar + Entrar (Canto Superior Direito) */}
          <div className="flex items-center gap-2 shrink-0">
            <ThemeToggle />

            <a
              href="#/cadastro"
              className="hidden sm:inline-flex items-center gap-1.5 rounded-xl border border-stone-800 bg-tint-50 px-3.5 py-2 text-xs font-bold text-stone-100 hover:border-amber-500"
            >
              <UserPlus className="h-4 w-4 text-amber-500" weight="bold" />
              <span>Contratar</span>
            </a>

            <a
              href={loginHref}
              className="inline-flex items-center gap-1.5 rounded-xl bg-amber-500 hover:bg-amber-600 px-3.5 sm:px-4 py-2 text-xs font-bold text-stone-950 shadow-md shadow-amber-500/20"
            >
              {isAuthenticated ? (
                <SquaresFour className="h-4 w-4" weight="bold" />
              ) : (
                <SignIn className="h-4 w-4" weight="bold" />
              )}
              <span>{loginLabel}</span>
            </a>

            <button
              type="button"
              onClick={() => setMobileMenuOpen((prev) => !prev)}
              aria-expanded={mobileMenuOpen}
              aria-controls="landing-mobile-drawer"
              aria-label={mobileMenuOpen ? 'Fechar menu' : 'Abrir menu'}
              className="lg:hidden inline-flex h-10 w-10 items-center justify-center rounded-xl border border-stone-800 bg-stone-900 text-stone-200 hover:border-amber-500 cursor-pointer"
            >
              {mobileMenuOpen ? (
                <X className="h-5 w-5" weight="bold" />
              ) : (
                <List className="h-5 w-5" weight="bold" />
              )}
            </button>
          </div>
        </div>

        {/* Drawer Mobile */}
        {mobileMenuOpen && (
          <div
            id="landing-mobile-drawer"
            className="lg:hidden border-t border-stone-800 bg-stone-950 px-4 py-4 space-y-2"
          >
            <div className="grid grid-cols-2 gap-2">
              {[
                { id: 'recursos', label: 'Recursos' },
                { id: 'como-funciona', label: 'Como funciona' },
                { id: 'planos', label: 'Planos e Preços' },
                { id: 'duvidas', label: 'Dúvidas' },
              ].map((link) => (
                <button
                  key={link.id}
                  type="button"
                  onClick={() => scrollToSection(link.id)}
                  className="rounded-xl border border-stone-800 bg-tint-50 px-3 py-2.5 text-left text-xs font-semibold text-stone-200 cursor-pointer"
                >
                  {link.label}
                </button>
              ))}
            </div>
            <div className="pt-2 grid grid-cols-1 gap-2">
              <a
                href="#/cadastro"
                onClick={() => setMobileMenuOpen(false)}
                className="inline-flex items-center justify-center gap-2 rounded-xl border border-stone-800 bg-stone-900 px-4 py-2.5 text-xs font-bold text-stone-100"
              >
                <UserPlus className="h-4 w-4 text-amber-500" weight="bold" />
                <span>Criar conta e Contratar</span>
              </a>
            </div>
          </div>
        )}
      </header>

      {/* Conteúdo Principal */}
      <main className="flex-1">
        {/* 1. HERO SECTION */}
        <section className="relative overflow-hidden border-b border-stone-800/80">
          <div
            aria-hidden="true"
            className="pointer-events-none absolute -top-24 right-0 h-80 w-80 rounded-full bg-amber-500/10 blur-3xl"
          />
          <div className="max-w-7xl mx-auto px-4 sm:px-6 py-12 sm:py-16 lg:py-20 grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-12 items-center">
            {/* Texto e CTAs (6 cols) */}
            <div className="lg:col-span-6 space-y-6">
              <div className="hero-rise inline-flex items-center gap-2 rounded-full border border-stone-800 bg-amber-950 px-3.5 py-1.5 text-xs font-bold text-amber-800">
                <RocketLaunch className="h-3.5 w-3.5" weight="bold" />
                <span>Feito para barbearias, salões e clínicas no Brasil</span>
              </div>

              <h1 className="hero-rise hero-rise-delay-1 text-3xl sm:text-4xl lg:text-5xl font-bold tracking-tight text-stone-100 leading-[1.12]">
                Sua agenda cheia, link próprio 24h e{' '}
                <span className="text-amber-500">caixa no controle</span> direto do
                celular.
              </h1>

              <p className="hero-rise hero-rise-delay-2 text-sm sm:text-base leading-relaxed text-stone-300 max-w-xl">
                O <strong>ProntoAgende BR</strong> reúne em um só lugar o link de
                agendamento sem baixar aplicativo, agenda sem conflitos de horário,
                lembrete no WhatsApp, sinal via Pix anti-falta e cálculo de
                comissão da equipe.
              </p>

              <div className="hero-rise hero-rise-delay-3 flex flex-col sm:flex-row items-stretch sm:items-center gap-3 pt-1">
                <a
                  href="#/cadastro"
                  className="inline-flex items-center justify-center gap-2 rounded-2xl bg-amber-500 hover:bg-amber-600 px-6 py-3.5 text-sm font-bold text-stone-950 shadow-lg shadow-amber-500/20"
                >
                  <span>Criar conta da barbearia</span>
                  <ArrowRight className="h-4 w-4" weight="bold" />
                </a>

                <a
                  href={salesWhatsappHref}
                  target={isWhatsappExternal ? '_blank' : undefined}
                  rel={isWhatsappExternal ? 'noopener noreferrer' : undefined}
                  className="inline-flex items-center justify-center gap-2 rounded-2xl border border-stone-800 bg-stone-900 hover:border-emerald-600 px-6 py-3.5 text-sm font-bold text-stone-100"
                >
                  <WhatsappLogo
                    className="h-5 w-5 text-emerald-700"
                    weight="bold"
                  />
                  <span>Contratar pelo WhatsApp</span>
                </a>
              </div>

              {/* Selos de confiança */}
              <div className="hero-rise hero-rise-delay-3 grid grid-cols-1 sm:grid-cols-3 gap-2.5 pt-2">
                {[
                  '0% comissão por cliente',
                  'Link 24h sem baixar app',
                  'Pronto em 2 minutos',
                ].map((badge) => (
                  <div
                    key={badge}
                    className="inline-flex items-center gap-2 rounded-xl border border-stone-800 bg-tint-50 px-3 py-2 text-xs font-semibold text-stone-200"
                  >
                    <CheckCircle
                      className="h-4 w-4 shrink-0 text-emerald-700"
                      weight="fill"
                    />
                    <span>{badge}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Preview vivo animado (6 cols) */}
            <div className="lg:col-span-6 hero-rise hero-rise-delay-2">
              <LandingHeroPreview />
            </div>
          </div>
        </section>

        {/* 2. FAIXA DE MÉTRICAS E DIFERENCIAIS */}
        <section
          ref={statsReveal.ref}
          className={`reveal-on-scroll ${
            statsReveal.visible ? 'is-visible' : ''
          } border-b border-stone-800/80 bg-tint-50`}
        >
          <div className="max-w-7xl mx-auto px-4 sm:px-6 py-10 grid grid-cols-2 lg:grid-cols-4 gap-4">
            {[
              {
                value: '0%',
                label: 'Comissão sobre seus cortes',
                sub: 'O cliente agenda no seu link e o valor é 100% seu.',
              },
              {
                value: '20s',
                label: 'Para o cliente agendar',
                sub: 'Sem login, sem senha e direto do navegador do celular.',
              },
              {
                value: '100%',
                label: 'Mobile-first e leve',
                sub: 'Modo claro ou escuro e botões feitos para usar com uma mão.',
              },
              {
                value: '3 passos',
                label: 'Para fechar o caixa do dia',
                sub: 'Com rateio automático de taxa e comissão do barbeiro.',
              },
            ].map((item) => (
              <SpotlightCard
                key={item.label}
                className="rounded-2xl border border-stone-800 bg-stone-900 p-4 sm:p-5 space-y-1"
              >
                <div className="font-mono num-tabular text-2xl sm:text-3xl font-bold text-amber-800">
                  {item.value}
                </div>
                <h2 className="text-xs sm:text-sm font-bold text-stone-100">
                  {item.label}
                </h2>
                <p className="text-[11px] leading-relaxed text-stone-400">
                  {item.sub}
                </p>
              </SpotlightCard>
            ))}
          </div>
        </section>

        {/* 3. SEÇÃO #RECURSOS — CENTER STAGE INTERATIVO (COMPUTADOR E CELULAR) */}
        <section
          id="recursos"
          ref={featuresReveal.ref}
          className={`reveal-on-scroll ${
            featuresReveal.visible ? 'is-visible' : ''
          } max-w-7xl mx-auto px-4 sm:px-6 py-14 sm:py-20 space-y-8`}
        >
          <div className="max-w-2xl space-y-2">
            <span className="font-mono text-xs font-bold uppercase tracking-widest text-amber-800">
              Por dentro do ProntoAgende BR
            </span>
            <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-stone-100">
              Veja o sistema real funcionando no computador e no celular
            </h2>
            <p className="text-sm text-stone-300">
              Alterne entre <strong>Computador</strong> e <strong>Celular</strong>{' '}
              e clique em cada aba do painel para testar exatamente como você vai
              operar sua barbearia no dia a dia.
            </p>
          </div>

          <LandingCenterStage />
        </section>

        {/* 4. SEÇÃO #COMO-FUNCIONA — FASE 3 (FLUXO DO NEGÓCIO EM 3 PASSOS) */}
        <section
          id="como-funciona"
          ref={stepsReveal.ref}
          className={`reveal-on-scroll ${
            stepsReveal.visible ? 'is-visible' : ''
          } border-y border-stone-800/80 bg-tint-50 py-14 sm:py-20`}
        >
          <div className="max-w-7xl mx-auto px-4 sm:px-6 space-y-10">
            <div className="max-w-2xl space-y-2">
              <span className="font-mono text-xs font-bold uppercase tracking-widest text-amber-800">
                Sem burocracia
              </span>
              <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-stone-100">
                Do cadastro ao primeiro agendamento em 3 passos
              </h2>
              <p className="text-sm text-stone-300">
                Tudo pensado para rodar rápido desde o primeiro dia, sem precisar de
                manual técnico ou instalação no computador.
              </p>
            </div>

            <div className="relative grid grid-cols-1 md:grid-cols-3 gap-5">
              {LANDING_STEPS.map((step, index) => {
                const etaLabels = ['2 min', '10 seg', 'No dia a dia'];
                return (
                  <SpotlightCard
                    key={step.number}
                    className="rounded-3xl border border-stone-800 bg-stone-900 p-6 hover:border-amber-500/60 transition-colors"
                  >
                    <article className="space-y-3 h-full flex flex-col justify-between">
                      <div className="space-y-3">
                        <div className="flex items-center justify-between gap-2">
                          <span className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-amber-500 font-mono text-sm font-bold text-stone-950">
                            {step.number}
                          </span>
                          <span className="inline-flex items-center gap-1 rounded-full border border-stone-800 bg-tint-50 px-2.5 py-1 font-mono text-[11px] font-bold text-amber-800">
                            <Clock className="h-3.5 w-3.5" weight="bold" />
                            <span>{etaLabels[index] ?? 'Rápido'}</span>
                          </span>
                        </div>
                        <h3 className="text-base font-bold text-stone-100">
                          {step.title}
                        </h3>
                        <p className="text-xs sm:text-sm leading-relaxed text-stone-300">
                          {step.description}
                        </p>
                      </div>

                      <div className="pt-2 flex items-center gap-1.5 text-[11px] font-semibold text-stone-400">
                        <span>
                          {index < LANDING_STEPS.length - 1
                            ? `Próximo passo: 0${index + 2}`
                            : 'Pronto para atender'}
                        </span>
                        <ArrowRight className="h-3.5 w-3.5 text-amber-500" weight="bold" />
                      </div>
                    </article>
                  </SpotlightCard>
                );
              })}
            </div>
          </div>
        </section>

        {/* 5. SEÇÃO #PLANOS — CONTRATAÇÃO */}
        <section
          id="planos"
          ref={plansReveal.ref}
          className={`reveal-on-scroll ${
            plansReveal.visible ? 'is-visible' : ''
          } max-w-7xl mx-auto px-4 sm:px-6 py-14 sm:py-20 space-y-10`}
        >
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
            <div className="max-w-2xl space-y-2">
              <span className="font-mono text-xs font-bold uppercase tracking-widest text-amber-800">
                Planos &amp; Contratação
              </span>
              <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-stone-100">
                Escolha o plano ideal para o tamanho do seu negócio
              </h2>
              <p className="text-sm text-stone-300">
                Sem fidelidade, sem taxa escondida por agendamento e ativação no
                mesmo dia após o cadastro ou confirmação pelo WhatsApp.
              </p>
            </div>
            <a
              href={salesWhatsappHref}
              target={isWhatsappExternal ? '_blank' : undefined}
              rel={isWhatsappExternal ? 'noopener noreferrer' : undefined}
              className="inline-flex items-center gap-2 self-start md:self-auto rounded-xl border border-stone-800 bg-stone-900 px-4 py-2.5 text-xs font-bold text-stone-100 hover:border-emerald-600"
            >
              <WhatsappLogo className="h-4 w-4 text-emerald-700" weight="bold" />
              <span>Tirar dúvida comercial</span>
            </a>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-stretch">
            {LANDING_PLANS.map((plan) => {
              const isExternal = plan.ctaHref.startsWith('http');
              return (
                <div
                  key={plan.id}
                  className={`flex flex-col justify-between rounded-3xl p-6 sm:p-7 space-y-6 transition-all ${
                    plan.highlighted
                      ? 'border-2 border-amber-500 bg-stone-900 shadow-xl shadow-amber-500/10'
                      : 'border border-stone-800 bg-stone-900'
                  }`}
                >
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

                    <div className="flex items-baseline gap-1.5">
                      <span className="font-mono num-tabular text-3xl font-bold text-stone-100">
                        {plan.priceMonthly}
                      </span>
                      <span className="text-xs font-medium text-stone-400">
                        {plan.periodLabel}
                      </span>
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

                  <a
                    href={plan.ctaHref}
                    target={isExternal ? '_blank' : undefined}
                    rel={isExternal ? 'noopener noreferrer' : undefined}
                    className={`inline-flex items-center justify-center gap-2 rounded-2xl px-5 py-3 text-xs font-bold transition-all ${
                      plan.highlighted
                        ? 'bg-amber-500 hover:bg-amber-600 text-stone-950 shadow-md shadow-amber-500/20'
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
        </section>

        {/* 6. SEÇÃO #DUVIDAS — FAQ ACORDEÃO NATIVO + SEGURANÇA */}
        <section
          id="duvidas"
          ref={faqReveal.ref}
          className={`reveal-on-scroll ${
            faqReveal.visible ? 'is-visible' : ''
          } border-t border-stone-800/80 bg-tint-50 py-14 sm:py-20`}
        >
          <div className="max-w-4xl mx-auto px-4 sm:px-6 space-y-8">
            <div className="text-center space-y-2">
              <span className="font-mono text-xs font-bold uppercase tracking-widest text-amber-800">
                Perguntas Frequentes
              </span>
              <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-stone-100">
                Tire suas dúvidas antes de começar
              </h2>
            </div>

            <div className="landing-faq space-y-3">
              {LANDING_FAQS.map((faq) => (
                <details
                  key={faq.question}
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
              ))}
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
        </section>

        {/* 7. CTA FINAL */}
        <section className="max-w-7xl mx-auto px-4 sm:px-6 py-14">
          <div className="rounded-3xl border border-stone-800 bg-stone-900 p-7 sm:p-10 flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6">
            <div className="space-y-2 max-w-2xl">
              <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-stone-100">
                Pronto para profissionalizar sua agenda hoje?
              </h2>
              <p className="text-sm text-stone-300">
                Crie o acesso da sua barbearia agora mesmo ou chame nossa equipe no
                WhatsApp para ativar o sistema com sua tabela de cortes.
              </p>
            </div>
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 shrink-0 w-full lg:w-auto">
              <a
                href="#/cadastro"
                className="inline-flex items-center justify-center gap-2 rounded-2xl bg-amber-500 hover:bg-amber-600 px-6 py-3.5 text-sm font-bold text-stone-950"
              >
                <span>Quero contratar agora</span>
                <ArrowRight className="h-4 w-4" weight="bold" />
              </a>
              <a
                href={loginHref}
                className="inline-flex items-center justify-center gap-2 rounded-2xl border border-stone-800 bg-tint-50 hover:border-amber-500 px-6 py-3.5 text-sm font-bold text-stone-100"
              >
                <SignIn className="h-4 w-4 text-amber-500" weight="bold" />
                <span>{isAuthenticated ? 'Abrir meu painel' : 'Já sou cliente · Entrar'}</span>
              </a>
            </div>
          </div>
        </section>
      </main>

      {/* RODAPÉ */}
      <footer className="border-t border-stone-800 bg-tint-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-stone-400">
          <div className="flex items-center gap-2">
            <Scissors className="h-4 w-4 text-amber-500" weight="bold" />
            <span className="font-bold text-stone-200">{COMPANY.productName} BR</span>
            <span>· {COMPANY.city}</span>
          </div>

          <div className="flex flex-wrap items-center justify-center gap-4 font-semibold">
            <a href="#/entrar" className="hover:text-amber-800">
              Entrar como Barbeiro
            </a>
            <a href="#/cadastro" className="hover:text-amber-800">
              Criar Conta
            </a>
            <a href="#/termos" className="hover:text-amber-800">
              Termos de Uso
            </a>
            <a href="#/privacidade" className="hover:text-amber-800">
              Política de Privacidade
            </a>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default LandingPage;
