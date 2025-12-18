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
node tools/google-oauth-automation/generate-uris.js > /tmp/google-oauth-payload.json
```

3. Review the generated file and then either:
- Manually paste the URIs into Google Cloud Console (recommended).
- Use `gcloud` if your environment supports editing OAuth clients programmatically (not all orgs/projects expose this).

If you want me to prepare a full automation script (Puppeteer or gcloud REST calls), reply with which approach you prefer and provide a service-account JSON (securely) or allow me to produce the script for you to run locally.
