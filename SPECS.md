# SPECS.md — volfread.xyz

## 1. Visión

Sitio personal de **volfread** (`volfread.xyz`) que unifica: portafolio de proyectos heterogéneos, blog multi-idioma y webs estáticas embebidas bajo el mismo dominio y deploy. Objetivo: marca personal coherente, SEO técnico impecable, performance >95 y mantenimiento mínimo (estático, sin backend).

- **Dominio:** `volfread.xyz` + `www.volfread.xyz` (Cloudflare zona ya existente)
- **Público:** ES (primario) + EN, desarrolladores, reclutadores, usuarios de los proyectos.
- **Principios:** estático por defecto, pnpm workspaces, dark theme negro/naranja, cero trackers invasivos.

## 2. Objetivos y alcance

### 2.1 Dentro de alcance (v1)

- Landing `/` (ES) + `/en/` con hero, proyectos destacados, últimos posts, about breve.
- Listado `/proyectos` (ES) + `/en/projects` (EN) + detalle `/proyectos/<slug>` / `/en/projects/<slug>` por cada proyecto (8).
- Embebido web estático: `EclipseScope` (React+Vite) en `/proyectos/eclipsescope/app/`, `Simulador Blockchain` (Angular 19) en `/proyectos/simulador-blockchain/app/`.
- Fichas no-web (6): `fast-levenshtein`, `gache`, `koma`, `mangodex`, `pkgcheck`, `simple-markdown-crawler` — con stats LOC, breakdown lenguajes, commit activity sparkline, repo links.
- Blog MDX multi-idioma: `/blog/<slug>` (ES) y `/en/blog/<slug>` (EN), paginación, tags, RSS por idioma, sitemap i18n.
- Comentarios: Giscus (GitHub Discussions) en posts.
- Analytics: Cloudflare Web Analytics beacon.
- Deploy Cloudflare Pages, `_headers`, `_redirects`, dominio + SSL.

### 2.2 Fuera de alcance v1 (roadmap)

- SSR / autenticación / newsletter backend → requiere `@astrojs/cloudflare` + Workers.
- Buscador full-text (Pagefind) → v1.1 si se pide.
- Toggle claro/oscuro → dark fijo en v1.
- CMS headless → MDX en repo es suficiente.

## 3. Requisitos funcionales

| ID | Requisito | Criterio aceptación |
|----|-----------|---------------------|
| RF01 | Home ES/EN | `/` renderiza ES, `/en/` EN; `LanguageSwitcher` persiste preferencia; `hreflang` presentes. |
| RF02 | Portafolio listado | `/proyectos` lista 8 proyectos, filtro por `type: web/lib/cli` y `lang`; cards con cover, badges `Go/Python/React/Angular`, stats resumidos. |
| RF03 | Detalle proyecto web | `/proyectos/eclipsescope` y `/proyectos/simulador-blockchain` muestran ficha + CTA `Abrir app → /proyectos/<slug>/` (SPA fusionada). `dist/proyectos/<slug>/index.html` existe tras `pnpm build`. SPA router fallback vía `_redirects` si aplica. |
| RF04 | Ficha proyecto no-web | `/proyectos/<slug>` (ej: `koma`) muestra: descripción, `repo` link, `install` snippet (`go get`/`pip install`), LOC + donut/bar lenguajes, sparkline 52 semanas, badges licencia/stars si disponible. Datos vía `projects.stats.json` generado en build. |
| RF05 | Blog ES/EN | Collections `blog` con `lang`. `getStaticPaths` genera rutas por idioma. `draft: true` oculto en prod. Paginación `blog/`, `blog/tag/[tag]`. |
| RF06 | SEO blog | `<html lang>`, `canonical`, `hreflang` alternates, OG tags, sitemap i18n (`/sitemap-index.xml`), RSS `/rss.xml` (ES) y `/en/rss.xml`. |
| RF07 | Comentarios | Giscus island `client:visible` en post, `lang` dinámico `es/en`, repo Discussions configurado. No carga en listado. |
| RF08 | Navegación | Header con `Inicio, Proyectos, Blog, About` + `EN/ES` switch; Footer con links sociales + `©`. |

