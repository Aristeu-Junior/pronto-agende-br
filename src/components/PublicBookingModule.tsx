import React, { useEffect, useMemo, useState } from 'react';
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
import { sanitizeUserText, validateSafeReceiptFile } from '../utils/security';
import { MonthCalendar } from './MonthCalendar';
import { SlotPicker } from './SlotPicker';
import { buildPixPayload } from '../utils/pix';
import {
  bookingWindow,
  formatDateBR,
  formatDateLong,
  getDayState,
  getFreeSlots,
  localISODate,
  minToTime,
  servicesSpan,
  timeToMin,
} from '../utils/schedule';

interface PublicBookingModuleProps {
  business: BusinessConfig;
  staff: StaffMember[];
  services: ServiceItem[];
  appointments: Appointment[];
  onCreatePublicBooking: (booking: Omit<Appointment, 'id'>) => void;
}

export const PublicBookingModule: React.FC<PublicBookingModuleProps> = ({
  business,
  staff,
  services,
  appointments,
  onCreatePublicBooking,
}) => {
  const professionals = staff.filter((s) => s.role === 'PROFESSIONAL');
  const [selectedServiceIds, setSelectedServiceIds] = useState<string[]>(
    services[0] ? [services[0].id] : []
  );
  const [selectedStaffId, setSelectedStaffId] = useState<string>(
    professionals[0]?.id ?? staff[0]?.id ?? ''
  );
  const [selectedTime, setSelectedTime] = useState<string>('');
  const [selectedDate, setSelectedDate] = useState<string>(localISODate());
  const [copiedPix, setCopiedPix] = useState(false);
  const [bookedSummary, setBookedSummary] = useState<{
    date: string;
    time: string;
    pix: string | null;
    deposit: number;
  } | null>(null);
  const [clientName, setClientName] = useState('');
  const [clientPhone, setClientPhone] = useState('');
  const [originChannel] = useState<OriginChannel>('DIRECT_LINK');
  const [requireDeposit, setRequireDeposit] = useState(false);
  const [proofFileName, setProofFileName] = useState('');
  const [bookingCompleted, setBookingCompleted] = useState(false);

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

  const windowRange = bookingWindow(business);
  const selectedStaff = staff.find((s) => s.id === selectedStaffId);
  const span = servicesSpan(selectedServices);
  const minNotice = business.minNoticeMinutes ?? 60;

  const slots = useMemo(
    () =>
      getFreeSlots({
        staff: selectedStaff,
        date: selectedDate,
        durationMinutes: span.duration,
        bufferMinutes: span.buffer,
        appointments,
        minNoticeMinutes: minNotice,
      }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [selectedStaff, selectedDate, span.duration, span.buffer, appointments, minNotice]
  );

  // Se o horário escolhido deixou de existir (trocou serviço, barbeiro ou data), limpa a escolha.
  useEffect(() => {
    if (selectedTime && !slots.includes(selectedTime)) setSelectedTime('');
  }, [slots, selectedTime]);

  // Ao abrir ou trocar de barbeiro, pula para o primeiro dia com horário livre.
  useEffect(() => {
    if (!selectedStaff) return;
    let day = windowRange.min;
    for (let i = 0; i < 60 && day <= windowRange.max; i++) {
      const has =
        getFreeSlots({
          staff: selectedStaff,
          date: day,
          durationMinutes: span.duration,
          bufferMinutes: span.buffer,
          appointments,
          minNoticeMinutes: minNotice,
        }).length > 0;
      if (has) {
        setSelectedDate(day);
        return;
      }
      const d = new Date(day + 'T12:00:00');
      d.setDate(d.getDate() + 1);
      day = localISODate(d);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedStaffId]);

  const pixPayload = useMemo(
    () =>
      business.pixKey
        ? buildPixPayload({
            key: business.pixKey,
            keyType: business.pixKeyType,
            amount: depositAmount,
            merchantName: business.name,
            city: (business.cityState || '').split('-')[0],
          })
        : null,
    [business.pixKey, business.pixKeyType, business.name, business.cityState, depositAmount]
  );

  const toggleService = (id: string) => {
    setSelectedServiceIds((prev) =>
      prev.includes(id)
        ? prev.length > 1
          ? prev.filter((item) => item !== id)
          : prev
        : [...prev, id]
    );
  };

  const handleConfirmBooking = (e: React.FormEvent) => {
    e.preventDefault();
    if (!clientName.trim() || !clientPhone.trim() || !selectedTime) return;
    // Reconfere na hora de salvar: outro agendamento pode ter ocupado o horário.
    if (!slots.includes(selectedTime)) {
      setSelectedTime('');
      return;
    }

    const endTime = minToTime(timeToMin(selectedTime) + (totalDuration || 40));

    onCreatePublicBooking({
      clientId: `cli_pub_${Date.now()}`,
      clientName: sanitizeUserText(clientName.trim(), 80),
      clientPhone: sanitizeUserText(clientPhone.trim(), 30),
      staffId: selectedStaffId || staff[0]?.id || 'st_01',
      serviceIds: selectedServiceIds,
      date: selectedDate,
      startTime: selectedTime,
      endTime,
      customPrice: totalPrice,
      status: requireDeposit ? 'PENDING' : 'CONFIRMED',
      isWalkIn: false,
      isFirstVisitBoost: false,
      originChannel,
      deviceFingerprint: `fp_web_${Math.random().toString(36).slice(2, 7)}`,
      depositPixPaid: 0,
      depositRequested: requireDeposit ? depositAmount : 0,
      paymentProofName: proofFileName || undefined,
      notes: 'Agendado pelo Link de Reserva da Barbearia',
    });

    setBookedSummary({
      date: selectedDate,
      time: selectedTime,
      pix: requireDeposit ? pixPayload : null,
      deposit: requireDeposit ? depositAmount : 0,
    });
    setBookingCompleted(true);

    // Se a barbearia cadastrou WhatsApp na aba Ajustes, abre confirmação via WhatsApp
    const barberDigits = (business.phone || '').replace(/\D/g, '');
    if (barberDigits) {
      const barberPhone = barberDigits.startsWith('55')
        ? barberDigits
        : `55${barberDigits}`;
      const selectedStaffObj = staff.find((s) => s.id === selectedStaffId);
      const servicesText = selectedServices.map((s) => s.name).join(' + ');
      const text = `Olá! Me chamo *${clientName.trim()}* (${clientPhone.trim()}). Acabei de agendar *${servicesText}* (${formatCurrencyBRL(
        totalPrice
      )}) para *${formatDateLong(selectedDate)}* às *${selectedTime}* com *${
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
          <span className="font-bold text-amber-700 uppercase tracking-wider block">
            Tela de Agendamento do Cliente
          </span>
          <span className="text-stone-300">
            Os horários livres vêm da sua escala e do que já está na <strong>Agenda</strong>. Por enquanto, a reserva só é salva quando feita neste aparelho (balcão ou tablet da barbearia).
          </span>
        </div>
      </div>

      {/* Storefront Hero Banner */}
      <div className="bg-gradient-to-br from-stone-900 via-stone-900 to-amber-950/30 border border-stone-800 rounded-3xl p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="space-y-2">
          <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded-full bg-amber-500/15 border border-amber-500/30 text-amber-800 text-xs font-semibold">
            <Sparkles className="w-3.5 h-3.5" />
            <span>Escolha serviço, dia e horário • Sem baixar aplicativo</span>
          </div>
          <h2 className="text-2xl font-bold text-stone-100">{business.name}</h2>
          <p className="text-xs text-stone-400 flex items-center gap-1.5">
            <MapPin className="w-3.5 h-3.5 text-amber-700 shrink-0" />
            <span>
              {business.address} • {business.neighborhood}, {business.cityState}
            </span>
          </p>
        </div>

        <div className="bg-stone-950/80 border border-stone-800 rounded-2xl p-4 text-right shrink-0">
          <span className="text-[11px] uppercase tracking-wider text-stone-400">
            Total Selecionado
          </span>
          <div className="text-2xl font-bold font-mono text-amber-700">
            {formatCurrencyBRL(totalPrice)}
          </div>
          <div className="text-[11px] text-stone-400 flex items-center justify-end gap-1 mt-0.5">
            <Clock className="w-3 h-3" />
            <span>Duração: {totalDuration} min</span>
          </div>
          {selectedTime && (
            <div className="mt-1 text-[11px] font-semibold text-stone-200">
              {formatDateLong(selectedDate)} · {selectedTime}
            </div>
          )}
        </div>
      </div>

      {bookingCompleted ? (
        <div className="bg-emerald-950/30 border border-emerald-500/40 rounded-3xl p-8 text-center space-y-4">
          <div className="w-14 h-14 rounded-2xl bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center mx-auto text-emerald-700">
            <CalendarCheck className="w-7 h-7" />
          </div>
          <h3 className="text-xl font-bold text-stone-100">
            Horário Reservado com Sucesso para {clientName}!
          </h3>
          <p className="text-sm text-stone-300 max-w-md mx-auto">
            O agendamento em{' '}
            <span className="font-mono font-bold text-emerald-700">
              {formatDateLong(bookedSummary?.date ?? selectedDate)} às {bookedSummary?.time ?? selectedTime}
            </span>{' '}
            já foi salvo na <strong>Agenda</strong> da barbearia.
          </p>
          {bookedSummary && bookedSummary.deposit > 0 && (
            <div className="mx-auto max-w-md space-y-2 rounded-2xl border border-stone-800 bg-stone-900 p-4 text-left">
              <p className="text-xs font-semibold text-stone-100">
                Falta o sinal de {formatCurrencyBRL(bookedSummary.deposit)} para garantir o horário.
              </p>
              {bookedSummary.pix ? (
                <>
                  <p className="text-[11px] text-stone-400">
                    No app do banco, escolha Pix Copia e Cola e cole o código:
                  </p>
                  <textarea
                    readOnly
                    value={bookedSummary.pix}
                    rows={3}
                    aria-label="Pix copia e cola"
                    className="w-full resize-none rounded-lg border border-stone-800 bg-stone-950 p-2 font-mono text-[11px] text-stone-200"
                  />
                  <button
                    type="button"
                    onClick={() => {
                      navigator.clipboard?.writeText(bookedSummary.pix as string);
                      setCopiedPix(true);
                      setTimeout(() => setCopiedPix(false), 2500);
                    }}
                    className="w-full rounded-lg bg-amber-500 py-2 text-xs font-bold text-stone-950 cursor-pointer"
                  >
                    {copiedPix ? 'Código copiado!' : 'Copiar código Pix'}
                  </button>
                </>
              ) : (
                <p className="text-[11px] text-stone-400">
                  A barbearia ainda não cadastrou uma chave Pix válida. Combine o pagamento pelo WhatsApp.
                </p>
              )}
              <p className="text-[11px] text-stone-400">
                O horário fica como <strong>aguardando sinal</strong> até a barbearia confirmar o recebimento.
              </p>
            </div>
          )}
          <button
            onClick={() => {
              setBookingCompleted(false);
              setBookedSummary(null);
              setSelectedTime('');
              setClientName('');
              setClientPhone('');
              setProofFileName('');
            }}
            className="px-5 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-stone-950 font-bold text-xs transition-all cursor-pointer"
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
                <Scissors className="w-4 h-4 text-amber-700" />
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
                      <span className="font-mono text-sm font-bold text-amber-700">
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
                <span className="block text-xs font-semibold text-stone-300 mb-2">
                  Escolha o dia
                </span>
                <MonthCalendar
                  value={selectedDate}
                  onChange={(iso) => {
                    setSelectedDate(iso);
                    setSelectedTime('');
                  }}
                  min={windowRange.min}
                  max={windowRange.max}
                  getMarker={(iso) => ({ closed: getDayState(selectedStaff, iso) !== 'OPEN' })}
                />
              </div>

              <div className="pt-2">
                <span className="block text-xs font-semibold text-stone-300 mb-2">
                  Horários livres em {formatDateBR(selectedDate)}
                </span>
                <SlotPicker
                  slots={slots}
                  value={selectedTime}
                  onChange={setSelectedTime}
                  emptyMessage={
                    getDayState(selectedStaff, selectedDate) === 'OPEN'
                      ? 'Sem horários livres nesta data para os serviços escolhidos. Tente outro dia.'
                      : 'O barbeiro não atende neste dia. Escolha outra data.'
                  }
                />
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
                <div className="flex items-center gap-2 text-xs font-semibold text-amber-800">
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
              {requireDeposit && !pixPayload && (
                <p className="text-[11px] font-medium text-rose-700">
                  Cadastre uma chave Pix válida em Ajustes (escolha também o tipo da chave) para gerar o código de pagamento.
                </p>
              )}
              <p className="text-[11px] text-stone-400">
                Valor do sinal:{' '}
                <span className="font-mono font-bold text-stone-200">
                  {formatCurrencyBRL(depositAmount)}
                </span>{' '}
                (abatido do valor do corte na hora).
              </p>

              {requireDeposit && (
                <label className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-stone-900 hover:bg-stone-800 text-amber-800 border border-stone-700 text-[11px] font-semibold cursor-pointer">
                  <Paperclip className="w-3.5 h-3.5" />
                  {proofFileName
                    ? `Comprovante: ${proofFileName}`
                    : 'Anexar Comprovante do Pix'}
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
                      setProofFileName(check.safeName);
                    }}
                    className="hidden"
                  />
                </label>
              )}
            </div>

            <div className="flex items-center gap-2 text-[11px] text-stone-400">
              <ShieldCheck className="w-4 h-4 text-emerald-700 shrink-0" />
              <span>
                Cancelamento gratuito até {business.cancelNoticeHours}h antes do horário.
              </span>
            </div>

            <button
              type="submit"
              disabled={!selectedTime}
              className="w-full py-3.5 px-4 rounded-xl disabled:opacity-40 disabled:cursor-not-allowed bg-emerald-500 hover:bg-emerald-600 text-stone-100 font-bold text-sm transition-all cursor-pointer shadow-lg shadow-emerald-500/10 flex items-center justify-center gap-2"
            >
              <MessageCircle className="w-4 h-4" />
              {selectedTime ? `Confirmar Agendamento (${formatCurrencyBRL(totalPrice)})` : 'Escolha um horário'}
            </button>
          </div>
        </form>
      )}
    </div>
  );
};
