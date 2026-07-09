$ErrorActionPreference = "Stop"
. (Join-Path $PSScriptRoot "Get-DataFolderFile.ps1")
. (Join-Path $PSScriptRoot "Read-MetaXlsx.ps1")

$script:TikTokColumnIndices = @(0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10)

function Export-TikTokDataJson {
    param(
        [string]$RootDir,
        [string]$OutputPath
    )

    $source = Get-DataFolderFile -Dir (Join-Path $RootDir "TikTok") -Extensions @('.xlsx')
    if (-not $source) {
        throw "TikTok 폴더에 xlsx 데이터 파일이 없습니다."
    }

    $parsed = Read-MetaXlsx -Path $source.Path
    $columns = @($script:TikTokColumnIndices | ForEach-Object { $parsed.Headers[$_] } | Where-Object { -not [string]::IsNullOrWhiteSpace($_) })

    $rows = @($parsed.Rows | Where-Object {
        $campaignKey = $parsed.Headers[0]
        $dayKey = $parsed.Headers[4]
        $campaign = if ($campaignKey -and $_.ContainsKey($campaignKey)) { [string]$_.$campaignKey } else { '' }
        $day = if ($dayKey -and $_.ContainsKey($dayKey)) { [string]$_.$dayKey } else { '' }
        -not ($campaign -match '^(Total of|총\s*\d+개\s*결과)') -and $day -ne '-'
    } | ForEach-Object {
        $src = $_
        $record = [ordered]@{}
        foreach ($header in $columns) {
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
    [System.IO.File]::WriteAllText($jsPath, "window.TIKTOK_DATA = $json;", $utf8NoBom)

    return $payload
}
