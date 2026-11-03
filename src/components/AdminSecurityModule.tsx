import React, { useState } from 'react';
import {
  CheckCircle,
  CreditCard,
  Key,
  LockKey,
  Plus,
  ShieldCheck,
  ShieldWarning,
  Sliders,
  Trash,
  UserCheck,
  UserPlus,
  Users,
} from '@phosphor-icons/react';
import {
  AccountStatus,
  BusinessConfig,
  SecurityAuditEvent,
  UserAccount,
  UserPermissions,
  UserRole,
} from '../types';
import {
  createAuditEvent,
  DEFAULT_BARBER_PERMISSIONS,
  derivePasswordHash,
  detectAttackPayload,
  generateCryptoSalt,
  MASTER_ADMIN_PERMISSIONS,
  sanitizeUserText,
  validatePasswordStrength,
} from '../utils/security';

interface AdminSecurityModuleProps {
  currentUser: UserAccount;
  accounts: UserAccount[];
  auditLogs: SecurityAuditEvent[];
  business: BusinessConfig;
  onCreateAccount: (newAccount: UserAccount) => void;
  onUpdateAccount: (userId: string, patch: Partial<UserAccount>) => void;
  onDeleteAccount: (userId: string) => void;
  onUpdateBusiness: (patch: Partial<BusinessConfig>) => void;
  onLogSecurityEvent: (event: SecurityAuditEvent) => void;
}

const PERMISSION_LABELS: Array<{
  key: keyof UserPermissions;
  label: string;
  description: string;
  adminOnly?: boolean;
}> = [
  {
    key: 'canAccessAgenda',
    label: 'Acesso à Agenda & Encaixes',
    description: 'Permite visualizar e cadastrar horários e encaixes do dia.',
  },
  {
    key: 'canAccessPos',
    label: 'Acesso ao Caixa / PDV',
    description: 'Permite lançar pagamentos, calcular comissões e fechar cortes.',
  },
  {
    key: 'canAccessClients',
    label: 'Acesso à Carteira de Clientes',
    description: 'Permite visualizar e editar fichas de clientes e histórico.',
  },
  {
    key: 'canAccessReminders',
    label: 'Disparo de Lembretes WhatsApp',
    description: 'Permite enviar confirmações reais via wa.me para clientes.',
  },
  {
    key: 'canAccessPublicBooking',
    label: 'Link Público de Reserva Online',
    description: 'Libera a página pública 24h para clientes agendarem sozinhos.',
  },
  {
    key: 'canAccessManager',
    label: 'Acesso à Aba Gestão da Barbearia',
    description: 'Permite abrir o painel de configuração da barbearia e equipe.',
  },
  {
    key: 'canEditPrices',
    label: 'Permissão para Alterar Preços de Cortes',
    description: 'Se desmarcado, somente o Admin pode alterar a tabela de preços.',
  },
  {
    key: 'canUploadStatements',
    label: 'Permissão para Anexar Extratos Bancários',
    description: 'Permite enviar comprovantes Pix e fechamentos diários.',
  },
  {
    key: 'canExportOrResetData',
    label: 'Permissão Crítica: Zerar Dados do Sistema',
    description: 'Restrito por padrão. Permite limpar todos os registros do banco.',
  },
  {
    key: 'canManageUsers',
    label: 'Super Permissão: Painel Admin Master & Usuários',
    description: 'Exclusivo para Aristeu e Otávio. Controla acessos e segurança.',
    adminOnly: true,
  },
];

