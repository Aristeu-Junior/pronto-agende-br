import React, { useState } from 'react';
import { Scissors, SignOut } from '@phosphor-icons/react';
import { friendlyError, supabase } from '../lib/supabase';
import { createBusinessWithDefaults, slugify } from '../lib/cloud';
import { BusinessConfig } from '../types';

const field =
  'w-full rounded-xl border border-stone-800 bg-stone-950 px-3.5 py-3 text-sm text-stone-100 focus:border-amber-500 focus:outline-none';

const Shell: React.FC<{ title: string; subtitle?: string; children: React.ReactNode }> = ({
  title,
  subtitle,
  children,
}) => (
  <main className="flex min-h-screen items-center justify-center bg-stone-950 px-4 py-10">
    <div className="w-full max-w-md rounded-3xl border border-stone-800 bg-stone-900 p-7 shadow-xl">
      <div className="mb-5 flex items-center gap-3 border-b border-stone-800 pb-5">
        <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-amber-500 text-stone-950">
          <Scissors className="h-5 w-5" weight="bold" />
        </div>
        <div>
          <h1 className="text-lg font-bold text-stone-100">{title}</h1>
          {subtitle && <p className="text-xs text-stone-400">{subtitle}</p>}
        </div>
      </div>
      {children}
    </div>
  </main>
);

export const AuthScreen: React.FC = () => {
  const [mode, setMode] = useState<'login' | 'signup'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [shopName, setShopName] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [info, setInfo] = useState('');

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setInfo('');
    const cleanEmail = email.trim().toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanEmail)) return setError('Digite um e-mail válido.');
    if (password.length < 8) return setError('A senha precisa ter pelo menos 8 caracteres.');
    if (mode === 'signup' && shopName.trim().length < 2) return setError('Digite o nome da barbearia.');
    setBusy(true);
    try {
      if (mode === 'login') {
        const { error: err } = await supabase.auth.signInWithPassword({ email: cleanEmail, password });
        if (err) throw err;
      } else {
        const { data, error: err } = await supabase.auth.signUp({
          email: cleanEmail,
          password,
          options: { data: { display_name: shopName.trim().slice(0, 80) } },
        });
        if (err) throw err;
        if (!data.session) {
          setInfo('Conta criada. Se o e-mail precisar de confirmação, peça a liberação ao administrador.');
        }
      }
    } catch (err) {
      setError(friendlyError((err as Error)?.message));
    } finally {
      setBusy(false);
    }
  };

  return (
    <Shell
      title="ProntoAgende"
      subtitle={mode === 'login' ? 'Entre na sua barbearia' : 'Crie a conta da sua barbearia'}
    >
      <form onSubmit={submit} className="space-y-3.5" noValidate>
        {mode === 'signup' && (
          <label className="block">
            <span className="mb-1 block text-xs font-semibold text-stone-300">Nome da barbearia</span>
            <input
              className={field}
              value={shopName}
              onChange={(e) => setShopName(e.target.value)}
              autoComplete="organization"
              placeholder="Ex.: Barbearia Dom Pedro"
            />
          </label>
        )}
        <label className="block">
          <span className="mb-1 block text-xs font-semibold text-stone-300">E-mail</span>
          <input
            className={field}
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            autoComplete="email"
            placeholder="voce@email.com"
          />
        </label>
        <label className="block">
          <span className="mb-1 block text-xs font-semibold text-stone-300">Senha</span>
          <input
            className={field}
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
            placeholder="Mínimo 8 caracteres"
          />
        </label>
        {error && (
          <p role="alert" className="text-xs font-medium text-rose-700">
            {error}
          </p>
        )}
        {info && <p className="text-xs font-medium text-emerald-700">{info}</p>}
        <button
          type="submit"
          disabled={busy}
          className="w-full rounded-xl bg-amber-500 py-3 text-sm font-bold text-stone-950 hover:bg-amber-600 disabled:opacity-50 cursor-pointer"
        >
          {busy ? 'Aguarde…' : mode === 'login' ? 'Entrar' : 'Criar conta'}
        </button>
      </form>
      <button
        type="button"
        onClick={() => {
          setMode(mode === 'login' ? 'signup' : 'login');
          setError('');
          setInfo('');
        }}
        className="mt-4 w-full text-center text-xs font-semibold text-amber-700 hover:text-amber-800 cursor-pointer"
      >
        {mode === 'login' ? 'Ainda não tenho conta' : 'Já tenho conta. Entrar'}
      </button>
      {mode === 'signup' && (
        <p className="mt-3 text-center text-[11px] text-stone-400">
          Depois de criar a conta, o acesso ao sistema é liberado pelo administrador.
        </p>
      )}
    </Shell>
  );
};

