-- Brand-user links: which Supabase auth.users can manage which brands.
-- Run in Supabase SQL editor (after migration 030).
--
-- Workflow:
--   1. Admin invites a partner by email — row inserted with user_id = NULL
--      while the user hasn't signed up yet.
--   2. On the partner's first login, the backend's brand-user resolver
--      upgrades any matching email row to point at their auth.users.id.
--   3. After upgrade, the partner can access /partner/*.

create table if not exists public.brand_users (
  id bigserial primary key,
  brand_id bigint not null references public.brands(id) on delete cascade,
  user_id uuid references auth.users(id) on delete cascade,
  email text not null,                       -- canonical, used to claim pending invites
  role text not null default 'owner' check (role in ('owner', 'manager')),
  invited_at timestamptz not null default now(),
  claimed_at timestamptz,                    -- set when user_id is filled in
  created_at timestamptz not null default now()
);

-- One link per (brand, user) once claimed. Email can repeat across brands so the
-- same partner can manage multiple brands.
create unique index if not exists uq_brand_users_brand_user
  on public.brand_users(brand_id, user_id)
  where user_id is not null;

-- One pending invite per (brand, email) so we don't accumulate duplicates.
create unique index if not exists uq_brand_users_brand_email_pending
  on public.brand_users(brand_id, lower(email))
  where user_id is null;

create index if not exists idx_brand_users_user_id on public.brand_users(user_id);
create index if not exists idx_brand_users_email on public.brand_users(lower(email));
