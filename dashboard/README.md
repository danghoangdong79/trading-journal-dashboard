<div align="center">
<img width="1200" height="475" alt="GHBanner" src="https://github.com/user-attachments/assets/0aa67016-6eaf-458a-adb2-6e31a0763ed6" />
</div>

# Run and deploy your AI Studio app

This contains everything you need to run your app locally.

View your app in AI Studio: https://ai.studio/apps/723a789b-c125-4793-9f53-95b98e5083a9

## Run Locally

**Prerequisites:**  Node.js


1. Install dependencies:
   `npm install`
2. Set the `GEMINI_API_KEY` in [.env.local](.env.local) to your Gemini API key
3. Run the app:
   `npm run dev`

## Deploy Cloudflare Pages

Project: `dahodo-trading-journal`

Custom domain: `journal.dahodo.com`

Build settings:
- Framework preset: `Vite`
- Build command: `npm run build`
- Build output directory: `dist`
- Root directory: `dashboard`

PowerShell deploy flow:

```powershell
cd dashboard
$env:CLOUDFLARE_ACCOUNT_ID="<account-id>"
$env:CLOUDFLARE_API_TOKEN="<api-token>"
npm run build
npx wrangler pages project create dahodo-trading-journal --production-branch main
npx wrangler pages deploy dist --project-name dahodo-trading-journal --branch main
```

After the first deployment, add `journal.dahodo.com` in Cloudflare Pages → Custom domains, or connect the project to the GitHub repo and set the custom domain in Pages settings.
