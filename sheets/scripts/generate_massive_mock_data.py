import os, sys, random, datetime
sys.path.insert(0, os.path.dirname(__file__))
from settings import SHEET_ID as CONFIGURED_SHEET_ID, TOKEN_PATH as CONFIGURED_TOKEN_PATH
from google.oauth2.credentials import Credentials as OAuthCreds
from googleapiclient.discovery import build
import gspread

TOKEN_PATH = str(CONFIGURED_TOKEN_PATH)
SHEET_ID = CONFIGURED_SHEET_ID

def generate_data():
    random.seed(42) # for reproducibility if needed
    
    accounts = ["D920568", "T271298"]
    cp_symbols = ["FPT", "MWG", "HPG", "VCB", "SSI", "TCB", "VNM", "DIG", "MBB", "STB"]
    ps_symbols = ["VN30F1M", "VN30F2M"]
    strategies = ["Lướt sóng T0", "Phá nền", "Hồi kỹ thuật", "Bắt dao rơi", "Đầu tư giá trị", "Theo dòng tiền", "Ăn cổ tức", "Theo tin tức"]
    tamly_list = ["Bình tĩnh", "Kỷ luật", "FOMO", "Sợ hãi", "Trả thù", "Thiếu kiên nhẫn", "Quá tự tin", "Do dự", "Tự tin"]
    loailenh = ["Lệnh thường", "ATO", "ATC", "MTL", "MAK"]
    
    start_date = datetime.date(2024, 1, 1)
    end_date = datetime.date(2026, 4, 30)
    total_days = (end_date - start_date).days
    
    b2_k = []
    m2_q = []
    v2_w = []
    
    # Let's create ~55 rows
    for i in range(55):
        acc = random.choice(accounts)
        is_cp = random.random() < 0.7
        tai_san = "Cổ phiếu" if is_cp else "Phái sinh"
        symbol = random.choice(cp_symbols) if is_cp else random.choice(ps_symbols)
        
        if is_cp:
            vi_the = "LONG" if random.random() < 0.8 else "SHORT" # Most CP is long
        else:
            vi_the = random.choice(["LONG", "SHORT"])
            
        lenh = random.choice(loailenh)
        strat = random.choice(strategies)
        
        # Open Date
        open_offset = random.randint(0, total_days)
        d_open = start_date + datetime.timedelta(days=open_offset)
        t_open = f"{random.randint(9, 14):02d}:{random.randint(0, 59):02d}:00"
        
        # Duration
        is_open = i >= 50 # Last 5 rows are currently open
        if is_open:
            d_close_str = ""
            t_close = ""
        else:
            dur = random.randint(0, 30)
            if strat == "Lướt sóng T0":
                dur = 0
            elif strat == "Đầu tư giá trị":
                dur = random.randint(20, 90)
            d_close = d_open + datetime.timedelta(days=dur)
            d_close_str = d_close.strftime("%Y-%m-%d")
            t_close = f"{random.randint(9, 14):02d}:{random.randint(0, 59):02d}:00"
            
        d_open_str = d_open.strftime("%Y-%m-%d") # YYYY-MM-DD prevents locale issues
        
        b2_k.append([acc, tai_san, symbol, vi_the, lenh, strat, d_open_str, t_open, d_close_str, t_close])
        
        # Prices
        if is_cp:
            kl = random.choice([1000, 2000, 5000, 10000])
            gia_vao = round(random.uniform(20.0, 100.0), 1)
            volatility = random.uniform(1.0, 10.0)
        else:
            kl = random.choice([5, 10, 20, 50])
            gia_vao = round(random.uniform(1200.0, 1300.0), 1)
            volatility = random.uniform(5.0, 20.0)
            
        if vi_the == "LONG":
            tp = round(gia_vao + volatility * 1.5, 1)
            sl = round(gia_vao - volatility, 1)
        else:
            tp = round(gia_vao - volatility * 1.5, 1)
            sl = round(gia_vao + volatility, 1)
            
        if is_open:
            gia_dong = ""
        else:
            outcome = random.random()
            if outcome < 0.4: # Win hitting TP
                gia_dong = tp
            elif outcome < 0.8: # Loss hitting SL
                gia_dong = sl
            else: # Random close
                if vi_the == "LONG":
                    gia_dong = round(gia_vao + random.uniform(-volatility, volatility*1.5), 1)
                else:
                    gia_dong = round(gia_vao + random.uniform(-volatility*1.5, volatility), 1)
        
        m2_q.append([kl, gia_vao, gia_dong, sl, tp])
        
        tam_ly = random.choice(tamly_list)
        note = "Ví dụ Auto-gen " + str(i+1)
        v2_w.append([tam_ly, note])

    return b2_k, m2_q, v2_w