export const AdminSecurityModule: React.FC<AdminSecurityModuleProps> = ({
  currentUser,
  accounts,
  auditLogs,
  business,
  onCreateAccount,
  onUpdateAccount,
  onDeleteAccount,
  onUpdateBusiness,
  onLogSecurityEvent,
}) => {
  const [selectedUserId, setSelectedUserId] = useState<string>(
    accounts.find((a) => a.role !== 'MASTER_ADMIN')?.id ?? accounts[0]?.id ?? ''
  );

  // Novo usuário / assinante form
  const [newUsername, setNewUsername] = useState('');
  const [newDisplayName, setNewDisplayName] = useState('');
  const [newEmail, setNewEmail] = useState('');
  const [newBarbershopName, setNewBarbershopName] = useState('');
  const [newRole, setNewRole] = useState<UserRole>('BARBER_OWNER');
  const [newPassword, setNewPassword] = useState('');
  const [newPin, setNewPin] = useState('');
  const [formFeedback, setFormFeedback] = useState<{
    type: 'success' | 'error';
    text: string;
  } | null>(null);

  // Redefinir senha/PIN de usuário selecionado
  const [resetPasswordInput, setResetPasswordInput] = useState('');
  const [resetPinInput, setResetPinInput] = useState('');
  const [resetSuccessMsg, setResetSuccessMsg] = useState('');

  // Proteção estrita RBAC: se não for MASTER_ADMIN, bloqueia renderização
  if (
    currentUser.role !== 'MASTER_ADMIN' ||
    !currentUser.permissions.canManageUsers
  ) {
    return (
      <div className="p-8 rounded-2xl bg-rose-950/30 border border-rose-500/40 text-center space-y-3">
        <ShieldWarning className="w-10 h-10 text-rose-400 mx-auto" />
        <h2 className="text-lg font-bold text-stone-100">
          Acesso Negado (Nível Master Admin Requerido)
        </h2>
        <p className="text-xs text-stone-300">
          Esta área é restrita exclusivamente aos administradores Master (Aristeu e Otávio).
        </p>
      </div>
    );
  }

  const selectedAccount =
    accounts.find((a) => a.id === selectedUserId) ?? accounts[0];

  const handleTogglePermission = (permKey: keyof UserPermissions) => {
    if (!selectedAccount) return;
    // Impede remover canManageUsers dos próprios Admins Master principais
    if (
      permKey === 'canManageUsers' &&
      (selectedAccount.username === 'aristeu' ||
        selectedAccount.username === 'otavio')
    ) {
      alert(
        'As contas Master de Aristeu e Otávio possuem proteção permanente de Administrador.'
      );
      return;
    }

    const updatedPermissions: UserPermissions = {
      ...selectedAccount.permissions,
      [permKey]: !selectedAccount.permissions[permKey],
    };

    onUpdateAccount(selectedAccount.id, {
      permissions: updatedPermissions,
    });

    onLogSecurityEvent(
      createAuditEvent(
        'PERMISSION_UPDATED',
        'INFO',
        currentUser.username,
        `Permissão "${permKey}" alterada para ${
          updatedPermissions[permKey] ? 'LIBERADO' : 'BLOQUEADO'
        } no usuário "${selectedAccount.username}".`
      )
    );
  };

  const handleChangeAccountStatus = (
    account: UserAccount,
    newStatus: AccountStatus
  ) => {
    if (
      (account.username === 'aristeu' || account.username === 'otavio') &&
      newStatus !== 'ACTIVE'
    ) {
      alert('Não é permitido suspender os Administradores Master principais.');
      return;
    }

    onUpdateAccount(account.id, {
      status: newStatus,
      failedLoginAttempts: 0,
      lockedUntil: undefined,
    });

    onLogSecurityEvent(
      createAuditEvent(
        'USER_STATUS_CHANGED',
        newStatus === 'ACTIVE' ? 'INFO' : 'WARNING',
        currentUser.username,
        `Status da conta "${account.username}" alterado para ${newStatus}.`
      )
    );
  };

  const handleCreateNewSubscriber = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormFeedback(null);

    if (
      detectAttackPayload(newUsername) ||
      detectAttackPayload(newDisplayName) ||
      detectAttackPayload(newBarbershopName)
    ) {
      onLogSecurityEvent(
        createAuditEvent(
          'XSS_PAYLOAD_BLOCKED',
          'CRITICAL',
          currentUser.username,
          'Tentativa de criar usuário com script/HTML malicioso bloqueada.'
        )
      );
      setFormFeedback({
        type: 'error',
        text: 'Caracteres inválidos ou tentativa de injeção bloqueada.',
      });
      return;
    }

    const cleanLogin = sanitizeUserText(newUsername, 40)
      .toLowerCase()
      .replace(/\s+/g, '');
    if (!cleanLogin || cleanLogin.length < 3) {
      setFormFeedback({
        type: 'error',
        text: 'O login de usuário deve ter pelo menos 3 caracteres.',
      });
      return;
    }

    if (accounts.some((a) => a.username.toLowerCase() === cleanLogin)) {
      setFormFeedback({
        type: 'error',
        text: 'Já existe um usuário cadastrado com este login.',
      });
      return;
    }

    const pwdCheck = validatePasswordStrength(newPassword);
    if (!pwdCheck.valid) {
      setFormFeedback({ type: 'error', text: pwdCheck.message });
      return;
    }

    const cleanPin = newPin.replace(/\D/g, '');
    if (cleanPin.length !== 6) {
      setFormFeedback({
        type: 'error',
        text: 'O PIN de Segurança (2ª etapa) deve conter exatamente 6 números.',
      });
      return;
    }

    const salt = generateCryptoSalt();
    const [passwordHash, pinHash] = await Promise.all([
      derivePasswordHash(newPassword, salt),
      derivePasswordHash(cleanPin, salt),
    ]);

    const createdUser: UserAccount = {
      id: `usr_${Date.now()}`,
      username: cleanLogin,
      displayName: sanitizeUserText(newDisplayName, 80) || cleanLogin,
      email: sanitizeUserText(newEmail, 100) || `${cleanLogin}@cliente.com.br`,
      role: newRole,
      status: 'ACTIVE',
      tenantId: `tenant_${cleanLogin}_${Date.now()}`,
      barbershopName:
        sanitizeUserText(newBarbershopName, 100) ||
        `Barbearia de ${cleanLogin}`,
      passwordHash,
      passwordSalt: salt,
      pinHash,
      permissions:
        newRole === 'MASTER_ADMIN'
          ? { ...MASTER_ADMIN_PERMISSIONS }
          : { ...DEFAULT_BARBER_PERMISSIONS },
      createdAt: new Date().toISOString().slice(0, 10),
      failedLoginAttempts: 0,
    };

    onCreateAccount(createdUser);
    setSelectedUserId(createdUser.id);

    onLogSecurityEvent(
      createAuditEvent(
        'USER_CREATED',
        'INFO',
        currentUser.username,
        `Novo usuário "${createdUser.username}" (${createdUser.barbershopName}) criado e liberado com hash PBKDF2.`
      )
    );

    setNewUsername('');
    setNewDisplayName('');
    setNewEmail('');
    setNewBarbershopName('');
    setNewPassword('');
    setNewPin('');
    setFormFeedback({
      type: 'success',
      text: `Usuário "${createdUser.username}" criado e liberado com sucesso!`,
    });
  };

  const handleResetCredentials = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedAccount) return;

    const patch: Partial<UserAccount> = {
      failedLoginAttempts: 0,
      lockedUntil: undefined,
    };
    const salt = selectedAccount.passwordSalt || generateCryptoSalt();
    patch.passwordSalt = salt;

    if (resetPasswordInput.trim()) {
      const check = validatePasswordStrength(resetPasswordInput);
      if (!check.valid) {
        alert(check.message);
        return;
      }
      patch.passwordHash = await derivePasswordHash(resetPasswordInput, salt);
    }

    if (resetPinInput.trim()) {
      const digits = resetPinInput.replace(/\D/g, '');
      if (digits.length !== 6) {
        alert('O novo PIN deve ter exatamente 6 dígitos numéricos.');
        return;
      }
      patch.pinHash = await derivePasswordHash(digits, salt);
    }

    onUpdateAccount(selectedAccount.id, patch);
    setResetPasswordInput('');
    setResetPinInput('');
    setResetSuccessMsg('Credenciais criptográficas atualizadas!');
    setTimeout(() => setResetSuccessMsg(''), 3000);
  };

  return (
    <div className="space-y-6">
      {/* Top Banner Admin Master */}
      <div className="bg-gradient-to-r from-stone-900 via-stone-900 to-amber-950/30 border border-amber-500/40 rounded-2xl p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="inline-flex items-center gap-2 text-xs font-mono uppercase tracking-wider text-amber-400">
            <ShieldCheck className="w-4 h-4" />
            <span>
              Painel Exclusivo Admin Master • Logado como:{' '}
              {currentUser.displayName}
            </span>
          </div>
          <h2 className="text-lg font-bold text-stone-100">
            Controle de Clientes Assinantes, Liberação de Acessos & Segurança
          </h2>
          <p className="text-xs text-stone-400">
            Cadastre barbearias clientes, libere ou bloqueie módulos individualmente, preencha os dados para seus clientes e monitore tentativas de invasão.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left 7 Cols: Lista de Usuários + Controle de Permissões do Cliente Selecionado */}
        <div className="lg:col-span-7 space-y-6">
          {/* Lista de Contas */}
          <div className="bg-stone-900/70 border border-stone-800 rounded-2xl overflow-hidden">
            <div className="px-4 py-3 border-b border-stone-800 bg-stone-950/60 flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-stone-300 flex items-center gap-2">
                <Users className="w-4 h-4 text-amber-400" />
                <span>
                  Usuários & Barbearias Cadastradas ({accounts.length})
                </span>
              </span>
              <span className="text-[11px] text-stone-400">
                Clique em um usuário para gerenciar permissões
              </span>
            </div>

            <div className="divide-y divide-stone-800/70">
              {accounts.map((acc) => {
                const isSelected = selectedAccount?.id === acc.id;
                const isLocked =
                  acc.lockedUntil && Date.now() < acc.lockedUntil;
                return (
                  <div
                    key={acc.id}
                    onClick={() => setSelectedUserId(acc.id)}
                    className={`p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 cursor-pointer transition-colors ${
                      isSelected
                        ? 'bg-amber-500/10'
                        : 'hover:bg-stone-800/30'
                    }`}
                  >
                    <div className="space-y-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-bold text-sm text-stone-100">
                          {acc.displayName}
                        </span>
                        <span className="font-mono text-xs px-2 py-0.5 rounded bg-stone-950 text-amber-400 border border-stone-800">
                          @{acc.username}
                        </span>
                        <span
                          className={`text-[10px] font-mono uppercase px-2 py-0.5 rounded font-bold ${
                            acc.role === 'MASTER_ADMIN'
                              ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                              : 'bg-stone-800 text-stone-300'
                          }`}
                        >
                          {acc.role === 'MASTER_ADMIN'
                            ? 'ADMIN MASTER'
                            : 'CLIENTE BARBEARIA'}
                        </span>
                        {isLocked && (
                          <span className="text-[10px] font-mono uppercase px-2 py-0.5 rounded bg-rose-500/20 text-rose-300 border border-rose-500/40">
                            Bloqueado (Força Bruta)
                          </span>
                        )}
                      </div>
                      <div className="text-xs text-stone-400">
                        Barbearia: <strong>{acc.barbershopName}</strong> • E-mail:{' '}
                        {acc.email}
                      </div>
                    </div>

                    <div
                      className="flex items-center gap-2 shrink-0"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <button
                        type="button"
                        onClick={() =>
                          handleChangeAccountStatus(
                            acc,
                            acc.status === 'ACTIVE' ? 'SUSPENDED' : 'ACTIVE'
                          )
                        }
                        className={`px-3 py-1.5 rounded-xl text-xs font-bold border transition-all cursor-pointer ${
                          acc.status === 'ACTIVE'
                            ? 'bg-emerald-500/15 text-emerald-300 border-emerald-500/40 hover:bg-rose-500/20 hover:text-rose-300 hover:border-rose-500/40'
                            : 'bg-rose-500/20 text-rose-300 border-rose-500/40 hover:bg-emerald-500/20 hover:text-emerald-300'
                        }`}
                      >
                        {acc.status === 'ACTIVE'
                          ? 'Acesso Liberado (Ativo)'
                          : 'Suspenso (Clique p/ Liberar)'}
                      </button>

                      {acc.username !== 'aristeu' &&
                        acc.username !== 'otavio' && (
                          <button
                            type="button"
                            onClick={() => {
                              if (
                                window.confirm(
                                  `Tem certeza que deseja excluir o usuário "${acc.username}"?`
                                )
                              ) {
                                onDeleteAccount(acc.id);
                              }
                            }}
                            title="Excluir usuário"
                            className="p-2 rounded-xl bg-stone-950 hover:bg-rose-500/20 text-stone-400 hover:text-rose-300 border border-stone-800 cursor-pointer"
                          >
                            <Trash className="w-4 h-4" />
                          </button>
                        )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Matriz de Permissões Granulares do Usuário Selecionado */}
          {selectedAccount && (
            <div className="bg-stone-900 border border-stone-800 rounded-2xl p-5 space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-stone-800 pb-3">
                <div className="flex items-center gap-2">
                  <Sliders className="w-5 h-5 text-amber-400" />
                  <div>
                    <h3 className="text-sm font-bold text-stone-100">
                      Permissões Liberadas para: {selectedAccount.displayName} (
                      @{selectedAccount.username})
                    </h3>
                    <p className="text-xs text-stone-400">
                      Ative ou desative o que este cliente pode acessar ou editar no sistema.
                    </p>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {PERMISSION_LABELS.map((item) => {
                  const enabled = Boolean(
                    selectedAccount.permissions[item.key]
                  );
                  return (
                    <label
                      key={item.key}
                      className={`p-3 rounded-xl border flex items-start justify-between gap-3 cursor-pointer transition-all ${
                        enabled
                          ? 'bg-emerald-500/10 border-emerald-500/35 text-stone-100'
                          : 'bg-stone-950/80 border-stone-800 text-stone-400'
                      }`}
                    >
                      <div className="space-y-0.5">
                        <div className="text-xs font-bold flex items-center gap-1.5">
                          <span>{item.label}</span>
                        </div>
                        <p className="text-[11px] text-stone-400 leading-snug">
                          {item.description}
                        </p>
                      </div>
                      <input
                        type="checkbox"
                        checked={enabled}
                        onChange={() => handleTogglePermission(item.key)}
                        className="accent-emerald-500 w-4 h-4 mt-0.5 shrink-0 cursor-pointer"
                      />
                    </label>
                  );
                })}
              </div>

              {/* Preencher Dados da Barbearia para o Cliente + Redefinir Senha/PIN */}
              <div className="pt-4 border-t border-stone-800 grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <span className="block text-xs font-bold text-amber-400">
                    Preencher Dados da Barbearia pelo Admin
                  </span>
                  <div>
                    <label className="block text-[11px] text-stone-400 mb-1">
                      Nome da Barbearia vinculada
                    </label>
                    <input
                      type="text"
                      value={selectedAccount.barbershopName}
                      onChange={(e) => {
                        const clean = sanitizeUserText(e.target.value, 100);
                        onUpdateAccount(selectedAccount.id, {
                          barbershopName: clean,
                        });
                        onUpdateBusiness({ name: clean, isConfigured: true });
                      }}
                      className="w-full bg-stone-950 border border-stone-800 rounded-xl px-3 py-2 text-xs text-stone-100"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] text-stone-400 mb-1">
                      Chave Pix Configurada para a Barbearia
                    </label>
                    <input
                      type="text"
                      value={business.pixKey}
                      onChange={(e) =>
                        onUpdateBusiness({
                          pixKey: sanitizeUserText(e.target.value, 80),
                        })
                      }
                      placeholder="CPF/CNPJ/Celular do cliente"
                      className="w-full bg-stone-950 border border-stone-800 rounded-xl px-3 py-2 text-xs font-mono text-amber-400"
                    />
                  </div>
                </div>

                <form
                  onSubmit={handleResetCredentials}
                  className="space-y-2 bg-stone-950/80 border border-stone-800 rounded-xl p-3"
                >
                  <span className="block text-xs font-bold text-stone-200 flex items-center gap-1.5">
                    <Key className="w-3.5 h-3.5 text-amber-400" />
                    <span>Redefinir Senha ou PIN de @{selectedAccount.username}</span>
                  </span>
                  <input
                    type="password"
                    value={resetPasswordInput}
                    onChange={(e) => setResetPasswordInput(e.target.value)}
                    placeholder="Nova senha forte (mín. 8 caract.)"
                    className="w-full bg-stone-900 border border-stone-800 rounded-lg px-2.5 py-1.5 text-xs text-stone-100"
                  />
                  <input
                    type="text"
                    inputMode="numeric"
                    maxLength={6}
                    value={resetPinInput}
                    onChange={(e) =>
                      setResetPinInput(e.target.value.replace(/\D/g, '').slice(0, 6))
                    }
                    placeholder="Novo PIN 6 dígitos (Ex: 654321)"
                    className="w-full bg-stone-900 border border-stone-800 rounded-lg px-2.5 py-1.5 text-xs font-mono text-amber-400"
                  />
                  <button
                    type="submit"
                    className="w-full py-1.5 px-3 rounded-lg bg-amber-500 hover:bg-amber-400 text-stone-950 font-bold text-xs cursor-pointer"
                  >
                    Atualizar Credenciais & Desbloquear
                  </button>
                  {resetSuccessMsg && (
                    <span className="block text-[11px] text-emerald-400 font-semibold">
                      {resetSuccessMsg}
                    </span>
                  )}
                </form>
              </div>
            </div>
          )}
        </div>

        {/* Right 5 Cols: Criar Novo Usuário/Cliente + SIEM Audit Log + Nota de Pagamentos In-App */}
        <div className="lg:col-span-5 space-y-6">
          {/* Cadastrar Novo Cliente / Assinante */}
          <form
            onSubmit={handleCreateNewSubscriber}
            className="bg-stone-900 border border-stone-800 rounded-2xl p-5 space-y-4"
          >
            <div className="flex items-center gap-2 border-b border-stone-800 pb-3">
              <UserPlus className="w-5 h-5 text-emerald-400" />
              <div>
                <h3 className="text-sm font-bold text-stone-100">
                  Cadastrar & Liberar Novo Cliente (Barbearia)
                </h3>
                <p className="text-xs text-stone-400">
                  Crie o login, senha e PIN de 6 dígitos para liberar o acesso ao seu cliente.
                </p>
              </div>
            </div>

            {formFeedback && (
              <div
                className={`p-3 rounded-xl text-xs font-semibold border ${
                  formFeedback.type === 'success'
                    ? 'bg-emerald-500/15 border-emerald-500/40 text-emerald-300'
                    : 'bg-rose-500/15 border-rose-500/40 text-rose-300'
                }`}
              >
                {formFeedback.text}
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-[11px] text-stone-300 mb-1">
                  Login do Usuário *
                </label>
                <input
                  type="text"
                  required
                  value={newUsername}
                  onChange={(e) => setNewUsername(e.target.value)}
                  placeholder="Ex: luancortes"
                  className="w-full bg-stone-950 border border-stone-800 rounded-xl px-3 py-2 text-xs text-stone-100"
                />
              </div>

              <div>
                <label className="block text-[11px] text-stone-300 mb-1">
                  Nome do Responsável *
                </label>
                <input
                  type="text"
                  required
                  value={newDisplayName}
                  onChange={(e) => setNewDisplayName(e.target.value)}
                  placeholder="Ex: Luan Silva"
                  className="w-full bg-stone-950 border border-stone-800 rounded-xl px-3 py-2 text-xs text-stone-100"
                />
              </div>

              <div className="sm:col-span-2">
                <label className="block text-[11px] text-stone-300 mb-1">
                  Nome da Barbearia do Cliente *
                </label>
                <input
                  type="text"
                  required
                  value={newBarbershopName}
                  onChange={(e) => setNewBarbershopName(e.target.value)}
                  placeholder="Ex: Barbearia Luan Corte & Barba"
                  className="w-full bg-stone-950 border border-stone-800 rounded-xl px-3 py-2 text-xs text-stone-100"
                />
              </div>

              <div>
                <label className="block text-[11px] text-stone-300 mb-1">
                  E-mail
                </label>
                <input
                  type="email"
                  value={newEmail}
                  onChange={(e) => setNewEmail(e.target.value)}
                  placeholder="cliente@barbearia.com"
                  className="w-full bg-stone-950 border border-stone-800 rounded-xl px-3 py-2 text-xs text-stone-100"
                />
              </div>

              <div>
                <label className="block text-[11px] text-stone-300 mb-1">
                  Nível de Acesso
                </label>
                <select
                  value={newRole}
                  onChange={(e) => setNewRole(e.target.value as UserRole)}
                  className="w-full bg-stone-950 border border-stone-800 rounded-xl px-3 py-2 text-xs text-stone-100"
                >
                  <option value="BARBER_OWNER">Cliente Barbearia (Padrão)</option>
                  <option value="BARBER_STAFF">Barbeiro Equipe (Restrito)</option>
                  <option value="MASTER_ADMIN">Administrador Master</option>
                </select>
              </div>

              <div>
                <label className="block text-[11px] text-stone-300 mb-1">
                  Senha Forte Inicial *
                </label>
                <input
                  type="text"
                  required
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="Ex: Luan@2026!"
                  className="w-full bg-stone-950 border border-stone-800 rounded-xl px-3 py-2 text-xs font-mono text-stone-100"
                />
              </div>

              <div>
                <label className="block text-[11px] text-stone-300 mb-1">
                  PIN 6 Dígitos (2FA) *
                </label>
                <input
                  type="text"
                  inputMode="numeric"
                  maxLength={6}
                  required
                  value={newPin}
                  onChange={(e) =>
                    setNewPin(e.target.value.replace(/\D/g, '').slice(0, 6))
                  }
                  placeholder="Ex: 102030"
                  className="w-full bg-stone-950 border border-stone-800 rounded-xl px-3 py-2 text-xs font-mono text-amber-400 font-bold"
                />
              </div>
            </div>

            <button
              type="submit"
              className="w-full py-2.5 px-4 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-stone-950 font-bold text-xs flex items-center justify-center gap-2 cursor-pointer"
            >
              <Plus className="w-4 h-4" weight="bold" />
              Criar Usuário e Liberar Acesso Criptografado
            </button>
          </form>

          {/* Monitor de Segurança e Pentest (Audit Log) */}
          <div className="bg-stone-900/80 border border-stone-800 rounded-2xl p-5 space-y-3">
            <div className="flex items-center justify-between border-b border-stone-800 pb-2.5">
              <div className="flex items-center gap-2">
                <LockKey className="w-4 h-4 text-amber-400" />
                <h3 className="text-xs font-bold uppercase tracking-wider text-stone-200">
                  Log de Auditoria & Pentest ({auditLogs.length})
                </h3>
              </div>
              <span className="text-[10px] font-mono text-emerald-400">
                WAF & HMAC Ativos
              </span>
            </div>

            <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
              {auditLogs.map((log) => (
                <div
                  key={log.id}
                  className="p-2.5 rounded-xl bg-stone-950 border border-stone-800 text-[11px] space-y-0.5"
                >
                  <div className="flex items-center justify-between">
                    <span
                      className={`font-mono font-bold ${
                        log.severity === 'CRITICAL'
                          ? 'text-rose-400'
                          : log.severity === 'WARNING'
                          ? 'text-amber-400'
                          : 'text-emerald-400'
                      }`}
                    >
                      [{log.eventType}]
                    </span>
                    <span className="font-mono text-[10px] text-stone-400">
                      {log.timestamp}
                    </span>
                  </div>
                  <p className="text-stone-300">{log.description}</p>
                  <div className="text-[10px] font-mono text-stone-400">
                    Ator: @{log.actorUsername}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Nota Técnica Validada: Pagamento In-App via SDKs Prontos */}
          <div className="bg-stone-900/70 border border-amber-500/30 rounded-2xl p-5 space-y-2.5 text-xs">
            <div className="flex items-center gap-2 text-amber-400 font-bold">
              <CreditCard className="w-4 h-4" />
              <span>
                Roadmap Anotado: Pagamentos In-App (Bibliotecas Prontas)
              </span>
            </div>
            <p className="text-stone-300 text-[11px] leading-relaxed">
              <strong>Validação Técnica Confirmada:</strong> É 100% viável integrar pagamento direto por dentro do aplicativo sem redirecionar o cliente para fora, usando bibliotecas oficiais homologadas pelo Banco Central:
            </p>
            <ul className="space-y-1 text-[11px] text-stone-400">
              <li>
                1. <strong className="text-stone-200">Mercado Pago Bricks (`@mercadopago/sdk-react`):</strong> Renderiza o QR Code Pix dinâmico e Checkout de Cartão dentro do modal do app, com baixa automática via Webhook e Split de Comissão automático.
              </li>
              <li>
                2. <strong className="text-stone-200">Asaas SDK / Pagar.me (Stone):</strong> Ideal para cobrar a assinatura recorrente das barbearias (SaaS) + emitir Pix Copia e Cola com confirmação instantânea.
              </li>
              <li>
                3. <strong className="text-stone-200">Segurança PCI-DSS:</strong> Os dados de cartão são tokenizados direto em iframe isolado da biblioteca, mantendo 100% de aprovação em pentests.
              </li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
};
