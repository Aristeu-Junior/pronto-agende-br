import React, { useEffect, useState } from 'react';
import { Scissors } from '@phosphor-icons/react';

const PRELOADER_STORAGE_KEY = 'pronto_agende_preloader_seen';

export const LandingPreloader: React.FC = () => {
  const [phase, setPhase] = useState<'visible' | 'exiting' | 'done'>(() => {
    try {
      const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
      if (reduced) return 'done';
      if (sessionStorage.getItem(PRELOADER_STORAGE_KEY) === '1') return 'done';
    } catch {
      return 'done';
    }
    return 'visible';
  });

  useEffect(() => {
    if (phase === 'done') return;

    try {
      sessionStorage.setItem(PRELOADER_STORAGE_KEY, '1');
    } catch {
      /* segue normalmente sem armazenamento */
    }

    const exitTimer = window.setTimeout(() => {
      setPhase('exiting');
    }, 900);

    const doneTimer = window.setTimeout(() => {
      setPhase('done');
    }, 1260);

    return () => {
      window.clearTimeout(exitTimer);
      window.clearTimeout(doneTimer);
    };
  }, [phase]);

  if (phase === 'done') return null;

  return (
    <div
      aria-hidden="true"
      className={`fixed inset-0 z-50 flex flex-col items-center justify-center bg-stone-950 px-6 ${
        phase === 'exiting' ? 'landing-preloader-exit pointer-events-none' : ''
      }`}
    >
      <div className="flex flex-col items-center gap-5 text-center">
        <div className="relative flex h-20 w-20 items-center justify-center">
          <svg
            viewBox="0 0 68 68"
            className="absolute inset-0 h-full w-full -rotate-90"
            fill="none"
          >
            <circle
              cx="34"
              cy="34"
              r="30"
              stroke="currentColor"
              strokeWidth="2.5"
              className="text-stone-800"
            />
            <circle
              cx="34"
              cy="34"
              r="30"
              stroke="currentColor"
              strokeWidth="3"
              strokeLinecap="round"
              className="landing-preloader-ring text-amber-500"
            />
          </svg>

          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-amber-500 text-stone-950 shadow-lg shadow-amber-500/20">
            <Scissors className="h-6 w-6" weight="bold" />
          </div>
        </div>

        <div className="space-y-1">
          <p className="text-base font-bold tracking-tight text-stone-100">
            ProntoAgende BR
          </p>
          <p className="font-mono text-[11px] uppercase tracking-[0.18em] text-stone-400">
            Agenda, Link 24h &amp; Caixa
          </p>
        </div>

        <div className="h-1 w-44 overflow-hidden rounded-full bg-stone-800">
          <div className="landing-preloader-bar h-full w-full rounded-full bg-amber-500" />
        </div>
      </div>
    </div>
  );
};
