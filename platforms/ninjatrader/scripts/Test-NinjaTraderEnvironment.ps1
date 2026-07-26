[CmdletBinding()]
param(
    [string] $NinjaTraderBin = 'C:\Program Files\NinjaTrader 8\bin'
)

$ErrorActionPreference = 'Stop'
$root = Split-Path -Parent $PSScriptRoot
$support = Get-Content -LiteralPath (Join-Path $root 'packaging\supported-versions.json') -Raw | ConvertFrom-Json
$coreAssembly = Join-Path $NinjaTraderBin 'NinjaTrader.Core.dll'

if (-not (Test-Path -LiteralPath $coreAssembly -PathType Leaf)) {
    throw "NinjaTrader.Core.dll not found at $coreAssembly"
}

$installedVersion = (Get-Item -LiteralPath $coreAssembly).VersionInfo.FileVersion
$compileTested = @($support.ninjatrader.native_compile_tested_versions)
$qualificationTargets = @($support.ninjatrader.desktop_qualification_target_versions)
if ($installedVersion -notin $qualificationTargets) {
    throw "NinjaTrader $installedVersion is not in the desktop qualification target set: $($qualificationTargets -join ', ')"
}
if ($support.live_routing -ne $false) {
    throw 'Safety manifest must explicitly disable live routing.'
}
if (@($support.routing_scope) -join ',' -ne 'Sim101,Playback101') {
    throw 'Safety manifest account scope has changed.'
}

[pscustomobject]@{
    InstalledVersion = $installedVersion
    NativeCompileBaseline = $installedVersion -in $compileTested
    DesktopQualificationTarget = $true
    CoreAssembly = $coreAssembly
    RoutingScope = @($support.routing_scope) -join ', '
    LiveRouting = $support.live_routing
} | Format-List
