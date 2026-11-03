import React, { useMemo, useState } from 'react';
import {
  CheckCircle,
  MagnifyingGlass,
  Plus,
  ShieldWarning,
  Ticket,
  UserPlus,
  Users,
} from '@phosphor-icons/react';
import { Client, ServiceItem } from '../types';
import {
  formatBRL,
  formatCPF,
  formatPhoneBR,
  isValidCPF,
  isValidPhoneBR,
} from '../utils/validators';
import { LightDismissDialog } from './LightDismissDialog';

interface ClientsModuleProps {
  clients: Client[];
  services: ServiceItem[];
  onAddClient: (client: Omit<Client, 'id'>) => void;
  onAddPassToClient: (clientId: string, serviceId: string, sessions: number) => void;
}

export const ClientsModule: React.FC<ClientsModuleProps> = ({
  clients,
  services,
  onAddClient,
  onAddPassToClient,
}) => {
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [activeTagFilter, setActiveTagFilter] = useState<string>('ALL');
  const [selectedClientId, setSelectedClientId] = useState<string>(
    clients[0]?.id || ''
  );

  // Modal Novo Cliente com validação CPF Módulo 11 (Trinks)
  const [newClientOpen, setNewClientOpen] = useState<boolean>(false);
  const [fullName, setFullName] = useState<string>('');
  const [phoneWhatsapp, setPhoneWhatsapp] = useState<string>('');
  const [cpf, setCpf] = useState<string>('');
  const [email, setEmail] = useState<string>('');
  const [notes, setNotes] = useState<string>('');
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Modal Vender Pacote / Passe (Reservio)
  const [passModalOpen, setPassModalOpen] = useState<boolean>(false);
  const [passServiceId, setPassServiceId] = useState<string>(
    services[0]?.id || 'srv_corte_degrade'
  );
  const [passSessions, setPassSessions] = useState<number>(4);

  const filteredClients = useMemo(() => {
    return clients.filter((c) => {
      if (activeTagFilter === 'VIP' && !c.tags.includes('VIP')) return false;
      if (activeTagFilter === 'ALERTA_FALTA' && c.noShowCount < 2) return false;
      if (activeTagFilter === 'PACOTE_ATIVO' && c.passes.length === 0) return false;
      if (activeTagFilter === 'CICLO_21' && c.lastVisitDaysAgo < 21) return false;

      if (searchQuery.trim() !== '') {
        const q = searchQuery.toLowerCase();
        return (
          c.fullName.toLowerCase().includes(q) ||
          c.phoneWhatsapp.toLowerCase().includes(q) ||
          c.cpf.includes(q)
        );
      }
      return true;
    });
  }, [clients, activeTagFilter, searchQuery]);

  const selectedClient =
    filteredClients.find((c) => c.id === selectedClientId) ||
    filteredClients[0] ||
    null;

  const handleCreateClient = (e: React.FormEvent) => {
    e.preventDefault();
    const nextErrors: Record<string, string> = {};

    // Regra Trinks (nomeCompleto: espaço em branco e > 5 caracteres)
    if (fullName.trim().length <= 5 || !fullName.trim().includes(' ')) {
      nextErrors.fullName =
        'Informe nome e sobrenome com mais de 5 caracteres (regra de conformidade fiscal).';
    }
    if (!isValidPhoneBR(phoneWhatsapp)) {
      nextErrors.phoneWhatsapp =
        'Informe um celular WhatsApp válido com DDD (10 ou 11 dígitos).';
    }
    if (cpf.trim() !== '' && !isValidCPF(cpf)) {
      nextErrors.cpf =
        'CPF inválido pelo cálculo oficial Módulo 11. Verifique os dígitos.';
    }

    if (Object.keys(nextErrors).length > 0) {
      setErrors(nextErrors);
      return;
    }

    onAddClient({
      fullName: fullName.trim(),
      phoneWhatsapp,
      cpf: cpf.trim() || 'Não informado',
      email: email.trim() || 'sem-email@cliente.br',
      visitsCount: 0,
      noShowCount: 0,
      lastVisitDaysAgo: 0,
      totalSpent: 0,
      tags: ['NOVO'],
      notes: notes.trim() || 'Cadastro realizado na recepção.',
      passes: [],
    });

    setFullName('');
    setPhoneWhatsapp('');
    setCpf('');
    setEmail('');
    setNotes('');
    setErrors({});
    setNewClientOpen(false);
  };

  const handleAssignPass = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedClient) return;
    onAddPassToClient(selectedClient.id, passServiceId, passSessions);
    setPassModalOpen(false);
  };

  return (
    <section aria-label="Base de Clientes, Validação CPF e Passes de Sessões">
      <div className="border-b border-[#DEDAD0] bg-white px-4 py-4 sm:px-6">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-xl font-semibold tracking-tight text-[#141413] sm:text-2xl">
              Clientes (CRM), Score Anti-No-Show & Passes
            </h1>
            <p className="mt-1 text-sm text-[#4A4843]">
              Cadastro progressivo com validação de CPF Módulo 11 (Trinks), pacotes de sessões (Reservio) e trava de Sinal Pix para reincidentes em faltas (Booksy).
            </p>
          </div>

          <button
            type="button"
            onClick={() => {
              setErrors({});
              setNewClientOpen(true);
            }}
            className="inline-flex min-h-[42px] items-center gap-2 rounded-lg bg-[#0F766E] px-4 py-2 text-sm font-medium text-white hover:bg-[#0B5C56]"
          >
            <UserPlus size={17} weight="bold" />
            <span>Cadastrar Cliente</span>
          </button>
        </div>

        {/* Barra de Filtros e Busca */}
        <div className="mt-4 pt-4 border-t border-[#DEDAD0] flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
            {[
              { id: 'ALL', label: `Todos (${clients.length})` },
              {
                id: 'PACOTE_ATIVO',
                label: `Com Passe Ativo (${clients.filter((c) => c.passes.length > 0).length})`,
              },
              {
                id: 'ALERTA_FALTA',
                label: `Exigem Sinal Pix (${clients.filter((c) => c.noShowCount >= 2).length})`,
              },
              {
                id: 'CICLO_21',
                label: `Ausentes > 21 dias (${clients.filter((c) => c.lastVisitDaysAgo >= 21).length})`,
              },
              {
                id: 'VIP',
                label: `VIP (${clients.filter((c) => c.tags.includes('VIP')).length})`,
              },
            ].map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTagFilter(tab.id)}
                className={`min-h-[36px] shrink-0 rounded-lg border px-3 py-1.5 text-xs font-medium ${
                  activeTagFilter === tab.id
                    ? 'border-[#0F766E] bg-[#E6F4F1] text-[#0F766E]'
                    : 'border-[#DEDAD0] bg-white text-[#4A4843] hover:bg-[#F6F5F0]'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          <div className="relative w-full md:w-72">
            <label htmlFor="crm-search" className="sr-only">
              Buscar por nome, CPF ou WhatsApp
            </label>
            <MagnifyingGlass
              size={16}
              className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[#6E6A63]"
            />
            <input
              id="crm-search"
              type="search"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Buscar nome, CPF ou WhatsApp..."
              className="min-h-[38px] w-full rounded-lg border border-[#DEDAD0] bg-white pl-9 pr-3 text-xs text-[#141413]"
            />
          </div>
        </div>
      </div>

      {/* Layout Principal: Tabela Responsiva (8 cols) + Ficha Individual e Passes (4 cols) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 divide-y lg:divide-y-0 lg:divide-x divide-[#DEDAD0] bg-white">
        <div className="lg:col-span-8 p-4 sm:p-6">
          {filteredClients.length === 0 ? (
            <div className="py-12 text-center">
              <Users size={28} className="mx-auto text-[#6E6A63]" />
              <h2 className="mt-3 text-base font-semibold text-[#141413]">
                Nenhum cliente corresponde à busca
              </h2>
              <p className="mt-1 text-xs text-[#4A4843]">
                Redefina os filtros de segmento ou cadastre um novo cliente.
              </p>
              <button
                type="button"
                onClick={() => {
                  setActiveTagFilter('ALL');
                  setSearchQuery('');
                }}
                className="mt-4 rounded-lg border border-[#DEDAD0] bg-white px-4 py-2 text-xs font-medium text-[#141413]"
              >
                Limpar filtros
              </button>
            </div>
          ) : (
            <div
              tabIndex={0}
              role="region"
              aria-label="Diretório de clientes cadastrados"
              className="table-wrapper"
            >
              <table
                style={
                  {
                    '--label-2': '"WhatsApp & CPF"',
                    '--label-3': '"Visitas / Faltas"',
                    '--label-4': '"Última Visita"',
                    '--label-5': '"LTV Acumulado"',
                    '--label-6': '"Passes / Regra"',
                  } as React.CSSProperties
                }
              >
                <thead>
                  <tr className="border-b border-[#DEDAD0] text-xs font-semibold text-[#4A4843]">
                    <th className="px-4 py-3">Cliente</th>
                    <th className="px-4 py-3">WhatsApp & CPF</th>
                    <th className="px-4 py-3">Visitas / Faltas</th>
                    <th className="px-4 py-3">Última Visita</th>
                    <th className="px-4 py-3">LTV Acumulado</th>
                    <th className="px-4 py-3">Passes / Regra</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#DEDAD0] text-xs">
                  {filteredClients.map((client) => {
                    const isSelected = selectedClient?.id === client.id;
                    return (
                      <tr
                        key={client.id}
                        onClick={() => setSelectedClientId(client.id)}
                        className={`cursor-pointer ${
                          isSelected ? 'bg-[#E6F4F1]/45' : 'hover:bg-[#F6F5F0]/60'
                        }`}
                      >
                        <th scope="row" className="px-4 py-3 text-left">
                          <span className="font-semibold text-[#141413] block">
                            {client.fullName}
                          </span>
                          <span className="text-[11px] font-normal text-[#6E6A63]">
                            {client.email}
                          </span>
                        </th>
                        <td className="px-4 py-3 num-tabular">
                          <span className="block text-[#141413]">{client.phoneWhatsapp}</span>
                          <span className="text-[11px] text-[#6E6A63]">CPF: {client.cpf}</span>
                        </td>
                        <td data-numeric="true" className="px-4 py-3">
                          <span className="font-semibold text-[#141413]">
                            {client.visitsCount} vis.
                          </span>{' '}
                          ·{' '}
                          <span
                            className={
                              client.noShowCount >= 2
                                ? 'font-semibold text-[#B91C1C]'
                                : 'text-[#6E6A63]'
                            }
                          >
                            {client.noShowCount} faltas
                          </span>
                        </td>
                        <td data-numeric="true" className="px-4 py-3">
                          há {client.lastVisitDaysAgo} dias
                        </td>
                        <td data-numeric="true" className="px-4 py-3 font-semibold text-[#141413]">
                          {formatBRL(client.totalSpent)}
                        </td>
                        <td className="px-4 py-3">
                          {client.noShowCount >= 2 ? (
                            <span className="inline-flex items-center gap-1 rounded border border-[#B91C1C]/30 bg-[#FEE2E2] px-2 py-0.5 text-[11px] font-medium text-[#B91C1C]">
                              Sinal Pix Obrigatório
                            </span>
                          ) : client.passes.length > 0 ? (
                            <span className="num-tabular inline-flex items-center gap-1 rounded border border-[#0F766E]/30 bg-[#E6F4F1] px-2 py-0.5 text-[11px] font-medium text-[#0F766E]">
                              Passe ({client.passes[0].remainingSessions}/
                              {client.passes[0].totalSessions})
                            </span>
                          ) : (
                            <span className="text-[11px] text-[#6E6A63]">
                              Reserva 1-Clique Liberada
                            </span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Ficha Detalhada lateral */}
        <aside className="lg:col-span-4 bg-[#F6F5F0]/50 p-5 sm:p-6">
          {selectedClient ? (
            <div className="space-y-4">
              <div className="border-b border-[#DEDAD0] pb-4">
                <h2 className="text-lg font-semibold text-[#141413]">
                  {selectedClient.fullName}
                </h2>
                <p className="num-tabular mt-0.5 text-xs text-[#4A4843]">
                  {selectedClient.phoneWhatsapp} · CPF {selectedClient.cpf}
                </p>
              </div>

              {selectedClient.noShowCount >= 2 && (
                <div className="rounded-lg border border-[#B91C1C]/30 bg-[#FEE2E2]/70 p-3.5 text-xs text-[#B91C1C]">
                  <strong className="flex items-center gap-1.5 font-semibold">
                    <ShieldWarning size={16} weight="fill" />
                    <span>Trava Anti-No-Show Ativa</span>
                  </strong>
                  <p className="mt-1">
                    Este cliente possui {selectedClient.noShowCount} faltas registradas. Na Página Pública de Agendamento, o sistema exige automaticamente pagamento de Sinal Pix antes de bloquear a agenda.
                  </p>
                </div>
              )}

              <div className="rounded-lg border border-[#DEDAD0] bg-white p-3.5 text-xs space-y-2">
                <strong className="block font-semibold text-[#141413]">
                  Preferências & Anotações Técnicas:
                </strong>
                <p className="text-[#4A4843] leading-relaxed">{selectedClient.notes}</p>
              </div>

              <div className="rounded-lg border border-[#DEDAD0] bg-white p-3.5 text-xs space-y-2.5">
                <div className="flex items-center justify-between">
                  <strong className="font-semibold text-[#141413]">
                    Passes & Pacotes de Sessões (Reservio)
                  </strong>
                  <button
                    type="button"
                    onClick={() => setPassModalOpen(true)}
                    className="inline-flex items-center gap-1 rounded bg-[#0F766E] px-2.5 py-1 text-[11px] font-semibold text-white hover:bg-[#0B5C56]"
                  >
                    <Plus size={12} weight="bold" />
                    <span>Novo Passe</span>
                  </button>
                </div>

                {selectedClient.passes.length === 0 ? (
                  <p className="text-[#6E6A63]">
                    Nenhum pacote de sessões ativo para este cliente.
                  </p>
                ) : (
                  selectedClient.passes.map((pass) => (
                    <div
                      key={pass.id}
                      className="rounded border border-[#DEDAD0] bg-[#F6F5F0] p-2.5"
                    >
                      <span className="font-semibold text-[#141413] block">
                        {pass.name}
                      </span>
                      <span className="num-tabular mt-1 block text-[#0F766E] font-medium">
                        Saldo: {pass.remainingSessions} de {pass.totalSessions} sessões restantes
                      </span>
                    </div>
                  ))
                )}
              </div>
            </div>
          ) : null}
        </aside>
      </div>

      {/* Modal: Cadastrar Novo Cliente com Validador CPF Módulo 11 */}
      <LightDismissDialog
        open={newClientOpen}
        onClose={() => setNewClientOpen(false)}
        title="Novo Cadastro de Cliente"
        subtitle="Valida nome completo, WhatsApp com DDD e dígitos verificadores de CPF (Módulo 11)."
      >
        <form onSubmit={handleCreateClient} className="space-y-4" noValidate>
          <div className="flex flex-col gap-1.5">
            <label htmlFor="cli-name" className="text-xs font-semibold text-[#141413]">
              Nome e Sobrenome *
            </label>
            <input
              id="cli-name"
              type="text"
              autoComplete="name"
              value={fullName}
              onChange={(e) => {
                setFullName(e.target.value);
                if (errors.fullName) setErrors({ ...errors, fullName: '' });
              }}
              placeholder="Ex.: Leonardo Farias"
              className="min-h-[40px] rounded-lg border border-[#DEDAD0] bg-white px-3 text-sm text-[#141413]"
            />
            {errors.fullName && (
              <p role="alert" className="text-xs font-medium text-[#B91C1C]">
                {errors.fullName}
              </p>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="flex flex-col gap-1.5">
              <label htmlFor="cli-phone" className="text-xs font-semibold text-[#141413]">
                Celular WhatsApp (DDD) *
              </label>
              <input
                id="cli-phone"
                type="tel"
                inputMode="numeric"
                autoComplete="tel"
                value={phoneWhatsapp}
                onChange={(e) => {
                  setPhoneWhatsapp(formatPhoneBR(e.target.value));
                  if (errors.phoneWhatsapp) setErrors({ ...errors, phoneWhatsapp: '' });
                }}
                placeholder="(11) 98888-7777"
                className="num-tabular min-h-[40px] rounded-lg border border-[#DEDAD0] bg-white px-3 text-sm text-[#141413]"
              />
              {errors.phoneWhatsapp && (
                <p role="alert" className="text-xs font-medium text-[#B91C1C]">
                  {errors.phoneWhatsapp}
                </p>
              )}
            </div>

            <div className="flex flex-col gap-1.5">
              <label htmlFor="cli-cpf" className="text-xs font-semibold text-[#141413]">
                CPF (Opcional — Validado Módulo 11)
              </label>
              <input
                id="cli-cpf"
                type="text"
                inputMode="numeric"
                value={cpf}
                onChange={(e) => {
                  setCpf(formatCPF(e.target.value));
                  if (errors.cpf) setErrors({ ...errors, cpf: '' });
                }}
                placeholder="390.533.447-05"
                className="num-tabular min-h-[40px] rounded-lg border border-[#DEDAD0] bg-white px-3 text-sm text-[#141413]"
              />
              {errors.cpf && (
                <p role="alert" className="text-xs font-medium text-[#B91C1C]">
                  {errors.cpf}
                </p>
              )}
            </div>
          </div>

          <div className="flex flex-col gap-1.5">
            <label htmlFor="cli-notes" className="text-xs font-semibold text-[#141413]">
              Preferências de Corte / Alergias / Observações
            </label>
            <textarea
              id="cli-notes"
              rows={2}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Ex.: Degradê médio na navalha, alergia a lâmina de níquel."
              className="rounded-lg border border-[#DEDAD0] bg-white p-3 text-xs text-[#141413]"
            />
          </div>

          <div className="flex items-center justify-end gap-2.5 border-t border-[#DEDAD0] pt-4">
            <button
              type="button"
              onClick={() => setNewClientOpen(false)}
              className="min-h-[40px] rounded-lg border border-[#DEDAD0] bg-white px-4 py-2 text-xs font-medium text-[#4A4843]"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="min-h-[40px] inline-flex items-center gap-2 rounded-lg bg-[#0F766E] px-5 py-2 text-xs font-semibold text-white hover:bg-[#0B5C56]"
            >
              <CheckCircle size={16} weight="bold" />
              <span>Salvar Cliente</span>
            </button>
          </div>
        </form>
      </LightDismissDialog>

      {/* Modal: Vender / Atribuir Passe de Sessões */}
      <LightDismissDialog
        open={passModalOpen}
        onClose={() => setPassModalOpen(false)}
        title={`Atribuir Pacote/Passe — ${selectedClient?.fullName || ''}`}
        subtitle="Gera saldo pré-pago de sessões que pode ser abatido diretamente no PDV."
      >
        <form onSubmit={handleAssignPass} className="space-y-4">
          <div className="flex flex-col gap-1.5">
            <label htmlFor="pass-service" className="text-xs font-semibold text-[#141413]">
              Serviço do Pacote
            </label>
            <select
              id="pass-service"
              value={passServiceId}
              onChange={(e) => setPassServiceId(e.target.value)}
              className="min-h-[40px] rounded-lg border border-[#DEDAD0] bg-white px-3 text-xs text-[#141413]"
            >
              {services.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name} ({formatBRL(s.price)} / sessão)
                </option>
              ))}
            </select>
          </div>

          <div className="flex flex-col gap-1.5">
            <label htmlFor="pass-sessions" className="text-xs font-semibold text-[#141413]">
              Quantidade de Sessões no Passe
            </label>
            <input
              id="pass-sessions"
              type="number"
              min={2}
              max={12}
              value={passSessions}
              onChange={(e) => setPassSessions(Math.max(2, Number(e.target.value)))}
              className="num-tabular min-h-[40px] rounded-lg border border-[#DEDAD0] bg-white px-3 text-xs text-[#141413]"
            />
          </div>

          <div className="flex items-center justify-end gap-2.5 border-t border-[#DEDAD0] pt-4">
            <button
              type="button"
              onClick={() => setPassModalOpen(false)}
              className="min-h-[40px] rounded-lg border border-[#DEDAD0] bg-white px-4 py-2 text-xs font-medium text-[#4A4843]"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="min-h-[40px] inline-flex items-center gap-2 rounded-lg bg-[#0F766E] px-5 py-2 text-xs font-semibold text-white hover:bg-[#0B5C56]"
            >
              <Ticket size={16} weight="bold" />
              <span>Ativar Passe na Ficha</span>
            </button>
          </div>
        </form>
      </LightDismissDialog>
    </section>
  );
};
