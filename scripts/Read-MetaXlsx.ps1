. (Join-Path $PSScriptRoot "Get-DataFolderFile.ps1")

function Get-MetaWorksheetPath {
    param([string]$ExtractPath)

    $workbookPath = Join-Path $ExtractPath "xl\workbook.xml"
    $relsPath = Join-Path $ExtractPath "xl\_rels\workbook.xml.rels"
    [xml]$workbook = Get-Content -LiteralPath $workbookPath -Encoding UTF8
    [xml]$rels = Get-Content -LiteralPath $relsPath -Encoding UTF8

    $nsMain = New-Object System.Xml.XmlNamespaceManager($workbook.NameTable)
    $nsMain.AddNamespace("m", "http://schemas.openxmlformats.org/spreadsheetml/2006/main")
    $nsMain.AddNamespace("r", "http://schemas.openxmlformats.org/officeDocument/2006/relationships")

    $preferredNames = @("Raw Data Report", "Raw Data", "Data")
    $sheetNodes = $workbook.SelectNodes("//m:sheets/m:sheet", $nsMain)
    $targetRid = $null

    foreach ($preferred in $preferredNames) {
        foreach ($sheetNode in $sheetNodes) {
            $sheetName = $sheetNode.GetAttribute("name")
            if ($sheetName -eq $preferred) {
                $targetRid = [string]$sheetNode.GetAttribute("r:id")
                if (-not $targetRid) { $targetRid = [string]$sheetNode.'r:id' }
                break
            }
        }
        if ($targetRid) { break }
    }

    if (-not $targetRid -and $sheetNodes.Count -gt 0) {
        $lastSheet = $sheetNodes[$sheetNodes.Count - 1]
        $targetRid = [string]$lastSheet.GetAttribute("r:id")
        if (-not $targetRid) { $targetRid = [string]$lastSheet.'r:id' }
    }

    foreach ($rel in $rels.Relationships.Relationship) {
        if ([string]$rel.Id -eq $targetRid) {
            return Join-Path $ExtractPath ("xl\" + ($rel.Target -replace '/', '\'))
        }
    }

    return Join-Path $ExtractPath "xl\worksheets\sheet1.xml"
}

function Read-MetaXlsx {
    param([string]$Path)

    $tempRoot = Join-Path $env:TEMP ("meta_xlsx_" + [guid]::NewGuid().ToString("N"))
    $zipPath = Join-Path $tempRoot "file.zip"
    $extractPath = Join-Path $tempRoot "extract"
    New-Item -ItemType Directory -Path $tempRoot -Force | Out-Null

    try {
        Copy-Item -LiteralPath $Path -Destination $zipPath -Force
        Expand-Archive -LiteralPath $zipPath -DestinationPath $extractPath -Force

        $strings = New-Object System.Collections.Generic.List[string]
        $sharedPath = Join-Path $extractPath "xl\sharedStrings.xml"
        if (Test-Path -LiteralPath $sharedPath) {
            [xml]$sharedXml = Get-Content -LiteralPath $sharedPath -Encoding UTF8
            foreach ($si in $sharedXml.sst.si) {
                if ($si.t -and $si.t.'#text') {
                    [void]$strings.Add([string]$si.t.'#text')
                }
                elseif ($si.t) {
                    [void]$strings.Add([string]$si.t)
                }
                elseif ($si.r) {
                    $parts = @()
                    foreach ($run in $si.r) {
                        if ($run.t) {
                            if ($run.t.'#text') { $parts += [string]$run.t.'#text' }
                            else { $parts += [string]$run.t }
                        }
                    }
                    [void]$strings.Add(($parts -join ''))
                }
                else {
                    [void]$strings.Add('')
                }
            }
        }

        function Get-XlsxCellValue {
            param($Cell, $StringTable)

            if ($Cell.t -eq 'inlineStr' -and $Cell.is) {
                if ($Cell.is.t.'#text') { return [string]$Cell.is.t.'#text' }
                if ($Cell.is.t) { return [string]$Cell.is.t }
                return ''
            }

            $rawText = if ($Cell.v.'#text') { [string]$Cell.v.'#text' } elseif ($Cell.v) { [string]$Cell.v } else { $null }
            if (-not $rawText) { return '' }
            if ($Cell.t -eq 's') { return $StringTable[[int]$rawText] }
            return $rawText
        }

        [xml]$sheetXml = Get-Content -LiteralPath (Get-MetaWorksheetPath -ExtractPath $extractPath) -Encoding UTF8
        $ns = New-Object System.Xml.XmlNamespaceManager($sheetXml.NameTable)
        $ns.AddNamespace("m", "http://schemas.openxmlformats.org/spreadsheetml/2006/main")

        $rows = $sheetXml.SelectNodes("//m:sheetData/m:row", $ns)
        if (-not $rows -or $rows.Count -eq 0) { return @() }

        function Get-ColumnIndex {
            param([string]$CellRef)
            $letters = ($CellRef -replace '\d', '')
            $index = 0
            foreach ($ch in $letters.ToCharArray()) {
                $index = $index * 26 + ([int][char]$ch - [int][char]'A' + 1)
            }
            return $index - 1
        }

        $headers = @()
        $dataRows = New-Object System.Collections.Generic.List[hashtable]

        foreach ($row in $rows) {
            $cells = $row.SelectNodes("m:c", $ns)
            $rowValues = @{}

            foreach ($cell in $cells) {
                $ref = [string]$cell.r
                $colIndex = Get-ColumnIndex $ref
                $value = Get-XlsxCellValue -Cell $cell -StringTable $strings

                $rowValues[$colIndex] = $value
            }

            if ($headers.Count -eq 0) {
                $maxCol = ($rowValues.Keys | Measure-Object -Maximum).Maximum
                for ($i = 0; $i -le $maxCol; $i++) {
                    $headers += if ($rowValues.ContainsKey($i)) { $rowValues[$i] } else { "Column$($i + 1)" }
                }
                continue
            }

            $record = [ordered]@{}
            for ($i = 0; $i -lt $headers.Count; $i++) {
                $record[$headers[$i]] = if ($rowValues.ContainsKey($i)) { $rowValues[$i] } else { '' }
            }
            [void]$dataRows.Add($record)
        }

        return [PSCustomObject]@{
            Headers = $headers
            Rows    = @($dataRows)
        }
    }
    finally {
        if (Test-Path $tempRoot) {
            Remove-Item -LiteralPath $tempRoot -Recurse -Force -ErrorAction SilentlyContinue
        }
    }
}

# A~D: 캠페인/일/광고세트/광고이름, F~H: 노출/클릭/지출, I~J: CTR/CPC (E열·통화열 제외)
$script:MetaColumnIndices = @(0, 1, 2, 3, 5, 6, 7, 8, 9)

function Export-MetaDataJson {
    param(
        [string]$RootDir,
        [string]$OutputPath
    )

    $source = Get-UpdateSourceFile -RootDir $RootDir -Keyword "Meta" -Extensions @('.xlsx')
    if (-not $source) {
        throw "UPDATE 폴더에 Meta 키워드 xlsx 파일이 없습니다."
    }

    $parsed = Read-MetaXlsx -Path $source.Path
    $columns = @($script:MetaColumnIndices | ForEach-Object { $parsed.Headers[$_] } | Where-Object { -not [string]::IsNullOrWhiteSpace($_) })
    $rows = @($parsed.Rows | ForEach-Object {
        $src = $_
        $record = [ordered]@{}
        foreach ($i in $script:MetaColumnIndices) {
            $header = $parsed.Headers[$i]
            if ([string]::IsNullOrWhiteSpace($header)) { continue }
            $record[$header] = if ($src.ContainsKey($header)) { $src[$header] } else { '' }
        }
        $record
    })

    $payload = [ordered]@{
        sourceFile = $source.Name
        updatedAt  = (Get-Date).ToString("yyyy-MM-ddTHH:mm:ss")
        columns    = $columns
        rows       = $rows
    }

    $json = $payload | ConvertTo-Json -Depth 6 -Compress
    $utf8NoBom = New-Object System.Text.UTF8Encoding $false
    [System.IO.File]::WriteAllText($OutputPath, $json, $utf8NoBom)

    $jsPath = [System.IO.Path]::ChangeExtension($OutputPath, ".js")
    [System.IO.File]::WriteAllText($jsPath, "window.META_DATA = $json;", $utf8NoBom)

    return $payload
}
