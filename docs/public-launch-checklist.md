# Public Launch Checklist

## Code

- [ ] `nexural-research quality-gate --threshold 0.95 --json` returns `score: 1.0`.
- [ ] GitHub Actions public MVP gate passes on Windows, macOS, and Linux.
- [ ] No `.mcp.json`, `.env`, database, session, report, or export artifacts are committed.
- [ ] MCP smoke lists all public tools and calls `list_capabilities`.

## Documentation

- [ ] README explains install, MCP, strategy SDK, bridge SDK, gauntlet, costs, and quality gate.
- [ ] `docs/public-mvp-tutorial.md` works from a fresh clone.
- [ ] `docs/gauntlet-failures.md` explains each rejection gate.
- [ ] Examples validate with `validate-strategy` and `validate-bridge`.

## Public Safety

- [ ] No performance claims or implied profitability.
- [ ] Examples are educational and paper-first.
- [ ] Bridge examples cannot route live orders without external proofs.
- [ ] Strategy Lab Automation gateway keeps API keys server-side.
