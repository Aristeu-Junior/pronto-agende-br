import React, { useState } from 'react';
import {
  BellRinging as BellRing,
  CheckCircle as CheckCircle2,
  Clock,
  WhatsappLogo as MessageCircle,
  PaperPlaneRight as Send,
  DeviceMobile as Smartphone,
} from '@phosphor-icons/react';
import {
  Appointment,
  BusinessConfig,
  ReminderLog,
  ServiceItem,
  StaffMember,
} from '../types';
import { formatCurrencyBRL } from '../utils/finance';

interface RemindersModuleProps {
  reminders: ReminderLog[];
  appointments: Appointment[];
  business: BusinessConfig;
  staff: StaffMember[];
  services: ServiceItem[];
  onDispatchAllPending: () => void;
  onSimulateClientReply: (
    reminderId: string,
    reply: 'CONFIRMED_BY_CLIENT' | 'CANCELLED_BY_CLIENT'
  ) => void;
}

export const RemindersModule: React.FC<RemindersModuleProps> = ({
  appointments,
  business,
  staff,
  services,
}) => {
  const [template24h, setTemplate24h] = useState(
    'Olá {nome}! Tudo bem? Passando para confirmar seu horário na *{barbearia}* hoje às *{hora}* com *{profissional}* ({servico} - {valor}). Podemos confirmar sua presença?'
  );

  // Disparo avulso rápido
  const [quickName, setQuickName] = useState('');
  const [quickPhone, setQuickPhone] = useState('');
  const [quickTime, setQuickTime] = useState('15:00');
  const [sentIds, setSentIds] = useState<string[]>([]);

  const buildPersonalizedMessage = (params: {
    clientName: string;
    time: string;
    staffName: string;
    serviceName: string;
    priceFormatted: string;
  }) => {
    return template24h
      .replace(/\{nome\}/g, params.clientName)
      .replace(/\{hora\}/g, params.time)
      .replace(/\{profissional\}/g, params.staffName)
      .replace(/\{barbearia\}/g, business.name)
      .replace(/\{servico\}/g, params.serviceName)
      .replace(/\{valor\}/g, params.priceFormatted);
  };

  const handleSendWhatsAppForAppointment = (apt: Appointment) => {
    const digits = (apt.clientPhone || '').replace(/\D/g, '');
    if (!digits) {
      alert(
        `O cliente "${apt.clientName}" está sem WhatsApp cadastrado. Clique nele na aba Agenda ou Clientes para adicionar o DDD + número.`
      );
      return;
    }

    const phoneWithCountry = digits.startsWith('55') ? digits : `55${digits}`;
    const staffMember = staff.find((s) => s.id === apt.staffId);
    const aptServices = services.filter((s) => apt.serviceIds.includes(s.id));
    const serviceNames =
      aptServices.map((s) => s.name).join(' + ') || 'Corte / Atendimento';
    const price =
      apt.customPrice !== undefined
        ? apt.customPrice
        : aptServices.reduce((acc, s) => acc + s.price, 0);

    const msg = buildPersonalizedMessage({
      clientName: apt.clientName,
      time: apt.startTime,
      staffName: staffMember?.name ?? 'Barbeiro',
      serviceName: serviceNames,
      priceFormatted: formatCurrencyBRL(price),
    });

    setSentIds((prev) => (prev.includes(apt.id) ? prev : [...prev, apt.id]));

    window.open(
      `https://wa.me/${phoneWithCountry}?text=${encodeURIComponent(msg)}`,
      '_blank',
      'noopener,noreferrer'
    );
  };

  const handleQuickSendWhatsApp = (e: React.FormEvent) => {
    e.preventDefault();
    const digits = quickPhone.replace(/\D/g, '');
    if (!digits) {
      alert('Digite o DDD + WhatsApp do cliente para abrir a conversa.');
      return;
    }
    const phoneWithCountry = digits.startsWith('55') ? digits : `55${digits}`;
    const msg = buildPersonalizedMessage({
      clientName: quickName.trim() || 'Cliente',
      time: quickTime || 'horário agendado',
      staffName: staff[0]?.name ?? 'Barbeiro',
      serviceName: services[0]?.name ?? 'Corte',
      priceFormatted: formatCurrencyBRL(services[0]?.price ?? 45),
    });

    window.open(
      `https://wa.me/${phoneWithCountry}?text=${encodeURIComponent(msg)}`,
      '_blank',
      'noopener,noreferrer'
    );
  };

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="bg-stone-900/70 border border-stone-800/80 rounded-2xl p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="inline-flex items-center gap-2 text-xs font-mono uppercase tracking-wider text-emerald-400">
            <BellRing className="w-3.5 h-3.5" />
            <span>Confirmação Direta no WhatsApp Real do Cliente</span>
          </div>
          <h2 className="text-lg font-bold text-stone-100">
            Central de Lembretes Anti-Falta via WhatsApp
          </h2>
          <p className="text-xs text-stone-400">
            Clique em &ldquo;Enviar no WhatsApp&rdquo; em qualquer cliente agendado para abrir a conversa oficial com a mensagem pronta.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left 7 Cols: Lista de Clientes Agendados para Enviar Lembrete Real */}
        <div className="lg:col-span-7 space-y-4">
          <div className="bg-stone-900/50 border border-stone-800/80 rounded-2xl overflow-hidden">
            <div className="px-4 py-3 border-b border-stone-800 bg-stone-950/50 flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-stone-300">
                Clientes na Agenda para Confirmar ({appointments.length})
              </span>
              <span className="text-[11px] text-emerald-400 font-mono">
                Abre WhatsApp Web / App Oficial
              </span>
            </div>

            {appointments.length === 0 ? (
              <div className="p-8 text-center space-y-2">
                <MessageCircle className="w-8 h-8 text-stone-500 mx-auto" />
                <div className="text-sm font-semibold text-stone-200">
                  Nenhum horário agendado no momento
                </div>
                <p className="text-xs text-stone-400 max-w-md mx-auto">
                  Assim que você cadastrar um cliente na aba <strong>Agenda</strong> ou o cliente reservar pelo <strong>Link de Reserva</strong>, ele aparecerá aqui pronto para você disparar o lembrete pelo WhatsApp.
                </p>
              </div>
            ) : (
              <div className="divide-y divide-stone-800/60">
                {appointments.map((apt) => {
                  const staffMember = staff.find((s) => s.id === apt.staffId);
                  const aptServices = services.filter((s) =>
                    apt.serviceIds.includes(s.id)
                  );
                  const price =
                    apt.customPrice !== undefined
                      ? apt.customPrice
                      : aptServices.reduce((acc, s) => acc + s.price, 0);
                  const wasSent = sentIds.includes(apt.id);

                  return (
                    <div
                      key={apt.id}
                      className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:bg-stone-800/25 transition-colors"
                    >
                      <div className="space-y-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-mono text-xs font-bold px-2 py-0.5 rounded bg-amber-500/15 text-amber-300 border border-amber-500/30">
                            {apt.startTime}
                          </span>
                          <span className="font-semibold text-stone-100 text-sm">
                            {apt.clientName}
                          </span>
                          <span className="text-xs font-mono text-stone-400">
                            ({apt.clientPhone || 'Sem telefone'})
                          </span>
                        </div>
                        <p className="text-xs text-stone-400">
                          {aptServices.map((s) => s.name).join(' + ') || 'Corte'}{' '}
                          • Com <strong className="text-stone-200">{staffMember?.name}</strong> •{' '}
                          <span className="text-amber-400 font-mono font-semibold">
                            {formatCurrencyBRL(price)}
                          </span>
                        </p>
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        {wasSent && (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-emerald-500/15 text-emerald-300 border border-emerald-500/30 text-[11px] font-semibold">
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            Enviado
                          </span>
                        )}
                        <button
                          type="button"
                          onClick={() => handleSendWhatsAppForAppointment(apt)}
                          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-stone-950 font-bold text-xs shadow-md shadow-emerald-500/10 transition-all cursor-pointer"
                        >
                          <MessageCircle className="w-4 h-4" />
                          Enviar Lembrete no WhatsApp
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Disparo Rápido Avulso para Qualquer Número */}
          <form
            onSubmit={handleQuickSendWhatsApp}
            className="bg-stone-900/70 border border-stone-800 rounded-2xl p-5 space-y-4"
          >
            <div className="flex items-center gap-2">
              <Send className="w-4 h-4 text-amber-400" />
              <h3 className="text-sm font-bold text-stone-100">
                Disparo Rápido de Confirmação para Qualquer WhatsApp
              </h3>
            </div>
            <p className="text-xs text-stone-400">
              Quer mandar o lembrete para um cliente no WhatsApp agora mesmo digitando o número? Preencha abaixo:
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="block text-[11px] text-stone-400 mb-1">
                  Nome do Cliente
                </label>
                <input
                  type="text"
                  value={quickName}
                  onChange={(e) => setQuickName(e.target.value)}
                  placeholder="Ex: Gabriel"
                  className="w-full bg-stone-950 border border-stone-800 rounded-xl px-3 py-2 text-xs text-stone-100 focus:outline-none focus:border-amber-500"
                />
              </div>
              <div>
                <label className="block text-[11px] text-stone-400 mb-1">
                  WhatsApp com DDD *
                </label>
                <input
                  type="tel"
                  required
                  value={quickPhone}
                  onChange={(e) => setQuickPhone(e.target.value)}
                  placeholder="(11) 99999-9999"
                  className="w-full bg-stone-950 border border-stone-800 rounded-xl px-3 py-2 text-xs font-mono text-stone-100 focus:outline-none focus:border-amber-500"
                />
              </div>
              <div>
                <label className="block text-[11px] text-stone-400 mb-1">
                  Horário do Corte
                </label>
                <input
                  type="time"
                  value={quickTime}
                  onChange={(e) => setQuickTime(e.target.value)}
                  className="w-full bg-stone-950 border border-stone-800 rounded-xl px-3 py-2 text-xs font-mono text-stone-100 focus:outline-none focus:border-amber-500"
                />
              </div>
            </div>
            <button
              type="submit"
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-stone-950 font-bold text-xs transition-all cursor-pointer"
            >
              <MessageCircle className="w-4 h-4" />
              Abrir Conversa no WhatsApp Agora
            </button>
          </form>
        </div>

        {/* Right 5 Cols: Editor do Texto da Mensagem */}
        <div className="lg:col-span-5 bg-stone-900 border border-stone-800 rounded-2xl p-5 space-y-4">
          <div className="flex items-center gap-2 border-b border-stone-800 pb-3">
            <Smartphone className="w-4 h-4 text-emerald-400" />
            <h3 className="text-sm font-bold text-stone-100">
              Personalizar Mensagem do WhatsApp
            </h3>
          </div>

          <div className="space-y-2">
            <label className="block text-xs font-medium text-stone-300">
              Texto que será preenchido automaticamente no seu WhatsApp:
            </label>
            <textarea
              rows={5}
              value={template24h}
              onChange={(e) => setTemplate24h(e.target.value)}
              className="w-full bg-stone-950 border border-stone-800 rounded-xl p-3 text-xs text-stone-200 leading-relaxed focus:outline-none focus:border-amber-500"
            />
            <p className="text-[11px] text-stone-400">
              Variáveis automáticas disponíveis:{' '}
              <code className="text-amber-300">{'{nome}'}</code>,{' '}
              <code className="text-amber-300">{'{hora}'}</code>,{' '}
              <code className="text-amber-300">{'{profissional}'}</code>,{' '}
              <code className="text-amber-300">{'{barbearia}'}</code>,{' '}
              <code className="text-amber-300">{'{servico}'}</code>,{' '}
              <code className="text-amber-300">{'{valor}'}</code>.
            </p>
          </div>

          <div className="p-3.5 rounded-xl bg-stone-950/90 border border-stone-800/80 space-y-1.5 text-xs">
            <div className="flex items-center gap-1.5 text-amber-400 font-semibold">
              <Clock className="w-3.5 h-3.5" />
              <span>Prévia de como chega no celular do cliente:</span>
            </div>
            <p className="text-stone-300 italic leading-relaxed">
              &ldquo;
              {buildPersonalizedMessage({
                clientName: 'Lucas',
                time: '16:00',
                staffName: staff[0]?.name ?? 'Barbeiro',
                serviceName: services[0]?.name ?? 'Corte Masculino',
                priceFormatted: formatCurrencyBRL(services[0]?.price ?? 45),
              })}
              &rdquo;
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
