import { defineConfig } from 'astro/config'
import { unified } from '@astrojs/markdown-remark'
import mdx from '@astrojs/mdx'
import sitemap from '@astrojs/sitemap'
import tailwindcss from '@tailwindcss/vite'
import remarkMath from 'remark-math'
import rehypeKatex from 'rehype-katex'
import { resolve } from 'node:path'
import blogMap from './src/i18n/blogMap.json' with { type: 'json' }

// Alternos reales ES<->EN para el sitemap. El plugin @astrojs/sitemap solo
// enlaza URLs que difieren UNICAMENTE en el prefijo de idioma, pero este sitio
// traduce slugs (/blog/apparmor-introduccion <-> /en/blog/apparmor-introduction)
// y el segmento base (/proyectos/x <-> /en/projects/x), asi que sin esto la
// mayoria de URLs salen sin xhtml:link hreflang. Misma fuente que
// src/i18n/utils.ts#getAlternateUrls + translationKey (via blogMap.json).
function sitemapAlternates(pathname) {
  const isEn = pathname === '/en' || pathname.startsWith('/en/')
  // Fichas e indice de proyectos: mismo slug en ambos idiomas
  if (pathname === '/proyectos' || pathname.startsWith('/proyectos/')) {
    const en = pathname.replace(/^\/proyectos(?=\/|$)/, '/en/projects')
    return { es: pathname, en }
  }
  if (pathname === '/en/projects' || pathname.startsWith('/en/projects/')) {
    const es = pathname.replace(/^\/en\/projects(?=\/|$)/, '/proyectos')
    return { es, en: pathname }
  }
  // Posts del blog: slugs traducidos via blogMap (bidireccional). Se excluyen
  // indices y taxonomias, que conserva el comportamiento por defecto.
  const blogEs = pathname.match(/^\/blog\/([^/]+)$/)
  if (blogEs && !['tags', 'categories', 'tag', 'category'].includes(blogEs[1])) {
    const enSlug = blogMap[blogEs[1]]
    if (enSlug && !isEn) return { es: pathname, en: `/en/blog/${enSlug}` }
  }
  const blogEn = pathname.match(/^\/en\/blog\/([^/]+)$/)
  if (blogEn && !['tags', 'categories', 'tag', 'category'].includes(blogEn[1])) {
    const esSlug = blogMap[blogEn[1]]
    if (esSlug && isEn) return { es: `/blog/${esSlug}`, en: pathname }
  }
  return null
}

// https://astro.build/config
export default defineConfig({
  site: 'https://volfread.xyz',
  output: 'static',
  i18n: {
    defaultLocale: 'es',
    locales: ['es', 'en'],
    routing: {
      prefixDefaultLocale: false,
      // Explícito: en v6 el defecto cambió a true y rompería `/` servido en ES
      redirectToDefaultLocale: false,
    },
  },
  integrations: [
    // remark/rehype (math/KaTeX) viven en markdown.processor (unified);
    // MDX los hereda automáticamente desde Astro 7
    mdx(),
    sitemap({
      i18n: {
        defaultLocale: 'es',
        locales: {
          es: 'es',
          en: 'en',
        },
      },
      serialize(item) {
        let parsed
        try {
          parsed = new URL(item.url)
        } catch {
          return item
        }
        const alternates = sitemapAlternates(parsed.pathname)
        if (!alternates) return item
        return {
          ...item,
          links: [
            { url: `${parsed.origin}${alternates.es}`, lang: 'es' },
            { url: `${parsed.origin}${alternates.en}`, lang: 'en' },
          ],
        }
      },
    }),
  ],
  markdown: {
    // Astro 7 usa Sätteri por defecto; unified() conserva remark/rehype (math/KaTeX).
    // Los plugins van dentro de unified({...}), no como claves sueltas (deprecado en v7).
    processor: unified({ remarkPlugins: [remarkMath], rehypePlugins: [rehypeKatex] }),
  },
  prefetch: { prefetchAll: false, defaultStrategy: 'viewport' },
  compressHTML: true,
  trailingSlash: 'never',
  build: {
    inlineStylesheets: 'always',
  },
  image: {
    domains: ['images.unsplash.com', 'github.com'],
    remotePatterns: [{ protocol: 'https' }],
  },
  vite: {
    plugins: [tailwindcss()],
    build: {
      sourcemap: false,
      cssCodeSplit: true,
      minify: 'esbuild',
      cssMinify: 'lightningcss',
      chunkSizeWarningLimit: 500,
      // rolldown (Vite 8) exige manualChunks como función, no como objeto
      rollupOptions: {
        output: {
          manualChunks: (id) => {
            if (id.includes('astro:transitions')) return 'router'
          },
        },
      },
    },
    server: {
      fs: {
        // allow serving from monorepo root if toolbar needs it
        allow: [resolve('../..')],
      },
    },
  },
})
