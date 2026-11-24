-- Migração 007: endurecimento da reserva pública e das permissões do visitante.
-- 1) O visitante (anon) só usa as funções get_public_shop, get_busy_slots e create_public_booking.
--    Tira todo acesso direto às tabelas (a RLS já bloqueava; isto é uma segunda trava).
revoke all on all tables in schema public from anon;
alter default privileges in schema public revoke all on tables from anon;

-- 2) Funções de gatilho não precisam ser chamáveis por ninguém.
revoke execute on function public.handle_new_user() from public, anon, authenticated;
revoke execute on function public.support_tickets_before_insert() from public, anon, authenticated;

-- 3) Reserva pública: no máximo 10 serviços por reserva e 20 reservas por hora por barbearia
--    (o limite por telefone já existia; este cobre quem usa telefones diferentes para lotar a agenda).
CREATE OR REPLACE FUNCTION public.create_public_booking(p_slug text, p_staff uuid, p_service_ids uuid[], p_day date, p_start time without time zone, p_client_name text, p_client_phone text, p_want_deposit boolean)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
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

  if coalesce(cardinality(p_service_ids), 0) not between 1 and 10 then raise exception 'servico_invalido'; end if;

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

  if (select count(*) from public.appointments a
        where a.business_id = v_biz.id and a.origin_channel = 'DIRECT_LINK'
          and a.created_at > now() - interval '1 hour') >= 20 then
    raise exception 'muitas_reservas_na_barbearia';
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
end $function$;
