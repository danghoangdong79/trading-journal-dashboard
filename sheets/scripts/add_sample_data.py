"""Generate comprehensive sample data"""
import os, sys, random, datetime
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

def generate_sample_data():
    gc, creds = get_gc()
    sh = gc.open_by_key(SHEET_ID)
    ws_nk = sh.worksheet("JOURNAL")

    accounts = ["T271298", "D920568"]
    strategies = ["Lướt sóng T0", "Phá nền", "Hồi kỹ thuật", "Bắt dao rơi", "Đầu tư giá trị", "Ăn cổ tức"]
    psychology = ["Bình tĩnh", "Kỷ luật", "FOMO", "Sợ hãi", "Do dự"]
    
    start_date = datetime.date(2026, 1, 1)
    end_date = datetime.date(2026, 5, 20)
    
    rows = []
    
    # Let's generate 40 rows
    for i in range(40):
        # Date generation
        days_offset = random.randint(0, (end_date - start_date).days)
        open_date = start_date + datetime.timedelta(days=days_offset)
        
        is_phaisinh = random.choice([True, False])
        is_open = random.random() < 0.1 # 10% chance of being open
        
        if is_phaisinh:
            tai_san = "Phái sinh"
            ma_gd = random.choice(["VN30F1M", "41I1G5000", "VN30F2M"])
            vi_the = random.choice(["LONG", "SHORT"])
            loai_lenh = random.choice(["Lệnh thường", "ATO", "ATC", "MOK", "MAK"])
            khoi_luong = random.randint(1, 50)
            gia_vao = round(random.uniform(1100, 1300), 1)
            
            if not is_open:
                close_days = random.randint(0, 2)
                close_date = open_date + datetime.timedelta(days=close_days)
                gia_dong = round(gia_vao + random.uniform(-10, 10), 1)
            else:
                close_date = None
                gia_dong = ""
        else:
            tai_san = "Cổ phiếu"
            ma_gd = random.choice(["FPT", "HPG", "VNM", "TCB", "MBB", "MWG"])
            vi_the = random.choice(["Mua", "Bán"])
            loai_lenh = random.choice(["Lệnh thường", "ATO", "ATC"])
            khoi_luong = random.randint(1, 10) * 1000
            gia_vao = round(random.uniform(20, 120), 2)
            
            if not is_open:
                close_days = random.randint(2, 60) # T+2 minimum usually, but whatever
                close_date = open_date + datetime.timedelta(days=close_days)
                gia_dong = round(gia_vao * random.uniform(0.9, 1.2), 2)
            else:
                close_date = None
                gia_dong = ""
                
        # Generate open/close times
        open_time = f"{random.randint(9, 14):02d}:{random.randint(0, 59):02d}:{random.randint(0, 59):02d}"
        if close_date:
            close_time = f"{random.randint(9, 14):02d}:{random.randint(0, 59):02d}:{random.randint(0, 59):02d}"
        else:
            close_time = ""
            
        row = [
            "", # A: Trạng thái (Auto)
            random.choice(accounts), # B
            tai_san, # C
            ma_gd, # D
            vi_the, # E
            loai_lenh, # F
            random.choice(strategies), # G
            open_date.strftime("%Y-%m-%d"), # H
            open_time, # I
            close_date.strftime("%Y-%m-%d") if close_date else "", # J
            close_time, # K
            "", # L: Số Ngày (Auto)
            khoi_luong, # M
            gia_vao, # N
            gia_dong, # O
            "", "", "", "", "", "", # P:U
            random.choice(psychology), # V
            "", "" # W:X
        ]
        rows.append(row)

    # Sort rows by open_date
    rows.sort(key=lambda x: x[7])

    # Clear old sample data and write new
    ws_nk.batch_clear(["B2:X100"])
    
    # We need to construct the update payload correctly.
    # We update B2:K, M2:O, V2:X to avoid overwriting formulas in A, L, R:U
    
    b_k_data = [r[1:11] for r in rows]
    m_o_data = [r[12:15] for r in rows]
    v_data = [[r[21]] for r in rows]
    
    ws_nk.update(values=b_k_data, range_name=f'B2:K{len(rows)+1}', value_input_option='USER_ENTERED')
    ws_nk.update(values=m_o_data, range_name=f'M2:O{len(rows)+1}', value_input_option='USER_ENTERED')
    ws_nk.update(values=v_data, range_name=f'V2:V{len(rows)+1}', value_input_option='USER_ENTERED')
    
    print(f"Inserted {len(rows)} sample rows.")

if __name__ == '__main__':
    generate_sample_data()
