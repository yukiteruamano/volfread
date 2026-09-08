# Makefile — volfread.xyz
# Facilita dev, build y deploy del monorepo pnpm + Astro
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
	@echo -e "  make dev              # main en http://localhost:4321"
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
.PHONY: dev dev-main
dev: dev-main ## Alias de dev-main (main en :4321)
dev-main: ## Dev Astro main → http://localhost:4321
	$(call banner,dev,main :4321)
	$(PNPM) --filter main dev --host 0.0.0.0

# ── Stats ───────────────────────────────────────────────────────────────────
.PHONY: stats build-stats
stats build-stats: ## Regenera projects.stats.json (LOC + git log 52w)
	$(call banner,stats,collect-project-stats.mjs)
	$(NODE) scripts/collect-project-stats.mjs

# ── Build ───────────────────────────────────────────────────────────────────
.PHONY: build build-main check typecheck astro-check

build: ## Build completo: main → dist/ (copy-dist + CSP hashes)
	$(call banner,build,main + copy-dist + CSP)
	$(PNPM) run build:main
	$(PNPM) run build:csp
	$(NODE) scripts/copy-dist.mjs
	@echo -e "$(GREEN)✓$(RESET) dist/ listo → $(BOLD)make preview$(RESET) o $(BOLD)make deploy$(RESET)"

build-main: ## Solo Astro main → packages/main/dist
	$(call banner,build,main)
	$(PNPM) run build:main

build-csp: ## Genera hashes CSP para scripts inline (ClientRouter + JSON-LD)
	$(call banner,build,generate-csp)
	$(PNPM) run build:csp

check typecheck astro-check: ## Typecheck Astro (astro check)
	$(call banner,check,astro check)
	$(PNPM) run check

# ── Preview & Quality ───────────────────────────────────────────────────────
.PHONY: preview preview-main preview-dist lint format format-check

preview: ## Preview dist (requiere pnpm build previo)
	$(call banner,preview,dist/ en http://localhost:4321)
	@if [ ! -d "$(DIST)" ]; then echo -e "$(ORANGE)dist/ no existe — ejecuta make build$(RESET)"; exit 1; fi
	@echo -e "$(DIM)Sirviendo $(DIST) — Ctrl+C para salir$(RESET)"
	@npx serve $(DIST) -l 4321 2>/dev/null || $(PNPM) --filter main preview --host 0.0.0.0

preview-main: ## Preview solo main (sin merge)
	$(call banner,preview,main)
	$(PNPM) --filter main preview --host 0.0.0.0

preview-dist: preview ## Alias de preview

lint: ## Lint workspaces (si existe script lint)
	$(call banner,lint,pnpm -r lint)
	$(PNPM) -r lint || echo -e "$(DIM)sin linter o lint falló$(RESET)"

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
	rm -rf $(DIST) $(MAIN_DIST) .astro

clean-all nuke: ## Limpia todo: dist + node_modules + .astro + .wrangler
	$(call banner,nuke,dist + node_modules)
	rm -rf $(DIST) $(MAIN_DIST) packages/*/dist packages/*/.astro .astro .wrangler node_modules packages/*/node_modules

# ── Git helpers ─────────────────────────────────────────────────────────────
.PHONY: status log

status: ## git status corto
	@git status -sb

log: ## Últimos 10 commits
	@git log --oneline -10

# ── CI ──────────────────────────────────────────────────────────────────────
.PHONY: ci
ci: install stats build check ## Pipeline local CI: install + stats + build + check
	$(call banner,ci,local pipeline OK)
