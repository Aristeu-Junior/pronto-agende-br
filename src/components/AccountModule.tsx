import React, { useCallback, useEffect, useState } from 'react';
import { DownloadSimple, ShieldCheck, Trash } from '@phosphor-icons/react';
import { friendlyError, supabase } from '../lib/supabase';
import { LegalLinks } from './LegalPages';

const field =
  'w-full rounded-xl border border-stone-800 bg-stone-950 px-3.5 py-2.5 text-sm text-stone-100 focus:border-amber-500 focus:outline-none';
const card = 'rounded-2xl border border-stone-800 bg-stone-900 p-5 space-y-3';

interface Props {
  email: string;
  isAdmin: boolean;
  onExport: () => void;
  onAccountDeleted: () => void;
  /** Abre o tutorial guiado de novo. */
  onStartTour?: () => void;
}

export const AccountModule: React.FC<Props> = ({ email, isAdmin, onExport, onAccountDeleted, onStartTour }) => {
  // ---- senha ----
  const [pw1, setPw1] = useState('');
  const [pw2, setPw2] = useState('');
  const [pwMsg, setPwMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [pwBusy, setPwBusy] = useState(false);

  const changePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (pw1.length < 8) return setPwMsg({ ok: false, text: 'A senha precisa ter pelo menos 8 caracteres.' });
    if (pw1 !== pw2) return setPwMsg({ ok: false, text: 'As duas senhas não são iguais.' });
    setPwBusy(true);
    const { error } = await supabase.auth.updateUser({ password: pw1 });
    setPwBusy(false);
    if (error) setPwMsg({ ok: false, text: friendlyError(error.message) });
    else {
      setPwMsg({ ok: true, text: 'Senha alterada.' });
      setPw1('');
      setPw2('');
    }
  };

  // ---- 2ª etapa (TOTP) ----
  const [factorId, setFactorId] = useState<string | null>(null);
  const [verified, setVerified] = useState(false);
  const [enroll, setEnroll] = useState<{ id: string; qr: string; secret: string } | null>(null);
  const [code, setCode] = useState('');
  const [mfaMsg, setMfaMsg] = useState('');
  const [mfaBusy, setMfaBusy] = useState(false);

  const loadFactors = useCallback(async () => {
    const { data } = await supabase.auth.mfa.listFactors();
    const totp = data?.totp?.[0];
    setFactorId(totp?.id ?? null);
    setVerified(!!totp);
  }, []);

  useEffect(() => {
    void loadFactors();
  }, [loadFactors]);

  const startEnroll = async () => {
    setMfaBusy(true);
    setMfaMsg('');
    const { data, error } = await supabase.auth.mfa.enroll({ factorType: 'totp', friendlyName: `ProntoAgende ${Date.now()}` });
    setMfaBusy(false);
    if (error || !data) return setMfaMsg(friendlyError(error?.message));
    setEnroll({ id: data.id, qr: data.totp.qr_code, secret: data.totp.secret });
  };

  const confirmEnroll = async () => {
    if (!enroll) return;
    setMfaBusy(true);
    const { error } = await supabase.auth.mfa.challengeAndVerify({ factorId: enroll.id, code: code.trim() });
    setMfaBusy(false);
    if (error) return setMfaMsg('Código incorreto. Confira o aplicativo e tente de novo.');
    setEnroll(null);
    setCode('');
    setMfaMsg('Verificação em duas etapas ativada.');
    await loadFactors();
  };

  const cancelEnroll = async () => {
    if (enroll) await supabase.auth.mfa.unenroll({ factorId: enroll.id });
    setEnroll(null);
    setCode('');
  };

  const disableMfa = async () => {
    if (!factorId || !window.confirm('Desativar a verificação em duas etapas?')) return;
    const { error } = await supabase.auth.mfa.unenroll({ factorId });
    setMfaMsg(error ? friendlyError(error.message) : 'Verificação em duas etapas desativada.');
    await loadFactors();
  };

  // ---- excluir conta ----
  const [confirmText, setConfirmText] = useState('');
  const [delBusy, setDelBusy] = useState(false);
  const [delMsg, setDelMsg] = useState('');

  const deleteAccount = async () => {
    setDelBusy(true);
    const { error } = await supabase.rpc('delete_my_account');
    setDelBusy(false);
    if (error) {
      setDelMsg(
        error.message.includes('admin_nao_pode_se_excluir')
          ? 'A conta de administrador não pode ser excluída por aqui.'
          : friendlyError(error.message)
      );
      return;
    }
    await supabase.auth.signOut();
    onAccountDeleted();
  };

  return (
    <section className="mx-auto max-w-2xl space-y-5">
      <div>
        <h1 className="text-xl font-bold text-stone-100">Minha conta</h1>
        <p className="text-xs text-stone-400">{email}{isAdmin ? ' · administrador' : ''}</p>
      </div>

      {onStartTour && (
        <div className={`${card} flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between`}>
          <div>
            <h2 className="text-sm font-bold text-stone-100">Tutorial</h2>
            <p className="mt-0.5 text-xs text-stone-400">Veja de novo o passo a passo de cada página do sistema.</p>
          </div>
          <button
            type="button"
            onClick={onStartTour}
            className="rounded-xl border border-stone-800 px-4 py-2.5 text-xs font-semibold text-stone-100 hover:border-amber-500 cursor-pointer"
          >
            Rever o tutorial
          </button>
        </div>
      )}

      <form onSubmit={changePassword} className={card}>
        <h2 className="text-sm font-bold text-stone-100">Trocar senha</h2>
        <input className={field} type="password" autoComplete="new-password" placeholder="Nova senha (mínimo 8 caracteres)" value={pw1} onChange={(e) => setPw1(e.target.value)} />
        <input className={field} type="password" autoComplete="new-password" placeholder="Repita a nova senha" value={pw2} onChange={(e) => setPw2(e.target.value)} />
        {pwMsg && (
          <p role="status" className={`text-xs font-medium ${pwMsg.ok ? 'text-emerald-700' : 'text-rose-700'}`}>
            {pwMsg.text}
          </p>
        )}
        <button type="submit" disabled={pwBusy} className="rounded-xl bg-amber-500 px-4 py-2.5 text-xs font-bold text-stone-950 disabled:opacity-50 cursor-pointer">
          {pwBusy ? 'Salvando…' : 'Salvar nova senha'}
        </button>
      </form>

      <div className={card}>
        <h2 className="flex items-center gap-2 text-sm font-bold text-stone-100">
          <ShieldCheck className="h-4 w-4 text-amber-700" /> Verificação em duas etapas
        </h2>
        <p className="text-xs text-stone-400">
          {verified
            ? 'Ativada. Ao entrar, você digita também o código do aplicativo autenticador (Google Authenticator, Microsoft Authenticator, Authy…).'
            : 'Recomendado, principalmente para a conta de administrador. Você vai precisar de um aplicativo autenticador no celular.'}
        </p>
        {enroll ? (
          <div className="space-y-3">
            <p className="text-xs text-stone-300">1. No aplicativo autenticador, leia este QR code (ou digite a chave abaixo).</p>
            <img src={enroll.qr} alt="QR code para o aplicativo autenticador" className="h-40 w-40 rounded-lg border border-stone-800 bg-white p-1" />
            <p className="break-all font-mono text-[11px] text-stone-400">Chave: {enroll.secret}</p>
            <p className="text-xs text-stone-300">2. Digite o código de 6 dígitos que o aplicativo mostrar.</p>
            <input className={`${field} font-mono`} inputMode="numeric" maxLength={6} placeholder="000000" value={code} onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))} />
            <div className="flex gap-2">
              <button type="button" onClick={() => void confirmEnroll()} disabled={code.length !== 6 || mfaBusy} className="rounded-xl bg-amber-500 px-4 py-2.5 text-xs font-bold text-stone-950 disabled:opacity-50 cursor-pointer">
                Ativar
              </button>
              <button type="button" onClick={() => void cancelEnroll()} className="rounded-xl border border-stone-800 px-4 py-2.5 text-xs font-semibold text-stone-300 cursor-pointer">
                Cancelar
              </button>
            </div>
          </div>
        ) : verified ? (
          <button type="button" onClick={() => void disableMfa()} className="rounded-xl border border-stone-800 px-4 py-2.5 text-xs font-semibold text-stone-300 hover:border-amber-500 cursor-pointer">
            Desativar
          </button>
        ) : (
          <button type="button" onClick={() => void startEnroll()} disabled={mfaBusy} className="rounded-xl bg-amber-500 px-4 py-2.5 text-xs font-bold text-stone-950 disabled:opacity-50 cursor-pointer">
            Ativar verificação em duas etapas
          </button>
        )}
        {mfaMsg && <p role="status" className="text-xs font-medium text-stone-300">{mfaMsg}</p>}
      </div>

      <div className={card}>
        <h2 className="text-sm font-bold text-stone-100">Meus dados</h2>
        <p className="text-xs text-stone-400">
          Baixe uma cópia de tudo que está na sua conta: barbearia, serviços, agenda, clientes, caixa e extratos.
        </p>
        <button type="button" onClick={onExport} className="inline-flex items-center gap-2 rounded-xl border border-stone-800 px-4 py-2.5 text-xs font-semibold text-stone-200 hover:border-amber-500 cursor-pointer">
          <DownloadSimple className="h-4 w-4" /> Baixar meus dados (JSON)
        </button>
      </div>

      {!isAdmin && (
        <div className={`${card} border-rose-500/30`}>
          <h2 className="flex items-center gap-2 text-sm font-bold text-stone-100">
            <Trash className="h-4 w-4 text-rose-700" /> Excluir minha conta
          </h2>
          <p className="text-xs text-stone-400">
            Apaga de forma definitiva a barbearia, a agenda, os clientes, o caixa e os extratos. O link de agendamento sai do ar. Não dá para desfazer. Baixe seus dados antes.
          </p>
          <input className={field} placeholder='Digite EXCLUIR para confirmar' value={confirmText} onChange={(e) => setConfirmText(e.target.value)} />
          {delMsg && <p role="alert" className="text-xs font-medium text-rose-700">{delMsg}</p>}
          <button
            type="button"
            onClick={() => void deleteAccount()}
            disabled={confirmText.trim().toUpperCase() !== 'EXCLUIR' || delBusy}
            className="rounded-xl border border-rose-500/40 bg-rose-500/10 px-4 py-2.5 text-xs font-bold text-rose-700 disabled:opacity-40 cursor-pointer"
          >
            {delBusy ? 'Excluindo…' : 'Excluir minha conta para sempre'}
          </button>
        </div>
      )}

      <LegalLinks />
    </section>
  );
};
