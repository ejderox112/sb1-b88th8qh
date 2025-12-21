#!/usr/bin/env bash
set -euo pipefail

if [ ! -f credentials.json ]; then
  echo "credentials.json not found in project root. Create it from credentials.json.example and fill values first." >&2
  exit 2
fi

base64 credentials.json > credentials.json.base64
echo "Wrote credentials.json.base64 (use this value as CI secret CREDENTIALS_JSON_BASE64)"
