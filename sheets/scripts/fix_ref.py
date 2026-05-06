import os, sys
sys.path.insert(0, os.path.dirname(__file__))
from google.oauth2.credentials import Credentials as OAuthCreds
from googleapiclient.discovery import build
import gspread

TOKEN_PATH = os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(__file__))), 'credentials', 'token.json')
SHEET_ID = '1PdCmBoBQsznOx6JXvOlbD-atxQnX9wHRXiM127f109I'

def fix_ref():
    creds = OAuthCreds.from_authorized_user_file(TOKEN_PATH, ['https://www.googleapis.com/auth/spreadsheets'])
    sheets_api = build('sheets', 'v4', credentials=creds)
    
    # We will clear A2:A, L2:L, R2:U in JOURNAL
    # First, get the sheetId of JOURNAL
    gc = gspread.authorize(creds)
    sh = gc.open_by_key(SHEET_ID)
    ws_journal = sh.worksheet("JOURNAL")
    sid = ws_journal.id
    
    # Clear the values in these columns to unblock the ARRAYFORMULAS in Row 1
    reqs = [
        {'updateCells': {'range': {'sheetId': sid, 'startRowIndex': 1, 'startColumnIndex': 0, 'endColumnIndex': 1}, 'fields': 'userEnteredValue'}}, # Col A
        {'updateCells': {'range': {'sheetId': sid, 'startRowIndex': 1, 'startColumnIndex': 11, 'endColumnIndex': 12}, 'fields': 'userEnteredValue'}}, # Col L
        {'updateCells': {'range': {'sheetId': sid, 'startRowIndex': 1, 'startColumnIndex': 17, 'endColumnIndex': 21}, 'fields': 'userEnteredValue'}}, # Col R, S, T, U
    ]
    
    sheets_api.spreadsheets().batchUpdate(spreadsheetId=SHEET_ID, body={'requests': reqs}).execute()
    print("Fixed #REF by clearing hardcoded values")

if __name__ == '__main__':
    fix_ref()
