"""Restructure SETUP with Group Tables and spacing"""
import os, sys
sys.path.insert(0, os.path.dirname(__file__))
from google.oauth2.credentials import Credentials as OAuthCreds
from googleapiclient.discovery import build
import gspread

TOKEN_PATH = os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(__file__))), 'credentials', 'token.json')
SHEET_ID = '1PdCmBoBQsznOx6JXvOlbD-atxQnX9wHRXiM127f109I'

def restructure():
    creds = OAuthCreds.from_authorized_user_file(TOKEN_PATH, ['https://www.googleapis.com/auth/spreadsheets'])
    gc = gspread.authorize(creds)
    sh = gc.open_by_key(SHEET_ID)
    sheets_api = build('sheets', 'v4', credentials=creds)
    
    ws_setup = sh.worksheet("SETUP")
    ws_formulas = sh.worksheet("FORMULAS")
    ws_journal = sh.worksheet("JOURNAL")

    # Ensure SETUP has enough columns (we need up to AH which is 34 columns)
    if ws_setup.col_count < 34:
        ws_setup.add_cols(34 - ws_setup.col_count)

    # Clear everything in SETUP
    ws_setup.batch_clear(["A1:AZ500"])
    
    # Define Data
    nhom_cp = [
        ["Ngân hàng", "Nhóm NH", True], ["Bất động sản", "Nhóm BĐS", True], 
        ["BĐS Khu công nghiệp", "KCN", True], ["Chứng khoán", "CK", True], 
        ["Thép", "Tài nguyên", True], ["Bán lẻ", "Bán lẻ", True], 
        ["Công nghệ", "Tech", True], ["Thực phẩm", "Tiêu dùng", True], 
        ["Dầu khí", "Energy", True], ["Năng lượng", "Energy", True], 
        ["Hóa chất", "Hóa chất", True], ["Thủy sản", "Thủy sản", True], 
        ["Hàng không", "Aviation", True], ["Phân bón", "Phân bón", True], 
        ["VLXD", "Vật liệu XD", True], ["Đa ngành", "Tập đoàn", True]
    ]
    
    # Extract stocks from previous logic
    stocks = [
        ["VCB", "Vietcombank", "Ngân hàng", "HOSE", True], ["BID", "BIDV", "Ngân hàng", "HOSE", True],
        ["CTG", "VietinBank", "Ngân hàng", "HOSE", True], ["TCB", "Techcombank", "Ngân hàng", "HOSE", True],
        ["VPB", "VPBank", "Ngân hàng", "HOSE", True], ["MBB", "MB Bank", "Ngân hàng", "HOSE", True],
        ["ACB", "ACB", "Ngân hàng", "HOSE", True], ["STB", "Sacombank", "Ngân hàng", "HOSE", True],
        ["VHM", "Vinhomes", "Bất động sản", "HOSE", True], ["VIC", "Vingroup", "Bất động sản", "HOSE", True],
        ["DIG", "DIC Corp", "Bất động sản", "HOSE", True], ["DXG", "Đất Xanh", "Bất động sản", "HOSE", True],
        ["KBC", "Kinh Bắc", "BĐS Khu công nghiệp", "HOSE", True], ["IDC", "Idico", "BĐS Khu công nghiệp", "HNX", True],
        ["SSI", "SSI", "Chứng khoán", "HOSE", True], ["VND", "VNDirect", "Chứng khoán", "HOSE", True],
        ["VCI", "Vietcap", "Chứng khoán", "HOSE", True], ["HCM", "HSC", "Chứng khoán", "HOSE", True],
        ["HPG", "Hòa Phát", "Thép", "HOSE", True], ["HSG", "Hoa Sen", "Thép", "HOSE", True],
        ["MWG", "Thế Giới Di Động", "Bán lẻ", "HOSE", True], ["PNJ", "Vàng bạc Phú Nhuận", "Bán lẻ", "HOSE", True],
        ["FPT", "FPT", "Công nghệ", "HOSE", True], ["VNM", "Vinamilk", "Thực phẩm", "HOSE", True],
        ["GAS", "PV Gas", "Dầu khí", "HOSE", True], ["PVD", "PV Drilling", "Dầu khí", "HOSE", True],
        ["DGC", "Hóa chất Đức Giang", "Hóa chất", "HOSE", True], ["VHC", "Vĩnh Hoàn", "Thủy sản", "HOSE", True]
    ]

    nhom_ps = [
        ["HĐTL Chỉ số", "Hợp đồng tương lai chỉ số VN30", True],
        ["HĐTL Trái phiếu", "Hợp đồng tương lai trái phiếu chính phủ", True],
        ["Chứng quyền", "Chứng quyền có bảo đảm (CW)", True]
    ]
    
    phaisinh = [
        ["VN30F1M", "Phái sinh 1M", "HĐTL Chỉ số", "HNX", True],
        ["VN30F2M", "Phái sinh 2M", "HĐTL Chỉ số", "HNX", True],
        ["VN30F1Q", "Phái sinh 1Q", "HĐTL Chỉ số", "HNX", True],
        ["VN30F2Q", "Phái sinh 2Q", "HĐTL Chỉ số", "HNX", True],
        ["41I1G5000", "CW HPG", "Chứng quyền", "HOSE", True]
    ]

    strategies = [
        ["Lướt sóng T0", "Đánh T0", "Ăn chênh lệch trong phiên", True], ["Phá nền", "Breakout", "Mua khi vượt kháng cự", True],
        ["Hồi kỹ thuật", "Pullback", "Mua khi test lại hỗ trợ", True], ["Bắt dao rơi", "Catch Knife", "Bắt đáy sâu", True],
        ["Đầu tư giá trị", "Value", "Cầm dài hạn", True], ["Theo dòng tiền", "Follow Money", "Đánh theo nhóm dẫn dắt", True]
    ]

    psychology = [
        ["Bình tĩnh", "Calm", "Tuân thủ đúng plan", True], ["Kỷ luật", "Discipline", "Cắt lỗ/Chốt lời đúng điểm", True],
        ["FOMO", "FOMO", "Sợ lỡ cơ hội, đu đỉnh", True], ["Sợ hãi", "Fear", "Chốt non hoặc không dám vào lệnh", True],
        ["Trả thù", "Revenge", "Cố gỡ lệnh lỗ vừa xong", True]
    ]

    order_types = [
        ["Lệnh thường", "LO", "Lệnh giới hạn", True], ["ATO", "ATO", "Mở cửa", True], ["ATC", "ATC", "Đóng cửa", True],
        ["MTL", "MTL", "Thị trường - Trượt giá", True], ["MOK", "MOK", "Khớp 1 phần hoặc hủy", True], ["MAK", "MAK", "Khớp toàn hoặc hủy", True]
    ]

    # Build giant matrix to inject row by row
    max_rows = max(len(nhom_cp), len(stocks), len(nhom_ps), len(phaisinh), len(strategies), len(psychology), len(order_types))
    
    headers = [
        "NHÓM NGÀNH", "", "", "", "MÃ CỔ PHIẾU", "", "", "", "", "", "NHÓM PHÁI SINH", "", "", "", "MÃ PHÁI SINH", "", "", "", "", "", "CHIẾN LƯỢC", "", "", "", "", "TÂM LÝ", "", "", "", "", "LOẠI LỆNH", "", "", ""
    ]
    sub_headers = [
        "Tên Nhóm", "Mô tả", "Bật", "", "Mã", "Tên", "Nhóm Ngành", "Sàn", "Bật", "",
        "Nhóm Phái Sinh", "Mô tả", "Bật", "", "Mã", "Tên", "Nhóm PS", "Sàn", "Bật", "",
        "Mã", "Tên", "Mô tả", "Bật", "", "Mã", "Tên", "Mô tả", "Bật", "", "Mã", "Tên", "Mô tả", "Bật"
    ]
    
    data_rows = []
    for i in range(max_rows):
        row = []
        # Nhóm CP (3) + 1
        row.extend(nhom_cp[i] if i < len(nhom_cp) else ["", "", ""])
        row.append("")
        # Mã CP (5) + 1
        row.extend(stocks[i] if i < len(stocks) else ["", "", "", "", ""])
        row.append("")
        # Nhóm PS (3) + 1
        row.extend(nhom_ps[i] if i < len(nhom_ps) else ["", "", ""])
        row.append("")
        # Mã PS (5) + 1
        row.extend(phaisinh[i] if i < len(phaisinh) else ["", "", "", "", ""])
        row.append("")
        # Chiến lược (4) + 1
        row.extend(strategies[i] if i < len(strategies) else ["", "", "", ""])
        row.append("")
        # Tâm lý (4) + 1
        row.extend(psychology[i] if i < len(psychology) else ["", "", "", ""])
        row.append("")
        # Loại lệnh (4)
        row.extend(order_types[i] if i < len(order_types) else ["", "", "", ""])
        
        data_rows.append(row)

    ws_setup.update('A1:AH1', [headers], value_input_option='USER_ENTERED')
    ws_setup.update('A2:AH2', [sub_headers], value_input_option='USER_ENTERED')
    ws_setup.update('A3:AH' + str(2 + len(data_rows)), data_rows, value_input_option='USER_ENTERED')

    # Formatting headers
    reqs = []
    reqs.append({
        'repeatCell': {
            'range': {'sheetId': ws_setup.id, 'startRowIndex': 0, 'endRowIndex': 2, 'startColumnIndex': 0, 'endColumnIndex': 34},
            'cell': {'userEnteredFormat': {'backgroundColor': {'red': 0.1, 'green': 0.2, 'blue': 0.4}, 'textFormat': {'bold': True, 'foregroundColor': {'red': 1, 'green': 1, 'blue': 1}}, 'horizontalAlignment': 'CENTER'}},
            'fields': 'userEnteredFormat(backgroundColor,textFormat,horizontalAlignment)'
        }
    })
    
    # Checkboxes columns: C(2), I(8), M(12), S(18), X(23), AC(28), AH(33)
    for col in [2, 8, 12, 18, 23, 28, 33]:
        reqs.append({'setDataValidation': {'range': {'sheetId': ws_setup.id, 'startRowIndex': 2, 'endRowIndex': 100, 'startColumnIndex': col, 'endColumnIndex': col+1}, 'rule': {'condition': {'type': 'BOOLEAN'}, 'showCustomUi': True}}})

    # Hardcoded validation for Sàn: H(7) and R(17)
    reqs.append({'setDataValidation': {'range': {'sheetId': ws_setup.id, 'startRowIndex': 2, 'endRowIndex': 100, 'startColumnIndex': 7, 'endColumnIndex': 8}, 'rule': {'condition': {'type': 'ONE_OF_LIST', 'values': [{'userEnteredValue': 'HOSE'}, {'userEnteredValue': 'HNX'}, {'userEnteredValue': 'UPCOM'}]}, 'showCustomUi': True, 'strict': True}}})
    reqs.append({'setDataValidation': {'range': {'sheetId': ws_setup.id, 'startRowIndex': 2, 'endRowIndex': 100, 'startColumnIndex': 17, 'endColumnIndex': 18}, 'rule': {'condition': {'type': 'ONE_OF_LIST', 'values': [{'userEnteredValue': 'HOSE'}, {'userEnteredValue': 'HNX'}, {'userEnteredValue': 'UPCOM'}]}, 'showCustomUi': True, 'strict': True}}})

    sheets_api.spreadsheets().batchUpdate(spreadsheetId=SHEET_ID, body={'requests': reqs}).execute()

    # FORMULAS update
    ws_formulas.batch_clear(["A1:H2000"])
    f_headers = ["CỔ PHIẾU", "PHÁI SINH", "CHIẾN LƯỢC", "TÂM LÝ", "LOẠI LỆNH", "", "NHÓM CP", "NHÓM PS"]
    ws_formulas.update('A1:H1', [f_headers], value_input_option='USER_ENTERED')
    
    # Filtering based on new columns
    ws_formulas.update_acell('A2', '=FILTER(SETUP!E3:E, SETUP!I3:I=TRUE)') # Mã CP
    ws_formulas.update_acell('B2', '=FILTER(SETUP!O3:O, SETUP!S3:S=TRUE)') # Mã PS
    ws_formulas.update_acell('C2', '=FILTER(SETUP!U3:U, SETUP!X3:X=TRUE)') # Chiến lược
    ws_formulas.update_acell('D2', '=FILTER(SETUP!Z3:Z, SETUP!AC3:AC=TRUE)') # Tâm lý
    ws_formulas.update_acell('E2', '=FILTER(SETUP!AE3:AE, SETUP!AH3:AH=TRUE)') # Loại lệnh
    ws_formulas.update_acell('G2', '=FILTER(SETUP!A3:A, SETUP!C3:C=TRUE)') # Nhóm CP
    ws_formulas.update_acell('H2', '=FILTER(SETUP!K3:K, SETUP!M3:M=TRUE)') # Nhóm PS
    
    # Dependent Dropdown in SETUP (Nhóm Ngành)
    v_reqs = []
    # Dropdown for Cổ phiếu -> Nhóm Ngành (G) points to FORMULAS!G2:G
    v_reqs.append({'setDataValidation': {'range': {'sheetId': ws_setup.id, 'startRowIndex': 2, 'endRowIndex': 100, 'startColumnIndex': 6, 'endColumnIndex': 7}, 'rule': {'condition': {'type': 'ONE_OF_RANGE', 'values': [{'userEnteredValue': '=FORMULAS!$G$2:$G'}]}, 'showCustomUi': True, 'strict': True}}})
    # Dropdown for Phái sinh -> Nhóm PS (Q) points to FORMULAS!H2:H
    v_reqs.append({'setDataValidation': {'range': {'sheetId': ws_setup.id, 'startRowIndex': 2, 'endRowIndex': 100, 'startColumnIndex': 16, 'endColumnIndex': 17}, 'rule': {'condition': {'type': 'ONE_OF_RANGE', 'values': [{'userEnteredValue': '=FORMULAS!$H$2:$H'}]}, 'showCustomUi': True, 'strict': True}}})

    sheets_api.spreadsheets().batchUpdate(spreadsheetId=SHEET_ID, body={'requests': v_reqs}).execute()
    
    print("SETUP successfully restructured with 7 blocks and spacing!")

if __name__ == '__main__':
    restructure()
