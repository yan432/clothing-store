-- Таблица настроек магазина (email шаблоны и прочее)
CREATE TABLE IF NOT EXISTS settings (
  key TEXT PRIMARY KEY,
  value TEXT,
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Email настройки по умолчанию
INSERT INTO settings (key, value) VALUES
  ('email_from_name',        'EDM Clothes'),
  ('email_order_subject',    'Order confirmation #{order_id} — EDM Clothes'),
  ('email_order_greeting',   'Thanks for your order, {customer_name}!'),
  ('email_order_message',    'We received your order and started processing it. You will receive a shipping notification soon.'),
  ('email_order_footer',     'EDM Clothes — Made in Ukraine'),
  ('email_admin_subject',    'New order #{order_id} — {total}'),
  ('popup_promo_code',       'WELCOME10')
ON CONFLICT (key) DO NOTHING;
