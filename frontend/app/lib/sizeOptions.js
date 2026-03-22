export const SIZE_TAG_PREFIX = 'size:'

export const SIZE_PRESET_OPTIONS = [
  'XXS',
  'XS',
  'S',
  'M',
  'L',
  'XL',
  'XXL',
  'One Size',
]

function normalizeSizeValue(value) {
  return String(value || '').trim().replace(/\s+/g, ' ')
}

export function parseSizeOptionsFromTags(tags) {
  const list = Array.isArray(tags) ? tags : []
  const unique = new Set()
  const options = []
  for (const tag of list) {
    const text = String(tag || '')
    if (!text.startsWith(SIZE_TAG_PREFIX)) continue
    const normalized = normalizeSizeValue(text.slice(SIZE_TAG_PREFIX.length))
    if (!normalized || unique.has(normalized)) continue
    unique.add(normalized)
    options.push(normalized)
  }
  return options
}

export function buildSizeTags(selectedPresetSizes = [], customSizesText = '') {
  const unique = new Set()
  const all = []

  for (const size of selectedPresetSizes) {
    const normalized = normalizeSizeValue(size)
    if (!normalized || unique.has(normalized)) continue
    unique.add(normalized)
    all.push(normalized)
  }

  const customSizes = String(customSizesText || '')
    .split(',')
    .map((part) => normalizeSizeValue(part))
    .filter(Boolean)

  for (const size of customSizes) {
    if (unique.has(size)) continue
    unique.add(size)
    all.push(size)
  }

  return all.map((size) => `${SIZE_TAG_PREFIX}${size}`)
}
