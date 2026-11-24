import React, { useEffect, useRef, useState } from 'react';
import {
  ArrowRight,
  ArrowUp,
  CalendarCheck,
  CurrencyCircleDollar,
  LinkSimple,
  List,
  Scissors,
  SignIn,
  SquaresFour,
  UserPlus,
  WhatsappLogo,
  X,
} from '@phosphor-icons/react';
import ThemeToggle from './ThemeToggle';
import { LandingPreloader } from './LandingPreloader';
import { LandingDevices } from './LandingDevices';
import { LandingFaqSection, LandingPricingSection } from './LandingPricingAndFaq';
import { buildSalesWhatsAppUrl } from '../config/landing';
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
  const [showBackToTop, setShowBackToTop] = useState(false);

  const plansReveal = useRevealOnScroll<HTMLElement>();
  const faqReveal = useRevealOnScroll<HTMLElement>();

  // Atualiza header compactado, botão de voltar ao topo + fallback para barra de progresso
  useEffect(() => {
    const onScroll = () => {
      const y = window.scrollY;
      setScrolled(y > 16);
      setShowBackToTop(y > 600);
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
      <a
        href="#conteudo-principal"
        onClick={(e) => {
          e.preventDefault();
          const mainEl = document.getElementById('conteudo-principal');
          mainEl?.focus();
          mainEl?.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }}
        className="sr-only focus:not-sr-only focus:fixed focus:top-3 focus:left-3 focus:z-[70] focus:rounded-xl focus:bg-amber-500 focus:px-4 focus:py-2 focus:text-xs focus:font-bold focus:text-stone-950 focus:shadow-lg"
      >
        Pular para o conteúdo
      </a>

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
      <main id="conteudo-principal" tabIndex={-1} className="flex-1">
        {/* 1. HERO */}
        <section className="relative overflow-hidden">
          <div className="max-w-5xl mx-auto px-4 sm:px-6 pt-14 sm:pt-20 text-center space-y-6">
            <h1 className="hero-rise text-4xl sm:text-5xl lg:text-6xl font-bold tracking-tight text-stone-100 leading-[1.08]">
              Agenda cheia.{' '}
              <span className="text-amber-500">Caixa no controle.</span>
            </h1>
            <p className="hero-rise hero-rise-delay-1 mx-auto max-w-xl text-sm sm:text-base text-stone-300">
              Link de reserva 24h, lembrete no WhatsApp e comissão da equipe. Em um só lugar.
            </p>
            <div className="hero-rise hero-rise-delay-2 flex flex-col sm:flex-row items-stretch sm:items-center justify-center gap-3">
              <a
                href="#/cadastro"
                className="inline-flex items-center justify-center gap-2 rounded-2xl bg-amber-500 hover:bg-amber-600 px-6 py-3.5 text-sm font-bold text-stone-950 shadow-lg shadow-amber-500/20"
              >
                <span>Criar conta</span>
                <ArrowRight className="h-4 w-4" weight="bold" />
              </a>
              <a
                href={salesWhatsappHref}
                target={isWhatsappExternal ? '_blank' : undefined}
                rel={isWhatsappExternal ? 'noopener noreferrer' : undefined}
                className="inline-flex items-center justify-center gap-2 rounded-2xl border border-stone-800 bg-stone-900 hover:border-emerald-600 px-6 py-3.5 text-sm font-bold text-stone-100"
              >
                <WhatsappLogo className="h-5 w-5 text-emerald-700" weight="bold" />
                <span>WhatsApp</span>
              </a>
            </div>
          </div>

          <div className="hero-rise hero-rise-delay-3 max-w-6xl mx-auto px-4 sm:px-6">
            <LandingDevices />
          </div>
        </section>

        {/* 2. TRÊS PILARES (ícone + 2 palavras) */}
        <section className="max-w-4xl mx-auto px-4 sm:px-6 pb-16 sm:pb-24">
          <ul className="grid grid-cols-3 gap-3 sm:gap-6">
            {[
              { Icon: LinkSimple, label: 'Link 24h' },
              { Icon: CalendarCheck, label: 'Agenda' },
              { Icon: CurrencyCircleDollar, label: 'Caixa' },
            ].map(({ Icon, label }) => (
              <li
                key={label}
                className="flex flex-col items-center gap-3 rounded-3xl border border-stone-800 bg-stone-900 py-6 sm:py-8"
              >
                <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-amber-500 text-stone-950">
                  <Icon className="h-6 w-6" weight="bold" />
                </span>
                <span className="text-xs sm:text-sm font-bold text-stone-100">{label}</span>
              </li>
            ))}
          </ul>
        </section>

        {/* 5. SEÇÃO #PLANOS — CONTRATAÇÃO INTERATIVA */}
        <section
          id="planos"
          ref={plansReveal.ref}
          className={`landing-section-defer reveal-on-scroll ${
            plansReveal.visible ? 'is-visible' : ''
          } max-w-7xl mx-auto px-4 sm:px-6 py-14 sm:py-20`}
        >
          <LandingPricingSection
            isAuthenticated={isAuthenticated}
            loginHref={loginHref}
          />
        </section>

        {/* 6. SEÇÃO #DUVIDAS — FAQ CATEGORIZADO + ACORDEÃO NATIVO */}
        <section
          id="duvidas"
          ref={faqReveal.ref}
          className={`landing-section-defer reveal-on-scroll ${
            faqReveal.visible ? 'is-visible' : ''
          } border-t border-stone-800/80 bg-tint-50 py-14 sm:py-20`}
        >
          <LandingFaqSection />
        </section>

      </main>

      {/* RODAPÉ INSTITUCIONAL EM 3 COLUNAS */}
      <footer className="border-t border-stone-800 bg-tint-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-10 grid grid-cols-1 md:grid-cols-3 gap-8 text-xs text-stone-400">
          {/* Coluna 1: Marca */}
          <div className="space-y-2.5">
            <div className="flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-amber-500 text-stone-950">
                <Scissors className="h-4 w-4" weight="bold" />
              </div>
              <span className="text-sm font-bold text-stone-100">
                {COMPANY.productName} BR
              </span>
            </div>
            <p className="leading-relaxed text-stone-300 max-w-xs">
              Plataforma completa de agenda, link próprio 24h, lembretes no WhatsApp
              e caixa para barbearias, salões e clínicas.
            </p>
            <p className="font-mono text-[11px] text-stone-400">
              {COMPANY.city}
            </p>
          </div>

          {/* Coluna 2: Navegação e Acesso */}
          <div className="space-y-2.5">
            <p className="font-mono text-[11px] font-bold uppercase tracking-wider text-stone-200">
              Sistema e Acesso
            </p>
            <ul className="grid grid-cols-2 gap-2 font-semibold">
              <li>
                <button
                  type="button"
                  onClick={() => scrollToSection('planos')}
                  className="hover:text-amber-800 cursor-pointer"
                >
                  Planos e Preços
                </button>
              </li>
              <li>
                <button
                  type="button"
                  onClick={() => scrollToSection('duvidas')}
                  className="hover:text-amber-800 cursor-pointer"
                >
                  Dúvidas
                </button>
              </li>
              <li>
                <a href="#/entrar" className="text-amber-800 hover:underline">
                  Entrar como Barbeiro
                </a>
              </li>
              <li>
                <a href="#/cadastro" className="hover:text-amber-800">
                  Criar Conta
                </a>
              </li>
            </ul>
          </div>

          {/* Coluna 3: Contratação e Legal */}
          <div className="space-y-2.5">
            <p className="font-mono text-[11px] font-bold uppercase tracking-wider text-stone-200">
              Contratação e Transparência
            </p>
            <div className="flex flex-col items-start gap-2 font-semibold">
              <a
                href={salesWhatsappHref}
                target={isWhatsappExternal ? '_blank' : undefined}
                rel={isWhatsappExternal ? 'noopener noreferrer' : undefined}
                className="inline-flex items-center gap-1.5 text-emerald-700 hover:underline"
              >
                <WhatsappLogo className="h-4 w-4" weight="bold" />
                <span>Contratar pelo WhatsApp</span>
              </a>
              <a href="#/termos" className="hover:text-amber-800">
                Termos de Uso
              </a>
              <a href="#/privacidade" className="hover:text-amber-800">
                Política de Privacidade (LGPD)
              </a>
            </div>
          </div>
        </div>
      </footer>

      {/* Botão flutuante discreto: Voltar ao topo */}
      {showBackToTop && (
        <button
          type="button"
          onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
          aria-label="Voltar ao topo"
          title="Voltar ao topo"
          data-compact
          className="fixed bottom-5 right-4 z-40 inline-flex h-11 w-11 items-center justify-center rounded-full border border-stone-800 bg-stone-900/95 text-stone-100 shadow-lg backdrop-blur-sm hover:border-amber-500 hover:bg-amber-500 hover:text-stone-950 transition-all cursor-pointer"
        >
          <ArrowUp className="h-5 w-5" weight="bold" />
        </button>
      )}
    </div>
  );
};

export default LandingPage;
