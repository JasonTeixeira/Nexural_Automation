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
- Frontend typecheck, build, and `npm audit --audit-level=high`.
- Docs and metadata validation.

## Known Residual Risk

The frontend dependency tree currently has no high or critical npm audit findings. Moderate Vite/esbuild development-server advisories remain unless the project accepts a breaking Vite major upgrade. Do not expose the Vite dev server to untrusted networks.

`pip-audit` should be run against a locked project environment before release tagging. Running it against a global workstation environment can report unrelated packages.

