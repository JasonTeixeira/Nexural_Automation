# Public Launch Checklist

## Code

- [x] `nexural-research quality-gate --threshold 0.95 --json` returns `score: 1.0`.
- [x] GitHub Actions public MVP gate is wired for Windows, macOS, and Linux.
- [ ] No `.mcp.json`, `.env`, database, session, report, or export artifacts are committed.
- [ ] MCP smoke lists all public tools and calls `list_capabilities`.
- [x] Frontend lockfile has no high or critical npm audit findings.
- [x] API binds to `127.0.0.1` by default and requires header-based auth when enabled.

## Documentation

- [x] README explains install, MCP, strategy SDK, bridge SDK, gauntlet, costs, and quality gate.
- [x] `docs/public-mvp-tutorial.md` works from a fresh clone.
- [x] `docs/gauntlet-failures.md` explains each rejection gate.
- [x] Examples validate with `validate-strategy` and `validate-bridge`.
- [x] Public docs site has a polished static landing page at `docs/index.html`.
- [x] Strategy and bridge schemas are published under `schemas/`.

## Public Safety

- [x] No performance claims or implied profitability.
- [x] Examples are educational and paper-first.
- [x] Bridge examples cannot route live orders without external proofs.
- [x] Strategy Lab Automation gateway keeps API keys server-side.

## Remaining Before Tagging

- [ ] Confirm CI green on GitHub after push.
- [ ] Rotate any local API keys that were ever copied into local MCP configs.
- [ ] Add screenshots from the docs site and Strategy Lab Automation screen.
