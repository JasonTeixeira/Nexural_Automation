[CmdletBinding()]
param(
    [switch] $SkipNativeCompile,
    [string] $NinjaTraderBin = 'C:\Program Files\NinjaTrader 8\bin',
    [string] $NinjaTraderCustomBin = "$env:USERPROFILE\Documents\NinjaTrader 8\bin\Custom\bin\Release"
)

$ErrorActionPreference = 'Stop'
$PSNativeCommandUseErrorActionPreference = $true
$root = Split-Path -Parent $PSScriptRoot

dotnet run --project (Join-Path $root 'tests\Nexural.NT8.Core.FaultSuite\Nexural.NT8.Core.FaultSuite.csproj') --configuration Release

if (-not $SkipNativeCompile) {
    $coreAssembly = Join-Path $NinjaTraderBin 'NinjaTrader.Core.dll'
    $customAssembly = Join-Path $NinjaTraderCustomBin 'NinjaTrader.Custom.dll'
    if (-not (Test-Path -LiteralPath $coreAssembly -PathType Leaf)) {
        throw "NinjaTrader.Core.dll not found at $coreAssembly"
    }
    if (-not (Test-Path -LiteralPath $customAssembly -PathType Leaf)) {
        throw "NinjaTrader.Custom.dll not found at $customAssembly. Compile once in NinjaScript Editor or pass -SkipNativeCompile."
    }
    dotnet build (Join-Path $root 'tests\Nexural.NT8.AdapterCompile\Nexural.NT8.AdapterCompile.csproj') `
        --configuration Release `
        --property:NinjaTraderBin="$NinjaTraderBin" `
        --property:NinjaTraderCustomBin="$NinjaTraderCustomBin"
}

Write-Host 'Nexural NT8 safety checks passed.' -ForegroundColor Green
