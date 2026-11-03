import React, { useState } from 'react';
import {
  ArrowClockwise,
  BellRinging,
  CheckCircle,
  ClockCounterClockwise,
  PaperPlaneTilt,
  WhatsappLogo,
} from '@phosphor-icons/react';
import { Client, ReminderLog } from '../types';

interface RemindersModuleProps {
  reminders: ReminderLog[];
  clients: Client[];
  onSendReminder: (reminderId: string) => void;
  onSimulateClientReply: (reminderId: string, reply: 'CONFIRM' | 'CANCEL') => void;
}

export const RemindersModule: React.FC<RemindersModuleProps> = ({
  reminders,
  clients,
  onSendReminder,
  onSimulateClientReply,
}) => {
  const [contactedClientIds, setContactedClientIds] = useState<string[]>([]);
  const [customTemplate, setCustomTemplate] = useState<string>(
    'Olá {nome}! Confirmamos seu horário hoje às {hora} com {profissional} na Barbearia & Estúdio Dom Pedro. Responda 1 para CONFIRMAR ou 2 para reagendar.'
  );

  const overdueClients = clients.filter((c) => c.lastVisitDaysAgo >= 21);

  const handleMarkCycleContacted = (clientId: string) => {
    setContactedClientIds((prev) =>
      prev.includes(clientId) ? prev : [...prev, clientId]
    );
  };

  return (
    <section aria-label="Central de Lembretes WhatsApp e Ciclo de Retorno">
      <div className="border-b border-[#DEDAD0] bg-white px-4 py-4 sm:px-6">
        <h1 className="text-xl font-semibold tracking-tight text-[#141413] sm:text-2xl">
          Lembretes Interativos & Recuperação de Ciclo (21 Dias)
        </h1>
        <p className="mt-1 text-sm text-[#4A4843]">
          Disparo automático de confirmação via WhatsApp (sem cobrar pacote extra como no Trinks) que atualiza o status na Agenda em tempo real.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 divide-y lg:divide-y-0 lg:divide-x divide-[#DEDAD0] bg-white">
        {/* Coluna Esquerda (7 cols): Fila de Confirmações do Dia */}
        <div className="lg:col-span-7 p-4 sm:p-6 space-y-4">
          <h2 className="text-base font-semibold text-[#141413]">
            Fila de Confirmação de Presença (24h e 2h Antes)
          </h2>

          <div className="divide-y divide-[#DEDAD0] rounded-lg border border-[#DEDAD0]">
            {reminders.map((rem) => (
              <div key={rem.id} className="p-4 space-y-3 bg-white">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-sm text-[#141413]">
                        {rem.clientName}
                      </span>
                      <span className="num-tabular rounded bg-[#F6F5F0] border border-[#DEDAD0] px-2 py-0.5 text-xs font-medium text-[#141413]">
                        Hoje às {rem.startTime}
                      </span>
                    </div>
                    <p className="mt-0.5 text-xs text-[#4A4843]">
                      {rem.serviceSummary} · Profissional: <strong>{rem.staffName}</strong>
                    </p>
                  </div>

                  <span
                    className={`self-start sm:self-center rounded border px-2.5 py-1 text-xs font-medium ${
                      rem.status === 'CONFIRMED_BY_CLIENT'
                        ? 'border-[#0F766E]/30 bg-[#E6F4F1] text-[#0F766E]'
                        : rem.status === 'CANCELLED_BY_CLIENT'
                        ? 'border-[#B91C1C]/30 bg-[#FEE2E2] text-[#B91C1C]'
                        : rem.status === 'SENT'
                        ? 'border-[#DEDAD0] bg-[#EFECE6] text-[#141413]'
                        : 'border-[#B45309]/30 bg-[#FEF3C7] text-[#B45309]'
                    }`}
                  >
                    {rem.status === 'CONFIRMED_BY_CLIENT'
                      ? 'Confirmado pelo Cliente ("1")'
                      : rem.status === 'CANCELLED_BY_CLIENT'
                      ? 'Cancelado — Vaga Liberada'
                      : rem.status === 'SENT'
                      ? `Enviado (${rem.sentAt || 'Agora'})`
                      : 'Disparo Pendente'}
                  </span>
                </div>

                <div className="flex flex-wrap items-center gap-2 pt-1">
                  {rem.status === 'PENDING' && (
                    <button
                      type="button"
                      onClick={() => onSendReminder(rem.id)}
                      className="inline-flex min-h-[36px] items-center gap-1.5 rounded-lg bg-[#0F766E] px-3 py-1.5 text-xs font-semibold text-white hover:bg-[#0B5C56]"
                    >
                      <PaperPlaneTilt size={15} weight="bold" />
                      <span>Disparar WhatsApp Agora</span>
                    </button>
                  )}

                  {rem.status !== 'CONFIRMED_BY_CLIENT' && (
                    <button
                      type="button"
                      onClick={() => onSimulateClientReply(rem.id, 'CONFIRM')}
                      className="inline-flex min-h-[36px] items-center gap-1.5 rounded-lg border border-[#0F766E] bg-[#E6F4F1]/60 px-3 py-1.5 text-xs font-medium text-[#0F766E] hover:bg-[#E6F4F1]"
                    >
                      <CheckCircle size={15} weight="bold" />
                      <span>Simular Resposta "1 - Confirmar" (Atualiza Agenda)</span>
                    </button>
                  )}

                  {rem.status !== 'CANCELLED_BY_CLIENT' && (
                    <button
                      type="button"
                      onClick={() => onSimulateClientReply(rem.id, 'CANCEL')}
                      className="inline-flex min-h-[36px] items-center gap-1.5 rounded-lg border border-[#DEDAD0] bg-white px-3 py-1.5 text-xs font-medium text-[#4A4843] hover:bg-[#F6F5F0]"
                    >
                      <span>Simular Cancelamento Antecipado</span>
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>

          {/* Editor de Template Personalizável (Estilo Reservio Standard liberado no Free) */}
          <div className="rounded-lg border border-[#DEDAD0] bg-[#F6F5F0]/60 p-4 space-y-2">
            <label
              htmlFor="whatsapp-template"
              className="block text-xs font-semibold text-[#141413]"
            >
              Template da Mensagem Automática (Variáveis: {'{nome}'}, {'{hora}'},{' '}
              {'{profissional}'})
            </label>
            <textarea
              id="whatsapp-template"
              rows={3}
              value={customTemplate}
              onChange={(e) => setCustomTemplate(e.target.value)}
              className="w-full rounded-lg border border-[#DEDAD0] bg-white p-3 text-xs text-[#141413]"
            />
          </div>
        </div>

        {/* Coluna Direita (5 cols): Lacuna de Mercado Coberta — Motor de Retorno de 21 Dias */}
        <div className="lg:col-span-5 bg-[#F6F5F0]/50 p-4 sm:p-6 space-y-4">
          <div>
            <h2 className="text-base font-semibold text-[#141413]">
              Reativação Automática de Ciclo (&gt; 21 Dias sem Cortar)
            </h2>
            <p className="mt-1 text-xs text-[#4A4843]">
              Diferencial exclusivo além dos 3 concorrentes: identifica clientes cujo ciclo médio de corte venceu e envia convite com link direto da agenda.
            </p>
          </div>

          <div className="divide-y divide-[#DEDAD0] rounded-lg border border-[#DEDAD0] bg-white">
            {overdueClients.map((client) => {
              const sent = contactedClientIds.includes(client.id);
              return (
                <div
                  key={client.id}
                  className="p-3.5 flex items-center justify-between gap-3"
                >
                  <div>
                    <span className="text-xs font-semibold text-[#141413] block">
                      {client.fullName}
                    </span>
                    <span className="num-tabular text-[11px] text-[#B45309] font-medium block">
                      Última visita há {client.lastVisitDaysAgo} dias · {client.visitsCount} cortes históricos
                    </span>
                    <span className="num-tabular text-[11px] text-[#6E6A63]">
                      {client.phoneWhatsapp}
                    </span>
                  </div>

                  {sent ? (
                    <span className="inline-flex items-center gap-1 rounded border border-[#0F766E]/30 bg-[#E6F4F1] px-2.5 py-1.5 text-xs font-medium text-[#0F766E]">
                      <CheckCircle size={14} weight="fill" />
                      <span>Convite Enviado</span>
                    </span>
                  ) : (
                    <button
                      type="button"
                      onClick={() => handleMarkCycleContacted(client.id)}
                      className="inline-flex min-h-[36px] items-center gap-1.5 rounded-lg bg-[#141413] px-3 py-1.5 text-xs font-medium text-white hover:bg-[#2B2A28]"
                    >
                      <WhatsappLogo size={15} weight="fill" />
                      <span>Convidar Retorno</span>
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
};
