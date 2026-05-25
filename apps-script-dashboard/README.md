# Dahodo Journal Apps Script Dashboard

PhiÃªn báº£n **Google Apps Script Web App** Ä‘á»™c láº­p cho dashboard. ThÆ° má»¥c nÃ y khÃ´ng ghi Ä‘Ã¨ frontend/backend production hiá»‡n táº¡i.

## File

- `appsscript.json`: manifest Apps Script.
- `Code.gs`: backend Apps Script Ä‘á»c Google Sheet vÃ  tráº£ dataset JSON.
- `Index.html`: UI dashboard gá»n, cháº¡y trá»±c tiáº¿p báº±ng `google.script.run`.

## TÃ­nh nÄƒng

- Äá»c live cÃ¡c range:
  - `JOURNAL!A1:Y2000`
  - `CASHFLOW!A1:E2000`
  - `FEE_CHARGES!A1:N2000`
  - `CONFIG!G3:G7`
  - `USERS!A1:G500`
  - account list tá»« `FORMULAS!I2:I200`, fallback `SETUP!AJ2:AJ200`
- CÃ³ cache 30 giÃ¢y Ä‘á»ƒ táº£i nhanh.
- NÃºt **Táº£i láº¡i dá»¯ liá»‡u** gá»i `refreshBootstrapData()` Ä‘á»ƒ bá» qua cache.
- CÃ³ JSON endpoint khi má»Ÿ web app vá»›i query `?mode=api&sheetId=...&refresh=1`.

## CÃ¡ch táº¡o project má»›i khÃ´ng ghi Ä‘Ã¨

### CÃ¡ch thá»§ cÃ´ng

1. VÃ o `https://script.google.com/`.
2. Chá»n **New project**.
3. Táº¡o/copy 3 file:
   - `Code.gs`
   - `Index.html`
   - `appsscript.json` báº­t trong Project Settings â†’ Show manifest file.
4. DÃ¡n ná»™i dung tá»« thÆ° má»¥c `apps-script-dashboard/`.
5. Báº¥m **Run** hÃ m `getBootstrapData` láº§n Ä‘áº§u Ä‘á»ƒ cáº¥p quyá»n.
6. Deploy â†’ **New deployment** â†’ loáº¡i **Web app**:
   - Execute as: `Me`
   - Who has access: tÃ¹y nhu cáº§u, thÆ°á»ng `Anyone with Google account` hoáº·c `Anyone`
7. Copy Web App URL Ä‘á»ƒ test.

### CÃ¡ch dÃ¹ng clasp náº¿u muá»‘n

```bash
npm install -g @google/clasp
cd apps-script-dashboard
clasp login
clasp create --type webapp --title "Dahodo Journal Apps Script"
clasp push
clasp deploy --description "Initial Apps Script dashboard"
```

## Test URL

- UI:
  - `https://script.google.com/macros/s/<DEPLOYMENT_ID>/exec`
- JSON API:
  - `https://script.google.com/macros/s/<DEPLOYMENT_ID>/exec?mode=api&sheetId=<SHEET_ID>&refresh=1`

## Ghi chÃº báº£o máº­t

- Web app cháº¡y vá»›i quyá»n cá»§a ngÆ°á»i deploy nÃªn cÃ³ thá»ƒ Ä‘á»c Sheet private náº¿u account deploy cÃ³ quyá»n.
- Náº¿u báº­t `Anyone`, ai cÃ³ URL cÃ³ thá»ƒ xem dashboard/dataset cá»§a Sheet ID máº·c Ä‘á»‹nh.
- Náº¿u cáº§n public nhÆ°ng váº«n an toÃ n hÆ¡n, nÃªn táº¡o báº£n cÃ³ token query riÃªng hoáº·c chá»‰ cho user Google Workspace.

## KhÃ´ng áº£nh hÆ°á»Ÿng production

ThÆ° má»¥c nÃ y khÃ´ng sá»­a:

- `dashboard/`
- `api/`
- Cloudflare Pages
- VPS PM2 backend

