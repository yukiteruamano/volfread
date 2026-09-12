# AGENTS.md — Guía para IAs y contribuidores

Este archivo es la **única fuente de verdad operativa** para agentes IA. Léelo antes de tocar cualquier cosa.

## 1. Proyecto

- **Dominio:** `volfread.xyz` (Cloudflare, zona ya creada)
- **Objetivo 1:** Web personal + portafolio. Proyectos web estáticos embebidos en `volfread.xyz/proyectos/<slug>/` dentro del mismo deploy.
- **Objetivo 2:** Blog multi-idioma ES (default sin prefijo) + EN (`/en/`) en MDX.
- **Stack:** Astro 5.x `output: static` + Tailwind 4 + TypeScript strict + pnpm workspaces + Cloudflare Pages (migrar a Workers Static Assets si se necesita SSR).
- **Tema:** Dark fijo — negro `#0A0A0A` + naranja `#FF6B00` (`--color-volf-*` en `src/styles/theme.css`).

## 2. Estructura monorepo

```
volfread.xyz/ (root private, pnpm-workspace.yaml: packages/*)
├── package.json          # scripts orquestadores (ver §4)
├── pnpm-workspace.yaml   # catalog + workspaces
├── AGENTS.md / SPECS.md / CHANGELOG.md / README.md
├── tsconfig.json / .editorconfig / .prettierrc / .gitignore
├── scripts/
│   ├── copy-dist.mjs               # fusiona dist/ (main + webs)
│   ├── generate-csp.mjs            # hashes CSP para scripts inline (ClientRouter + JSON-LD)
│   └── collect-project-stats.mjs   # LOC + git log → projects.stats.json
└── packages/
    ├── main/                       # Astro — el sitio
    │   ├── astro.config.mjs (i18n, mdx, sitemap, rss, site: https://volfread.xyz)
    │   ├── src/
    │   │   ├── components/{Header,Footer,ProjectCard,CommitActivity,Giscus,LanguageSwitcher}.astro
    │   │   ├── layouts/{BaseLayout,BlogLayout}.astro
    │       │   ├── pages/{index,about,proyectos/[slug],blog/[...slug],en/{projects/[slug],blog/[...slug]}}.astro
    │   │   ├── content/{blog/{es,en}/*.mdx, config.ts}
    │   │   ├── data/{proyectos.json, projects.stats.json}
    │   │   ├── i18n/{ui.ts, utils.ts}
    │   │   └── styles/{global.css, theme.css}
    │   └── public/{favicon.svg, _headers, _redirects}
    ├── eclipsescope/               # Vite+React — base /proyectos/eclipsescope/app/
    ├── simulador-blockchain/       # Angular 19 — baseHref /proyectos/simulador-blockchain/app/
    └── _template-static/           # plantilla futuros webs
```

No duplicar `pnpm-lock.yaml` por package. Un solo lock en root. No usar `npm`/`yarn` nunca. No nombrar bindings `ASSETS` (reservado CF).

## 3. Proyectos

| slug                      | tipo    | fuente                                                       | build                                                       |
| ------------------------- | ------- | ------------------------------------------------------------ | ----------------------------------------------------------- |
| `eclipsescope`            | web     | `file:../../EclipseCalculator` (repo `EclipseScope`) o copia | `vite build` con `base: '/proyectos/eclipsescope/app/'`     |
| `simulador-blockchain`    | web     | `file:../../yukiteruamano.github.io`                         | `ng build --base-href /proyectos/simulador-blockchain/app/` |
| `fast-levenshtein`        | lib     | Go                                                           | ficha + stats (no embebido)                                 |
| `gache`                   | lib     | Go                                                           | ficha                                                       |
| `koma`                    | cli/tui | Go                                                           | ficha                                                       |
| `mangodex`                | lib     | Go                                                           | ficha                                                       |
| `pkgcheck`                | cli     | Python                                                       | ficha                                                       |
| `simple-markdown-crawler` | cli     | Python                                                       | ficha                                                       |

Fichas no-web: `src/data/proyectos.json` (metadata) + `projects.stats.json` (generado: LOC, languages, commit histogram 52 semanas via `git log` local o GitHub API fallback).

## 4. Comandos

```bash
pnpm install                    # root — instala todo
pnpm dev                        # main → http://localhost:4321
pnpm dev:eclipse                # eclipsescope → http://localhost:5173
pnpm build                      # main + webs + merge dist/ (make build usa real si EC_SOURCE/SB_SOURCE existen)
pnpm build:main                 # solo Astro
pnpm build:web                  # solo webs (placeholder)
pnpm build:csp                  # hashes CSP para scripts inline (ClientRouter + JSON-LD)
pnpm lint                       # eslint . (flat: astro + ts — 0 errores; no-explicit-any en warn)
pnpm format:check               # prettier --check (verde tras build: generadores conformes)
make build-real                 # build real eclipsescope+simulador desde EC_SOURCE/SB_SOURCE con --base /app/ (explícito)
make build                      # auto real si vecinos existen, fallback placeholder en CI
```

