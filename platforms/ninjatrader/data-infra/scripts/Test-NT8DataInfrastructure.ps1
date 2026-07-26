[CmdletBinding()]
param(
    [string] $Nt8UserDirectory = (Join-Path ([Environment]::GetFolderPath('MyDocuments')) 'NinjaTrader 8'),
    [string[]] $Symbols = @('ES', 'NQ', 'YM', 'RTY', 'CL', 'GC', 'SI', 'HG', 'ZB', 'BTC', 'ETH'),
    [string] $OutputPath
)

$ErrorActionPreference = 'Stop'
$database = Join-Path $Nt8UserDirectory 'db'
$tickRoot = Join-Path $database 'tick'
$replayRoot = Join-Path $database 'replay'
if (-not (Test-Path -LiteralPath $tickRoot -PathType Container)) {
    throw "NT8 tick repository not found: $tickRoot"
}

$symbolsSet = [System.Collections.Generic.HashSet[string]]::new([string[]]$Symbols, [System.StringComparer]::OrdinalIgnoreCase)
$groups = @{}
Get-ChildItem -LiteralPath $tickRoot -Recurse -File -Filter '*.ncd' -Force | ForEach-Object {
    $contract = $_.Directory.Name
    $match = [regex]::Match($contract, '^(?<symbol>[A-Za-z]+)\s+')
    if (-not $match.Success) { return }
    $symbol = $match.Groups['symbol'].Value.ToUpperInvariant()
    if (-not $symbolsSet.Contains($symbol)) { return }
    if (-not $groups.ContainsKey($symbol)) {
        $groups[$symbol] = [ordered]@{ Symbol = $symbol; Contracts = [System.Collections.Generic.HashSet[string]]::new(); Files = 0; Bytes = [int64]0; FirstDate = $null; LastDate = $null; LastFiles = 0; BidFiles = 0; AskFiles = 0 }
    }
    $row = $groups[$symbol]
    [void]$row.Contracts.Add($contract)
    $row.Files++
    $row.Bytes += $_.Length
    $kind = [regex]::Match($_.Name, '\.(?<kind>Last|Bid|Ask)\.ncd$', [System.Text.RegularExpressions.RegexOptions]::IgnoreCase)
    if ($kind.Success) { $row[($kind.Groups['kind'].Value + 'Files')]++ }
    $date = [regex]::Match($_.Name, '^(?<date>\d{8})')
    if ($date.Success) {
        $value = [datetime]::ParseExact($date.Groups['date'].Value, 'yyyyMMdd', $null)
        if ($null -eq $row.FirstDate -or $value -lt $row.FirstDate) { $row.FirstDate = $value }
        if ($null -eq $row.LastDate -or $value -gt $row.LastDate) { $row.LastDate = $value }
    }
}

$replayFiles = @(Get-ChildItem -LiteralPath $replayRoot -Recurse -File -Force -ErrorAction SilentlyContinue)
$result = [ordered]@{
    schema_version = 1
    generated_utc = [datetime]::UtcNow.ToString('o')
    source = 'local_nt8_repository_read_only'
    nt8_user_directory = $Nt8UserDirectory
    raw_data_exported = $false
    symbols = @($groups.Values | Sort-Object Symbol | ForEach-Object {
        [ordered]@{
            symbol = $_.Symbol
            contracts = @($_.Contracts | Sort-Object)
            files = $_.Files
            gib = [math]::Round($_.Bytes / 1GB, 3)
            first_date = if ($null -eq $_.FirstDate) { $null } else { $_.FirstDate.ToString('yyyy-MM-dd') }
            last_date = if ($null -eq $_.LastDate) { $null } else { $_.LastDate.ToString('yyyy-MM-dd') }
            last_files = $_.LastFiles
            bid_files = $_.BidFiles
            ask_files = $_.AskFiles
        }
    })
    replay = [ordered]@{ files = $replayFiles.Count; gib = [math]::Round((($replayFiles | Measure-Object Length -Sum).Sum / 1GB), 3) }
    limitations = @(
        'File presence and date spans are not proof of session continuity; attach a request-level receipt before a campaign.',
        'Last-only history cannot support historical bid/ask delta, imbalance, absorption, DOM, or queue claims.',
        'This script reads metadata only and never downloads, decodes, exports, or routes market data.'
    )
}

$json = $result | ConvertTo-Json -Depth 8
if ($OutputPath) {
    $parent = Split-Path -Parent $OutputPath
    if ($parent) { New-Item -ItemType Directory -Force -Path $parent | Out-Null }
    # UTF8 is supported by both Windows PowerShell 5.1 and PowerShell 7.
    Set-Content -LiteralPath $OutputPath -Value $json -Encoding utf8
}
$json
