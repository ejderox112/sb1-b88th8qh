Google OAuth Redirect URIs — Automation helper

What this does
- Provides a copy/paste-ready JSON payload and a small Node.js helper that writes the redirect URIs and JavaScript origins for your Google OAuth Web client.

Important note
- Google Cloud does not expose a simple public REST method to edit OAuth client redirect URIs using a generic service-account credential in all projects. The recommended secure methods are:
  - Manually update the OAuth client in Google Cloud Console → APIs & Services → Credentials (fastest and safest).
  - Use the `gcloud` CLI where supported and the project has the necessary APIs enabled and you have an authenticated service account with Owner/Editor permissions.
  - Automate via UI automation (Puppeteer) — fragile and requires human account credentials.

This helper
- `generate-uris.js` will output a JSON payload and a `curl` template you can adapt to whichever automation method you choose.


Usage
1. Install Node (16+ recommended).
2. From the repo root run:

```bash
node tools/google-oauth-automation/generate-uris.js
```

3. Review the generated file at `tools/google-oauth-automation/google-oauth-payload.json` and then either:
- Manually paste the URIs into Google Cloud Console (recommended).
- Or use the `gcloud` helper below to authenticate with a service account and open the Credentials page so you can safely paste the redirect URIs.

gcloud helper (recommended flow)
1. Place your service account JSON on your machine (DO NOT commit it to the repo).
2. Run (macOS / Linux):

```bash
SERVICE_ACCOUNT=/path/to/sa.json
PROJECT_ID=your-gcp-project-id
CLIENT_ID=your-oauth-client-id.apps.googleusercontent.com
gcloud auth activate-service-account --key-file="$SERVICE_ACCOUNT" --project="$PROJECT_ID"
gcloud auth print-access-token > /dev/null
echo "Open the Credentials page in your browser and edit the OAuth client redirect URIs:" \
  "https://console.cloud.google.com/apis/credentials?project=$PROJECT_ID"
```

Windows PowerShell (example):

```powershell
$SERVICE_ACCOUNT = 'C:\path\to\sa.json'
$PROJECT_ID = 'your-gcp-project-id'
gcloud auth activate-service-account --key-file="$SERVICE_ACCOUNT" --project=$PROJECT_ID
Write-Host "Open this URL and edit your OAuth client: https://console.cloud.google.com/apis/credentials?project=$PROJECT_ID"
```

3. In the Console UI select the Web client and paste the redirect URIs from the generated JSON.

Notes
- This helper does NOT upload redirect URIs automatically — it authenticates you to the project and gives you the payload to paste. Many organizations do not allow editing OAuth clients via an API; the Console UI is the safest route.
- If you want a fully automated run (patching via API or using Puppeteer to automate the UI), I can prepare that, but you'll need to run it locally and provide the service-account JSON securely.

If you want me to prepare a full automation script (Puppeteer or gcloud REST calls), reply with which approach you prefer and provide a service-account JSON (securely) or allow me to produce the script for you to run locally.