## 4. Requisitos no funcionales — Best Practices (Lighthouse)

### 4.1 Seguridad (crítico) — detalle RNF04

Ver `AGENTS.md §10.1` (fuente única operativa). Resumen:

- **HTTPS:** sin mixed content; evitar `//` protocol-relative; `Strict-Transport-Security: max-age=31536000; includeSubDomains` (sin `preload`, sin mixed `http://` en prod).
- **CSP enforcement (vía `_headers` `/*`):** `default-src 'self'; script-src 'self' https://giscus.app https://static.cloudflareinsights.com; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; connect-src 'self' https://giscus.app; frame-src https://giscus.app; object-src 'none'; base-uri 'self'; form-action 'self'; frame-ancestors 'self'` — `report-only` no se usa (estático). Giscus inline externalizado a `public/scripts/giscus-loader.js` para no requerir `unsafe-inline` en `script-src`.
- **SRI:** `https://giscus.app/client.js` con `integrity="sha384-…"` + `crossorigin="anonymous"` (rotar hash al actualizar, ver `Giscus.astro`); igual para beacon si se activa.
- **Headers:** `X-Frame-Options: SAMEORIGIN` (legacy junto a CSP `frame-ancestors`), `X-Content-Type-Options: nosniff`, `Referrer-Policy: strict-origin-when-cross-origin`, `Permissions-Policy: camera=(), microphone=(), geolocation=(), fullscreen=(self), payment=(), usb=(), interest-cohort=()`, `Cross-Origin-Opener-Policy: same-origin`, `X-XSS-Protection: 0`.
- **Vuln libs:** `pnpm audit --audit-level moderate` + `pnpm update`; evitar `_.merge`/`$.extend(true)` con input no confiable (prototype pollution); usar `Object.create(null)`/`structuredClone`.
- **Sanitización:** `textContent` > `innerHTML`; si HTML, `DOMPurify.sanitize`; no `eval`/`Function`/`setTimeout(string)`/`document.write`.
- **Cookies:** sin tracking; si `Set-Cookie` → `Secure; HttpOnly; SameSite=Strict`.
- **Source maps:** `build.sourcemap: false` en los 3 configs (no exponer `sourcesContent`).
- **Compat/Calidad:** `<!DOCTYPE html>` uppercase, `charset` primero, `viewport` sin `user-scalable=no`, no APIs deprecadas, `passive:true` listeners.

## 4. Requisitos no funcionales

| ID | Requisito | Target |
|----|-----------|--------|
| RNF01 | Performance | Lighthouse Perf >95, LCP <2.5s (dist estático CF). |
| RNF02 | Accesibilidad | WCAG 2.2 AA, `axe-core` 0 violaciones. |
| RNF03 | SEO | Indexable, `hreflang` válido, sitemap/rutas sin duplicados. |
| RNF04 | Seguridad | **Headers `/*` (ver `AGENTS.md §10.1`):** `Strict-Transport-Security: max-age=31536000; includeSubDomains` (sin `preload`), `Content-Security-Policy` enforcement `default-src 'self'; script-src 'self' https://giscus.app https://static.cloudflareinsights.com; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; connect-src 'self' https://giscus.app; frame-src https://giscus.app; object-src 'none'; base-uri 'self'; form-action 'self'; frame-ancestors 'self'` , `X-Frame-Options: SAMEORIGIN` + `frame-ancestors`, `X-Content-Type-Options: nosniff`, `Referrer-Policy: strict-origin-when-cross-origin`, `Permissions-Policy: camera=(), microphone=(), geolocation=(), fullscreen=(self), payment=(), usb=(), interest-cohort=()`, `Cross-Origin-Opener-Policy: same-origin`, `X-XSS-Protection: 0`. SRI pin `giscus.app/client.js`; `sourcemap: false`; sin mixed content; `pnpm audit`. Ver `SPECS.md §4.1` detalle. |
| RNF05 | i18n | `prefixDefaultLocale: false`, URLs canónicas correctas, no redirecciones fantasma. |
| RNF06 | Mantenibilidad | Monorepo pnpm, un lockfile, CI `pnpm build` determinista. |
| RNF07 | Privacidad | Sin cookies tracking; analytics CF beacon (sin banner). Giscus requiere auth GitHub opt-in. |

