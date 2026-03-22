create table if not exists public.promo_codes (
  id bigserial primary key,
  code text not null unique,
  discount_type text not null check (discount_type in ('percent', 'fixed', 'free_shipping')),
  discount_value numeric(12,2) not null check (
    (discount_type = 'free_shipping' and discount_value >= 0)
    or (discount_type in ('percent', 'fixed') and discount_value > 0)
  ),
  expires_at timestamptz,
  usage_limit int,
  used_count int not null default 0,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

create index if not exists idx_promo_codes_code on public.promo_codes(code);
create index if not exists idx_promo_codes_active on public.promo_codes(is_active);
