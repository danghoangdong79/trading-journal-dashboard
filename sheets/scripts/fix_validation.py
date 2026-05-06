import os, sys
sys.path.insert(0, os.path.dirname(__file__))
from google.oauth2.credentials import Credentials as OAuthCreds
from googleapiclient.discovery import build
import gspread

TOKEN_PATH = os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(__file__))), 'credentials', 'token.json')
SHEET_ID = '1PdCmBoBQsznOx6JXvOlbD-atxQnX9wHRXiM127f109I'

def fix_validation():
    creds = OAuthCreds.from_authorized_user_file(TOKEN_PATH, ['https://www.googleapis.com/auth/spreadsheets'])
    gc = gspread.authorize(creds)
    sh = gc.open_by_key(SHEET_ID)
    sheets_api = build('sheets', 'v4', credentials=creds)

    ws = sh.worksheet("SUMMARY")
    sid = ws.id
    
    ws_setup = sh.worksheet("SETUP")
    # Tên của Chiến Lược nằm ở cột V (index 21)
    strategies = []
    for r in ws_setup.get_all_values()[2:]:
        if len(r) > 21 and r[21].strip():
            strategies.append(r[21].strip())
            
    strat_list = [{'userEnteredValue': 'Tất cả'}] + [{'userEnteredValue': s} for s in strategies]
    
    reqs = []
    # Cập nhật Data Validation cho Lọc Chiến lược (ô C6) - startRow=5, endRow=6, startCol=2, endCol=3
    reqs.append({
        'setDataValidation': {
            'range': {'sheetId': sid, 'startRowIndex': 5, 'endRowIndex': 6, 'startColumnIndex': 2, 'endColumnIndex': 3},
            'rule': {'condition': {'type': 'ONE_OF_LIST', 'values': strat_list}, 'showCustomUi': True}
        }
    })
    
    sheets_api.spreadsheets().batchUpdate(spreadsheetId=SHEET_ID, body={'requests': reqs}).execute()
    print("Fixed Validation successfully")

if __name__ == '__main__':
    fix_validation()
