import {
  Appointment,
  BusinessConfig,
  ServiceItem,
  StaffMember,
} from '../types';
import { defaultSchedule } from '../utils/schedule';
import { supabase } from './supabase';

/* ---------- Mapeamento banco <-> app ---------- */

type Row = Record<string, any>;

export function newId(): string {
  return crypto.randomUUID();
}

export function slugify(text: string): string {
  const base = text
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 36);
  return base.length >= 3 ? base : `barbearia-${Math.random().toString(36).slice(2, 6)}`;
}

const initialsOf = (name: string) =>
  name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase())
    .join('') || 'BB';

export function businessFromRow(r: Row): BusinessConfig {
  return {
    id: r.id,
    slug: r.slug,
    name: r.name,
    neighborhood: r.neighborhood ?? '',
    cityState: r.city_state ?? '',
    address: r.address ?? '',
    phone: r.phone ?? '',
    pixKey: r.pix_key ?? '',
    pixKeyType: r.pix_key_type ?? undefined,
    planTier: 'PRO',
    monthlyBookingsUsed: 0,
    monthlyBookingsLimit: 60,
    feeSplitRule: r.fee_split_rule ?? 'PROPORTIONAL',
    cancelNoticeHours: r.cancel_notice_hours ?? 2,
    noShowDepositPercent: r.deposit_percent ?? 30,
    googleReserveEnabled: false,
    boostEnabled: false,
    boostCommissionPct: 0,
    reviewsRank: 5,
    reviewsCount: 0,
    bestBadge: false,
    isConfigured: true,
    minNoticeMinutes: r.min_notice_minutes ?? 60,
    maxAdvanceDays: r.max_advance_days ?? 30,
  };
}

export function businessToRow(p: Partial<BusinessConfig>): Row {
  const out: Row = {};
  if (p.name !== undefined) out.name = p.name;
  if (p.neighborhood !== undefined) out.neighborhood = p.neighborhood;
  if (p.cityState !== undefined) out.city_state = p.cityState;
  if (p.address !== undefined) out.address = p.address;
  if (p.phone !== undefined) out.phone = p.phone;
  if (p.pixKey !== undefined) out.pix_key = p.pixKey;
  if ('pixKeyType' in p) out.pix_key_type = p.pixKeyType ?? null;
  if (p.feeSplitRule !== undefined) out.fee_split_rule = p.feeSplitRule;
  if (p.cancelNoticeHours !== undefined) out.cancel_notice_hours = p.cancelNoticeHours;
  if (p.noShowDepositPercent !== undefined) out.deposit_percent = p.noShowDepositPercent;
  if (p.minNoticeMinutes !== undefined) out.min_notice_minutes = p.minNoticeMinutes;
  if (p.maxAdvanceDays !== undefined) out.max_advance_days = p.maxAdvanceDays;
  return out;
}

export function staffFromRow(r: Row): StaffMember {
  const sch = r.schedule && Array.isArray(r.schedule.days) ? r.schedule : undefined;
  const first = sch?.days?.find((d: Row) => d.enabled);
  return {
    id: r.id,
    name: r.name,
    role: r.role ?? 'PROFESSIONAL',
    specialty: r.specialty ?? '',
    chairLabel: r.chair_label ?? '',
    defaultServiceCommissionPct: Number(r.commission_pct ?? 50),
    defaultProductCommissionPct: Number(r.default_product_commission_pct ?? 10),
    acceptsWalkIns: r.accepts_walk_ins ?? true,
    workingHours: first ? `${first.start} - ${first.end}` : 'Sem atendimento',
    avatarInitials: initialsOf(r.name),
    schedule: sch,
  };
}

