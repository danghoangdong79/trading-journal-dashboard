"""Xây dựng Database MVP tối ưu cho thị trường Việt Nam"""
import json, os, sys, time
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

def mvp_rebuild():
    gc, creds = get_gc()
    sh = gc.open_by_key(SHEET_ID)
    sheets_api = build('sheets', 'v4', credentials=creds)

    print("1. Dọn dẹp các sheet cũ...")
    existing = sh.worksheets()
    keep_titles = ["CONFIG", "JOURNAL", "SUMMARY"]
    
    # Ensure core sheets exist so we can delete others safely
    for title in keep_titles + ["LISTS"]:
        if title not in [ws.title for ws in existing]:
            sh.add_worksheet(title, rows=100, cols=20)
            
    existing = sh.worksheets()
    for ws in existing:
        if ws.title not in keep_titles + ["LISTS"]:
            try:
                sh.del_worksheet(ws)
                print(f"  - Đã xóa: {ws.title}")
            except:
                pass

    time.sleep(1)

    print("2. Cài đặt CONFIG...")
    ws_cfg = sh.worksheet("CONFIG")
    ws_cfg.clear()
    cfg_data = [
        ["⚙️ CẤU HÌNH HỆ THỐNG", "", ""],
        ["", "", ""],
        ["Tham số", "Giá trị", "Mô tả"],
        ["Vốn ban đầu", 200000000, "VNĐ"],
        ["Phí CP mua (%)", 0.0015, "0.15%"],
        ["Phí CP bán (%)", 0.0015, "0.15%"],
        ["Thuế bán CP (%)", 0.001, "0.1%"],
        ["Phí PS cố định", 7700, "VNĐ / HĐ / chiều"],
        ["Giá trị 1 điểm PS", 100000, "VNĐ"],
        ["Hệ số giá CP", 1000, "Nhân giá với 1000 (VD: 25.5 -> 25500)"],
        ["Nạp tiền", 0, "VNĐ"],
        ["Rút tiền", 0, "VNĐ"],
    ]
    ws_cfg.update(values=cfg_data, range_name='A1')
    ws_cfg.format('A3:C3', {"backgroundColor": {"red": 0.2, "green": 0.2, "blue": 0.3}, "textFormat": {"bold": True, "foregroundColor": {"red": 1, "green": 1, "blue": 1}}})

    print("3. Cài đặt LISTS...")
    ws_lists = sh.worksheet("LISTS")
    ws_lists.clear()
    ws_lists.update(values=[["Mã Phái Sinh", "Mã Cổ Phiếu", "Chiến Lược", "Tâm Lý"]], range_name='A1')
    ps = [["VN30F1M"], ["VN30F2M"], ["VN30F1Q"], ["VN30F2Q"]]
    cp = [[t] for t in ["HPG","FPT","VNM","MWG","TCB","MBB","SSI","VND","VPB","STB","DIG","DXG","PDR","NVL","VHM","VIC"]]
    strat = [[s] for s in ["Breakout", "Pullback", "MA Cross", "Tích lũy nền", "Bắt đáy", "Tin tức"]]
    psy = [[p] for p in ["Bình tĩnh", "Kỷ luật", "FOMO", "Sợ hãi", "Trả thù", "Thiếu kiên nhẫn"]]
    
    ws_lists.update(values=ps, range_name='A2')
    ws_lists.update(values=cp, range_name='B2')
    ws_lists.update(values=strat, range_name='C2')
    ws_lists.update(values=psy, range_name='D2')
    ws_lists.format('A1:D1', {"backgroundColor": {"red": 0.2, "green": 0.2, "blue": 0.3}, "textFormat": {"bold": True, "foregroundColor": {"red": 1, "green": 1, "blue": 1}}})

    print("4. Cài đặt JOURNAL (Auto-Calculated)...")
    ws_jl = sh.worksheet("JOURNAL")
    ws_jl.clear()
    
    # Headers combining raw data and ArrayFormulas for auto calculation
    headers = [
        "Trạng Thái", "Tài Sản", "Mã GD", "Vị Thế", "Chiến Lược", 
        "Ngày Mở", "Ngày Đóng", 
        # H: Số Ngày (Auto)
        '={"Số Ngày"; ARRAYFORMULA(IF(A2:A="", "", IF(G2:G="", "Đang mở", G2:G - F2:F)))}',
        "Khối Lượng", "Giá Vào", "Giá Đóng", "Cắt Lỗ (SL)", "Chốt Lời (TP)",
        # N: Biên độ Điểm/Giá (Auto)
        '={"Biên Độ"; ARRAYFORMULA(IF(A2:A="", "", IF(K2:K="", "", IF(B2:B="Phái sinh", IF(D2:D="Long", K2:K-J2:J, J2:J-K2:K), IF(D2:D="Mua", K2:K-J2:J, J2:J-K2:K)))))}',
        # O: Lãi/Lỗ Gộp (Auto)
        '={"Lãi/Lỗ Gộp"; ARRAYFORMULA(IF(A2:A="", "", IF(K2:K="", "", IF(B2:B="Phái sinh", N2:N*I2:I*CONFIG!$B$9, N2:N*I2:I*CONFIG!$B$10))))}',
        # P: Tổng Phí & Thuế (Auto)
        '={"Phí & Thuế"; ARRAYFORMULA(IF(A2:A="", "", IF(K2:K="", "", IF(B2:B="Phái sinh", I2:I*CONFIG!$B$8*2, (J2:J*I2:I*CONFIG!$B$10*CONFIG!$B$5) + (K2:K*I2:I*CONFIG!$B$10*(CONFIG!$B$6+CONFIG!$B$7))))))}',
        # Q: Lãi/Lỗ Ròng (Auto)
        '={"Lãi/Lỗ Ròng"; ARRAYFORMULA(IF(A2:A="", "", IF(K2:K="", "", O2:O - P2:P)))}',
        "Tâm Lý", "Ghi Chú Review", "Link Ảnh"
    ]
    
    ws_jl.update([headers], 'A1', value_input_option='USER_ENTERED')
    ws_jl.freeze(rows=1)
    
    # Formatting header
    ws_jl.format('A1:T1', {
        "backgroundColor": {"red": 0.04, "green": 0.055, "blue": 0.09},
        "textFormat": {"bold": True, "foregroundColor": {"red": 1, "green": 1, "blue": 1}},
        "horizontalAlignment": "CENTER",
        "borders": {"bottom": {"style": "SOLID", "color": {"red": 0.23, "green": 0.51, "blue": 0.96}}}
    })

    # Dropdowns for JOURNAL using API
    journal_sid = ws_jl.id
    lists_sid = ws_lists.id
    
    requests = []
    
    # Helper to add literal dropdowns
    def add_literal_dropdown(col_idx, values):
        requests.append({
            'setDataValidation': {
                'range': {'sheetId': journal_sid, 'startRowIndex': 1, 'endRowIndex': 2000, 'startColumnIndex': col_idx, 'endColumnIndex': col_idx+1},
                'rule': {'condition': {'type': 'ONE_OF_LIST', 'values': [{'userEnteredValue': v} for v in values]}, 'showCustomUi': True, 'strict': False}
            }
        })
        
    # Helper to add range dropdowns (from LISTS)
    def add_range_dropdown(col_idx, list_col_idx, end_row=50):
        # A=0, B=1, C=2, D=3
        col_letter = chr(65 + list_col_idx)
        formula = f"=LISTS!${col_letter}$2:${col_letter}${end_row}"
        requests.append({
            'setDataValidation': {
                'range': {'sheetId': journal_sid, 'startRowIndex': 1, 'endRowIndex': 2000, 'startColumnIndex': col_idx, 'endColumnIndex': col_idx+1},
                'rule': {'condition': {'type': 'ONE_OF_RANGE', 'values': [{'userEnteredValue': formula}]}, 'showCustomUi': True, 'strict': False}
            }
        })

    add_literal_dropdown(0, ['Win', 'Lose', 'Hòa', 'Đang mở']) # A: Trạng thái
    add_literal_dropdown(1, ['Phái sinh', 'Cổ phiếu']) # B: Tài sản
    # C: Mã GD -> Depends on Asset type, but GSheets data validation is hard to make conditional via API easily. 
    # Let's just allow typing or combine lists. For MVP, we combine PS and CP into one dropdown rule, or just let users type.
    # Actually, we can use ONE_OF_RANGE for a combined list, or just leave it open. Let's just point to A2:B50 in LISTS? No, ONE_OF_RANGE requires a single row/col.
    # Let's make LISTS!E a combined list in the sheet, but via API it's easier to just use the CP list since it's longer, and PS traders know their 4 tickers.
    # Better yet, skip dropdown for Ticker in MVP to allow maximum flexibility, or add it later.
    
    add_literal_dropdown(3, ['Long', 'Short', 'Mua']) # D: Vị thế
    add_range_dropdown(4, 2) # E: Chiến lược (LISTS col C)
    add_range_dropdown(17, 3) # R: Tâm lý (LISTS col D)

    if requests:
        sheets_api.spreadsheets().batchUpdate(spreadsheetId=SHEET_ID, body={'requests': requests}).execute()

    print("5. Cài đặt SUMMARY...")
    ws_sum = sh.worksheet("SUMMARY")
    ws_sum.clear()
    summary = [
        ["📊 THỐNG KÊ TỔNG QUAN", "", ""],
        ["", "", ""],
        ["KPI", "Giá trị", "Ghi chú"],
        ["Vốn ban đầu", "=CONFIG!B4", "VNĐ"],
        ["Nạp Rút ròng", "=CONFIG!B11-CONFIG!B12", "VNĐ"],
        ["", "", ""],
        ["Tổng số lệnh", '=COUNTA(JOURNAL!A2:A2000)', ""],
        ["Lệnh Thắng", '=COUNTIF(JOURNAL!A2:A2000,"Win")', ""],
        ["Lệnh Thua", '=COUNTIF(JOURNAL!A2:A2000,"Lose")', ""],
        ["Win Rate", '=IFERROR(B8/B7, 0)', "%"],
        ["", "", ""],
        ["Tổng Lãi/Lỗ Gộp", '=SUM(JOURNAL!O2:O2000)', "VNĐ"],
        ["Tổng Phí & Thuế", '=SUM(JOURNAL!P2:P2000)', "VNĐ"],
        ["Lãi/Lỗ Ròng", '=SUM(JOURNAL!Q2:Q2000)', "VNĐ"],
        ["Số dư hiện tại", '=B4+B5+B14', "VNĐ"],
        ["", "", ""],
        ["Trung bình Thắng", '=IFERROR(AVERAGEIF(JOURNAL!A2:A2000,"Win",JOURNAL!Q2:Q2000),0)', "VNĐ"],
        ["Trung bình Thua", '=IFERROR(AVERAGEIF(JOURNAL!A2:A2000,"Lose",JOURNAL!Q2:Q2000),0)', "VNĐ"],
        ["Profit Factor", '=IFERROR(SUMIF(JOURNAL!A2:A2000,"Win",JOURNAL!Q2:Q2000)/ABS(SUMIF(JOURNAL!A2:A2000,"Lose",JOURNAL!Q2:Q2000)),0)', ""],
    ]
    ws_sum.update(values=summary, range_name='A1', value_input_option='USER_ENTERED')
    ws_sum.format('A1', {"textFormat": {"bold": True, "fontSize": 14}})
    ws_sum.format('A3:C3', {"backgroundColor": {"red": 0.1, "green": 0.1, "blue": 0.2}, "textFormat": {"bold": True, "foregroundColor": {"red": 1, "green": 1, "blue": 1}}})

    print(f"\n{'='*60}")
    print(f"  MVP REBUILD THANH CONG!")
    print(f"  URL: https://docs.google.com/spreadsheets/d/{SHEET_ID}")
    print(f"{'='*60}")

if __name__ == '__main__':
    mvp_rebuild()
