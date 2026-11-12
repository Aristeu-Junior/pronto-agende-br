-- ProntoAgende BR — esquema Supabase (PROPOSTA, ainda não aplicada em nenhum projeto).
-- Objetivo: o cliente agenda pelo próprio celular, sem login, e o barbeiro vê tudo na Agenda.
-- Regras de ouro:
--   1. O cliente anônimo NUNCA lê a tabela de agendamentos (guarda nome e telefone de terceiros).
--   2. Disponibilidade e criação de reserva passam por funções (RPC) que revalidam tudo no servidor.
--   3. Só o dono da barbearia (auth.uid()) lê e altera os próprios dados.

create extension if not exists btree_gist;

create table public.businesses (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  slug text not null unique check (slug ~ '^[a-z0-9-]{3,40}$'),
  name text not null,
  phone text default '',
  pix_key text default '',
  address text default '',
  neighborhood text default '',
  city_state text default '',
  deposit_percent int not null default 30 check (deposit_percent between 0 and 100),
  cancel_notice_hours int not null default 2,
  min_notice_minutes int not null default 60,
  max_advance_days int not null default 30,
  created_at timestamptz not null default now()
);

create table public.staff (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses(id) on delete cascade,
  name text not null,
  specialty text default '',
  chair_label text default '',
  commission_pct numeric not null default 50,
  -- mesmo formato do app: { days: [{enabled,start,end,breakStart?,breakEnd?} x7 (0=dom)], slotIntervalMinutes, blockedDates: [] }
  schedule jsonb not null,
  active boolean not null default true
);

create table public.services (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses(id) on delete cascade,
  name text not null,
  duration_minutes int not null check (duration_minutes between 5 and 480),
  buffer_after_minutes int not null default 0,
  price numeric(10,2) not null check (price >= 0),
  active boolean not null default true
);

create table public.clients (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses(id) on delete cascade,
  full_name text not null,
  phone text default '',
  notes text default '',
  no_show_count int not null default 0,
  created_at timestamptz not null default now()
);

create table public.appointments (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses(id) on delete cascade,
  staff_id uuid not null references public.staff(id) on delete restrict,
  client_id uuid references public.clients(id) on delete set null,
  client_name text not null,
  client_phone text default '',
  service_ids uuid[] not null,
  day date not null,
  start_time time not null,
  end_time time not null check (end_time > start_time),
  status text not null default 'CONFIRMED'
    check (status in ('PENDING','CONFIRMED','IN_SERVICE','COMPLETED','NO_SHOW','CANCELLED')),
  custom_price numeric(10,2),
  deposit_requested numeric(10,2) not null default 0,
  deposit_paid numeric(10,2) not null default 0,
  payment_proof_path text,
  origin_channel text not null default 'DIRECT_LINK',
  notes text default '',
  created_at timestamptz not null default now(),
  -- impede dois agendamentos ativos sobrepostos para o mesmo barbeiro, mesmo com cliques simultâneos
  constraint no_overlap exclude using gist (
    staff_id with =,
    tsrange(day + start_time, day + end_time) with &&
  ) where (status not in ('CANCELLED','NO_SHOW'))
);

create index on public.appointments (business_id, day);
create index on public.staff (business_id);
create index on public.services (business_id);

-- ---------- RLS ----------
alter table public.businesses enable row level security;
alter table public.staff enable row level security;
alter table public.services enable row level security;
alter table public.clients enable row level security;
alter table public.appointments enable row level security;

create policy owner_all on public.businesses
  for all using (owner_id = auth.uid()) with check (owner_id = auth.uid());

create policy owner_all on public.staff for all
  using (exists (select 1 from public.businesses b where b.id = business_id and b.owner_id = auth.uid()))
  with check (exists (select 1 from public.businesses b where b.id = business_id and b.owner_id = auth.uid()));

create policy owner_all on public.services for all
  using (exists (select 1 from public.businesses b where b.id = business_id and b.owner_id = auth.uid()))
  with check (exists (select 1 from public.businesses b where b.id = business_id and b.owner_id = auth.uid()));

create policy owner_all on public.clients for all
  using (exists (select 1 from public.businesses b where b.id = business_id and b.owner_id = auth.uid()))
  with check (exists (select 1 from public.businesses b where b.id = business_id and b.owner_id = auth.uid()));

create policy owner_all on public.appointments for all
  using (exists (select 1 from public.businesses b where b.id = business_id and b.owner_id = auth.uid()))
  with check (exists (select 1 from public.businesses b where b.id = business_id and b.owner_id = auth.uid()));

