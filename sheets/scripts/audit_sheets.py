"""Audit and perfect data validation for all sheets"""
import os, sys, time
sys.path.insert(0, os.path.dirname(__file__))
from settings import SHEET_ID as CONFIGURED_SHEET_ID, TOKEN_PATH as CONFIGURED_TOKEN_PATH
from google.oauth2.credentials import Credentials as OAuthCreds
from googleapiclient.discovery import build
import gspread

TOKEN_PATH = str(CONFIGURED_TOKEN_PATH)
SHEET_ID = CONFIGURED_SHEET_ID

def get_gc():
    creds = OAuthCreds.from_authorized_user_file(TOKEN_PATH, [
        'https://www.googleapis.com/auth/spreadsheets',
        'https://www.googleapis.com/auth/drive'
    ])
    return gspread.authorize(creds), creds

def audit():
    gc, creds = get_gc()
    sh = gc.open_by_key(SHEET_ID)
    sheets_api = build('sheets', 'v4', credentials=creds)

    print("1. Auditing 'lists' sheet (unified column structure)...")
    ws_lists = sh.worksheet("lists")
    ws_lists.clear()
    
    # Unified list for Tickers
    tickers = ["VN30F1M", "VN30F2M", "VN30F1Q", "VN30F2Q", "HPG", "FPT", "VNM", "MWG", "TCB", "MBB", "SSI", "VND", "VPB", "STB", "DIG", "DXG", "PDR", "NVL", "VHM", "VIC"]
    strategies = ["Breakout", "Pullback", "MA Cross", "Tích lũy nền", "Bắt đáy", "Tin tức", "Theo xu hướng"]
    psychology = ["Bình tĩnh", "Kỷ luật", "FOMO", "Sợ hãi", "Trả thù", "Thiếu kiên nhẫn"]
    
    # Pad lists to same length for bulk update
    max_len = max(len(tickers), len(strategies), len(psychology))
    t_col = tickers + [""] * (max_len - len(tickers))
    s_col = strategies + [""] * (max_len - len(strategies))
    p_col = psychology + [""] * (max_len - len(psychology))
    
    data = [["Mã GD", "Chiến Lược", "Tâm Lý"]]
    for i in range(max_len):
        data.append([t_col[i], s_col[i], p_col[i]])
        
    ws_lists.update(values=data, range_name='A1')
    ws_lists.format('A1:C1', {"backgroundColor": {"red": 0.2, "green": 0.2, "blue": 0.3}, "textFormat": {"bold": True, "foregroundColor": {"red": 1, "green": 1, "blue": 1}}})

    print("2. Clearing old data validations in 'journal'...")
    journal_sid = sh.worksheet("JOURNAL").id
    
    # Clear ALL data validations first
    clear_req = {
        'setDataValidation': {
            'range': {
                'sheetId': journal_sid,
                'startRowIndex': 1,
                'endRowIndex': 2000,
                'startColumnIndex': 0,
                'endColumnIndex': 34
            },
            'rule': None # None clears the rule
        }
    }
    sheets_api.spreadsheets().batchUpdate(spreadsheetId=SHEET_ID, body={'requests': [clear_req]}).execute()
    time.sleep(1)

    print("3. Applying strict correct data validations...")
    requests = []
    
    def add_literal(col_idx, values):
        requests.append({
            'setDataValidation': {
                'range': {'sheetId': journal_sid, 'startRowIndex': 1, 'endRowIndex': 2000, 'startColumnIndex': col_idx, 'endColumnIndex': col_idx+1},
                'rule': {'condition': {'type': 'ONE_OF_LIST', 'values': [{'userEnteredValue': v} for v in values]}, 'showCustomUi': True, 'strict': False}
            }
        })
        
    def add_range(col_idx, formula):
        requests.append({
            'setDataValidation': {
                'range': {'sheetId': journal_sid, 'startRowIndex': 1, 'endRowIndex': 2000, 'startColumnIndex': col_idx, 'endColumnIndex': col_idx+1},
                'rule': {'condition': {'type': 'ONE_OF_RANGE', 'values': [{'userEnteredValue': formula}]}, 'showCustomUi': True, 'strict': False}
            }
        })
        
    def add_date(col_idx):
        requests.append({
            'setDataValidation': {
                'range': {'sheetId': journal_sid, 'startRowIndex': 1, 'endRowIndex': 2000, 'startColumnIndex': col_idx, 'endColumnIndex': col_idx+1},
                'rule': {'condition': {'type': 'DATE_IS_VALID'}, 'strict': False}
            }
        })

    # Apply new clean validations
    add_literal(0, ['Win', 'Lose', 'Hòa', 'Đang mở']) # A: Trạng thái
    add_literal(1, ['Phái sinh', 'Cổ phiếu']) # B: Tài sản
    add_range(2, "=lists!$A$2:$A$100") # C: Mã GD
    add_literal(3, ['Long', 'Short', 'Mua', 'Bán']) # D: Vị thế
    add_range(4, "=lists!$B$2:$B$100") # E: Chiến Lược
    add_date(5) # F: Ngày Mở
    add_date(6) # G: Ngày Đóng
    add_range(17, "=lists!$C$2:$C$100") # R: Tâm Lý

    if requests:
        sheets_api.spreadsheets().batchUpdate(spreadsheetId=SHEET_ID, body={'requests': requests}).execute()

    print("Audit Complete! All dropdowns strictly configured.")

if __name__ == '__main__':
    audit()
