import React, { useCallback, useEffect, useState } from 'react';
import { CaretDown, DownloadSimple, PaperPlaneTilt } from '@phosphor-icons/react';
import { friendlyError } from '../lib/supabase';
import {
  Ticket,
  TicketKind,
  TICKET_KIND_LABEL,
  TICKET_STATUS_LABEL,
  createTicket,
  fetchTickets,
} from '../lib/cloud';
import { HelpTip } from './HelpTip';
import { BTN_PRIMARY, FIELD, LABEL, chip } from './formStyles';

const card = 'rounded-2xl border border-stone-800 bg-stone-900 p-5';
const KINDS: Array<[TicketKind, string]> = [
  ['SUGGESTION', 'Sugestão'],
  ['PROBLEM', 'Problema'],
  ['QUESTION', 'Dúvida'],
];

const KIND_HINT: Record<string, string> = {
  SUGGESTION: 'Conte o que poderia melhorar ou o que falta no sistema.',
  PROBLEM: 'Diga o que aconteceu e em qual tela. Quanto mais detalhe, mais rápido a gente resolve.',
  QUESTION: 'Escreva sua dúvida de forma curta.',
};

function fmtDate(iso: string): string {
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? '' : d.toLocaleDateString('pt-BR');
}

interface Props {
  /** Baixa o arquivo com todos os dados da conta (feito no App). */
  onDownloadData: () => void;
}

