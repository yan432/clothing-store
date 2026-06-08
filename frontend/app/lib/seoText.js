import { DEFAULT_LOCALE, UK_LOCALE, normalizeLocale } from './i18n'

const CATEGORY_KEYWORDS = {
  [DEFAULT_LOCALE]: {
    Tops: 'oversized tops, hoodies and longsleeves',
    Bottoms: 'deconstructed denim, loose fit pants and shorts',
    Outerwear: 'outerwear and layered streetwear',
    Accessories: 'minimal streetwear accessories',
    Knitwear: 'knitwear and textured layers',
    Denim: 'deconstructed denim and washed jeans',
    Jackets: 'jackets and outerwear',
  },
  [UK_LOCALE]: {
    Tops: 'оверсайз верх, худі та лонгсліви',
    Bottoms: 'денім, штани та шорти',
    Outerwear: 'верхній одяг і багатошарові образи',
    Accessories: 'мінімалістичні аксесуари',
    Knitwear: 'трикотаж і фактурні шари',
    Denim: 'деконструйований денім і washed jeans',
    Jackets: 'куртки та верхній одяг',
  },
}

const PRODUCT_KIND_PATTERNS = [
  {
    match: /hoodie|худі/i,
    en: 'oversized hoodie',
    uk: 'оверсайз худі',
  },
  {
    match: /longsleeve|лонгслів/i,
    en: 'modular longsleeve',
    uk: 'модульний лонгслів',
  },
  {
    match: /jeans|джинс/i,
    en: 'deconstructed denim jeans',
    uk: 'деконструйовані джинси',
  },
  {
    match: /pants|штани/i,
    en: 'loose fit pants',
    uk: 'штани loose fit',
  },
  {
    match: /shorts|bermuda|шорти/i,
    en: 'cargo bermuda shorts',
    uk: 'карго-шорти bermuda',
  },
  {
    match: /bomber|бомбер/i,
    en: 'bomber jacket',
    uk: 'бомбер',
  },
  {
    match: /t-?shirt|shirt|футбол/i,
    en: 'streetwear t-shirt',
    uk: 'streetwear футболка',
  },
  {
    match: /tank/i,
    en: 'tank top',
    uk: 'tank top',
  },
  {
    match: /vest|жилет/i,
    en: 'layering vest',
    uk: 'жилет для layering',
  },
  {
    match: /sweater|светр/i,
    en: 'knit sweater',
    uk: 'трикотажний светр',
  },
]

const IMAGE_ROLES = {
  [DEFAULT_LOCALE]: [
    'front product photo',
    'alternate product view',
    'detail product photo',
    'fit product photo',
  ],
  [UK_LOCALE]: [
    'перше фото товару',
    'альтернативний ракурс товару',
    'деталь товару',
    'фото посадки товару',
  ],
}

const COLLECTION_IMAGE_ALT = {
  [DEFAULT_LOCALE]: {
    Tops: 'Shop oversized tops, hoodies and longsleeves by edm.clothes',
    Bottoms: 'Shop deconstructed denim, pants and shorts by edm.clothes',
    Sale: 'Shop sale streetwear pieces by edm.clothes',
    'All products': 'Shop Ukrainian streetwear and everyday essentials by edm.clothes',
    New: 'Shop new arrivals by edm.clothes',
  },
  [UK_LOCALE]: {
    Tops: 'Дивитися оверсайз верх, худі та лонгсліви від edm.clothes',
    Bottoms: 'Дивитися денім, штани та шорти від edm.clothes',
    Sale: 'Дивитися речі зі знижкою від edm.clothes',
    'All products': 'Дивитися український streetwear та базові речі від edm.clothes',
    New: 'Дивитися новинки від edm.clothes',
  },
}

export function cleanMetaText(value = '') {
  return String(value || '')
    .replace(/\s+/g, ' ')
    .replace(/\s+([,.])/g, '$1')
    .trim()
}

export function firstSentence(value = '') {
  const text = cleanMetaText(value)
  if (!text) return ''
  const match = text.match(/^(.+?[.!?])\s/)
  return cleanMetaText(match ? match[1] : text)
}

