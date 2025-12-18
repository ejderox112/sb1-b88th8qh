$srcDir = ".\supabase\migrations"
$outDir = ".\tmp"
$outFile = Join-Path $outDir "merged_migrations.sql"

# create tmp folder
New-Item -ItemType Directory -Path $outDir -Force | Out-Null

# find .sql files, exclude any 'down' files, sort by name
$files = Get-ChildItem $srcDir -Filter *.sql | Where-Object { $_.Name -notmatch '(?i)down' } | Sort-Object Name

if ($files.Count -eq 0) {
  Write-Error "No SQL files found in $srcDir (or all were excluded)."
  exit 1
}

# header
"/* Merged on $(Get-Date -Format o) - files: $($files.Name -join ', ') */`n" | Out-File $outFile -Encoding utf8

foreach ($f in $files) {
  "-- --------- Begin: $($f.Name) ---------`n" | Out-File $outFile -Append -Encoding utf8
  Get-Content $f.FullName | Out-File $outFile -Append -Encoding utf8
  "`n-- --------- End: $($f.Name) ---------`n" | Out-File $outFile -Append -Encoding utf8
}

# Copy merged SQL to clipboard (Windows PowerShell)
Get-Content $outFile -Raw | Set-Clipboard

Write-Host "`nMerged $($files.Count) files into $outFile and copied to clipboard."
Write-Host "Open Supabase -> SQL Editor, paste (CTRL+V) and Run."
