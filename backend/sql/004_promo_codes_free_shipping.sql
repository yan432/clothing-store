do $$
declare
  constraint_name text;
begin
  select con.conname
  into constraint_name
  from pg_constraint con
  join pg_class rel on rel.oid = con.conrelid
  join pg_namespace nsp on nsp.oid = rel.relnamespace
  where nsp.nspname = 'public'
    and rel.relname = 'promo_codes'
    and con.contype = 'c'
    and pg_get_constraintdef(con.oid) ilike '%discount_type%';

  if constraint_name is not null then
    execute format('alter table public.promo_codes drop constraint %I', constraint_name);
  end if;
end $$;

alter table if exists public.promo_codes
  add constraint promo_codes_discount_type_check
  check (discount_type in ('percent', 'fixed', 'free_shipping'));

do $$
declare
  value_constraint text;
begin
  select con.conname
  into value_constraint
  from pg_constraint con
  join pg_class rel on rel.oid = con.conrelid
  join pg_namespace nsp on nsp.oid = rel.relnamespace
  where nsp.nspname = 'public'
    and rel.relname = 'promo_codes'
    and con.contype = 'c'
    and pg_get_constraintdef(con.oid) ilike '%discount_value%';

  if value_constraint is not null then
    execute format('alter table public.promo_codes drop constraint %I', value_constraint);
  end if;
end $$;

alter table if exists public.promo_codes
  add constraint promo_codes_discount_value_check
  check (
    (discount_type = 'free_shipping' and discount_value >= 0)
    or (discount_type in ('percent', 'fixed') and discount_value > 0)
  );