export function materialLine(value = '') {
  const text = String(value || '')
  const match = text.match(/(?:Material|Матеріал):\s*([^\n.]+)/i)
  return match ? cleanMetaText(match[1]) : ''
}

export function compactMetaDescription(parts, maxLength = 168) {
  const uniqueParts = []
  const seen = new Set()

  for (const part of parts.map(cleanMetaText).filter(Boolean)) {
    const key = part.toLowerCase()
    if (seen.has(key)) continue
    seen.add(key)
    uniqueParts.push(part)
  }

  let description = ''
  for (const part of uniqueParts) {
    const next = description ? `${description} ${part}` : part
    if (next.length <= maxLength) {
      description = next
    } else if (!description) {
      description = `${part.slice(0, maxLength - 3).trim()}...`
    }
  }

  return description || 'Shop edm.clothes essentials, made in Ukraine.'
}

function categoryKeyword(category, locale = DEFAULT_LOCALE) {
  const safeLocale = normalizeLocale(locale)
  return CATEGORY_KEYWORDS[safeLocale]?.[category] || CATEGORY_KEYWORDS[DEFAULT_LOCALE][category] || ''
}

function productKind(product, locale = DEFAULT_LOCALE) {
  const safeLocale = normalizeLocale(locale)
  const input = `${product?.name || ''} ${product?.category || ''}`
  const matched = PRODUCT_KIND_PATTERNS.find(({ match }) => match.test(input))
  if (matched) return matched[safeLocale] || matched.en
  return categoryKeyword(product?.category, safeLocale) || (safeLocale === UK_LOCALE ? 'мінімалістичний одяг' : 'minimal streetwear')
}

export function buildProductMetaDescription(product, locale = DEFAULT_LOCALE) {
  const safeLocale = normalizeLocale(locale)
  const name = cleanMetaText(product?.name)
  const kind = productKind(product, safeLocale)
  const material = materialLine(product?.material_care)
  const intro = safeLocale === UK_LOCALE
    ? `${name || 'Річ edm.clothes'} від edm.clothes: ${kind}.`
    : `${name || 'edm.clothes piece'} by edm.clothes: ${kind}.`

  return compactMetaDescription([
    intro,
    firstSentence(product?.description),
    firstSentence(product?.product_details),
    material ? (safeLocale === UK_LOCALE ? `Матеріал: ${material}.` : `Material: ${material}.`) : '',
    safeLocale === UK_LOCALE ? 'Зроблено в Україні.' : 'Made in Ukraine.',
  ])
}

export function buildProductImageAlt(product, locale = DEFAULT_LOCALE, options = {}) {
  const safeLocale = normalizeLocale(locale)
  const index = Number.isFinite(Number(options.index)) ? Number(options.index) : 0
  const name = cleanMetaText(product?.name) || (safeLocale === UK_LOCALE ? 'Річ edm.clothes' : 'edm.clothes product')
  const kind = productKind(product, safeLocale)
  const color = cleanMetaText(product?.color_name)
  const role = IMAGE_ROLES[safeLocale]?.[Math.min(index, IMAGE_ROLES[safeLocale].length - 1)] || IMAGE_ROLES[DEFAULT_LOCALE][0]
  const pieces = safeLocale === UK_LOCALE
    ? [name, color ? `колір ${color}` : '', kind, role, 'зроблено в Україні']
    : [name, color ? `${color} color` : '', kind, role, 'made in Ukraine']

  return compactMetaDescription(pieces, 140).replace(/[.]$/, '')
}

export function buildCollectionImageAlt(title, locale = DEFAULT_LOCALE) {
  const safeLocale = normalizeLocale(locale)
  const normalizedTitle = cleanMetaText(title)
  return COLLECTION_IMAGE_ALT[safeLocale]?.[normalizedTitle]
    || COLLECTION_IMAGE_ALT[DEFAULT_LOCALE][normalizedTitle]
    || (safeLocale === UK_LOCALE
      ? `Дивитися ${normalizedTitle || 'колекцію'} від edm.clothes`
      : `Shop ${normalizedTitle || 'the collection'} by edm.clothes`)
}

