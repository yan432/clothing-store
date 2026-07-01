-- Close data-collection gaps for the future ranking algorithm:
-- dwell time and UTM attribution on page_views.
-- Run in Supabase SQL editor.

alter table public.page_views
  add column if not exists duration_ms int,
  add column if not exists utm jsonb;

comment on column public.page_views.duration_ms is
  'Time on page in ms, best-effort via visibility/pagehide. Null until the duration beacon lands.';
comment on column public.page_views.utm is
  'utm_source/medium/campaign/content/term captured client-side at view time, if present.';
