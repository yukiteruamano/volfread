# AGENTS.md — Guía para IAs y contribuidores

Este archivo es la **única fuente de verdad operativa** para agentes IA. Léelo antes de tocar cualquier cosa.

## 1. Proyecto

- **Dominio:** `volfread.xyz` (Cloudflare, zona ya creada)
- **Objetivo 1:** Web personal + portafolio. Proyectos web estáticos embebidos en `volfread.xyz/proyectos/<slug>/` dentro del mismo deploy.
- **Objetivo 2:** Blog multi-idioma ES (default sin prefijo) + EN (`/en/`) en Markdown (`.md`).
- **Stack:** Astro 7.x `output: static` + Tailwind 4 + TypeScript strict + pnpm workspaces + Cloudflare Pages (migrar a Workers Static Assets si se necesita SSR).
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
│   ├── generate-blog-map.mjs       # mapa ES↔EN desde translationKey → i18n/blogMap.json
│   └── collect-project-stats.mjs   # LOC + git log → projects.stats.json
├── tests/
│   └── smoke.test.mjs              # humo sin red (`pnpm test`, `make test`)
└── packages/
    ├── main/                       # Astro — el sitio
    │   ├── astro.config.mjs (i18n, mdx, sitemap, rss, site: https://volfread.xyz)
    │   ├── content.config.ts (colección blog, loader glob, z de astro/zod)
    │   ├── src/
    │   │   ├── components/{Header,Footer,ProjectCard,CommitActivity,Giscus,LanguageSwitcher,MermaidLoader,Lightbox,SearchBox,EmailObfuscated}.astro
    │   │   ├── layouts/{BaseLayout,BlogLayout}.astro
    │       │   ├── pages/{index,about,proyectos/[slug],blog/[...slug],en/{projects/[slug],blog/[...slug]}}.astro
    │   │   ├── content/blog/{es,en}/<slug>/index.md (+ cover.webp opcional)
    │   │   ├── data/{proyectos.json, projects.stats.json}
    │   │   ├── i18n/{ui.ts, utils.ts}
    │   │   └── styles/{global.css, theme.css, blog-markdown.css}
    │   └── public/{favicon.svg, _headers, _redirects, scripts/*.js}
    ├── eclipsescope/               # Vite+React — base /proyectos/eclipsescope/app/
    ├── simulador-blockchain/       # Angular 19 — baseHref /proyectos/simulador-blockchain/app/
    └── _template-static/           # plantilla futuros webs
```

No duplicar `pnpm-lock.yaml` por package. Un solo lock en root. No usar `npm`/`yarn` nunca. No nombrar bindings `ASSETS` (reservado CF).

## 3. Proyectos (38 fichas en `proyectos.json`)

| slug                       | tipo | lang       | build                                                       |
| -------------------------- | ---- | ---------- | ----------------------------------------------------------- |
| `eclipsescope`             | web  | TypeScript | `vite build` con `base: '/proyectos/eclipsescope/app/'`     |
| `simulador-blockchain`     | web  | TypeScript | `ng build --base-href /proyectos/simulador-blockchain/app/` |
| `fast-levenshtein`         | lib  | Go         | ficha + stats (no embebido)                                 |
| `gache`                    | lib  | Go         | ficha + stats (no embebido)                                 |
| `koma`                     | cli  | Go         | ficha + stats (no embebido)                                 |
| `mangodex`                 | lib  | Go         | ficha + stats (no embebido)                                 |
| `pkgcheck`                 | cli  | Python     | ficha + stats (no embebido)                                 |
| `simple-markdown-crawler`  | cli  | Python     | ficha + stats (no embebido)                                 |
| `harden-yml`               | cli  | Ansible    | ficha + stats (no embebido)                                 |
| `kernel-hardening-checker` | cli  | Python     | ficha + stats (no embebido)                                 |
| `picom`                    | cli  | C          | ficha + stats (no embebido)                                 |
| `apparmor-d`               | cli  | Go         | ficha + stats (no embebido)                                 |
| `doomemacs`                | cli  | Emacs Lisp | ficha + stats (no embebido)                                 |
| `knots-banlist`            | cli  | Python     | ficha + stats (no embebido)                                 |
| `bearer`                   | cli  | Go         | ficha + stats (no embebido)                                 |
| `appjail`                  | cli  | Shell      | ficha + stats (no embebido)                                 |
| `openriot`                 | cli  | Go         | ficha + stats (no embebido)                                 |
| `cc-skills-golang`         | lib  | Go         | ficha + stats (no embebido)                                 |
| `manga-tui`                | cli  | Rust       | ficha + stats (no embebido)                                 |
| `horusec`                  | cli  | Go         | ficha + stats (no embebido)                                 |
| `geo-seo-claude`           | lib  | Python     | ficha + stats (no embebido)                                 |
| `dappwarrior`              | lib  | JavaScript | ficha + stats (no embebido)                                 |
| `weatherai`                | cli  | Python     | ficha + stats (no embebido)                                 |
| `openbsd-src`              | lib  | C          | ficha + stats (no embebido)                                 |
| `openbsd-ports`            | cli  | Makefile   | ficha + stats (no embebido)                                 |
| `freebsd-src`              | lib  | C          | ficha + stats (no embebido)                                 |
| `freebsd-ports`            | cli  | Makefile   | ficha + stats (no embebido)                                 |
| `mpv`                      | cli  | C          | ficha + stats (no embebido)                                 |
| `obs-backgroundremoval`    | lib  | C++        | ficha + stats (no embebido)                                 |
| `crawl4ai`                 | lib  | Python     | ficha + stats (no embebido)                                 |
| `awesome`                  | cli  | Lua        | ficha + stats (no embebido)                                 |
| `void-packages`            | cli  | Shell      | ficha + stats (no embebido)                                 |
| `spacemacs`                | cli  | Emacs Lisp | ficha + stats (no embebido)                                 |
| `apheleia`                 | lib  | Emacs Lisp | ficha + stats (no embebido)                                 |
| `trezord-go`               | cli  | C          | ficha + stats (no embebido)                                 |
| `lazygit`                  | cli  | Go         | ficha + stats (no embebido)                                 |
| `wireguard-install`        | cli  | Shell      | ficha + stats (no embebido)                                 |
| `docker-rocm-xtra`         | cli  | Docker     | ficha + stats (no embebido)                                 |

Fichas no-web: `src/data/proyectos.json` (metadata) + `projects.stats.json` (generado: LOC, languages, commit histogram 52 semanas via `git log` local o GitHub API fallback).

## 4. Comandos

```bash
pnpm install                    # root — instala todo
pnpm dev                        # main → http://localhost:5000 (PORT= configurable en make)
pnpm dev:eclipse                # eclipsescope → http://localhost:5173
pnpm build                      # stats + main + webs + merge dist/ (make build usa real si EC_SOURCE/SB_SOURCE existen)
pnpm build:main                 # solo Astro
pnpm build:web                  # solo webs (placeholder)
pnpm build:csp                  # hashes CSP para scripts inline (ClientRouter + JSON-LD)
pnpm test                       # humo sin red (node --test tests/) — también `make test`
pnpm lint                       # eslint . (flat: astro + ts — 0 errores; no-explicit-any en error)
pnpm format:check               # prettier --check (verde tras build: generadores conformes)
make build-real                 # build real eclipsescope+simulador desde EC_SOURCE/SB_SOURCE con --base /app/ (explícito)
make build                      # stats + auto real si vecinos existen, fallback placeholder en CI
```

pnpm build:stats # stats con TTL 7d (reutiliza si projects.stats.stamp.json vigente; requiere red/GH_TOKEN al regenerar)
pnpm build:stats:force # fuerza regeneración ignorando el stamp
pnpm --filter main astro check # typecheck Astro
pnpm build && pnpm --filter main preview # o make build && make preview (recomendado: preview sirve dist fusionado con apps en /app/ — dev solo sirve fichas)

````

Dev con múltiples Astro: si la toolbar falla, añadir `vite.server.fs.allow: [path.resolve('../..')]` en `astro.config.mjs`.

## 5. Añadir un nuevo proyecto web

1. Crear `packages/<slug>/` con su stack, `package.json` name `<slug>`, `vite.config` `base: '/proyectos/<slug>/app/'` (o `baseHref` Angular con `/app/`).
2. Añadir a `scripts/copy-dist.mjs` en `WEB_PACKAGES = ['eclipsescope', 'simulador-blockchain', '<slug>']` — copia a `dist/proyectos/<slug>/app/`.
3. Añadir entrada en `packages/main/src/data/proyectos.json` con `type: 'web'`.
4. `pnpm install` en root, `pnpm --filter <slug> build`, `pnpm build` y verificar `dist/proyectos/<slug>/app/index.html`.
5. No olvidar `_redirects` SPA fallback si el web es SPA con router: ` /proyectos/<slug>/app/*  /proyectos/<slug>/app/index.html  200`.
6. CSP estricta: la app debe buildear **sin `<script>` inline, sin handlers `on*=` y sin `<meta http-equiv="Content-Security-Policy">` (los headers mandan). Verificar con `grep` en su `dist/index.html`. En Angular: `optimization.fonts: false` + `styles.inlineCritical: false`, y JS inicial en fichero externo (ej. `assets/theme-init.js`). Desactivar Rocket Loader en `/proyectos/*/app/*` (dashboard Cloudflare) — rompe SPAs.

Añadir proyecto no-web (ficha): solo paso 3 con `type: 'lib'|'cli'` + `repo`, `lang`, y stats (`pnpm build:stats`, auto en `build`; añadir slug a `PROJECTS` en `scripts/collect-project-stats.mjs` si no hay checkout local).

## 6. i18n

- `astro.config.mjs` i18n: `defaultLocale: 'es'`, `locales: ['es','en']`, `routing.prefixDefaultLocale: false` (+ `redirectToDefaultLocale: false` explícito: en v6 el defecto cambió).
- ES: `src/pages/index.astro`, `src/pages/blog/[...slug].astro`, `src/pages/proyectos/{index,[slug]}.astro`, `src/content/blog/es/<slug>/index.md`
- EN: `src/pages/en/index.astro`, `src/pages/en/projects/{index,[slug]}.astro` (¡no `en/proyectos`! `proyectos` ES ↔ `projects` EN monolingüe), `src/pages/en/blog/[...slug].astro`, `src/content/blog/en/<slug>/index.md`
- Helpers: `src/i18n/utils.ts` (`getAlternateUrls` con mapeo `proyectos ↔ projects` + fallback blog `hola-mundo↔hello-world` → índice), `src/components/LanguageSwitcher.astro` mismo mapeo, diccionario `src/i18n/ui.ts`.
- Siempre añadir `hreflang` alternates y `canonical` en `BaseLayout.astro`. URLs EN son `/en/projects`, no `/en/proyectos` (301 redirect legacy en `_redirects`).

## 7. Blog

- Collections en `src/content.config.ts` (Content Layer: `glob` loader + `z` de `astro/zod`; `blog` con `title, description, pubDate, lang, tags, draft, cover`). Slugs vía helper `blogEntrySlug(post.id)` (`src/i18n/utils.ts`: recorta prefijo de idioma + `/index`).
- Drafts: `draft: true` se filtran en build `import.meta.env.PROD`.
- Páginas: `getStaticPaths` filtra por `lang`. RSS por idioma (`@astrojs/rss`).
- Comentarios: `src/components/Giscus.astro` solo en `blog/[...slug].astro` (render servidor, loader externo `public/scripts/giscus-loader.js` con SRI). Requiere repo público con Discussions enabled; sin discusión creada muestra invitación a abrirla. Attr `data-lang` dinámico `es/en`. Alternativa Disqus documentada en comentario (no usada).
- Diagramas: fences ` ```mermaid ` renderizan en cliente (`MermaidLoader.astro` + `public/scripts/mermaid.min.js` vendoreado); clic abre lightbox (`Lightbox.astro`, galería con miniaturas/contador); botón Descargar SVG por diagrama. Sin JS se ve el bloque de código.

## 8. Estilos

- Tailwind 4 vía `@tailwindcss/vite` en `astro.config.mjs`. Tokens en `src/styles/theme.css` (`--color-volf-*`).
- No introducir otro framework CSS. Usar utilidades Tailwind + `cn()` si necesario.
- Imágenes: `astro:assets` (`<Image>` optimizada).

## 9. Deploy

- **Cloudflare Pages vía Wrangler CLI** (sin integración Git): `make deploy` (build + `wrangler pages deploy dist --project-name volfread-xyz`) o `make deploy-dry` para dry-run. Requiere `wrangler login` una vez (`make cf-login`). Node 24 (`engines >=24`, `.nvmrc`), `PNPM_VERSION` 11.
- La integración Git de Pages está desconectada para evitar deploys duplicados del CLI.
- **Alternativa Workers Static Assets** (si se activa SSR): `wrangler.toml` con `assets.directory = "./dist"` + `assets.not_found_handling = "single-page-application"`.
- Dominio: Pages → Custom domain `volfread.xyz` + `www` → CF auto SSL. Registrar `_headers` y `_redirects` desde `packages/main/public/`.
- Analytics: Cloudflare Web Analytics beacon. Activar en CF Dashboard → `Web Analytics` o incluir `<script defer src='https://static.cloudflareinsights.com/beacon.min.js' data-cf-beacon='{"token":"..."}'>` en `BaseLayout`. Sin cookies, sin banner.
- Preview: `pnpm build && pnpm --filter main preview` o `wrangler pages deploy dist --dry-run`.

## 10. Calidad

- Lint: `eslint` flat (`eslint.config.mjs`: `eslint-plugin-astro` recommended + `typescript-eslint` recommended, `no-explicit-any` en error). Root `pnpm lint` cubre todo el repo; por package `pnpm --filter <pkg> lint`. Astro: `pnpm astro check`. Tests: `pnpm test` (`node --test tests/`, humo sin red).
- A11y: `scripts/a11y.ts` con `axe-core` si se añade.
- Lighthouse: objetivo `Perf>95, A11y>95` en `pnpm preview`.
- No commitear `dist/`, `.astro/`, `.wrangler/`.
- Audit deps: `pnpm audit --audit-level moderate` (no `npm audit` — `catalog:` en `pnpm-workspace.yaml`). Añadir script `audit` en root. Overrides en `pnpm-workspace.yaml#overrides` (pnpm v11 los ignora en `package.json`) solo como último recurso (transitivas sin fix upstream: retirar en cada `maintain` cuando el padre las traiga).

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
````
