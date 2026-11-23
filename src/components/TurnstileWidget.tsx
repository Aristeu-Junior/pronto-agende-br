import React, { forwardRef, useEffect, useImperativeHandle, useRef } from 'react';
import { TURNSTILE_SITE_KEY } from '../config/turnstile';

interface TurnstileApi {
  render: (el: HTMLElement, opts: Record<string, unknown>) => string;
  reset: (id?: string) => void;
  remove: (id?: string) => void;
}
declare global {
  interface Window {
    turnstile?: TurnstileApi;
  }
}

const SCRIPT_SRC = 'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit';
let scriptPromise: Promise<void> | null = null;

function loadScript(): Promise<void> {
  if (window.turnstile) return Promise.resolve();
  if (!scriptPromise) {
    scriptPromise = new Promise<void>((resolve, reject) => {
      const s = document.createElement('script');
      s.src = SCRIPT_SRC;
      s.async = true;
      s.onload = () => resolve();
      s.onerror = () => {
        scriptPromise = null;
        reject(new Error('turnstile'));
      };
      document.head.appendChild(s);
    });
  }
  return scriptPromise;
}

export interface TurnstileHandle {
  reset: () => void;
}

interface Props {
  onToken: (token: string | null) => void;
  onUnavailable?: () => void;
}

/** Captcha da Cloudflare. Sem chave configurada, não renderiza nada. */
const TurnstileWidget = forwardRef<TurnstileHandle, Props>(({ onToken, onUnavailable }, ref) => {
  const box = useRef<HTMLDivElement>(null);
  const widgetId = useRef<string | null>(null);
  const cb = useRef({ onToken, onUnavailable });
  cb.current = { onToken, onUnavailable };

  useImperativeHandle(ref, () => ({
    reset: () => {
      cb.current.onToken(null);
      if (widgetId.current && window.turnstile) window.turnstile.reset(widgetId.current);
    },
  }));

  useEffect(() => {
    if (!TURNSTILE_SITE_KEY) return;
    let cancelled = false;
    loadScript()
      .then(() => {
        if (cancelled || !box.current || !window.turnstile) return;
        widgetId.current = window.turnstile.render(box.current, {
          sitekey: TURNSTILE_SITE_KEY,
          theme: 'auto',
          callback: (t: string) => cb.current.onToken(t),
          'expired-callback': () => cb.current.onToken(null),
          'error-callback': () => cb.current.onToken(null),
        });
      })
      .catch(() => cb.current.onUnavailable?.());
    return () => {
      cancelled = true;
      if (widgetId.current && window.turnstile) window.turnstile.remove(widgetId.current);
      widgetId.current = null;
    };
  }, []);

  if (!TURNSTILE_SITE_KEY) return null;
  return <div ref={box} className="flex min-h-[65px] justify-center" />;
});
TurnstileWidget.displayName = 'TurnstileWidget';

export default TurnstileWidget;
