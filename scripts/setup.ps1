$ErrorActionPreference = 'Stop'
$env:SETUPTOOLS_USE_DISTUTILS = 'stdlib'

function Invoke-Checked {
  param(
    [Parameter(Mandatory = $true)][string]$Label,
    [Parameter(Mandatory = $true)][scriptblock]$Command
  )

  & $Command
  if ($LASTEXITCODE -ne 0) {
    throw "[setup] $Label failed with exit code $LASTEXITCODE"
  }
}

$repoRoot = (Resolve-Path "$PSScriptRoot/..").Path
$proj = Join-Path $repoRoot 'platforms/python/research/nexural-research'
$venv = Join-Path $proj '.venv'

Write-Host "[setup] repoRoot: $repoRoot"
Write-Host "[setup] project:  $proj"

Set-Location $proj

if (-not (Get-Command py -ErrorAction SilentlyContinue)) {
  throw '[setup] Python Launcher (py.exe) is required. Install Python 3.11 from python.org.'
}

Invoke-Checked 'Python 3.11 check' { py -3.11 -c "import sys; assert sys.version_info[:2] == (3, 11); print(sys.version)" }

if (-not (Test-Path $venv)) {
  Write-Host '[setup] Creating Python 3.11 venv...'
  Invoke-Checked 'virtual environment creation' { py -3.11 -m venv .venv }
}

$python = Join-Path $venv 'Scripts/python.exe'
Invoke-Checked 'virtual environment version check' {
  & $python -c "import sys; assert sys.version_info[:2] == (3, 11), 'Expected Python 3.11'; print(sys.version)"
}

Write-Host "[setup] Upgrading pip..."
Invoke-Checked 'pip upgrade' { & $python -m pip install --upgrade pip }

Write-Host "[setup] Installing pinned dev dependencies..."
Invoke-Checked 'dependency installation' { & $python -m pip install -r requirements-dev.lock.txt }

Write-Host "[setup] Installing nexural-research (editable)..."
Invoke-Checked 'editable package installation' { & $python -m pip install -e . }

Write-Host "[setup] Running ruff..."
Invoke-Checked 'ruff' { & $python -m ruff check . }

Write-Host "[setup] Running pytest..."
Invoke-Checked 'pytest' { & $python -m pytest -q }

Write-Host "[setup] Generating sample report..."
Invoke-Checked 'sample report generation' {
  & $python -m nexural_research.cli report --input data/exports/sample_trades.csv
}

Write-Host "[setup] Done."
