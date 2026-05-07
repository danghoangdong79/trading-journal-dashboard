import os, sys
sys.path.insert(0, os.path.dirname(__file__))
from settings import SHEET_ID as CONFIGURED_SHEET_ID, TOKEN_PATH as CONFIGURED_TOKEN_PATH
from google.oauth2.credentials import Credentials as OAuthCreds
from googleapiclient.discovery import build
import gspread

TOKEN_PATH = str(CONFIGURED_TOKEN_PATH)
SHEET_ID = CONFIGURED_SHEET_ID

def fix_setup_cols():
    creds = OAuthCreds.from_authorized_user_file(TOKEN_PATH, ['https://www.googleapis.com/auth/spreadsheets'])
    sheets_api = build('sheets', 'v4', credentials=creds)
    gc = gspread.authorize(creds)
    sh = gc.open_by_key(SHEET_ID)
    ws_setup = sh.worksheet("SETUP")
    sid = ws_setup.id
    
    reqs = []
    
    # 1. Clear Data Validation for AI to AM (Indices 34 to 38)
    reqs.append({
        'setDataValidation': {
            'range': {'sheetId': sid, 'startRowIndex': 0, 'endRowIndex': 1000, 'startColumnIndex': 34, 'endColumnIndex': 39},
            'rule': None # Clearing rule
        }
    })
    
    # 2. Re-apply Checkbox Data Validation ONLY for AL3:AL (startRow: 2, col: 37)
    reqs.append({
        'setDataValidation': {
            'range': {'sheetId': sid, 'startRowIndex': 2, 'endRowIndex': 1000, 'startColumnIndex': 37, 'endColumnIndex': 38},
            'rule': {'condition': {'type': 'BOOLEAN'}}
        }
    })
    
    # 3. Clear Formatting for AI to AM (Except the headers we will set next)
    # We can just reset all formatting to default for AI:AM
    reqs.append({
        'updateCells': {
            'range': {'sheetId': sid, 'startRowIndex': 0, 'endRowIndex': 1000, 'startColumnIndex': 34, 'endColumnIndex': 39},
            'fields': 'userEnteredFormat' # empty format clears it
        }
    })
    
    # 4. Re-apply Header formatting for AJ1:AL1
    reqs.append({
        'repeatCell': {
            'range': {'sheetId': sid, 'startRowIndex': 0, 'endRowIndex': 1, 'startColumnIndex': 35, 'endColumnIndex': 38},
            'cell': {'userEnteredFormat': {'backgroundColor': {'red': 0.05, 'green': 0.15, 'blue': 0.35}, 'textFormat': {'foregroundColor': {'red': 1, 'green': 1, 'blue': 1}, 'bold': True}, 'horizontalAlignment': 'CENTER'}},
            'fields': 'userEnteredFormat(backgroundColor,textFormat,horizontalAlignment)'
        }
    })
    
    # Re-apply Header formatting for AJ2:AL2
    reqs.append({
        'repeatCell': {
            'range': {'sheetId': sid, 'startRowIndex': 1, 'endRowIndex': 2, 'startColumnIndex': 35, 'endColumnIndex': 38},
            'cell': {'userEnteredFormat': {'backgroundColor': {'red': 0.9, 'green': 0.9, 'blue': 0.9}, 'textFormat': {'bold': True}, 'horizontalAlignment': 'CENTER'}},
            'fields': 'userEnteredFormat(backgroundColor,textFormat,horizontalAlignment)'
        }
    })
    
    # 5. Clear contents (like stray TRUE/FALSE texts) in AI:AM, EXCEPT the known data in AJ1:AL4
    # Actually, if we just clear validation, the text "FALSE" or "TRUE" might remain.
    # Let's clear the text in AI:AI (34)
    reqs.append({'updateCells': {'range': {'sheetId': sid, 'startRowIndex': 0, 'endRowIndex': 1000, 'startColumnIndex': 34, 'endColumnIndex': 35}, 'fields': 'userEnteredValue'}})
    # Clear AM:AM (38)
    reqs.append({'updateCells': {'range': {'sheetId': sid, 'startRowIndex': 0, 'endRowIndex': 1000, 'startColumnIndex': 38, 'endColumnIndex': 39}, 'fields': 'userEnteredValue'}})
    # Clear AJ5:AL1000 (below our 2 accounts)
    reqs.append({'updateCells': {'range': {'sheetId': sid, 'startRowIndex': 4, 'endRowIndex': 1000, 'startColumnIndex': 35, 'endColumnIndex': 38}, 'fields': 'userEnteredValue'}})

    sheets_api.spreadsheets().batchUpdate(spreadsheetId=SHEET_ID, body={'requests': reqs}).execute()
    print("Fixed Setup columns formatting and validation")

if __name__ == '__main__':
    fix_setup_cols()
