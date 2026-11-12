import React, { useMemo, useState } from 'react';
import {
  Buildings as Building2,
  Check,
  FileText,
  Paperclip,
  Plus,
  ArrowCounterClockwise as RotateCcw,
  Scissors,
  Sliders,
  Trash as Trash2,
  TrendUp as TrendingUp,
  Users,
} from '@phosphor-icons/react';
import {
  Appointment,
  BankStatementEntry,
  BusinessConfig,
  FeeSplitRule,
  PosTransaction,
  ServiceItem,
  StaffMember,
  UserPermissions,
} from '../types';
import { FEE_SPLIT_RULE_LABELS, formatCurrencyBRL } from '../utils/finance';
import { sanitizeUserText, validateSafeReceiptFile } from '../utils/security';
import { ScheduleSettings } from './ScheduleSettings';

interface ManagerDashboardModuleProps {
  business: BusinessConfig;
  staff: StaffMember[];
  services: ServiceItem[];
  appointments: Appointment[];
  transactions: PosTransaction[];
  bankStatements: BankStatementEntry[];
  userPermissions?: UserPermissions;
  onUpdateBusiness: (patch: Partial<BusinessConfig>) => void;
  onUpdateService: (serviceId: string, patch: Partial<ServiceItem>) => void;
  onAddService: (service: Omit<ServiceItem, 'id'>) => void;
  onDeleteService: (serviceId: string) => void;
  onUpdateStaff: (staffId: string, patch: Partial<StaffMember>) => void;
  onAddStaff: (member: Omit<StaffMember, 'id'>) => void;
  onDeleteStaff: (staffId: string) => void;
  onAddBankStatement: (entry: Omit<BankStatementEntry, 'id'>) => void;
  onDeleteBankStatement: (entryId: string) => void;
  onResetAllData: () => void;
}

