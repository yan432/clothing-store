-- SEO defaults (run in Supabase SQL Editor)
INSERT INTO settings (key, value) VALUES
  ('seo_site_name',            'edm.clothes'),
  ('seo_home_title',           'edm.clothes — Minimal Clothing'),
  ('seo_home_description',     'Minimal essentials designed for everyday wear. Made in Ukraine.'),
  ('seo_products_title',       'Shop'),
  ('seo_products_description', 'Browse the full edm.clothes collection.')
ON CONFLICT (key) DO NOTHING;
