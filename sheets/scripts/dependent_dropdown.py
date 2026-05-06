"""Setup Dependent Dropdowns for Tickers"""
import os, sys
sys.path.insert(0, os.path.dirname(__file__))
from google.oauth2.credentials import Credentials as OAuthCreds
from googleapiclient.discovery import build
import gspread

TOKEN_PATH = os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(__file__))), 'credentials', 'token.json')
SHEET_ID = '1PdCmBoBQsznOx6JXvOlbD-atxQnX9wHRXiM127f109I'

def setup_dropdowns():
    creds = OAuthCreds.from_authorized_user_file(TOKEN_PATH, ['https://www.googleapis.com/auth/spreadsheets'])
    gc = gspread.authorize(creds)
    sh = gc.open_by_key(SHEET_ID)
    sheets_api = build('sheets', 'v4', credentials=creds)
    
    ws_setup = sh.worksheet("SETUP")
    ws_formulas = sh.worksheet("FORMULAS")
    ws_journal = sh.worksheet("JOURNAL")

    # 1. Read existing SETUP MÃ GD
    setup_vals = ws_setup.get('A3:D20')
    
    # 2. Shift and add "Phân loại"
    # Old: Mã(0), Tên(1), Mô tả(2), Trạng thái(3)
    # New: Mã, Phân loại, Tên, Mô tả, Trạng thái
    new_setup = []
    for r in setup_vals:
        if not r or not r[0]: continue
        ma = r[0]
        phan_loai = "Phái sinh" if "VN30" in ma or "1G" in ma else "Cổ phiếu"
        ten = r[1] if len(r) > 1 else ""
        mo_ta = r[2] if len(r) > 2 else ""
        trang_thai = r[3] if len(r) > 3 else "TRUE"
        new_setup.append([ma, phan_loai, ten, mo_ta, trang_thai])
    
    # Update headers
    ws_setup.update('B2:E2', [["Phân loại", "Tên", "Mô tả", "Trạng thái"]], value_input_option='USER_ENTERED')
    
    # Update data
    ws_setup.batch_clear(["A3:E20"])
    if new_setup:
        ws_setup.update('A3:E' + str(2 + len(new_setup)), new_setup, value_input_option='USER_ENTERED')
        
    # Validation for Phân loại in SETUP (Optional but good)
    val_pl = {'setDataValidation': {'range': {'sheetId': ws_setup.id, 'startRowIndex': 2, 'endRowIndex': 100, 'startColumnIndex': 1, 'endColumnIndex': 2}, 'rule': {'condition': {'type': 'ONE_OF_LIST', 'values': [{'userEnteredValue': 'Cổ phiếu'}, {'userEnteredValue': 'Phái sinh'}]}, 'showCustomUi': True, 'strict': True}}}
    sheets_api.spreadsheets().batchUpdate(spreadsheetId=SHEET_ID, body={'requests': [val_pl]}).execute()

    # 3. Write Helper Matrix in FORMULAS
    # M1 = Header
    ws_formulas.update_acell('M1', 'MATRIX MÃ GD')
    matrix_formulas = []
    for i in range(2, 2001):
        f = f'=IFERROR(TRANSPOSE(FILTER(SETUP!$A$3:$A, SETUP!$B$3:$B = JOURNAL!$C{i}, SETUP!$E$3:$E = TRUE)), "")'
        matrix_formulas.append([f])
        
    ws_formulas.update('M2:M2000', matrix_formulas, value_input_option='USER_ENTERED')

    # 4. Set Data Validation in JOURNAL!D2:D2000 pointing to FORMULAS!M:Z relatively
    val_dependent = {
        'setDataValidation': {
            'range': {'sheetId': ws_journal.id, 'startRowIndex': 1, 'endRowIndex': 2000, 'startColumnIndex': 3, 'endColumnIndex': 4},
            'rule': {
                'condition': {
                    'type': 'ONE_OF_RANGE', 
                    'values': [{'userEnteredValue': '=FORMULAS!M2:Z2'}]
                }, 
                'showCustomUi': True, 
                'strict': True
            }
        }
    }
    
    # Note: Clearing old validation in D first to be safe
    clear_val = {'setDataValidation': {'range': {'sheetId': ws_journal.id, 'startRowIndex': 1, 'endRowIndex': 2000, 'startColumnIndex': 3, 'endColumnIndex': 4}, 'rule': None}}
    
    sheets_api.spreadsheets().batchUpdate(spreadsheetId=SHEET_ID, body={'requests': [clear_val, val_dependent]}).execute()

    print("Dependent dropdowns created successfully!")

if __name__ == '__main__':
    setup_dropdowns()
