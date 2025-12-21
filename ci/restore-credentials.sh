#!/usr/bin/env bash
set -euo pipefail

echo "Restoring credentials.json from CREDENTIALS_JSON_BASE64..."
if [ -z "${CREDENTIALS_JSON_BASE64:-}" ]; then
  echo "CREDENTIALS_JSON_BASE64 is not set" >&2
  exit 1
fi

mkdir -p ios/certs android/keystores
echo "$CREDENTIALS_JSON_BASE64" | base64 -d > credentials.json

echo "credentials.json restored"

# If credentials.json references local files (keystore / p12 / mobileprovision) you should also restore them
# For example, if the CI has KEYS_BASE64 secrets for each file, decode them similarly:
# echo "$KEYSTORE_BASE64" | base64 -d > android/keystores/release.keystore
# echo "$DIST_P12_BASE64" | base64 -d > ios/certs/dist.p12
# echo "$PROFILE_BASE64" | base64 -d > ios/certs/profile.mobileprovision

echo "Done."