export const WaitingScreen: React.FC<{
  email: string;
  suspended: boolean;
  onRefresh: () => void;
  onSignOut: () => void;
}> = ({ email, suspended, onRefresh, onSignOut }) => (
  <Shell
    title={suspended ? 'Acesso suspenso' : 'Aguardando liberação'}
    subtitle={email}
  >
    <p className="text-sm text-stone-300">
      {suspended
        ? 'O acesso desta conta está suspenso. Fale com o administrador para reativar.'
        : 'Sua conta foi criada. Assim que o administrador liberar o acesso, você poderá usar o sistema. Isso costuma acontecer depois da confirmação do pagamento.'}
    </p>
    <div className="mt-5 flex gap-2">
      {!suspended && (
        <button
          type="button"
          onClick={onRefresh}
          className="flex-1 rounded-xl bg-amber-500 py-2.5 text-sm font-bold text-stone-950 cursor-pointer"
        >
          Já fui liberado, verificar
        </button>
      )}
      <button
        type="button"
        onClick={onSignOut}
        className="inline-flex items-center justify-center gap-1.5 rounded-xl border border-stone-800 px-4 py-2.5 text-sm font-semibold text-stone-300 cursor-pointer"
      >
        <SignOut className="h-4 w-4" /> Sair
      </button>
    </div>
  </Shell>
);

export const OnboardingScreen: React.FC<{
  defaultName: string;
  onCreated: (b: BusinessConfig) => void;
  onSignOut: () => void;
}> = ({ defaultName, onCreated, onSignOut }) => {
  const [name, setName] = useState(defaultName);
  const [slug, setSlug] = useState(slugify(defaultName));
  const [touched, setTouched] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (name.trim().length < 2) return setError('Digite o nome da barbearia.');
    if (!/^[a-z0-9-]{3,40}$/.test(slug)) return setError('O endereço deve ter de 3 a 40 letras minúsculas, números ou hífen.');
    setBusy(true);
    setError('');
    try {
      onCreated(await createBusinessWithDefaults(name.trim(), slug));
    } catch (err) {
      setError(friendlyError((err as Error)?.message));
    } finally {
      setBusy(false);
    }
  };

  return (
    <Shell title="Vamos configurar" subtitle="Dados básicos da sua barbearia">
      <form onSubmit={submit} className="space-y-3.5" noValidate>
        <label className="block">
          <span className="mb-1 block text-xs font-semibold text-stone-300">Nome da barbearia</span>
          <input
            className={field}
            value={name}
            onChange={(e) => {
              setName(e.target.value);
              if (!touched) setSlug(slugify(e.target.value));
            }}
          />
        </label>
        <label className="block">
          <span className="mb-1 block text-xs font-semibold text-stone-300">Endereço do seu link</span>
          <input
            className={`${field} font-mono`}
            value={slug}
            onChange={(e) => {
              setTouched(true);
              setSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ''));
            }}
          />
          <span className="mt-1 block text-[11px] text-stone-400">
            Seus clientes vão agendar em …/#/reserva/<strong>{slug || 'seu-nome'}</strong>
          </span>
        </label>
        {error && (
          <p role="alert" className="text-xs font-medium text-rose-700">
            {error}
          </p>
        )}
        <button
          type="submit"
          disabled={busy}
          className="w-full rounded-xl bg-amber-500 py-3 text-sm font-bold text-stone-950 hover:bg-amber-600 disabled:opacity-50 cursor-pointer"
        >
          {busy ? 'Criando…' : 'Criar minha barbearia'}
        </button>
        <button
          type="button"
          onClick={onSignOut}
          className="w-full text-center text-xs font-semibold text-stone-400 cursor-pointer"
        >
          Sair
        </button>
      </form>
    </Shell>
  );
};
