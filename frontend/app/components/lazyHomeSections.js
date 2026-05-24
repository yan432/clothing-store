'use client'
// One central spot to lazy-load all below-the-fold home page sections.
// Doing the dynamic() calls inside a 'use client' module is the
// supported pattern in Next 16 for proper code splitting of Client
// Components imported from a Server Component (page.js).
//
// Each section still renders server-side (ssr: true is the default),
// so SEO/HTML is unchanged — only the client JS bundle for each is
// split into its own chunk and loaded when the component renders.
import dynamic from 'next/dynamic'

export const HeroCarousel = dynamic(() => import('./HeroCarousel'))
export const HomeArrivalsCarousel = dynamic(() => import('./HomeArrivalsCarousel'))
export const HomeCategoriesCarousel = dynamic(() => import('./HomeCategoriesCarousel'))
export const HomepagePhotoTiles = dynamic(() => import('./HomepagePhotoTiles'))
export const HomeInstagramFeed = dynamic(() => import('./HomeInstagramFeed'))
export const HomeAboutTeaser = dynamic(() => import('./HomeAboutTeaser'))
