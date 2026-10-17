import { defineConfig } from 'astro/config'
import { unified } from '@astrojs/markdown-remark'
import mdx from '@astrojs/mdx'
import sitemap from '@astrojs/sitemap'
import tailwindcss from '@tailwindcss/vite'
import remarkMath from 'remark-math'
import rehypeKatex from 'rehype-katex'
import { resolve } from 'node:path'
import { getAlternateUrls } from './src/i18n/utils.ts'
import postDatesJson from './src/i18n/postDates.json'

const postDates = postDatesJson
// lastmod por post (updatedDate ?? pubDate) — clave 'es/<slug>' o 'en/<slug>'
function postLastmod(pathname) {
  const clean = pathname !== '/' && pathname.endsWith('/') ? pathname.slice(0, -1) : pathname
  const m = clean.match(/^\/(en\/)?blog\/([^/]+)$/)
  if (!m) return undefined
  return postDates[`${m[1] ? 'en' : 'es'}/${m[2]}`]
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
      // hreflang que el plugin no deduce (slugs traducidos, proyectos↔projects)
      // + lastmod por post. Sin contraparte válida se respeta el cálculo del plugin.
      serialize(item) {
        const pathname = new URL(item.url).pathname
        const { es, en } = getAlternateUrls(pathname)
        if (es && en) {
          const site = item.url.slice(0, item.url.length - pathname.length)
          item.links = [
            { url: new URL(es, site).toString(), lang: 'es' },
            { url: new URL(en, site).toString(), lang: 'en' },
          ]
        }
        const lastmod = postLastmod(pathname)
        if (lastmod) item.lastmod = lastmod
        return item
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
