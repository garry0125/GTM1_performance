$ErrorActionPreference = "Stop"
$RootDir = Split-Path $PSScriptRoot -Parent

. (Join-Path $PSScriptRoot "Read-MetaXlsx.ps1")
. (Join-Path $PSScriptRoot "Read-TikTokXlsx.ps1")
. (Join-Path $PSScriptRoot "Read-AmazonCsv.ps1")
. (Join-Path $PSScriptRoot "Read-GoogleCsv.ps1")

$jobs = @(
    @{ Label = "Amazon"; Action = { Export-AmazonDataJson -RootDir $RootDir -OutputPath (Join-Path $RootDir "Amazon\data.json") } }
    @{ Label = "Meta"; Action = { Export-MetaDataJson -RootDir $RootDir -OutputPath (Join-Path $RootDir "Meta\data.json") } }
    @{ Label = "TikTok"; Action = { Export-TikTokDataJson -RootDir $RootDir -OutputPath (Join-Path $RootDir "TikTok\data.json") } }
    @{ Label = "Google"; Action = { Export-GoogleDataJson -RootDir $RootDir -OutputPath (Join-Path $RootDir "Google\data.json") } }
)

$failed = @()
foreach ($job in $jobs) {
    try {
        $payload = & $job.Action
        $rows = if ($payload.rows) { @($payload.rows).Count } else { 0 }
        Write-Host "[OK] $($job.Label) rows=$rows"
    }
    catch {
        Write-Warning "[FAIL] $($job.Label): $($_.Exception.Message)"
        $failed += $job.Label
    }
}

if ($failed.Count) {
    Write-Host ""
    Write-Host "일부 플랫폼 반영 실패: $($failed -join ', ')"
    exit 1
}

Write-Host ""
Write-Host "모든 데이터 반영 완료. 브라우저에서 페이지를 새로고침하세요."
exit 0
