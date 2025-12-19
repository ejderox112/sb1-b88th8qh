#!/usr/bin/env bash
# Small helper: authenticate with service account and print Console URL to edit OAuth client

set -euo pipefail

if [ -z "${1:-}" ] || [ -z "${2:-}" ]; then
  echo "Usage: $0 /path/to/service-account.json PROJECT_ID"
  exit 1
fi

SA_FILE="$1"
PROJECT_ID="$2"

if [ ! -f "$SA_FILE" ]; then
  echo "Service account file not found: $SA_FILE"
  exit 2
fi

echo "Authenticating with service account..."
gcloud auth activate-service-account --key-file="$SA_FILE" --project="$PROJECT_ID"
echo "Authentication successful."

CONSOLE_URL="https://console.cloud.google.com/apis/credentials?project=${PROJECT_ID}"
echo "Open this URL in your browser to edit OAuth clients (Credentials page):"
echo "$CONSOLE_URL"

# Try to open in default browser if available
if command -v xdg-open >/dev/null 2>&1; then
  xdg-open "$CONSOLE_URL" || true
elif command -v open >/dev/null 2>&1; then
  open "$CONSOLE_URL" || true
fi

echo "Payload file: tools/google-oauth-automation/google-oauth-payload.json"
echo "Copy the redirect URIs from that file into the OAuth client's 'Authorized redirect URIs' field."
