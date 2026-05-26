-- Store the customer's preferred storefront/communication language.
-- Values follow app locale codes: en, uk.

ALTER TABLE email_subscribers
  ADD COLUMN IF NOT EXISTS preferred_locale text DEFAULT 'en';

ALTER TABLE user_profiles
  ADD COLUMN IF NOT EXISTS preferred_locale text DEFAULT 'en';

ALTER TABLE abandoned_carts
  ADD COLUMN IF NOT EXISTS preferred_locale text DEFAULT 'en';

ALTER TABLE orders
  ADD COLUMN IF NOT EXISTS preferred_locale text DEFAULT 'en';

ALTER TABLE waitlist
  ADD COLUMN IF NOT EXISTS preferred_locale text DEFAULT 'en';

CREATE INDEX IF NOT EXISTS idx_email_subscribers_preferred_locale
  ON email_subscribers(preferred_locale);

CREATE INDEX IF NOT EXISTS idx_user_profiles_preferred_locale
  ON user_profiles(preferred_locale);

CREATE INDEX IF NOT EXISTS idx_orders_preferred_locale
  ON orders(preferred_locale);

CREATE INDEX IF NOT EXISTS idx_waitlist_preferred_locale
  ON waitlist(preferred_locale);
