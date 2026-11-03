import React, { useMemo, useState } from 'react';
import {
  CalendarCheck,
  Clock,
  Copy,
  MapPin,
  WhatsappLogo as MessageCircle,
  Paperclip,
  QrCode,
  Scissors,
  ShieldCheck,
  Sparkle as Sparkles,
} from '@phosphor-icons/react';
import {
  Appointment,
  BusinessConfig,
  OriginChannel,
  ServiceItem,
  StaffMember,
} from '../types';
import { formatCurrencyBRL } from '../utils/finance';

interface PublicBookingModuleProps {
  business: BusinessConfig;
  staff: StaffMember[];
  services: ServiceItem[];
  onCreatePublicBooking: (booking: Omit<Appointment, 'id'>) => void;
}

const AVAILABLE_TIMES = [
  '09:00',
  '10:00',
  '11:00',
  '13:30',
  '14:30',
  '15:30',
  '16:30',
  '17:30',
  '18:30',
  '19:30',
];

export const PublicBookingModule: React.FC<PublicBookingModuleProps> = ({
  business,
  staff,
  services,
  onCreatePublicBooking,
}) => {
  const professionals = staff.filter((s) => s.role === 'PROFESSIONAL');
  const [selectedServiceIds, setSelectedServiceIds] = useState<string[]>(
    services[0] ? [services[0].id] : []
  );
  const [selectedStaffId, setSelectedStaffId] = useState<string>(
    professionals[0]?.id ?? staff[0]?.id ?? ''
  );
  const [selectedTime, setSelectedTime] = useState<string>('15:30');
  const [clientName, setClientName] = useState('');
  const [clientPhone, setClientPhone] = useState('');
  const [originChannel] = useState<OriginChannel>('DIRECT_LINK');
  const [requireDeposit, setRequireDeposit] = useState(false);
  const [proofFileName, setProofFileName] = useState('');
  const [bookingCompleted, setBookingCompleted] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);

  const selectedServices = useMemo(
    () => services.filter((s) => selectedServiceIds.includes(s.id)),
    [services, selectedServiceIds]
  );

  const totalPrice = selectedServices.reduce((acc, s) => acc + s.price, 0);
  const totalDuration = selectedServices.reduce(
    (acc, s) => acc + s.durationMinutes,
    0
  );
  const depositAmount =
    Math.round(totalPrice * (business.noShowDepositPercent / 100) * 100) / 100;

  const toggleService = (id: string) => {
    setSelectedServiceIds((prev) =>
      prev.includes(id)
        ? prev.length > 1
          ? prev.filter((item) => item !== id)
          : prev
        : [...prev, id]
    );
  };

  const handleCopyBookingLink = () => {
    navigator.clipboard?.writeText(window.location.href);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2500);
  };

  const handleConfirmBooking = (e: React.FormEvent) => {
    e.preventDefault();
    if (!clientName.trim() || !clientPhone.trim()) return;

    const [h, m] = selectedTime.split(':').map(Number);
    const endMinutes = h * 60 + m + (totalDuration || 40);
    const endH = String(Math.floor(endMinutes / 60)).padStart(2, '0');
    const endM = String(endMinutes % 60).padStart(2, '0');

    onCreatePublicBooking({
      clientId: `cli_pub_${Date.now()}`,
      clientName: clientName.trim(),
      clientPhone: clientPhone.trim(),
      staffId: selectedStaffId || staff[0]?.id || 'st_01',
      serviceIds: selectedServiceIds,
      date: new Date().toISOString().slice(0, 10),
      startTime: selectedTime,
      endTime: `${endH}:${endM}`,
      customPrice: totalPrice,
      status: 'CONFIRMED',
      isWalkIn: false,
      isFirstVisitBoost: false,
      originChannel,
      deviceFingerprint: `fp_web_${Math.random().toString(36).slice(2, 7)}`,
      depositPixPaid: requireDeposit ? depositAmount : 0,
      paymentProofName: proofFileName || undefined,
      notes: 'Agendado pelo Link de Reserva da Barbearia',
    });

    setBookingCompleted(true);

    // Se a barbearia cadastrou WhatsApp na aba Gestão, abre confirmação via WhatsApp
    const barberDigits = (business.phone || '').replace(/\D/g, '');
    if (barberDigits) {
      const barberPhone = barberDigits.startsWith('55')
        ? barberDigits
        : `55${barberDigits}`;
      const selectedStaffObj = staff.find((s) => s.id === selectedStaffId);
      const servicesText = selectedServices.map((s) => s.name).join(' + ');
      const text = `Olá! Me chamo *${clientName.trim()}* (${clientPhone.trim()}). Acabei de agendar *${servicesText}* (${formatCurrencyBRL(
        totalPrice
      )}) para hoje às *${selectedTime}* com *${
        selectedStaffObj?.name ?? 'Barbeiro'
      }* na *${business.name}*.`;
      window.open(
        `https://wa.me/${barberPhone}?text=${encodeURIComponent(text)}`,
        '_blank',
        'noopener,noreferrer'
      );
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Top Share Bar for the Barber */}
      <div className="bg-stone-900/80 border border-amber-500/30 rounded-2xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="text-xs">
          <span className="font-bold text-amber-400 uppercase tracking-wider block">
            Página Pública de Agendamento da Sua Barbearia
          </span>
          <span className="text-stone-300">
            Envie este link na bio do Instagram ou no WhatsApp dos seus clientes. Quando eles agendarem abaixo, o horário cai direto na sua aba <strong>Agenda</strong> e <strong>Clientes</strong>.
          </span>
        </div>
        <button
          type="button"
          onClick={handleCopyBookingLink}
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-stone-950 font-bold text-xs shrink-0 transition-all cursor-pointer"
        >
          <Copy className="w-3.5 h-3.5" />
          {copiedLink ? 'Link Copiado!' : 'Copiar Link de Agendamento'}
        </button>
      </div>

      {/* Storefront Hero Banner */}
      <div className="bg-gradient-to-br from-stone-900 via-stone-900 to-amber-950/30 border border-stone-800 rounded-3xl p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="space-y-2">
          <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded-full bg-amber-500/15 border border-amber-500/30 text-amber-300 text-xs font-semibold">
            <Sparkles className="w-3.5 h-3.5" />
            <span>Agendamento Online 24h • Sem precisar baixar aplicativo</span>
          </div>
          <h2 className="text-2xl font-bold text-stone-100">{business.name}</h2>
          <p className="text-xs text-stone-400 flex items-center gap-1.5">
            <MapPin className="w-3.5 h-3.5 text-amber-400 shrink-0" />
            <span>
              {business.address} • {business.neighborhood}, {business.cityState}
            </span>
          </p>
        </div>

        <div className="bg-stone-950/80 border border-stone-800 rounded-2xl p-4 text-right shrink-0">
          <span className="text-[11px] uppercase tracking-wider text-stone-400">
            Total Selecionado
          </span>
          <div className="text-2xl font-bold font-mono text-amber-400">
            {formatCurrencyBRL(totalPrice)}
          </div>
          <div className="text-[11px] text-stone-400 flex items-center justify-end gap-1 mt-0.5">
            <Clock className="w-3 h-3" />
            <span>Duração média: {totalDuration} min</span>
          </div>
        </div>
      </div>

      {bookingCompleted ? (
        <div className="bg-emerald-950/30 border border-emerald-500/40 rounded-3xl p-8 text-center space-y-4">
          <div className="w-14 h-14 rounded-2xl bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center mx-auto text-emerald-300">
            <CalendarCheck className="w-7 h-7" />
          </div>
          <h3 className="text-xl font-bold text-stone-100">
            Horário Reservado com Sucesso para {clientName}!
          </h3>
          <p className="text-sm text-stone-300 max-w-md mx-auto">
            O agendamento hoje às{' '}
            <span className="font-mono font-bold text-emerald-300">
              {selectedTime}
            </span>{' '}
            já foi salvo na <strong>Agenda</strong> da barbearia.
          </p>
          <button
            onClick={() => {
              setBookingCompleted(false);
              setClientName('');
              setClientPhone('');
              setProofFileName('');
            }}
            className="px-5 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-stone-950 font-bold text-xs transition-all cursor-pointer"
          >
            Fazer Outro Agendamento
          </button>
        </div>
      ) : (
        <form
          onSubmit={handleConfirmBooking}
          className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start"
        >
          {/* Left 7 Cols: Services + Barber + Time */}
          <div className="lg:col-span-7 space-y-5">
            {/* Step 1: Services */}
            <div className="bg-stone-900/60 border border-stone-800 rounded-2xl p-5 space-y-3">
              <h3 className="text-sm font-bold text-stone-100 flex items-center gap-2">
                <Scissors className="w-4 h-4 text-amber-400" />
                <span>1. Escolha os Serviços e Valores</span>
              </h3>
              <div className="space-y-2">
                {services.map((srv) => {
                  const selected = selectedServiceIds.includes(srv.id);
                  return (
                    <button
                      key={srv.id}
                      type="button"
                      onClick={() => toggleService(srv.id)}
                      className={`w-full flex items-center justify-between p-3.5 rounded-xl border text-left transition-all cursor-pointer ${
                        selected
                          ? 'bg-amber-500/15 border-amber-500/50 text-stone-100'
                          : 'bg-stone-950/70 border-stone-800/80 text-stone-400 hover:text-stone-200'
                      }`}
                    >
                      <div>
                        <div className="text-sm font-semibold">{srv.name}</div>
                        <div className="text-[11px] text-stone-400">
                          {srv.durationMinutes} min
                        </div>
                      </div>
                      <span className="font-mono text-sm font-bold text-amber-400">
                        {formatCurrencyBRL(srv.price)}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Step 2: Barber & Time */}
            <div className="bg-stone-900/60 border border-stone-800 rounded-2xl p-5 space-y-4">
              <h3 className="text-sm font-bold text-stone-100">
                2. Profissional e Horário Disponível
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                {staff.map((pro) => (
                  <button
                    key={pro.id}
                    type="button"
                    onClick={() => setSelectedStaffId(pro.id)}
                    className={`p-3 rounded-xl border text-left transition-all cursor-pointer ${
                      selectedStaffId === pro.id
                        ? 'bg-amber-500/15 border-amber-500/50 text-stone-100'
                        : 'bg-stone-950 border-stone-800 text-stone-400'
                    }`}
                  >
                    <div className="text-xs font-bold">{pro.name}</div>
                    <div className="text-[11px] text-stone-400">
                      {pro.specialty} • {pro.chairLabel}
                    </div>
                  </button>
                ))}
              </div>

              <div className="pt-2">
                <span className="block text-xs text-stone-400 mb-2">
                  Horários Livres Hoje:
                </span>
                <div className="grid grid-cols-5 gap-2">
                  {AVAILABLE_TIMES.map((t) => (
                    <button
                      key={t}
                      type="button"
                      onClick={() => setSelectedTime(t)}
                      className={`py-2 rounded-xl font-mono text-xs font-semibold border transition-all cursor-pointer ${
                        selectedTime === t
                          ? 'bg-amber-500 text-stone-950 border-amber-400 font-bold'
                          : 'bg-stone-950 text-stone-300 border-stone-800 hover:border-stone-700'
                      }`}
                    >
                      {t}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Right 5 Cols: Client Info + Pix Signal + WhatsApp Confirm */}
          <div className="lg:col-span-5 bg-stone-900 border border-stone-800 rounded-2xl p-5 space-y-4">
            <h3 className="text-sm font-bold text-stone-100">
              3. Seus Dados para Confirmar
            </h3>

            <div className="space-y-3">
              <div>
                <label className="block text-xs text-stone-300 mb-1">
                  Seu Nome Completo *
                </label>
                <input
                  type="text"
                  required
                  value={clientName}
                  onChange={(e) => setClientName(e.target.value)}
                  placeholder="Ex: Matheus Henrique"
                  className="w-full bg-stone-950 border border-stone-800 rounded-xl px-3.5 py-2.5 text-sm text-stone-100 focus:outline-none focus:border-amber-500"
                />
              </div>

              <div>
                <label className="block text-xs text-stone-300 mb-1">
                  Seu WhatsApp (com DDD) *
                </label>
                <input
                  type="tel"
                  required
                  value={clientPhone}
                  onChange={(e) => setClientPhone(e.target.value)}
                  placeholder="(11) 99999-0000"
                  className="w-full bg-stone-950 border border-stone-800 rounded-xl px-3.5 py-2.5 text-sm text-stone-100 focus:outline-none focus:border-amber-500"
                />
              </div>
            </div>

            {/* Opção de Sinal Pix e Comprovante */}
            <div className="p-3.5 rounded-xl bg-stone-950 border border-stone-800 space-y-2.5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-xs font-semibold text-amber-300">
                  <QrCode className="w-4 h-4" />
                  <span>
                    Adiantar Sinal Pix ({business.noShowDepositPercent}%)
                  </span>
                </div>
                <input
                  type="checkbox"
                  checked={requireDeposit}
                  onChange={(e) => setRequireDeposit(e.target.checked)}
                  className="accent-amber-500 w-4 h-4 cursor-pointer"
                />
              </div>
              {business.pixKey && (
                <div className="text-[11px] font-mono text-stone-300 bg-stone-900 px-2.5 py-1.5 rounded-lg border border-stone-800">
                  Chave Pix da Barbearia: <strong>{business.pixKey}</strong>
                </div>
              )}
              <p className="text-[11px] text-stone-400">
                Valor do sinal:{' '}
                <span className="font-mono font-bold text-stone-200">
                  {formatCurrencyBRL(depositAmount)}
                </span>{' '}
                (abatido do valor do corte na hora).
              </p>

              {requireDeposit && (
                <label className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-stone-900 hover:bg-stone-800 text-amber-300 border border-stone-700 text-[11px] font-semibold cursor-pointer">
                  <Paperclip className="w-3.5 h-3.5" />
                  {proofFileName
                    ? `Comprovante: ${proofFileName}`
                    : 'Anexar Comprovante do Pix'}
                  <input
                    type="file"
                    accept="image/*,.pdf"
                    onChange={(e) =>
                      setProofFileName(e.target.files?.[0]?.name ?? '')
                    }
                    className="hidden"
                  />
                </label>
              )}
            </div>

            <div className="flex items-center gap-2 text-[11px] text-stone-400">
              <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0" />
              <span>
                Cancelamento gratuito até {business.cancelNoticeHours}h antes do horário.
              </span>
            </div>

            <button
              type="submit"
              className="w-full py-3.5 px-4 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-stone-950 font-bold text-sm transition-all cursor-pointer shadow-lg shadow-emerald-500/10 flex items-center justify-center gap-2"
            >
              <MessageCircle className="w-4 h-4" />
              Confirmar Agendamento ({formatCurrencyBRL(totalPrice)})
            </button>
          </div>
        </form>
      )}
    </div>
  );
};
