create extension if not exists pgcrypto;

create table if not exists public.inventory_items (
  id uuid primary key default gen_random_uuid(),
  barcode text not null,
  item_name text not null,
  category text not null check (category in ('Ring','Necklace','Bracelet','Earrings','Pendant','Chain','Anklet','Other')),
  karat text not null,
  grams numeric(12,3) not null check (grams > 0),
  description text,
  supplier text,
  design_code text,
  notes text,
  status text not null default 'available' check (status in ('available','sold')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  sold_at timestamptz,
  deleted_at timestamptz,
  constraint inventory_items_barcode_unique unique (barcode),
  constraint inventory_items_barcode_normalized check (barcode = upper(btrim(barcode))),
  constraint sold_date_consistency check (
    (status = 'available' and sold_at is null) or (status = 'sold' and sold_at is not null)
  )
);

create table if not exists public.inventory_history (
  id uuid primary key default gen_random_uuid(),
  inventory_item_id uuid not null references public.inventory_items(id) on delete restrict,
  action text not null,
  old_data jsonb,
  new_data jsonb,
  created_at timestamptz not null default now()
);

create table if not exists public.application_settings (
  id boolean primary key default true check (id),
  store_name text not null default 'Narciso Geronimo Jewelry',
  passcode_hash text,
  session_timeout_minutes integer not null default 480 check (session_timeout_minutes between 5 and 10080),
  barcode_format text not null default 'CODE128',
  label_show_karat boolean not null default true,
  label_show_grams boolean not null default true,
  session_version integer not null default 1 check (session_version > 0),
  updated_at timestamptz not null default now()
);
insert into public.application_settings (id) values (true) on conflict (id) do nothing;

create table if not exists public.auth_rate_limits (
  identifier_hash text primary key,
  attempt_count integer not null default 1,
  window_started_at timestamptz not null default now(),
  blocked_until timestamptz
);

create index if not exists inventory_items_barcode_idx on public.inventory_items (barcode);
create index if not exists inventory_items_status_idx on public.inventory_items (status) where deleted_at is null;
create index if not exists inventory_items_category_idx on public.inventory_items (category) where deleted_at is null;
create index if not exists inventory_items_karat_idx on public.inventory_items (karat) where deleted_at is null;
create index if not exists inventory_items_grams_idx on public.inventory_items (grams) where deleted_at is null;
create index if not exists inventory_items_created_at_idx on public.inventory_items (created_at desc) where deleted_at is null;
create index if not exists inventory_history_item_idx on public.inventory_history (inventory_item_id, created_at desc);
create index if not exists inventory_history_created_idx on public.inventory_history (created_at desc);

create or replace function public.prepare_inventory_item() returns trigger
language plpgsql security invoker set search_path = '' as $$
begin
  if tg_op = 'UPDATE' and new.barcode is distinct from old.barcode then
    raise exception 'Barcode is the permanent inventory identifier and cannot be changed';
  end if;
  new.updated_at := now();
  if tg_op = 'UPDATE' then
    if new.status = 'sold' and old.status <> 'sold' then new.sold_at := now();
    elsif new.status = 'available' and old.status <> 'available' then new.sold_at := null;
    end if;
  end if;
  return new;
end $$;

create or replace function public.audit_inventory_item() returns trigger
language plpgsql security invoker set search_path = '' as $$
declare action_name text := 'updated';
begin
  if tg_op = 'INSERT' then action_name := 'created';
  elsif new.status = 'sold' and old.status <> 'sold' then action_name := 'marked_sold';
  elsif new.status = 'available' and old.status <> 'available' then action_name := 'restored_available';
  elsif new.deleted_at is not null and old.deleted_at is null then action_name := 'soft_deleted';
  elsif new.deleted_at is null and old.deleted_at is not null then action_name := 'restored_deleted';
  end if;
  insert into public.inventory_history(inventory_item_id, action, old_data, new_data)
  values (new.id, action_name, case when tg_op = 'UPDATE' then to_jsonb(old) end, to_jsonb(new));
  return new;
end $$;

drop trigger if exists inventory_item_prepare on public.inventory_items;
create trigger inventory_item_prepare before insert or update on public.inventory_items for each row execute function public.prepare_inventory_item();
drop trigger if exists inventory_item_audit on public.inventory_items;
create trigger inventory_item_audit after insert or update on public.inventory_items for each row execute function public.audit_inventory_item();

create or replace function public.inventory_stats() returns jsonb
language sql stable security invoker set search_path = '' as $$
  select jsonb_build_object(
    'total_items', count(*),
    'available_items', count(*) filter (where status = 'available'),
    'sold_items', count(*) filter (where status = 'sold'),
    'available_grams', coalesce(sum(grams) filter (where status = 'available'), 0),
    'sold_grams', coalesce(sum(grams) filter (where status = 'sold'), 0),
    'total_grams', coalesce(sum(grams), 0)
  ) from public.inventory_items where deleted_at is null
$$;

alter table public.inventory_items enable row level security;
alter table public.inventory_history enable row level security;
alter table public.application_settings enable row level security;
alter table public.auth_rate_limits enable row level security;
revoke all on public.inventory_items, public.inventory_history, public.application_settings, public.auth_rate_limits from anon, authenticated;
revoke execute on function public.inventory_stats() from public, anon, authenticated;
revoke execute on function public.prepare_inventory_item(), public.audit_inventory_item() from public, anon, authenticated;
grant all on public.inventory_items, public.inventory_history, public.application_settings, public.auth_rate_limits to service_role;
grant execute on function public.inventory_stats() to service_role;
