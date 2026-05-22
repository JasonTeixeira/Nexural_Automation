# Install Matrix

## Windows

```powershell
git clone https://github.com/JasonTeixeira/Nexural_Automation.git
cd Nexural_Automation
$env:SETUPTOOLS_USE_DISTUTILS = "stdlib"
py -3.11 -m pip install -e ".\platforms\python\research\nexural-research[dev,mcp]"
.\scripts\start-local-stack.ps1
```

## macOS

```bash
git clone https://github.com/JasonTeixeira/Nexural_Automation.git
cd Nexural_Automation
SETUPTOOLS_USE_DISTUTILS=stdlib python3.11 -m pip install -e "./platforms/python/research/nexural-research[dev,mcp]"
./scripts/start-local-stack.sh
```

## Linux

```bash
git clone https://github.com/JasonTeixeira/Nexural_Automation.git
cd Nexural_Automation
SETUPTOOLS_USE_DISTUTILS=stdlib python3.11 -m pip install -e "./platforms/python/research/nexural-research[dev,mcp]"
./scripts/start-local-stack.sh
```

## Docker

```bash
cd platforms/python/research/nexural-research
docker compose up --build
```

Default Docker port bindings are localhost-only:

- API: `http://127.0.0.1:8000`
- Postgres: `127.0.0.1:5432`
- Redis: `127.0.0.1:6379`

## MCP Clients

Stdio is the safest default for desktop agents:

```powershell
cd platforms\python\research\nexural-research
py -3.11 -m nexural_research.cli mcp --transport stdio
```

HTTP mode is localhost-only by default:

```powershell
py -3.11 -m nexural_research.cli mcp --transport streamable-http --host 127.0.0.1 --port 8765
```

Install into supported local MCP hosts:

```powershell
nexural-research mcp-install --host all --yes
```
