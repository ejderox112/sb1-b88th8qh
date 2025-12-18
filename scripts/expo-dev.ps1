Param([switch]$DevClient)
if ($DevClient) {
  Write-Output "Starting Expo in dev-client mode (tunnel)..."
  npm run dev -- --dev-client --tunnel
} else {
  Write-Output "Starting Expo in normal tunnel mode..."
  npx expo start --tunnel
}