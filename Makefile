PNPM ?= pnpm

.PHONY: help setup typecheck test package lint lint-fix quality check-knip check-structure check-architecture check-contracts ci

help: ## Display help
	@grep -E '^[a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) | awk 'BEGIN {FS = ":.*?## "}; {printf "\033[36m%-30s\033[0m %s\n", $$1, $$2}'

setup: ## Setup project
	$(PNPM) install --frozen-lockfile

typecheck: ## Type-check every workspace project through Nx
	$(PNPM) workspace:build

test: ## Test every workspace project through Nx
	$(PNPM) test

build: ## Build every workspace project through Nx
	$(PNPM) workspace:build

package: ## Build all committed GitHub Action bundles
	$(PNPM) package

lint: ## Execute linting
	$(PNPM) lint
	$(call run_linter)

lint-fix: ## Execute linting and fix
	$(PNPM) format
	$(PNPM) lint:fix
	$(call run_linter, \
		-e FIX_MARKDOWN=true \
		-e FIX_NATURAL_LANGUAGE=true \
		-e FIX_SHELL_SHFMT=true \
		-e FIX_YAML_PRETTIER=true \
		-e FIX_MARKDOWN_PRETTIER=true \
		-e FIX_PYTHON_RUFF=true \
	)

audit: ## Execute security audit
	$(PNPM) audit

audit-fix: ## Execute security audit and fix
	$(PNPM) audit --fix=update

quality: ## Execute deterministic quality checks
	$(PNPM) quality

check-knip: ## Validate unused files and dependencies
	$(PNPM) check:knip

check-structure: ## Validate class ownership and package entrypoints
	$(PNPM) check:structure

check-architecture: ## Validate architecture rules
	$(PNPM) check:architecture

check-contracts: ## Validate workflow and action contracts
	$(PNPM) check:contracts

check-dist: ## Check that the dist folder is up to date
	$(PNPM) check:dist

ci: setup ## Execute all CI quality gates without repairing source or dependencies
	$(MAKE) quality
	$(call run_linter)

# Biome runs through pnpm with the version in the lockfile.
# Keep container linters isolated from host-installed dependencies, as in CI.
define run_linter
	set -eu; \
	DEFAULT_WORKSPACE="$(CURDIR)"; \
	LINTER_IMAGE="linter:latest"; \
	LINTER_GIT_DIR="$$(git -C "$$DEFAULT_WORKSPACE" rev-parse --path-format=absolute --git-common-dir)"; \
	VOLUME="$$DEFAULT_WORKSPACE:$$DEFAULT_WORKSPACE"; \
	DEFAULT_BRANCH="$$(git -C "$$DEFAULT_WORKSPACE" rev-parse --abbrev-ref HEAD 2>/dev/null)"; \
	docker build --platform=linux/amd64 --build-arg UID=$(shell id -u) --build-arg GID=$(shell id -g) --tag $$LINTER_IMAGE .; \
	docker run \
		--platform=linux/amd64 \
		-v $$VOLUME \
		--mount "type=bind,source=$$LINTER_GIT_DIR,target=$$LINTER_GIT_DIR,readonly" \
		--mount "type=tmpfs,destination=$$DEFAULT_WORKSPACE/node_modules" \
		--rm \
		-e DEFAULT_WORKSPACE="$$DEFAULT_WORKSPACE" \
		-e DEFAULT_BRANCH="$$DEFAULT_BRANCH" \
		-e USE_FIND_ALGORITHM=false \
		-e FILTER_REGEX_INCLUDE="$(filter-out $@,$(MAKECMDGOALS))" \
		-e VALIDATE_BIOME_FORMAT=false \
		-e VALIDATE_BIOME_LINT=false \
		$(1) \
		$$LINTER_IMAGE
endef

#############################
# Argument fix workaround
#############################
%:
	@:
