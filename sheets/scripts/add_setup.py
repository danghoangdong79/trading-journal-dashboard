"""Tạo sheet SETUP và đổi tên viết hoa"""
import os, sys, time
sys.path.insert(0, os.path.dirname(__file__))
from settings import SHEET_ID as CONFIGURED_SHEET_ID, TOKEN_PATH as CONFIGURED_TOKEN_PATH
from google.oauth2.credentials import Credentials as OAuthCreds
from googleapiclient.discovery import build
import gspread

TOKEN_PATH = str(CONFIGURED_TOKEN_PATH)
SHEET_ID = CONFIGURED_SHEET_ID

def get_gc():
    creds = OAuthCreds.from_authorized_user_file(TOKEN_PATH, ['https://www.googleapis.com/auth/spreadsheets'])
    return gspread.authorize(creds), creds

def update_setup():
    gc, creds = get_gc()
    sh = gc.open_by_key(SHEET_ID)
    sheets_api = build('sheets', 'v4', credentials=creds)

    print("1. Đổi tên sheet sang viết hoa...")
    for ws in sh.worksheets():
        ws.update_title(ws.title.upper())

    print("2. Tạo sheet SETUP...")
    try:
        ws_setup = sh.worksheet("SETUP")
    except:
        ws_setup = sh.add_worksheet("SETUP", rows=100, cols=20)
        # Move SETUP to index 1 (after CONFIG)
        sheets_api.spreadsheets().batchUpdate(
            spreadsheetId=SHEET_ID,
            body={"requests": [{"updateSheetProperties": {"properties": {"sheetId": ws_setup.id, "index": 1}, "fields": "index"}}]}
        ).execute()

    ws_setup.clear()
    
    # Header logic
    setup_data = []
    setup_data.append(["MÃ GIAO DỊCH", "", "", "", "", "CHIẾN LƯỢC", "", "", "", "", "TÂM LÝ", "", "", "", "", "LOẠI LỆNH"])
    headers = ["Mã", "Tên", "Mô tả", "Trạng thái", ""] * 3 + ["Mã", "Tên", "Mô tả", "Trạng thái"]
    setup_data.append(headers)
    
    # Sample data
    t_data = [["41I1G5000", "Chỉ số ảo", "", "TRUE"], ["VN30F1M", "Phái sinh 1M", "", "TRUE"], ["HPG", "Hòa Phát", "", "TRUE"]]
    s_data = [["BRK", "Breakout", "Đánh phá vỡ cản", "TRUE"], ["PUL", "Pullback", "Chờ test lại", "TRUE"]]
    p_data = [["BT", "Bình tĩnh", "", "TRUE"], ["KL", "Kỷ luật", "", "TRUE"], ["FM", "FOMO", "", "TRUE"]]
    o_data = [["LMT", "Limit", "Lệnh thường", "TRUE"], ["MTL", "Market", "Khớp bằng mọi giá", "TRUE"]]
    
    for i in range(10):
        row = []
        for d in [t_data, s_data, p_data, o_data]:
            if i < len(d):
                row.extend(d[i])
            else:
                row.extend(["", "", "", "TRUE"]) # Default checkbox to True
            row.append("") # spacer
        setup_data.append(row[:-1]) # remove last spacer
        
    ws_setup.update(values=setup_data, range_name='A1', value_input_option='USER_ENTERED')
    
    # Format headers
    ws_setup.format('A1:S2', {"backgroundColor": {"red": 0.2, "green": 0.2, "blue": 0.3}, "textFormat": {"bold": True, "foregroundColor": {"red": 1, "green": 1, "blue": 1}}})

    # Add Checkboxes via API
    setup_id = ws_setup.id
    check_reqs = []
    for col in [3, 8, 13, 18]: # D, I, N, S (0-indexed)
        check_reqs.append({
            'setDataValidation': {
                'range': {'sheetId': setup_id, 'startRowIndex': 2, 'endRowIndex': 100, 'startColumnIndex': col, 'endColumnIndex': col+1},
                'rule': {'condition': {'type': 'BOOLEAN'}, 'showCustomUi': True}
            }
        })
    sheets_api.spreadsheets().batchUpdate(spreadsheetId=SHEET_ID, body={'requests': check_reqs}).execute()

    print("3. Cấu hình LISTS (Helper sheet)...")
    ws_lists = sh.worksheet("LISTS")
    ws_lists.clear()
    
    # Dùng hàm FILTER để chỉ lấy những Mã có Trạng thái = TRUE
    # SETUP cols: Mã=A,E,K,P ; Trạng thái=D,I,N,S -> offset slightly!
    # Tickers: Mã=A, Trạng thái=D
    # Chiến lược: Mã=F, Trạng thái=I
    # Tâm lý: Mã=K, Trạng thái=N
    # Loại lệnh: Mã=P, Trạng thái=S
    
    lists_formulas = [
        ["Mã GD", "Chiến Lược", "Tâm Lý", "Loại Lệnh"],
        [
            '=IFERROR(FILTER(SETUP!A3:A, SETUP!D3:D=TRUE), "")',
            '=IFERROR(FILTER(SETUP!F3:F, SETUP!I3:I=TRUE), "")',
            '=IFERROR(FILTER(SETUP!K3:K, SETUP!N3:N=TRUE), "")',
            '=IFERROR(FILTER(SETUP!P3:P, SETUP!S3:S=TRUE), "")'
        ]
    ]
    ws_lists.update(values=lists_formulas, range_name='A1', value_input_option='USER_ENTERED')
    
    # Hide LISTS
    hide_req = {"updateSheetProperties": {"properties": {"sheetId": ws_lists.id, "hidden": True}, "fields": "hidden"}}
    sheets_api.spreadsheets().batchUpdate(spreadsheetId=SHEET_ID, body={"requests": [hide_req]}).execute()

    # Re-apply dropdowns to JOURNAL (already pointing to LISTS, just make sure LISTS references are upper case)
    # The existing validations in JOURNAL point to lists!A2:A100. It's case insensitive, but we can re-apply to be safe.
    journal_sid = sh.worksheet("JOURNAL").id
    reqs2 = []
    def add_range(col_idx, formula):
        reqs2.append({'setDataValidation': {'range': {'sheetId': journal_sid, 'startRowIndex': 1, 'endRowIndex': 2000, 'startColumnIndex': col_idx, 'endColumnIndex': col_idx+1}, 'rule': {'condition': {'type': 'ONE_OF_RANGE', 'values': [{'userEnteredValue': formula}]}, 'showCustomUi': True, 'strict': False}}})
    
    add_range(3, "=LISTS!$A$2:$A$100") # Mã GD
    add_range(6, "=LISTS!$B$2:$B$100") # Chiến Lược
    add_range(5, "=LISTS!$D$2:$D$100") # Loại Lệnh
    add_range(21, "=LISTS!$C$2:$C$100") # Tâm Lý
    sheets_api.spreadsheets().batchUpdate(spreadsheetId=SHEET_ID, body={'requests': reqs2}).execute()

    print("Hoàn tất!")

if __name__ == '__main__':
    update_setup()
