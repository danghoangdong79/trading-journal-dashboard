import os, sys
sys.path.insert(0, os.path.dirname(__file__))
from google.oauth2.credentials import Credentials as OAuthCreds
from googleapiclient.discovery import build
import gspread

TOKEN_PATH = os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(__file__))), 'credentials', 'token.json')
SHEET_ID = '1PdCmBoBQsznOx6JXvOlbD-atxQnX9wHRXiM127f109I'

def add_account_filter():
    creds = OAuthCreds.from_authorized_user_file(TOKEN_PATH, ['https://www.googleapis.com/auth/spreadsheets'])
    gc = gspread.authorize(creds)
    sh = gc.open_by_key(SHEET_ID)
    sheets_api = build('sheets', 'v4', credentials=creds)

    ws_journal = sh.worksheet("JOURNAL")
    sid_journal = ws_journal.id
    ws_summary = sh.worksheet("SUMMARY")
    sid_summary = ws_summary.id
    
    # 1. Update JOURNAL Data Validation
    # We will use the existing accounts as the list
    accounts = list(set([x for x in ws_journal.col_values(2)[1:] if x.strip()]))
    if not accounts:
        accounts = ["D920568", "T271298"] # Fallback
    
    acc_rule = {
        'condition': {
            'type': 'ONE_OF_LIST',
            'values': [{'userEnteredValue': a} for a in accounts]
        },
        'showCustomUi': True
    }
    
    # 2. Update SUMMARY Layout
    ws_summary.update('B8', [["Lọc Tài khoản"]], value_input_option='USER_ENTERED')
    ws_summary.update('C8', [["Tất cả"]], value_input_option='USER_ENTERED')
    
    # 3. Update SUMMARY Query String
    # B = Tài khoản
    query_str = '="SELECT A, C, D, E, G, H, J, L, M, N, O, R, S, T, U, V, W WHERE D IS NOT NULL " & IF(C4="Tất cả", "", " AND C = \'" & C4 & "\' ") & IF(C6="Tất cả", "", " AND G = \'" & C6 & "\' ") & IF(C5="Tất cả", "", " AND E = \'" & C5 & "\' ") & IF(C7="Tất cả", "", " AND X = \'" & C7 & "\' ") & IF(C8="Tất cả", "", " AND B = \'" & C8 & "\' ") & IF(E4="Theo tháng", IF(E5="Tất cả", "", " AND YEAR(H) = " & E5 & " ") & IF(E6="Tất cả", "", " AND month(H) = " & IFERROR(E6-1, 0) & " "), IF(ISBLANK(E7), "", " AND H >= date \'" & TEXT(E7, "yyyy-mm-dd") & "\' ") & IF(ISBLANK(E8), "", " AND H <= date \'" & TEXT(E8, "yyyy-mm-dd") & "\' "))'
    ws_summary.update('Z1', [[query_str]], value_input_option='USER_ENTERED')
    
    # 4. Batch Update Data Validations
    reqs = []
    
    # JOURNAL B2:B
    reqs.append({
        'setDataValidation': {
            'range': {'sheetId': sid_journal, 'startRowIndex': 1, 'endRowIndex': 2000, 'startColumnIndex': 1, 'endColumnIndex': 2},
            'rule': acc_rule
        }
    })
    
    # SUMMARY C8
    summary_acc_rule = {
        'condition': {
            'type': 'ONE_OF_LIST',
            'values': [{'userEnteredValue': 'Tất cả'}] + [{'userEnteredValue': a} for a in accounts]
        },
        'showCustomUi': True
    }
    reqs.append({
        'setDataValidation': {
            'range': {'sheetId': sid_summary, 'startRowIndex': 7, 'endRowIndex': 8, 'startColumnIndex': 2, 'endColumnIndex': 3},
            'rule': summary_acc_rule
        }
    })
    
    sheets_api.spreadsheets().batchUpdate(spreadsheetId=SHEET_ID, body={'requests': reqs}).execute()
    print("Account filters added successfully")

if __name__ == '__main__':
    add_account_filter()
