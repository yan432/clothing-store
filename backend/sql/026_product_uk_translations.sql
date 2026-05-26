-- Ukrainian storefront translations for product copy.
-- Product identity, inventory, price, images, variants and checkout stay shared.
ALTER TABLE products ADD COLUMN IF NOT EXISTS description_uk text;
ALTER TABLE products ADD COLUMN IF NOT EXISTS material_care_uk text;
ALTER TABLE products ADD COLUMN IF NOT EXISTS product_details_uk text;
ALTER TABLE products ADD COLUMN IF NOT EXISTS fit_info_uk text;
