import os, sys
sys.path.insert(0, os.path.dirname(__file__))
from google.oauth2.credentials import Credentials as OAuthCreds
from googleapiclient.discovery import build
import gspread

TOKEN_PATH = os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(__file__))), 'credentials', 'token.json')
SHEET_ID = '1PdCmBoBQsznOx6JXvOlbD-atxQnX9wHRXiM127f109I'

def refresh_journal():
    creds = OAuthCreds.from_authorized_user_file(TOKEN_PATH, ['https://www.googleapis.com/auth/spreadsheets'])
    sheets_api = build('sheets', 'v4', credentials=creds)
    gc = gspread.authorize(creds)
    sh = gc.open_by_key(SHEET_ID)
    ws_journal = sh.worksheet("JOURNAL")
    sid = ws_journal.id
    
    # 1. Clear existing user data (B:K, M:Q, V:W) from row 2 to 1000
    reqs = [
        {'updateCells': {'range': {'sheetId': sid, 'startRowIndex': 1, 'endRowIndex': 1000, 'startColumnIndex': 1, 'endColumnIndex': 11}, 'fields': 'userEnteredValue'}}, # B to K
        {'updateCells': {'range': {'sheetId': sid, 'startRowIndex': 1, 'endRowIndex': 1000, 'startColumnIndex': 12, 'endColumnIndex': 17}, 'fields': 'userEnteredValue'}}, # M to Q
        {'updateCells': {'range': {'sheetId': sid, 'startRowIndex': 1, 'endRowIndex': 1000, 'startColumnIndex': 21, 'endColumnIndex': 23}, 'fields': 'userEnteredValue'}}, # V to W
        # Also clear any stray data in AUTO columns just in case
        {'updateCells': {'range': {'sheetId': sid, 'startRowIndex': 1, 'endRowIndex': 1000, 'startColumnIndex': 0, 'endColumnIndex': 1}, 'fields': 'userEnteredValue'}}, # A
        {'updateCells': {'range': {'sheetId': sid, 'startRowIndex': 1, 'endRowIndex': 1000, 'startColumnIndex': 11, 'endColumnIndex': 12}, 'fields': 'userEnteredValue'}}, # L
        {'updateCells': {'range': {'sheetId': sid, 'startRowIndex': 1, 'endRowIndex': 1000, 'startColumnIndex': 17, 'endColumnIndex': 21}, 'fields': 'userEnteredValue'}}, # R, S, T, U
    ]
    sheets_api.spreadsheets().batchUpdate(spreadsheetId=SHEET_ID, body={'requests': reqs}).execute()
    
    # 2. Prepare Mock Data (16 rows)
    # Block 1: B to K (10 cols)
    # Block 2: M to Q (5 cols)
    # Block 3: V to W (2 cols)
    mock = [
        # B: Tài Khoản | C: Tài Sản | D: Mã GD | E: Vị Thế | F: Loại Lệnh | G: Chiến Lược | H: Ngày Mở | I: Giờ Mở | J: Ngày Đóng | K: Giờ Đóng || M: Khối Lượng | N: Giá Vào | O: Giá Đóng | P: SL | Q: TP || V: Tâm Lý | W: Ghi Chú
        [["D920568", "Cổ phiếu", "FPT", "LONG", "Lệnh thường", "Phá nền", "10/01/2025", "09:30:00", "15/01/2025", "14:15:00"], [2000, 110.5, 118.0, 105.0, 120.0], ["Kỷ luật", "Breakout cực mạnh"]],
        [["T271298", "Cổ phiếu", "VNM", "LONG", "Lệnh thường", "Bắt dao rơi", "12/02/2025", "10:15:00", "14/02/2025", "13:00:00"], [5000, 68.0, 65.5, 65.5, 72.0], ["Sợ hãi", "Bắt đáy sai, hit SL"]],
        [["D920568", "Phái sinh", "VN30F1M", "SHORT", "Lệnh thường", "Theo dòng tiền", "05/03/2025", "13:30:00", "05/03/2025", "14:20:00"], [10, 1250.0, 1240.0, 1255.0, 1235.0], ["Bình tĩnh", "Short theo trend"]],
        [["T271298", "Phái sinh", "VN30F1M", "LONG", "Lệnh thường", "Hồi kỹ thuật", "15/04/2025", "09:15:00", "16/04/2025", "10:00:00"], [15, 1260.0, 1250.0, 1250.0, 1275.0], ["Thiếu kiên nhẫn", "Quét stoploss"]],
        [["D920568", "Cổ phiếu", "MWG", "SHORT", "Lệnh thường", "Phá nền", "20/05/2025", "14:00:00", "25/05/2025", "09:45:00"], [3000, 55.0, 50.0, 57.0, 50.0], ["Kỷ luật", "Hit TP hoàn hảo"]],
        [["T271298", "Cổ phiếu", "HPG", "LONG", "Lệnh thường", "Đầu tư giá trị", "10/06/2025", "10:00:00", "", ""], [10000, 28.5, "", 26.0, 35.0], ["Bình tĩnh", "Hold dài hạn"]],
        [["D920568", "Phái sinh", "VN30F1M", "LONG", "Lệnh thường", "Lướt sóng T0", "15/07/2025", "13:00:00", "15/07/2025", "13:45:00"], [5, 1270.0, 1270.0, 1265.0, 1280.0], ["Do dự", "Hòa vốn trừ phí"]],
        [["D920568", "Cổ phiếu", "VCB", "LONG", "Lệnh thường", "Đầu tư giá trị", "01/08/2025", "09:30:00", "20/08/2025", "14:15:00"], [1000, 90.0, 95.0, 88.0, 100.0], ["Bình tĩnh", "Đạt 1/2 target"]],
        [["T271298", "Cổ phiếu", "SSI", "LONG", "Lệnh thường", "Hồi kỹ thuật", "05/09/2025", "10:15:00", "07/09/2025", "13:00:00"], [4000, 35.0, 33.0, 33.0, 38.0], ["Kỷ luật", "Dính SL"]],
        [["D920568", "Phái sinh", "VN30F1M", "LONG", "Lệnh thường", "Phá nền", "12/10/2025", "13:30:00", "12/10/2025", "14:20:00"], [20, 1280.0, 1290.0, 1275.0, 1300.0], ["FOMO", "Trend mạnh"]],
        [["T271298", "Phái sinh", "VN30F1M", "SHORT", "Lệnh thường", "Bắt dao rơi", "15/11/2025", "09:15:00", "15/11/2025", "10:00:00"], [10, 1295.0, 1300.0, 1300.0, 1280.0], ["Trả thù", "Chặn đầu xe lửa"]],
        [["D920568", "Cổ phiếu", "TCB", "LONG", "Lệnh thường", "Ăn cổ tức", "05/01/2026", "14:00:00", "15/01/2026", "09:45:00"], [5000, 40.0, 45.0, 38.0, 45.0], ["Quá tự tin", "Chốt trước chia"]],
        [["T271298", "Phái sinh", "VN30F1M", "SHORT", "Lệnh thường", "Theo dòng tiền", "02/02/2026", "10:00:00", "", ""], [15, 1310.0, "", 1320.0, 1290.0], ["Bình tĩnh", "Hold qua đêm"]],
        [["D920568", "Cổ phiếu", "MBB", "LONG", "ATO", "Theo tin tức", "10/03/2024", "09:00:00", "15/03/2024", "14:00:00"], [10000, 22.5, 24.0, 21.0, 25.0], ["Bình tĩnh", "Đánh theo KQKD"]],
        [["T271298", "Phái sinh", "VN30F2M", "SHORT", "ATC", "Theo dòng tiền", "20/04/2024", "14:30:00", "22/04/2024", "10:00:00"], [8, 1285.0, 1270.0, 1295.0, 1270.0], ["Kỷ luật", "ATC xả mạnh"]],
        [["D920568", "Cổ phiếu", "DIG", "LONG", "Lệnh thường", "Phá nền", "05/05/2024", "10:20:00", "10/05/2024", "11:00:00"], [8000, 27.0, 25.5, 25.5, 30.0], ["Sợ hãi", "Fake breakout hit SL"]],
    ]
    
    # Unpack into separate blocks
    block_b2_k = [r[0] for r in mock]
    block_m2_q = [r[1] for r in mock]
    block_v2_w = [r[2] for r in mock]
    
    ws_journal.update(range_name='B2:K17', values=block_b2_k, value_input_option='USER_ENTERED')
    ws_journal.update(range_name='M2:Q17', values=block_m2_q, value_input_option='USER_ENTERED')
    ws_journal.update(range_name='V2:W17', values=block_v2_w, value_input_option='USER_ENTERED')
    
    print("Journal data completely refreshed.")

if __name__ == '__main__':
    refresh_journal()