export const ManagerDashboardModule: React.FC<ManagerDashboardModuleProps> = ({
  business,
  staff,
  services,
  appointments,
  transactions,
  bankStatements,
  userPermissions,
  onUpdateBusiness,
  onUpdateService,
  onAddService,
  onDeleteService,
  onUpdateStaff,
  onAddStaff,
  onDeleteStaff,
  onAddBankStatement,
  onDeleteBankStatement,
  onResetAllData,
}) => {
  // New Service state
  const [newSrvName, setNewSrvName] = useState('');
  const [newSrvPrice, setNewSrvPrice] = useState('45');
  const [newSrvDuration, setNewSrvDuration] = useState('40');

  // New Staff state
  const [newStaffName, setNewStaffName] = useState('');
  const [newStaffChair, setNewStaffChair] = useState('Cadeira 02');
  const [newStaffComm, setNewStaffComm] = useState('50');

  // Bank Statement / Comprovante state
  const [stmtDesc, setStmtDesc] = useState('');
  const [stmtAmount, setStmtAmount] = useState('');
  const [stmtType, setStmtType] =
    useState<BankStatementEntry['type']>('EXTRATO_BANCARIO');
  const [stmtFileName, setStmtFileName] = useState('');
  const [savedBanner, setSavedBanner] = useState(false);

  const metrics = useMemo(() => {
    const grossRevenue = transactions.reduce(
      (acc, tx) => acc + tx.totalAmount,
      0
    );
    const totalSalonNet = transactions.reduce(
      (acc, tx) => acc + tx.salonNetShare,
      0
    );
    const totalStaffPayout = transactions.reduce(
      (acc, tx) => acc + tx.staffNetCommission,
      0
    );
    const totalStatements = bankStatements.reduce(
      (acc, st) => acc + st.amount,
      0
    );

    return {
      grossRevenue,
      totalSalonNet,
      totalStaffPayout,
      totalStatements,
    };
  }, [transactions, bankStatements]);

  const canEditPrices = userPermissions?.canEditPrices ?? true;
  const canUploadStatements = userPermissions?.canUploadStatements ?? true;
  const canResetData = userPermissions?.canExportOrResetData ?? false;

  const handleAddServiceForm = (e: React.FormEvent) => {
    e.preventDefault();
    if (!canEditPrices) {
      alert('Sua conta não possui permissão para alterar a tabela de preços. Solicite ao Administrador.');
      return;
    }
    if (!newSrvName.trim()) return;
    onAddService({
      name: sanitizeUserText(newSrvName.trim(), 80),
      category: 'CABELO',
      durationMinutes: Math.max(10, Number(newSrvDuration) || 30),
      bufferAfterMinutes: 5,
      price: Math.max(0, Number(newSrvPrice) || 0),
      customCommissionPct: 50,
      assistantSharePct: 0,
    });
    setNewSrvName('');
    setNewSrvPrice('45');
  };

  const handleAddStaffForm = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newStaffName.trim()) return;
    const initials = newStaffName
      .trim()
      .split(' ')
      .map((p) => p[0])
      .join('')
      .slice(0, 2)
      .toUpperCase();

    onAddStaff({
      name: newStaffName.trim(),
      role: 'PROFESSIONAL',
      specialty: 'Corte & Barba',
      chairLabel: newStaffChair.trim() || 'Cadeira',
      defaultServiceCommissionPct: Math.min(
        100,
        Math.max(0, Number(newStaffComm) || 50)
      ),
      defaultProductCommissionPct: 10,
      acceptsWalkIns: true,
      workingHours: '09:00 - 20:00',
      avatarInitials: initials || 'BB',
    });
    setNewStaffName('');
  };

  const handleAddStatementForm = (e: React.FormEvent) => {
    e.preventDefault();
    if (!canUploadStatements) {
      alert('Permissão para anexar extratos desativada pelo Administrador.');
      return;
    }
    if (!stmtDesc.trim() || !stmtAmount.trim()) return;
    onAddBankStatement({
      date: new Date().toLocaleDateString('pt-BR'),
      description: sanitizeUserText(stmtDesc.trim(), 120),
      amount: Math.max(0, Number(stmtAmount) || 0),
      type: stmtType,
      attachmentName: stmtFileName || undefined,
    });
    setStmtDesc('');
    setStmtAmount('');
    setStmtFileName('');
  };

  const triggerSavedToast = () => {
    onUpdateBusiness({ isConfigured: true });
    setSavedBanner(true);
    setTimeout(() => setSavedBanner(false), 2500);
  };

  return (
    <div className="space-y-6">
      {/* KPIs do Dia */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-stone-900/70 border border-stone-800/80 rounded-2xl p-4 space-y-1">
          <div className="flex items-center justify-between text-xs text-stone-400">
            <span>Faturamento no Caixa</span>
            <TrendingUp className="w-4 h-4 text-emerald-700" />
          </div>
          <div className="text-2xl font-bold font-mono text-stone-100">
            {formatCurrencyBRL(metrics.grossRevenue)}
          </div>
          <div className="text-[11px] text-stone-400">
            {transactions.length} cortes pagos no Caixa
          </div>
        </div>

        <div className="bg-stone-900/70 border border-stone-800/80 rounded-2xl p-4 space-y-1">
          <div className="flex items-center justify-between text-xs text-stone-400">
            <span>Lucro Líquido da Barbearia</span>
            <Building2 className="w-4 h-4 text-amber-700" />
          </div>
          <div className="text-2xl font-bold font-mono text-amber-700">
            {formatCurrencyBRL(metrics.totalSalonNet)}
          </div>
          <div className="text-[11px] text-stone-400">
            Repasse barbeiros: {formatCurrencyBRL(metrics.totalStaffPayout)}
          </div>
        </div>

        <div className="bg-stone-900/70 border border-stone-800/80 rounded-2xl p-4 space-y-1">
          <div className="flex items-center justify-between text-xs text-stone-400">
            <span>Extratos / Comprovantes</span>
            <FileText className="w-4 h-4 text-sky-400" />
          </div>
          <div className="text-2xl font-bold font-mono text-sky-400">
            {formatCurrencyBRL(metrics.totalStatements)}
          </div>
          <div className="text-[11px] text-stone-400">
            {bankStatements.length} comprovante(s) anexados
          </div>
        </div>

        <div className="bg-stone-900/70 border border-stone-800/80 rounded-2xl p-4 space-y-1">
          <div className="flex items-center justify-between text-xs text-stone-400">
            <span>Agendamentos Registrados</span>
            <Scissors className="w-4 h-4 text-emerald-700" />
          </div>
          <div className="text-2xl font-bold font-mono text-stone-100">
            {appointments.length}
          </div>
          <div className="text-[11px] text-stone-400">
            {services.length} serviços cadastrados
          </div>
        </div>
      </div>

      {/* BLOCO 1: Dados da Sua Barbearia (100% Editável) */}
      <div className="bg-stone-900 border border-stone-800 rounded-2xl p-5 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-stone-800 pb-3">
          <div className="flex items-center gap-2">
            <Building2 className="w-5 h-5 text-amber-700" />
            <div>
              <h3 className="text-base font-bold text-stone-100">
                1. Dados da Sua Barbearia (Edite o Nome, WhatsApp e Pix)
              </h3>
              <p className="text-xs text-stone-400">
                Tudo o que você digitar aqui atualiza na hora o topo do sistema e o seu Link de Reserva.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={triggerSavedToast}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-600 text-stone-950 font-bold text-xs transition-all cursor-pointer shrink-0"
          >
            <Check className="w-4 h-4" />
            {savedBanner ? 'Dados Salvos!' : 'Salvar Dados da Barbearia'}
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          <div>
            <label className="block text-xs font-medium text-stone-300 mb-1">
              Nome da Barbearia / Estúdio
            </label>
            <input
              type="text"
              value={business.name}
              onChange={(e) =>
                onUpdateBusiness({ name: e.target.value, isConfigured: true })
              }
              placeholder="Ex: Luan Corte e Barba"
              className="w-full bg-stone-950 border border-stone-800 rounded-xl px-3.5 py-2.5 text-sm font-semibold text-stone-100 focus:outline-none focus:border-amber-500"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-stone-300 mb-1">
              WhatsApp da Barbearia (com DDD)
            </label>
            <input
              type="tel"
              value={business.phone}
              onChange={(e) => onUpdateBusiness({ phone: e.target.value })}
              placeholder="Ex: (11) 99999-9999"
              className="w-full bg-stone-950 border border-stone-800 rounded-xl px-3.5 py-2.5 text-sm font-mono text-stone-100 focus:outline-none focus:border-amber-500"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-stone-300 mb-1">
              Chave Pix da Barbearia (Para Sinal / Caixa)
            </label>
            <input
              type="text"
              value={business.pixKey}
              onChange={(e) => onUpdateBusiness({ pixKey: e.target.value })}
              placeholder="CPF, CNPJ, Celular ou E-mail"
              className="w-full bg-stone-950 border border-stone-800 rounded-xl px-3.5 py-2.5 text-sm font-mono text-amber-700 focus:outline-none focus:border-amber-500"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-stone-300 mb-1">
              Endereço Completo
            </label>
            <input
              type="text"
              value={business.address}
              onChange={(e) => onUpdateBusiness({ address: e.target.value })}
              placeholder="Ex: Rua das Palmeiras, 120"
              className="w-full bg-stone-950 border border-stone-800 rounded-xl px-3.5 py-2.5 text-sm text-stone-100 focus:outline-none focus:border-amber-500"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-stone-300 mb-1">
              Bairro
            </label>
            <input
              type="text"
              value={business.neighborhood}
              onChange={(e) =>
                onUpdateBusiness({ neighborhood: e.target.value })
              }
              placeholder="Ex: Centro"
              className="w-full bg-stone-950 border border-stone-800 rounded-xl px-3.5 py-2.5 text-sm text-stone-100 focus:outline-none focus:border-amber-500"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-stone-300 mb-1">
              Cidade - UF
            </label>
            <input
              type="text"
              value={business.cityState}
              onChange={(e) => onUpdateBusiness({ cityState: e.target.value })}
              placeholder="Ex: São Paulo - SP"
              className="w-full bg-stone-950 border border-stone-800 rounded-xl px-3.5 py-2.5 text-sm text-stone-100 focus:outline-none focus:border-amber-500"
            />
          </div>
        </div>
      </div>

      {/* BLOCO 2: Tabela de Preços dos Cortes & Serviços + Equipe */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left 7 Cols: Tabela de Preços Editável */}
        <div className="lg:col-span-7 bg-stone-900/70 border border-stone-800 rounded-2xl p-5 space-y-4">
          <div className="flex items-center justify-between border-b border-stone-800 pb-3">
            <div className="flex items-center gap-2">
              <Scissors className="w-4 h-4 text-amber-700" />
              <div>
                <h3 className="text-sm font-bold text-stone-100">
                  2. Tabela de Preços dos Cortes e Serviços
                </h3>
                <p className="text-xs text-stone-400">
                  Altere o nome, o tempo ou o preço (R$) de qualquer serviço abaixo.
                </p>
              </div>
            </div>
          </div>

          <div className="space-y-2.5">
            {services.map((srv) => (
              <div
                key={srv.id}
                className="grid grid-cols-12 gap-2 items-center bg-stone-950/90 border border-stone-800 rounded-xl p-2.5"
              >
                <div className="col-span-6">
                  <label className="block text-[10px] text-stone-400">
                    Nome do Serviço
                  </label>
                  <input
                    type="text"
                    value={srv.name}
                    onChange={(e) =>
                      onUpdateService(srv.id, { name: e.target.value })
                    }
                    className="w-full bg-transparent text-xs font-semibold text-stone-100 focus:outline-none border-b border-transparent focus:border-amber-500 py-0.5"
                  />
                </div>
                <div className="col-span-2">
                  <label className="block text-[10px] text-stone-400">
                    Minutos
                  </label>
                  <input
                    type="number"
                    min="5"
                    step="5"
                    value={srv.durationMinutes}
                    onChange={(e) =>
                      onUpdateService(srv.id, {
                        durationMinutes: Math.max(
                          5,
                          Number(e.target.value) || 30
                        ),
                      })
                    }
                    className="w-full bg-transparent text-xs font-mono text-stone-200 focus:outline-none border-b border-transparent focus:border-amber-500 py-0.5"
                  />
                </div>
                <div className="col-span-3">
                  <label className="block text-[10px] text-stone-400">
                    Valor (R$)
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="1"
                    disabled={!canEditPrices}
                    value={srv.price}
                    onChange={(e) =>
                      onUpdateService(srv.id, {
                        price: Math.max(0, Number(e.target.value) || 0),
                      })
                    }
                    className="w-full bg-transparent text-xs font-mono font-bold text-amber-700 disabled:opacity-50 focus:outline-none border-b border-transparent focus:border-amber-500 py-0.5"
                  />
                </div>
                <div className="col-span-1 flex justify-end">
                  <button
                    type="button"
                    onClick={() => onDeleteService(srv.id)}
                    disabled={services.length <= 1}
                    title="Remover serviço"
                    className="p-1.5 rounded-lg text-stone-500 hover:text-rose-700 disabled:opacity-30 cursor-pointer"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ))}
          </div>

          {/* Adicionar Novo Serviço */}
          <form
            onSubmit={handleAddServiceForm}
            className="pt-3 border-t border-stone-800 grid grid-cols-1 sm:grid-cols-12 gap-2 items-end"
          >
            <div className="sm:col-span-6">
              <label className="block text-[11px] text-stone-400 mb-1">
                Novo Serviço (Ex: Sobrancelha, Platinado)
              </label>
              <input
                type="text"
                value={newSrvName}
                onChange={(e) => setNewSrvName(e.target.value)}
                placeholder="Digite o nome do serviço..."
                className="w-full bg-stone-950 border border-stone-800 rounded-xl px-3 py-2 text-xs text-stone-100 focus:outline-none focus:border-amber-500"
              />
            </div>
            <div className="sm:col-span-2">
              <label className="block text-[11px] text-stone-400 mb-1">
                Minutos
              </label>
              <input
                type="number"
                value={newSrvDuration}
                onChange={(e) => setNewSrvDuration(e.target.value)}
                className="w-full bg-stone-950 border border-stone-800 rounded-xl px-2.5 py-2 text-xs font-mono text-stone-100 focus:outline-none focus:border-amber-500"
              />
            </div>
            <div className="sm:col-span-2">
              <label className="block text-[11px] text-stone-400 mb-1">
                Preço (R$)
              </label>
              <input
                type="number"
                step="0.5"
                value={newSrvPrice}
                onChange={(e) => setNewSrvPrice(e.target.value)}
                className="w-full bg-stone-950 border border-stone-800 rounded-xl px-2.5 py-2 text-xs font-mono text-amber-700 font-bold focus:outline-none focus:border-amber-500"
              />
            </div>
            <div className="sm:col-span-2">
              <button
                type="submit"
                className="w-full inline-flex items-center justify-center gap-1 py-2 px-3 rounded-xl bg-amber-500 hover:bg-amber-600 text-stone-950 font-bold text-xs cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                Adicionar
              </button>
            </div>
          </form>
        </div>

        {/* Right 5 Cols: Barbeiros / Profissionais Editáveis */}
        <div className="lg:col-span-5 bg-stone-900/70 border border-stone-800 rounded-2xl p-5 space-y-4">
          <div className="flex items-center gap-2 border-b border-stone-800 pb-3">
            <Users className="w-4 h-4 text-amber-700" />
            <div>
              <h3 className="text-sm font-bold text-stone-100">
                3. Barbeiros e Comissão (%)
              </h3>
              <p className="text-xs text-stone-400">
                Edite o nome dos profissionais da barbearia e a comissão de cada um.
              </p>
            </div>
          </div>

          <div className="space-y-2.5">
            {staff.map((member) => (
              <div
                key={member.id}
                className="grid grid-cols-12 gap-2 items-center bg-stone-950/90 border border-stone-800 rounded-xl p-2.5"
              >
                <div className="col-span-6">
                  <label className="block text-[10px] text-stone-400">
                    Nome do Barbeiro
                  </label>
                  <input
                    type="text"
                    value={member.name}
                    onChange={(e) =>
                      onUpdateStaff(member.id, { name: e.target.value })
                    }
                    className="w-full bg-transparent text-xs font-semibold text-stone-100 focus:outline-none border-b border-transparent focus:border-amber-500 py-0.5"
                  />
                </div>
                <div className="col-span-3">
                  <label className="block text-[10px] text-stone-400">
                    Cadeira
                  </label>
                  <input
                    type="text"
                    value={member.chairLabel}
                    onChange={(e) =>
                      onUpdateStaff(member.id, { chairLabel: e.target.value })
                    }
                    className="w-full bg-transparent text-xs text-stone-300 focus:outline-none border-b border-transparent focus:border-amber-500 py-0.5"
                  />
                </div>
                <div className="col-span-2">
                  <label className="block text-[10px] text-stone-400">
                    Comissão %
                  </label>
                  <input
                    type="number"
                    min="0"
                    max="100"
                    value={member.defaultServiceCommissionPct}
                    onChange={(e) =>
                      onUpdateStaff(member.id, {
                        defaultServiceCommissionPct: Math.min(
                          100,
                          Math.max(0, Number(e.target.value) || 0)
                        ),
                      })
                    }
                    className="w-full bg-transparent text-xs font-mono font-bold text-emerald-700 focus:outline-none border-b border-transparent focus:border-amber-500 py-0.5"
                  />
                </div>
                <div className="col-span-1 flex justify-end">
                  <button
                    type="button"
                    onClick={() => onDeleteStaff(member.id)}
                    disabled={staff.length <= 1}
                    title="Remover barbeiro"
                    className="p-1.5 rounded-lg text-stone-500 hover:text-rose-700 disabled:opacity-30 cursor-pointer"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ))}
          </div>

          <form
            onSubmit={handleAddStaffForm}
            className="pt-3 border-t border-stone-800 space-y-2.5"
          >
            <div className="grid grid-cols-12 gap-2">
              <div className="col-span-6">
                <label className="block text-[11px] text-stone-400 mb-1">
                  Novo Barbeiro
                </label>
                <input
                  type="text"
                  value={newStaffName}
                  onChange={(e) => setNewStaffName(e.target.value)}
                  placeholder="Ex: Luan"
                  className="w-full bg-stone-950 border border-stone-800 rounded-xl px-3 py-2 text-xs text-stone-100 focus:outline-none focus:border-amber-500"
                />
              </div>
              <div className="col-span-3">
                <label className="block text-[11px] text-stone-400 mb-1">
                  Cadeira
                </label>
                <input
                  type="text"
                  value={newStaffChair}
                  onChange={(e) => setNewStaffChair(e.target.value)}
                  className="w-full bg-stone-950 border border-stone-800 rounded-xl px-2.5 py-2 text-xs text-stone-100 focus:outline-none focus:border-amber-500"
                />
              </div>
              <div className="col-span-3">
                <label className="block text-[11px] text-stone-400 mb-1">
                  Comissão %
                </label>
                <input
                  type="number"
                  value={newStaffComm}
                  onChange={(e) => setNewStaffComm(e.target.value)}
                  className="w-full bg-stone-950 border border-stone-800 rounded-xl px-2.5 py-2 text-xs font-mono text-emerald-700 font-bold focus:outline-none focus:border-amber-500"
                />
              </div>
            </div>
            <button
              type="submit"
              className="w-full inline-flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl bg-amber-500 hover:bg-amber-600 text-stone-950 font-bold text-xs cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              Adicionar Barbeiro à Equipe
            </button>
          </form>
        </div>
      </div>

      {/* Escala de trabalho: alimenta o calendário e os horários livres do cliente */}
      <ScheduleSettings
        staff={staff}
        business={business}
        onUpdateStaff={onUpdateStaff}
        onUpdateBusiness={onUpdateBusiness}
      />

      {/* BLOCO 3: Extratos Bancários & Comprovantes de Recebimento do Dia */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        <div className="lg:col-span-7 bg-stone-900/70 border border-stone-800 rounded-2xl p-5 space-y-4">
          <div className="flex items-center gap-2 border-b border-stone-800 pb-3">
            <FileText className="w-5 h-5 text-sky-400" />
            <div>
              <h3 className="text-sm font-bold text-stone-100">
                4. Extratos Bancários & Comprovantes do Dia
              </h3>
              <p className="text-xs text-stone-400">
                Registre o total recebido no banco, comprovantes de Pix de adiantamento ou o fechamento diário da maquininha.
              </p>
            </div>
          </div>

          <form
            onSubmit={handleAddStatementForm}
            className="grid grid-cols-1 sm:grid-cols-12 gap-3 items-end bg-stone-950/80 border border-stone-800 rounded-xl p-3.5"
          >
            <div className="sm:col-span-4">
              <label className="block text-[11px] text-stone-400 mb-1">
                Descrição do Extrato / Comprovante *
              </label>
              <input
                type="text"
                required
                value={stmtDesc}
                onChange={(e) => setStmtDesc(e.target.value)}
                placeholder="Ex: Extrato Pix Mercado Pago Hoje"
                className="w-full bg-stone-900 border border-stone-800 rounded-xl px-3 py-2 text-xs text-stone-100 focus:outline-none focus:border-amber-500"
              />
            </div>

            <div className="sm:col-span-3">
              <label className="block text-[11px] text-stone-400 mb-1">
                Tipo
              </label>
              <select
                value={stmtType}
                onChange={(e) =>
                  setStmtType(e.target.value as BankStatementEntry['type'])
                }
                className="w-full bg-stone-900 border border-stone-800 rounded-xl px-2.5 py-2 text-xs text-stone-100 focus:outline-none focus:border-amber-500"
              >
                <option value="EXTRATO_BANCARIO">Extrato Bancário</option>
                <option value="FECHAMENTO_DIA">Fechamento do Dia</option>
                <option value="PIX_SINAL">Comprovante Sinal Pix</option>
              </select>
            </div>

            <div className="sm:col-span-2">
              <label className="block text-[11px] text-stone-400 mb-1">
                Valor (R$) *
              </label>
              <input
                type="number"
                step="0.01"
                required
                value={stmtAmount}
                onChange={(e) => setStmtAmount(e.target.value)}
                placeholder="0,00"
                className="w-full bg-stone-900 border border-stone-800 rounded-xl px-2.5 py-2 text-xs font-mono text-emerald-700 font-bold focus:outline-none focus:border-amber-500"
              />
            </div>

            <div className="sm:col-span-3 flex flex-col gap-1.5">
              <label className="inline-flex items-center justify-center gap-1 px-2.5 py-1.5 rounded-lg bg-stone-800 hover:bg-stone-700 text-amber-800 text-[11px] font-semibold cursor-pointer">
                <Paperclip className="w-3 h-3" />
                {stmtFileName ? 'Arquivo Pronto' : 'Anexar PDF/Foto'}
                <input
                  type="file"
                  accept="image/jpeg,image/png,image/webp,application/pdf"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (!file) return;
                    const check = validateSafeReceiptFile(file);
                    if (!check.valid) {
                      alert(check.reason);
                      e.target.value = '';
                      return;
                    }
                    setStmtFileName(check.safeName);
                  }}
                  className="hidden"
                />
              </label>
              <button
                type="submit"
                className="w-full py-2 px-3 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-stone-100 font-bold text-xs cursor-pointer"
              >
                Salvar Extrato
              </button>
            </div>
          </form>

          {bankStatements.length === 0 ? (
            <div className="p-5 text-center text-xs text-stone-400 border border-dashed border-stone-800 rounded-xl">
              Nenhum extrato bancário ou comprovante anexado ainda.
            </div>
          ) : (
            <div className="space-y-2">
              {bankStatements.map((entry) => (
                <div
                  key={entry.id}
                  className="flex items-center justify-between p-3 rounded-xl bg-stone-950 border border-stone-800 text-xs"
                >
                  <div>
                    <div className="font-semibold text-stone-100">
                      {entry.description}
                    </div>
                    <div className="text-[11px] text-stone-400">
                      {entry.date} •{' '}
                      {entry.type === 'EXTRATO_BANCARIO'
                        ? 'Extrato Bancário'
                        : entry.type === 'FECHAMENTO_DIA'
                        ? 'Fechamento Diário'
                        : 'Sinal Pix'}
                      {entry.attachmentName &&
                        ` • Arquivo: ${entry.attachmentName}`}
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="font-mono font-bold text-emerald-700 text-sm">
                      {formatCurrencyBRL(entry.amount)}
                    </span>
                    <button
                      type="button"
                      onClick={() => onDeleteBankStatement(entry.id)}
                      className="text-stone-500 hover:text-rose-700 cursor-pointer"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Right 5 Cols: Regras de Sinal e Botão Zerar Sistema */}
        <div className="lg:col-span-5 bg-stone-900 border border-stone-800 rounded-2xl p-5 space-y-4">
          <div className="flex items-center gap-2 border-b border-stone-800 pb-3">
            <Sliders className="w-4 h-4 text-amber-700" />
            <h3 className="text-sm font-bold text-stone-100">
              5. Regras de Sinal Pix & Limpeza de Dados
            </h3>
          </div>

          <div className="space-y-2">
            <label className="block text-xs font-medium text-stone-300">
              Regra de Desconto da Taxa da Maquininha
            </label>
            <select
              value={business.feeSplitRule}
              onChange={(e) =>
                onUpdateBusiness({
                  feeSplitRule: e.target.value as FeeSplitRule,
                })
              }
              className="w-full bg-stone-950 border border-stone-800 rounded-xl px-3.5 py-2.5 text-xs text-stone-100 focus:outline-none focus:border-amber-500"
            >
              {(Object.keys(FEE_SPLIT_RULE_LABELS) as FeeSplitRule[]).map(
                (rule) => (
                  <option key={rule} value={rule}>
                    {FEE_SPLIT_RULE_LABELS[rule]}
                  </option>
                )
              )}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[11px] text-stone-400 mb-1">
                Sinal Pix Anti-Falta (%)
              </label>
              <input
                type="number"
                min={0}
                max={100}
                value={business.noShowDepositPercent}
                onChange={(e) =>
                  onUpdateBusiness({
                    noShowDepositPercent: Number(e.target.value),
                  })
                }
                className="w-full bg-stone-950 border border-stone-800 rounded-xl px-3 py-2 text-xs font-mono text-stone-100"
              />
            </div>

            <div>
              <label className="block text-[11px] text-stone-400 mb-1">
                Aviso Cancelamento (Horas)
              </label>
              <input
                type="number"
                min={1}
                max={48}
                value={business.cancelNoticeHours}
                onChange={(e) =>
                  onUpdateBusiness({
                    cancelNoticeHours: Number(e.target.value),
                  })
                }
                className="w-full bg-stone-950 border border-stone-800 rounded-xl px-3 py-2 text-xs font-mono text-stone-100"
              />
            </div>
          </div>

          <div className="pt-4 border-t border-stone-800 space-y-2">
            <span className="block text-xs font-semibold text-stone-300">
              Precisa limpar agendamentos de teste?
            </span>
            <button
              type="button"
              disabled={!canResetData}
              onClick={() => {
                if (!canResetData) return;
                if (
                  window.confirm(
                    'Deseja zerar todos os clientes, agendamentos e lançamentos de caixa para começar do zero?'
                  )
                ) {
                  onResetAllData();
                }
              }}
              className="w-full inline-flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl bg-rose-500/15 hover:bg-rose-500/25 disabled:opacity-40 text-rose-700 border border-rose-500/30 text-xs font-bold transition-all cursor-pointer"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              {canResetData
                ? 'Zerar Todos os Clientes, Agenda e Caixa'
                : 'Zerar dados (apenas o responsável)'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
