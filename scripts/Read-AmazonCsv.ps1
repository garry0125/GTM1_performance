$ErrorActionPreference = "Stop"
. (Join-Path $PSScriptRoot "Get-DataFolderFile.ps1")
. (Join-Path $PSScriptRoot "Read-MetaXlsx.ps1")

$script:AmazonTypeColumn = 'adType'
$script:AmazonDateColIndex = 0
$script:AmazonCampaignColIndex = 3

$script:AmazonHeaderAliases = @{
    'Spend'              = 'Spend'
    'Date'               = 'Date'
    'Campaign Name'      = 'Campaign Name'
    'Impressions'        = 'Impressions'
    'Clicks'             = 'Clicks'
    '7 Day Total Orders' = '7 Day Total Orders'
    '7 Day Total Sales'  = '7 Day Total Sales'
}

function Convert-AmazonDateValue {
    param([string]$Value)

    $s = ([string]$Value).Trim()
    if ([string]::IsNullOrWhiteSpace($s)) { return '' }

    if ($s -match '^(\d{4})-(\d{2})-(\d{2})') {
        return "$($Matches[1])-$($Matches[2])-$($Matches[3])"
    }

    $serial = 0.0
    if ([double]::TryParse($s, [System.Globalization.NumberStyles]::Any, [System.Globalization.CultureInfo]::InvariantCulture, [ref]$serial)) {
        if ($serial -gt 30000 -and $serial -lt 70000) {
            $base = [datetime]::new(1899, 12, 30)
            return $base.AddDays([int][math]::Floor($serial)).ToString('yyyy-MM-dd')
        }
    }

    try {
        $culture = [System.Globalization.CultureInfo]::GetCultureInfo('en-US')
        $dt = [datetime]::Parse($s, $culture)
        return $dt.ToString('yyyy-MM-dd')
    }
    catch {
        return $s
    }
}

function Get-AmazonSbHeaderMap {
    param([string[]]$SpColumns)

    if (-not $SpColumns -or $SpColumns.Count -eq 0) { return @{} }

    $englishKeys = @(
        'Date',
        'Portfolio name',
        'Campaign Name',
        'Country',
        'Currency',
        'Impressions',
        'Clicks',
        'Click-Thru Rate (CTR)',
        'Spend',
        'Cost Per Click (CPC)',
        '14 Day Total Orders (#)',
        'Total Advertising Cost of Sales (ACOS)',
        'Total Return on Advertising Spend (ROAS)',
        '14 Day Total Sales'
    )
    $spIndices = @(0, 1, 3, 5, 7, 11, 13, 15, 16, 18, 20, 21, 22, 23)
    $map = @{}

    for ($i = 0; $i -lt $englishKeys.Count; $i++) {
        $idx = $spIndices[$i]
        if ($idx -ge $SpColumns.Count) { continue }
        $target = [string]$SpColumns[$idx]
        if ([string]::IsNullOrWhiteSpace($target)) { continue }
        $map[$englishKeys[$i]] = $target
        $map[$englishKeys[$i].Trim()] = $target
    }

    return $map
}

function Apply-AmazonSbHeaderMap {
    param(
        $Row,
        [hashtable]$HeaderMap
    )

    if (-not $HeaderMap -or $HeaderMap.Count -eq 0) { return $Row }

    $renamed = [ordered]@{}
    foreach ($key in $Row.Keys) {
        $lookup = ([string]$key).Trim()
        $newKey = if ($HeaderMap.ContainsKey($lookup)) { $HeaderMap[$lookup] } else { $key }
        $renamed[$newKey] = $Row[$key]
    }
    return $renamed
}

function Get-CsvHeaders {
    param($FirstRow)

    return @($FirstRow.PSObject.Properties | ForEach-Object { ([string]$_.Name).Trim() })
}

function Get-AmazonRowFieldValue {
    param(
        $Row,
        [string]$Header
    )

    if (-not $Row -or [string]::IsNullOrWhiteSpace($Header)) { return '' }

    $target = $Header.Trim()
    if ($Row.PSObject.Properties.Name -contains $Header) {
        return [string]$Row.$Header
    }
    foreach ($prop in $Row.PSObject.Properties) {
        if ([string]$prop.Name.Trim() -eq $target) {
            return [string]$prop.Value
        }
    }
    return ''
}

