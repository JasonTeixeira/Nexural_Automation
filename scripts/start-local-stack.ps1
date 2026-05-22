param(
  [int]$ApiPort = 8000,
  [int]$McpPort = 8765,
  [int]$FrontendPort = 3010,
  [switch]$SkipInstall
)

$ErrorActionPreference = "Stop"
$repoRoot = Split-Path -Parent $PSScriptRoot
$researchRoot = Join-Path $repoRoot "platforms\python\research\nexural-research"
$frontendRoot = Join-Path $researchRoot "frontend"

if (-not $SkipInstall) {
  Push-Location $researchRoot
  $env:SETUPTOOLS_USE_DISTUTILS = "stdlib"
  py -3.11 -m pip install -e ".[dev,mcp]"
  Pop-Location

  Push-Location $frontendRoot
  npm ci
  Pop-Location
}

if (-not $env:NEXURAL_AUTH_ENABLED) {
  $env:NEXURAL_AUTH_ENABLED = "false"
}

$apiArgs = "-NoExit", "-Command", "cd `"$researchRoot`"; `$env:SETUPTOOLS_USE_DISTUTILS='stdlib'; py -3.11 -m nexural_research.cli serve --host 127.0.0.1 --port $ApiPort"
$mcpArgs = "-NoExit", "-Command", "cd `"$researchRoot`"; `$env:SETUPTOOLS_USE_DISTUTILS='stdlib'; py -3.11 -m nexural_research.cli mcp --transport streamable-http --host 127.0.0.1 --port $McpPort"
$frontArgs = "-NoExit", "-Command", "cd `"$frontendRoot`"; npm run dev -- --host 127.0.0.1 --port $FrontendPort"

Start-Process powershell -ArgumentList $apiArgs -WindowStyle Hidden
Start-Process powershell -ArgumentList $mcpArgs -WindowStyle Hidden
Start-Process powershell -ArgumentList $frontArgs -WindowStyle Hidden

Write-Host "Nexural local stack started:"
Write-Host "  API:      http://127.0.0.1:$ApiPort"
Write-Host "  MCP HTTP: http://127.0.0.1:$McpPort/mcp"
Write-Host "  UI:       http://127.0.0.1:$FrontendPort"
