import React, { useCallback, useEffect, useId, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Question } from '@phosphor-icons/react';

interface HelpTipProps {
  /** Explicação curta do que a área faz. */
  text: string;
  /** Nome da área, usado pelo leitor de tela. */
  label?: string;
  className?: string;
}

const TIP_WIDTH = 288;
const GAP = 8;
const MARGIN = 12;

/** Bolinha "?" que explica uma área do sistema: abre no mouse (hover), no foco do teclado e no toque. */
export const HelpTip: React.FC<HelpTipProps> = ({ text, label, className = '' }) => {
  const id = useId();
  const btnRef = useRef<HTMLButtonElement>(null);
  const tipRef = useRef<HTMLDivElement>(null);
  const lastPointer = useRef<string>('mouse');
  const [open, setOpen] = useState(false);
  const [pos, setPos] = useState<{ left: number; top: number } | null>(null);

  const place = useCallback(() => {
    const btn = btnRef.current;
    if (!btn) return;
    const r = btn.getBoundingClientRect();
    const width = Math.min(TIP_WIDTH, window.innerWidth - MARGIN * 2);
    const height = tipRef.current?.offsetHeight ?? 80;
    let left = r.left + r.width / 2 - width / 2;
    left = Math.max(MARGIN, Math.min(left, window.innerWidth - width - MARGIN));
    let top = r.bottom + GAP;
    if (top + height > window.innerHeight - MARGIN) top = Math.max(MARGIN, r.top - GAP - height);
    setPos({ left, top });
  }, []);

  useEffect(() => {
    if (!open) return;
    place();
    const raf = requestAnimationFrame(place);
    const close = () => setOpen(false);
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    const onDown = (e: PointerEvent) => {
      const t = e.target as Node;
      if (!btnRef.current?.contains(t) && !tipRef.current?.contains(t)) setOpen(false);
    };
    window.addEventListener('scroll', close, true);
    window.addEventListener('resize', close);
    document.addEventListener('keydown', onKey);
    document.addEventListener('pointerdown', onDown);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener('scroll', close, true);
      window.removeEventListener('resize', close);
      document.removeEventListener('keydown', onKey);
      document.removeEventListener('pointerdown', onDown);
    };
  }, [open, place]);

  return (
    <>
      <button
        ref={btnRef}
        type="button"
        data-compact
        aria-label={label ? `Ajuda: ${label}` : 'Ajuda'}
        aria-describedby={open ? id : undefined}
        aria-expanded={open}
        onPointerEnter={(e) => {
          lastPointer.current = e.pointerType;
          if (e.pointerType === 'mouse') setOpen(true);
        }}
        onPointerLeave={(e) => {
          if (e.pointerType === 'mouse') setOpen(false);
        }}
        onPointerDown={(e) => {
          lastPointer.current = e.pointerType;
        }}
        onFocus={() => setOpen(true)}
        onBlur={() => setOpen(false)}
        onClick={(e) => {
          e.stopPropagation();
          setOpen((o) => (lastPointer.current === 'mouse' ? true : !o));
        }}
        className={`group/tip relative inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full border border-amber-500/40 bg-gradient-to-b from-tint-50 to-amber-950 text-amber-700 shadow-[0_1px_2px_rgba(0,0,0,0.12),inset_0_1px_0_rgba(255,255,255,0.35)] transition-all duration-200 hover:scale-110 hover:border-amber-500 hover:from-amber-500 hover:to-amber-600 hover:text-white hover:shadow-[0_0_0_4px_rgba(250,65,0,0.16)] focus-visible:scale-110 focus-visible:from-amber-500 focus-visible:to-amber-600 focus-visible:text-white aria-expanded:from-amber-500 aria-expanded:to-amber-600 aria-expanded:text-white aria-expanded:shadow-[0_0_0_4px_rgba(250,65,0,0.16)] cursor-pointer ${className}`}
      >
        {/* área de toque maior que a bolinha, sem aumentar o visual */}
        <span aria-hidden="true" className="absolute -inset-3" />
        <Question className="h-3.5 w-3.5" weight="bold" aria-hidden="true" />
      </button>
      {open &&
        createPortal(
          <div
            ref={tipRef}
            id={id}
            role="tooltip"
            style={{
              position: 'fixed',
              left: pos?.left ?? -9999,
              top: pos?.top ?? -9999,
              width: Math.min(TIP_WIDTH, window.innerWidth - MARGIN * 2),
              zIndex: 90,
            }}
            className="tour-fade overflow-hidden rounded-xl border border-stone-700 border-l-[3px] border-l-amber-500 bg-stone-900 px-3.5 py-3 text-xs leading-relaxed text-stone-300 shadow-xl"
          >
            {label && <p className="mb-1 text-[11px] font-bold uppercase tracking-wide text-amber-800">{label}</p>}
            {text}
          </div>,
          document.body
        )}
    </>
  );
};

export default HelpTip;
