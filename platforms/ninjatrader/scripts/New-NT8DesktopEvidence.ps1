#Requires -Version 7.4

[Diagnostics.CodeAnalysis.SuppressMessageAttribute('PSAvoidUsingWriteHost', '', Justification = 'Operator-facing evidence tool')]
[CmdletBinding()]
param(
    [Parameter(Mandatory)] [string] $TesterId,
    [Parameter(Mandatory)] [string] $MachineId,
    [Parameter(Mandatory)] [string] $TestedCommit,
    [Parameter(Mandatory)] [string] $NT8Version,
    [Parameter(Mandatory)] [ValidateSet('Playback101', 'Sim101')] [string] $AccountMode,
    [Parameter(Mandatory)] [string] $ProviderProfile,
    [Parameter(Mandatory)] [string] $ArchivePath,
    [Parameter(Mandatory)] [string] $CompileEvidencePath,
    [Parameter(Mandatory)] [string] $ScenarioDirectory,
    [Parameter(Mandatory)] [double] $DisconnectDetectedSeconds,
    [Parameter(Mandatory)] [double] $RestartReconciledSeconds,
    [Parameter(Mandatory)] [string] $RecoveryEvidencePath,
    [Parameter(Mandatory)] [switch] $AttestIndependent,
    [Parameter(Mandatory)] [string] $OutputPath
)

$ErrorActionPreference = 'Stop'
if ($TesterId -notmatch '^tester-[a-f0-9]{12}$') { throw 'TesterId must match tester- plus 12 lowercase hex characters.' }
if ($MachineId -notmatch '^win-[a-f0-9]{12}$') { throw 'MachineId must match win- plus 12 lowercase hex characters.' }
if ($TestedCommit -notmatch '^[a-f0-9]{40}$') { throw 'TestedCommit must be a full lowercase Git SHA.' }
if ($ProviderProfile -notmatch '^provider-[a-f0-9]{12}$') { throw 'ProviderProfile must be pseudonymous.' }
if ($NT8Version -notmatch '^8\.1\.[0-9]+\.[0-9]+$') { throw 'NT8Version must be an exact 8.1 patch version.' }
if ($DisconnectDetectedSeconds -lt 0 -or $DisconnectDetectedSeconds -gt 5) { throw 'Disconnect recovery time must be between 0 and 5 seconds.' }
if ($RestartReconciledSeconds -lt 0 -or $RestartReconciledSeconds -gt 30) { throw 'Restart recovery time must be between 0 and 30 seconds.' }
if (-not $AttestIndependent.IsPresent) { throw 'Independent tester attestation is required.' }

$archive = Get-Item -LiteralPath $ArchivePath -ErrorAction Stop
$compileEvidence = Get-Item -LiteralPath $CompileEvidencePath -ErrorAction Stop
$recoveryEvidence = Get-Item -LiteralPath $RecoveryEvidencePath -ErrorAction Stop
$scenarioFiles = @(Get-ChildItem -LiteralPath $ScenarioDirectory -Filter '*.log' -File | Sort-Object Name)
if ($scenarioFiles.Count -lt 10) { throw 'At least 10 scenario evidence logs are required.' }

$scenarios = @($scenarioFiles | ForEach-Object {
    [ordered]@{
        id = [IO.Path]::GetFileNameWithoutExtension($_.Name).ToLowerInvariant() -replace '[^a-z0-9._-]', '-'
        result = 'pass'
        evidence_sha256 = (Get-FileHash -LiteralPath $_.FullName -Algorithm SHA256).Hash.ToLowerInvariant()
    }
})
if (@($scenarios.id | Sort-Object -Unique).Count -ne $scenarios.Count) { throw 'Scenario evidence IDs must be unique.' }
if (@($scenarios.id | Where-Object { $_ -notmatch '^[a-z0-9][a-z0-9._-]{2,63}$' }).Count -gt 0) { throw 'Every scenario filename must produce a valid 3-64 character evidence ID.' }
$record = [ordered]@{
    schema_version = '1.0.0'
    tester_id = $TesterId
    machine_id = $MachineId
    tested_commit = $TestedCommit
    archive_sha256 = (Get-FileHash -LiteralPath $archive.FullName -Algorithm SHA256).Hash.ToLowerInvariant()
    environment = [ordered]@{
        windows_version = [Environment]::OSVersion.VersionString
        nt8_version = $NT8Version
        provider_profile = $ProviderProfile
    }
    desktop = [ordered]@{
        archive_imported = $true
        global_compile_passed = $true
        preexisting_errors = 0
        evidence_sha256 = (Get-FileHash -LiteralPath $compileEvidence.FullName -Algorithm SHA256).Hash.ToLowerInvariant()
    }
    account_mode = $AccountMode
    scenarios = $scenarios
    recovery = [ordered]@{
        disconnect_detected_seconds = $DisconnectDetectedSeconds
        restart_reconciled_seconds = $RestartReconciledSeconds
        evidence_sha256 = (Get-FileHash -LiteralPath $recoveryEvidence.FullName -Algorithm SHA256).Hash.ToLowerInvariant()
    }
    attestation = [ordered]@{
        independent = $true
        paper_only = $true
        submitted_at = [DateTime]::UtcNow.ToString('O')
    }
}

$resolvedOutput = [IO.Path]::GetFullPath($OutputPath)
$parent = Split-Path -Parent $resolvedOutput
if ([string]::IsNullOrWhiteSpace($parent)) { throw 'OutputPath must have a parent directory.' }
New-Item -ItemType Directory -Path $parent -Force | Out-Null
$json = $record | ConvertTo-Json -Depth 8
$schemaPath = (Resolve-Path -LiteralPath (Join-Path $PSScriptRoot '../../../schemas/desktop-qualification.schema.json')).Path
if (-not ($json | Test-Json -SchemaFile $schemaPath -ErrorAction Stop)) { throw 'Generated desktop evidence does not satisfy its JSON Schema.' }
$json | Set-Content -LiteralPath $resolvedOutput -Encoding UTF8
Write-Host "Created sanitized desktop evidence: $resolvedOutput" -ForegroundColor Green
