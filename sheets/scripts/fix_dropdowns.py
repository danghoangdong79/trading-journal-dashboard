"""Fix dropdowns using Sheets API directly"""
import json, os, sys
sys.path.insert(0, os.path.dirname(__file__))
from settings import SHEET_ID as CONFIGURED_SHEET_ID, TOKEN_PATH as CONFIGURED_TOKEN_PATH

from google.oauth2.credentials import Credentials as OAuthCreds
from googleapiclient.discovery import build

TOKEN_PATH = str(CONFIGURED_TOKEN_PATH)
SHEET_ID = CONFIGURED_SHEET_ID

creds = OAuthCreds.from_authorized_user_file(TOKEN_PATH, [
    'https://www.googleapis.com/auth/spreadsheets',
    'https://www.googleapis.com/auth/drive'
])
service = build('sheets', 'v4', credentials=creds)

# Get JOURNAL sheet ID
meta = service.spreadsheets().get(spreadsheetId=SHEET_ID).execute()
journal_sheet_id = None
for s in meta['sheets']:
    if s['properties']['title'] == 'JOURNAL':
        journal_sheet_id = s['properties']['sheetId']
        break

config_path = os.path.join(os.path.dirname(__file__), '..', 'templates', 'config.json')
with open(config_path, 'r', encoding='utf-8') as f:
    config = json.load(f)

trang_thai = [o['icon'] + ' ' + o['value'] for o in config['trang_thai_options']]
tam_ly = [o['icon'] + ' ' + o['value'] for o in config['tam_ly_options']]

dropdowns = [
    (1, trang_thai),          # B = col index 1
    (2, ['Phái sinh', 'Cổ phiếu']),  # C
    (4, config['chien_luoc_options']),  # E
    (5, ['Long', 'Short', 'Mua', 'Bán']),  # F
    (6, ['ATO', 'Sáng', 'Chiều', 'ATC']),  # G
    (32, tam_ly),             # AG = col index 32
]

requests = []
for col_idx, values in dropdowns:
    requests.append({
        'setDataValidation': {
            'range': {
                'sheetId': journal_sheet_id,
                'startRowIndex': 1,
                'endRowIndex': 1000,
                'startColumnIndex': col_idx,
                'endColumnIndex': col_idx + 1
            },
            'rule': {
                'condition': {
                    'type': 'ONE_OF_LIST',
                    'values': [{'userEnteredValue': v} for v in values]
                },
                'showCustomUi': True,
                'strict': False
            }
        }
    })

result = service.spreadsheets().batchUpdate(
    spreadsheetId=SHEET_ID,
    body={'requests': requests}
).execute()

print(f"Done! {len(requests)} dropdowns created.")
