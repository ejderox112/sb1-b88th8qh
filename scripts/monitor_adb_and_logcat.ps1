# Continuous monitor for adb devices + adb logcat
# Usage: Run this script in a PowerShell window. It will also start a background job
# that writes adb logcat to %TEMP%\adb_logcat_emulator.log if the job is not already running.

$logPath = "$env:TEMP\adb_logcat_emulator.log"

# Start background job to capture logcat if not present
$job = Get-Job -Name adb_logcat -ErrorAction SilentlyContinue
if (-not $job) {
    Write-Host "Starting background job 'adb_logcat' to capture logcat -> $logPath"
    Start-Job -Name adb_logcat -ScriptBlock {
        $out = "$env:TEMP\adb_logcat_emulator.log"
        adb kill-server | Out-Null
        adb start-server | Out-Null
        adb logcat -v time | Out-File -FilePath $out -Encoding utf8
    } | Out-Null
} else {
    Write-Host "Background job 'adb_logcat' already running. Log file: $logPath"
}

# Monitor loop
while ($true) {
    Clear-Host
    Write-Host "=== adb devices ($(Get-Date -Format 'HH:mm:ss')) ===" -ForegroundColor Cyan
    try {
        adb devices -l
    } catch {
        Write-Host "adb not found or failed: $_" -ForegroundColor Yellow
    }

    Write-Host "`n=== Last 120 lines from logcat ($logPath) ===" -ForegroundColor Cyan
    if (Test-Path $logPath) {
        try {
            Get-Content -Path $logPath -Tail 120 -ErrorAction SilentlyContinue
        } catch {
            Write-Host "Failed to read log file: $_" -ForegroundColor Yellow
        }
    } else {
        Write-Host "(log file not yet created)" -ForegroundColor Yellow
    }

    Write-Host "`nPress Ctrl+C in this window to stop the live monitor. To stop background job run: Stop-Job -Name adb_logcat; Remove-Job -Name adb_logcat"
    Start-Sleep -Seconds 2
}
