import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { ArrowsClockwise } from '@phosphor-icons/react';
import { friendlyError } from '../lib/supabase';
import {
  Ticket,
  TicketStatus,
  TICKET_KIND_LABEL,
  TICKET_STATUS_LABEL,
  fetchTickets,
  updateTicket,
} from '../lib/cloud';
import { BTN_PRIMARY, FIELD, chip } from './formStyles';

type Filter = TicketStatus | 'ALL';

function fmtDate(iso: string): string {
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? '' : d.toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' });
}

const TicketCard: React.FC<{ ticket: Ticket; onSaved: () => void }> = ({ ticket, onSaved }) => {
  const [status, setStatus] = useState<TicketStatus>(ticket.status);
  const [note, setNote] = useState(ticket.admin_note ?? '');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const dirty = status !== ticket.status || note.trim() !== (ticket.admin_note ?? '');

  const save = async () => {
    setBusy(true);
    setError('');
    try {
      await updateTicket(ticket.id, status, note);
      onSaved();
    } catch (e) {
      setError(friendlyError((e as { message?: string })?.message));
    }
    setBusy(false);
  };

  return (
    <article className="space-y-3 rounded-2xl border border-stone-800 bg-stone-900 p-4 text-xs">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <span className="font-semibold text-stone-100">
          {TICKET_KIND_LABEL[ticket.kind]} <span className="font-normal text-stone-500">· {fmtDate(ticket.created_at)}</span>
        </span>
        <span className="truncate font-mono text-[11px] text-stone-400">{ticket.email}</span>
      </div>
      <p className="whitespace-pre-wrap break-words text-sm text-stone-200">{ticket.message}</p>
      <div className="grid grid-cols-1 gap-2 sm:grid-cols-[10rem_1fr]">
        <select
          aria-label="Situação do chamado"
          value={status}
          onChange={(e) => setStatus(e.target.value as TicketStatus)}
          className={FIELD}
        >
          {(Object.keys(TICKET_STATUS_LABEL) as TicketStatus[]).map((s) => (
            <option key={s} value={s}>
              {TICKET_STATUS_LABEL[s]}
            </option>
          ))}
        </select>
        <input
          aria-label="Resposta para o usuário"
          value={note}
          maxLength={1000}
          onChange={(e) => setNote(e.target.value)}
          placeholder="Resposta para o usuário (opcional)"
          className={FIELD}
        />
      </div>
      {error && <p className="font-medium text-amber-800">{error}</p>}
      {dirty && (
        <button type="button" onClick={save} disabled={busy} className={`${BTN_PRIMARY} w-full sm:w-auto`}>
          {busy ? 'Salvando…' : 'Salvar'}
        </button>
      )}
    </article>
  );
};

export const AdminTicketsModule: React.FC<{ onOpenCount?: (n: number) => void }> = ({ onOpenCount }) => {
  const [rows, setRows] = useState<Ticket[]>([]);
  const [filter, setFilter] = useState<Filter>('OPEN');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const list = await fetchTickets();
      setRows(list);
      onOpenCount?.(list.filter((t) => t.status === 'OPEN').length);
    } catch (e) {
      setError(friendlyError((e as { message?: string })?.message));
    }
    setLoading(false);
  }, [onOpenCount]);

  useEffect(() => {
    void load();
  }, [load]);

  const visible = useMemo(() => (filter === 'ALL' ? rows : rows.filter((t) => t.status === filter)), [rows, filter]);
  const count = (s: Filter) => (s === 'ALL' ? rows.length : rows.filter((t) => t.status === s).length);

  return (
    <section className="mx-auto max-w-3xl space-y-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-stone-100">Chamados</h1>
          <p className="mt-0.5 text-xs text-stone-400">Sugestões, problemas, dúvidas e pedidos de cópia dos dados.</p>
        </div>
        <button
          type="button"
          onClick={() => void load()}
          aria-label="Atualizar"
          className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-stone-800 text-stone-300 hover:border-amber-500 cursor-pointer"
        >
          <ArrowsClockwise className="h-4 w-4" />
        </button>
      </div>

      <div role="group" aria-label="Filtrar chamados" className="flex flex-wrap gap-2">
        {(['OPEN', 'IN_PROGRESS', 'DONE', 'ALL'] as Filter[]).map((f) => (
          <button key={f} type="button" aria-pressed={filter === f} onClick={() => setFilter(f)} className={chip(filter === f)}>
            {f === 'ALL' ? 'Todos' : TICKET_STATUS_LABEL[f]} ({count(f)})
          </button>
        ))}
      </div>

      {error && <p className="text-xs font-medium text-amber-800">{error}</p>}
      {loading && rows.length === 0 && <p className="text-xs text-stone-400">Carregando…</p>}
      {!loading && !error && visible.length === 0 && (
        <p className="rounded-2xl border border-dashed border-stone-800 p-8 text-center text-xs text-stone-400">
          Nenhum chamado nesta lista.
        </p>
      )}
      <div className="space-y-3">
        {visible.map((t) => (
          <TicketCard key={`${t.id}-${t.updated_at}`} ticket={t} onSaved={() => void load()} />
        ))}
      </div>
    </section>
  );
};

export default AdminTicketsModule;
