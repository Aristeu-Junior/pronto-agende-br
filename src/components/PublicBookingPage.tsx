import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { CalendarCheck, Clock, MapPin, Scissors, WhatsappLogo } from '@phosphor-icons/react';
import { friendlyError, supabase } from '../lib/supabase';
import { Appointment, ServiceItem, StaffMember } from '../types';
import { formatCurrencyBRL } from '../utils/finance';
import { buildPixPayload, PixKeyType } from '../utils/pix';
import {
  addDaysISO,
  formatDateBR,
  formatDateLong,
  getDayState,
  getFreeSlots,
  localISODate,
  servicesSpan,
} from '../utils/schedule';
import { MonthCalendar } from './MonthCalendar';
import { SlotPicker } from './SlotPicker';
import { LegalLinks } from './LegalPages';

interface Shop {
  name: string;
  address: string;
  neighborhood: string;
  cityState: string;
  phone: string;
  pixKey: string;
  pixKeyType: PixKeyType | null;
  depositPercent: number;
  cancelNoticeHours: number;
  minNoticeMinutes: number;
  maxAdvanceDays: number;
  staff: Array<{ id: string; name: string; specialty: string; chairLabel: string; schedule: StaffMember['schedule'] }>;
  services: Array<{ id: string; name: string; durationMinutes: number; bufferAfterMinutes: number; price: number }>;
}

interface Busy {
  staff_id: string;
  day: string;
  start_time: string;
  end_time: string;
}

const card = 'rounded-2xl border border-stone-800 bg-stone-900 p-5';
const input =
  'w-full rounded-xl border border-stone-800 bg-stone-950 px-3.5 py-2.5 text-sm text-stone-100 focus:border-amber-500 focus:outline-none';

