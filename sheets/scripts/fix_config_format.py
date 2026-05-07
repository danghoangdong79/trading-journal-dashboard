"""Fix CONFIG formats and realistic market data"""
import os, sys
sys.path.insert(0, os.path.dirname(__file__))
from settings import SHEET_ID as CONFIGURED_SHEET_ID, TOKEN_PATH as CONFIGURED_TOKEN_PATH
from google.oauth2.credentials import Credentials as OAuthCreds
from googleapiclient.discovery import build

TOKEN_PATH = str(CONFIGURED_TOKEN_PATH)
SHEET_ID = CONFIGURED_SHEET_ID

def fix_config():
    creds = OAuthCreds.from_authorized_user_file(TOKEN_PATH, ['https://www.googleapis.com/auth/spreadsheets'])
    sheets_api = build('sheets', 'v4', credentials=creds)

    # 1. First get sheet IDs
    res = sheets_api.spreadsheets().get(spreadsheetId=SHEET_ID).execute()
    config_id = None
    journal_id = None
    for s in res['sheets']:
        if s['properties']['title'] == 'CONFIG':
            config_id = s['properties']['sheetId']
        if s['properties']['title'] == 'JOURNAL':
            journal_id = s['properties']['sheetId']

    reqs = []
    
    # 2. Update the data values directly
    data_updates = [
        {'range': 'CONFIG!A3:C8', 'values': [
            ["Cổ Phiếu", "Hệ số giá", 1000],
            ["Cổ Phiếu", "Phí giao dịch", 0.0015],
            ["Cổ Phiếu", "Thuế TNCN (Bán)", 0.0010],
            ["Phái Sinh", "Hệ số điểm", 100000],
            ["Phái Sinh", "Phí GD / chiều", 4000],
            ["Phái Sinh", "Thuế / chiều (ước tính)", 1000]
        ]}
    ]
    sheets_api.spreadsheets().values().batchUpdate(
        spreadsheetId=SHEET_ID, 
        body={'valueInputOption': 'USER_ENTERED', 'data': data_updates}
    ).execute()

    # 3. Precise Formatting via batchUpdate
    # Clear formats first in C3:C8
    reqs.append({
        'repeatCell': {
            'range': {'sheetId': config_id, 'startRowIndex': 2, 'endRowIndex': 8, 'startColumnIndex': 2, 'endColumnIndex': 3},
            'cell': {'userEnteredFormat': {'numberFormat': {'type': 'NUMBER', 'pattern': '#,##0'}}},
            'fields': 'userEnteredFormat.numberFormat'
        }
    })
    # Set C4:C5 as Percent
    reqs.append({
        'repeatCell': {
            'range': {'sheetId': config_id, 'startRowIndex': 3, 'endRowIndex': 5, 'startColumnIndex': 2, 'endColumnIndex': 3},
            'cell': {'userEnteredFormat': {'numberFormat': {'type': 'PERCENT', 'pattern': '0.00%'}}},
            'fields': 'userEnteredFormat.numberFormat'
        }
    })
    # Set G3:G4 as Currency
    reqs.append({
        'repeatCell': {
            'range': {'sheetId': config_id, 'startRowIndex': 2, 'endRowIndex': 4, 'startColumnIndex': 6, 'endColumnIndex': 7},
            'cell': {'userEnteredFormat': {'numberFormat': {'type': 'CURRENCY', 'pattern': '#,##0\ "₫"'}}},
            'fields': 'userEnteredFormat.numberFormat'
        }
    })
    # Set G5:G6 as Percent
    reqs.append({
        'repeatCell': {
            'range': {'sheetId': config_id, 'startRowIndex': 4, 'endRowIndex': 6, 'startColumnIndex': 6, 'endColumnIndex': 7},
            'cell': {'userEnteredFormat': {'numberFormat': {'type': 'PERCENT', 'pattern': '0.0%'}}},
            'fields': 'userEnteredFormat.numberFormat'
        }
    })
    
    sheets_api.spreadsheets().batchUpdate(spreadsheetId=SHEET_ID, body={'requests': reqs}).execute()

    # 4. Update JOURNAL Formulas
    # New formula for Phí & Thuế (T1) accounts for C8 (Thuế Phái Sinh)
    t_f = '={"Phí & Thuế"; ARRAYFORMULA(IF(D2:D="", "", IF(O2:O="", "", IF(C2:C="Phái sinh", M2:M * (CONFIG!$C$7 + CONFIG!$C$8) * 2, (N2:N * M2:M * CONFIG!$C$3 * CONFIG!$C$4) + (O2:O * M2:M * CONFIG!$C$3 * (CONFIG!$C$4 + CONFIG!$C$5))))))}'
    
    sheets_api.spreadsheets().values().update(
        spreadsheetId=SHEET_ID,
        range='JOURNAL!T1',
        valueInputOption='USER_ENTERED',
        body={'values': [[t_f]]}
    ).execute()
    
    print("Formatting and market parameters updated successfully.")

if __name__ == '__main__':
    fix_config()
