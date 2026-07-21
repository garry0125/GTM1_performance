$ErrorActionPreference = "Stop"
. (Join-Path $PSScriptRoot "Get-DataFolderFile.ps1")

function Get-GoogleCsvDelimiter {
    param([string[]]$Lines)

    foreach ($line in $Lines) {
        if ($line -match "`t") { return "`t" }
        if ($line -match ',') { return ',' }
    }
    return "`t"
}

function Read-GoogleCsvRows {
    param(
        [string]$Path,
        [ValidateSet('keyword', 'demandgen')]
        [string]$DatasetKind = 'keyword'
    )

    $tempCopy = Join-Path $env:TEMP ("google_csv_" + [guid]::NewGuid().ToString("N") + ".csv")
    try {
        Copy-Item -LiteralPath $Path -Destination $tempCopy -Force
        $rawLines = [System.IO.File]::ReadAllLines($tempCopy, [System.Text.Encoding]::UTF8)
    }
    finally {
        if (Test-Path -LiteralPath $tempCopy) {
            Remove-Item -LiteralPath $tempCopy -Force -ErrorAction SilentlyContinue
        }
    }
    if (-not $rawLines -or $rawLines.Count -lt 3) {
        return [PSCustomObject]@{ Headers = @(); Rows = @(); ReportTitle = ''; ReportRange = '' }
    }

    $dataLines = @($rawLines | Select-Object -Skip 2 | Where-Object { -not [string]::IsNullOrWhiteSpace($_) })
    if ($dataLines.Count -lt 2) {
        return [PSCustomObject]@{ Headers = @(); Rows = @(); ReportTitle = ''; ReportRange = '' }
    }

    $delimiter = Get-GoogleCsvDelimiter -Lines $dataLines
    $headerLine = $dataLines[0]
    $headers = @($headerLine.Split($delimiter) | ForEach-Object { ([string]$_).Trim().TrimStart([char]0xFEFF) })

    $dateHeader = if ($headers.Count -gt 0) { $headers[0] } else { '' }
    $primaryHeader = switch ($DatasetKind) {
        'demandgen' {
            if ($headers.Count -gt 2) { $headers[2] } else { '' }
        }
        default {
            if ($headers.Count -gt 1) { $headers[1] } else { '' }
        }
    }

    $rows = New-Object System.Collections.Generic.List[object]
    for ($i = 1; $i -lt $dataLines.Count; $i++) {
        $parts = @($dataLines[$i].Split($delimiter))
        if ($parts.Count -eq 0) { continue }

        $record = [ordered]@{}
        for ($c = 0; $c -lt $headers.Count; $c++) {
            $header = $headers[$c]
            if ([string]::IsNullOrWhiteSpace($header)) { continue }
            $value = if ($c -lt $parts.Count) { ([string]$parts[$c]).Trim().Trim('"') } else { '' }
            $record[$header] = $value
        }

        $dateVal = if ($dateHeader) { [string]$record[$dateHeader] } else { '' }
        $primaryVal = if ($primaryHeader) { [string]$record[$primaryHeader] } else { '' }
        if ([string]::IsNullOrWhiteSpace($dateVal) -or [string]::IsNullOrWhiteSpace($primaryVal)) { continue }

        [void]$rows.Add($record)
    }

    return New-Object PSObject -Property @{
        Headers     = $headers
        Rows        = $rows.ToArray()
        ReportTitle = if ($rawLines.Count -gt 0) { ([string]$rawLines[0]).Trim() } else { '' }
        ReportRange = if ($rawLines.Count -gt 1) { ([string]$rawLines[1]).Trim() } else { '' }
    }
}

function Export-GoogleDatasetPayload {
    param(
        $Parsed,
        [string]$SourceName
    )

    $columns = @($Parsed.Headers | Where-Object { -not [string]::IsNullOrWhiteSpace($_) })
    return [ordered]@{
        sourceFile  = $SourceName
        reportTitle = $Parsed.ReportTitle
        reportRange = $Parsed.ReportRange
        columns     = $columns
        rows        = @($Parsed.Rows)
    }
}

function Export-GoogleDataJson {
    param(
        [string]$RootDir,
        [string]$OutputPath
    )

    $keywordSource = Get-UpdateSourceFile -RootDir $RootDir -Keyword "Google_Daily_RAW_keyword_cursor" -Extensions @('.csv')
    $demandGenSource = Get-UpdateSourceFile -RootDir $RootDir -Keyword "Google_Daily_RAW_demandgen_cursor" -Extensions @('.csv')

    if (-not $keywordSource) {
        throw "UPDATE 폴더에 Google_Daily_RAW_keyword_cursor 키워드 csv 파일이 없습니다."
    }

    $keywordParsed = Read-GoogleCsvRows -Path $keywordSource.Path -DatasetKind 'keyword'
    if ($keywordParsed.Rows.Count -eq 0) {
        throw "Google 검색어 CSV 파일에서 읽을 수 있는 데이터 행이 없습니다."
    }

    $keywordDataset = Export-GoogleDatasetPayload -Parsed $keywordParsed -SourceName $keywordSource.Name

    $demandGenDataset = $null
    if ($demandGenSource) {
        $demandGenParsed = Read-GoogleCsvRows -Path $demandGenSource.Path -DatasetKind 'demandgen'
        if ($demandGenParsed.Rows.Count -gt 0) {
            $demandGenDataset = Export-GoogleDatasetPayload -Parsed $demandGenParsed -SourceName $demandGenSource.Name
        }
        else {
            Write-Warning "Google 디맨드젠 CSV 파일에서 읽을 수 있는 데이터 행이 없습니다: $($demandGenSource.Name)"
        }
    }
    else {
        Write-Warning "UPDATE 폴더에 Google_Daily_RAW_demandgen_cursor csv 파일이 없습니다."
    }

    $payload = [ordered]@{
        sourceFiles = [ordered]@{
            keyword   = $keywordSource.Name
            demandGen = if ($demandGenDataset) { $demandGenDataset.sourceFile } else { $null }
        }
        sourceFile  = $keywordDataset.sourceFile
        reportTitle = $keywordDataset.reportTitle
        reportRange = $keywordDataset.reportRange
        updatedAt   = (Get-Date).ToString("yyyy-MM-ddTHH:mm:ss")
        columns     = $keywordDataset.columns
        rows        = $keywordDataset.rows
        demandGen   = if ($demandGenDataset) { $demandGenDataset } else { $null }
    }

    $json = $payload | ConvertTo-Json -Depth 8 -Compress
    $utf8NoBom = New-Object System.Text.UTF8Encoding $false
    [System.IO.File]::WriteAllText($OutputPath, $json, $utf8NoBom)

    $jsPath = [System.IO.Path]::ChangeExtension($OutputPath, ".js")
    [System.IO.File]::WriteAllText($jsPath, "window.GOOGLE_DATA = $json;", $utf8NoBom)

    return $payload
}
