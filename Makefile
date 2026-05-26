# Nexural_Automation — top-level Makefile
# Run `make help` for the menu.

SHELL := /bin/bash
.DEFAULT_GOAL := help

PY_DIR := platforms/python/research/nexural-research
DEMO_CSV := examples/demo_nq_trades.csv
REPORT_OUT := /tmp/nexural-demo-report.html

# ---------------------------------------------------------------------------
# Help (auto-generated from `## ` doc comments)
# ---------------------------------------------------------------------------
.PHONY: help
help: ## Show this help menu
	@echo ""
	@echo "Nexural_Automation — common tasks"
	@echo "---------------------------------"
	@awk 'BEGIN {FS = ":.*?## "} /^[a-zA-Z0-9_.-]+:.*?## / {printf "  \033[36m%-18s\033[0m %s\n", $$1, $$2}' $(MAKEFILE_LIST)
	@echo ""
	@echo "Demo data:  $(DEMO_CSV)"
	@echo "Try:        make setup && make smoke"
	@echo ""

# ---------------------------------------------------------------------------
# Setup
# ---------------------------------------------------------------------------
.PHONY: setup
setup: ## Install the Python research package + dev tooling
	cd $(PY_DIR) && pip install -e ".[dev,mcp]"

.PHONY: setup-min
setup-min: ## Install runtime only (no dev tools, no MCP extras)
	cd $(PY_DIR) && pip install -e .

# ---------------------------------------------------------------------------
# Demo / quickstart
# ---------------------------------------------------------------------------
.PHONY: smoke
smoke: ## Run the gauntlet on the bundled demo CSV (zero-config)
	cd $(PY_DIR) && python -m nexural_research.cli gauntlet \
	  --input ../../../../$(DEMO_CSV) \
	  --strategy-name DemoNQScalp \
	  --symbol NQ \
	  --min-trades 100

.PHONY: report
report: ## Generate an HTML report from the bundled demo CSV
	cd $(PY_DIR) && python -m nexural_research.cli report \
	  --input ../../../../$(DEMO_CSV) \
	  --out $(REPORT_OUT)
	@echo ""
	@echo "📄 Report written to: $(REPORT_OUT)"

.PHONY: gauntlet
gauntlet: ## Run the gauntlet against your own CSV (usage: make gauntlet CSV=path/to/trades.csv)
	@if [ -z "$(CSV)" ]; then \
	  echo "❌ Please pass CSV=path/to/your/trades.csv"; exit 1; \
	fi
	cd $(PY_DIR) && python -m nexural_research.cli gauntlet --input $(abspath $(CSV))

# ---------------------------------------------------------------------------
# Quality & tests
# ---------------------------------------------------------------------------
.PHONY: test
test: ## Run the fast test suite (skips e2e)
	cd $(PY_DIR) && pytest tests/ --ignore=tests/e2e -q

.PHONY: test-all
test-all: ## Run the full test suite including e2e
	cd $(PY_DIR) && pytest tests/ -q

.PHONY: lint
lint: ## Lint with ruff
	cd $(PY_DIR) && ruff check .

.PHONY: fmt
fmt: ## Auto-format with ruff
	cd $(PY_DIR) && ruff format .

.PHONY: quality-gate
quality-gate: ## Run the full quality gate (used in CI)
	cd $(PY_DIR) && python -m nexural_research.cli quality-gate --threshold 0.95 --json --fast

# ---------------------------------------------------------------------------
# MCP server
# ---------------------------------------------------------------------------
.PHONY: mcp-smoke
mcp-smoke: ## Smoke-test the MCP server (lists tools)
	cd $(PY_DIR) && python -m nexural_research.cli mcp-smoke

.PHONY: mcp-serve
mcp-serve: ## Start the MCP server (stdio)
	cd $(PY_DIR) && python -m nexural_research.cli mcp

# ---------------------------------------------------------------------------
# Housekeeping
# ---------------------------------------------------------------------------
.PHONY: clean
clean: ## Remove caches and build artifacts
	find . -type d -name __pycache__ -prune -exec rm -rf {} +
	find . -type d -name .pytest_cache -prune -exec rm -rf {} +
	find . -type d -name .ruff_cache -prune -exec rm -rf {} +
	find . -type d -name "*.egg-info" -prune -exec rm -rf {} +
	rm -f $(REPORT_OUT)
