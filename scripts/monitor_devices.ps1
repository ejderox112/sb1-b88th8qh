# monitor_devices.ps1
# Poll adb devices every few seconds and append timestamped snapshot to logs/adb_devices.txt
# Exit after a configurable number of consecutive empty/no-device snapshots to avoid hanging.
param(
  [int]$IntervalSeconds = 5,
  [int]$MaxNoDeviceCount = 12,
  [int]$MaxRunMinutes = 240
)

$devicesLog = Join-Path $PSScriptRoot "..\logs\adb_devices.txt"
if (-not (Test-Path $devicesLog)) { New-Item -ItemType File -Path $devicesLog -Force | Out-Null }

Write-Host "Starting adb devices monitor -> $devicesLog"

$startTime = Get-Date
$noDeviceCount = 0

while ($true) {
  $ts = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
  $out = & adb devices -l 2>&1
  "$ts`n$out`n" | Out-File -FilePath $devicesLog -Append -Encoding utf8
  Write-Host "[adb-monitor] $ts - devices snapshot saved"

  if ($out -notmatch "device") {
    $noDeviceCount++
    Write-Warning "No devices detected (consecutive: $noDeviceCount)."
  } else {
    $noDeviceCount = 0
  }

  if ($noDeviceCount -ge $MaxNoDeviceCount) {
    Write-Error "No devices detected for $($noDeviceCount * $IntervalSeconds) seconds; exiting monitor to avoid endless wait."
    break
  }

  $elapsed = (Get-Date) - $startTime
  if ($elapsed.TotalMinutes -ge $MaxRunMinutes) {
    Write-Host "Max run minutes reached; exiting devices monitor."
    break
  }

  Start-Sleep -Seconds $IntervalSeconds
}

Write-Host "adb devices monitor exiting." 