export const PublicBookingPage: React.FC<{ slug: string }> = ({ slug }) => {
  const [shop, setShop] = useState<Shop | null>(null);
  const [state, setState] = useState<'loading' | 'ready' | 'missing' | 'error'>('loading');
  const [busy, setBusy] = useState<Busy[]>([]);
  const [serviceIds, setServiceIds] = useState<string[]>([]);
  const [staffId, setStaffId] = useState('');
  const [date, setDate] = useState(localISODate());
  const [time, setTime] = useState('');
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [wantDeposit, setWantDeposit] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [done, setDone] = useState<{ date: string; time: string; deposit: number; pix: string | null; total: number } | null>(null);
  const [copied, setCopied] = useState(false);

  const loadBusy = useCallback(async () => {
    const from = localISODate();
    const { data } = await supabase.rpc('get_busy_slots', {
      p_slug: slug,
      p_from: from,
      p_to: addDaysISO(from, 92),
    });
    setBusy((data ?? []) as Busy[]);
  }, [slug]);

  useEffect(() => {
    let alive = true;
    (async () => {
      const { data, error: err } = await supabase.rpc('get_public_shop', { p_slug: slug });
      if (!alive) return;
      if (err) return setState('error');
      if (!data) return setState('missing');
      const s = data as Shop;
      setShop(s);
      setServiceIds(s.services[0] ? [s.services[0].id] : []);
      setStaffId(s.staff[0]?.id ?? '');
      await loadBusy();
      if (alive) setState('ready');
    })();
    return () => {
      alive = false;
    };
  }, [slug, loadBusy]);

  const services = useMemo<ServiceItem[]>(
    () =>
      (shop?.services ?? []).map((s) => ({
        id: s.id,
        name: s.name,
        category: 'CABELO',
        durationMinutes: s.durationMinutes,
        bufferAfterMinutes: s.bufferAfterMinutes,
        price: s.price,
        customCommissionPct: 0,
        assistantSharePct: 0,
      })),
    [shop]
  );
  const staff = useMemo<StaffMember[]>(
    () =>
      (shop?.staff ?? []).map((p) => ({
        id: p.id,
        name: p.name,
        role: 'PROFESSIONAL' as const,
        specialty: p.specialty,
        chairLabel: p.chairLabel,
        defaultServiceCommissionPct: 0,
        defaultProductCommissionPct: 0,
        acceptsWalkIns: true,
        workingHours: '',
        avatarInitials: '',
        schedule: p.schedule,
      })),
    [shop]
  );
  const busyAppointments = useMemo<Appointment[]>(
    () =>
      busy.map(
        (b, i) =>
          ({
            id: `busy_${i}`,
            staffId: b.staff_id,
            date: b.day,
            startTime: b.start_time.slice(0, 5),
            endTime: b.end_time.slice(0, 5),
            status: 'CONFIRMED',
          }) as Appointment
      ),
    [busy]
  );

  const selected = services.filter((s) => serviceIds.includes(s.id));
  const span = servicesSpan(selected);
  const total = selected.reduce((acc, s) => acc + s.price, 0);
  const currentStaff = staff.find((p) => p.id === staffId);
  const deposit = shop ? Math.round(total * (shop.depositPercent / 100) * 100) / 100 : 0;
  const maxDay = shop ? addDaysISO(localISODate(), shop.maxAdvanceDays || 30) : localISODate();

  const slots = useMemo(
    () =>
      getFreeSlots({
        staff: currentStaff,
        date,
        durationMinutes: span.duration,
        bufferMinutes: span.buffer,
        appointments: busyAppointments,
        minNoticeMinutes: shop?.minNoticeMinutes ?? 60,
      }),
    [currentStaff, date, span.duration, span.buffer, busyAppointments, shop]
  );

  useEffect(() => {
    if (time && !slots.includes(time)) setTime('');
  }, [slots, time]);

  // Pula para o primeiro dia com horário livre ao escolher o barbeiro/serviço.
  useEffect(() => {
    if (state !== 'ready' || !currentStaff || !shop) return;
    let day = localISODate();
    for (let i = 0; i < (shop.maxAdvanceDays || 30) + 1; i++) {
      if (
        getFreeSlots({
          staff: currentStaff,
          date: day,
          durationMinutes: span.duration,
          bufferMinutes: span.buffer,
          appointments: busyAppointments,
          minNoticeMinutes: shop.minNoticeMinutes,
        }).length > 0
      ) {
        setDate(day);
        return;
      }
      day = addDaysISO(day, 1);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state, staffId]);

  const pixPayload = useMemo(
    () =>
      shop && shop.pixKey && deposit > 0
        ? buildPixPayload({
            key: shop.pixKey,
            keyType: shop.pixKeyType ?? undefined,
            amount: deposit,
            merchantName: shop.name,
            city: (shop.cityState || '').split('-')[0],
          })
        : null,
    [shop, deposit]
  );

  const toggleService = (id: string) =>
    setServiceIds((prev) =>
      prev.includes(id) ? (prev.length > 1 ? prev.filter((x) => x !== id) : prev) : [...prev, id]
    );

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!shop || !time || submitting) return;
    setSubmitting(true);
    setError('');
    const { error: err } = await supabase.rpc('create_public_booking', {
      p_slug: slug,
      p_staff: staffId,
      p_service_ids: serviceIds,
      p_day: date,
      p_start: time,
      p_client_name: name.trim(),
      p_client_phone: phone,
      p_want_deposit: wantDeposit,
    });
    setSubmitting(false);
    if (err) {
      setError(friendlyError(err.message));
      await loadBusy();
      return;
    }
    setDone({ date, time, deposit: wantDeposit ? deposit : 0, pix: wantDeposit ? pixPayload : null, total });
    await loadBusy();
  };

  const whatsappLink = () => {
    if (!shop) return '';
    const digits = (shop.phone || '').replace(/\D/g, '');
    if (!digits || !done) return '';
    const to = digits.startsWith('55') ? digits : `55${digits}`;
    const text = `Olá! Sou *${name.trim()}*. Acabei de agendar *${selected.map((s) => s.name).join(' + ')}* (${formatCurrencyBRL(done.total)}) para *${formatDateLong(done.date)}* às *${done.time}* com *${currentStaff?.name ?? 'o barbeiro'}* na *${shop.name}*.${done.deposit > 0 ? ' Vou pagar o sinal pelo Pix e mando o comprovante.' : ''}`;
    return `https://wa.me/${to}?text=${encodeURIComponent(text)}`;
  };

  if (state === 'loading')
    return <main className="p-10 text-center text-sm text-stone-400">Carregando…</main>;
  if (state !== 'ready' || !shop)
    return (
      <main className="mx-auto max-w-md p-10 text-center">
        <h1 className="text-lg font-bold text-stone-100">
          {state === 'missing' ? 'Barbearia não encontrada' : 'Não foi possível carregar'}
        </h1>
        <p className="mt-2 text-sm text-stone-400">
          {state === 'missing'
            ? 'Confira o link com a barbearia.'
            : 'Verifique a internet e tente de novo.'}
        </p>
      </main>
    );

  if (done) {
    const wa = whatsappLink();
    return (
      <main className="mx-auto max-w-lg space-y-4 px-4 py-10">
        <div className={`${card} space-y-3 text-center`}>
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-500 text-stone-100">
            <CalendarCheck className="h-7 w-7" />
          </div>
          <h1 className="text-xl font-bold text-stone-100">
            {done.deposit > 0 ? 'Horário reservado, falta o sinal' : 'Horário reservado!'}
          </h1>
          <p className="text-sm text-stone-300">
            {formatDateLong(done.date)} às <strong className="font-mono">{done.time}</strong> · {shop.name}
          </p>
          {done.deposit > 0 && (
            <div className="space-y-2 rounded-xl border border-stone-800 bg-stone-950 p-3 text-left">
              <p className="text-xs font-semibold text-stone-100">
                Sinal de {formatCurrencyBRL(done.deposit)} para garantir o horário
              </p>
              {done.pix ? (
                <>
                  <textarea
                    readOnly
                    rows={3}
                    value={done.pix}
                    aria-label="Pix copia e cola"
                    className="w-full resize-none rounded-lg border border-stone-800 bg-stone-900 p-2 font-mono text-[11px] text-stone-200"
                  />
                  <button
                    type="button"
                    onClick={() => {
                      void navigator.clipboard?.writeText(done.pix as string);
                      setCopied(true);
                      setTimeout(() => setCopied(false), 2500);
                    }}
                    className="w-full rounded-lg bg-amber-500 py-2 text-xs font-bold text-stone-950 cursor-pointer"
                  >
                    {copied ? 'Código copiado!' : 'Copiar código Pix'}
                  </button>
                </>
              ) : (
                <p className="text-[11px] text-stone-400">Combine o pagamento do sinal pelo WhatsApp.</p>
              )}
              <p className="text-[11px] text-stone-400">
                Depois de pagar, envie o comprovante pelo WhatsApp. A barbearia confirma o recebimento.
              </p>
            </div>
          )}
          {wa && (
            <a
              href={wa}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-emerald-500 py-3 text-sm font-bold text-stone-100"
            >
              <WhatsappLogo className="h-4 w-4" /> Avisar a barbearia no WhatsApp
            </a>
          )}
          <button
            type="button"
            onClick={() => {
              setDone(null);
              setTime('');
              setName('');
              setPhone('');
              setWantDeposit(false);
            }}
            className="text-xs font-semibold text-amber-700 cursor-pointer"
          >
            Fazer outro agendamento
          </button>
        </div>
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-4xl space-y-5 px-4 py-8">
      <header className="space-y-1">
        <h1 className="text-2xl font-bold text-stone-100">{shop.name}</h1>
        {(shop.address || shop.cityState) && (
          <p className="flex items-center gap-1.5 text-xs text-stone-400">
            <MapPin className="h-3.5 w-3.5 shrink-0 text-amber-700" />
            {[shop.address, shop.neighborhood, shop.cityState].filter(Boolean).join(' • ')}
          </p>
        )}
      </header>

      <form onSubmit={submit} className="grid grid-cols-1 items-start gap-5 lg:grid-cols-12">
        <div className="space-y-5 lg:col-span-7">
          <div className={`${card} space-y-3`}>
            <h2 className="flex items-center gap-2 text-sm font-bold text-stone-100">
              <Scissors className="h-4 w-4 text-amber-700" /> 1. Escolha o serviço
            </h2>
            {services.map((s) => {
              const on = serviceIds.includes(s.id);
              return (
                <button
                  key={s.id}
                  type="button"
                  onClick={() => toggleService(s.id)}
                  aria-pressed={on}
                  className={`flex w-full items-center justify-between rounded-xl border p-3.5 text-left cursor-pointer ${
                    on ? 'border-amber-500/50 bg-amber-500/15' : 'border-stone-800 bg-stone-950 hover:border-amber-500'
                  }`}
                >
                  <span>
                    <span className="block text-sm font-semibold text-stone-100">{s.name}</span>
                    <span className="block text-[11px] text-stone-400">{s.durationMinutes} min</span>
                  </span>
                  <span className="font-mono text-sm font-bold text-amber-700">{formatCurrencyBRL(s.price)}</span>
                </button>
              );
            })}
          </div>

          <div className={`${card} space-y-4`}>
            <h2 className="text-sm font-bold text-stone-100">2. Barbeiro, dia e horário</h2>
            {staff.length > 1 && (
              <div className="grid gap-2 sm:grid-cols-2">
                {staff.map((p) => (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => setStaffId(p.id)}
                    aria-pressed={staffId === p.id}
                    className={`rounded-xl border p-3 text-left cursor-pointer ${
                      staffId === p.id ? 'border-amber-500/50 bg-amber-500/15' : 'border-stone-800 bg-stone-950'
                    }`}
                  >
                    <span className="block text-xs font-bold text-stone-100">{p.name}</span>
                    <span className="block text-[11px] text-stone-400">{p.specialty}</span>
                  </button>
                ))}
              </div>
            )}
            <MonthCalendar
              value={date}
              onChange={(iso) => {
                setDate(iso);
                setTime('');
              }}
              min={localISODate()}
              max={maxDay}
              getMarker={(iso) => ({ closed: getDayState(currentStaff, iso) !== 'OPEN' })}
            />
            <div>
              <span className="mb-2 block text-xs font-semibold text-stone-300">
                Horários livres em {formatDateBR(date)}
              </span>
              <SlotPicker
                slots={slots}
                value={time}
                onChange={setTime}
                emptyMessage={
                  getDayState(currentStaff, date) === 'OPEN'
                    ? 'Sem horários livres neste dia. Tente outra data.'
                    : 'O barbeiro não atende neste dia. Escolha outra data.'
                }
              />
            </div>
          </div>
        </div>

        <div className={`${card} space-y-4 lg:col-span-5`}>
          <div className="flex items-end justify-between border-b border-stone-800 pb-3">
            <div>
              <span className="text-[11px] uppercase tracking-wider text-stone-400">Total</span>
              <div className="font-mono text-2xl font-bold text-amber-700">{formatCurrencyBRL(total)}</div>
            </div>
            <span className="flex items-center gap-1 text-[11px] text-stone-400">
              <Clock className="h-3 w-3" /> {span.duration} min
              {time ? ` · ${formatDateLong(date)} ${time}` : ''}
            </span>
          </div>
          <h2 className="text-sm font-bold text-stone-100">3. Seus dados</h2>
          <label className="block">
            <span className="mb-1 block text-xs text-stone-300">Seu nome *</span>
            <input className={input} value={name} onChange={(e) => setName(e.target.value)} placeholder="Ex.: Matheus Henrique" />
          </label>
          <label className="block">
            <span className="mb-1 block text-xs text-stone-300">Seu WhatsApp (com DDD) *</span>
            <input
              className={input}
              type="tel"
              inputMode="numeric"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="(11) 99999-0000"
            />
          </label>
          {shop.depositPercent > 0 && (
            <label className="flex items-start gap-2.5 rounded-xl border border-stone-800 bg-stone-950 p-3 text-xs text-stone-300 cursor-pointer">
              <input type="checkbox" className="mt-0.5 h-4 w-4" checked={wantDeposit} onChange={(e) => setWantDeposit(e.target.checked)} />
              <span>
                <strong className="text-stone-100">Adiantar sinal Pix ({shop.depositPercent}%)</strong>
                <br />
                Valor do sinal: <strong className="font-mono">{formatCurrencyBRL(deposit)}</strong>, abatido do valor na hora.
              </span>
            </label>
          )}
          {error && (
            <p role="alert" className="text-xs font-medium text-rose-700">
              {error}
            </p>
          )}
          <button
            type="submit"
            disabled={!time || name.trim().length < 2 || phone.replace(/\D/g, '').length < 10 || submitting}
            className="w-full rounded-xl bg-emerald-500 py-3.5 text-sm font-bold text-stone-100 hover:bg-emerald-600 disabled:cursor-not-allowed disabled:opacity-40 cursor-pointer"
          >
            {submitting ? 'Reservando…' : time ? `Confirmar agendamento (${formatCurrencyBRL(total)})` : 'Escolha um horário'}
          </button>
          <p className="text-center text-[11px] text-stone-400">
            Cancelamento gratuito até {shop.cancelNoticeHours}h antes do horário.
          </p>
          <p className="text-center text-[11px] text-stone-400">
            Ao reservar, você autoriza {shop.name} a usar seu nome e telefone para este agendamento.
          </p>
          <LegalLinks />
        </div>
      </form>
    </main>
  );
};
