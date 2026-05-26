import { DEFAULT_LOCALE, UK_LOCALE, normalizeLocale, pathForLocale, stripLocale } from './i18n'

export const SITE_URL = 'https://www.edmclothes.net'

export function absoluteUrl(path = '/') {
  if (!path) return SITE_URL
  if (/^https?:\/\//.test(path)) return path
  const normalized = path.startsWith('/') ? path : `/${path}`
  return `${SITE_URL}${normalized === '/' ? '' : normalized}`
}

export function languageAlternates(path = '/') {
  const basePath = stripLocale(path)
  return {
    'en-US': pathForLocale(basePath, DEFAULT_LOCALE),
    'uk-UA': pathForLocale(basePath, UK_LOCALE),
    'x-default': pathForLocale(basePath, DEFAULT_LOCALE),
  }
}

export function absoluteLanguageAlternates(path = '/') {
  const alternates = languageAlternates(path)
  return Object.fromEntries(
    Object.entries(alternates).map(([locale, href]) => [locale, absoluteUrl(href)]),
  )
}

export function localizedAlternates(path = '/', locale = DEFAULT_LOCALE) {
  const basePath = stripLocale(path)
  return {
    canonical: pathForLocale(basePath, normalizeLocale(locale)),
    languages: languageAlternates(basePath),
  }
}

export function openGraphLocale(locale = DEFAULT_LOCALE) {
  return normalizeLocale(locale) === UK_LOCALE ? 'uk_UA' : 'en_US'
}
