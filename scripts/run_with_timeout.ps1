param(
  [Parameter(Mandatory=$true)][string]$CommandLine,
  [int]$TimeoutSeconds = 1800,
  [switch]$CaptureOutput
)

# As a fallback, call through powershell -Command
Write-Host "Running command with timeout: $CommandLine (timeout ${TimeoutSeconds}s)"

$proc = Start-Process -FilePath powershell -ArgumentList "-NoProfile","-Command",$CommandLine -PassThru -WindowStyle Hidden

try {
  $finished = $proc | Wait-Process -Timeout (New-TimeSpan -Seconds $TimeoutSeconds)
  if (-not $finished) {
    Write-Warning "Command timed out after $TimeoutSeconds seconds. Killing process..."
    Stop-Process -Id $proc.Id -Force -ErrorAction SilentlyContinue
    Write-Host "Process killed due to timeout."
    exit 124
  }
} catch {
  Write-Error "Error while waiting for process: $_"
  try { Stop-Process -Id $proc.Id -Force -ErrorAction SilentlyContinue } catch {}
  exit 1
}

# Return the exit code of the child powershell process if possible
try {
  $proc.Refresh()
  if ($proc.HasExited) {
    exit $proc.ExitCode
  } else {
    Write-Warning "Process did not exit cleanly; exiting with code 1"
    exit 1
  }
} catch {
  Write-Warning "Could not determine child exit code; exiting 0"
  exit 0
}
