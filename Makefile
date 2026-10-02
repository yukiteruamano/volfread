# Makefile — volfread.xyz
# Facilita dev, build y deploy del monorepo pnpm + Astro + webs embebidas
# Uso: make help
# Requiere: pnpm >=9, node >=20, wrangler (solo para deploy)

SHELL := /bin/bash
.DEFAULT_GOAL := help

# ── Variables ───────────────────────────────────────────────────────────────
PNPM        ?= pnpm
NODE        ?= node
WRANGLER    ?= npx wrangler
DIST        := dist
MAIN_DIST   := packages/main/dist
# Puerto único para dev/preview (evita choques con otros proyectos Astro).
# Sobrescribible: make dev PORT=4321
PORT        ?= 5000

# Fuentes webs embebidas (para build:real si existen localmente)
EC_SOURCE   ?= /home/yukiteru/GIT/EclipseCalculator
SB_SOURCE   ?= /home/yukiteru/GIT/yukiteruamano.github.io

# Colores
BOLD  := \033[1m
DIM   := \033[2m
GREEN := \033[32m
CYAN  := \033[36m
ORANGE:= \033[38;5;208m
RESET := \033[0m

# ── Helpers ─────────────────────────────────────────────────────────────────
define banner
	@echo -e "$(ORANGE)▶$(RESET) $(BOLD)$(1)$(RESET) $(DIM)$(2)$(RESET)"
endef

# ── Help (auto-generado desde comentarios ##) ───────────────────────────────
.PHONY: help
help: ## Muestra esta ayuda
	@echo -e "$(BOLD)volfread.xyz$(RESET) $(DIM)— pnpm workspaces + Astro + Cloudflare Pages$(RESET)"
	@echo ""
	@echo -e "$(BOLD)Uso:$(RESET) make $(CYAN)<target>$(RESET) [VAR=valor]"
	@echo ""
	@grep -E '^[a-zA-Z0-9_/%.-]+:.*##' $(MAKEFILE_LIST) | \
		awk -F':.*##' '{printf "  $(CYAN)%-22s$(RESET) %s\n", $$1, $$2}' | sort
	@echo ""
	@echo -e "$(DIM)Ejemplos:$(RESET)"
	@echo -e "  make install          # instala todo"
	@echo -e "  make dev              # main en http://localhost:5000"
	@echo -e "  make build            # build completo + merge dist/"
	@echo -e "  make preview          # sirve dist fusionado"
	@echo -e "  make deploy           # wrangler pages deploy dist"

# ── Setup ───────────────────────────────────────────────────────────────────
.PHONY: install i
install i: ## Instala dependencias (pnpm install)
	$(call banner,install,root + workspaces)
	$(PNPM) install

.PHONY: install-tools
install-tools: ## Verifica toolchain (node, pnpm, wrangler)
	@echo -e "$(BOLD)Toolchain$(RESET)"
	@node --version  2>/dev/null || echo "  ✗ node no encontrado (>=20 requerido)"
	@$(PNPM) --version 2>/dev/null | xargs -I{} echo "  pnpm {}" || echo "  ✗ pnpm no encontrado (>=9)"
	@$(WRANGLER) --version 2>/dev/null | head -n1 | xargs -I{} echo "  wrangler {}" || echo "  (wrangler no instalado — solo necesario para deploy)"
	@npx astro --version 2>/dev/null | xargs -I{} echo "  astro {}" || echo "  (astro se instala con pnpm install)"

# ── Dev ─────────────────────────────────────────────────────────────────────
.PHONY: dev dev-main dev-scope dev-eclipse dev-blockchain dev-all
dev: dev-main ## Alias de dev-main (main en :5000)
dev-main: ## Dev Astro main → http://localhost:5000
	$(call banner,dev,main :5000)
	$(PNPM) --filter main dev --host 0.0.0.0 --port $(PORT)

dev-scope dev-eclipse: ## Dev EclipseScope (Vite+React) → :5173
	$(call banner,dev,eclipsescope :5173)
	$(PNPM) --filter eclipsescope dev --host 0.0.0.0

dev-blockchain: ## Dev simulador-blockchain (Vite placeholder) → :5174
	$(call banner,dev,simulador-blockchain :5174)
	$(PNPM) --filter simulador-blockchain dev --host 0.0.0.0

dev-all: ## Dev main + eclipsescope en paralelo (requiere pnpm -r --parallel)
	$(call banner,dev,main + eclipsescope en paralelo)
	$(PNPM) -r --parallel dev

# ── Stats ───────────────────────────────────────────────────────────────────
.PHONY: stats build-stats stats-force
stats build-stats: ## Stats con TTL 7d (reutiliza si el stamp está vigente)
	$(call banner,stats,collect-project-stats.mjs)
	$(PNPM) run build:stats
stats-force: ## Fuerza regeneración de stats ignorando el stamp
	$(call banner,stats-force,collect-project-stats.mjs --force)
	$(PNPM) run build:stats:force

# ── Build ───────────────────────────────────────────────────────────────────
.PHONY: build build-main build-web build-real check typecheck astro-check

build: ## Build completo: stats + main + webs + merge dist/ (usa real si EC_SOURCE/SB_SOURCE existen; + CSP hashes)
	$(call banner,build,main + webs + copy-dist + CSP)
	$(PNPM) run build:stats
	$(PNPM) run build:main
	@if [ -d "$(EC_SOURCE)" ] && [ -f "$(EC_SOURCE)/vite.config.ts" ]; then \
		echo -e "$(DIM)EclipseScope fuente detectada → build real con --base$(RESET)"; \
		EC_SOURCE="$(EC_SOURCE)" $(PNPM) --filter eclipsescope run build:real; \
	else \
		$(PNPM) --filter eclipsescope build; \
	fi
	@if [ -d "$(SB_SOURCE)" ] && [ -f "$(SB_SOURCE)/angular.json" ]; then \
		echo -e "$(DIM)Simulador fuente detectada → build real con --base-href$(RESET)"; \
		SB_SOURCE="$(SB_SOURCE)" $(PNPM) --filter simulador-blockchain run build:real; \
	else \
		$(PNPM) --filter simulador-blockchain build; \
	fi
	$(PNPM) run build:csp
	$(NODE) scripts/copy-dist.mjs
	@echo -e "$(GREEN)✓$(RESET) dist/ listo → $(BOLD)make preview$(RESET) o $(BOLD)make deploy$(RESET)"

build-main: ## Solo Astro main → packages/main/dist
	$(call banner,build,main)
	$(PNPM) run build:main

build-web: ## Solo webs embebidas → packages/*/dist
	$(call banner,build,webs)
	$(PNPM) run build:web

build-real: ## Build webs desde fuentes reales vecinas (EC_SOURCE / SB_SOURCE)
	$(call banner,build,webs reales desde fuentes vecinas)
	@if [ -d "$(EC_SOURCE)" ]; then \
		echo -e "$(DIM)EclipseScope: $(EC_SOURCE)$(RESET)"; \
		EC_SOURCE="$(EC_SOURCE)" $(PNPM) --filter eclipsescope run build:real; \
	else echo "  (skip eclipsescope: $(EC_SOURCE) no existe)"; fi
	@if [ -d "$(SB_SOURCE)" ]; then \
		echo -e "$(DIM)Simulador: $(SB_SOURCE)$(RESET)"; \
		SB_SOURCE="$(SB_SOURCE)" $(PNPM) --filter simulador-blockchain run build:real; \
	else echo "  (skip simulador-blockchain: $(SB_SOURCE) no existe)"; fi

build-csp: ## Genera hashes CSP para scripts inline (ClientRouter + JSON-LD)
	$(call banner,build,generate-csp)
	$(PNPM) run build:csp

check typecheck astro-check: ## Typecheck Astro (astro check)
	$(call banner,check,astro check)
	$(PNPM) run check

# ── Preview & Quality ───────────────────────────────────────────────────────
.PHONY: preview preview-main preview-dist lint format format-check test

test: ## Tests humo (node --test tests/, sin red)
	$(call banner,test,node --test)
	$(NODE) --test "tests/**/*.test.mjs"

preview: ## Preview dist fusionado (requiere pnpm build previo)
	$(call banner,preview,dist/ fusionado en http://localhost:5000)
	@if [ ! -d "$(DIST)" ]; then echo -e "$(ORANGE)dist/ no existe — ejecuta make build$(RESET)"; exit 1; fi
	@echo -e "$(DIM)Sirviendo $(DIST) — Ctrl+C para salir$(RESET)"
	@npx serve $(DIST) -l $(PORT) 2>/dev/null || $(PNPM) --filter main preview --host 0.0.0.0 --port $(PORT)

preview-main: ## Preview solo main (sin merge)
	$(call banner,preview,main)
	$(PNPM) --filter main preview --host 0.0.0.0 --port $(PORT)

preview-dist: preview ## Alias de preview

lint: ## Lint repo (eslint flat: astro + ts)
	$(call banner,lint,eslint .)
	$(PNPM) run lint

format: ## Formatea con prettier
	$(call banner,format,prettier --write)
	$(PNPM) run format

format-check: ## Verifica formato sin escribir
	$(call banner,format-check,prettier --check)
	$(PNPM) run format:check

# ── Deploy (Cloudflare Pages) ───────────────────────────────────────────────
.PHONY: deploy deploy-dry deploy-pages cf-login

deploy: build ## Build + deploy a Cloudflare Pages (requiere wrangler auth)
	$(call banner,deploy,Cloudflare Pages → dist/)
	@if [ ! -d "$(DIST)" ]; then echo "dist/ no existe"; exit 1; fi
	$(WRANGLER) pages deploy $(DIST) --project-name volfread-xyz

deploy-dry: build ## Build + dry-run deploy (sin subir)
	$(call banner,deploy,dry-run)
	$(WRANGLER) pages deploy $(DIST) --project-name volfread-xyz --dry-run

deploy-pages: deploy ## Alias de deploy

cf-login: ## Login wrangler (abre navegador)
	$(WRANGLER) login

# ── Content ─────────────────────────────────────────────────────────────────
.PHONY: create-content create-content-flags
create-content: ## Crea es/en/{slug}/index.md con scaffold bilingüe (prompt interactivo)
	$(call banner,create-content,bilingüe es/en)
	@$(NODE) scripts/create-content.mjs

create-content-ci: ## Crea contenido no-interactivo: make create-content-ci ES=slug EN=slug
	$(call banner,create-content,CI ES=$(ES) EN=$(EN))
	@test -n "$(ES)" || (echo "  ✗ Falta ES=slug (ej: make create-content-ci ES=primeros-pasos EN=first-steps)"; exit 1)
	@test -n "$(EN)" || (echo "  ✗ Falta EN=slug"; exit 1)
	@$(NODE) scripts/create-content.mjs --es=$(ES) --en=$(EN)

# ── Clean ───────────────────────────────────────────────────────────────────
.PHONY: clean clean-dist clean-all nuke

clean: clean-dist ## Limpia dist/ (root + packages)
	$(call banner,clean,dist/)

clean-dist:
	rm -rf $(DIST) $(MAIN_DIST) packages/eclipsescope/dist packages/simulador-blockchain/dist .astro

clean-all nuke: ## Limpia todo: dist + node_modules + .astro + .wrangler
	$(call banner,nuke,dist + node_modules)
	rm -rf $(DIST) $(MAIN_DIST) packages/*/dist packages/*/.astro .astro .wrangler node_modules packages/*/node_modules

# ── Git helpers ─────────────────────────────────────────────────────────────
.PHONY: status log

status: ## git status corto
	@git status -sb

log: ## Últimos 10 commits
	@git log --oneline -10

# ── Mantenimiento (auditoría + updates) ─────────────────────────────────────
# Mantener el proyecto mantenible: `make maintain` es el chequeo periódico
# (solo lectura, salvo `audit` que falla ante vulns moderate+).
# Aplicar updates con `update` (seguro, rangos semver) o `update-latest`
# (puede romper: exige `make build && make ci` después + revisión manual).
.PHONY: audit audit-ci outdated update-check update update-latest update-interactive dedupe-check install-ci licenses maintain

audit: ## Auditoría de vulnerabilidades (falla si hay moderate+)
	$(call banner,audit,pnpm audit --audit-level moderate)
	$(PNPM) run audit

audit-ci: install-ci audit ## Paridad CI: lockfile al día + audit fail-closed
	$(call banner,audit-ci,OK)

outdated update-check: ## Lista dependencias desactualizadas (solo lectura, no falla)
	$(call banner,outdated,pnpm outdated --recursive)
	$(PNPM) outdated --recursive || true

update: ## Actualiza dentro de rangos semver + re-audita
	$(call banner,update,rangos semver + audit)
	$(PNPM) run update

update-latest: ## Actualiza a latest (puede romper; luego make build && make ci)
	$(call banner,update-latest,latest + audit)
	$(PNPM) update --recursive --latest
	$(PNPM) run audit

update-interactive: ## Actualiza eligiendo versión por versión (requiere TTY)
	$(call banner,update,interactivo)
	$(PNPM) update --interactive --recursive

dedupe-check: ## Verifica que el lockfile no tiene duplicados resolubles
	$(call banner,dedupe,lockfile sano)
	$(PNPM) dedupe --check

install-ci: ## Instalación reproducible CI (falla si el lock no está al día)
	$(call banner,install-ci,frozen-lockfile)
	$(PNPM) install --frozen-lockfile

licenses: ## Inventario de licencias de las dependencias
	$(call banner,licenses,pnpm licenses list)
	$(PNPM) licenses list

maintain: outdated audit dedupe-check ## Chequeo periódico de mantenibilidad
	$(call banner,maintain,upkeep OK)

# ── CI ──────────────────────────────────────────────────────────────────────
.PHONY: ci
ci: install stats test format format-check build check lint audit ## Pipeline local CI: install + stats + test + build + check + lint + format + audit
	$(call banner,ci,local pipeline OK)
