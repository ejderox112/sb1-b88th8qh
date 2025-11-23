// Usage:
// 1) Create `.env.local` at repo root with the variables from `.env.example` filled.
// 2) Run: `node -r dotenv/config scripts/validate_supabase_key.js` (dotenv is optional)

(async () => {
  try {
    // Try to load dotenv if available
    try { require('dotenv').config({ path: '.env.local' }); } catch (e) { /* ignore */ }

    const SUPABASE_URL = process.env.SUPABASE_URL || process.env.EXPO_PUBLIC_SUPABASE_URL;
    const SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY;

    if (!SUPABASE_URL || !SERVICE_KEY) {
      console.error('Missing SUPABASE_URL or SUPABASE_SERVICE_KEY in environment. Fill .env.local or export variables.');
      process.exit(2);
    }

    const endpoint = `${SUPABASE_URL.replace(/\/$/, '')}/rest/v1/`;

    console.log('Testing Supabase service key against:', endpoint);

    const res = await fetch(endpoint, {
      method: 'HEAD',
      headers: {
        apikey: SERVICE_KEY,
        Authorization: `Bearer ${SERVICE_KEY}`,
      },
    });

    console.log('HTTP status:', res.status);

    if (res.status === 401 || res.status === 403) {
      console.error('Key appears invalid or lacks permissions (401/403).');
      process.exit(3);
    }

    console.log('Key looks usable (non-401/403 status). If you want a deeper validation, run REST calls to a specific table with this key.');
    process.exit(0);
  } catch (err) {
    console.error('Validation error:', err);
    process.exit(4);
  }
})();
