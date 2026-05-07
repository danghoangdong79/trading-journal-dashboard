"""Làm phong phú data SETUP và đổi LISTS thành FORMULAS"""
import os, sys, time
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

def refine_setup():
    gc, creds = get_gc()
    sh = gc.open_by_key(SHEET_ID)
    sheets_api = build('sheets', 'v4', credentials=creds)

    print("1. Đổi tên LISTS thành FORMULAS...")
    try:
        ws_form = sh.worksheet("LISTS")
        ws_form.update_title("FORMULAS")
    except:
        try:
            ws_form = sh.worksheet("FORMULAS")
        except:
            ws_form = sh.add_worksheet("FORMULAS", rows=100, cols=20)
            
    # Unhide FORMULAS so user can see it
    unhide_req = {"updateSheetProperties": {"properties": {"sheetId": ws_form.id, "hidden": False}, "fields": "hidden"}}
    sheets_api.spreadsheets().batchUpdate(spreadsheetId=SHEET_ID, body={"requests": [unhide_req]}).execute()

    print("2. Chuẩn bị Data Phong phú cho VN Market...")
    tickers = [
        ["41I1G5000", "Lệnh Test", "Mã khách yêu cầu"],
        ["VN30F1M", "Phái sinh 1M", "Hợp đồng tháng hiện tại"],
        ["VN30F2M", "Phái sinh 2M", "Hợp đồng tháng kế tiếp"],
        ["HPG", "Hòa Phát", "Thép - VN30"],
        ["FPT", "FPT", "Công nghệ - VN30"],
        ["VNM", "Vinamilk", "Thực phẩm - VN30"],
        ["TCB", "Techcombank", "Ngân hàng - VN30"],
        ["MBB", "MB Bank", "Ngân hàng - VN30"],
        ["SSI", "SSI", "Chứng khoán - VN30"],
        ["MWG", "Thế Giới Di Động", "Bán lẻ - VN30"],
        ["DIG", "DIC Corp", "Bất động sản Midcap"],
        ["DXG", "Đất Xanh", "Bất động sản Midcap"],
        ["VND", "VNDirect", "Chứng khoán"],
    ]
    
    strategies = [
        ["Breakout", "Phá nền", "Mua khi vượt kháng cự vol lớn"],
        ["Pullback", "Hồi kỹ thuật", "Mua khi test lại hỗ trợ/MA"],
        ["Đảo chiều", "Bắt đáy/Bán đỉnh", "Đánh ngược xu hướng khi có tín hiệu"],
        ["Tích lũy", "Mua gom nền", "Mua dần khi giá đi ngang biên độ hẹp"],
        ["Bắt dao rơi", "Bắt đáy sâu", "Rủi ro cao, bắt nhịp hồi T+"],
        ["Scalping", "Đánh T0", "Ăn line, đánh nhanh rút gọn (PS)"],
        ["Theo dòng tiền", "Follow Big Boys", "Mua theo nhóm ngành dẫn dắt"],
        ["Tin tức", "Đánh theo tin", "Giao dịch khi ra báo cáo/tin tức"],
    ]
    
    psychology = [
        ["Kỷ luật", "Tuân thủ Plan", "Vào/ra đúng điểm, đúng tỷ trọng"],
        ["Bình tĩnh", "Tâm lý ổn định", "Tự tin với setup"],
        ["FOMO", "Sợ lỡ cơ hội", "Đu đỉnh, mua đuổi giá xanh"],
        ["Sợ hãi", "Sợ hãi/Chốt non", "Không dám vào lệnh hoặc chốt quá sớm"],
        ["Trả thù", "Revenge Trading", "Cố gỡ lại lệnh lỗ vừa xong"],
        ["Thiếu kiên nhẫn", "Vào sớm/Ra sớm", "Phá vỡ setup vì không chờ được"],
        ["Quá tự tin", "Overconfident", "Đi lệnh sai tỷ trọng vì thắng liên tiếp"],
    ]
    
    orders = [
        ["Limit", "Lệnh Limit", "Chờ mua/bán ở giá cụ thể"],
        ["MTL", "Lệnh Thị Trường", "Khớp bằng mọi giá (Trượt giá cao)"],
        ["ATO", "Lệnh mở cửa", "Đua lệnh phiên ATO"],
        ["ATC", "Lệnh đóng cửa", "Đua lệnh phiên ATC"],
        ["MAK", "Lệnh MAK", "Khớp toàn bộ hoặc hủy"],
        ["MOK", "Lệnh MOK", "Khớp 1 phần và hủy phần còn lại"],
    ]

    print("3. Điền Data vào SETUP...")
    ws_setup = sh.worksheet("SETUP")
    
    # Xóa từ dòng 3 trở đi
    ws_setup.batch_clear(["A3:S100"])
    
    max_len = max(len(tickers), len(strategies), len(psychology), len(orders))
    
    setup_data = []
    for i in range(max_len):
        row = []
        # Tickers
        if i < len(tickers): row.extend(tickers[i] + ["TRUE", ""])
        else: row.extend(["", "", "", "TRUE", ""])
        # Strategies
        if i < len(strategies): row.extend(strategies[i] + ["TRUE", ""])
        else: row.extend(["", "", "", "TRUE", ""])
        # Psychology
        if i < len(psychology): row.extend(psychology[i] + ["TRUE", ""])
        else: row.extend(["", "", "", "TRUE", ""])
        # Orders
        if i < len(orders): row.extend(orders[i] + ["TRUE"])
        else: row.extend(["", "", "", "TRUE"])
        
        setup_data.append(row)
        
    ws_setup.update(values=setup_data, range_name='A3', value_input_option='USER_ENTERED')
    
    # Checkboxes for rows 3:max_len+3
    check_reqs = []
    for col in [3, 8, 13, 18]: # D, I, N, S (0-indexed)
        check_reqs.append({
            'setDataValidation': {
                'range': {'sheetId': ws_setup.id, 'startRowIndex': 2, 'endRowIndex': max_len+2, 'startColumnIndex': col, 'endColumnIndex': col+1},
                'rule': {'condition': {'type': 'BOOLEAN'}, 'showCustomUi': True}
            }
        })
    sheets_api.spreadsheets().batchUpdate(spreadsheetId=SHEET_ID, body={'requests': check_reqs}).execute()

    print("4. Cập nhật công thức FORMULAS...")
    ws_form.clear()
    form_data = [
        ["Mã GD", "Chiến Lược", "Tâm Lý", "Loại Lệnh"],
        [
            '=IFERROR(FILTER(SETUP!A3:A, SETUP!D3:D=TRUE), "")',
            '=IFERROR(FILTER(SETUP!F3:F, SETUP!I3:I=TRUE), "")',
            '=IFERROR(FILTER(SETUP!K3:K, SETUP!N3:N=TRUE), "")',
            '=IFERROR(FILTER(SETUP!P3:P, SETUP!S3:S=TRUE), "")'
        ]
    ]
    ws_form.update(values=form_data, range_name='A1', value_input_option='USER_ENTERED')
    ws_form.format('A1:D1', {"backgroundColor": {"red": 0.3, "green": 0.4, "blue": 0.5}, "textFormat": {"bold": True, "foregroundColor": {"red": 1, "green": 1, "blue": 1}}})

    print("5. Link JOURNAL dropdowns to FORMULAS...")
    journal_sid = sh.worksheet("JOURNAL").id
    reqs2 = []
    def add_range(col_idx, formula):
        reqs2.append({'setDataValidation': {'range': {'sheetId': journal_sid, 'startRowIndex': 1, 'endRowIndex': 2000, 'startColumnIndex': col_idx, 'endColumnIndex': col_idx+1}, 'rule': {'condition': {'type': 'ONE_OF_RANGE', 'values': [{'userEnteredValue': formula}]}, 'showCustomUi': True, 'strict': False}}})
    
    add_range(3, "=FORMULAS!$A$2:$A$100") # Mã GD
    add_range(5, "=FORMULAS!$D$2:$D$100") # Loại Lệnh
    add_range(6, "=FORMULAS!$B$2:$B$100") # Chiến Lược
    add_range(21, "=FORMULAS!$C$2:$C$100") # Tâm Lý
    sheets_api.spreadsheets().batchUpdate(spreadsheetId=SHEET_ID, body={'requests': reqs2}).execute()

    print("Hoàn tất refine!")

if __name__ == '__main__':
    refine_setup()
