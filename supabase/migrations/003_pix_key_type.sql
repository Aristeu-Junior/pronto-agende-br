-- Migração 003: tipo explícito da chave Pix (o app não adivinha mais CPF x celular).
alter table public.businesses
  add column if not exists pix_key_type text
  check (pix_key_type in ('CPF','CNPJ','PHONE','EMAIL','RANDOM'));

create or replace function public.get_public_shop(p_slug text)
returns jsonb
language sql stable security definer set search_path = public as $$
  select jsonb_build_object(
    'name', b.name, 'address', b.address, 'neighborhood', b.neighborhood, 'cityState', b.city_state,
    'phone', b.phone, 'pixKey', b.pix_key, 'pixKeyType', b.pix_key_type, 'depositPercent', b.deposit_percent,
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