function Read-AmazonCsvRows {
    param(
        [string]$Path,
        [string]$AdType
    )

    $rows = @(Import-Csv -LiteralPath $Path -Encoding UTF8)
    return @(Convert-AmazonImportedRows -Rows $rows -AdType $AdType)
}

function Read-AmazonXlsxRows {
    param(
        [string]$Path,
        [string]$AdType,
        [string[]]$SpColumns = @()
    )

    $parsed = Read-MetaXlsx -Path $Path
    if (-not $parsed -or $parsed -is [array]) {
        return @()
    }
    if (-not $parsed.Headers -or $parsed.Headers.Count -eq 0) {
        return @()
    }

    $headerMap = Get-AmazonSbHeaderMap -SpColumns $SpColumns
    $converted = @($parsed.Rows | ForEach-Object {
        $src = $_
        $obj = New-Object PSObject
        foreach ($header in $parsed.Headers) {
            $h = ([string]$header).Trim()
            if (-not $h) { continue }
            $mappedHeader = if ($headerMap.ContainsKey($h)) { $headerMap[$h] } else { $h }
            $val = if ($src.ContainsKey($header)) { $src[$header] } elseif ($src.ContainsKey($h)) { $src[$h] } else { '' }
            $obj | Add-Member -NotePropertyName $mappedHeader -NotePropertyValue $val -Force
        }
        $obj
    })
    return @(Convert-AmazonImportedRows -Rows $converted -AdType $AdType)
}

function Convert-AmazonImportedRows {
    param(
        [array]$Rows,
        [string]$AdType
    )

    if ($Rows.Count -eq 0) { return @() }

    $headers = Get-CsvHeaders -FirstRow $Rows[0]
    $dateHeader = $headers[$script:AmazonDateColIndex]
    $campaignHeader = if ($headers.Count -gt $script:AmazonCampaignColIndex) {
        $headers[$script:AmazonCampaignColIndex]
    } else {
        ''
    }

    $parsed = New-Object System.Collections.Generic.List[object]

    foreach ($row in $Rows) {
        $dateVal = if ($dateHeader) { Get-AmazonRowFieldValue -Row $row -Header $dateHeader } else { '' }
        $campaignVal = if ($campaignHeader) { Get-AmazonRowFieldValue -Row $row -Header $campaignHeader } else { '' }
        if ([string]::IsNullOrWhiteSpace($dateVal) -or [string]::IsNullOrWhiteSpace($campaignVal)) { continue }

        $record = [ordered]@{ $script:AmazonTypeColumn = $AdType }
        foreach ($header in $headers) {
            if ([string]::IsNullOrWhiteSpace($header)) { continue }
            $value = Get-AmazonRowFieldValue -Row $row -Header $header
            if ($header -eq $dateHeader) {
                $value = Convert-AmazonDateValue $value
            }
            $record[$header] = $value
        }
        [void]$parsed.Add($record)
    }

    return $parsed.ToArray()
}

function Read-AmazonDataRows {
    param(
        [string]$Path,
        [string]$AdType,
        [string[]]$SpColumns = @()
    )

    $ext = [System.IO.Path]::GetExtension($Path).ToLowerInvariant()
    if ($ext -eq '.xlsx') {
        return Read-AmazonXlsxRows -Path $Path -AdType $AdType -SpColumns $SpColumns
    }
    return Read-AmazonCsvRows -Path $Path -AdType $AdType
}

function Get-AmazonUnionColumns {
    param(
        [array]$SpRows,
        [array]$SbRows
    )

    $ordered = New-Object System.Collections.Generic.List[string]
    $seen = New-Object 'System.Collections.Generic.HashSet[string]'

    [void]$seen.Add($script:AmazonTypeColumn)
    [void]$ordered.Add($script:AmazonTypeColumn)

    $firstSp = if ($SpRows.Count -gt 0) { $SpRows[0] } else { $null }
    $firstSb = if ($SbRows.Count -gt 0) { $SbRows[0] } else { $null }
    foreach ($source in @($firstSp, $firstSb)) {
        if (-not $source) { continue }
        foreach ($key in $source.Keys) {
            if ($key -eq $script:AmazonTypeColumn) { continue }
            if ($seen.Add([string]$key)) {
                [void]$ordered.Add([string]$key)
            }
        }
    }

    foreach ($row in (@($SpRows) + @($SbRows))) {
        foreach ($key in $row.Keys) {
            if ($seen.Add([string]$key)) {
                [void]$ordered.Add([string]$key)
            }
        }
    }

    return @($ordered)
}

