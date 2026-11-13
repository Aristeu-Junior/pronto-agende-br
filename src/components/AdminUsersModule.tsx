import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { ArrowsClockwise } from '@phosphor-icons/react';
import { friendlyError, supabase } from '../lib/supabase';
import { AccountStatus } from '../lib/cloud';
import { formatDateBR } from '../utils/schedule';

interface AccountRow {
  user_id: string;
  email: string;
  display_name: string;
  status: AccountStatus;
  is_admin: boolean;
  created_at: string;
  approved_at: string | null;
  business_name: string | null;
  slug: string | null;
  appointments_count: number;
}

const STATUS_LABEL: Record<AccountStatus, string> = {
  PENDING: 'Pendente',
  ACTIVE: 'Ativa',
  SUSPENDED: 'Suspensa',
};

type Filter = 'PENDING' | 'ACTIVE' | 'SUSPENDED' | 'ALL';

export const AdminUsersModule: React.FC<{ currentUserId: string; onPendingCount?: (n: number) => void }> = ({
  currentUserId,
  onPendingCount,
}) => {
  const [rows, setRows] = useState<AccountRow[]>([]);
  const [filter, setFilter] = useState<Filter>('PENDING');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [workingId, setWorkingId] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    const { data, error: err } = await supabase.rpc('admin_list_accounts');
    if (err) setError(friendlyError(err.message));
    else {
      const list = (data ?? []) as AccountRow[];
      setRows(list);
      onPendingCount?.(list.filter((r) => r.status === 'PENDING').length);
    }
    setLoading(false);
  }, [onPendingCount]);

  useEffect(() => {
    void load();
  }, [load]);

  const setStatus = async (row: AccountRow, status: AccountStatus) => {
    if (status === 'SUSPENDED' && !window.confirm(`Suspender ${row.email}? A barbearia sai do ar e perde o acesso.`)) return;
    setWorkingId(row.user_id);
    setError('');
    const { error: err } = await supabase.rpc('admin_set_status', { p_user: row.user_id, p_status: status });
    if (err) setError(friendlyError(err.message));
    await load();
    setWorkingId('');
  };

  const shown = useMemo(
    () => rows.filter((r) => filter === 'ALL' || r.status === filter),
    [rows, filter]
  );
  const count = (s: AccountStatus) => rows.filter((r) => r.status === s).length;

  const tabs: Array<{ id: Filter; label: string; n: number }> = [
    { id: 'PENDING', label: 'Pendentes', n: count('PENDING') },
    { id: 'ACTIVE', label: 'Ativas', n: count('ACTIVE') },
    { id: 'SUSPENDED', label: 'Suspensas', n: count('SUSPENDED') },
    { id: 'ALL', label: 'Todas', n: rows.length },
  ];

  return (
    <section className="space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-stone-100">Contas das barbearias</h1>
          <p className="text-xs text-stone-400">
            Quem cria conta fica pendente. Libere depois de confirmar o pagamento.
          </p>
        </div>
        <button
          type="button"
          onClick={() => void load()}
          className="inline-flex items-center gap-1.5 rounded-xl border border-stone-800 px-3 py-2 text-xs font-semibold text-stone-300 cursor-pointer"
        >
          <ArrowsClockwise className="h-4 w-4" /> Atualizar
        </button>
      </div>

      <div className="flex flex-wrap gap-1.5">
        {tabs.map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => setFilter(t.id)}
            className={`rounded-lg border px-3 py-1.5 text-xs font-semibold cursor-pointer ${
              filter === t.id
                ? 'border-amber-500 bg-amber-500 text-stone-950'
                : 'border-stone-800 text-stone-300 hover:border-amber-500'
            }`}
          >
            {t.label} ({t.n})
          </button>
        ))}
      </div>

      {error && (
        <p role="alert" className="text-xs font-medium text-rose-700">
          {error}
        </p>
      )}

      <div className="divide-y divide-stone-800/60 rounded-2xl border border-stone-800 bg-stone-900">
        {loading && rows.length === 0 ? (
          <p className="p-6 text-center text-xs text-stone-400">Carregando…</p>
        ) : shown.length === 0 ? (
          <p className="p-6 text-center text-xs text-stone-400">Nenhuma conta nesta lista.</p>
        ) : (
          shown.map((r) => {
            const isMe = r.user_id === currentUserId;
            return (
              <div key={r.user_id} className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="truncate text-sm font-semibold text-stone-100">
                      {r.business_name || r.display_name || 'Sem nome'}
                    </span>
                    <span
                      className={`rounded border px-2 py-0.5 text-[11px] font-semibold ${
                        r.status === 'ACTIVE'
                          ? 'border-emerald-500 bg-emerald-950 text-emerald-800'
                          : r.status === 'PENDING'
                            ? 'border-amber-500/50 bg-amber-950 text-amber-800'
                            : 'border-stone-700 bg-stone-800/60 text-stone-400'
                      }`}
                    >
                      {STATUS_LABEL[r.status]}
                    </span>
                    {r.is_admin && (
                      <span className="rounded border border-stone-700 px-2 py-0.5 text-[11px] font-semibold text-stone-300">
                        Admin
                      </span>
                    )}
                  </div>
                  <p className="truncate text-xs text-stone-400">
                    {r.email} · criada em {formatDateBR(r.created_at.slice(0, 10))}
                    {r.slug ? ` · /reserva/${r.slug}` : ''}
                    {r.status === 'ACTIVE' ? ` · ${r.appointments_count} agendamentos` : ''}
                  </p>
                </div>
                {!isMe && (
                  <div className="flex shrink-0 gap-2">
                    {r.status !== 'ACTIVE' && (
                      <button
                        type="button"
                        disabled={workingId === r.user_id}
                        onClick={() => void setStatus(r, 'ACTIVE')}
                        className="rounded-lg bg-emerald-500 px-3.5 py-2 text-xs font-bold text-ink-dark disabled:opacity-50 cursor-pointer"
                      >
                        {r.status === 'SUSPENDED' ? 'Reativar' : 'Liberar acesso'}
                      </button>
                    )}
                    {r.status !== 'SUSPENDED' && (
                      <button
                        type="button"
                        disabled={workingId === r.user_id}
                        onClick={() => void setStatus(r, 'SUSPENDED')}
                        className="rounded-lg border border-stone-800 px-3.5 py-2 text-xs font-semibold text-stone-300 hover:border-amber-500 disabled:opacity-50 cursor-pointer"
                      >
                        Suspender
                      </button>
                    )}
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
    </section>
  );
};
