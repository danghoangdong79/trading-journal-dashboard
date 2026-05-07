# Dahodo Journal API

Private backend for `journal.dahodo.com`. It reads a private Google Sheet through a Google Service Account and exposes JSON endpoints for the dashboard.

## Endpoints

- `GET /api/health`
- `GET /api/trades?sheetId=<GOOGLE_SHEET_ID>`

## VPS setup

```bash
cd /opt/dahodo-journal-api
npm install --omit=dev
cp .env.example .env
nano .env
npm start
```

Required `.env` values:

```bash
PORT=8787
ALLOWED_ORIGIN=https://journal.dahodo.com
KHANGHANG_SHEET_ID=your_google_sheet_id
GOOGLE_SERVICE_ACCOUNT_JSON='{"type":"service_account",...}'
```

Keep the Google Sheet private and share it with the service account email as Viewer.