import { HelpTip } from './HelpTip';
import { LightDismissDialog } from './LightDismissDialog';
import { BTN_GHOST, BTN_PRIMARY, FIELD, LABEL } from './formStyles';
import React, { useEffect, useMemo, useState } from 'react';
import {
  CaretDown,
  Warning as AlertTriangle,
  Check,
  WhatsappLogo as MessageCircle,
  Phone,
  Plus,
  MagnifyingGlass as Search,
  Trash as Trash2,
  UserCheck,
  Users,
} from '@phosphor-icons/react';
import { Client } from '../types';
import { formatCurrencyBRL } from '../utils/finance';

interface ClientsModuleProps {
  clients: Client[];
  businessName: string;
  onAddClient: (client: Omit<Client, 'id'>) => void;
  onUpdateClient: (clientId: string, patch: Partial<Client>) => void;
  onDeleteClient: (clientId: string) => void;
}

export const ClientsModule: React.FC<ClientsModuleProps> = ({
  clients,
  businessName,
  onAddClient,
  onUpdateClient,
  onDeleteClient,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedClientId, setSelectedClientId] = useState<string>(
    clients[0]?.id ?? ''
  );
  const [showNewModal, setShowNewModal] = useState(false);
  const [savedFeedback, setSavedFeedback] = useState(false);

  // New client form
  const [newName, setNewName] = useState('');
  const [newPhone, setNewPhone] = useState('');
  const [newCpf, setNewCpf] = useState('');
  const [newEmail, setNewEmail] = useState('');
  const [newNotes, setNewNotes] = useState('');

  const filteredClients = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return clients.filter((c) => {
      if (!q) return true;
      return (
        c.fullName.toLowerCase().includes(q) ||
        c.phoneWhatsapp.toLowerCase().includes(q) ||
        c.cpf.toLowerCase().includes(q)
      );
    });
  }, [clients, searchQuery]);

  const selectedClient =
    clients.find((c) => c.id === selectedClientId) ?? filteredClients[0];

  // Editable fields for the selected client
  const [editName, setEditName] = useState('');
  const [editPhone, setEditPhone] = useState('');
  const [editCpf, setEditCpf] = useState('');
  const [editEmail, setEditEmail] = useState('');
  const [editVisits, setEditVisits] = useState('0');
  const [editNoShows, setEditNoShows] = useState('0');
  const [editTotalSpent, setEditTotalSpent] = useState('0');
  const [editNotes, setEditNotes] = useState('');

  useEffect(() => {
    if (selectedClient) {
      setEditName(selectedClient.fullName);
      setEditPhone(selectedClient.phoneWhatsapp);
      setEditCpf(selectedClient.cpf || '');
      setEditEmail(selectedClient.email || '');
      setEditVisits(String(selectedClient.visitsCount ?? 0));
      setEditNoShows(String(selectedClient.noShowCount ?? 0));
      setEditTotalSpent(String(selectedClient.totalSpent ?? 0));
      setEditNotes(selectedClient.notes || '');
      setSavedFeedback(false);
    }
  }, [selectedClient?.id]);

  const handleCreateClient = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName.trim() || !newPhone.trim()) return;

    onAddClient({
      fullName: newName.trim(),
      phoneWhatsapp: newPhone.trim(),
      cpf: newCpf.trim() || '',
      email: newEmail.trim() || '',
      visitsCount: 0,
      noShowCount: 0,
      lastVisitDaysAgo: 0,
      totalSpent: 0,
      tags: ['NOVO'],
      notes: newNotes.trim() || '',
      passes: [],
    });

    setNewName('');
    setNewPhone('');
    setNewCpf('');
    setNewEmail('');
    setNewNotes('');
    setShowNewModal(false);
  };

  const handleSaveSelectedClient = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedClient || !editName.trim()) return;

    const noShows = Math.max(0, Number(editNoShows) || 0);
    const visits = Math.max(0, Number(editVisits) || 0);
    const spent = Math.max(0, Number(editTotalSpent) || 0);

    const updatedTags: Client['tags'] = [];
    if (noShows > 0) updatedTags.push('ALERTA_FALTA');
    if (visits >= 5) updatedTags.push('RECORRENTE');
    if (spent >= 500) updatedTags.push('VIP');
    if (updatedTags.length === 0) updatedTags.push('NOVO');

    onUpdateClient(selectedClient.id, {
      fullName: editName.trim(),
      phoneWhatsapp: editPhone.trim(),
      cpf: editCpf.trim(),
      email: editEmail.trim(),
      visitsCount: visits,
      noShowCount: noShows,
      totalSpent: spent,
      notes: editNotes,
      tags: updatedTags,
    });

    setSavedFeedback(true);
    setTimeout(() => setSavedFeedback(false), 2500);
  };

  const openWhatsAppClient = (client: Client) => {
    const digits = client.phoneWhatsapp.replace(/\D/g, '');
    if (!digits) {
      alert('Cadastre um número de WhatsApp válido com DDD para este cliente.');
      return;
    }
    const phoneWithCountry = digits.startsWith('55') ? digits : `55${digits}`;
    const message = `Olá ${client.fullName}, tudo bem? Aqui é da *${businessName}*. Como podemos te ajudar hoje?`;
    window.open(
      `https://wa.me/${phoneWithCountry}?text=${encodeURIComponent(message)}`,
      '_blank',
      'noopener,noreferrer'
    );
  };

  return (
    <div className="space-y-6">
      {/* Top Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-stone-900/70 border border-stone-800/80 rounded-2xl p-4">
        <div data-tour="clients-search" className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 text-stone-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Buscar cliente…"
            className="w-full bg-stone-950 border border-stone-800 rounded-xl pl-10 pr-10 py-2.5 text-sm text-stone-100 focus:outline-none focus:border-amber-500"
          />
          <span className="absolute right-3 top-1/2 -translate-y-1/2">
            <HelpTip
              label="Clientes"
              text="Sua lista de clientes. Busque por nome, WhatsApp ou CPF, toque em um cliente para editar a ficha (visitas, faltas, observações) ou chamar no WhatsApp."
            />
          </span>
        </div>

        <button
          data-tour="clients-new"
          onClick={() => setShowNewModal(true)}
          className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-stone-950 font-semibold text-xs transition-all cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          Cadastrar Novo Cliente
        </button>
      </div>

      {/* Empty State if 0 clients */}
      {clients.length === 0 ? (
        <div data-tour="clients-list" className="bg-stone-900/60 border border-stone-800/80 rounded-2xl p-8 text-center space-y-4">
          <div className="w-12 h-12 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center mx-auto text-amber-700">
            <Users className="w-6 h-6" />
          </div>
          <div className="max-w-md mx-auto space-y-1.5">
            <h3 className="text-base font-bold text-stone-100">
              Sua carteira de clientes está pronta para começar
            </h3>
            <p className="text-xs text-stone-400">
              Cadastre seus clientes manualmente no botão abaixo ou compartilhe seu{' '}
              <span className="text-amber-700 font-semibold">Link de Reserva</span> para que
              eles mesmos agendem e entrem automaticamente na lista.
            </p>
          </div>
          <button
            onClick={() => setShowNewModal(true)}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-stone-950 font-bold text-xs transition-all cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            Adicionar Primeiro Cliente
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* Directory Table (Left 7 cols) */}
          <div data-tour="clients-list" className="lg:col-span-7 bg-stone-900/50 border border-stone-800/80 rounded-2xl overflow-hidden">
            <div className="px-4 py-3 border-b border-stone-800/80 flex items-center justify-between">
              <span className="text-xs font-semibold text-stone-300">
                Clique em qualquer cliente para editar os dados ao lado ({filteredClients.length})
              </span>
            </div>
            <ul className="divide-y divide-stone-800/60 sm:hidden">
              {filteredClients.map((client) => {
                const isSelected = selectedClient?.id === client.id;
                return (
                  <li key={client.id}>
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedClientId(client.id);
                        window.setTimeout(() => {
                          document.getElementById('client-ficha')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
                        }, 60);
                      }}
                      aria-pressed={isSelected}
                      className={`flex w-full items-center justify-between gap-3 px-4 py-3.5 text-left cursor-pointer ${
                        isSelected ? 'bg-amber-950' : ''
                      }`}
                    >
                      <span className="min-w-0">
                        <span className="block truncate text-sm font-semibold text-stone-100">{client.fullName}</span>
                        <span className="mt-0.5 block truncate font-mono text-xs text-stone-300">
                          {client.phoneWhatsapp || 'Sem telefone'}
                        </span>
                        <span className="mt-0.5 block text-[11px] text-stone-400">
                          {client.visitsCount} visita(s) · {client.noShowCount} falta(s)
                        </span>
                      </span>
                      <span className="shrink-0 font-mono text-sm font-semibold text-stone-100">
                        {formatCurrencyBRL(client.totalSpent)}
                      </span>
                    </button>
                  </li>
                );
              })}
            </ul>
            <div className="hidden overflow-x-auto sm:block">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-stone-800 text-[11px] uppercase tracking-wider text-stone-400 bg-stone-950/60">
                    <th className="py-3.5 px-4">Cliente</th>
                    <th className="py-3.5 px-4">WhatsApp</th>
                    <th className="py-3.5 px-4 text-right">Visitas</th>
                    <th className="py-3.5 px-4 text-right">Faltas</th>
                    <th className="py-3.5 px-4 text-right">Total Gasto</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-stone-800/60 text-sm">
                  {filteredClients.map((client) => {
                    const isSelected = selectedClient?.id === client.id;
                    return (
                      <tr
                        key={client.id}
                        onClick={() => setSelectedClientId(client.id)}
                        className={`cursor-pointer transition-colors ${
                          isSelected
                            ? 'bg-amber-500/10 text-stone-100'
                            : 'hover:bg-stone-800/40 text-stone-300'
                        }`}
                      >
                        <td className="py-3.5 px-4">
                          <div className="font-semibold text-stone-100">
                            {client.fullName}
                          </div>
                          <div className="text-[11px] text-stone-400">
                            {client.notes ? client.notes.slice(0, 40) : 'Clique para editar'}
                          </div>
                        </td>
                        <td className="py-3.5 px-4 font-mono text-xs text-stone-300">
                          {client.phoneWhatsapp || 'Sem telefone'}
                        </td>
                        <td className="py-3.5 px-4 text-right font-mono font-medium">
                          {client.visitsCount}
                        </td>
                        <td className="py-3.5 px-4 text-right font-mono">
                          {client.noShowCount > 0 ? (
                            <span className="px-2 py-0.5 rounded bg-rose-500/15 text-rose-700 border border-rose-500/30 text-xs font-semibold">
                              {client.noShowCount}
                            </span>
                          ) : (
                            <span className="text-stone-400">0</span>
                          )}
                        </td>
                        <td className="py-3.5 px-4 text-right font-mono font-semibold text-stone-100">
                          {formatCurrencyBRL(client.totalSpent)}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* Client Editable Detail Panel (Right 5 cols) */}
          <div id="client-ficha" className="lg:col-span-5 scroll-mt-20 bg-stone-900/80 border border-stone-800 rounded-2xl p-5 space-y-4">
            {selectedClient ? (
              <form onSubmit={handleSaveSelectedClient} className="space-y-4">
                <div className="flex items-start justify-between gap-2 border-b border-stone-800 pb-3">
                  <div>
                    <span className="text-[11px] font-mono uppercase tracking-wider text-amber-700">
                      Ficha Editável do Cliente
                    </span>
                    <h3 className="text-lg font-bold text-stone-100">
                      {selectedClient.fullName}
                    </h3>
                  </div>

                  <button
                    type="button"
                    onClick={() => openWhatsAppClient(selectedClient)}
                    className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-ink-dark font-bold text-xs transition-all cursor-pointer"
                  >
                    <MessageCircle className="w-3.5 h-3.5" />
                    Chamar no WhatsApp
                  </button>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="sm:col-span-2">
                    <label className="block text-[11px] font-medium text-stone-400 mb-1">
                      Nome Completo do Cliente
                    </label>
                    <input
                      type="text"
                      required
                      value={editName}
                      onChange={(e) => setEditName(e.target.value)}
                      className="w-full bg-stone-950 border border-stone-800 rounded-xl px-3 py-2 text-xs text-stone-100 focus:outline-none focus:border-amber-500"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-medium text-stone-400 mb-1">
                      WhatsApp (com DDD)
                    </label>
                    <div className="relative">
                      <Phone className="w-3.5 h-3.5 text-stone-500 absolute left-3 top-1/2 -translate-y-1/2" />
                      <input
                        type="tel"
                        required
                        value={editPhone}
                        onChange={(e) => setEditPhone(e.target.value)}
                        placeholder="(11) 99999-9999"
                        className="w-full bg-stone-950 border border-stone-800 rounded-xl pl-8 pr-3 py-2 text-xs font-mono text-stone-100 focus:outline-none focus:border-amber-500"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-[11px] font-medium text-stone-400 mb-1">
                      CPF (Opcional)
                    </label>
                    <input
                      type="text"
                      value={editCpf}
                      onChange={(e) => setEditCpf(e.target.value)}
                      placeholder="000.000.000-00"
                      className="w-full bg-stone-950 border border-stone-800 rounded-xl px-3 py-2 text-xs font-mono text-stone-100 focus:outline-none focus:border-amber-500"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-medium text-stone-400 mb-1">
                      Qtd. de Cortes / Visitas
                    </label>
                    <input
                      type="number"
                      min="0"
                      value={editVisits}
                      onChange={(e) => setEditVisits(e.target.value)}
                      className="w-full bg-stone-950 border border-stone-800 rounded-xl px-3 py-2 text-xs font-mono text-stone-100 focus:outline-none focus:border-amber-500"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-medium text-stone-400 mb-1">
                      Faltas sem Aviso (No-Show)
                    </label>
                    <input
                      type="number"
                      min="0"
                      value={editNoShows}
                      onChange={(e) => setEditNoShows(e.target.value)}
                      className="w-full bg-stone-950 border border-stone-800 rounded-xl px-3 py-2 text-xs font-mono text-stone-100 focus:outline-none focus:border-amber-500"
                    />
                  </div>

                  <div className="sm:col-span-2">
                    <label className="block text-[11px] font-medium text-stone-400 mb-1">
                      Total Gasto Acumulado (R$)
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      value={editTotalSpent}
                      onChange={(e) => setEditTotalSpent(e.target.value)}
                      className="w-full bg-stone-950 border border-stone-800 rounded-xl px-3 py-2 text-xs font-mono text-amber-700 font-bold focus:outline-none focus:border-amber-500"
                    />
                  </div>

                  <div className="sm:col-span-2">
                    <label className="block text-[11px] font-medium text-stone-400 mb-1">
                      Preferências de Corte / Observações
                    </label>
                    <textarea
                      rows={3}
                      value={editNotes}
                      onChange={(e) => setEditNotes(e.target.value)}
                      placeholder="Ex: Degradê navalhado na zero, barba desenhada, gosta de pomada efeito seco..."
                      className="w-full bg-stone-950 border border-stone-800 rounded-xl p-3 text-xs text-stone-100 focus:outline-none focus:border-amber-500"
                    />
                  </div>
                </div>

                {Number(editNoShows) > 0 && (
                  <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 flex items-center gap-2 text-xs text-rose-700">
                    <AlertTriangle className="w-4 h-4 shrink-0" />
                    <span>
                      Cliente com {editNoShows} falta(s) registrada(s). Recomendado pedir sinal via Pix.
                    </span>
                  </div>
                )}

                <div className="flex items-center justify-between gap-2 pt-2 border-t border-stone-800">
                  <button
                    type="button"
                    onClick={() => {
                      if (
                        window.confirm(
                          `Tem certeza que deseja excluir o cliente "${selectedClient.fullName}"?`
                        )
                      ) {
                        onDeleteClient(selectedClient.id);
                      }
                    }}
                    className="inline-flex items-center gap-1.5 px-3 py-2.5 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-700 border border-rose-500/25 text-xs font-semibold transition-all cursor-pointer"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    Excluir
                  </button>

                  <button
                    type="submit"
                    className="flex-1 inline-flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-stone-950 font-bold text-xs transition-all cursor-pointer"
                  >
                    <Check className="w-4 h-4" />
                    {savedFeedback ? 'Dados Salvos com Sucesso!' : 'Salvar Alterações do Cliente'}
                  </button>
                </div>
              </form>
            ) : (
              <p className="text-sm text-stone-400">
                Selecione um cliente na tabela para editar seus dados.
              </p>
            )}
          </div>
        </div>
      )}

      {/* Novo cliente: só nome e WhatsApp; o resto fica em "Mais detalhes" */}
      <LightDismissDialog
        open={showNewModal}
        onClose={() => setShowNewModal(false)}
        title="Novo cliente"
        subtitle="Só nome e WhatsApp. O resto é opcional."
      >
        <form onSubmit={handleCreateClient} className="space-y-4">
          <div>
            <label className={LABEL}>Nome *</label>
            <input
              type="text"
              required
              autoFocus
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              placeholder="Ex.: Lucas Oliveira"
              className={FIELD}
            />
          </div>

          <div>
            <label className={LABEL}>WhatsApp (com DDD) *</label>
            <input
              type="tel"
              required
              inputMode="numeric"
              value={newPhone}
              onChange={(e) => setNewPhone(e.target.value)}
              placeholder="(11) 99999-0000"
              className={FIELD}
            />
          </div>

          <details className="group rounded-xl border border-stone-800">
            <summary className="flex min-h-[44px] cursor-pointer list-none items-center justify-between gap-2 px-3.5 text-xs font-semibold text-stone-300">
              <span>Mais detalhes (CPF e observações)</span>
              <CaretDown size={14} className="transition-transform group-open:rotate-180" aria-hidden="true" />
            </summary>
            <div className="space-y-3 border-t border-stone-800 p-3.5">
              <div>
                <label className={LABEL}>CPF (opcional)</label>
                <input
                  type="text"
                  inputMode="numeric"
                  value={newCpf}
                  onChange={(e) => setNewCpf(e.target.value)}
                  placeholder="000.000.000-00"
                  className={FIELD}
                />
              </div>
              <div>
                <label className={LABEL}>Preferências de corte</label>
                <textarea
                  rows={2}
                  value={newNotes}
                  onChange={(e) => setNewNotes(e.target.value)}
                  placeholder="Ex.: degradê na zero, barba na navalha"
                  className={`${FIELD} py-3`}
                />
              </div>
            </div>
          </details>

          <div className="dialog-actions">
            <button type="button" onClick={() => setShowNewModal(false)} className={BTN_GHOST}>
              Cancelar
            </button>
            <button type="submit" className={BTN_PRIMARY}>
              Salvar
            </button>
          </div>
        </form>
      </LightDismissDialog>
    </div>
  );
};
