# Vercel Deployment Guide

This document explains how to deploy this Expo React Native web app to Vercel as a static site.

## Configuration

The project is configured to deploy as a **static site** to Vercel, avoiding Edge runtime limitations (WebSocket restrictions, etc.).

### vercel.json Configuration

The `vercel.json` file has been configured to:

1. **Build Command**: Uses `npm run build:web` to export the Expo web app
2. **Output Directory**: Points to `web-build` where Expo exports the static files
3. **Framework**: Set to `null` to prevent Vercel from auto-detecting and using Edge runtime
4. **Rewrites**: All routes are rewritten to `index.html` for client-side routing (SPA behavior)
5. **Cache Headers**: Static assets (JS, CSS, fonts, images) are cached for 1 year with immutable flag

### Key Features

- ✅ **Static Build Output**: No Edge runtime, pure static files
- ✅ **SPA Routing**: Client-side routing works correctly with rewrites
- ✅ **Optimized Caching**: Long-term caching for static assets
- ✅ **WebSocket Support**: No Edge runtime restrictions on WebSockets
- ✅ **Build Command**: Automatically runs Expo export during deployment

## Deployment Instructions

### Option 1: Deploy via Vercel Dashboard

1. Go to [Vercel Dashboard](https://vercel.com/dashboard)
2. Click "Add New Project"
3. Import this repository
4. Vercel will automatically detect the `vercel.json` configuration
5. Click "Deploy"

### Option 2: Deploy via Vercel CLI

```bash
# Install Vercel CLI globally
npm install -g vercel

# Login to Vercel
vercel login

# Deploy to production
vercel --prod
```

### Option 3: Auto-Deploy from GitHub

1. Connect your GitHub repository to Vercel
2. Enable automatic deployments for the main branch
3. Every push to main will trigger a new deployment

## Environment Variables

If your app requires environment variables (like Supabase credentials), add them in the Vercel dashboard:

1. Go to Project Settings → Environment Variables
2. Add your variables:
   - `EXPO_PUBLIC_SUPABASE_URL`
   - `EXPO_PUBLIC_SUPABASE_ANON_KEY`
   - Any other `EXPO_PUBLIC_*` variables

## Build Process

When Vercel deploys, it will:

1. Install dependencies with `npm install --legacy-peer-deps`
2. Run `npm run build:web` which executes `expo export --platform web --output-dir web-build`
3. Serve static files from the `web-build` directory
4. Apply rewrites for SPA routing
5. Set cache headers for static assets

## Local Testing

To test the build locally before deploying:

```bash
# Install dependencies
npm install --legacy-peer-deps

# Build for web
npm run build:web

# Serve the build directory (requires a static server)
npx serve web-build
```

## Troubleshooting

### Build Fails

- Check that all environment variables are set
- Ensure `npm install --legacy-peer-deps` is used
- Review Vercel build logs for specific errors

### Routes Not Working

- Verify `vercel.json` has the rewrites configuration
- Check that `index.html` exists in `web-build` after building

### Assets Not Loading

- Ensure all asset paths are relative in the code
- Check that `web-build` directory contains all assets
- Verify cache headers are not causing issues

## Static Site Benefits

Deploying as a static site provides:

- **Better Performance**: Direct CDN serving, no Edge compute overhead
- **No Runtime Limitations**: Full WebSocket support, no cold starts
- **Lower Cost**: Static bandwidth is cheaper than Edge compute
- **Simpler Debugging**: Static files are easier to inspect and troubleshoot
- **Maximum Compatibility**: Works with all browsers and networking setups

## Vercel Domains

After deployment, your app will be available at:

- Production: `https://your-project-name.vercel.app`
- Preview deployments: `https://your-project-name-git-branch.vercel.app`

You can also configure custom domains in the Vercel dashboard.

## CI/CD Integration

To integrate with GitHub Actions or other CI systems:

1. Generate a Vercel token in your account settings
2. Add it as a secret in your CI system
3. Use the Vercel CLI in your CI pipeline:

```yaml
# Example GitHub Actions workflow
- name: Deploy to Vercel
  run: |
    npm install -g vercel
    vercel --token ${{ secrets.VERCEL_TOKEN }} --prod
```

## Additional Resources

- [Vercel Documentation](https://vercel.com/docs)
- [Expo Web Documentation](https://docs.expo.dev/workflow/web/)
- [React Router on Vercel](https://vercel.com/guides/deploying-react-with-vercel)