export function staffToRow(p: Partial<StaffMember>): Row {
  const out: Row = {};
  if (p.name !== undefined) out.name = p.name;
  if (p.specialty !== undefined) out.specialty = p.specialty;
  if (p.chairLabel !== undefined) out.chair_label = p.chairLabel;
  if (p.role !== undefined) out.role = p.role;
  if (p.defaultServiceCommissionPct !== undefined) out.commission_pct = p.defaultServiceCommissionPct;
  if (p.defaultProductCommissionPct !== undefined) out.default_product_commission_pct = p.defaultProductCommissionPct;
  if (p.acceptsWalkIns !== undefined) out.accepts_walk_ins = p.acceptsWalkIns;
  if (p.schedule !== undefined) out.schedule = p.schedule;
  return out;
}

export function serviceFromRow(r: Row): ServiceItem {
  return {
    id: r.id,
    name: r.name,
    category: r.category ?? 'CABELO',
    durationMinutes: r.duration_minutes,
    bufferAfterMinutes: r.buffer_after_minutes ?? 0,
    price: Number(r.price),
    customCommissionPct: Number(r.custom_commission_pct ?? 50),
    assistantSharePct: Number(r.assistant_share_pct ?? 0),
  };
}

export function serviceToRow(p: Partial<ServiceItem>): Row {
  const out: Row = {};
  if (p.name !== undefined) out.name = p.name;
  if (p.category !== undefined) out.category = p.category;
  if (p.durationMinutes !== undefined) out.duration_minutes = Math.max(5, Math.round(p.durationMinutes));
  if (p.bufferAfterMinutes !== undefined) out.buffer_after_minutes = Math.max(0, Math.round(p.bufferAfterMinutes));
  if (p.price !== undefined) out.price = Math.max(0, p.price);
  if (p.customCommissionPct !== undefined) out.custom_commission_pct = p.customCommissionPct;
  if (p.assistantSharePct !== undefined) out.assistant_share_pct = p.assistantSharePct;
  return out;
}

const hhmm = (t: string) => (t || '').slice(0, 5);

export function appointmentFromRow(r: Row): Appointment {
  const phone = r.client_phone ?? '';
  return {
    id: r.id,
    clientId: `cli_${(phone || r.client_name || r.id).toString().replace(/\W/g, '').toLowerCase()}`,
    clientName: r.client_name,
    clientPhone: phone,
    staffId: r.staff_id,
    serviceIds: r.service_ids ?? [],
    date: r.day,
    startTime: hhmm(r.start_time),
    endTime: hhmm(r.end_time),
    customPrice: r.custom_price === null || r.custom_price === undefined ? undefined : Number(r.custom_price),
    status: r.status,
    isWalkIn: r.origin_channel === 'WALK_IN',
    originChannel: r.origin_channel ?? 'DIRECT_LINK',
    deviceFingerprint: '',
    depositPixPaid: Number(r.deposit_paid ?? 0),
    depositRequested: Number(r.deposit_requested ?? 0),
    paymentProofName: r.payment_proof_path ?? undefined,
    notes: r.notes ?? '',
  };
}

export function appointmentToRow(p: Partial<Appointment>, bufferMinutes?: number): Row {
  const out: Row = {};
  if (p.clientName !== undefined) out.client_name = p.clientName;
  if (p.clientPhone !== undefined) out.client_phone = p.clientPhone;
  if (p.staffId !== undefined) out.staff_id = p.staffId;
  if (p.serviceIds !== undefined) out.service_ids = p.serviceIds;
  if (p.date !== undefined) out.day = p.date;
  if (p.startTime !== undefined) out.start_time = p.startTime;
  if (p.endTime !== undefined) out.end_time = p.endTime;
  if (p.customPrice !== undefined) out.custom_price = p.customPrice;
  if (p.status !== undefined) out.status = p.status;
  if (p.originChannel !== undefined) out.origin_channel = p.originChannel;
  if (p.depositPixPaid !== undefined) out.deposit_paid = p.depositPixPaid;
  if (p.depositRequested !== undefined) out.deposit_requested = p.depositRequested;
  if (p.paymentProofName !== undefined) out.payment_proof_path = p.paymentProofName ?? null;
  if (p.notes !== undefined) out.notes = p.notes;
  if (bufferMinutes !== undefined) out.buffer_minutes = bufferMinutes;
  return out;
}

