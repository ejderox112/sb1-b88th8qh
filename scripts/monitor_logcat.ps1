# monitor_logcat.ps1
# Continuously stream adb logcat to console and write to logs/emulator_log.txt
param(
  [int]$LinesToKeep = 10000,
  [int]$MaxRunMinutes = 240,
  [int]$RestartOnFailureLimit = 3,
  [int]$RestartWindowSeconds = 60
)

$logPath = Join-Path $PSScriptRoot "..\logs\emulator_log.txt"
# Ensure log file exists
if (-not (Test-Path $logPath)) { New-Item -ItemType File -Path $logPath -Force | Out-Null }

Write-Host "Starting resilient logcat -> $logPath"

$startTime = Get-Date
$failureTimes = @()

function Run-LogcatOnce {
  try {
    # Verify adb available
    & adb version >$null 2>&1
  } catch {
    Write-Error "adb not found or not usable: $_"
    return $false
  }

  # If there are no devices, exit early so this script doesn't hang forever
  $devs = (& adb devices -l 2>&1) -join "`n"
  if ($devs -notmatch "device") {
    Write-Warning "No connected devices found. Exiting monitor to avoid hanging."
    return $false
  }

  # Start adb logcat as a process and redirect output to the log file
  $adbArgs = "logcat -v time"
  $proc = Start-Process -FilePath adb -ArgumentList $adbArgs -NoNewWindow -RedirectStandardOutput $logPath -RedirectStandardError $logPath -PassThru
  if (-not $proc) {
    Write-Error "Failed to start adb logcat process."
    return $false
  }

  # Wait for a while, but allow an overall timeout
  $elapsed = (Get-Date) - $startTime
  $remainingMinutes = $MaxRunMinutes - [int]$elapsed.TotalMinutes
  if ($remainingMinutes -le 0) {
    Write-Host "Max run time reached; stopping logcat."
    Stop-Process -Id $proc.Id -ErrorAction SilentlyContinue
    return $false
  }

  # Wait with a per-run timeout (use 30 minutes per run to allow rotation)
  $timedOut = $false
  try {
    $waitOk = $proc | Wait-Process -Timeout (New-TimeSpan -Minutes ([math]::Min(30, $remainingMinutes)))
    if (-not $waitOk) {
      $timedOut = $true
    }
  } catch {
    Write-Warning "Wait-Process failed: $_"
    $timedOut = $true
  }

  if ($timedOut) {
    Write-Host "Logcat run timed out; stopping process and returning to supervisory loop."
    Stop-Process -Id $proc.Id -ErrorAction SilentlyContinue
    return $true
  }

  # Process exited on its own; treat non-zero as failure
  if ($proc.ExitCode -ne 0) {
    Write-Warning "adb logcat process exited with code $($proc.ExitCode)"
    return $false
  }

  return $true
}

while ($true) {
  $ok = Run-LogcatOnce
  if (-not $ok) {
    # Record a failure timestamp
    $failureTimes += (Get-Date)
    # purge timestamps older than RestartWindowSeconds
    $cutoff = (Get-Date).AddSeconds(-$RestartWindowSeconds)
    $failureTimes = $failureTimes | Where-Object { $_ -gt $cutoff }

    if ($failureTimes.Count -ge $RestartOnFailureLimit) {
      Write-Error "logcat failed $($failureTimes.Count) times within $RestartWindowSeconds seconds; exiting to avoid endless loop."
      break
    }

    # If no devices present, exit (no point waiting forever)
    $devsNow = (& adb devices -l 2>&1) -join "`n"
    if ($devsNow -notmatch "device") {
      Write-Warning "No devices detected after failure; exiting monitor."
      break
    }

    # small backoff before retrying
    Start-Sleep -Seconds 5
  } else {
    # successful run returned; clear failure history and continue
    $failureTimes = @()
    # small pause to avoid tight loop
    Start-Sleep -Seconds 1
  }

  # If overall max runtime exceeded, exit
  $totalElapsed = (Get-Date) - $startTime
  if ($totalElapsed.TotalMinutes -ge $MaxRunMinutes) {
    Write-Host "MaxRunMinutes reached ($MaxRunMinutes). Exiting logcat monitor."
    break
  }
}

Write-Host "Logcat monitor exiting."
