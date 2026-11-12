-- Migração 004: contas com aprovação do administrador + colunas que o app usa.
-- Qualquer pessoa cria conta (status PENDING). Só o administrador libera (ACTIVE) ou suspende.
-- Conta PENDING ou SUSPENDED não lê nem grava dados da barbearia, e a página pública dela sai do ar.

-- ---------- Perfis ----------
create table if not exists public.profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  email text not null,
  display_name text not null default '',
  status text not null default 'PENDING' check (status in ('PENDING','ACTIVE','SUSPENDED')),
  is_admin boolean not null default false,
  created_at timestamptz not null default now(),
  approved_at timestamptz
);
alter table public.profiles enable row level security;

create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (user_id, email, display_name)
  values (new.id, coalesce(new.email, ''), left(coalesce(new.raw_user_meta_data->>'display_name', ''), 80))
  on conflict (user_id) do nothing;
  return new;
end $$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created after insert on auth.users
  for each row execute function public.handle_new_user();

-- ---------- Funções de apoio ----------
create or replace function public.is_active_owner()
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.profiles where user_id = auth.uid() and status = 'ACTIVE');
$$;

create or replace function public.is_admin()
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.profiles where user_id = auth.uid() and status = 'ACTIVE' and is_admin);
$$;

create or replace function public.owner_is_active(p_owner uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.profiles where user_id = p_owner and status = 'ACTIVE');
$$;

-- Cada conta lê só o próprio perfil; o admin lê todos. Ninguém altera perfil direto (só pelas funções admin).
drop policy if exists own_profile_select on public.profiles;
create policy own_profile_select on public.profiles for select using (user_id = auth.uid());
drop policy if exists admin_profile_select on public.profiles;
create policy admin_profile_select on public.profiles for select using (public.is_admin());

-- ---------- Dados da barbearia: só conta ativa ----------
alter table public.businesses alter column owner_id set default auth.uid();
create unique index if not exists businesses_owner_unique on public.businesses (owner_id);

drop policy if exists owner_all on public.businesses;
create policy owner_all on public.businesses for all
  using (owner_id = auth.uid() and public.is_active_owner())
  with check (owner_id = auth.uid() and public.is_active_owner());

do $$
declare t text;
begin
  foreach t in array array['staff','services','clients','appointments'] loop
    execute format('drop policy if exists owner_all on public.%I', t);
    execute format($f$create policy owner_all on public.%I for all
      using (public.is_active_owner() and exists (select 1 from public.businesses b where b.id = business_id and b.owner_id = auth.uid()))
      with check (public.is_active_owner() and exists (select 1 from public.businesses b where b.id = business_id and b.owner_id = auth.uid()))$f$, t);
  end loop;
end $$;

-- ---------- Colunas extras usadas pelo app ----------
alter table public.businesses add column if not exists fee_split_rule text not null default 'PROPORTIONAL'
  check (fee_split_rule in ('PROPORTIONAL','STAFF_100','SALON_100'));
alter table public.staff add column if not exists role text not null default 'PROFESSIONAL';
alter table public.staff add column if not exists default_product_commission_pct numeric not null default 10;
alter table public.staff add column if not exists accepts_walk_ins boolean not null default true;
alter table public.services add column if not exists category text not null default 'CABELO';
alter table public.services add column if not exists custom_commission_pct numeric not null default 50;
alter table public.services add column if not exists assistant_share_pct numeric not null default 0;

-- ---------- Funções públicas: só barbearia com conta ativa ----------
create or replace function public.get_public_shop(p_slug text)
returns jsonb language sql stable security definer set search_path = public as $$
  select jsonb_build_object(
    'name', b.name, 'address', b.address, 'neighborhood', b.neighborhood, 'cityState', b.city_state,
    'phone', b.phone, 'pixKey', b.pix_key, 'pixKeyType', b.pix_key_type, 'depositPercent', b.deposit_percent,
    'cancelNoticeHours', b.cancel_notice_hours, 'minNoticeMinutes', b.min_notice_minutes,
    'maxAdvanceDays', b.max_advance_days,
    'staff', coalesce((select jsonb_agg(jsonb_build_object('id', s.id, 'name', s.name, 'specialty', s.specialty,
        'chairLabel', s.chair_label, 'schedule', s.schedule)) from public.staff s
        where s.business_id = b.id and s.active and s.role = 'PROFESSIONAL'), '[]'::jsonb),
    'services', coalesce((select jsonb_agg(jsonb_build_object('id', v.id, 'name', v.name,
        'durationMinutes', v.duration_minutes, 'bufferAfterMinutes', v.buffer_after_minutes, 'price', v.price))
        from public.services v where v.business_id = b.id and v.active), '[]'::jsonb)
  )
  from public.businesses b
  where b.slug = p_slug and public.owner_is_active(b.owner_id);
$$;

drop function if exists public.get_busy_slots(text, date, date);
create or replace function public.get_busy_slots(p_slug text, p_from date, p_to date)
returns table (staff_id uuid, day date, start_time time, end_time time, buffer_minutes int)
language sql stable security definer set search_path = public as $$
  select a.staff_id, a.day, a.start_time, a.end_time, a.buffer_minutes
  from public.appointments a
  join public.businesses b on b.id = a.business_id
  where b.slug = p_slug and public.owner_is_active(b.owner_id)
    and a.day between p_from and least(p_to, p_from + 92)
    and a.status not in ('CANCELLED','NO_SHOW');
$$;

