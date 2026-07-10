function Get-UpdateSourceFile {
    param(
        [Parameter(Mandatory = $true)]
        [string]$RootDir,

        [Parameter(Mandatory = $true)]
        [string]$Keyword,

        [string[]]$Extensions = @('.xlsx', '.csv')
    )

    $updateDir = Join-Path $RootDir "UPDATE"
    if (-not (Test-Path -LiteralPath $updateDir)) { return $null }

    $extSet = New-Object 'System.Collections.Generic.HashSet[string]' ([StringComparer]::OrdinalIgnoreCase)
    foreach ($ext in $Extensions) {
        $normalized = if ($ext.StartsWith('.')) { $ext } else { ".$ext" }
        [void]$extSet.Add($normalized)
    }

    $keywordLower = $Keyword.ToLowerInvariant()
    $files = @(
        Get-ChildItem -Path $updateDir -File -ErrorAction SilentlyContinue |
            Where-Object {
                $_ -and
                $_.Name -notmatch '^~\$' -and
                $extSet.Contains($_.Extension) -and
                $_.Name.ToLowerInvariant().Contains($keywordLower)
            } |
            Sort-Object Name
    )

    if ($files.Count -eq 0) { return $null }

    if ($files.Count -gt 1) {
        Write-Warning "UPDATE 폴더에서 '$Keyword' 키워드 파일이 $($files.Count)개입니다. 첫 번째 파일을 사용합니다: $($files[0].Name)"
    }

    $file = $files[0]
    return [PSCustomObject]@{
        Name = $file.Name
        Path = $file.FullName
        Keyword = $Keyword
    }
}
