-- Migração 006: Suporte (chamados de sugestão, problema, dúvida e pedido de cópia dos dados).
-- Quem abre: a própria barbearia (conta ativa). Quem vê tudo e responde: os administradores.
-- Rodar uma vez no SQL Editor do Supabase.

create table if not exists public.support_tickets (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  email text not null default '',
  kind text not null check (kind in ('SUGGESTION', 'PROBLEM', 'QUESTION', 'DATA_COPY')),
  message text not null check (char_length(btrim(message)) between 1 and 2000),
  status text not null default 'OPEN' check (status in ('OPEN', 'IN_PROGRESS', 'DONE')),
  admin_note text check (admin_note is null or char_length(admin_note) <= 1000),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists support_tickets_user on public.support_tickets (user_id, created_at desc);
create index if not exists support_tickets_status on public.support_tickets (status, created_at desc);

-- O e-mail e o dono do chamado vêm do servidor, nunca do navegador; limite de 10 chamados por hora.
create or replace function public.support_tickets_before_insert()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  new.user_id := auth.uid();
  new.status := 'OPEN';
  new.admin_note := null;
  new.created_at := now();
  new.updated_at := now();
  select coalesce(p.email, '') into new.email from public.profiles p where p.user_id = auth.uid();
  if (select count(*) from public.support_tickets t
        where t.user_id = auth.uid() and t.created_at > now() - interval '1 hour') >= 10 then
    raise exception 'limite_de_chamados';
  end if;
  return new;
end $$;

drop trigger if exists support_tickets_before_insert on public.support_tickets;
create trigger support_tickets_before_insert before insert on public.support_tickets
  for each row execute function public.support_tickets_before_insert();

alter table public.support_tickets enable row level security;

drop policy if exists tickets_owner_select on public.support_tickets;
create policy tickets_owner_select on public.support_tickets for select
  using (user_id = auth.uid() and public.is_active_owner());

drop policy if exists tickets_owner_insert on public.support_tickets;
create policy tickets_owner_insert on public.support_tickets for insert
  with check (public.is_active_owner());

drop policy if exists tickets_admin_select on public.support_tickets;
create policy tickets_admin_select on public.support_tickets for select
  using (public.is_admin());

-- Só administrador muda a situação e responde. Não há política de update: passa por esta função.
create or replace function public.admin_update_ticket(p_id uuid, p_status text, p_note text)
returns void language plpgsql security definer set search_path = public as $$
begin
  if not public.is_admin() then raise exception 'nao_autorizado'; end if;
  if p_status not in ('OPEN', 'IN_PROGRESS', 'DONE') then raise exception 'situacao_invalida'; end if;
  update public.support_tickets
     set status = p_status,
         admin_note = nullif(btrim(coalesce(p_note, '')), ''),
         updated_at = now()
   where id = p_id;
end $$;

revoke all on function public.admin_update_ticket(uuid, text, text) from public, anon;
grant execute on function public.admin_update_ticket(uuid, text, text) to authenticated;
