# Changelog

Todos los cambios notables de este proyecto se documentan aquí. Formato basado en [Keep a Changelog](https://keepachangelog.com/es-ES/1.0.0/) y versionado [SemVer](https://semver.org/lang/es/).

## [Unreleased]

### Changed

- Portafolio: 38 fichas (+18 contribuciones/forks: `geo-seo-claude`, `dappwarrior`, `weatherai`, `openbsd-src`, `openbsd-ports`, `freebsd-src`, `freebsd-ports`, `mpv`, `obs-backgroundremoval`, `crawl4ai`, `awesome`, `void-packages`, `spacemacs`, `apheleia`, `trezord-go`, `lazygit`, `wireguard-install`, `docker-rocm-xtra`); `collect-project-stats.mjs` cubre los nuevos (fallback GitHub API sin checkout local)

- Migración Astro 5 → 7 (guías v6+v7, registry verificado): catalog `astro ^7.3.5`, `@astrojs/markdown-remark ^7.3.1` con `markdown.processor: unified()` (Sätteri es el defecto en v7; conserva remark-math/rehype-katex), colecciones a Content Layer API (`glob` loader + `z` de `astro/zod`; `post.slug`→ helper `blogEntrySlug(post.id)`, `post.render()`→`render(post)`), `redirectToDefaultLocale: false` explícito, `compressHTML: true` conservado; Node unificado en 22 (`engines >=22.12.0`, `.nvmrc`, `NODE_VERSION=22` en Pages). URLs generadas idénticas, CSP estable
- Auditoría `make audit` en verde: bumps mismo-major (`wrangler ^4.146`, `eslint ^10.11`, set lint al latest) + `overrides` quirúrgicos en `pnpm-workspace.yaml` (`brace-expansion ≥5.0.12`, `devalue ≥5.9.3`, `fast-uri ≥3.1.8`) para transitivas sin fix upstream; retirar overrides cuando los padres las traigan

### Fixed

- Restaura apps web embebidas (`packages/eclipsescope`, `packages/simulador-blockchain`) en el build: fichas vuelven a enlazar a `/proyectos/<slug>/app/` interno, `copy-dist.mjs` fusiona `dist/proyectos/<slug>/app/`, SPA fallbacks en `_redirects` y `make build-real` desde fuentes vecinas
- Elimina los 37 `no-explicit-any` con tipos reales (`src/types.ts`: `Project`, `ProjectStats`); la regla queda en `error` para que `pnpm lint` falle ante cualquier `any` nuevo
- Simulador Blockchain compatible con CSP estricta: fuera `<meta CSP>` y JS inline (tema a `assets/theme-init.js`), `optimization.fonts: false` + `inlineCritical: false`; `style-src` suma `https://fonts.googleapis.com`
- Stats de los 12 proyectos sin checkout local (`harden-yml`, `kernel-hardening-checker`, `picom`, `apparmor.d`, `doomemacs`, `knots-banlist`, `bearer`, `appjail`, `openriot`, `cc-skills-golang`, `manga-tui`, `horusec`): dejan de mostrar 0 líneas — `collect-project-stats.mjs` gana fallback GitHub API (repos derivados de `proyectos.json`, estimación bytes/45 + commits 52 semanas, `GH_TOKEN` opcional) y `extMap` ampliado a Ansible/C/Emacs Lisp/Shell/Rust; `make build-stats` ya no los pone a cero

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
