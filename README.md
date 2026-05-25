# KhangHang1 - Trading Journal VN

Trading journal cho phai sinh VN30F va co phieu Viet Nam. Google Sheets la data engine, dashboard web tinh dung de phan tich KPI/PnL.

## Chuan du lieu hien tai

- Tab du lieu chinh: `JOURNAL`.
- Layout chuan: Ocean 24 cot, khop voi Google Sheet that.
- Dashboard doc truc tiep `JOURNAL!A1:Y2000` qua Google Sheets API key va fallback ve demo neu chua cau hinh.
- Tabs chinh tren sheet that: `CONFIG`, `SETUP`, `FORMULAS`, `JOURNAL`, `SUMMARY`.

## Cau truc repo

```text
khanghang1/
??? credentials/              # Token/key local, khong commit
??? dashboard/                # Dashboard HTML/CSS/JS tinh
??? docs/                     # Prompt va tai lieu bo sung
??? schema/                   # Tai lieu schema Google Sheets
??? sheets/
?   ??? scripts/              # Script setup/rebuild/audit Google Sheets
?   ??? templates/            # JSON schema/template
??? .env.example
??? requirements.txt
```

## Cai dat Python

```bash
python -m pip install -r requirements.txt
```

Copy `.env.example` thanh `.env` hoac set bien moi truong:

```bash
KHANGHANG_SHEET_ID=your_google_sheet_id
KHANGHANG_TOKEN_PATH=credentials/token.json
KHANGHANG_SERVICE_ACCOUNT_EMAIL=service-account@example.iam.gserviceaccount.com
```

## Lenh quan trong

- Tao sheet moi qua OAuth: `python sheets/scripts/setup_sheet.py --name "Ten KH" --capital 200000000`
- Rebuild sheet hien co: `python sheets/scripts/rebuild_sheet.py --sheet-id <ID> --confirm`
- Dry-run rebuild an toan: `python sheets/scripts/rebuild_sheet.py --sheet-id <ID> --dry-run`

## Dashboard

Mo `dashboard/index.html`, vao **Cai Dat**, nhap:

- `Sheet ID`: ID Google Sheet co tab `JOURNAL`.
- `API Key`: Google API key co quyen doc Sheets API.

Neu thieu hoac loi API, dashboard tu tai du lieu demo de khong trang man hinh.