## 5. Arquitectura

### 5.1 Monorepo pnpm

```
root (private) ── pnpm-workspace.yaml (packages/*, catalog)
├── packages/main (Astro 5, output: static)
├── packages/eclipsescope (Vite React, base /proyectos/eclipsescope/app/)
├── packages/simulador-blockchain (Angular, baseHref /proyectos/simulador-blockchain/app/)
├── scripts/copy-dist.mjs (fusiona dist/)
└── scripts/collect-project-stats.mjs (tokei/git log → projects.stats.json)
```

Build: `pnpm build:main` + `pnpm build:web` → `copy-dist` copia cada web `dist` a `dist/proyectos/<slug>/app/` (ficha queda en `/proyectos/<slug>/`). Deploy único `dist`.

### 5.2 Decisions (ADR)

- **Static sin adapter v1:** Más rápido, sin `_worker.js`. Migración a `@astrojs/cloudflare` + `wrangler.toml` solo si SSR.
- **Tailwind 4 vía `@tailwindcss/vite`:** Soporte Astro oficial, tokens CSS `--color-volf-*`.
- **Giscus sobre Disqus:** Privacidad, gratis, sin ads. Disqus documentado como alternativa.
- **Stats en build-time:** Evita runtime API calls y rate limits; `git log` local > GitHub API fallback.

### 5.3 Routing

| URL | Origen | Idioma |
|-----|--------|--------|
| `/` | `src/pages/index.astro` | es |
| `/about` | `src/pages/about.astro` | es |
| `/proyectos` | `src/pages/proyectos/index.astro` | es |
| `/proyectos/<slug>` | `src/pages/proyectos/[slug].astro` (ficha) | es |
| `/proyectos/eclipsescope/*` | `packages/main/dist` (ficha) | — |
| `/proyectos/eclipsescope/app/*` | `packages/eclipsescope/dist` fusionado | — |
| `/proyectos/simulador-blockchain/*` | `packages/main/dist` (ficha) | — |
| `/proyectos/simulador-blockchain/app/*` | `packages/simulador-blockchain/dist` | — |
| `/blog`, `/blog/<slug>`, `/blog/tag/<tag>` | `src/pages/blog/...` | es |
| `/en/`, `/en/about`, `/en/projects`, `/en/projects/<slug>`, `/en/blog/*` | `src/pages/en/...` | en |
| `/rss.xml`, `/en/rss.xml`, `/sitemap*.xml` | `@astrojs/rss/sitemap` | — |

## 6. Modelo de contenido

### 6.1 Blog Collection (`src/content/config.ts`)

```ts
blog: defineCollection({
  schema: z.object({
    title: z.string(), description: z.string(),
    pubDate: z.date(), updatedDate: z.date().optional(),
    lang: z.enum(['es','en']),
    tags: z.array(z.string()).default([]),
    draft: z.boolean().default(false),
    cover: z.string().optional(),
    author: z.string().default('volfread'),
  })
})
```

Path: `src/content/blog/es/*.mdx` + `en/*.mdx`. `getStaticPaths` filtra `lang`.

### 6.2 Proyectos (`src/data/proyectos.json`)

```json
{
  "slug": "koma",
  "title": "Koma コマ",
  "description": "CLI/TUI manga downloader (fork mangal)",
  "longDescription": "Más extensa para ficha...",
  "type": "cli",           // web | lib | cli
  "lang": "Go",
  "repo": "https://github.com/yukiteruamano/koma",
  "pkg": "go install github.com/yukiteruamano/koma@latest",
  "featured": true,
  "stack": ["Go", "Bubbletea", "Cobra"],
  "cover": "/covers/koma.png"
}
```

