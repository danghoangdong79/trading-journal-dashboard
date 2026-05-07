import os, sys
sys.path.insert(0, os.path.dirname(__file__))
from settings import SHEET_ID as CONFIGURED_SHEET_ID, TOKEN_PATH as CONFIGURED_TOKEN_PATH
from google.oauth2.credentials import Credentials as OAuthCreds
from googleapiclient.discovery import build
import gspread

TOKEN_PATH = str(CONFIGURED_TOKEN_PATH)
SHEET_ID = CONFIGURED_SHEET_ID

def fix_data_and_format():
    creds = OAuthCreds.from_authorized_user_file(TOKEN_PATH, ['https://www.googleapis.com/auth/spreadsheets'])
    gc = gspread.authorize(creds)
    sh = gc.open_by_key(SHEET_ID)
    sheets_api = build('sheets', 'v4', credentials=creds)

    ws_journal = sh.worksheet("JOURNAL")
    ws_setup = sh.worksheet("SETUP")
    
    # 1. Update SETUP Tâm Lý list
    journal_tamly = ws_journal.col_values(22)[1:] # Col V is index 21 -> 22 for col_values
    setup_tamly = ws_setup.col_values(26)[2:] # Col Z is 26. Skip header rows
    
    # Find new values
    new_tamly = [t for t in set(journal_tamly) if t and t not in setup_tamly]
    if new_tamly:
        start_row = len(setup_tamly) + 3
        # Prepare data to append
        cells = []
        for i, val in enumerate(new_tamly):
            cells.append([val])
        ws_setup.update(values=cells, range_name=f'Z{start_row}', value_input_option='USER_ENTERED')
        
    # 2. Modify some rows to exactly hit SL or TP
    # We will fetch all data and find the rows we inserted earlier.
    journal_data = ws_journal.get_all_values()
    
    # Update requests
    reqs = []
    
    # Find rows by Mã GD and Date to be safe
    for i, row in enumerate(journal_data):
        if len(row) > 16:
            ma = row[3]
            ngay = row[7]
            if ma == 'VN30F1M' and ngay == '15/04/2025': # Loss
                # Set SL = 1250
                reqs.append({'updateCells': {'range': {'sheetId': ws_journal.id, 'startRowIndex': i, 'endRowIndex': i+1, 'startColumnIndex': 15, 'endColumnIndex': 16}, 'rows': [{'values': [{'userEnteredValue': {'numberValue': 1250}}]}], 'fields': 'userEnteredValue'}})
            elif ma == 'MWG' and ngay == '20/05/2025': # Win SHORT
                # Set TP = 50.0
                reqs.append({'updateCells': {'range': {'sheetId': ws_journal.id, 'startRowIndex': i, 'endRowIndex': i+1, 'startColumnIndex': 16, 'endColumnIndex': 17}, 'rows': [{'values': [{'userEnteredValue': {'numberValue': 50.0}}]}], 'fields': 'userEnteredValue'}})
            elif ma == 'SSI' and ngay == '05/09/2025': # Loss LONG
                # Set SL = 33.0
                reqs.append({'updateCells': {'range': {'sheetId': ws_journal.id, 'startRowIndex': i, 'endRowIndex': i+1, 'startColumnIndex': 15, 'endColumnIndex': 16}, 'rows': [{'values': [{'userEnteredValue': {'numberValue': 33.0}}]}], 'fields': 'userEnteredValue'}})
            elif ma == 'TCB' and ngay == '05/01/2026': # Win LONG
                # Set TP = 45.0 (Giá đóng is 45.0)
                reqs.append({'updateCells': {'range': {'sheetId': ws_journal.id, 'startRowIndex': i, 'endRowIndex': i+1, 'startColumnIndex': 14, 'endColumnIndex': 15}, 'rows': [{'values': [{'userEnteredValue': {'numberValue': 45.0}}]}], 'fields': 'userEnteredValue'}})
                reqs.append({'updateCells': {'range': {'sheetId': ws_journal.id, 'startRowIndex': i, 'endRowIndex': i+1, 'startColumnIndex': 16, 'endColumnIndex': 17}, 'rows': [{'values': [{'userEnteredValue': {'numberValue': 45.0}}]}], 'fields': 'userEnteredValue'}})

    # 3. Add Conditional Formatting for HIT SL / HIT TP
    # Col O is Giá đóng (Index 14)
    # SL is Col P (Index 15)
    # TP is Col Q (Index 16)
    
    # Hit SL -> Red Background, Bold text
    rule_sl = {
        'addConditionalFormatRule': {
            'rule': {
                'ranges': [{'sheetId': ws_journal.id, 'startRowIndex': 1, 'endRowIndex': 2000, 'startColumnIndex': 14, 'endColumnIndex': 15}],
                'booleanRule': {
                    'condition': {
                        'type': 'CUSTOM_FORMULA',
                        'values': [{'userEnteredValue': '=AND($O2<>"", $P2<>"", $O2=$P2)'}]
                    },
                    'format': {
                        'backgroundColor': {'red': 0.96, 'green': 0.8, 'blue': 0.8},
                        'textFormat': {'bold': True, 'foregroundColor': {'red': 0.8, 'green': 0, 'blue': 0}}
                    }
                }
            },
            'index': 0
        }
    }
    
    # Hit TP -> Green Background, Bold text
    rule_tp = {
        'addConditionalFormatRule': {
            'rule': {
                'ranges': [{'sheetId': ws_journal.id, 'startRowIndex': 1, 'endRowIndex': 2000, 'startColumnIndex': 14, 'endColumnIndex': 15}],
                'booleanRule': {
                    'condition': {
                        'type': 'CUSTOM_FORMULA',
                        'values': [{'userEnteredValue': '=AND($O2<>"", $Q2<>"", $O2=$Q2)'}]
                    },
                    'format': {
                        'backgroundColor': {'red': 0.85, 'green': 0.92, 'blue': 0.83},
                        'textFormat': {'bold': True, 'foregroundColor': {'red': 0.15, 'green': 0.45, 'blue': 0.15}}
                    }
                }
            },
            'index': 1
        }
    }
    
    reqs.append(rule_sl)
    reqs.append(rule_tp)
    
    sheets_api.spreadsheets().batchUpdate(spreadsheetId=SHEET_ID, body={'requests': reqs}).execute()
    print("Fixed Data, updated Dropdown and added CF successfully")

if __name__ == '__main__':
    fix_data_and_format()
