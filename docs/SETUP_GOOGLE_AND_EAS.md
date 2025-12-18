Setup: Google OAuth + EAS dev client (step-by-step)

This document lists the steps you must perform and the automated steps this repository already contains.

Automated actions I will perform now:
- Create `.env.example` with placeholders for Google client IDs and Expo settings.
- Add a lightweight `scripts/expo-dev.ps1` helper to run with tunnel or dev-client.
- Add recommended entries to `.gitignore` (temporary audit files already present).

Steps you must perform (links & copy-paste commands):

1) Create Google OAuth credentials
- Console: https://console.developers.google.com/apis/credentials
- Create three credentials (Web, Android, iOS) and copy the client IDs.
- Web redirect URI (for Expo auth proxy): `https://auth.expo.io/@<your-username>/<project-slug>`

2) Android SHA-1 (if using native Google Sign-In)
```powershell
keytool -list -v -keystore "%USERPROFILE%\.android\debug.keystore" -alias androiddebugkey -storepass android -keypass android
```

3) Set environment variables locally (PowerShell example)
```powershell
$env:EXPO_PUBLIC_GOOGLE_CLIENT_ID = 'YOUR_WEB_CLIENT_ID'
$env:GOOGLE_ANDROID_CLIENT_ID = 'YOUR_ANDROID_CLIENT_ID'
$env:GOOGLE_IOS_CLIENT_ID = 'YOUR_IOS_CLIENT_ID'
```

4) If you need native Google Sign-In test on device, build a dev client:
```bash
npm install -g eas-cli
eas login
eas build --profile development --platform android
# install generated APK on your device
expo start --dev-client --tunnel
```

5) Quick test (Expo Go + tunnel) — web auth flow (no native plugin):
```bash
expo start --tunnel
# Open Expo Go on device and scan the QR
# Google auth should open the system browser and return to app
```

If you want, paste the three client IDs here and I will update `app.json` / `.env` templates for you.

---
Notes:
- Do NOT commit real secrets to the repository. Use env vars or secret management.
- After you share client IDs I can inject them into `.env.example` (not committing the real token).
