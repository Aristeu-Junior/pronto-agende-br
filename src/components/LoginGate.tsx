import React, { useState } from 'react';
import {
  Eye,
  EyeSlash,
  Key,
  LockKey,
  Scissors,
  ShieldWarning,
} from '@phosphor-icons/react';
import { SecurityAuditEvent, UserAccount } from '../types';
import {
  createAuditEvent,
  derivePasswordHash,
  detectAttackPayload,
  getLockoutConfig,
  timingSafeEqualStr,
} from '../utils/security';

interface LoginGateProps {
  accounts: UserAccount[];
  onLoginSuccess: (account: UserAccount) => void;
  onUpdateAccount: (userId: string, patch: Partial<UserAccount>) => void;
  onLogSecurityEvent: (event: SecurityAuditEvent) => void;
}

export const LoginGate: React.FC<LoginGateProps> = ({
  accounts,
  onLoginSuccess,
  onUpdateAccount,
  onLogSecurityEvent,
}) => {
  const [usernameOrEmail, setUsernameOrEmail] = useState('');
  const [password, setPassword] = useState('');
  const [securityPin, setSecurityPin] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    const rawUser = usernameOrEmail.trim().toLowerCase();
    if (!rawUser || !password || !securityPin) {
      setErrorMessage(
        'Preencha usuário/e-mail, senha e o PIN de segurança de 6 dígitos.'
      );
      return;
    }

    if (
      detectAttackPayload(usernameOrEmail) ||
      detectAttackPayload(password) ||
      detectAttackPayload(securityPin)
    ) {
      onLogSecurityEvent(
        createAuditEvent(
          'XSS_PAYLOAD_BLOCKED',
          'CRITICAL',
          rawUser,
          'Tentativa de injeção bloqueada no formulário de autenticação.'
        )
      );
      setErrorMessage('Credenciais inválidas.');
      return;
    }

    setIsVerifying(true);
    try {
      const targetUser = accounts.find(
        (acc) =>
          acc.username.toLowerCase() === rawUser ||
          acc.email.toLowerCase() === rawUser
      );

      if (!targetUser) {
        await derivePasswordHash(password, 'dummy_anti_timing_salt');
        onLogSecurityEvent(
          createAuditEvent(
            'LOGIN_FAILED',
            'WARNING',
            rawUser,
            'Tentativa de login com usuário inexistente.'
          )
        );
        setErrorMessage('Credenciais ou PIN de segurança inválidos.');
        return;
      }

      const { LOCKOUT_THRESHOLD, LOCKOUT_DURATION_MS } = getLockoutConfig();
      if (targetUser.lockedUntil && Date.now() < targetUser.lockedUntil) {
        const remainingMin = Math.ceil(
          (targetUser.lockedUntil - Date.now()) / 60000
        );
        setErrorMessage(
          `Conta temporariamente bloqueada. Tente novamente em ${remainingMin} minuto(s).`
        );
        return;
      }

      if (targetUser.status !== 'ACTIVE') {
        onLogSecurityEvent(
          createAuditEvent(
            'LOGIN_FAILED',
            'WARNING',
            targetUser.username,
            `Tentativa de acesso em conta com status ${targetUser.status}.`
          )
        );
        setErrorMessage(
          'Esta conta está suspensa ou aguardando liberação do administrador.'
        );
        return;
      }

      const [computedPasswordHash, computedPinHash] = await Promise.all([
        derivePasswordHash(password, targetUser.passwordSalt),
        derivePasswordHash(securityPin.trim(), targetUser.passwordSalt),
      ]);

      const passwordValid = timingSafeEqualStr(
        computedPasswordHash,
        targetUser.passwordHash
      );
      const pinValid = timingSafeEqualStr(computedPinHash, targetUser.pinHash);

      if (!passwordValid || !pinValid) {
        const nextAttempts = (targetUser.failedLoginAttempts || 0) + 1;
        const shouldLock = nextAttempts >= LOCKOUT_THRESHOLD;
        const lockedUntil = shouldLock
          ? Date.now() + LOCKOUT_DURATION_MS
          : undefined;

        onUpdateAccount(targetUser.id, {
          failedLoginAttempts: nextAttempts,
          lockedUntil,
        });

        onLogSecurityEvent(
          createAuditEvent(
            shouldLock ? 'BRUTE_FORCE_LOCKOUT' : 'LOGIN_FAILED',
            shouldLock ? 'CRITICAL' : 'WARNING',
            targetUser.username,
            shouldLock
              ? `Conta bloqueada por 15 min após ${nextAttempts} tentativas inválidas.`
              : `Falha de autenticação (${nextAttempts}/${LOCKOUT_THRESHOLD}).`
          )
        );

        setErrorMessage(
          shouldLock
            ? 'Limite de 5 tentativas excedido. Conta bloqueada por 15 minutos.'
            : 'Credenciais ou PIN de segurança inválidos.'
        );
        return;
      }

      onUpdateAccount(targetUser.id, {
        failedLoginAttempts: 0,
        lockedUntil: undefined,
        lastLoginAt: new Date().toLocaleString('pt-BR'),
      });

      onLogSecurityEvent(
        createAuditEvent(
          'LOGIN_SUCCESS',
          'INFO',
          targetUser.username,
          `Login autenticado com sucesso (${targetUser.role}).`
        )
      );

      onLoginSuccess(targetUser);
    } finally {
      setIsVerifying(false);
    }
  };

  return (
    <div className="min-h-screen bg-stone-950 text-stone-100 flex flex-col justify-center py-8 px-4 sm:px-6">
      <div className="max-w-md w-full mx-auto bg-stone-900 border border-stone-800 rounded-3xl p-6 sm:p-8 shadow-2xl space-y-6">
        <div className="flex items-center gap-3 border-b border-stone-800 pb-4">
          <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-amber-400 to-amber-600 flex items-center justify-center text-stone-950 shadow-lg shadow-amber-500/20">
            <Scissors className="w-6 h-6" weight="bold" />
          </div>
          <div>
            <h1 className="text-lg font-bold text-stone-100">
              ProntoAgende BR
            </h1>
          </div>
        </div>

        {errorMessage && (
          <div
            role="alert"
            aria-live="assertive"
            className="p-3.5 rounded-2xl bg-rose-500/15 border border-rose-500/40 flex items-start gap-2.5 text-xs text-rose-700"
          >
            <ShieldWarning className="w-5 h-5 text-rose-700 shrink-0 mt-0.5" />
            <span>{errorMessage}</span>
          </div>
        )}

        <form
          method="post"
          action="#login"
          onSubmit={handleSignIn}
          className="space-y-4"
        >
          <div>
            <label
              htmlFor="login-username"
              className="block text-xs font-semibold text-stone-300 mb-1.5"
            >
              Usuário ou E-mail Corporativo *
            </label>
            <input
              id="login-username"
              name="username"
              type="text"
              required
              autoComplete="username"
              autoCorrect="off"
              autoCapitalize="off"
              spellCheck={false}
              enterKeyHint="next"
              value={usernameOrEmail}
              onChange={(e) => {
                setUsernameOrEmail(e.target.value);
                if (errorMessage) setErrorMessage(null);
              }}
              placeholder="Digite seu usuário ou e-mail"
              className="w-full bg-stone-950 border border-stone-800 rounded-xl px-4 py-3 text-base text-stone-100 focus:outline-none focus:border-amber-500"
            />
          </div>

          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label
                htmlFor="current-password"
                className="block text-xs font-semibold text-stone-300"
              >
                Senha de Acesso *
              </label>
              <button
                type="button"
                onClick={() => setShowPassword((prev) => !prev)}
                aria-pressed={showPassword}
                aria-label={showPassword ? 'Ocultar senha' : 'Mostrar senha'}
                className="inline-flex items-center gap-1 text-[11px] text-amber-700 hover:text-amber-800 cursor-pointer"
              >
                {showPassword ? (
                  <>
                    <EyeSlash className="w-3.5 h-3.5" />
                    <span>Ocultar senha</span>
                  </>
                ) : (
                  <>
                    <Eye className="w-3.5 h-3.5" />
                    <span>Mostrar senha</span>
                  </>
                )}
              </button>
            </div>
            <input
              id="current-password"
              name="password"
              type={showPassword ? 'text' : 'password'}
              required
              minLength={8}
              autoComplete="current-password"
              enterKeyHint="next"
              value={password}
              onChange={(e) => {
                setPassword(e.target.value);
                if (errorMessage) setErrorMessage(null);
              }}
              placeholder="Digite sua senha forte"
              className="w-full bg-stone-950 border border-stone-800 rounded-xl px-4 py-3 text-base text-stone-100 focus:outline-none focus:border-amber-500"
            />
          </div>

          <div>
            <label
              htmlFor="security-pin"
              className="block text-xs font-semibold text-stone-300 mb-1.5"
            >
              PIN de Segurança (6 Dígitos) *
            </label>
            <div className="relative">
              <Key className="w-4 h-4 text-amber-700 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                id="security-pin"
                name="security_pin"
                type="password"
                inputMode="numeric"
                autoComplete="one-time-code"
                pattern="\d{6}"
                maxLength={6}
                required
                enterKeyHint="done"
                value={securityPin}
                onChange={(e) => {
                  setSecurityPin(e.target.value.replace(/\D/g, '').slice(0, 6));
                  if (errorMessage) setErrorMessage(null);
                }}
                placeholder="000000"
                className="w-full bg-stone-950 border border-stone-800 rounded-xl pl-10 pr-4 py-3 text-base font-mono tracking-widest text-amber-700 font-bold focus:outline-none focus:border-amber-500"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={isVerifying}
            className="w-full py-3.5 px-5 rounded-xl bg-amber-500 hover:bg-amber-600 disabled:opacity-50 text-stone-950 font-bold text-sm flex items-center justify-center gap-2 shadow-lg shadow-amber-500/15 transition-all cursor-pointer"
          >
            <LockKey className="w-5 h-5" weight="bold" />
            {isVerifying ? 'Autenticando...' : 'Entrar'}
          </button>
        </form>
      </div>
    </div>
  );
};
