"""Rebuild SETUP cleanly and update FORMULAS & JOURNAL validation"""
import os, sys
sys.path.insert(0, os.path.dirname(__file__))
from settings import SHEET_ID as CONFIGURED_SHEET_ID, TOKEN_PATH as CONFIGURED_TOKEN_PATH
from google.oauth2.credentials import Credentials as OAuthCreds
from googleapiclient.discovery import build
import gspread

TOKEN_PATH = str(CONFIGURED_TOKEN_PATH)
SHEET_ID = CONFIGURED_SHEET_ID

def clean_setup():
    creds = OAuthCreds.from_authorized_user_file(TOKEN_PATH, ['https://www.googleapis.com/auth/spreadsheets'])
    gc = gspread.authorize(creds)
    sh = gc.open_by_key(SHEET_ID)
    sheets_api = build('sheets', 'v4', credentials=creds)
    
    ws_setup = sh.worksheet("SETUP")
    ws_formulas = sh.worksheet("FORMULAS")
    ws_journal = sh.worksheet("JOURNAL")

    # 1. Define pristine data
    stocks = [
        ["FPT", "FPT", "Công nghệ", True], ["HPG", "Hòa Phát", "Thép", True], 
        ["TCB", "Techcombank", "Ngân hàng", True], ["MBB", "MB Bank", "Ngân hàng", True],
        ["SSI", "SSI", "Chứng khoán", True], ["VND", "VNDirect", "Chứng khoán", True],
        ["MWG", "Thế Giới Di Động", "Bán lẻ", True], ["VNM", "Vinamilk", "Thực phẩm", True],
        ["DIG", "DIC Corp", "BĐS", True], ["DXG", "Đất Xanh", "BĐS", True]
    ]
    derivatives = [
        ["VN30F1M", "Phái sinh 1M", "Hợp đồng tháng này", True],
        ["VN30F2M", "Phái sinh 2M", "Hợp đồng tháng tới", True],
        ["VN30F1Q", "Phái sinh 1Q", "Hợp đồng quý này", True],
        ["VN30F2Q", "Phái sinh 2Q", "Hợp đồng quý tới", True],
        ["41I1G5000", "CW HPG", "Chứng quyền HPG", True]
    ]
    strategies = [
        ["Lướt sóng T0", "Đánh T0", "Ăn chênh lệch trong phiên", True],
        ["Phá nền", "Breakout", "Mua khi vượt kháng cự", True],
        ["Hồi kỹ thuật", "Pullback", "Mua khi test lại hỗ trợ", True],
        ["Bắt dao rơi", "Catch Knife", "Bắt đáy sâu rủi ro cao", True],
        ["Đầu tư giá trị", "Value", "Cầm dài hạn", True],
        ["Ăn cổ tức", "Dividend", "Mua nhận quyền", True],
        ["Theo dòng tiền", "Follow Money", "Đánh theo nhóm dẫn dắt", True],
        ["Theo tin tức", "News", "Đánh theo báo cáo/tin", True]
    ]
    psychology = [
        ["Bình tĩnh", "Calm", "Tuân thủ đúng plan", True],
        ["Kỷ luật", "Discipline", "Cắt lỗ/Chốt lời đúng điểm", True],
        ["FOMO", "FOMO", "Sợ lỡ cơ hội, đu đỉnh", True],
        ["Sợ hãi", "Fear", "Chốt non hoặc không dám vào lệnh", True],
        ["Do dự", "Hesitation", "Trễ nhịp thị trường", True],
        ["Trả thù", "Revenge", "Cố gỡ lệnh lỗ vừa xong", True],
        ["Thiếu kiên nhẫn", "Impatient", "Phá vỡ setup vì đợi lâu", True],
        ["Quá tự tin", "Overconfident", "Đi lệnh sai tỷ trọng", True]
    ]
    order_types = [
        ["Lệnh thường", "LO", "Lệnh giới hạn", True],
        ["ATO", "ATO", "Mở cửa", True],
        ["ATC", "ATC", "Đóng cửa", True],
        ["MTL", "MTL", "Thị trường - Trượt giá", True],
        ["MOK", "MOK", "Khớp 1 phần hoặc hủy", True],
        ["MAK", "MAK", "Khớp toàn bộ hoặc hủy", True],
        ["PLO", "PLO", "Sau giờ", True]
    ]

    # Build matrix for sheet
    ws_setup.batch_clear(["A1:Z100"])
    
    headers = [
        "MÃ CỔ PHIẾU", "", "", "", "", 
        "MÃ PHÁI SINH", "", "", "", "",
        "CHIẾN LƯỢC", "", "", "", "",
        "TÂM LÝ", "", "", "", "",
        "LOẠI LỆNH"
    ]
    sub_headers = ["Mã", "Tên", "Mô tả", "Bật", ""] * 5
    
    ws_setup.update(values=[headers], range_name='A1:Y1', value_input_option='USER_ENTERED')
    ws_setup.update(values=[sub_headers[:-1]], range_name='A2:Y2', value_input_option='USER_ENTERED')
    
    # Pad columns to construct massive array
    max_len = max(len(stocks), len(derivatives), len(strategies), len(psychology), len(order_types))
    
    data_rows = []
    for i in range(max_len):
        row = []
        row.extend(stocks[i] if i < len(stocks) else ["", "", "", ""])
        row.append("")
        row.extend(derivatives[i] if i < len(derivatives) else ["", "", "", ""])
        row.append("")
        row.extend(strategies[i] if i < len(strategies) else ["", "", "", ""])
        row.append("")
        row.extend(psychology[i] if i < len(psychology) else ["", "", "", ""])
        row.append("")
        row.extend(order_types[i] if i < len(order_types) else ["", "", "", ""])
        data_rows.append(row)
        
    ws_setup.update(values=data_rows, range_name='A3', value_input_option='USER_ENTERED')
    
    # Format Headers in SETUP
    reqs = [
        {'repeatCell': {'range': {'sheetId': ws_setup.id, 'startRowIndex': 0, 'endRowIndex': 2, 'startColumnIndex': 0, 'endColumnIndex': 24}, 'cell': {'userEnteredFormat': {'backgroundColor': {'red': 0.1, 'green': 0.2, 'blue': 0.4}, 'textFormat': {'bold': True, 'foregroundColor': {'red': 1, 'green': 1, 'blue': 1}}, 'horizontalAlignment': 'CENTER'}}, 'fields': 'userEnteredFormat(backgroundColor,textFormat,horizontalAlignment)'}}
    ]
    
    for col in [3, 8, 13, 18, 23]:
        reqs.append({
            'setDataValidation': {
                'range': {
                    'sheetId': ws_setup.id, 
                    'startRowIndex': 2, 
                    'endRowIndex': 100, 
                    'startColumnIndex': col, 
                    'endColumnIndex': col+1
                }, 
                'rule': {
                    'condition': {'type': 'BOOLEAN'}, 
                    'showCustomUi': True
                }
            }
        })
        
    sheets_api.spreadsheets().batchUpdate(spreadsheetId=SHEET_ID, body={'requests': reqs}).execute()

    # 2. Rebuild FORMULAS
    ws_formulas.batch_clear(["A1:Z2000"])
    f_headers = ["CỔ PHIẾU", "PHÁI SINH", "CHIẾN LƯỢC", "TÂM LÝ", "LOẠI LỆNH"]
    ws_formulas.update(values=[f_headers], range_name='A1:E1', value_input_option='USER_ENTERED')
    
    ws_formulas.update_acell('A2', '=FILTER(SETUP!A3:A, SETUP!D3:D=TRUE)')
    ws_formulas.update_acell('B2', '=FILTER(SETUP!F3:F, SETUP!I3:I=TRUE)')
    ws_formulas.update_acell('C2', '=FILTER(SETUP!K3:K, SETUP!N3:N=TRUE)')
    ws_formulas.update_acell('D2', '=FILTER(SETUP!P3:P, SETUP!S3:S=TRUE)')
    ws_formulas.update_acell('E2', '=FILTER(SETUP!U3:U, SETUP!X3:X=TRUE)')
    
    ws_formulas.update_acell('M1', 'MATRIX MÃ GD')
    matrix_formulas = []
    for i in range(2, 2001):
        f = f'=IFERROR(TRANSPOSE(IF(JOURNAL!$C{i}="Cổ phiếu", $A$2:$A, IF(JOURNAL!$C{i}="Phái sinh", $B$2:$B, {{""}}))), "")'
        matrix_formulas.append([f])
    ws_formulas.update(values=matrix_formulas, range_name='M2:M2000', value_input_option='USER_ENTERED')

    # 3. Update JOURNAL Data Validations
    v_reqs = []
    def add_val(col, r_str):
        v_reqs.append({'setDataValidation': {'range': {'sheetId': ws_journal.id, 'startRowIndex': 1, 'endRowIndex': 2000, 'startColumnIndex': col, 'endColumnIndex': col+1}, 'rule': {'condition': {'type': 'ONE_OF_RANGE', 'values': [{'userEnteredValue': r_str}]}, 'showCustomUi': True, 'strict': True}}})
        
    # C: Tài Sản (Hardcoded or just text)
    v_reqs.append({'setDataValidation': {'range': {'sheetId': ws_journal.id, 'startRowIndex': 1, 'endRowIndex': 2000, 'startColumnIndex': 2, 'endColumnIndex': 3}, 'rule': {'condition': {'type': 'ONE_OF_LIST', 'values': [{'userEnteredValue': 'Cổ phiếu'}, {'userEnteredValue': 'Phái sinh'}]}, 'showCustomUi': True, 'strict': True}}})
    # D: Mã GD (Matrix)
    add_val(3, '=FORMULAS!M2:Z2')
    # F: Loại lệnh
    add_val(5, '=FORMULAS!$E$2:$E')
    # G: Chiến lược
    add_val(6, '=FORMULAS!$C$2:$C')
    # V: Tâm lý
    add_val(21, '=FORMULAS!$D$2:$D')
    
    sheets_api.spreadsheets().batchUpdate(spreadsheetId=SHEET_ID, body={'requests': v_reqs}).execute()

    print("Rebuilt SETUP and FORMULAS perfectly.")

if __name__ == '__main__':
    clean_setup()
