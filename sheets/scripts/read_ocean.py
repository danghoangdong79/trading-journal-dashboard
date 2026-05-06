"""Đọc toàn bộ cấu trúc sheet Ocean Edition"""
import json, os
from google.oauth2.service_account import Credentials
import gspread

creds = Credentials.from_service_account_file(
    r'credentials\gen-lang-client-0658622290-67f651f4974d.json',
    scopes=['https://www.googleapis.com/auth/spreadsheets','https://www.googleapis.com/auth/drive']
)
gc = gspread.authorize(creds)

# List files to find Ocean Edition
from googleapiclient.discovery import build
service = build('drive', 'v3', credentials=creds)
results = service.files().list(pageSize=50, fields='files(id,name)').execute()
for f in results['files']:
    if 'Ocean' in f['name'] or 'Nhat ky' in f['name'].lower() or 'nh' in f['name'].lower():
        print(f"Found: {f['name']} => {f['id']}")

# Open Ocean Edition
ocean_id = None
for f in results['files']:
    if 'Ocean' in f['name']:
        ocean_id = f['id']
        break

if not ocean_id:
    print("Not found!"); exit()

sh = gc.open_by_key(ocean_id)
worksheets = sh.worksheets()
print(f"\nWorksheets: {[ws.title for ws in worksheets]}")
print(f"Total: {len(worksheets)} sheets\n")

output = {}
for ws in worksheets:
    print(f"Reading: {ws.title} ({ws.row_count}x{ws.col_count})...")
    try:
        values = ws.get_all_values()
        # Find non-empty rows
        meaningful_rows = []
        for i, row in enumerate(values[:50]):  # First 50 rows
            non_empty = [(j, c) for j, c in enumerate(row) if c.strip()]
            if len(non_empty) >= 2:
                meaningful_rows.append({'row': i+1, 'cells': non_empty})
        output[ws.title] = {
            'dimensions': f'{ws.row_count}x{ws.col_count}',
            'total_data_rows': len([r for r in values if any(c.strip() for c in r)]),
            'meaningful_rows': meaningful_rows
        }
    except Exception as e:
        output[ws.title] = {'error': str(e)}

with open('ocean_structure.json', 'w', encoding='utf-8') as f:
    json.dump(output, f, ensure_ascii=False, indent=2)
print("\nDone! => ocean_structure.json")