/* ---------- Conta e perfil ---------- */

export type AccountStatus = 'PENDING' | 'ACTIVE' | 'SUSPENDED';

export interface Profile {
  user_id: string;
  email: string;
  display_name: string;
  status: AccountStatus;
  is_admin: boolean;
  created_at: string;
}

export async function fetchProfile(userId: string): Promise<Profile | null> {
  const { data, error } = await supabase.from('profiles').select('*').eq('user_id', userId).maybeSingle();
  if (error) throw error;
  return (data as Profile) ?? null;
}

/* ---------- Dados da barbearia ---------- */

export async function fetchBusiness(userId: string): Promise<BusinessConfig | null> {
  const { data, error } = await supabase.from('businesses').select('*').eq('owner_id', userId).maybeSingle();
  if (error) throw error;
  return data ? businessFromRow(data) : null;
}

export async function createBusinessWithDefaults(name: string, desiredSlug: string): Promise<BusinessConfig> {
  let slug = slugify(desiredSlug || name);
  for (let attempt = 0; attempt < 4; attempt++) {
    const { data, error } = await supabase.from('businesses').insert({ name, slug }).select('*').single();
    if (!error) {
      const biz = businessFromRow(data);
      await supabase.from('staff').insert({
        business_id: biz.id,
        name: 'Barbeiro Principal',
        specialty: 'Corte & Barba',
        chair_label: 'Cadeira 01',
        schedule: defaultSchedule(),
      });
      await supabase.from('services').insert([
        { business_id: biz.id, name: 'Corte Masculino', category: 'CABELO', duration_minutes: 40, buffer_after_minutes: 5, price: 45 },
        { business_id: biz.id, name: 'Barba Completa', category: 'BARBA', duration_minutes: 30, buffer_after_minutes: 5, price: 35 },
        { business_id: biz.id, name: 'Combo Corte + Barba', category: 'CABELO', duration_minutes: 60, buffer_after_minutes: 5, price: 70 },
      ]);
      return biz;
    }
    if (error.code === '23505') {
      slug = `${slugify(desiredSlug || name).slice(0, 30)}-${Math.random().toString(36).slice(2, 5)}`;
      continue;
    }
    throw error;
  }
  throw new Error('slug indisponível');
}

export async function loadOwnerData(businessId: string) {
  const since = new Date();
  since.setDate(since.getDate() - 60);
  const sinceISO = `${since.getFullYear()}-${String(since.getMonth() + 1).padStart(2, '0')}-${String(since.getDate()).padStart(2, '0')}`;
  const [staff, services, appts] = await Promise.all([
    supabase.from('staff').select('*').eq('business_id', businessId).eq('active', true).order('name'),
    supabase.from('services').select('*').eq('business_id', businessId).eq('active', true).order('name'),
    supabase.from('appointments').select('*').eq('business_id', businessId).gte('day', sinceISO).order('day').order('start_time'),
  ]);
  for (const r of [staff, services, appts]) if (r.error) throw r.error;
  return {
    staff: (staff.data ?? []).map(staffFromRow),
    services: (services.data ?? []).map(serviceFromRow),
    appointments: (appts.data ?? []).map(appointmentFromRow),
  };
}

export async function fetchAppointments(businessId: string): Promise<Appointment[]> {
  const since = new Date();
  since.setDate(since.getDate() - 60);
  const sinceISO = `${since.getFullYear()}-${String(since.getMonth() + 1).padStart(2, '0')}-${String(since.getDate()).padStart(2, '0')}`;
  const { data, error } = await supabase
    .from('appointments')
    .select('*')
    .eq('business_id', businessId)
    .gte('day', sinceISO)
    .order('day')
    .order('start_time');
  if (error) throw error;
  return (data ?? []).map(appointmentFromRow);
}
