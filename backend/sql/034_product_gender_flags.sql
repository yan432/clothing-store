-- Product audience flags for marketplace navigation.
-- Unisex = both flags true.

alter table public.products
  add column if not exists is_menswear boolean not null default true,
  add column if not exists is_womenswear boolean not null default true;

create index if not exists idx_products_is_menswear
  on public.products(is_menswear)
  where is_hidden = false;

create index if not exists idx_products_is_womenswear
  on public.products(is_womenswear)
  where is_hidden = false;
