"""Rebuild sheet theo chuẩn Ocean Edition - VN Market"""
import json, os, sys, time
sys.path.insert(0, os.path.dirname(__file__))
from google.oauth2.credentials import Credentials as OAuthCreds
from googleapiclient.discovery import build
import gspread

TOKEN_PATH = os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(__file__))), 'credentials', 'token.json')
SHEET_ID = '1PdCmBoBQsznOx6JXvOlbD-atxQnX9wHRXiM127f109I'

def get_gc():
    creds = OAuthCreds.from_authorized_user_file(TOKEN_PATH, [
        'https://www.googleapis.com/auth/spreadsheets',
        'https://www.googleapis.com/auth/drive'
    ])
    return gspread.authorize(creds), creds

def rebuild():
    gc, creds = get_gc()
    sh = gc.open_by_key(SHEET_ID)
    sheets_api = build('sheets', 'v4', credentials=creds)

    # Delete all sheets except first, then rename first
    existing = sh.worksheets()
    for ws in existing[1:]:
        sh.del_worksheet(ws)
    existing[0].update_title("CONFIG")
    time.sleep(1)

    print("[1/9] Huong dan...")
    ws = sh.add_worksheet("Hướng dẫn", rows=55, cols=30)
    ws.update('C3', [["📊 NHẬT KÝ GIAO DỊCH — PHÁI SINH & CỔ PHIẾU VN"]])
    ws.update('C5', [["Hệ thống nhật ký giao dịch chuyên nghiệp, tích hợp tự động hóa n8n"]])
    guide = [
        ["#","","Tên tab","","","","","Mô tả"],
        ["1","","Bắt đầu","","","","","Cấu hình: chọn loại tài sản, danh sách mã GD, chiến lược"],
        ["2","","Nhật ký","","","","","Ghi nhận chi tiết từng lệnh + Dashboard mini + KPIs"],
        ["3","","Tổng hợp","","","","","Thống kê theo mã, chiến lược, bộ lọc + sort"],
        ["4","","Tổng quan","","","","","Dashboard: biểu đồ lãi/lỗ, equity curve, drawdown"],
        ["5","","Lịch Lãi/Lỗ","","","","","PnL Calendar: xem lãi/lỗ từng ngày dạng lịch"],
        ["6","","Công cụ tính","","","","","Máy tính: Điểm PS, Khối lượng, R:R"],
        ["7","","Formulas","","","","","⚠️ KHÔNG SỬA — Engine tính toán tự động"],
    ]
    ws.update('C8', guide)
    tips = [
        ["#","","Mẹo"],
        ["1","","Ghi chú mỗi lệnh — luôn ghi lý do vào/ra lệnh và tâm trạng"],
        ["2","","Review cuối tuần — xem Dashboard để nhận ra pattern"],
        ["3","","Kiểm tra R:R trước mọi lệnh"],
        ["4","","Theo dõi Calendar để thấy tháng nào cần cải thiện"],
        ["5","","Đừng sửa sheet Formulas — công thức đã thiết lập sẵn"],
    ]
    ws.update('C20', tips)
    time.sleep(1)

    print("[2/9] Bat dau (Config TS)...")
    ws_bd = sh.add_worksheet("Bắt đầu", rows=80, cols=40)
    # Header
    ws_bd.update('C3', [["⚙️ THIẾT LẬP BAN ĐẦU"]])
    # Asset toggles
    ws_bd.update('D7', [["Phái sinh"],[""],["TRUE"],["On"]])
    ws_bd.update('N7', [["Cổ phiếu VN"],[""],["TRUE"],["On"]])
    # PS tickers
    ps_tickers = [["#","","Mã"]] + [[str(i+1),"",t] for i,t in enumerate([
        "VN30F2506","VN30F2507","VN30F2508","VN30F2509","VN30F2512","VN30F2603"
    ])]
    ws_bd.update('D12', ps_tickers)
    # Stock tickers
    cp_tickers = [["#","","Mã"]] + [[str(i+1),"",t] for i,t in enumerate([
        "HPG","FPT","VNM","MWG","TCB","VCB","MBB","SSI","VPB","ACB",
        "STB","TPB","HDB","VHM","VIC","MSN","GAS","PLX","PNJ","REE",
        "DGC","KDH","NLG","PDR","DXG","VRE","CTG","BID","SHB","EIB"
    ])]
    ws_bd.update('N12', cp_tickers)
    # Strategies
    strats = [["#","","Chiến lược"]] + [[str(i+1),"",s] for i,s in enumerate([
        "Breakout","Breakdown","MA Cross","Support/Resistance","Scalping",
        "Swing Trade","Trend Following","Mean Reversion","Fibonacci",
        "Volume Profile","News Trading","Gap Trading","Khác"
    ])]
    ws_bd.update('X12', strats)
    time.sleep(1)

    print("[3/9] CONFIG (phi, thue)...")
    ws_cfg = sh.worksheet("CONFIG")
    ws_cfg.clear()
    cfg_data = [
        ["⚙️ CẤU HÌNH HỆ THỐNG","",""],
        ["","",""],
        ["Tham số","Giá trị","Mô tả"],
        ["Vốn ban đầu",200000000,"VNĐ"],
        ["Phí CP mua (%)",0.0015,"0.15%"],
        ["Phí CP bán (%)",0.0015,"0.15%"],
        ["Thuế bán CP (%)",0.001,"0.1%"],
        ["Phí PS / HĐ / chiều",7700,"VNĐ"],
        ["Giá trị 1 điểm PS",100000,"VNĐ"],
        ["Nạp tiền",0,"VNĐ"],
        ["Rút tiền",0,"VNĐ"],
        ["Tên khách hàng","KhangHang1 VIP",""],
        ["Ngày tạo","=TODAY()",""],
        ["","",""],
        ["📊 PHÍ GIAO DỊCH","",""],
        ["Loại phí","Cố định","Chọn: Cố định / Biến đổi"],
        ["Phí cố định PS",7700,"VNĐ / HĐ / chiều"],
        ["Phí biến đổi PS (%)",0,"% giá trị HĐ (nếu biến đổi)"],
        ["Phí cố định CP",0,"VNĐ / lệnh (nếu có)"],
    ]
    ws_cfg.update('A1', cfg_data)
    time.sleep(1)

    print("[4/9] JOURNAL_LOG...")
    ws_jl = sh.add_worksheet("JOURNAL_LOG", rows=2000, cols=34)
    headers = [
        "STT","Trạng Thái","Loại TS","Mã GD","Chiến Lược","Vị Thế","Phiên",
        "Ngày & Giờ Vào","Thứ","Ngày & Giờ Đóng","TG Giao Dịch",
        "Số Dư","Số HĐ/CP","Giá Vào","Cắt Lỗ (SL)","SL (Điểm/VNĐ)",
        "Chốt Lời (TP)","TP (Điểm/VNĐ)","Giá Đóng","Điểm Thực Tế",
        "R:R Kỳ Vọng","Rủi Ro %","Mục Tiêu Lãi %",
        "Lãi/Lỗ Gộp","% TĐ Gộp","Phí GD","Thuế","Lãi/Lỗ Ròng",
        "L/L Tích Lũy","Số Dư Đã Đóng","% TĐ Ròng","% Tăng Trưởng",
        "Tâm Lý","Ghi Chú"
    ]
    ws_jl.update([headers], 'A1')
    ws_jl.freeze(rows=1)
    time.sleep(1)

    print("[5/9] SUMMARY...")
    ws_sum = sh.add_worksheet("SUMMARY", rows=30, cols=6)
    summary = [
        ["📊 THỐNG KÊ TỔNG QUAN","",""],["","",""],
        ["KPI","Giá trị","Ghi chú"],
        ["Vốn ban đầu","=CONFIG!B4","VNĐ"],
        ["Nạp tiền","=CONFIG!B10","VNĐ"],
        ["Rút tiền","=CONFIG!B11","VNĐ"],
        ["","",""],
        ["Tổng giao dịch",'=COUNTA(JOURNAL_LOG!D2:D2000)',""],
        ["GD Thắng",'=COUNTIF(JOURNAL_LOG!B2:B2000,"*Win*")',""],
        ["GD Thua",'=COUNTIF(JOURNAL_LOG!B2:B2000,"*Lose*")',""],
        ["GD Hòa",'=COUNTIF(JOURNAL_LOG!B2:B2000,"*Hòa*")',""],
        ["GD Đang mở",'=COUNTIF(JOURNAL_LOG!B2:B2000,"*Đang mở*")',""],
        ["","",""],
        ["Tỷ lệ thắng",'=IFERROR(COUNTIF(JOURNAL_LOG!B2:B2000,"*Win*")/COUNTA(JOURNAL_LOG!D2:D2000),0)',"%"],
        ["Lãi/Lỗ Ròng",'=SUM(JOURNAL_LOG!AB2:AB2000)',"VNĐ"],
        ["Số dư hiện tại",'=CONFIG!B4+SUM(JOURNAL_LOG!AB2:AB2000)+CONFIG!B10-CONFIG!B11',"VNĐ"],
        ["","",""],
        ["Thắng TB",'=IFERROR(AVERAGEIF(JOURNAL_LOG!B2:B2000,"*Win*",JOURNAL_LOG!AB2:AB2000),0)',"VNĐ"],
        ["Thua TB",'=IFERROR(AVERAGEIF(JOURNAL_LOG!B2:B2000,"*Lose*",JOURNAL_LOG!AB2:AB2000),0)',"VNĐ"],
        ["RRR TB",'=IFERROR(AVERAGE(JOURNAL_LOG!U2:U2000),0)',""],
        ["Profit Factor",'=IFERROR(SUMIF(JOURNAL_LOG!B2:B2000,"*Win*",JOURNAL_LOG!AB2:AB2000)/ABS(SUMIF(JOURNAL_LOG!B2:B2000,"*Lose*",JOURNAL_LOG!AB2:AB2000)),0)',""],
        ["Max DD %",'=IFERROR(MIN(JOURNAL_LOG!AE2:AE2000),0)',"%"],
        ["Tổng phí",'=SUM(JOURNAL_LOG!Z2:Z2000)',"VNĐ"],
        ["Tổng thuế",'=SUM(JOURNAL_LOG!AA2:AA2000)',"VNĐ"],
    ]
    ws_sum.update('A1', summary)
    time.sleep(1)

    print("[6/9] Tong hop...")
    ws_th = sh.add_worksheet("Tổng hợp", rows=2000, cols=48)
    th_header = [
        ["📋 TỔNG HỢP GIAO DỊCH","","","","","","","","","","Sắp xếp & Lọc","","","","","","","","Thống kê nhanh"],
        [""],
        ["","","Tổng hợp","","","","","","","","Lọc theo thị trường","","Thứ tự sắp xếp","","","","","","Số dư ban đầu","=CONFIG!B4","Tổng nạp","=CONFIG!B10","","Tổng GD",'=COUNTA(JOURNAL_LOG!D2:D2000)'],
        ["","","","","","","","","","","Tất cả","","Ascending"],
    ]
    ws_th.update('A1', th_header)
    # Copy headers from JOURNAL_LOG
    th_cols = headers.copy()
    ws_th.update([th_cols], 'A6')
    ws_th.freeze(rows=6)
    time.sleep(1)

    print("[7/9] Lich Lai/Lo...")
    ws_cal = sh.add_worksheet("Lịch Lãi/Lỗ", rows=50, cols=25)
    ws_cal.update('A1', [["📅 LỊCH LÃI / LỖ"]])
    ws_cal.update('A3', [["","","Tháng","","Năm","","Số dư"]])
    days_header = ["T2","T3","T4","T5","T6","T7","CN"]
    ws_cal.update('C6', [days_header])
    time.sleep(1)

    print("[8/9] Cong cu tinh...")
    ws_calc = sh.add_worksheet("Công cụ tính", rows=55, cols=28)
    calc_data = [
        ["🧮 CÔNG CỤ TÍNH","","","","","","","","","","","","","","","","","","","🧮 TÍNH KHỐI LƯỢNG","","","","","","","","🧮 TÍNH R:R"],
        [""],
        ["","💰 MÁY TÍNH ĐIỂM PHÁI SINH","","","","","","","","","","","","","","","","","","📊 POSITION SIZE CALCULATOR"],
        [""],
        ["","Giá vào lệnh","","1285"],
        ["","Giá đóng lệnh","","1300"],
        ["","Vị thế","","Long"],
        ["","Số HĐ","","2"],
        ["","","",""],
        ["","Kết quả:","",""],
        ["","Điểm thực tế","","=IF(D7=\"Long\",D6-D5,D5-D6)"],
        ["","Lãi/Lỗ gộp (VNĐ)","","=D11*D8*CONFIG!B9"],
        ["","Phí GD","","=D8*CONFIG!B8*2"],
        ["","Lãi/Lỗ ròng","","=D12-D13"],
        [""],
        ["","💹 MÁY TÍNH CỔ PHIẾU"],
        [""],
        ["","Giá mua","","28.5"],
        ["","Giá bán","","31.2"],
        ["","Số CP","","1000"],
        ["","","",""],
        ["","Kết quả:","",""],
        ["","Chênh lệch giá","","=D19-D18"],
        ["","Lãi/Lỗ gộp","","=D23*D20*1000"],
        ["","Phí mua","","=D18*D20*1000*CONFIG!B5"],
        ["","Phí bán","","=D19*D20*1000*CONFIG!B6"],
        ["","Thuế bán","","=D19*D20*1000*CONFIG!B7"],
        ["","Lãi/Lỗ ròng","","=D24-D25-D26-D27"],
    ]
    ws_calc.update('A1', calc_data)
    time.sleep(1)

    print("[9/9] Formulas engine...")
    ws_f = sh.add_worksheet("Formulas", rows=2100, cols=70)
    ws_f.update('A1', [["⚠️ KHÔNG SỬA — ENGINE TÍNH TOÁN TỰ ĐỘNG"]])
    # Formulas header row
    f_headers = [
        "#","Trạng thái","Thị trường","Sản phẩm","Chiến lược","Vị thế","Phiên",
        "Ngày & Giờ vào lệnh","Thứ","Ngày & Giờ đóng lệnh","Thời gian GD",
        "Số dư","Khối lượng","Giá vào","Cắt lỗ","SL (Điểm)","Chốt lời",
        "TP (Điểm)","Giá đóng","Điểm thực tế","R:R kỳ vọng","Rủi ro %",
        "Mục tiêu lãi %","Lãi/Lỗ gộp","% TĐ gộp","Phí GD","Thuế",
        "Lãi/Lỗ ròng","L/L tích lũy","Số dư đã đóng","% TĐ ròng","% Tăng trưởng",
        "Nạp/Rút","","",
        "#","Trạng thái","Thị trường","Sản phẩm","Chiến lược","Vị thế"
    ]
    ws_f.update([f_headers], 'A2')
    # Stats section
    stats = [
        ["Net P/L per Strategy","","","Trade duration vs Result","","","Avg Daily Net P/L per Weekday"],
        ["","","","","","",""],
        ["Market","Filter by","","PnL by Pair"],
    ]
    ws_f.update('A4', stats)
    time.sleep(1)

    # --- FORMATTING via Sheets API ---
    print("Formatting...")
    journal_sid = None
    for s in sh.worksheets():
        if s.title == "JOURNAL_LOG":
            journal_sid = s.id; break

    requests = []
    # JOURNAL_LOG header format
    if journal_sid is not None:
        requests.append({
            'repeatCell': {
                'range': {'sheetId': journal_sid, 'startRowIndex': 0, 'endRowIndex': 1},
                'cell': {
                    'userEnteredFormat': {
                        'backgroundColor': {'red': 0.04, 'green': 0.055, 'blue': 0.09},
                        'textFormat': {'bold': True, 'fontSize': 10, 'foregroundColorStyle': {'rgbColor': {'red': 0.98, 'green': 0.98, 'blue': 0.98}}},
                        'horizontalAlignment': 'CENTER',
                        'borders': {'bottom': {'style': 'SOLID', 'colorStyle': {'rgbColor': {'red': 0.23, 'green': 0.51, 'blue': 0.96}}}}
                    }
                },
                'fields': 'userEnteredFormat'
            }
        })

    # Dropdowns
    config_path = os.path.join(os.path.dirname(__file__), '..', 'templates', 'config.json')
    with open(config_path, 'r', encoding='utf-8') as f:
        config = json.load(f)
    trang_thai = [o['icon']+' '+o['value'] for o in config['trang_thai_options']]
    tam_ly = [o['icon']+' '+o['value'] for o in config['tam_ly_options']]
    dds = [
        (1, trang_thai), (2, ['Phái sinh','Cổ phiếu']),
        (4, config['chien_luoc_options']),
        (5, ['Long','Short','Mua','Bán']),
        (6, ['ATO','Sáng','Chiều','ATC']),
        (32, tam_ly),
    ]
    for col, vals in dds:
        requests.append({
            'setDataValidation': {
                'range': {'sheetId': journal_sid, 'startRowIndex': 1, 'endRowIndex': 2000, 'startColumnIndex': col, 'endColumnIndex': col+1},
                'rule': {'condition': {'type': 'ONE_OF_LIST', 'values': [{'userEnteredValue': v} for v in vals]}, 'showCustomUi': True, 'strict': False}
            }
        })

    if requests:
        sheets_api.spreadsheets().batchUpdate(spreadsheetId=SHEET_ID, body={'requests': requests}).execute()

    # Reorder sheets
    print("Reordering sheets...")
    order = ["Hướng dẫn","Bắt đầu","Nhật ký → JOURNAL_LOG","CONFIG","SUMMARY","Tổng hợp","Tổng quan → (web)","Lịch Lãi/Lỗ","Công cụ tính","Formulas"]
    all_ws = sh.worksheets()
    ws_map = {ws.title: ws for ws in all_ws}
    desired = ["Hướng dẫn","Bắt đầu","JOURNAL_LOG","CONFIG","SUMMARY","Tổng hợp","Lịch Lãi/Lỗ","Công cụ tính","Formulas"]
    reqs = []
    for i, name in enumerate(desired):
        if name in ws_map:
            reqs.append({'updateSheetProperties': {'properties': {'sheetId': ws_map[name].id, 'index': i}, 'fields': 'index'}})
    if reqs:
        sheets_api.spreadsheets().batchUpdate(spreadsheetId=SHEET_ID, body={'requests': reqs}).execute()

    print(f"\n{'='*60}")
    print(f"  REBUILD THANH CONG!")
    print(f"  URL: https://docs.google.com/spreadsheets/d/{SHEET_ID}")
    print(f"  Sheets: {len(desired)} tabs")
    print(f"{'='*60}")

if __name__ == '__main__':
    rebuild()
