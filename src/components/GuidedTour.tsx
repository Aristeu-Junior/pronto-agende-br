import React, { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';

export interface TourStep {
  /** Valor do atributo data-tour do elemento destacado. Sem alvo = passo centralizado. */
  target?: string;
  title: string;
  body: string;
  /** Roda ao entrar no passo (ex.: trocar de aba) antes de procurar o alvo. */
  onEnter?: () => void;
}

interface GuidedTourProps {
  steps: TourStep[];
  /** completed = true quando chegou ao fim; false quando pulou. */
  onClose: (completed: boolean) => void;
}

const PAD = 6;
const MARGIN = 12;
const GAP = 14;

interface Rect {
  top: number;
  left: number;
  width: number;
  height: number;
}

function findTarget(name: string): HTMLElement | null {
  const all = Array.from(document.querySelectorAll<HTMLElement>(`[data-tour="${name}"]`));
  return (
    all.find((el) => {
      const r = el.getBoundingClientRect();
      return r.width > 0 && r.height > 0;
    }) ?? null
  );
}

const PANEL = 'fixed bg-black/55 backdrop-blur-[3px] transition-all duration-300 ease-out';

/** Tutorial guiado: escurece e desfoca a tela e deixa só o alvo do passo em destaque. */
export const GuidedTour: React.FC<GuidedTourProps> = ({ steps, onClose }) => {
  const [index, setIndex] = useState(0);
  const [rect, setRect] = useState<Rect | null>(null);
  const [popPos, setPopPos] = useState<{ left: number; top: number } | null>(null);
  const [viewport, setViewport] = useState({ w: window.innerWidth, h: window.innerHeight });
  const popRef = useRef<HTMLDivElement>(null);
  const nextRef = useRef<HTMLButtonElement>(null);
  const stepsRef = useRef(steps);
  stepsRef.current = steps;
  const step = steps[index];
  const isLast = index === steps.length - 1;

  const measure = useCallback(() => {
    const s = stepsRef.current[index];
    setViewport({ w: window.innerWidth, h: window.innerHeight });
    if (!s?.target) {
      setRect(null);
      return;
    }
    const el = findTarget(s.target);
    if (!el) {
      setRect(null);
      return;
    }
    const r = el.getBoundingClientRect();
    setRect({ top: r.top - PAD, left: r.left - PAD, width: r.width + PAD * 2, height: r.height + PAD * 2 });
  }, [index]);

  // Entra no passo: troca de aba se preciso, espera o alvo aparecer, rola até ele e mede.
  useEffect(() => {
    const s = stepsRef.current[index];
    s?.onEnter?.();
    let cancelled = false;
    let tries = 0;
    const settle = () => {
      if (cancelled) return;
      if (!s?.target) {
        measure();
        return;
      }
      const el = findTarget(s.target);
      if (!el) {
        if (tries++ < 30) requestAnimationFrame(settle);
        else measure();
        return;
      }
      el.scrollIntoView({ block: 'center', inline: 'nearest' });
      requestAnimationFrame(() => requestAnimationFrame(measure));
    };
    requestAnimationFrame(settle);
    return () => {
      cancelled = true;
    };
  }, [index, measure]);

  useEffect(() => {
    let raf = 0;
    const onChange = () => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(measure);
    };
    window.addEventListener('resize', onChange);
    window.addEventListener('scroll', onChange, true);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener('resize', onChange);
      window.removeEventListener('scroll', onChange, true);
    };
  }, [measure]);

  // Posiciona o balão perto do alvo, sem sair da tela.
  useLayoutEffect(() => {
    const pop = popRef.current;
    if (!pop) return;
    const w = pop.offsetWidth;
    const h = pop.offsetHeight;
    if (!rect) {
      setPopPos({ left: (viewport.w - w) / 2, top: Math.max(MARGIN, (viewport.h - h) / 2) });
      return;
    }
    let left = rect.left + rect.width / 2 - w / 2;
    left = Math.max(MARGIN, Math.min(left, viewport.w - w - MARGIN));
    const below = rect.top + rect.height + GAP;
    const above = rect.top - GAP - h;
    let top: number;
    if (below + h <= viewport.h - MARGIN) top = below;
    else if (above >= MARGIN) top = above;
    else top = Math.max(MARGIN, viewport.h - h - MARGIN);
    setPopPos({ left, top });
  }, [rect, viewport, index]);

  useEffect(() => {
    nextRef.current?.focus({ preventScroll: true });
  }, [index]);

  const next = useCallback(() => {
    if (index >= stepsRef.current.length - 1) onClose(true);
    else setIndex((i) => i + 1);
  }, [index, onClose]);
  const back = useCallback(() => setIndex((i) => Math.max(0, i - 1)), []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        onClose(false);
      } else if (e.key === 'ArrowRight') {
        e.preventDefault();
        next();
      } else if (e.key === 'ArrowLeft') {
        e.preventDefault();
        back();
      } else if (e.key === 'Tab') {
        const btns = popRef.current?.querySelectorAll<HTMLElement>('button');
        if (!btns || btns.length === 0) return;
        const first = btns[0];
        const last = btns[btns.length - 1];
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [next, back, onClose]);

  const popWidth = Math.min(360, viewport.w - MARGIN * 2);

  return (
    <div className="fixed inset-0 z-[100]" role="presentation">
      {rect ? (
        <>
          <div className={PANEL} style={{ top: 0, left: 0, right: 0, height: Math.max(0, rect.top) }} />
          <div className={PANEL} style={{ top: rect.top + rect.height, left: 0, right: 0, bottom: 0 }} />
          <div className={PANEL} style={{ top: rect.top, left: 0, width: Math.max(0, rect.left), height: rect.height }} />
          <div
            className={PANEL}
            style={{ top: rect.top, left: rect.left + rect.width, right: 0, height: rect.height }}
          />
          {/* Contorno do alvo; também impede cliques nele durante o tutorial */}
          <div
            className="fixed rounded-md border-2 border-amber-500 shadow-[0_0_0_4px_rgba(250,65,0,0.25)] transition-all duration-300 ease-out"
            style={{ top: rect.top, left: rect.left, width: rect.width, height: rect.height }}
          />
        </>
      ) : (
        <div className="fixed inset-0 bg-black/55 backdrop-blur-[3px]" />
      )}

      <div
        ref={popRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="tour-title"
        aria-describedby="tour-body"
        style={{
          position: 'fixed',
          left: popPos?.left ?? -9999,
          top: popPos?.top ?? -9999,
          width: popWidth,
          maxHeight: viewport.h - MARGIN * 2,
          overflowY: 'auto',
        }}
        className="rounded-2xl border border-stone-700 bg-stone-900 p-4 shadow-2xl"
      >
        <p className="text-[11px] font-semibold uppercase tracking-wide text-amber-800">
          Passo {index + 1} de {steps.length}
        </p>
        <h2 id="tour-title" className="mt-1 text-base font-bold text-stone-100">
          {step.title}
        </h2>
        <p id="tour-body" className="mt-1.5 text-sm leading-relaxed text-stone-300">
          {step.body}
        </p>

        <div className="mt-3 flex items-center gap-1.5" aria-hidden="true">
          {steps.map((_, i) => (
            <span
              key={i}
              className={`h-1.5 rounded-full transition-all ${i === index ? 'w-5 bg-amber-500' : 'w-1.5 bg-stone-700'}`}
            />
          ))}
        </div>

        <div className="mt-4 flex items-center justify-between gap-2">
          <button
            type="button"
            onClick={() => onClose(false)}
            className="rounded-lg px-2 py-2 text-xs font-semibold text-stone-400 hover:text-stone-100 cursor-pointer"
          >
            Pular tutorial
          </button>
          <div className="flex items-center gap-2">
            {index > 0 && (
              <button
                type="button"
                onClick={back}
                className="rounded-lg border border-stone-800 px-3.5 py-2 text-xs font-semibold text-stone-100 cursor-pointer"
              >
                Voltar
              </button>
            )}
            <button
              ref={nextRef}
              type="button"
              onClick={next}
              className="rounded-lg bg-amber-500 px-4 py-2 text-xs font-bold text-white hover:bg-amber-600 cursor-pointer"
            >
              {isLast ? 'Concluir' : 'Próximo'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default GuidedTour;
