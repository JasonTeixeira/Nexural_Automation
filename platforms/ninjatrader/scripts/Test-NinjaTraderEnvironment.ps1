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
if ($installedVersion -notin $compileTested) {
    throw "NinjaTrader $installedVersion is not in the native-compile-tested set: $($compileTested -join ', ')"
}
if ($support.live_routing -ne $false) {
    throw 'Safety manifest must explicitly disable live routing.'
}
if (@($support.routing_scope) -join ',' -ne 'Sim101,Playback101') {
    throw 'Safety manifest account scope has changed.'
}

[pscustomobject]@{
    InstalledVersion = $installedVersion
    NativeCompileTarget = $true
    DesktopImportVerified = $installedVersion -in @($support.ninjatrader.desktop_import_verified_versions)
    CoreAssembly = $coreAssembly
    RoutingScope = @($support.routing_scope) -join ', '
    LiveRouting = $support.live_routing
} | Format-List