def run():
    creds = OAuthCreds.from_authorized_user_file(TOKEN_PATH, ['https://www.googleapis.com/auth/spreadsheets'])
    sheets_api = build('sheets', 'v4', credentials=creds)
    gc = gspread.authorize(creds)
    sh = gc.open_by_key(SHEET_ID)
    ws_journal = sh.worksheet("JOURNAL")
    sid = ws_journal.id
    
    # 1. Format H and J to Date
    reqs = [
        {
            'repeatCell': {
                'range': {'sheetId': sid, 'startRowIndex': 1, 'endRowIndex': 1000, 'startColumnIndex': 7, 'endColumnIndex': 8}, # H
                'cell': {'userEnteredFormat': {'numberFormat': {'type': 'DATE', 'pattern': 'dd/MM/yyyy'}}},
                'fields': 'userEnteredFormat.numberFormat'
            }
        },
        {
            'repeatCell': {
                'range': {'sheetId': sid, 'startRowIndex': 1, 'endRowIndex': 1000, 'startColumnIndex': 9, 'endColumnIndex': 10}, # J
                'cell': {'userEnteredFormat': {'numberFormat': {'type': 'DATE', 'pattern': 'dd/MM/yyyy'}}},
                'fields': 'userEnteredFormat.numberFormat'
            }
        },
        # Clear existing data
        {'updateCells': {'range': {'sheetId': sid, 'startRowIndex': 1, 'endRowIndex': 1000, 'startColumnIndex': 1, 'endColumnIndex': 11}, 'fields': 'userEnteredValue'}}, # B to K
        {'updateCells': {'range': {'sheetId': sid, 'startRowIndex': 1, 'endRowIndex': 1000, 'startColumnIndex': 12, 'endColumnIndex': 17}, 'fields': 'userEnteredValue'}}, # M to Q
        {'updateCells': {'range': {'sheetId': sid, 'startRowIndex': 1, 'endRowIndex': 1000, 'startColumnIndex': 21, 'endColumnIndex': 23}, 'fields': 'userEnteredValue'}}, # V to W
        # Clear AUTO
        {'updateCells': {'range': {'sheetId': sid, 'startRowIndex': 1, 'endRowIndex': 1000, 'startColumnIndex': 0, 'endColumnIndex': 1}, 'fields': 'userEnteredValue'}}, # A
        {'updateCells': {'range': {'sheetId': sid, 'startRowIndex': 1, 'endRowIndex': 1000, 'startColumnIndex': 11, 'endColumnIndex': 12}, 'fields': 'userEnteredValue'}}, # L
        {'updateCells': {'range': {'sheetId': sid, 'startRowIndex': 1, 'endRowIndex': 1000, 'startColumnIndex': 17, 'endColumnIndex': 21}, 'fields': 'userEnteredValue'}} # R, S, T, U
    ]
    sheets_api.spreadsheets().batchUpdate(spreadsheetId=SHEET_ID, body={'requests': reqs}).execute()
    
    b2_k, m2_q, v2_w = generate_data()
    
    # Sort by Open Date (Column index 6 in b2_k)
    # Actually, let's keep them somewhat sorted by date so it looks nice
    combined = list(zip(b2_k, m2_q, v2_w))
    combined.sort(key=lambda x: x[0][6])
    
    b2_k = [x[0] for x in combined]
    m2_q = [x[1] for x in combined]
    v2_w = [x[2] for x in combined]
    
    rows = len(b2_k)
    ws_journal.update(range_name=f'B2:K{rows+1}', values=b2_k, value_input_option='USER_ENTERED')
    ws_journal.update(range_name=f'M2:Q{rows+1}', values=m2_q, value_input_option='USER_ENTERED')
    ws_journal.update(range_name=f'V2:W{rows+1}', values=v2_w, value_input_option='USER_ENTERED')

    print(f"Generated {rows} rows of mock data formatted as YYYY-MM-DD")

if __name__ == '__main__':
    run()
