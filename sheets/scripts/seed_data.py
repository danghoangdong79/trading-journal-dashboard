import os, sys
sys.path.insert(0, os.path.dirname(__file__))
from settings import SHEET_ID as CONFIGURED_SHEET_ID, TOKEN_PATH as CONFIGURED_TOKEN_PATH
from google.oauth2.credentials import Credentials as OAuthCreds
from googleapiclient.discovery import build
import gspread

TOKEN_PATH = str(CONFIGURED_TOKEN_PATH)
SHEET_ID = CONFIGURED_SHEET_ID

def seed_data():
    creds = OAuthCreds.from_authorized_user_file(TOKEN_PATH, ['https://www.googleapis.com/auth/spreadsheets'])
    gc = gspread.authorize(creds)
    sh = gc.open_by_key(SHEET_ID)

    ws_journal = sh.worksheet("JOURNAL")
    
    # 15 Rows of diverse mock data
    mock_data = [
        # Win 2025 Cổ phiếu LONG
        ["Thắng", "D920568", "Cổ phiếu", "FPT", "LONG", "Lệnh thường", "Phá nền", "10/01/2025", "09:30:00", "15/01/2025", "14:15:00", 5, 2000, 110.5, 118.0, 105.0, 120.0, 7.5, 15000000, 30000, 14970000, "Tự tin", "Breakout mạnh"],
        # Loss 2025 Cổ phiếu LONG
        ["Thua", "T271298", "Cổ phiếu", "VNM", "LONG", "Lệnh thường", "Bắt dao rơi", "12/02/2025", "10:15:00", "14/02/2025", "13:00:00", 2, 5000, 68.0, 65.5, 65.0, 72.0, -2.5, -12500000, 25000, -12525000, "Sợ hãi", "Bắt đáy sai"],
        # Win 2025 Phái sinh SHORT
        ["Thắng", "D920568", "Phái sinh", "VN30F1M", "SHORT", "Lệnh thường", "Theo dòng tiền", "05/03/2025", "13:30:00", "05/03/2025", "14:20:00", 0, 10, 1250.0, 1240.0, 1255.0, 1235.0, 10.0, 10000000, 40000, 9960000, "Bình thường", "Short theo trend"],
        # Loss 2025 Phái sinh LONG
        ["Thua", "T271298", "Phái sinh", "VN30F1M", "LONG", "Lệnh thường", "Hồi kỹ thuật", "15/04/2025", "09:15:00", "16/04/2025", "10:00:00", 1, 15, 1260.0, 1255.0, 1250.0, 1275.0, -5.0, -7500000, 60000, -7560000, "Tức giận", "Quét stoploss"],
        # Win 2025 Cổ phiếu SHORT
        ["Thắng", "D920568", "Cổ phiếu", "MWG", "SHORT", "Lệnh thường", "Phá nền", "20/05/2025", "14:00:00", "25/05/2025", "09:45:00", 5, 3000, 55.0, 50.0, 57.0, 48.0, 5.0, 15000000, 30000, 14970000, "Tự tin", "Gãy nền hỗ trợ"],
        # Đang mở 2025
        ["Đang mở", "T271298", "Cổ phiếu", "HPG", "LONG", "Lệnh thường", "Đầu tư giá trị", "10/06/2025", "10:00:00", "", "", "", 10000, 28.5, "", 26.0, 35.0, "", "", "", "", "Kỳ vọng", "Hold dài hạn"],
        # Hòa 2025
        ["Hòa", "D920568", "Phái sinh", "VN30F1M", "LONG", "Lệnh thường", "Lướt sóng T0", "15/07/2025", "13:00:00", "15/07/2025", "13:45:00", 0, 5, 1270.0, 1270.0, 1265.0, 1280.0, 0.0, 0, 20000, -20000, "Tiếc nuối", "Hòa vốn trừ phí"],
        
        # Win 2025 T8
        ["Thắng", "D920568", "Cổ phiếu", "VCB", "LONG", "Lệnh thường", "Đầu tư giá trị", "01/08/2025", "09:30:00", "20/08/2025", "14:15:00", 19, 1000, 90.0, 95.0, 88.0, 100.0, 5.0, 5000000, 10000, 4990000, "Thoải mái", "Đạt 1/2 target"],
        # Loss 2025 T9
        ["Thua", "T271298", "Cổ phiếu", "SSI", "LONG", "Lệnh thường", "Hồi kỹ thuật", "05/09/2025", "10:15:00", "07/09/2025", "13:00:00", 2, 4000, 35.0, 33.0, 33.0, 38.0, -2.0, -8000000, 16000, -8016000, "Tuân thủ kỷ luật", "Dính SL"],
        
        # Win 2025 T10
        ["Thắng", "D920568", "Phái sinh", "VN30F1M", "LONG", "Lệnh thường", "Phá nền", "12/10/2025", "13:30:00", "12/10/2025", "14:20:00", 0, 20, 1280.0, 1290.0, 1275.0, 1300.0, 10.0, 20000000, 80000, 19920000, "Hưng phấn", "Trend mạnh"],
        # Loss 2025 T11
        ["Thua", "T271298", "Phái sinh", "VN30F1M", "SHORT", "Lệnh thường", "Bắt dao rơi", "15/11/2025", "09:15:00", "15/11/2025", "10:00:00", 0, 10, 1295.0, 1300.0, 1300.0, 1280.0, -5.0, -5000000, 40000, -5040000, "Tiếc nuối", "Chặn đầu xe lửa"],
        
        # Win 2026 T1
        ["Thắng", "D920568", "Cổ phiếu", "TCB", "LONG", "Lệnh thường", "Ăn cổ tức", "05/01/2026", "14:00:00", "15/01/2026", "09:45:00", 10, 5000, 40.0, 43.0, 38.0, 45.0, 3.0, 15000000, 30000, 14970000, "Tự tin", "Chốt trước chia"],
        # Đang mở 2026
        ["Đang mở", "T271298", "Phái sinh", "VN30F1M", "SHORT", "Lệnh thường", "Theo dòng tiền", "02/02/2026", "10:00:00", "", "", "", 15, 1310.0, "", 1320.0, 1290.0, "", "", "", "", "Bình tĩnh", "Hold qua đêm"],
    ]
    
    # Format Date columns (H, J) properly for Sheets
    # They are already "dd/mm/yyyy" which is perfect if Sheets locale supports it, 
    # but we will set USER_ENTERED so Sheets parses them.
    
    ws_journal.append_rows(mock_data, value_input_option='USER_ENTERED')
    print("Seed data added successfully")

if __name__ == '__main__':
    seed_data()
