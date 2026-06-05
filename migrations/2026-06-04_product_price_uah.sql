-- Ukrainian-locale pricing overrides.
-- When set, these take precedence over auto-converting the EUR price by the
-- shipping_config.uah_eur_rate. When NULL, the frontend/backend auto-convert.
ALTER TABLE products ADD COLUMN IF NOT EXISTS price_uah         float8;
ALTER TABLE products ADD COLUMN IF NOT EXISTS compare_price_uah float8;

COMMENT ON COLUMN products.price_uah         IS 'Manual UAH price override for the UA (uk) locale. NULL = auto-convert from price.';
COMMENT ON COLUMN products.compare_price_uah IS 'Manual UAH compare-at (strikethrough) override for the UA locale. NULL = auto-convert from compare_price.';
