-- Brands (a.k.a. marketplace suppliers) and page-view tracking.
-- Run in Supabase SQL editor.

create table if not exists public.brands (
  id bigserial primary key,
  slug text not null unique,
  name text not null,
  description text,
  logo_url text,
  cover_url text,
  is_active boolean not null default true,
  sort_order int not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_brands_active on public.brands(is_active);
create index if not exists idx_brands_sort on public.brands(sort_order);

-- Link products to a brand (nullable: null = first-party / own goods).
alter table public.products
  add column if not exists brand_id bigint references public.brands(id) on delete set null;

create index if not exists idx_products_brand_id on public.products(brand_id);

-- Page-view tracking. Append-only; aggregation happens at query time.
-- session_id is opaque (random) and lets us dedupe rapid re-renders without
-- storing IPs or PII. country/referrer are optional, best-effort.
create table if not exists public.page_views (
  id bigserial primary key,
  page_type text not null check (page_type in ('product', 'brand')),
  entity_id bigint not null,
  session_id text,
  country text,
  referrer text,
  created_at timestamptz not null default now()
);

create index if not exists idx_page_views_entity
  on public.page_views(page_type, entity_id, created_at desc);
create index if not exists idx_page_views_created_at
  on public.page_views(created_at desc);
-- Dedup window lookups (same session viewing the same entity within ~30 min).
create index if not exists idx_page_views_session_entity
  on public.page_views(session_id, page_type, entity_id, created_at desc)
  where session_id is not null;