export const SupportModule: React.FC<Props> = ({ onDownloadData }) => {
  const [kind, setKind] = useState<TicketKind>('SUGGESTION');
  const [message, setMessage] = useState('');
  const [sending, setSending] = useState(false);
  const [notice, setNotice] = useState<{ ok: boolean; text: string } | null>(null);
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [loadError, setLoadError] = useState('');
  const [copyBusy, setCopyBusy] = useState(false);

  const load = useCallback(async () => {
    try {
      setTickets(await fetchTickets());
      setLoadError('');
    } catch (e) {
      setLoadError(friendlyError((e as { message?: string })?.message));
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const send = async (e: React.FormEvent) => {
    e.preventDefault();
    if (message.trim().length < 5) return setNotice({ ok: false, text: 'Escreva um pouco mais para a gente entender.' });
    setSending(true);
    setNotice(null);
    try {
      await createTicket(kind, message);
      setMessage('');
      setNotice({ ok: true, text: 'Recebemos! Você acompanha a resposta em "Meus chamados".' });
      await load();
    } catch (err) {
      setNotice({ ok: false, text: friendlyError((err as { message?: string })?.message) });
    }
    setSending(false);
  };

  const requestCopy = async () => {
    setCopyBusy(true);
    setNotice(null);
    onDownloadData();
    try {
      await createTicket('DATA_COPY', 'Pedido de cópia dos dados da conta (arquivo baixado pelo próprio usuário).');
      await load();
      setNotice({ ok: true, text: 'Cópia baixada. O pedido ficou registrado.' });
    } catch (err) {
      // o arquivo já foi baixado; só avisa que o registro falhou
      setNotice({ ok: false, text: `Cópia baixada, mas o registro do pedido falhou: ${friendlyError((err as { message?: string })?.message)}` });
    }
    setCopyBusy(false);
  };

  return (
    <section className="mx-auto max-w-2xl space-y-4">
      <div>
        <h1 className="flex items-center gap-2 text-xl font-bold text-stone-100">
          Suporte
          <HelpTip
            label="Suporte"
            text="Fale com a equipe do ProntoAgende: mande uma sugestão, relate um problema, tire uma dúvida ou peça uma cópia dos seus dados. Os administradores recebem na hora."
          />
        </h1>
        <p className="mt-0.5 text-xs text-stone-400">Sugestões, problemas, dúvidas e cópia dos seus dados.</p>
      </div>

      <form data-tour="support-form" onSubmit={send} className={`${card} space-y-4`}>
        <h2 className="text-sm font-bold text-stone-100">Fale com a gente</h2>
        <div role="group" aria-label="Tipo de mensagem" className="flex flex-wrap gap-2">
          {KINDS.map(([id, label]) => (
            <button key={id} type="button" aria-pressed={kind === id} onClick={() => setKind(id)} className={chip(kind === id)}>
              {label}
            </button>
          ))}
        </div>
        <div>
          <label htmlFor="support-msg" className={LABEL}>
            {KIND_HINT[kind]}
          </label>
          <textarea
            id="support-msg"
            rows={4}
            maxLength={2000}
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder="Escreva aqui…"
            className={`${FIELD} py-3`}
          />
          <p className="mt-1 text-right text-[11px] text-stone-500">{message.length}/2000</p>
        </div>
        {notice && (
          <p role="status" className={`text-xs font-medium ${notice.ok ? 'text-emerald-800' : 'text-amber-800'}`}>
            {notice.text}
          </p>
        )}
        <button type="submit" disabled={sending} className={`${BTN_PRIMARY} w-full sm:w-auto`}>
          <PaperPlaneTilt className="h-4 w-4" weight="bold" /> {sending ? 'Enviando…' : 'Enviar'}
        </button>
      </form>

      <div data-tour="support-data" className={`${card} space-y-3`}>
        <h2 className="text-sm font-bold text-stone-100">Meus dados</h2>
        <p className="text-xs text-stone-400">
          Peça uma cópia de tudo que está na sua conta: barbearia, serviços, agenda, clientes, caixa e extratos. O arquivo
          baixa na hora e o pedido fica registrado.
        </p>
        <button type="button" onClick={requestCopy} disabled={copyBusy} className={`${BTN_PRIMARY} w-full bg-transparent !text-stone-100 border border-stone-800 hover:!bg-transparent hover:border-amber-500 sm:w-auto`}>
          <DownloadSimple className="h-4 w-4" /> {copyBusy ? 'Preparando…' : 'Pedir cópia dos meus dados'}
        </button>
      </div>

      <details data-tour="support-list" className="group rounded-2xl border border-stone-800 bg-stone-900">
        <summary className="flex cursor-pointer list-none items-center justify-between gap-3 px-5 py-4">
          <span>
            <span className="block text-sm font-bold text-stone-100">Meus chamados ({tickets.length})</span>
            <span className="mt-0.5 block text-xs text-stone-400">Acompanhe as respostas da equipe.</span>
          </span>
          <CaretDown className="h-4 w-4 shrink-0 text-stone-400 transition-transform group-open:rotate-180" aria-hidden="true" />
        </summary>
        <div className="space-y-2.5 border-t border-stone-800 p-4">
          {loadError && <p className="text-xs font-medium text-amber-800">{loadError}</p>}
          {!loadError && tickets.length === 0 && (
            <p className="rounded-xl border border-dashed border-stone-800 p-5 text-center text-xs text-stone-400">
              Você ainda não enviou nenhum chamado.
            </p>
          )}
          {tickets.map((t) => (
            <article key={t.id} className="rounded-xl border border-stone-800 bg-stone-950 p-3.5 text-xs">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span className="font-semibold text-stone-100">
                  {TICKET_KIND_LABEL[t.kind]} <span className="font-normal text-stone-500">· {fmtDate(t.created_at)}</span>
                </span>
                <span
                  className={`rounded-full border px-2.5 py-0.5 text-[11px] font-semibold ${
                    t.status === 'DONE' ? 'border-emerald-500/40 text-emerald-800' : t.status === 'IN_PROGRESS' ? 'border-amber-500/40 text-amber-800' : 'border-stone-800 text-stone-300'
                  }`}
                >
                  {TICKET_STATUS_LABEL[t.status]}
                </span>
              </div>
              <p className="mt-2 whitespace-pre-wrap break-words text-stone-300">{t.message}</p>
              {t.admin_note && (
                <p className="mt-2 rounded-lg border-l-[3px] border-amber-500 bg-tint-50 px-3 py-2 text-stone-200">
                  <span className="block text-[11px] font-bold uppercase tracking-wide text-amber-800">Resposta</span>
                  {t.admin_note}
                </p>
              )}
            </article>
          ))}
        </div>
      </details>
    </section>
  );
};

export default SupportModule;