pnpm build:stats # regenera projects.stats.json
pnpm --filter main astro check # typecheck Astro
pnpm build && pnpm --filter main preview # o make build && make preview (recomendado: preview sirve dist fusionado con apps en /app/ — dev solo sirve fichas)

```

Dev con múltiples Astro: si la toolbar falla, añadir `vite.server.fs.allow: [path.resolve('../..')]` en `astro.config.mjs`.

## 5. Añadir un nuevo proyecto web

1. Crear `packages/<slug>/` con su stack, `package.json` name `<slug>`, `vite.config` `base: '/proyectos/<slug>/app/'` (o `baseHref` Angular con `/app/`).
2. Añadir a `scripts/copy-dist.mjs` en `WEB_PACKAGES = ['eclipsescope', 'simulador-blockchain', '<slug>']` — copia a `dist/proyectos/<slug>/app/`.
3. Añadir entrada en `packages/main/src/data/proyectos.json` con `type: 'web'`.
4. `pnpm install` en root, `pnpm --filter <slug> build`, `pnpm build` y verificar `dist/proyectos/<slug>/app/index.html`.
5. No olvidar `_redirects` SPA fallback si el web es SPA con router: ` /proyectos/<slug>/app/*  /proyectos/<slug>/app/index.html  200`.
6. CSP estricta: la app debe buildear **sin `<script>` inline, sin handlers `on*=` y sin `<meta http-equiv="Content-Security-Policy">` (los headers mandan). Verificar con `grep` en su `dist/index.html`. En Angular: `optimization.fonts: false` + `styles.inlineCritical: false`, y JS inicial en fichero externo (ej. `assets/theme-init.js`). Desactivar Rocket Loader en `/proyectos/*/app/*` (dashboard Cloudflare) — rompe SPAs.

Añadir proyecto no-web (ficha): solo paso 3 con `type: 'lib'|'cli'` + `repo`, `lang`, y regenerar stats `pnpm build:stats`.

## 6. i18n

- `astro.config.mjs` i18n: `defaultLocale: 'es'`, `locales: ['es','en']`, `routing.prefixDefaultLocale: false`.
- ES: `src/pages/index.astro`, `src/pages/blog/[...slug].astro`, `src/pages/proyectos/{index,[slug]}.astro`, `src/content/blog/es/*.mdx`
- EN: `src/pages/en/index.astro`, `src/pages/en/projects/{index,[slug]}.astro` (¡no `en/proyectos`! `proyectos` ES ↔ `projects` EN monolingüe), `src/pages/en/blog/[...slug].astro`, `src/content/blog/en/*.mdx`
- Helpers: `src/i18n/utils.ts` (`getAlternateUrls` con mapeo `proyectos ↔ projects` + fallback blog `hola-mundo↔hello-world` → índice), `src/components/LanguageSwitcher.astro` mismo mapeo, diccionario `src/i18n/ui.ts`.
- Siempre añadir `hreflang` alternates y `canonical` en `BaseLayout.astro`. URLs EN son `/en/projects`, no `/en/proyectos` (301 redirect legacy en `_redirects`).

## 7. Blog

- Collections en `src/content/config.ts` (`blog` con `title, description, pubDate, lang, tags, draft, cover`).
- Drafts: `draft: true` se filtran en build `import.meta.env.PROD`.
- Páginas: `getStaticPaths` filtra por `lang`. RSS por idioma (`@astrojs/rss`).
- Comentarios: `src/components/Giscus.astro` island `client:visible` solo en `blog/[...slug].astro`. Requiere repo público con Discussions enabled. Attr `data-lang` dinámico `es/en`. Alternativa `CommentsDisqus.astro` documentada pero no usada.

## 8. Estilos

- Tailwind 4 vía `@tailwindcss/vite` en `astro.config.mjs`. Tokens en `src/styles/theme.css` (`--color-volf-*`).
- No introducir otro framework CSS. Usar utilidades Tailwind + `cn()` si necesario.
- Imágenes: `astro:assets` (`<Image>` optimizada).

## 9. Deploy

- **Cloudflare Pages vía Wrangler CLI** (sin integración Git): `make deploy` (build + `wrangler pages deploy dist --project-name volfread-xyz`) o `make deploy-dry` para dry-run. Requiere `wrangler login` una vez (`make cf-login`). Node 20, `PNPM_VERSION` 11.
- La integración Git de Pages está desconectada para evitar deploys duplicados del CLI.
- **Alternativa Workers Static Assets** (si se activa SSR): `wrangler.toml` con `assets.directory = "./dist"` + `assets.not_found_handling = "single-page-application"`.
- Dominio: Pages → Custom domain `volfread.xyz` + `www` → CF auto SSL. Registrar `_headers` y `_redirects` desde `packages/main/public/`.
- Analytics: Cloudflare Web Analytics beacon. Activar en CF Dashboard → `Web Analytics` o incluir `<script defer src='https://static.cloudflareinsights.com/beacon.min.js' data-cf-beacon='{"token":"..."}'>` en `BaseLayout`. Sin cookies, sin banner.
- Preview: `pnpm build && pnpm --filter main preview` o `wrangler pages deploy dist --dry-run`.

## 10. Calidad

- Lint: `eslint` flat (`eslint.config.mjs`: `eslint-plugin-astro` recommended + `typescript-eslint` recommended, `no-explicit-any` en warn). Root `pnpm lint` cubre todo el repo; por package `pnpm --filter <pkg> lint`. Astro: `pnpm astro check`.
- A11y: `scripts/a11y.ts` con `axe-core` si se añade.
- Lighthouse: objetivo `Perf>95, A11y>95` en `pnpm preview`.
- No commitear `dist/`, `.astro/`, `.wrangler/`.
- Audit deps: `pnpm audit --audit-level moderate` (no `npm audit` — `catalog:` en `pnpm-workspace.yaml`). Añadir script `audit` en root.

## 10.1 Seguridad — obligatorio en cada cambio

Fuente: Lighthouse Best Practices + OWASP. Ver `SPECS.md §4.1` y `_headers`.

- **HTTPS:** sin mixed content (`http://` solo `xmlns`/`localhost` dev). Evitar `//` protocol-relative.
- **Headers (vía `packages/main/public/_headers` `/*`):** `Strict-Transport-Security: max-age=31536000; includeSubDomains` (sin `preload`), `Content-Security-Policy` enforcement (ver SPECS), `X-Frame-Options: SAMEORIGIN` + CSP `frame-ancestors 'self'`, `X-Content-Type-Options: nosniff`, `Referrer-Policy: strict-origin-when-cross-origin`, `Permissions-Policy: camera=(), microphone=(), geolocation=(), fullscreen=(self), payment=(), usb=()`, `Cross-Origin-Opener-Policy: same-origin`, `X-XSS-Protection: 0` (desactivar auditor legacy).
- **CSP:** `default-src 'self'; script-src 'self' https://giscus.app https://static.cloudflareinsights.com` + hashes `sha256-…` generados por `scripts/generate-csp.mjs` (ClientRouter + JSON-LD + 404); `style-src 'self' 'unsafe-inline' https://giscus.app https://fonts.googleapis.com; font-src 'self' data: https:; img-src 'self' data: https: https://academy.bit2me.com; connect-src 'self' https://giscus.app; frame-src https://giscus.app; worker-src 'self' blob:; object-src 'none'; base-uri 'self'; form-action 'self'; frame-ancestors 'self'` — report-only no se usa (estático). Giscus inline externalizado a `public/scripts/giscus-loader.js` para no requerir `unsafe-inline` fijo en `script-src` (hashes dinámicos vía post-build). `fonts.googleapis.com` en `style-src`: lo exige el simulador-blockchain (Angular con fonts externas, sin inlining).
- **SRI:** pin `https://giscus.app/client.js` con `integrity` + `crossorigin="anonymous"` (rotar hash en cada update, documentado en `src/components/Giscus.astro`). Igual para beacon si se descomenta.
- **Vuln libs:** `pnpm audit`, `pnpm update`, evitar `_.merge`/`$.extend(true)` con input no confiable, usar `Object.create(null)` o `structuredClone`.
- **Sanitización:** `textContent` sobre `innerHTML`; si HTML necesario, `DOMPurify.sanitize`. No `eval`/`Function`/`setTimeout(string)`/`document.write`.
- **Cookies:** no tracking; si se añade `Set-Cookie`, `Secure; HttpOnly; SameSite=Strict`.
- **Source maps:** `build.sourcemap: false` explícito en los 3 `vite.config`/`astro.config.mjs` (no exponer `sourcesContent`).
- **Compat:** `<!DOCTYPE html>` uppercase, `charset` primero en `<head>`, `viewport` sin `user-scalable=no`, no APIs deprecadas, `passive: true` en listeners de scroll/touch.

## 11. Commits & Releases

- Conventional Commits (`feat:`, `fix:`, `docs:`, `chore:`).
- `CHANGELOG.md` Keep a Changelog + SemVer. Actualizar `Unreleased` en cada PR; tag `vX.Y.Z` genera release.
- Ramas `feat/*`, `fix/*` → PR → squash.

## 12. Referencias

- `SPECS.md` — spec funcional/técnica completa
- `CHANGELOG.md` — historial
- Context7 IDs usados: `/withastro/docs`, `/websites/pnpm_io`, `/cloudflare/cloudflare-docs`
```
