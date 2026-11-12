import React, { useState } from 'react';
import { CaretDown } from '@phosphor-icons/react';

const STORAGE_KEY = 'pronto_agende_br_ajustes_open';

function readOpen(): string[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

interface AccordionSectionProps {
  id: string;
  title: string;
  summary?: string;
  icon?: React.ReactNode;
  children: React.ReactNode;
}

/** Bloco recolhível: título e resumo sempre visíveis, conteúdo só ao abrir. Lembra o que ficou aberto. */
export const AccordionSection: React.FC<AccordionSectionProps> = ({ id, title, summary, icon, children }) => {
  const [open, setOpen] = useState(() => readOpen().includes(id));

  const toggle = () => {
    const next = !open;
    setOpen(next);
    try {
      const current = readOpen().filter((x) => x !== id);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(next ? [...current, id] : current));
    } catch {
      // sem armazenamento local: o bloco só não lembra o estado
    }
  };

  return (
    <section className="rounded-2xl border border-stone-800 bg-stone-900">
      <h2>
        <button
          type="button"
          onClick={toggle}
          aria-expanded={open}
          aria-controls={`acc-${id}`}
          className="flex min-h-[60px] w-full items-center gap-3 px-4 py-3 text-left cursor-pointer sm:px-5"
        >
          {icon && <span className="shrink-0 text-amber-700">{icon}</span>}
          <span className="min-w-0 flex-1">
            <span className="block text-sm font-bold text-stone-100">{title}</span>
            {summary && <span className="mt-0.5 block truncate text-xs text-stone-400">{summary}</span>}
          </span>
          <CaretDown
            className={`h-4 w-4 shrink-0 text-stone-400 transition-transform ${open ? 'rotate-180' : ''}`}
            aria-hidden="true"
          />
        </button>
      </h2>
      {open && (
        <div id={`acc-${id}`} className="space-y-4 border-t border-stone-800 p-4 sm:p-5">
          {children}
          <p className="text-[11px] text-stone-500">As alterações são salvas automaticamente.</p>
        </div>
      )}
    </section>
  );
};
