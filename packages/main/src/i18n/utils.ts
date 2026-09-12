import { ui, type Locale, type UiKey } from './ui'
import blogMapJson from './blogMap.json'

export function useTranslations(locale: Locale) {
  return function t(key: UiKey, params?: Record<string, string>): string {
    let text: string = ui[locale]?.[key] ?? ui.es[key] ?? String(key)
    if (params) {
      for (const [k, v] of Object.entries(params)) text = text.replace(`{${k}}`, v)
    }
    return text
  }
}

export function getLocaleFromUrl(url: URL): Locale {
  const [, first] = url.pathname.split('/')
  if (first === 'en') return 'en'
  return 'es'
}

export function getRelativeLocaleUrl(locale: Locale, path: string): string {
  const clean = path.startsWith('/') ? path : `/${path}`
  if (locale === 'es') return clean
  return `/en${clean}`
}

export function getAlternateUrls(currentPath: string): { es: string; en: string } {
  // Normaliza trailing slash para trailingSlash:'never' (excepto raíz)
  const normalized =
    currentPath !== '/' && currentPath.endsWith('/') ? currentPath.slice(0, -1) : currentPath

  // Proyectos es monolingüe: /proyectos <-> /en/projects
  const isProyectosEs = normalized === '/proyectos' || normalized.startsWith('/proyectos/')
  const isProjectsEn = normalized === '/en/projects' || normalized.startsWith('/en/projects/')
  if (isProjectsEn) {
    const es = normalized.replace(/^\/en\/projects(?=\/|$)/, '/proyectos') || '/proyectos'
    return { es, en: normalized }
  }
  if (isProyectosEs) {
    const en = normalized.replace(/^\/proyectos(?=\/|$)/, '/en/projects')
    return { es: normalized, en }
  }
  // Blog 1:1 ES/EN — generado por scripts/generate-blog-map.mjs en src/i18n/blogMap.json
  // Si añades nuevo post con translationKey, ejecuta `node scripts/generate-blog-map.mjs` para regenerar
  const blogMap: Record<string, string> = blogMapJson
  // Tag/Category son taxonomías con mismo slug en ambos idiomas — mapeo directo sin blogMap
  const isBlogTagCatEn =
    normalized.startsWith('/en/blog/tag/') ||
    normalized.startsWith('/en/blog/category/') ||
    normalized === '/en/blog/tags' ||
    normalized === '/en/blog/categories'
  const isBlogTagCatEs =
    normalized.startsWith('/blog/tag/') ||
    normalized.startsWith('/blog/category/') ||
    normalized === '/blog/tags' ||
    normalized === '/blog/categories'
  if (isBlogTagCatEn) {
    const es = normalized.replace(/^\/en\/blog\//, '/blog/')
    return { es, en: normalized }
  }
  if (isBlogTagCatEs) {
    const en = normalized.replace(/^\/blog\//, '/en/blog/')
    return { es: normalized, en }
  }
  const isBlogEs = normalized.startsWith('/blog/')
  const isBlogEn = normalized.startsWith('/en/blog/')
  if (isBlogEn) {
    const slug = normalized.replace(/^\/en\/blog\/?/, '').split('/')[0]
    const esSlug = blogMap[slug]
    if (esSlug) return { es: `/blog/${esSlug}`, en: normalized }
    return { es: '/blog', en: normalized }
  }
  if (isBlogEs) {
    const slug = normalized.replace(/^\/blog\/?/, '').split('/')[0]
    const enSlug = blogMap[slug]
    if (enSlug) return { es: normalized, en: `/en/blog/${enSlug}` }
    return { es: normalized, en: '/en/blog' }
  }
  // Resto (/, /about, /blog) — prefijo simple; trailingSlash:'never' -> /en not /en/
  const isEn = normalized === '/en' || normalized.startsWith('/en/')
  const withoutPrefix = isEn ? normalized.replace(/^\/en(?=\/|$)/, '') || '/' : normalized
  return {
    es: withoutPrefix,
    en: `/en${withoutPrefix === '/' ? '' : withoutPrefix}`,
  }
}
