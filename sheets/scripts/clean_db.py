"""Clean up sheet to strict database format and add sample data"""
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

def cleanup_and_seed():
    gc, creds = get_gc()
    sh = gc.open_by_key(SHEET_ID)
    sheets_api = build('sheets', 'v4', credentials=creds)

    print("1. Renaming sheets to clean DB format...")
    name_map = {
        "CONFIG": "config",
        "LISTS": "lists",
        "JOURNAL": "journal",
        "SUMMARY": "summary"
    }
    for ws in sh.worksheets():
        if ws.title in name_map:
            ws.update_title(name_map[ws.title])

    print("2. Removing emojis from headers...")
    try:
        ws_cfg = sh.worksheet("config")
        ws_cfg.update_acell('A1', "CAU HINH HE THONG")
    except: pass

    try:
        ws_sum = sh.worksheet("summary")
        ws_sum.update_acell('A1', "THONG KE TONG QUAN")
    except: pass

    print("3. Seeding sample data to 'journal'...")
    ws_j = sh.worksheet("JOURNAL")
    
    # We only update manual entry columns to avoid breaking ArrayFormulas
    # Cols: A-G (0-6), I-M (8-12), R-T (17-19)
    # Trade 1: VN30F
    t1_AG = ["Win", "Phái sinh", "VN30F1M", "Long", "Breakout", "2026-05-01", "2026-05-01"]
    t1_IM = [5, 1250.5, 1255.0, 1248.0, 1260.0]
    t1_RT = ["Kỷ luật", "Vượt cản chéo, vol lớn", "https://i.imgur.com/example1.png"]
    
    # Trade 2: Stock
    t2_AG = ["Đang mở", "Cổ phiếu", "HPG", "Mua", "Tích lũy nền", "2026-05-05", ""]
    t2_IM = [1000, 28.5, "", 27.0, 32.0]
    t2_RT = ["Bình tĩnh", "Mua rải đinh 30% tại nền", "https://i.imgur.com/example2.png"]
    
    # Trade 3: VN30F Loss
    t3_AG = ["Lose", "Phái sinh", "VN30F1M", "Short", "MA Cross", "2026-05-06", "2026-05-06"]
    t3_IM = [3, 1260.0, 1263.0, 1263.0, 1250.0]
    t3_RT = ["FOMO", "Cắt lỗ đúng kỷ luật nhưng điểm vào hơi vội", "https://i.imgur.com/example3.png"]

    # Batch update
    ws_j.batch_update([
        {'range': 'A2:G4', 'values': [t1_AG, t2_AG, t3_AG]},
        {'range': 'I2:M4', 'values': [t1_IM, t2_IM, t3_IM]},
        {'range': 'R2:T4', 'values': [t1_RT, t2_RT, t3_RT]}
    ], value_input_option='USER_ENTERED')

    print("Done! Cleaned up and seeded 3 example trades.")

if __name__ == '__main__':
    cleanup_and_seed()
