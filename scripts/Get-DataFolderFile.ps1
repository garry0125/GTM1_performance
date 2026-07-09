function Get-DataFolderFile {
    param(
        [string]$Dir,
        [string[]]$Extensions = @('.xlsx', '.csv')
    )

    if (-not (Test-Path -LiteralPath $Dir)) { return $null }

    $files = @()
    foreach ($ext in $Extensions) {
        $pattern = if ($ext.StartsWith('.')) { "*$ext" } else { "*.$ext" }
        $files += @(Get-ChildItem -Path $Dir -Filter $pattern -File -ErrorAction SilentlyContinue)
    }

    $files = @(
        $files |
            Where-Object { $_ } |
            Where-Object { $_.Name -notmatch '^~\$' } |
            Sort-Object Name
    )

    if ($files.Count -eq 0) { return $null }

    if ($files.Count -gt 1) {
        Write-Warning "폴더에 데이터 파일이 $($files.Count)개 있습니다. 첫 번째 파일을 사용합니다: $($files[0].Name)"
    }

    $file = $files[0]
    return [PSCustomObject]@{
        Name = $file.Name
        Path = $file.FullName
    }
}
