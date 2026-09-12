// eslint.config.mjs — flat config (ESLint 9+/10)
// Base: eslint-plugin-astro recommended + typescript-eslint recommended.
// Ignora builds, dependencias y cachés de Astro.
import eslintPluginAstro from 'eslint-plugin-astro'
import tseslint from 'typescript-eslint'

export default [
  {
    ignores: [
      'dist/',
      'packages/*/dist/',
      '.astro/',
      'packages/*/.astro',
      'node_modules/',
      'packages/*/node_modules/',
    ],
  },
  ...tseslint.configs.recommended,
  ...eslintPluginAstro.configs.recommended,
  {
    rules: {
      // Cero `any` en el codebase: los JSON de datos se consumen vía src/types.ts.
      // En 'error' para que `pnpm lint` falle ante cualquier `any` nuevo.
      '@typescript-eslint/no-explicit-any': 'error',
    },
  },
]
