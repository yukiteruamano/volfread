import { defineConfig } from 'astro/config'
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
    },
  },
  integrations: [
    mdx({
      remarkPlugins: [remarkMath],
      rehypePlugins: [rehypeKatex],
    }),
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
    remarkPlugins: [remarkMath],
    rehypePlugins: [rehypeKatex],
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
      rollupOptions: {
        output: {
          manualChunks: {
            router: ['astro:transitions'],
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