export function buildHomepageImageAlt(label, locale = DEFAULT_LOCALE, options = {}) {
  const safeLocale = normalizeLocale(locale)
  const text = cleanMetaText(label || options.fallback)
  if (text) {
    return safeLocale === UK_LOCALE
      ? `${text} від edm.clothes`
      : `${text} by edm.clothes`
  }
  return safeLocale === UK_LOCALE
    ? 'Образ edm.clothes, український streetwear'
    : 'edm.clothes outfit, Ukrainian streetwear'
}

export function buildItemImageAlt(item, locale = DEFAULT_LOCALE, options = {}) {
  const productLike = {
    name: item?.name || item?.product_name || item?.title,
    category: item?.category,
    color_name: item?.color_name,
  }
  return buildProductImageAlt(productLike, locale, options)
}

export function staticPageDescription(page, locale = DEFAULT_LOCALE) {
  const safeLocale = normalizeLocale(locale)
  const map = {
    [DEFAULT_LOCALE]: {
      home: 'Minimal Ukrainian streetwear: oversized hoodies, deconstructed denim, longsleeves and everyday essentials made in Ukraine.',
      about: 'The story of edm.clothes: Ukrainian streetwear, upcycled experiments, deconstructed denim and minimal garments made with intention.',
      contact: 'Contact edm.clothes for orders, sizing, shipping questions and support. Ukrainian streetwear, made in Ukraine and shipped worldwide.',
      faq: 'Answers about edm.clothes orders, sizing, shipping, returns and payments for Ukrainian streetwear and everyday essentials.',
      shipping: 'Shipping rates, delivery times and tracking for edm.clothes orders. Ukrainian streetwear shipped across Europe and worldwide.',
      returns: 'Return and exchange policy for edm.clothes: 14-day returns, size exchanges and support for orders shipped from Ukraine.',
      sizeGuide: 'Find your edm.clothes size for oversized hoodies, tops, denim, pants and shorts with our size chart and fit guidance.',
      products: 'Shop edm.clothes: Ukrainian streetwear, oversized hoodies, modular longsleeves, deconstructed denim and everyday essentials.',
      privacy: 'How edm.clothes collects, uses and protects personal data for orders, accounts, analytics and marketing consent.',
      terms: 'Terms for shopping at edm.clothes, including products, pricing, payments, shipping, returns and intellectual property.',
      imprint: 'Legal information and contact details for edm.clothes.',
    },
    [UK_LOCALE]: {
      home: 'Мінімалістичний український streetwear: оверсайз худі, лонгсліви, денім і базові речі, зроблені в Україні.',
      about: 'Історія edm.clothes: український streetwear, upcycling-експерименти, деконструйований денім і мінімалістичний одяг.',
      contact: 'Контакти edm.clothes для замовлень, розмірів, доставки та підтримки. Український streetwear, зроблений в Україні.',
      faq: 'Відповіді про замовлення edm.clothes, розміри, доставку, повернення та оплату українського streetwear.',
      shipping: 'Умови доставки, строки й відстеження замовлень edm.clothes. Український streetwear з доставкою по Європі та світу.',
      returns: 'Повернення та обмін edm.clothes: 14 днів на повернення, обмін розміру та підтримка замовлень.',
      sizeGuide: 'Підбери розмір edm.clothes для оверсайз худі, верху, деніму, штанів і шортів за розмірною сіткою.',
      products: 'Магазин edm.clothes: український streetwear, оверсайз худі, модульні лонгсліви, денім і базові речі.',
      privacy: 'Як edm.clothes збирає, використовує та захищає персональні дані для замовлень, акаунтів, аналітики й маркетингу.',
      terms: 'Умови покупки на edm.clothes: товари, ціни, оплата, доставка, повернення та інтелектуальна власність.',
      imprint: 'Юридична інформація та контакти edm.clothes.',
    },
  }

  return map[safeLocale]?.[page] || map[DEFAULT_LOCALE][page] || ''
}

export function staticPageTitle(page, locale = DEFAULT_LOCALE) {
  const safeLocale = normalizeLocale(locale)
  const map = {
    [DEFAULT_LOCALE]: {
      products: 'Shop Ukrainian Streetwear, Hoodies & Denim',
    },
    [UK_LOCALE]: {
      products: 'Магазин українського streetwear',
    },
  }
  return map[safeLocale]?.[page] || map[DEFAULT_LOCALE]?.[page] || ''
}
