param(
  [Parameter(Mandatory=$true)][string]$ServiceAccountPath,
  [Parameter(Mandatory=$true)][string]$ProjectId
)

if (-not (Test-Path $ServiceAccountPath)) {
  Write-Error "Service account file not found: $ServiceAccountPath"
  exit 2
}

Write-Host "Authenticating with service account..."
gcloud auth activate-service-account --key-file="$ServiceAccountPath" --project=$ProjectId
Write-Host "Authentication successful."

$consoleUrl = "https://console.cloud.google.com/apis/credentials?project=$ProjectId"
Write-Host "Open this URL in your browser to edit OAuth clients (Credentials page):"
Write-Host $consoleUrl
Start-Process $consoleUrl

Write-Host "Payload file: tools/google-oauth-automation/google-oauth-payload.json"
Write-Host "Copy the redirect URIs from that file into the OAuth client's 'Authorized redirect URIs' field."
