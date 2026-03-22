alter table if exists public.products
  add column if not exists material_care text,
  add column if not exists product_details text,
  add column if not exists fit_info text;
