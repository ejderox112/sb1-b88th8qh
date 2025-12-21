#!/usr/bin/env bash
set -euo pipefail

mkdir -p android/keystores

if [ -z "${KEYSTORE_PASSWORD:-}" ] || [ -z "${KEY_PASSWORD:-}" ] || [ -z "${KEY_ALIAS:-}" ]; then
  echo "Please set KEYSTORE_PASSWORD, KEY_PASSWORD and KEY_ALIAS environment variables before running this script."
  echo "Example: KEYSTORE_PASSWORD=foo KEY_PASSWORD=bar KEY_ALIAS=mykey ./scripts/generate-keystore.sh"
  exit 1
fi

cat > /dev/null <<'EOF'
This script generates a JKS keystore at android/keystores/release.keystore using keytool.
It requires a system-installed Java (keytool available on PATH).
EOF

keytool -genkey -v \
  -storetype JKS \
  -keyalg RSA \
  -keysize 2048 \
  -validity 10000 \
  -storepass "${KEYSTORE_PASSWORD}" \
  -keypass "${KEY_PASSWORD}" \
  -alias "${KEY_ALIAS}" \
  -keystore android/keystores/release.keystore \
  -dname "CN=com.expo.your.android.package,OU=,O=,L=,S=,C=US"

echo "Keystore created at android/keystores/release.keystore"
