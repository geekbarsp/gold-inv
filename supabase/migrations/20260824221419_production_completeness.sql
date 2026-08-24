alter table public.application_settings
  add column if not exists session_version integer not null default 1 check (session_version > 0);

create unique index if not exists inventory_items_barcode_upper_unique
  on public.inventory_items (upper(barcode));

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

create or replace function public.inventory_breakdowns() returns jsonb
language sql stable security invoker set search_path = '' as $$
  select jsonb_build_object(
    'categories', coalesce((
      select jsonb_agg(to_jsonb(c) order by c.grams desc) from (
        select category as label, count(*)::integer as items, sum(grams)::numeric as grams
        from public.inventory_items where deleted_at is null group by category
      ) c
    ), '[]'::jsonb),
    'karats', coalesce((
      select jsonb_agg(to_jsonb(k) order by k.grams desc) from (
        select karat as label, count(*)::integer as items, sum(grams)::numeric as grams
        from public.inventory_items where deleted_at is null group by karat
      ) k
    ), '[]'::jsonb)
  )
$$;

revoke execute on function public.audit_inventory_item(), public.inventory_breakdowns() from public, anon, authenticated;
grant execute on function public.inventory_breakdowns() to service_role;
