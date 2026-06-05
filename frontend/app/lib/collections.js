export const COLLECTIONS = {
  tops: {
    slug: 'tops',
    filter: { category: 'Tops' },
    en: {
      navLabel: 'Tops',
      title: 'Oversized Tops, Hoodies & Longsleeves',
      metaTitle: 'Oversized Tops, Hoodies & Longsleeves — edm.clothes',
      description: 'Shop oversized hoodies, detachable longsleeves and unisex tops from edm.clothes. Minimal streetwear silhouettes made in Ukraine.',
      intro: 'Explore oversized tops, hoodies and modular longsleeves built for everyday city wear, club nights and layered looks. Designed as unisex silhouettes and made in Ukraine.',
    },
    uk: {
      navLabel: 'Верх',
      title: 'Оверсайз худі, лонгсліви та верх',
      metaTitle: 'Оверсайз худі, лонгсліви та верх — edm.clothes',
      description: 'Оверсайз худі, модульні лонгсліви та унісекс верх від edm.clothes. Мінімалістичні силуети, зроблені в Україні.',
      intro: 'Добірка худі, лонгслівів і верхів для щоденного міського ритму, вечірок і багатошарових образів. Унісекс силуети, зроблені в Україні.',
    },
  },
  bottoms: {
    slug: 'bottoms',
    filter: { category: 'Bottoms' },
    en: {
      navLabel: 'Bottoms',
      title: 'Deconstructed Denim, Pants & Shorts',
      metaTitle: 'Deconstructed Denim, Pants & Shorts — edm.clothes',
      description: 'Shop deconstructed washed jeans, loose fit pants and Bermuda shorts from edm.clothes. Unisex bottoms made in Ukraine.',
      intro: 'Denim and bottoms with relaxed proportions, stone-washed finishes and utility details. Built for movement, long wear and everyday styling.',
    },
    uk: {
      navLabel: 'Низ',
      title: 'Деконструйований денім, штани та шорти',
      metaTitle: 'Деконструйований денім, штани та шорти — edm.clothes',
      description: 'Деконструйовані washed jeans, loose fit pants і Bermuda shorts від edm.clothes. Унісекс низ, зроблений в Україні.',
      intro: 'Денім і низ із вільними пропорціями, stone wash обробкою та утилітарними деталями. Для руху, довгого носіння і щоденного стилю.',
    },
  },
  new: {
    slug: 'new',
    filter: { tag: 'new' },
    en: {
      navLabel: 'New arrivals',
      title: 'New Arrivals',
      metaTitle: 'New Arrivals — edm.clothes',
      description: 'Shop the latest edm.clothes drop: new hoodies, longsleeves, denim and streetwear essentials made in Ukraine.',
      intro: 'The newest pieces from edm.clothes, gathered in one place before they settle into the full catalog.',
    },
    uk: {
      navLabel: 'Новинки',
      title: 'Новинки',
      metaTitle: 'Новинки — edm.clothes',
      description: 'Новий дроп edm.clothes: худі, лонгсліви, денім і базові речі, зроблені в Україні.',
      intro: 'Найновіші речі edm.clothes в одному місці, перш ніж вони стануть частиною основного каталогу.',
    },
  },
  sale: {
    slug: 'sale',
    filter: { sale: true },
    en: {
      navLabel: 'Sale',
      title: 'Sale',
      metaTitle: 'Sale — edm.clothes',
      description: 'Shop sale pieces from edm.clothes: discounted hoodies, pants, shorts and unisex streetwear made in Ukraine.',
      intro: 'Limited discounted pieces from past and current drops. Sizes can move quickly, so availability may be narrow.',
    },
    uk: {
      navLabel: 'Знижки',
      title: 'Знижки',
      metaTitle: 'Знижки — edm.clothes',
      description: 'Речі зі знижкою від edm.clothes: худі, штани, шорти та унісекс streetwear, зроблений в Україні.',
      intro: 'Обмежені речі зі знижкою з попередніх і актуальних дропів. Доступність розмірів може бути вузькою.',
    },
  },
}

export const COLLECTION_SLUGS = Object.keys(COLLECTIONS)

export function getCollection(slug) {
  return COLLECTIONS[String(slug || '').toLowerCase()] || null
}

export function collectionCopy(collection, locale = 'en') {
  return collection?.[locale === 'uk' ? 'uk' : 'en'] || collection?.en
}

export function collectionPath(slug) {
  return `/collections/${slug}`
}

export function collectionPathForCategory(category) {
  const normalized = String(category || '').trim().toLowerCase()
  if (normalized === 'tops') return collectionPath('tops')
  if (normalized === 'bottoms') return collectionPath('bottoms')
  return null
}
