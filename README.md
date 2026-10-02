# volfread.xyz

Sitio personal + portafolio + blog multi-idioma (ES/EN) — Astro estático desplegado en Cloudflare Pages. Ver `SPECS.md` y `AGENTS.md`.

## Quickstart

```bash
pnpm install
pnpm dev              # main en http://localhost:5000
pnpm build            # stats + main + webs + merge dist/
pnpm test             # humo sin red (node --test tests/)
```

## Estructura

```
packages/main          → Astro (volfread.xyz)
packages/eclipsescope → Vite+React (→ /proyectos/eclipsescope/app/)
packages/simulador-blockchain → Angular (→ /proyectos/simulador-blockchain/app/)
scripts/copy-dist.mjs  → fusiona dist/ (ficha en /proyectos/<slug>/, app en /proyectos/<slug>/app/)
tests/smoke.test.mjs   → humo sin red (datos, scripts con fixtures, _headers)
```

Flujo recomendado: `make build && make preview` para probar fichas + apps embebidas (dev solo sirve fichas; preview sirve dist fusionado).

## Deploy

Cloudflare Pages: Build `pnpm install && pnpm build`, output `dist`. Dominio `volfread.xyz` (ya en CF). Analytics: beacon CF (auto-inyectado o manual).

## Docs

- `AGENTS.md` — guía para IAs/agentes
- `SPECS.md` — spec funcional/técnica
- `CHANGELOG.md` — historial
