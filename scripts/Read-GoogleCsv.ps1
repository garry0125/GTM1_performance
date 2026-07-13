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
    param([string]$Path)

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

    $rows = New-Object System.Collections.Generic.List[object]
    for ($i = 1; $i -lt $dataLines.Count; $i++) {
        $parts = @($dataLines[$i].Split($delimiter))
        if ($parts.Count -eq 0) { continue }

        $record = [ordered]@{}
        for ($c = 0; $c -lt $headers.Count; $c++) {
            $header = $headers[$c]
            if ([string]::IsNullOrWhiteSpace($header)) { continue }
            $value = if ($c -lt $parts.Count) { ([string]$parts[$c]).Trim() } else { '' }
            $record[$header] = $value
        }

        $dateHeader = $headers[0]
        $keywordHeader = if ($headers.Count -gt 1) { $headers[1] } else { '' }
        $dateVal = if ($dateHeader) { [string]$record[$dateHeader] } else { '' }
        $keywordVal = if ($keywordHeader) { [string]$record[$keywordHeader] } else { '' }
        if ([string]::IsNullOrWhiteSpace($dateVal) -or [string]::IsNullOrWhiteSpace($keywordVal)) { continue }

        [void]$rows.Add($record)
    }

    $result = New-Object PSObject -Property @{
        Headers     = $headers
        Rows        = $rows.ToArray()
        ReportTitle = if ($rawLines.Count -gt 0) { ([string]$rawLines[0]).Trim() } else { '' }
        ReportRange = if ($rawLines.Count -gt 1) { ([string]$rawLines[1]).Trim() } else { '' }
    }
    return $result
}
function Export-GoogleDataJson {
    param(
        [string]$RootDir,
        [string]$OutputPath
    )

    $source = Get-UpdateSourceFile -RootDir $RootDir -Keyword "Google" -Extensions @('.csv')
    if (-not $source) {
        throw "UPDATE 폴더에 Google 키워드 csv 파일이 없습니다."
    }

    $parsed = Read-GoogleCsvRows -Path $source.Path
    $columns = @($parsed.Headers | Where-Object { -not [string]::IsNullOrWhiteSpace($_) })
    $rows = @($parsed.Rows)

    if ($rows.Count -eq 0) {
        throw "Google CSV 파일에서 읽을 수 있는 데이터 행이 없습니다."
    }

    $payload = [ordered]@{
        sourceFile  = $source.Name
        reportTitle = $parsed.ReportTitle
        reportRange = $parsed.ReportRange
        updatedAt   = (Get-Date).ToString("yyyy-MM-ddTHH:mm:ss")
        columns     = $columns
        rows        = $rows
    }

    $json = $payload | ConvertTo-Json -Depth 8 -Compress
    $utf8NoBom = New-Object System.Text.UTF8Encoding $false
    [System.IO.File]::WriteAllText($OutputPath, $json, $utf8NoBom)

    $jsPath = [System.IO.Path]::ChangeExtension($OutputPath, ".js")
    [System.IO.File]::WriteAllText($jsPath, "window.GOOGLE_DATA = $json;", $utf8NoBom)

    return $payload
}
