"""Format and highlight formula vs manual columns"""
import os, sys
sys.path.insert(0, os.path.dirname(__file__))
from settings import SHEET_ID as CONFIGURED_SHEET_ID, TOKEN_PATH as CONFIGURED_TOKEN_PATH
from google.oauth2.credentials import Credentials as OAuthCreds
from googleapiclient.discovery import build
import gspread

TOKEN_PATH = str(CONFIGURED_TOKEN_PATH)
SHEET_ID = CONFIGURED_SHEET_ID

def format_columns():
    creds = OAuthCreds.from_authorized_user_file(TOKEN_PATH, ['https://www.googleapis.com/auth/spreadsheets'])
    gc = gspread.authorize(creds)
    sh = gc.open_by_key(SHEET_ID)
    sheets_api = build('sheets', 'v4', credentials=creds)
    
    ws_nk = sh.worksheet("JOURNAL")
    nk_id = ws_nk.id

    # AUTO columns (0-indexed): 0 (A), 11 (L), 17 (R), 18 (S), 19 (T), 20 (U)
    auto_cols = [0, 11, 17, 18, 19, 20]
    
    reqs = []
    
    # 1. Background for Auto Columns Body (Light Gray) to signal "Do not type"
    for col in auto_cols:
        reqs.append({
            'repeatCell': {
                'range': {'sheetId': nk_id, 'startRowIndex': 1, 'endRowIndex': 2000, 'startColumnIndex': col, 'endColumnIndex': col+1},
                'cell': {'userEnteredFormat': {'backgroundColor': {'red': 0.96, 'green': 0.96, 'blue': 0.96}}},
                'fields': 'userEnteredFormat.backgroundColor'
            }
        })
        
        # 2. Header for Auto Columns (Dark Teal / Green)
        reqs.append({
            'repeatCell': {
                'range': {'sheetId': nk_id, 'startRowIndex': 0, 'endRowIndex': 1, 'startColumnIndex': col, 'endColumnIndex': col+1},
                'cell': {'userEnteredFormat': {
                    'backgroundColor': {'red': 0.1, 'green': 0.4, 'blue': 0.3},
                    'textFormat': {'bold': True, 'foregroundColor': {'red': 1, 'green': 1, 'blue': 1}},
                    'horizontalAlignment': 'CENTER'
                }},
                'fields': 'userEnteredFormat(backgroundColor,textFormat,horizontalAlignment)'
            }
        })

    # Manual Columns Body (White)
    manual_ranges = [(1, 11), (12, 17), (21, 24)]
    for start, end in manual_ranges:
        reqs.append({
            'repeatCell': {
                'range': {'sheetId': nk_id, 'startRowIndex': 1, 'endRowIndex': 2000, 'startColumnIndex': start, 'endColumnIndex': end},
                'cell': {'userEnteredFormat': {'backgroundColor': {'red': 1, 'green': 1, 'blue': 1}}},
                'fields': 'userEnteredFormat.backgroundColor'
            }
        })
        # Manual Headers (Dark Navy)
        reqs.append({
            'repeatCell': {
                'range': {'sheetId': nk_id, 'startRowIndex': 0, 'endRowIndex': 1, 'startColumnIndex': start, 'endColumnIndex': end},
                'cell': {'userEnteredFormat': {
                    'backgroundColor': {'red': 0.05, 'green': 0.1, 'blue': 0.2},
                    'textFormat': {'bold': True, 'foregroundColor': {'red': 1, 'green': 1, 'blue': 1}},
                    'horizontalAlignment': 'CENTER'
                }},
                'fields': 'userEnteredFormat(backgroundColor,textFormat,horizontalAlignment)'
            }
        })

    sheets_api.spreadsheets().batchUpdate(spreadsheetId=SHEET_ID, body={'requests': reqs}).execute()
    print("Formatted UI to distinguish Auto vs Manual columns.")

if __name__ == '__main__':
    format_columns()