`projects.stats.json` (generado) añade `loc, languages: {Go: 82, ...}, commits: [3,0,12,...52], lastCommit`.

### 6.3 i18n (`src/i18n/ui.ts`)

Diccionario `ui[es][key]` / `ui[en][key]` + helpers `useTranslations(locale)`, `getRelativeLocaleUrl`.

## 7. Diseño — tema oscuro volfread

Tokens (`src/styles/theme.css`):

```css
--color-volf-bg: #0A0A0A;
--color-volf-surface: #141414;
--color-volf-border: #262626;
--color-volf-orange: #FF6B00;
--color-volf-orange-soft: #FF8533;
--color-volf-amber: #FFB84D;
--color-volf-text: #F5F5F5;
--color-volf-muted: #A3A3A3;
```

Componentes: `Header` (nav + switch), `Footer`, `ProjectCard` (cover 16:9, badges, sparkline mini), `CommitActivity` (SVG sparkline 52 barras naranja), `Giscus`, `LanguageSwitcher`, `Tag`.

Tipografía: sans `Inter/Geist`, mono `JetBrains Mono`. Accent: naranja para CTA, links hover, focus ring.

## 8. Infra y Deploy

- **Cloudflare Pages:** Repo GitHub → Build `pnpm install && pnpm build` → Output `dist`. Vars: `NODE_VERSION=20`, `PNPM_VERSION=11`.
- **Workers alternative:** `wrangler.toml` con `assets.directory = "./dist"`, `not_found_handling = "single-page-application"`.
- **Dominio:** Pages → Custom domain `volfread.xyz` + `www` → SSL auto.
- **Archivos:** `public/_headers` (cache + security), `public/_redirects` (SPA fallback `/proyectos/<slug>/app/* /proyectos/<slug>/app/index.html 200` si SPA con router).
- **Analytics:** CF Dashboard → Web Analytics → `volfread.xyz` → beacon auto-inyectado o manual en `BaseLayout`.
- **Preview:** `make build && make preview` (sirve `dist` fusionado con `app/`) o `pnpm build && pnpm --filter main preview`. Dev (`pnpm dev`) solo sirve fichas; apps requieren `dist`.

## 9. Calidad y testing

- `pnpm --filter main astro check` (typecheck).
- Lint: `oxlint`/`eslint`/`prettier` por package.
- A11y: `axe-core` (script opcional).
- Lighthouse CI manual en `preview`.
- No tests unit obligatorios en v1 (blog estático); webs embebidas mantienen sus propios tests.

## 10. Roadmap

| Fase | Entregable | Estado |
|------|------------|--------|
| F0 | Bootstrap monorepo + AGENTS/SPECS/CHANGELOG | v1 |
| F1 | Shell + portafolio + dark theme + copy-dist | v1 |
| F2 | Blog MDX ES/EN + RSS/sitemap + Giscus | v1 |
| F3 | Stats LOC/sparkline + polish fotos/OG | v1 |
| F4 | Deploy CF Pages + dominio + analytics | v1 |
| F5 | Pagefind search, OG imágenes dinámicas | v1.1 |
| F6 | SSR/worker si newsletter/form | v2 |

## 11. Riesgos

- Angular `baseHref` debe coincidir con `/proyectos/simulador-blockchain/app/` o assets 404.
- `ASSETS` es binding reservado CF — no usar.
- Giscus requiere repo público + Discussions enabled antes de activar comentarios.
- `git log` stats dependen de repos vecinos disponibles en build CI → fallback GitHub API con cache.

## 12. Referencias

- Astro 5 i18n, MDX, sitemap, rss — `/withastro/docs`
- pnpm workspaces — `/websites/pnpm_io`
- Cloudflare Pages/Workers static assets — `/cloudflare/cloudflare-docs`
