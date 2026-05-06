"""Update JOURNAL data validation and FORMULAS matrix"""
import os, sys
sys.path.insert(0, os.path.dirname(__file__))
from google.oauth2.credentials import Credentials as OAuthCreds
from googleapiclient.discovery import build
import gspread

TOKEN_PATH = os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(__file__))), 'credentials', 'token.json')
SHEET_ID = '1PdCmBoBQsznOx6JXvOlbD-atxQnX9wHRXiM127f109I'

def fix_journal():
    creds = OAuthCreds.from_authorized_user_file(TOKEN_PATH, ['https://www.googleapis.com/auth/spreadsheets'])
    gc = gspread.authorize(creds)
    sh = gc.open_by_key(SHEET_ID)
    sheets_api = build('sheets', 'v4', credentials=creds)
    
    ws_formulas = sh.worksheet("FORMULAS")
    ws_journal = sh.worksheet("JOURNAL")

    # 1. Build the Helper Matrix in FORMULAS for Dependent Dropdown
    ws_formulas.update_acell('M1', 'MATRIX MÃ GD')
    matrix_formulas = []
    for i in range(2, 2001):
        f = f'=IFERROR(TRANSPOSE(IF(JOURNAL!$C{i}="Cổ phiếu", $A$2:$A, IF(JOURNAL!$C{i}="Phái sinh", $B$2:$B, {{""}}))), "")'
        matrix_formulas.append([f])
    ws_formulas.update('M2:M2000', matrix_formulas, value_input_option='USER_ENTERED')

    # 2. Add Data Validations to JOURNAL
    v_reqs = []
    
    # Helper to add ONE_OF_RANGE validation
    def add_val_range(col, range_str):
        v_reqs.append({
            'setDataValidation': {
                'range': {'sheetId': ws_journal.id, 'startRowIndex': 1, 'endRowIndex': 2000, 'startColumnIndex': col, 'endColumnIndex': col+1},
                'rule': {
                    'condition': {'type': 'ONE_OF_RANGE', 'values': [{'userEnteredValue': range_str}]},
                    'showCustomUi': True, 'strict': True
                }
            }
        })
        
    # Helper to add ONE_OF_LIST validation
    def add_val_list(col, lst):
        v_reqs.append({
            'setDataValidation': {
                'range': {'sheetId': ws_journal.id, 'startRowIndex': 1, 'endRowIndex': 2000, 'startColumnIndex': col, 'endColumnIndex': col+1},
                'rule': {
                    'condition': {'type': 'ONE_OF_LIST', 'values': [{'userEnteredValue': x} for x in lst]},
                    'showCustomUi': True, 'strict': True
                }
            }
        })

    # Clear old validations first
    clear_cols = [2, 3, 4, 5, 6, 21]
    for c in clear_cols:
        v_reqs.append({'setDataValidation': {'range': {'sheetId': ws_journal.id, 'startRowIndex': 1, 'endRowIndex': 2000, 'startColumnIndex': c, 'endColumnIndex': c+1}, 'rule': None}})

    # C(2): Tài sản
    add_val_list(2, ['Cổ phiếu', 'Phái sinh'])
    
    # E(4): Vị thế
    add_val_list(4, ['LONG', 'SHORT', 'Mua', 'Bán'])
    
    # D(3): Mã GD -> Dependent Dropdown
    add_val_range(3, '=FORMULAS!M2:Z2')
    
    # F(5): Loại lệnh
    add_val_range(5, '=FORMULAS!$E$2:$E')
    
    # G(6): Chiến lược
    add_val_range(6, '=FORMULAS!$C$2:$C')
    
    # V(21): Tâm lý
    add_val_range(21, '=FORMULAS!$D$2:$D')

    sheets_api.spreadsheets().batchUpdate(spreadsheetId=SHEET_ID, body={'requests': v_reqs}).execute()
    print("JOURNAL data validations and FORMULAS matrix fully restored.")

if __name__ == '__main__':
    fix_journal()