-- ---------- Leitura pública (sem dados pessoais) ----------
-- Vitrine: só campos que o cliente precisa ver.
create or replace function public.get_public_shop(p_slug text)
returns jsonb
language sql stable security definer set search_path = public as $$
  select jsonb_build_object(
    'name', b.name, 'address', b.address, 'neighborhood', b.neighborhood, 'cityState', b.city_state,
    'phone', b.phone, 'pixKey', b.pix_key, 'depositPercent', b.deposit_percent,
    'cancelNoticeHours', b.cancel_notice_hours, 'minNoticeMinutes', b.min_notice_minutes,
    'maxAdvanceDays', b.max_advance_days,
    'staff', coalesce((select jsonb_agg(jsonb_build_object('id', s.id, 'name', s.name, 'specialty', s.specialty,
        'chairLabel', s.chair_label, 'schedule', s.schedule)) from public.staff s
        where s.business_id = b.id and s.active), '[]'::jsonb),
    'services', coalesce((select jsonb_agg(jsonb_build_object('id', v.id, 'name', v.name,
        'durationMinutes', v.duration_minutes, 'bufferAfterMinutes', v.buffer_after_minutes, 'price', v.price))
        from public.services v where v.business_id = b.id and v.active), '[]'::jsonb)
  )
  from public.businesses b where b.slug = p_slug;
$$;

-- Horários ocupados num intervalo de datas: só início/fim e barbeiro, sem nome nem telefone.
create or replace function public.get_busy_slots(p_slug text, p_from date, p_to date)
returns table (staff_id uuid, day date, start_time time, end_time time)
language sql stable security definer set search_path = public as $$
  select a.staff_id, a.day, a.start_time, a.end_time
  from public.appointments a
  join public.businesses b on b.id = a.business_id
  where b.slug = p_slug
    and a.day between p_from and least(p_to, p_from + 92)
    and a.status not in ('CANCELLED','NO_SHOW');
$$;

-- Criação de reserva pelo cliente. Valida janela, antecedência e sobreposição no servidor.
-- A escala (dias, horário, pausa, folgas) deve ser revalidada aqui antes de ir para produção:
-- TODO(implementação): replicar getFreeSlots de src/utils/schedule.ts em plpgsql ou Edge Function.
create or replace function public.create_public_booking(
  p_slug text, p_staff uuid, p_service_ids uuid[], p_day date, p_start time,
  p_client_name text, p_client_phone text, p_want_deposit boolean
) returns uuid
language plpgsql security definer set search_path = public as $$
declare
  v_biz public.businesses%rowtype;
  v_total int; v_buffer int; v_price numeric(10,2); v_id uuid; v_start timestamp;
begin
  select * into v_biz from public.businesses where slug = p_slug;
  if not found then raise exception 'barbearia não encontrada'; end if;
  if not exists (select 1 from public.staff where id = p_staff and business_id = v_biz.id and active) then
    raise exception 'profissional inválido';
  end if;
  select coalesce(sum(duration_minutes),0), coalesce(max(buffer_after_minutes),0), coalesce(sum(price),0)
    into v_total, v_buffer, v_price
  from public.services where id = any(p_service_ids) and business_id = v_biz.id and active;
  if v_total = 0 then raise exception 'serviço inválido'; end if;

  v_start := p_day + p_start;
  if v_start < (now() at time zone 'America/Sao_Paulo') + make_interval(mins => v_biz.min_notice_minutes) then
    raise exception 'horário fora da antecedência mínima';
  end if;
  if p_day > (now() at time zone 'America/Sao_Paulo')::date + v_biz.max_advance_days then
    raise exception 'data além do limite';
  end if;
  if length(trim(p_client_name)) < 2 or length(p_client_name) > 80 then raise exception 'nome inválido'; end if;

  -- a restrição no_overlap recusa conflito mesmo com duas pessoas clicando ao mesmo tempo
  insert into public.appointments (business_id, staff_id, client_name, client_phone, service_ids, day,
      start_time, end_time, status, custom_price, deposit_requested, origin_channel, notes)
  values (v_biz.id, p_staff, trim(p_client_name), left(coalesce(p_client_phone,''), 30), p_service_ids, p_day,
      p_start, (p_start + make_interval(mins => v_total)),
      case when p_want_deposit then 'PENDING' else 'CONFIRMED' end, v_price,
      case when p_want_deposit then round(v_price * v_biz.deposit_percent / 100, 2) else 0 end,
      'DIRECT_LINK', 'Agendado pelo link público')
  returning id into v_id;
  return v_id;
end $$;

revoke all on function public.get_public_shop(text) from public;
revoke all on function public.get_busy_slots(text, date, date) from public;
revoke all on function public.create_public_booking(text, uuid, uuid[], date, time, text, text, boolean) from public;
grant execute on function public.get_public_shop(text) to anon, authenticated;
grant execute on function public.get_busy_slots(text, date, date) to anon, authenticated;
grant execute on function public.create_public_booking(text, uuid, uuid[], date, time, text, text, boolean) to anon, authenticated;
