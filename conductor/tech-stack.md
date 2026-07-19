# Technical stack

## Runtime

- Python 3.11 only for research, API, MCP, Academy orchestration, and repository tooling.
- NinjaScript/C# for NinjaTrader 8 indicators, strategies, AddOns, execution, and risk adapters.
- Portable .NET projects for deterministic execution/risk logic that does not require proprietary DLLs.
- React 18, TypeScript, Vite, Tailwind CSS, Space Grotesk, JetBrains Mono, and Lucide for the dashboard.
- Node.js 22 for frontend builds and browser testing.

## Validation

- Pytest, Hypothesis, coverage, Ruff, MyPy, Bandit, pip-audit, CodeQL, Trivy.
- Portable .NET unit and fault tests plus a Windows/NT8 self-hosted compile/import gate.
- Playwright and axe-core at 375, 768, 1024, and 1440 pixel widths.
- JSON Schema 2020-12 for contracts, Academy packages, and beta evidence.

## Distribution

- Python wheel and sdist through PyPI trusted publishing.
- Multi-architecture GHCR container only after the immutable release gate.
- Versioned NinjaScript import ZIPs with checksums, SBOM, and Sigstore attestations.
- Release Please manifest mode as the canonical version/changelog controller.

## Trust boundaries

- Hosted HTTP APIs consume opaque artifact IDs; local filesystem paths are local-adapter only.
- Academy execution is sandboxed and cannot submit live orders.
- Public NT8 bridges accept only Playback101 and Sim101 by default.
- Release publishing consumes artifacts built by successful release gates, never an untested rebuild.
