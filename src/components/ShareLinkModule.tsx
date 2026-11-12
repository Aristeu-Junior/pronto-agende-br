import React, { useState } from 'react';
import { CheckCircle, Copy, ArrowSquareOut, WarningCircle, WhatsappLogo } from '@phosphor-icons/react';
import { BusinessConfig, ServiceItem, StaffMember } from '../types';
import { normalizePixKey } from '../utils/pix';
import { getSchedule } from '../utils/schedule';

export function publicBookingUrl(slug: string): string {
  const base = `${window.location.origin}${window.location.pathname}`;
  return `${base}#/reserva/${slug}`;
}

export const ShareLinkModule: React.FC<{
  business: BusinessConfig;
  staff: StaffMember[];
  services: ServiceItem[];
  onGoToSettings: () => void;
}> = ({ business, staff, services, onGoToSettings }) => {
  const [copied, setCopied] = useState(false);
  const url = publicBookingUrl(business.slug);

  const hasSchedule = staff.some((s) => s.role === 'PROFESSIONAL' && getSchedule(s).days.some((d) => d.enabled));
  const checks: Array<{ ok: boolean; label: string; optional?: boolean }> = [
    { ok: services.length > 0, label: 'Pelo menos um serviço cadastrado' },
    { ok: hasSchedule, label: 'Escala de trabalho com pelo menos um dia de atendimento' },
    { ok: business.phone.replace(/\D/g, '').length >= 10, label: 'WhatsApp da barbearia (o cliente avisa por ele)', optional: true },
    {
      ok: !!normalizePixKey(business.pixKey, business.pixKeyType),
      label: 'Chave Pix válida com o tipo escolhido (para o sinal)',
      optional: true,
    },
  ];

  const copy = () => {
    void navigator.clipboard?.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  const shareText = encodeURIComponent(`Agende seu horário na ${business.name}: ${url}`);

  return (
    <section className="mx-auto max-w-3xl space-y-5">
      <div className="rounded-2xl border border-stone-800 bg-stone-900 p-5 space-y-3">
        <h1 className="text-lg font-bold text-stone-100">Link de agendamento dos seus clientes</h1>
        <p className="text-xs text-stone-400">
          Envie este link no WhatsApp ou ponha na bio do Instagram. O cliente escolhe serviço, dia e horário livre, e a
          reserva cai direto na sua Agenda.
        </p>
        <div className="flex flex-col gap-2 sm:flex-row">
          <input
            readOnly
            value={url}
            aria-label="Link de agendamento"
            onFocus={(e) => e.currentTarget.select()}
            className="w-full rounded-xl border border-stone-800 bg-stone-950 px-3.5 py-2.5 font-mono text-xs text-stone-100"
          />
          <button
            type="button"
            onClick={copy}
            className="inline-flex shrink-0 items-center justify-center gap-2 rounded-xl bg-amber-500 px-4 py-2.5 text-xs font-bold text-stone-950 cursor-pointer"
          >
            <Copy className="h-4 w-4" /> {copied ? 'Copiado!' : 'Copiar link'}
          </button>
        </div>
        <div className="flex flex-wrap gap-2">
          <a
            href={url}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 rounded-xl border border-stone-800 px-3.5 py-2 text-xs font-semibold text-stone-200 hover:border-amber-500"
          >
            <ArrowSquareOut className="h-4 w-4" /> Ver como o cliente vê
          </a>
          <a
            href={`https://wa.me/?text=${shareText}`}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-500 px-3.5 py-2 text-xs font-bold text-stone-100"
          >
            <WhatsappLogo className="h-4 w-4" /> Enviar pelo WhatsApp
          </a>
        </div>
      </div>

      <div className="rounded-2xl border border-stone-800 bg-stone-900 p-5">
        <h2 className="mb-3 text-sm font-bold text-stone-100">Antes de divulgar</h2>
        <ul className="space-y-2">
          {checks.map((c) => (
            <li key={c.label} className="flex items-start gap-2 text-xs">
              {c.ok ? (
                <CheckCircle className="mt-0.5 h-4 w-4 shrink-0 text-emerald-700" weight="fill" />
              ) : (
                <WarningCircle className="mt-0.5 h-4 w-4 shrink-0 text-amber-700" weight="fill" />
              )}
              <span className={c.ok ? 'text-stone-300' : 'font-medium text-stone-100'}>
                {c.label}
                {!c.ok && c.optional ? ' (recomendado)' : ''}
              </span>
            </li>
          ))}
        </ul>
        <button
          type="button"
          onClick={onGoToSettings}
          className="mt-3 text-xs font-semibold text-amber-700 hover:text-amber-800 cursor-pointer"
        >
          Ir para Ajustes
        </button>
      </div>
    </section>
  );
};
