-- ============================================================
-- Sample Instagram posts for the "From the community" wall
-- Run AFTER 2026-05-24_instagram_posts.sql
--
-- Uses placeholder images already in /public/about/img/ — these are
-- your own product photos, so they look right out of the box. Replace
-- via admin once you have real customer UGC.
-- ============================================================

INSERT INTO instagram_posts (image_url, permalink, caption, author_handle, sort_order, is_active)
VALUES
  ('/about/img/p-riot-bomber.jpg',        'https://www.instagram.com/p/sample-1/', 'Riot Bomber, Berlin winter',  'maria.k',        0, TRUE),
  ('/about/img/denim-set.jpg',            'https://www.instagram.com/p/sample-2/', 'Scars hoodie + wide jeans',   'tomas.warsaw',   1, TRUE),
  ('/about/img/p-jeans-deconstructed.jpg','https://www.instagram.com/p/sample-3/', 'Deconstructed denim',          'olya.kyiv',      2, TRUE),
  ('/about/img/thermochromic.jpg',        'https://www.instagram.com/p/sample-4/', 'Thermochromic tee on tour',   'sam.tokyo',      3, TRUE),
  ('/about/img/loose-pants.jpg',          'https://www.instagram.com/p/sample-5/', 'Loose fit pants, all-day',    'lina.lviv',      4, TRUE),
  ('/about/img/bermuda.jpg',              'https://www.instagram.com/p/sample-6/', 'Cargo bermudas, summer',      'pavel.lisbon',   5, TRUE);
