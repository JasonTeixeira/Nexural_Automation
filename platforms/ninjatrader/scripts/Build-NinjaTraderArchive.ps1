[CmdletBinding()]
param(
    [string] $OutputDirectory,
    [switch] $SkipTests,
    [switch] $SkipNativeCompile
)

$ErrorActionPreference = 'Stop'
$PSNativeCommandUseErrorActionPreference = $true
$root = Split-Path -Parent $PSScriptRoot
if ([string]::IsNullOrWhiteSpace($OutputDirectory)) {
    $OutputDirectory = Join-Path $root 'artifacts'
}
$OutputDirectory = [IO.Path]::GetFullPath($OutputDirectory)
New-Item -ItemType Directory -Path $OutputDirectory -Force | Out-Null

if (-not $SkipTests) {
    & (Join-Path $PSScriptRoot 'Test-NT8SafetySpine.ps1') -SkipNativeCompile:$SkipNativeCompile
}

$supportPath = Join-Path $root 'packaging\supported-versions.json'
$support = Get-Content -LiteralPath $supportPath -Raw | ConvertFrom-Json
$version = $support.ninjatrader.minimum_version
$archivePath = Join-Path $OutputDirectory "Nexural-NT8-Safety-Spine-$version.zip"
$staging = Join-Path $OutputDirectory ('.stage-' + [Guid]::NewGuid().ToString('N'))

try {
    $addOnRoot = Join-Path $staging 'bin\Custom\AddOns\NexuralSafetySpine'
    $coreRoot = Join-Path $addOnRoot 'Core'
    $strategyRoot = Join-Path $staging 'bin\Custom\Strategies'
    New-Item -ItemType Directory -Path $coreRoot -Force | Out-Null
    New-Item -ItemType Directory -Path $strategyRoot -Force | Out-Null

    Copy-Item -LiteralPath (Join-Path $root 'adapters\NinjaScript\NexuralSimBridgeAddOn.cs') -Destination $addOnRoot
    Copy-Item -LiteralPath (Join-Path $root 'adapters\NinjaScript\NexuralSafeManagedStrategy.cs') -Destination $strategyRoot
    Get-ChildItem -LiteralPath (Join-Path $root 'src\Nexural.NT8.Core') -Filter '*.cs' | ForEach-Object {
        Copy-Item -LiteralPath $_.FullName -Destination $coreRoot
    }

    $infoTemplate = Get-Content -LiteralPath (Join-Path $root 'packaging\Info.xml.template') -Raw
    $info = $infoTemplate.Replace('{{NINJATRADER_VERSION}}', $version)
    Set-Content -LiteralPath (Join-Path $staging 'Info.xml') -Value $info -Encoding UTF8
    Copy-Item -LiteralPath $supportPath -Destination (Join-Path $staging 'Nexural-supported-versions.json')

    $payloadFiles = Get-ChildItem -LiteralPath $staging -Recurse -File | Where-Object Name -ne 'Nexural-archive-manifest.sha256'
    $manifestLines = foreach ($file in $payloadFiles | Sort-Object FullName) {
        $relative = $file.FullName.Substring($staging.Length + 1).Replace('\', '/')
        $hash = (Get-FileHash -LiteralPath $file.FullName -Algorithm SHA256).Hash.ToLowerInvariant()
        "$hash  $relative"
    }
    Set-Content -LiteralPath (Join-Path $staging 'Nexural-archive-manifest.sha256') -Value $manifestLines -Encoding ASCII

    if (Test-Path -LiteralPath $archivePath -PathType Leaf) {
        Remove-Item -LiteralPath $archivePath -Force
    }
    Add-Type -AssemblyName System.IO.Compression
    Add-Type -AssemblyName System.IO.Compression.FileSystem
    $fixedTimestamp = [DateTimeOffset]::new(1980, 1, 1, 0, 0, 0, [TimeSpan]::Zero)
    $archiveStream = [IO.File]::Open($archivePath, [IO.FileMode]::CreateNew)
    try {
        $archive = [IO.Compression.ZipArchive]::new(
            $archiveStream,
            [IO.Compression.ZipArchiveMode]::Create,
            $false
        )
        try {
            foreach ($file in Get-ChildItem -LiteralPath $staging -Recurse -File | Sort-Object FullName) {
                $entryName = $file.FullName.Substring($staging.Length + 1).Replace('\', '/')
                $entry = $archive.CreateEntry($entryName, [IO.Compression.CompressionLevel]::Optimal)
                $entry.LastWriteTime = $fixedTimestamp
                $sourceStream = [IO.File]::OpenRead($file.FullName)
                $entryStream = $entry.Open()
                try {
                    $sourceStream.CopyTo($entryStream)
                }
                finally {
                    $entryStream.Dispose()
                    $sourceStream.Dispose()
                }
            }
        }
        finally {
            $archive.Dispose()
        }
    }
    finally {
        $archiveStream.Dispose()
    }

    $zip = [IO.Compression.ZipFile]::OpenRead($archivePath)
    try {
        $entries = @($zip.Entries | ForEach-Object { $_.FullName.Replace('\', '/') })
        $required = @(
            'Info.xml',
            'Nexural-supported-versions.json',
            'Nexural-archive-manifest.sha256',
            'bin/Custom/AddOns/NexuralSafetySpine/NexuralSimBridgeAddOn.cs',
            'bin/Custom/Strategies/NexuralSafeManagedStrategy.cs'
        )
        foreach ($entry in $required) {
            if ($entry -notin $entries) { throw "Archive is missing $entry" }
        }
        if (-not ($entries | Where-Object { $_ -like 'bin/Custom/AddOns/NexuralSafetySpine/Core/*.cs' })) {
            throw 'Archive contains no portable core sources.'
        }
    }
    finally {
        $zip.Dispose()
    }

    $archiveHash = (Get-FileHash -LiteralPath $archivePath -Algorithm SHA256).Hash.ToLowerInvariant()
    Write-Host "Created $archivePath" -ForegroundColor Green
    Write-Host "SHA256 $archiveHash"
}
finally {
    if (Test-Path -LiteralPath $staging -PathType Container) {
        $resolvedStage = [IO.Path]::GetFullPath($staging)
        if (-not $resolvedStage.StartsWith($OutputDirectory + [IO.Path]::DirectorySeparatorChar, [StringComparison]::OrdinalIgnoreCase)) {
            throw "Refusing to remove unexpected staging path: $resolvedStage"
        }
        Remove-Item -LiteralPath $resolvedStage -Recurse -Force
    }
}
