-- Migração 002: reforça a reserva pública no servidor.
-- Corrige os pontos fracos do schema.sql inicial:
--   1. escala (dia, horário, pausa, folga, intervalo) agora é revalidada no servidor;
--   2. no_overlap passa a considerar a folga entre serviços (buffer);
--   3. limite por telefone contra spam de reservas;
--   4. conflito simultâneo vira erro claro, não erro técnico.

alter table public.appointments add column if not exists buffer_minutes int not null default 0;

alter table public.appointments drop constraint if exists no_overlap;
alter table public.appointments add constraint no_overlap exclude using gist (
  staff_id with =,
  tsrange(day + start_time, (day + end_time) + make_interval(mins => buffer_minutes)) with &&
) where (status not in ('CANCELLED','NO_SHOW'));

-- Confere se um horário público cabe na escala do profissional.
create or replace function public.schedule_slot_ok(p_staff uuid, p_day date, p_start time, p_duration_min int)
returns boolean
language plpgsql stable security definer set search_path = public as $$
declare
  sch jsonb; d jsonb; dow int;
  v_open int; v_close int; v_start int; v_end int; v_step int; v_bs int; v_be int;
  bs text; be text;
begin
  select schedule into sch from public.staff where id = p_staff and active;
  if sch is null then return false; end if;
  if sch->'blockedDates' ? to_char(p_day, 'YYYY-MM-DD') then return false; end if;

  dow := extract(dow from p_day)::int;               -- 0 = domingo, igual ao app
  d := sch->'days'->dow;
  if d is null or coalesce((d->>'enabled')::boolean, false) = false then return false; end if;

  v_open  := extract(hour from (d->>'start')::time)::int * 60 + extract(minute from (d->>'start')::time)::int;
  v_close := extract(hour from (d->>'end')::time)::int * 60 + extract(minute from (d->>'end')::time)::int;
  v_start := extract(hour from p_start)::int * 60 + extract(minute from p_start)::int;
  v_end   := v_start + p_duration_min;
  v_step  := greatest(5, coalesce((sch->>'slotIntervalMinutes')::int, 30));

  if v_close <= v_open then return false; end if;
  if v_start < v_open or v_end > v_close then return false; end if;
  if (v_start - v_open) % v_step <> 0 then return false; end if;   -- só horários da grade

  bs := nullif(d->>'breakStart', ''); be := nullif(d->>'breakEnd', '');
  if bs is not null and be is not null then
    v_bs := extract(hour from bs::time)::int * 60 + extract(minute from bs::time)::int;
    v_be := extract(hour from be::time)::int * 60 + extract(minute from be::time)::int;
    if v_be > v_bs and v_start < v_be and v_end > v_bs then return false; end if;
  end if;
  return true;
end $$;

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
  if not found then raise exception 'barbearia_nao_encontrada'; end if;
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

  -- limite contra spam: por telefone
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

revoke all on function public.schedule_slot_ok(uuid, date, time, int) from public, anon, authenticated;
revoke all on function public.create_public_booking(text, uuid, uuid[], date, time, text, text, boolean) from public;
grant execute on function public.create_public_booking(text, uuid, uuid[], date, time, text, text, boolean) to anon, authenticated;
