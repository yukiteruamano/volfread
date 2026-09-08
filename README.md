# volfread.xyz

Sitio personal + portafolio + blog multi-idioma (ES/EN) — Astro estático desplegado en Cloudflare Pages. Ver `SPECS.md` y `AGENTS.md`.

## Quickstart

```bash
pnpm install
pnpm dev              # main en http://localhost:4321
pnpm build            # build main → dist/
pnpm build:stats      # regenera src/data/projects.stats.json
```

## Estructura

```
packages/main          → Astro (volfread.xyz)
scripts/copy-dist.mjs  → copia main/dist → dist/
```

Proyectos web (EclipseScope, Simulador Blockchain) son fichas con `demoUrl` externa — no hay builds embebidos.

## Deploy

Cloudflare Pages: Build `pnpm install && pnpm build`, output `dist`. Dominio `volfread.xyz` (ya en CF). Analytics: beacon CF (auto-inyectado o manual).

## Docs

- `AGENTS.md` — guía para IAs/agentes
- `SPECS.md` — spec funcional/técnica
- `CHANGELOG.md` — historial