function Expand-AmazonRow {
    param(
        $Row,
        [string[]]$Columns
    )

    $record = [ordered]@{}
    foreach ($col in $Columns) {
        $record[$col] = if ($Row.Contains($col)) { $Row[$col] } else { '' }
    }
    return $record
}

function Export-AmazonDataJson {
    param(
        [string]$RootDir,
        [string]$OutputPath
    )

    $amazonDir = Join-Path $RootDir "Amazon"

    $spFile = Get-DataFolderFile -Dir (Join-Path $amazonDir "SP") -Extensions @('.csv', '.xlsx')
    $sbFile = Get-DataFolderFile -Dir (Join-Path $amazonDir "SB") -Extensions @('.csv', '.xlsx')

    if (-not $spFile -and -not $sbFile) {
        throw "Amazon\SP, Amazon\SB 폴더에 데이터 파일이 없습니다."
    }

    $spRows = @()
    $sbRows = @()
    $spColumns = @()
    if ($spFile) {
        try {
            if ($spFile.Name.ToLowerInvariant().EndsWith('.csv')) {
                $spColumns = @(Get-CsvHeaders -FirstRow (Import-Csv -LiteralPath $spFile.Path -Encoding UTF8 | Select-Object -First 1))
            }
            $spRows = @(Read-AmazonDataRows -Path $spFile.Path -AdType 'SP')
            if ($spRows.Count -gt 0 -and $spColumns.Count -eq 0) {
                $spColumns = @($spRows[0].Keys | Where-Object { $_ -ne $script:AmazonTypeColumn })
            }
        }
        catch { Write-Warning "SP read failed: $($_.Exception.Message)" }
    }
    if ($sbFile) {
        try { $sbRows = @(Read-AmazonDataRows -Path $sbFile.Path -AdType 'SB' -SpColumns $spColumns) }
        catch { Write-Warning "SB read failed: $($_.Exception.Message)" }
    }

    if ($spRows.Count -eq 0 -and $sbRows.Count -eq 0) {
        throw "Amazon SP/SB 파일에서 읽을 수 있는 데이터 행이 없습니다."
    }

    $columns = Get-AmazonUnionColumns -SpRows $spRows -SbRows $sbRows
    $merged = @($spRows + $sbRows | ForEach-Object { Expand-AmazonRow -Row $_ -Columns $columns })

    $payload = [ordered]@{
        sourceFiles = [ordered]@{
            SP = if ($spFile) { $spFile.Name } else { $null }
            SB = if ($sbFile) { $sbFile.Name } else { $null }
        }
        updatedAt  = (Get-Date).ToString("yyyy-MM-ddTHH:mm:ss")
        spColumns  = $spColumns
        sbColumns  = if ($sbFile) {
            $sbParsed = Read-MetaXlsx -Path $sbFile.Path
            if ($sbParsed -and -not ($sbParsed -is [array]) -and $sbParsed.Headers) {
                @($sbParsed.Headers | ForEach-Object { ([string]$_).Trim() } | Where-Object { $_ })
            } else { @() }
        } else { @() }
        columns    = $columns
        rows       = $merged
    }

    $json = $payload | ConvertTo-Json -Depth 8 -Compress
    $utf8NoBom = New-Object System.Text.UTF8Encoding $false
    [System.IO.File]::WriteAllText($OutputPath, $json, $utf8NoBom)

    $jsPath = [System.IO.Path]::ChangeExtension($OutputPath, ".js")
    [System.IO.File]::WriteAllText($jsPath, "window.AMAZON_DATA = $json;", $utf8NoBom)

    return $payload
}
