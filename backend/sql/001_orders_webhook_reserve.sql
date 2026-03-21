-- Inventory reserve fields on products
alter table if exists public.products
  add column if not exists available_stock int not null default 0;

alter table if exists public.products
  add column if not exists reserved_stock int not null default 0;

-- Backfill available stock from legacy stock once.
update public.products
set available_stock = coalesce(stock, 0)
where (available_stock is null or available_stock = 0)
  and coalesce(stock, 0) > 0;

-- Keep legacy stock aligned for backward compatibility.
update public.products
set stock = available_stock
where stock is distinct from available_stock;

-- Orders table (full snapshot model)
create table if not exists public.orders (
  id bigserial primary key,
  client_reference_id uuid not null unique,
  stripe_session_id text unique,
  stripe_payment_intent_id text,
  stripe_customer_id text,
  status text not null default 'pending',
  currency text default 'usd',
  amount_total numeric(12,2),
  email text,
  items_json jsonb not null default '[]'::jsonb,
  customer_json jsonb,
  shipping_json jsonb,
  session_json jsonb,
  event_json jsonb,
  metadata_json jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  paid_at timestamptz,
  failed_at timestamptz,
  cancelled_at timestamptz,
  expires_at timestamptz
);

create index if not exists idx_orders_status on public.orders(status);
create index if not exists idx_orders_created_at on public.orders(created_at desc);
create index if not exists idx_orders_session_id on public.orders(stripe_session_id);

-- Stripe webhook event log for idempotency
create table if not exists public.stripe_webhook_events (
  id bigserial primary key,
  event_id text not null unique,
  event_type text not null,
  stripe_created_at bigint,
  received_at timestamptz not null default now(),
  payload_json jsonb not null
);

create index if not exists idx_webhook_events_type on public.stripe_webhook_events(event_type);
create index if not exists idx_webhook_events_received on public.stripe_webhook_events(received_at desc);
