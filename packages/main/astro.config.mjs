import { defineConfig } from 'astro/config'
import { unified } from '@astrojs/markdown-remark'
import mdx from '@astrojs/mdx'
import sitemap from '@astrojs/sitemap'
import tailwindcss from '@tailwindcss/vite'
import remarkMath from 'remark-math'
import rehypeKatex from 'rehype-katex'
import { resolve } from 'node:path'

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
