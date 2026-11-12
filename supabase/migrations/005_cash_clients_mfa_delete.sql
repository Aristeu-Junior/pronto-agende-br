-- Migração 005: Caixa, clientes e extratos no servidor; 2º fator (TOTP); exclusão da própria conta.

-- ---------- Documentos da barbearia (clientes, vendas do caixa, extratos) ----------
-- Guardados como JSON por enquanto: o app já usa esses formatos e isso evita remodelar tudo agora.
create table if not exists public.crm_clients (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses(id) on delete cascade,
  data jsonb not null,
  updated_at timestamptz not null default now()
);
create table if not exists public.pos_transactions (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses(id) on delete cascade,
  closed_at timestamptz not null default now(),
  data jsonb not null
);
create table if not exists public.bank_statements (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses(id) on delete cascade,
  entry_date date not null default current_date,
  data jsonb not null
);
create index if not exists crm_clients_business on public.crm_clients (business_id);
create index if not exists pos_transactions_business on public.pos_transactions (business_id, closed_at desc);
create index if not exists bank_statements_business on public.bank_statements (business_id, entry_date desc);

-- limite de tamanho de cada documento (evita abuso de armazenamento)
alter table public.crm_clients add constraint crm_clients_size check (pg_column_size(data) < 20000);
alter table public.pos_transactions add constraint pos_size check (pg_column_size(data) < 20000);
alter table public.bank_statements add constraint stmt_size check (pg_column_size(data) < 20000);

-- ---------- 2º fator: se a conta tem TOTP verificado, o acesso exige a sessão aal2 ----------
create or replace function public.mfa_ok()
returns boolean language sql stable security definer set search_path = public, auth as $$
  select not exists (
    select 1 from auth.mfa_factors f where f.user_id = auth.uid() and f.status = 'verified'
  ) or coalesce(auth.jwt() ->> 'aal', 'aal1') = 'aal2';
$$;
revoke all on function public.mfa_ok() from public;
grant execute on function public.mfa_ok() to anon, authenticated;

create or replace function public.is_active_owner()
returns boolean language sql stable security definer set search_path = public as $$
  select public.mfa_ok() and exists (select 1 from public.profiles where user_id = auth.uid() and status = 'ACTIVE');
$$;

create or replace function public.is_admin()
returns boolean language sql stable security definer set search_path = public as $$
  select public.mfa_ok() and exists (select 1 from public.profiles where user_id = auth.uid() and status = 'ACTIVE' and is_admin);
$$;

-- ---------- RLS das novas tabelas ----------
do $$
declare t text;
begin
  foreach t in array array['crm_clients','pos_transactions','bank_statements'] loop
    execute format('alter table public.%I enable row level security', t);
    execute format('drop policy if exists owner_all on public.%I', t);
    execute format($f$create policy owner_all on public.%I for all
      using (public.is_active_owner() and exists (select 1 from public.businesses b where b.id = business_id and b.owner_id = auth.uid()))
      with check (public.is_active_owner() and exists (select 1 from public.businesses b where b.id = business_id and b.owner_id = auth.uid()))$f$, t);
  end loop;
end $$;

-- ---------- Exclusão da própria conta (LGPD) ----------
create or replace function public.delete_my_account()
returns void language plpgsql security definer set search_path = public, auth as $$
declare v_uid uuid := auth.uid();
begin
  if v_uid is null then raise exception 'nao_autorizado'; end if;
  if exists (select 1 from public.profiles where user_id = v_uid and is_admin) then
    raise exception 'admin_nao_pode_se_excluir';
  end if;
  -- agendamentos primeiro: a chave para profissional é RESTRICT
  delete from public.appointments where business_id in (select id from public.businesses where owner_id = v_uid);
  delete from auth.users where id = v_uid;   -- apaga perfil, barbearia, equipe, serviços, clientes, caixa e extratos em cascata
end $$;
revoke all on function public.delete_my_account() from public, anon;
grant execute on function public.delete_my_account() to authenticated;
