"""Hoàn thiện cấu trúc Database sát 100% màn hình VPS SmartPro"""
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

def perfect_mvp():
    gc, creds = get_gc()
    sh = gc.open_by_key(SHEET_ID)
    sheets_api = build('sheets', 'v4', credentials=creds)

    print("1. Cập nhật LISTS...")
    ws_lists = sh.worksheet("lists")
    ws_lists.clear()
    
    tickers = ["41I1G5000", "VN30F1M", "VN30F2M", "VN30F1Q", "HPG", "FPT", "VNM", "MWG", "TCB", "MBB", "SSI"]
    strategies = ["Breakout", "Pullback", "MA Cross", "Tích lũy nền", "Bắt đáy"]
    psychology = ["Bình tĩnh", "Kỷ luật", "FOMO", "Sợ hãi", "Trả thù"]
    order_types = ["Limit (Thường)", "MTL", "MAK", "MOK", "ATO", "ATC"]
    
    max_len = max(len(tickers), len(strategies), len(psychology), len(order_types))
    t_col = tickers + [""] * (max_len - len(tickers))
    s_col = strategies + [""] * (max_len - len(strategies))
    p_col = psychology + [""] * (max_len - len(psychology))
    o_col = order_types + [""] * (max_len - len(order_types))
    
    data = [["Mã GD", "Chiến Lược", "Tâm Lý", "Loại Lệnh"]]
    for i in range(max_len):
        data.append([t_col[i], s_col[i], p_col[i], o_col[i]])
        
    ws_lists.update(values=data, range_name='A1')
    ws_lists.format('A1:D1', {"backgroundColor": {"red": 0.2, "green": 0.2, "blue": 0.3}, "textFormat": {"bold": True, "foregroundColor": {"red": 1, "green": 1, "blue": 1}}})

    print("2. Rebuild JOURNAL...")
    ws_jl = sh.worksheet("JOURNAL")
    
    # Xóa validation cũ
    clear_req = {'setDataValidation': {'range': {'sheetId': ws_jl.id, 'startRowIndex': 1, 'endRowIndex': 2000, 'startColumnIndex': 0, 'endColumnIndex': 34}, 'rule': None}}
    sheets_api.spreadsheets().batchUpdate(spreadsheetId=SHEET_ID, body={'requests': [clear_req]}).execute()
    
    ws_jl.clear()
    
    headers = [
        "Trạng Thái", "Tài Khoản", "Tài Sản", "Mã GD", "Vị Thế", "Loại Lệnh", "Chiến Lược", 
        "Ngày Mở", "Giờ Mở", "Ngày Đóng", "Giờ Đóng",
        # L: Số Ngày (Auto)
        '={"Số Ngày"; ARRAYFORMULA(IF(A2:A="", "", IF(J2:J="", "Đang mở", J2:J - H2:H)))}',
        "Khối Lượng", "Giá Vào", "Giá Đóng", "Cắt Lỗ (SL)", "Chốt Lời (TP)",
        # R: Biên độ (Auto)
        '={"Biên Độ"; ARRAYFORMULA(IF(A2:A="", "", IF(O2:O="", "", IF(C2:C="Phái sinh", IF(E2:E="Long", O2:O-N2:N, N2:N-O2:O), IF(E2:E="Mua", O2:O-N2:N, N2:N-O2:O)))))}',
        # S: Lãi Gộp (Auto)
        '={"Lãi/Lỗ Gộp"; ARRAYFORMULA(IF(A2:A="", "", IF(O2:O="", "", IF(C2:C="Phái sinh", R2:R*M2:M*config!$B$9, R2:R*M2:M*config!$B$10))))}',
        # T: Phí Thuế (Auto)
        '={"Phí & Thuế"; ARRAYFORMULA(IF(A2:A="", "", IF(O2:O="", "", IF(C2:C="Phái sinh", M2:M*config!$B$8*2, (N2:N*M2:M*config!$B$10*config!$B$5) + (O2:O*M2:M*config!$B$10*(config!$B$6+config!$B$7))))))}',
        # U: Lãi Ròng (Auto)
        '={"Lãi/Lỗ Ròng"; ARRAYFORMULA(IF(A2:A="", "", IF(O2:O="", "", S2:S - T2:T)))}',
        "Tâm Lý", "Ghi Chú Review", "Link Ảnh"
    ]
    
    ws_jl.update([headers], 'A1', value_input_option='USER_ENTERED')
    ws_jl.freeze(rows=1)
    
    # Formatting header
    ws_jl.format('A1:X1', {
        "backgroundColor": {"red": 0.04, "green": 0.055, "blue": 0.09},
        "textFormat": {"bold": True, "foregroundColor": {"red": 1, "green": 1, "blue": 1}},
        "horizontalAlignment": "CENTER",
        "borders": {"bottom": {"style": "SOLID", "color": {"red": 0.23, "green": 0.51, "blue": 0.96}}}
    })

    print("3. Thêm Dropdowns...")
    journal_sid = ws_jl.id
    requests = []
    
    def add_literal(col_idx, values):
        requests.append({'setDataValidation': {'range': {'sheetId': journal_sid, 'startRowIndex': 1, 'endRowIndex': 2000, 'startColumnIndex': col_idx, 'endColumnIndex': col_idx+1}, 'rule': {'condition': {'type': 'ONE_OF_LIST', 'values': [{'userEnteredValue': v} for v in values]}, 'showCustomUi': True, 'strict': False}}})
    def add_range(col_idx, formula):
        requests.append({'setDataValidation': {'range': {'sheetId': journal_sid, 'startRowIndex': 1, 'endRowIndex': 2000, 'startColumnIndex': col_idx, 'endColumnIndex': col_idx+1}, 'rule': {'condition': {'type': 'ONE_OF_RANGE', 'values': [{'userEnteredValue': formula}]}, 'showCustomUi': True, 'strict': False}}})
    def add_date(col_idx):
        requests.append({'setDataValidation': {'range': {'sheetId': journal_sid, 'startRowIndex': 1, 'endRowIndex': 2000, 'startColumnIndex': col_idx, 'endColumnIndex': col_idx+1}, 'rule': {'condition': {'type': 'DATE_IS_VALID'}, 'strict': False}}})

    add_literal(0, ['Win', 'Lose', 'Hòa', 'Đang mở']) # A
    add_literal(2, ['Phái sinh', 'Cổ phiếu']) # C
    add_range(3, "=lists!$A$2:$A$100") # D: Mã GD
    add_literal(4, ['Long', 'Short', 'Mua', 'Bán']) # E: Vị thế
    add_range(5, "=lists!$D$2:$D$100") # F: Loại Lệnh
    add_range(6, "=lists!$B$2:$B$100") # G: Chiến Lược
    add_date(7) # H: Ngày Mở
    add_date(9) # J: Ngày Đóng
    add_range(21, "=lists!$C$2:$C$100") # V: Tâm Lý

    if requests:
        sheets_api.spreadsheets().batchUpdate(spreadsheetId=SHEET_ID, body={'requests': requests}).execute()

    print("4. Cập nhật SUMMARY...")
    ws_sum = sh.worksheet("summary")
    ws_sum.update_acell('B8', '=COUNTA(journal!A2:A2000)') # Tổng lệnh
    ws_sum.update_acell('B9', '=COUNTIF(journal!A2:A2000,"Win")')
    ws_sum.update_acell('B10', '=COUNTIF(journal!A2:A2000,"Lose")')
    ws_sum.update_acell('B13', '=SUM(journal!S2:S2000)') # Lãi gộp
    ws_sum.update_acell('B14', '=SUM(journal!T2:T2000)') # Phí
    ws_sum.update_acell('B15', '=SUM(journal!U2:U2000)') # Lãi ròng
    ws_sum.update_acell('B18', '=IFERROR(AVERAGEIF(journal!A2:A2000,"Win",journal!U2:U2000),0)')
    ws_sum.update_acell('B19', '=IFERROR(AVERAGEIF(journal!A2:A2000,"Lose",journal!U2:U2000),0)')
    ws_sum.update_acell('B20', '=IFERROR(SUMIF(journal!A2:A2000,"Win",journal!U2:U2000)/ABS(SUMIF(journal!A2:A2000,"Lose",journal!U2:U2000)),0)')

    print("5. Nhập Example Data...")
    t1_AH = ["Win", "T271298", "Phái sinh", "41I1G5000", "Long", "Limit (Thường)", "Breakout", "2026-05-01"]
    t1_IK = ["11:27:38", "2026-05-01", "14:30:00"]
    t1_MQ = [7, 2013.4, 2020.0, 2010.0, 2025.0]
    
    ws_jl.batch_update([
        {'range': 'A2:H2', 'values': [t1_AH]},
        {'range': 'I2:K2', 'values': [t1_IK]},
        {'range': 'M2:Q2', 'values': [t1_MQ]},
        {'range': 'V2:V2', 'values': [["Kỷ luật"]]}
    ], value_input_option='USER_ENTERED')

    print("Done! Formatted flawlessly for VPS tracking.")

if __name__ == '__main__':
    perfect_mvp()
