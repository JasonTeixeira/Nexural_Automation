# Security Hardening

Nexural Automation is a local research and education system. Treat MCP access as agent access to your filesystem and strategy data.

## Defaults

- API server binds to `127.0.0.1`.
- Authentication is disabled for solo local research unless `NEXURAL_AUTH_ENABLED=true`.
- API keys must be sent through `Authorization: Bearer <key>`.
- Query-string API keys are not accepted.
- `.mcp.json`, `.env`, local databases, reports, and exports must not be committed.

## Recommended Local Research Setup

```powershell
$env:SETUPTOOLS_USE_DISTUTILS = "stdlib"
$env:NEXURAL_AUTH_ENABLED = "false"
$env:NEXURAL_ALLOWED_DATA_DIRS = "C:\Users\Jason\Documents\NexuralExports;C:\Users\Jason\Downloads"
```

## Recommended Shared Setup

```powershell
$env:NEXURAL_AUTH_ENABLED = "true"
$env:NEXURAL_API_KEYS = "<long-random-local-key>"
$env:NEXURAL_ALLOWED_DATA_DIRS = "C:\Users\Jason\Documents\NexuralExports"
$env:NEXURAL_CORS_ORIGINS = "http://localhost:5173,http://127.0.0.1:8000"
```

## MCP File Scope

Always set `NEXURAL_ALLOWED_DATA_DIRS` when an agent can call MCP tools. This limits CSV and report access to approved directories.

Windows example:

```text
C:\Exports;D:\Research
```

macOS/Linux example:

```text
/Users/jason/exports:/mnt/research
```

## CI Gates

The public CI surface includes:

- Python lint and tests.
- Public MVP quality gate at threshold `0.95`.
- MCP smoke through the local quality gate.
- Bandit scan for higher-confidence issues.
- Secret scanning for tracked files.
- Schema validation for strategy and bridge examples.
- Locked Python dependency audit through `pip-audit -r requirements/py311-ci-lock.txt`.
- Frontend typecheck, build, and `npm audit --audit-level=moderate`.
- Docker/Trivy fixable high/critical findings fail CI; unfixed base-image findings require a base-image migration note.
- Docs and metadata validation.

## Known Residual Risk

The frontend dependency tree is upgraded to Vite 8 and currently has zero `npm audit --audit-level=moderate` findings. The Vite dev and preview servers are explicitly bound to `127.0.0.1`; do not expose local dev servers to untrusted networks.

`pip-audit` runs against the locked project dependency file before release tagging. Running it against a global workstation environment can report unrelated packages and is not the release signal.
