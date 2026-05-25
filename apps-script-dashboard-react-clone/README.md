# Dahodo Journal Apps Script React Clone

B?n n?y ??ng g?i tr?c ti?p production build React hi?n t?i v?o Apps Script HTML Service ?? UI/UX gi?ng b?n web hi?n t?i nh?t c? th?.

## Ngu?n build

- CSS: `dashboard/dist/assets/index-BKEhtTAO.css`
- JS: `dashboard/dist/assets/index-Dy0-zuM7.js`

## Kh?ng ghi ??

Th? m?c n?y ??c l?p v?i:

- `apps-script-dashboard/` MVP
- `dashboard/` React source
- `api/` backend
- VPS/Cloudflare production

## C?ch deploy

1. T?o Google Apps Script project m?i.
2. Copy 3 file `Code.gs`, `Index.html`, `appsscript.json` t? th? m?c n?y.
3. Deploy ? New deployment ? Web app.
4. Execute as: Me.
5. Access: theo nhu c?u.

## L?u ? quan tr?ng

- UI gi?ng React web v? ch?nh l? bundle React web.
- Bundle React v?n gi? logic UI g?c.
- Fetch t?i `https://journal-api.dahodo.com/api/trades` ???c monkey-patch trong `Index.html` ?? g?i `google.script.run.getDatasetForFetch()`, tr?nh l?i CORS khi ch?y trong Apps Script.
- N?u ng??i d?ng nh?p Google API Key trong Settings, app v?n c? th? g?i Google Sheets API tr?c ti?p nh? b?n web.
- File `Index.html` l?n v? ?? inline to?n b? JS/CSS ?? Apps Script ch?y ??c l?p.

## M?c ?? gi?ng b?n web

B?n n?y l? c?ch g?n 100% nh?t v? d?ng ch?nh production bundle React hi?n t?i. Kh?c bi?t c?n l?i:

- Ch?y trong Google Apps Script iframe/runtime thay v? Cloudflare domain.
- Deep link BrowserRouter sau khi reload c? th? kh?ng m??t nh? domain th?t.
- Data fetch m?c ??nh ???c proxy qua Apps Script thay v? g?i th?ng VPS API ?? tr?nh CORS.


## Deployment test ?? t?o

- Script ID: `1TnoZsz2cDMU7tfGYIycE2hv3mrku2kWCUvnfGNF5tYldVIZFB79K4myI`
- Apps Script editor: `https://script.google.com/d/1TnoZsz2cDMU7tfGYIycE2hv3mrku2kWCUvnfGNF5tYldVIZFB79K4myI/edit`
- Deployment ID: `AKfycbzP3SSubwvVK5b0YkXE7sedYAcXymQVY9105CyCqDiZHcNGCMDxArp2gvAFNCMUFQP3Hg`
- Web app URL: `https://script.google.com/macros/s/AKfycbzP3SSubwvVK5b0YkXE7sedYAcXymQVY9105CyCqDiZHcNGCMDxArp2gvAFNCMUFQP3Hg/exec`

N?u URL tr? `Truy c?p b? t? ch?i`, m? Apps Script editor b?ng account deploy, ch?y/c?p quy?n l?n ??u ho?c v?o Deploy ? Manage deployments ki?m tra quy?n truy c?p Web app.
