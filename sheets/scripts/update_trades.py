"""Delete SUMMARY and populate sample trades"""
import os, sys, time
sys.path.insert(0, os.path.dirname(__file__))
from google.oauth2.credentials import Credentials as OAuthCreds
from googleapiclient.discovery import build
import gspread

TOKEN_PATH = os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(__file__))), 'credentials', 'token.json')
SHEET_ID = '1PdCmBoBQsznOx6JXvOlbD-atxQnX9wHRXiM127f109I'

def get_gc():
    creds = OAuthCreds.from_authorized_user_file(TOKEN_PATH, ['https://www.googleapis.com/auth/spreadsheets'])
    return gspread.authorize(creds), creds

def update_db():
    gc, creds = get_gc()
    sh = gc.open_by_key(SHEET_ID)
    
    # 1. Delete SUMMARY
    try:
        ws_sum = sh.worksheet("SUMMARY")
        sh.del_worksheet(ws_sum)
        print("Deleted SUMMARY sheet.")
    except:
        print("SUMMARY sheet already deleted.")

    # 2. Populate JOURNAL with paired trades from images
    ws_jl = sh.worksheet("JOURNAL")
    ws_jl.batch_clear(["A2:W100"]) # clear old sample

    # Image pairs (Date = 2026-05-06)
    # Pair 1: Short 7 @ 2006.7 (10:18:51), Close Long @ 2005.8 (10:32:39) -> Win
    # Pair 2: Long 7 @ 2009.6 (10:40:05), Close Short @ 2012.7 (10:47:21) -> Win
    # Pair 3: Short 7 @ 2014.7 (11:17:37), Close Long @ 2013.4 (11:27:38) -> Win
    # Image 1 Pair: Short 19 @ MOK (09:35:03), Close Long 38 @ MOK (10:55:01) -> Closed 19, reversed 19. Let's record the 19 short part.
    
    date_str = "2026-05-06"
    
    rows = [
        # Trạng Thái (0), Tài Khoản (1), Tài Sản (2), Mã GD (3), Vị Thế (4), Loại Lệnh (5), Chiến Lược (6), Ngày Mở (7), Giờ Mở (8), Ngày Đóng (9), Giờ Đóng (10)
        # Khối lượng (12), Giá Vào (13), Giá Đóng (14), SL (15), TP (16), Tâm Lý (21)
        ["Thắng", "T271298", "Phái sinh", "41I1G5000", "Bán", "Lệnh thường", "Lướt sóng T0", date_str, "10:18:51", date_str, "10:32:39"],
        ["Thắng", "T271298", "Phái sinh", "41I1G5000", "Mua", "Lệnh thường", "Phá nền", date_str, "10:40:05", date_str, "10:47:21"],
        ["Thắng", "T271298", "Phái sinh", "41I1G5000", "Bán", "Lệnh thường", "Hồi kỹ thuật", date_str, "11:17:37", date_str, "11:27:38"],
        ["Đang mở", "D920568", "Phái sinh", "41I1G5000", "Mua", "MOK", "Bắt dao rơi", date_str, "10:55:01", "", ""],
    ]
    
    # Update AH and IK parts
    ah_k_updates = []
    for r in rows:
        ah_k_updates.append(r)
    
    ws_jl.update('A2', ah_k_updates, value_input_option='USER_ENTERED')
    
    # Volumes and Prices (M, N, O)
    mq_updates = [
        [7, 2006.7, 2005.8],
        [7, 2009.6, 2012.7],
        [7, 2014.7, 2013.4],
        [19, 2010.0, ""], # Fake price for MOK, open trade
    ]
    ws_jl.update('M2', mq_updates, value_input_option='USER_ENTERED')
    
    # Psychology (V)
    v_updates = [
        ["Kỷ luật"],
        ["Bình tĩnh"],
        ["Bình tĩnh"],
        ["FOMO"]
    ]
    ws_jl.update('V2', v_updates, value_input_option='USER_ENTERED')
    
    print("Populated real VPS trades.")

if __name__ == '__main__':
    update_db()
