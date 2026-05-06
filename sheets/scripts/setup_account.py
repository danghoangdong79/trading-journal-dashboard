import os, sys
sys.path.insert(0, os.path.dirname(__file__))
from google.oauth2.credentials import Credentials as OAuthCreds
from googleapiclient.discovery import build
import gspread

TOKEN_PATH = os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(__file__))), 'credentials', 'token.json')
SHEET_ID = '1PdCmBoBQsznOx6JXvOlbD-atxQnX9wHRXiM127f109I'

def setup_account_linking():
    creds = OAuthCreds.from_authorized_user_file(TOKEN_PATH, ['https://www.googleapis.com/auth/spreadsheets'])
    gc = gspread.authorize(creds)
    sh = gc.open_by_key(SHEET_ID)
    sheets_api = build('sheets', 'v4', credentials=creds)

    ws_setup = sh.worksheet("SETUP")
    ws_formulas = sh.worksheet("FORMULAS")
    ws_journal = sh.worksheet("JOURNAL")
    ws_summary = sh.worksheet("SUMMARY")
    
    # 0. Expand SETUP grid
    reqs = []
    reqs.append({
        'appendDimension': {
            'sheetId': ws_setup.id,
            'dimension': 'COLUMNS',
            'length': 5
        }
    })
    sheets_api.spreadsheets().batchUpdate(spreadsheetId=SHEET_ID, body={'requests': reqs}).execute()
    
    # 1. SETUP sheet: Add TÀI KHOẢN block at Col AJ (Index 35)
    setup_data = [
        ["TÀI KHOẢN", "", ""],
        ["Mã", "Tên", "Bật"],
        ["D920568", "TK Chính", True],
        ["T271298", "TK Phụ", True]
    ]
    ws_setup.update(range_name='AJ1:AL4', values=setup_data, value_input_option='USER_ENTERED')
    
    reqs = []
    reqs.append({
        'setDataValidation': {
            'range': {'sheetId': ws_setup.id, 'startRowIndex': 2, 'endRowIndex': 1000, 'startColumnIndex': 37, 'endColumnIndex': 38},
            'rule': {'condition': {'type': 'BOOLEAN'}}
        }
    })
    
    # Format Header in SETUP
    reqs.append({
        'repeatCell': {
            'range': {'sheetId': ws_setup.id, 'startRowIndex': 0, 'endRowIndex': 1, 'startColumnIndex': 35, 'endColumnIndex': 38},
            'cell': {'userEnteredFormat': {'backgroundColor': {'red': 0.1, 'green': 0.2, 'blue': 0.4}, 'textFormat': {'foregroundColor': {'red': 1, 'green': 1, 'blue': 1}, 'bold': True}}},
            'fields': 'userEnteredFormat(backgroundColor,textFormat)'
        }
    })
    reqs.append({
        'repeatCell': {
            'range': {'sheetId': ws_setup.id, 'startRowIndex': 1, 'endRowIndex': 2, 'startColumnIndex': 35, 'endColumnIndex': 38},
            'cell': {'userEnteredFormat': {'backgroundColor': {'red': 0.9, 'green': 0.9, 'blue': 0.9}, 'textFormat': {'bold': True}}},
            'fields': 'userEnteredFormat(backgroundColor,textFormat)'
        }
    })
    
    # 2. FORMULAS sheet: Add at Col I and J
    # I1 = TÀI KHOẢN, J1 = TÀI KHOẢN (LỌC)
    formulas_data = [
        ["TÀI KHOẢN", "TÀI KHOẢN (LỌC)"],
        ['=IFERROR(FILTER(SETUP!AJ3:AJ, SETUP!AL3:AL=TRUE), "")', '={"Tất cả"; IFERROR(FILTER(SETUP!AJ3:AJ, SETUP!AL3:AL=TRUE), "")}']
    ]
    ws_formulas.update(range_name='I1:J2', values=formulas_data, value_input_option='USER_ENTERED')
    
    # 3. JOURNAL sheet: Update Data Validation for Col B to point to FORMULAS!I2:I
    # Range condition
    reqs.append({
        'setDataValidation': {
            'range': {'sheetId': ws_journal.id, 'startRowIndex': 1, 'endRowIndex': 2000, 'startColumnIndex': 1, 'endColumnIndex': 2},
            'rule': {
                'condition': {
                    'type': 'ONE_OF_RANGE',
                    'values': [{'userEnteredValue': '=FORMULAS!$I$2:$I'}]
                },
                'showCustomUi': True,
                'strict': True
            }
        }
    })
    
    # 4. SUMMARY sheet: Update Data Validation for Col C8 to point to FORMULAS!J2:J
    reqs.append({
        'setDataValidation': {
            'range': {'sheetId': ws_summary.id, 'startRowIndex': 7, 'endRowIndex': 8, 'startColumnIndex': 2, 'endColumnIndex': 3},
            'rule': {
                'condition': {
                    'type': 'ONE_OF_RANGE',
                    'values': [{'userEnteredValue': '=FORMULAS!$J$2:$J'}]
                },
                'showCustomUi': True,
                'strict': True
            }
        }
    })
    
    sheets_api.spreadsheets().batchUpdate(spreadsheetId=SHEET_ID, body={'requests': reqs}).execute()
    print("Account Setup, Formulas, and Data Validation linked successfully")

if __name__ == '__main__':
    setup_account_linking()
