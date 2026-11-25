import { supabase } from './supabase';

const MIN_MS = 3300; // tempo para a cena terminar (corte, barba, pronto)
const MAX_MS = 6000; // nunca prende o cliente na tela de carregamento

/** Espera o app ficar pronto e então abre o círculo que revela a tela. */
export function runSplash(): void {
  const el = document.getElementById('splash');
  if (!el || document.documentElement.classList.contains('no-splash')) return;

  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const wait = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));

  const loaded = new Promise<void>((r) => {
    if (document.readyState === 'complete') r();
    else window.addEventListener('load', () => r(), { once: true });
  });
  const fonts = document.fonts ? document.fonts.ready.then(() => undefined) : Promise.resolve();
  const session = supabase.auth.getSession().then(() => undefined, () => undefined);

  const ready = Promise.all([loaded, fonts, session, wait(reduce ? 300 : MIN_MS)]);

  void Promise.race([ready, wait(MAX_MS)]).then(() => {
    try {
      sessionStorage.setItem('pa-splash', '1');
    } catch {
      /* sem armazenamento: mostra de novo na próxima visita */
    }
    el.classList.add('go');
    window.setTimeout(() => el.remove(), reduce ? 400 : 1500);
  });
}
