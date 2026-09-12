# Changelog

Todos los cambios notables de este proyecto se documentan aquí. Formato basado en [Keep a Changelog](https://keepachangelog.com/es-ES/1.0.0/) y versionado [SemVer](https://semver.org/lang/es/).

## [Unreleased]

### Fixed

- Restaura apps web embebidas (`packages/eclipsescope`, `packages/simulador-blockchain`) en el build: fichas vuelven a enlazar a `/proyectos/<slug>/app/` interno, `copy-dist.mjs` fusiona `dist/proyectos/<slug>/app/`, SPA fallbacks en `_redirects` y `make build-real` desde fuentes vecinas

### Added

- Estructura monorepo pnpm workspaces (`packages/main`, `eclipsescope`, `simulador-blockchain`)
- Sitio Astro 5 estático con Tailwind 4 (tema oscuro negro #0A0A0A + naranja #FF6B00)
- i18n ES (default sin prefijo) + EN (`/en/`) con `prefixDefaultLocale: false`
- Blog MDX `src/content/blog/{es,en}` con RSS/sitemap por idioma
- Portafolio `/proyectos` — fichas web embebidas (`/proyectos/<slug>/`) + fichas lib/cli con stats LOC y sparkline 52 semanas
- Scripts `copy-dist.mjs` (fusión dist) y `collect-project-stats.mjs` (LOC + git log)
- Comentarios Giscus (GitHub Discussions) en posts
- Cloudflare Pages deploy (`dist`), `_headers`/`_redirects`, analytics beacon
- Docs: `AGENTS.md`, `SPECS.md`, `README.md`

### Removed

- Workflow GitHub de deploy a Pages (integración Git) — el deploy pasa a Wrangler CLI (`make deploy` / `make deploy-dry`)
- Campo `generatedAt` de `projects.stats.json` (nadie lo consumía; `build:stats` ahora es reproducible)

### Added

- ESLint flat (`eslint.config.mjs`: astro + typescript-eslint) con script `lint` en root y packages; `make ci` incluye `lint` y `format-check`
- `utils.ts` importa `blogMap.json` en vez de código inyectado — `pnpm build` ya no ensucia el árbol y `format:check` pasa en verde

## [0.1.0] - 2026-09-06

### Added

- Bootstrap inicial del repositorio (git, pnpm-workspace.yaml, configs base)

[Unreleased]: https://github.com/yukiteruamano/volfread.xyz/compare/v0.1.0...HEAD
[0.1.0]: https://github.com/yukiteruamano/volfread.xyz/releases/tag/v0.1.0
