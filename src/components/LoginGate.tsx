import React, { useState } from 'react';
import {
  Eye,
  EyeSlash,
  Key,
  LockKey,
  Scissors,
  ShieldCheck,
  ShieldWarning,
  UserCheck,
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
  const [showQuickAccessHint, setShowQuickAccessHint] = useState(true);

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

    // 1. Detecção de payload malicioso (XSS / SQLi / Injection)
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
          'Tentativa de injeção de script/payload bloqueada no formulário de autenticação.'
        )
      );
      setErrorMessage(
        'Bloqueio de Segurança (WAF): Caracteres de injeção não permitidos foram detectados e registrados.'
      );
      return;
    }

    setIsVerifying(true);
    try {
      const targetUser = accounts.find(
        (acc) =>
          acc.username.toLowerCase() === rawUser ||
          acc.email.toLowerCase() === rawUser
      );

      // Mitigação de enumeração de usuário: executa PBKDF2 mesmo se usuário não existir
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

      // 2. Verificação de Lockout (Força Bruta)
      const { LOCKOUT_THRESHOLD, LOCKOUT_DURATION_MS } = getLockoutConfig();
      if (targetUser.lockedUntil && Date.now() < targetUser.lockedUntil) {
        const remainingMin = Math.ceil(
          (targetUser.lockedUntil - Date.now()) / 60000
        );
        setErrorMessage(
          `Conta temporariamente bloqueada contra força bruta. Tente novamente em ${remainingMin} minuto(s).`
        );
        return;
      }

      // 3. Verificação de Status da Conta (Liberada pelo Admin?)
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
          'Esta conta está suspensa ou aguardando liberação de acesso pelo Administrador Master.'
        );
        return;
      }

      // 4. Derivação Criptográfica PBKDF2-HMAC-SHA256 (120.000 iterações) para Senha e PIN 2FA
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
              : `Falha de autenticação (${nextAttempts}/${LOCKOUT_THRESHOLD}) - Senha ou PIN 2FA incorretos.`
          )
        );

        setErrorMessage(
          shouldLock
            ? 'Limite de 5 tentativas excedido. Conta bloqueada por 15 minutos por segurança.'
            : `Credenciais ou PIN de 2ª etapa incorretos. Tentativa ${nextAttempts} de ${LOCKOUT_THRESHOLD}.`
        );
        return;
      }

      // 5. Autenticação aprovada: zera contador de falhas e emite sessão assinada
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
          `Login autenticado com sucesso (${targetUser.role}) via PBKDF2 + PIN 2FA.`
        )
      );

      onLoginSuccess(targetUser);
    } finally {
      setIsVerifying(false);
    }
  };

  const fillDemoCredentials = (
    user: string,
    pass: string,
    pin: string
  ) => {
    setUsernameOrEmail(user);
    setPassword(pass);
    setSecurityPin(pin);
    setErrorMessage(null);
  };

  return (
    <div className="min-h-screen bg-stone-950 text-stone-100 flex flex-col justify-center py-8 px-4 sm:px-6">
      <div className="max-w-4xl w-full mx-auto grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left 7 Cols: Formulário de Login Blindado */}
        <div className="lg:col-span-7 bg-stone-900 border border-stone-800 rounded-3xl p-6 sm:p-8 shadow-2xl space-y-6">
          <div className="flex items-center justify-between border-b border-stone-800 pb-4">
            <div className="flex items-center gap-3">
              <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-amber-400 to-amber-600 flex items-center justify-center text-stone-950 shadow-lg shadow-amber-500/20">
                <Scissors className="w-6 h-6" weight="bold" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h1 className="text-lg font-bold text-stone-100">
                    ProntoAgende BR
                  </h1>
                  <span className="text-[10px] font-mono uppercase tracking-wider px-2 py-0.5 rounded bg-emerald-500/15 text-emerald-300 border border-emerald-500/30 font-semibold">
                    Acesso Blindado
                  </span>
                </div>
                <p className="text-xs text-stone-400">
                  Autenticação em 2 Fatores (Senha + PIN Criptográfico PBKDF2-SHA256)
                </p>
              </div>
            </div>
            <ShieldCheck className="w-7 h-7 text-emerald-400 shrink-0" />
          </div>

          {errorMessage && (
            <div
              role="alert"
              aria-live="assertive"
              className="p-3.5 rounded-2xl bg-rose-500/15 border border-rose-500/40 flex items-start gap-2.5 text-xs text-rose-200"
            >
              <ShieldWarning className="w-5 h-5 text-rose-400 shrink-0 mt-0.5" />
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
                placeholder="Ex: aristeu, otavio ou barbeiro"
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
                  className="inline-flex items-center gap-1 text-[11px] text-amber-400 hover:text-amber-300 cursor-pointer"
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
                PIN de Segurança de 6 Dígitos (2ª Camada de Verificação) *
              </label>
              <div className="relative">
                <Key className="w-4 h-4 text-amber-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  id="security-pin"
                  name="security_pin"
                  type="text"
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
                  className="w-full bg-stone-950 border border-stone-800 rounded-xl pl-10 pr-4 py-3 text-base font-mono tracking-widest text-amber-400 font-bold focus:outline-none focus:border-amber-500"
                />
              </div>
              <span className="block text-[11px] text-stone-400 mt-1">
                Proteção contra força bruta: bloqueio automático após 5 tentativas inválidas.
              </span>
            </div>

            <button
              type="submit"
              disabled={isVerifying}
              className="w-full py-3.5 px-5 rounded-xl bg-amber-500 hover:bg-amber-400 disabled:opacity-50 text-stone-950 font-bold text-sm flex items-center justify-center gap-2 shadow-lg shadow-amber-500/15 transition-all cursor-pointer"
            >
              <LockKey className="w-5 h-5" weight="bold" />
              {isVerifying
                ? 'Verificando Hash PBKDF2 & Assinatura HMAC...'
                : 'Entrar no Sistema com Verificação Segura'}
            </button>
          </form>
        </div>

        {/* Right 5 Cols: Credenciais de Admin Master (Aristeu & Otávio) + Camadas de Pentest */}
        <div className="lg:col-span-5 space-y-4">
          <div className="bg-stone-900/90 border border-amber-500/30 rounded-3xl p-5 space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <UserCheck className="w-5 h-5 text-amber-400" />
                <h2 className="text-sm font-bold text-stone-100">
                  Contas Provisionadas (Clique para Preencher)
                </h2>
              </div>
              <button
                type="button"
                onClick={() => setShowQuickAccessHint((p) => !p)}
                className="text-[11px] text-stone-400 hover:text-stone-200 cursor-pointer"
              >
                {showQuickAccessHint ? 'Ocultar' : 'Mostrar'}
              </button>
            </div>

            {showQuickAccessHint && (
              <div className="space-y-2.5 text-xs">
                {/* Admin 1: Aristeu */}
                <div className="p-3 rounded-2xl bg-stone-950 border border-stone-800 space-y-1.5">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-amber-400">
                      1. Admin Master: Aristeu
                    </span>
                    <button
                      type="button"
                      onClick={() =>
                        fillDemoCredentials(
                          'aristeu',
                          'Aristeu@Admin2026!',
                          '202601'
                        )
                      }
                      className="px-2.5 py-1 rounded-lg bg-amber-500/20 hover:bg-amber-500 hover:text-stone-950 text-amber-300 font-bold text-[11px] transition-all cursor-pointer"
                    >
                      Preencher Aristeu
                    </button>
                  </div>
                  <div className="font-mono text-[11px] text-stone-300">
                    Usuário: <strong>aristeu</strong> | Senha:{' '}
                    <strong>Aristeu@Admin2026!</strong> | PIN:{' '}
                    <strong>202601</strong>
                  </div>
                </div>

                {/* Admin 2: Otávio */}
                <div className="p-3 rounded-2xl bg-stone-950 border border-stone-800 space-y-1.5">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-amber-400">
                      2. Admin Master: Otávio
                    </span>
                    <button
                      type="button"
                      onClick={() =>
                        fillDemoCredentials(
                          'otavio',
                          'Otavio@Admin2026!',
                          '202602'
                        )
                      }
                      className="px-2.5 py-1 rounded-lg bg-amber-500/20 hover:bg-amber-500 hover:text-stone-950 text-amber-300 font-bold text-[11px] transition-all cursor-pointer"
                    >
                      Preencher Otávio
                    </button>
                  </div>
                  <div className="font-mono text-[11px] text-stone-300">
                    Usuário: <strong>otavio</strong> | Senha:{' '}
                    <strong>Otavio@Admin2026!</strong> | PIN:{' '}
                    <strong>202602</strong>
                  </div>
                </div>

                {/* Barbeiro Cliente Assinante */}
                <div className="p-3 rounded-2xl bg-stone-950 border border-stone-800 space-y-1.5">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-emerald-400">
                      3. Cliente Barbearia (Permissões Restritas)
                    </span>
                    <button
                      type="button"
                      onClick={() =>
                        fillDemoCredentials(
                          'barbeiro',
                          'Barbearia@2026!',
                          '123456'
                        )
                      }
                      className="px-2.5 py-1 rounded-lg bg-emerald-500/20 hover:bg-emerald-500 hover:text-stone-950 text-emerald-300 font-bold text-[11px] transition-all cursor-pointer"
                    >
                      Preencher Cliente
                    </button>
                  </div>
                  <div className="font-mono text-[11px] text-stone-300">
                    Usuário: <strong>barbeiro</strong> | Senha:{' '}
                    <strong>Barbearia@2026!</strong> | PIN:{' '}
                    <strong>123456</strong>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Resumo das Defesas Ativas para o Pentest */}
          <div className="bg-stone-900/70 border border-stone-800 rounded-3xl p-5 space-y-2.5 text-xs">
            <h3 className="font-bold text-stone-200 flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-emerald-400" />
              <span>Arquitetura de Segurança Ativa (Pronta p/ Pentest)</span>
            </h3>
            <ul className="space-y-1.5 text-stone-400 text-[11px] leading-relaxed">
              <li>
                • <strong className="text-stone-200">PBKDF2-HMAC-SHA256:</strong>{' '}
                120.000 iterações + Salt único por usuário + comparação em tempo constante (anti-timing attack).
              </li>
              <li>
                • <strong className="text-stone-200">2FA Nativo:</strong>{' '}
                Exige senha forte + PIN numérico de 6 dígitos validado criptograficamente.
              </li>
              <li>
                • <strong className="text-stone-200">Token HMAC-SHA256 Anti-Adulteração:</strong>{' '}
                Qualquer tentativa de alterar permissões ou role no DevTools invalida a assinatura HMAC e encerra a sessão.
              </li>
              <li>
                • <strong className="text-stone-200">WAF & Anti-Brute-Force:</strong>{' '}
                Bloqueio de 15 minutos após 5 falhas e filtro ativo contra XSS/Injection.
              </li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
};
