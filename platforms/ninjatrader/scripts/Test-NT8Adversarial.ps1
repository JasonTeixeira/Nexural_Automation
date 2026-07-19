[CmdletBinding()]
param(
    [string] $OutputDirectory
)

$ErrorActionPreference = 'Stop'
$PSNativeCommandUseErrorActionPreference = $true
$root = Split-Path -Parent $PSScriptRoot
if ([string]::IsNullOrWhiteSpace($OutputDirectory)) {
    $OutputDirectory = Join-Path $root 'artifacts\qualification'
}
$OutputDirectory = [IO.Path]::GetFullPath($OutputDirectory)
New-Item -ItemType Directory -Path $OutputDirectory -Force | Out-Null

$adversarialPath = Join-Path $OutputDirectory 'adversarial.json'
$mutationPath = Join-Path $OutputDirectory 'mutations.json'

dotnet run --project (Join-Path $root 'tests\Nexural.NT8.Core.AdversarialSuite\Nexural.NT8.Core.AdversarialSuite.csproj') `
    --configuration Release -- --output $adversarialPath
if (Get-Command py -ErrorAction SilentlyContinue) {
    py -3.11 (Join-Path $PSScriptRoot 'Test-NT8Mutations.py') --root $root --output $mutationPath --minimum-score 85
}
else {
    python (Join-Path $PSScriptRoot 'Test-NT8Mutations.py') --root $root --output $mutationPath --minimum-score 85
}

$adversarial = Get-Content -LiteralPath $adversarialPath -Raw | ConvertFrom-Json
$mutations = Get-Content -LiteralPath $mutationPath -Raw | ConvertFrom-Json
if ($adversarial.property_cases -lt 50000 -or $adversarial.fuzz_cases -lt 50000) {
    throw 'Adversarial suite did not execute the required case counts.'
}
if ($adversarial.disconnect_rto_seconds -gt 5 -or $adversarial.restart_rto_seconds -gt 30) {
    throw 'Automated recovery-time objective failed.'
}
if ($mutations.mutation_score_percent -lt 85 -or $mutations.surviving_critical_mutants -ne 0) {
    throw 'Mutation quality gate failed.'
}

Write-Host 'Nexural NT8 adversarial qualification passed.' -ForegroundColor Green
