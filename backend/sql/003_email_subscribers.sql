create table if not exists public.email_subscribers (
  id bigserial primary key,
  email text not null unique,
  first_source text,
  last_source text,
  source_counts jsonb not null default '{}'::jsonb,
  events_count int not null default 0,
  first_seen_at timestamptz,
  last_seen_at timestamptz,
  metadata_json jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_email_subscribers_last_seen
  on public.email_subscribers (last_seen_at desc);

create index if not exists idx_email_subscribers_last_source
  on public.email_subscribers (last_source);