create or replace function public.create_public_booking(
  p_slug text, p_staff uuid, p_service_ids uuid[], p_day date, p_start time,
  p_client_name text, p_client_phone text, p_want_deposit boolean
) returns uuid
language plpgsql security definer set search_path = public as $$
declare
  v_biz public.businesses%rowtype;
  v_total int; v_buffer int; v_price numeric(10,2); v_id uuid; v_found int;
  v_phone text; v_now timestamp := now() at time zone 'America/Sao_Paulo';
begin
  select * into v_biz from public.businesses where slug = p_slug;
  if not found or not public.owner_is_active(v_biz.owner_id) then raise exception 'barbearia_nao_encontrada'; end if;
  if not exists (select 1 from public.staff where id = p_staff and business_id = v_biz.id and active) then
    raise exception 'profissional_invalido';
  end if;

  select count(*), coalesce(sum(duration_minutes),0), coalesce(max(buffer_after_minutes),0), coalesce(sum(price),0)
    into v_found, v_total, v_buffer, v_price
  from public.services where id = any(p_service_ids) and business_id = v_biz.id and active;
  if v_found = 0 or v_found <> cardinality(p_service_ids) then raise exception 'servico_invalido'; end if;

  if (p_day + p_start) < v_now + make_interval(mins => v_biz.min_notice_minutes) then
    raise exception 'fora_da_antecedencia_minima';
  end if;
  if p_day > v_now::date + v_biz.max_advance_days then raise exception 'alem_do_limite_de_dias'; end if;
  if not public.schedule_slot_ok(p_staff, p_day, p_start, v_total) then raise exception 'fora_da_escala'; end if;

  v_phone := regexp_replace(coalesce(p_client_phone, ''), '\D', '', 'g');
  if length(trim(coalesce(p_client_name, ''))) < 2 or length(p_client_name) > 80 then raise exception 'nome_invalido'; end if;
  if length(v_phone) < 10 or length(v_phone) > 13 then raise exception 'telefone_invalido'; end if;

  if (select count(*) from public.appointments a
        where a.business_id = v_biz.id and regexp_replace(a.client_phone, '\D', '', 'g') = v_phone
          and a.created_at > now() - interval '1 hour') >= 3 then
    raise exception 'muitas_reservas_recentes';
  end if;
  if (select count(*) from public.appointments a
        where a.business_id = v_biz.id and regexp_replace(a.client_phone, '\D', '', 'g') = v_phone
          and a.day >= v_now::date and a.status in ('PENDING','CONFIRMED')) >= 5 then
    raise exception 'limite_de_reservas_futuras';
  end if;

  begin
    insert into public.appointments (business_id, staff_id, client_name, client_phone, service_ids, day,
        start_time, end_time, buffer_minutes, status, custom_price, deposit_requested, origin_channel, notes)
    values (v_biz.id, p_staff, trim(p_client_name), v_phone, p_service_ids, p_day,
        p_start, (p_start + make_interval(mins => v_total)), v_buffer,
        case when p_want_deposit and v_biz.deposit_percent > 0 then 'PENDING' else 'CONFIRMED' end, v_price,
        case when p_want_deposit then round(v_price * v_biz.deposit_percent / 100, 2) else 0 end,
        'DIRECT_LINK', 'Agendado pelo link público')
    returning id into v_id;
  exception when exclusion_violation then
    raise exception 'horario_indisponivel';
  end;
  return v_id;
end $$;

-- ---------- Funções do administrador ----------
create or replace function public.admin_list_accounts()
returns table (user_id uuid, email text, display_name text, status text, is_admin boolean,
               created_at timestamptz, approved_at timestamptz, business_name text, slug text, appointments_count bigint)
language plpgsql stable security definer set search_path = public as $$
begin
  if not public.is_admin() then raise exception 'nao_autorizado'; end if;
  return query
    select p.user_id, p.email, p.display_name, p.status, p.is_admin, p.created_at, p.approved_at,
           b.name, b.slug,
           (select count(*) from public.appointments a where a.business_id = b.id)
    from public.profiles p
    left join public.businesses b on b.owner_id = p.user_id
    order by (p.status = 'PENDING') desc, p.created_at desc;
end $$;

create or replace function public.admin_set_status(p_user uuid, p_status text)
returns void language plpgsql security definer set search_path = public as $$
begin
  if not public.is_admin() then raise exception 'nao_autorizado'; end if;
  if p_status not in ('PENDING','ACTIVE','SUSPENDED') then raise exception 'status_invalido'; end if;
  if p_user = auth.uid() then raise exception 'nao_pode_alterar_a_propria_conta'; end if;
  update public.profiles
     set status = p_status,
         approved_at = case when p_status = 'ACTIVE' then now() else approved_at end
   where user_id = p_user;
end $$;

revoke all on function public.is_active_owner() from public, anon;
revoke all on function public.is_admin() from public, anon;
revoke all on function public.owner_is_active(uuid) from public, anon, authenticated;
revoke all on function public.admin_list_accounts() from public, anon;
revoke all on function public.admin_set_status(uuid, text) from public, anon;
grant execute on function public.is_active_owner() to authenticated;
grant execute on function public.is_admin() to authenticated;
grant execute on function public.admin_list_accounts() to authenticated;
grant execute on function public.admin_set_status(uuid, text) to authenticated;
revoke all on function public.get_public_shop(text) from public;
revoke all on function public.get_busy_slots(text, date, date) from public;
revoke all on function public.create_public_booking(text, uuid, uuid[], date, time, text, text, boolean) from public;
grant execute on function public.get_public_shop(text) to anon, authenticated;
grant execute on function public.get_busy_slots(text, date, date) to anon, authenticated;
grant execute on function public.create_public_booking(text, uuid, uuid[], date, time, text, text, boolean) to anon, authenticated;
