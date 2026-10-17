import { ui, type Locale, type UiKey } from './ui'
import blogMapJson from './blogMap.json'
import taxonomyMapJson from './taxonomyMap.json'

// Alternates con contraparte ausente → null (nunca apuntar hreflang a un 404:
// Google invalida el par). x-default lo resuelve el layout hacia la URL existente.

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

// Slug público de un post desde el id del Content Layer.
// El loader glob no recorta `/index` como hacía el slug legacy:
// 'es/mi-post/index' -> 'mi-post'. Las URLs generadas no cambian.
export function blogEntrySlug(id: string): string {
  return id.replace(/^(es|en)\//, '').replace(/\/index$/, '')
}

export function getRelativeLocaleUrl(locale: Locale, path: string): string {
  const clean = path.startsWith('/') ? path : `/${path}`
  if (locale === 'es') return clean
  return `/en${clean}`
}

export interface AlternateUrls {
  es: string | null
  en: string | null
}

export function getAlternateUrls(currentPath: string): AlternateUrls {
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
  // Si añades nuevo post con translationKey, `pnpm build:main` regenera el mapa solo.
  // Taxonomías (tag/category) solo existen si el slug está en taxonomyMap.json del
  // idioma destino — sin contraparte no hay alternate (era un hreflang hacia 404).
  const blogMap: Record<string, string> = blogMapJson
  const taxonomyMap = taxonomyMapJson as Record<Locale, { tags: string[]; categories: string[] }>
  const hasTaxonomy = (locale: Locale, kind: 'tags' | 'categories', slug: string): boolean =>
    (taxonomyMap[locale]?.[kind] ?? []).includes(decodeURIComponent(slug).toLowerCase())
  // Tag/Category existen solo si ambos idiomas tienen el slug (mismo slug, no traducido).
  // Sin contraparte: sin alternate — un hreflang a 404 invalida el par entero.
  const tagCatRe = /^\/(en\/)?blog\/(tag|category)\/([^/]+)$/
  const tagCatMatch = normalized.match(tagCatRe)
  if (tagCatMatch) {
    const [, enPrefix, kind, slug] = tagCatMatch
    const list = kind === 'tag' ? 'tags' : 'categories'
    if (enPrefix) {
      const es = `/blog/${kind}/${slug}`
      return hasTaxonomy('es', list, slug) ? { es, en: normalized } : { es: null, en: normalized }
    }
    const en = `/en/blog/${kind}/${slug}`
    return hasTaxonomy('en', list, slug) ? { es: normalized, en } : { es: normalized, en: null }
  }
  if (normalized === '/blog/tags' || normalized === '/blog/categories') {
    const en = normalized.replace(/^\/blog\//, '/en/blog/')
    return { es: normalized, en }
  }
  if (normalized === '/en/blog/tags' || normalized === '/en/blog/categories') {
    const es = normalized.replace(/^\/en\/blog\//, '/blog/')
    return { es, en: normalized }
  }
  const isBlogEs = normalized.startsWith('/blog/')
  const isBlogEn = normalized.startsWith('/en/blog/')
  if (isBlogEn) {
    const slug = normalized.replace(/^\/en\/blog\/?/, '').split('/')[0]
    const esSlug = blogMap[slug]
    // Sin contrapartida traducida no hay alternate (el índice no es traducción del post)
    if (esSlug) return { es: `/blog/${esSlug}`, en: normalized }
    return { es: null, en: normalized }
  }
  if (isBlogEs) {
    const slug = normalized.replace(/^\/blog\/?/, '').split('/')[0]
    const enSlug = blogMap[slug]
    if (enSlug) return { es: normalized, en: `/en/blog/${enSlug}` }
    return { es: normalized, en: null }
  }
  // Resto (/, /about, /blog) — prefijo simple; trailingSlash:'never' -> /en not /en/
  const isEn = normalized === '/en' || normalized.startsWith('/en/')
  const withoutPrefix = isEn ? normalized.replace(/^\/en(?=\/|$)/, '') || '/' : normalized
  return {
    es: withoutPrefix,
    en: `/en${withoutPrefix === '/' ? '' : withoutPrefix}`,
  }
}
