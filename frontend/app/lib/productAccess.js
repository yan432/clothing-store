export const UNLISTED_ACCESS_TAG = 'access:unlisted'
export const EXCLUSIVE_TAG_PREFIX = 'exclusive:'

export function productTags(product) {
  return Array.isArray(product?.tags) ? product.tags.map(String) : []
}

export function isUnlistedProduct(product) {
  const tags = productTags(product)
  return tags.includes(UNLISTED_ACCESS_TAG) || tags.some((tag) => tag.startsWith(EXCLUSIVE_TAG_PREFIX))
}

export function exclusiveSlugForProduct(product) {
  const tag = productTags(product).find((value) => value.startsWith(EXCLUSIVE_TAG_PREFIX))
  return tag ? tag.slice(EXCLUSIVE_TAG_PREFIX.length) : ''
}

export function normalizeExclusiveSlug(value = '') {
  return String(value || '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9-]/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
}
