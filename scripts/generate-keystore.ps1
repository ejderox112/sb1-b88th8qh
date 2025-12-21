param(
    [string]$KeyStorePassword = $env:KEYSTORE_PASSWORD,
    [string]$KeyPassword = $env:KEY_PASSWORD,
    [string]$KeyAlias = $env:KEY_ALIAS
)

if (-not $KeyStorePassword -or -not $KeyPassword -or -not $KeyAlias) {
    Write-Host "Please set KEYSTORE_PASSWORD, KEY_PASSWORD and KEY_ALIAS environment variables before running this script." -ForegroundColor Yellow
    Write-Host "Example (PowerShell): $env:KEYSTORE_PASSWORD='pass'; $env:KEY_PASSWORD='pass'; $env:KEY_ALIAS='mykey'; ./scripts/generate-keystore.ps1"
    exit 1
}

New-Item -ItemType Directory -Force -Path android/keystores | Out-Null

$keystorePath = "android/keystores/release.keystore"

& keytool -genkey -v -storetype JKS -keyalg RSA -keysize 2048 -validity 10000 `
    -storepass $KeyStorePassword -keypass $KeyPassword -alias $KeyAlias -keystore $keystorePath `
    -dname "CN=com.expo.your.android.package,OU=,O=,L=,S=,C=US"

Write-Host "Keystore created at $keystorePath"
