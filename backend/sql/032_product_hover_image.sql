-- Let admins pick which photo flips in on hover from a product card.
-- When NULL, the storefront falls back to the second image in image_urls.

alter table public.products
  add column if not exists hover_image_url text;
