import os, sys
sys.path.insert(0, os.path.dirname(__file__))
from google.oauth2.credentials import Credentials as OAuthCreds
from googleapiclient.discovery import build
import gspread

TOKEN_PATH = os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(__file__))), 'credentials', 'token.json')
SHEET_ID = '1PdCmBoBQsznOx6JXvOlbD-atxQnX9wHRXiM127f109I'

def build_raw():
    creds = OAuthCreds.from_authorized_user_file(TOKEN_PATH, ['https://www.googleapis.com/auth/spreadsheets'])
    gc = gspread.authorize(creds)
    sh = gc.open_by_key(SHEET_ID)
    sheets_api = build('sheets', 'v4', credentials=creds)

    ws = sh.worksheet("SUMMARY")
    sid = ws.id
    
    # Ensure enough columns (up to AT = 46)
    if ws.col_count < 40:
        ws.add_cols(40 - ws.col_count)
    
    # 1. Clear everything (data and formats)
    sheets_api.spreadsheets().batchUpdate(
        spreadsheetId=SHEET_ID,
        body={'requests': [
            {'updateCells': {'range': {'sheetId': sid}, 'fields': 'userEnteredFormat'}},
            {'unmergeCells': {'range': {'sheetId': sid, 'startRowIndex': 0, 'endRowIndex': 2000, 'startColumnIndex': 0, 'endColumnIndex': 50}}}
        ]}
    ).execute()
    ws.clear()
    
    # 2. Build the Layout COMPACT (A to R)
    
    # Title Block (B3:C9)
    ws.update('B5', [["Tổng hợp"]], value_input_option='USER_ENTERED')
    
    # Filter Block (D3:G9)
    ws.update('D3', [["Bộ lọc dữ liệu"]], value_input_option='USER_ENTERED')
    filters = [
        ["Lọc Tài sản", "Tất cả", "Từ ngày", ""],
        ["", "", "", ""],
        ["Lọc Vị thế", "Tất cả", "Đến ngày", ""],
        ["", "", "", ""],
        ["Lọc Chiến lược", "Tất cả", "", ""]
    ]
    ws.update('D5:G9', filters, value_input_option='USER_ENTERED')
    
    # Stats Block (I3:R9)
    ws.update('I3', [["Thống kê nhanh"]], value_input_option='USER_ENTERED')
    
    # Group 1 (I-J)
    stats_g1 = [
        ["Vốn ban đầu", "=CONFIG!$G$3 + CONFIG!$G$4"],
        ["Lãi/Lỗ chốt", "=SUM(P15:P)"],
        ["", ""],
        ["% Lãi/Lỗ", "=IFERROR(J5/J4, 0)"],
        ["Số dư h.tại", "=J4+J5"]
    ]
    ws.update('I4:J8', stats_g1, value_input_option='USER_ENTERED')
    
    # Group 2 (K-L)
    stats_g2 = [
        ["Lãi CP", '=SUMIF(C15:C, "Cổ phiếu", P15:P)'],
        ["Lãi PS", '=SUMIF(C15:C, "Phái sinh", P15:P)'],
        ["", ""],
        ["Phí & Thuế", '=SUM(O15:O)'],
        ["Đang mở", '=COUNTIF(B15:B, "Đang mở")']
    ]
    ws.update('K4:L8', stats_g2, value_input_option='USER_ENTERED')
    
    # Group 3 (M-N)
    stats_g3 = [
        ["Tổng GD", '=COUNTIF(C15:C, "<>")'],
        ["GD Thắng", '=COUNTIF(B15:B, "Thắng")'],
        ["GD Thua", '=COUNTIF(B15:B, "Thua")'],
        ["GD Hòa", '=COUNTIF(B15:B, "Hòa")']
    ]
    ws.update('M4:N7', stats_g3, value_input_option='USER_ENTERED')
    
    # Group 4 (O-P)
    stats_g4 = [
        ["Tỷ lệ thắng", '=IFERROR(COUNTIF(B15:B,"Thắng")/COUNTIFS(B15:B,"<>",B15:B,"<>Đang mở"), 0)'],
        ["Thắng TB", '=IFERROR(AVERAGEIF(P15:P, ">0"), 0)'],
        ["Thua TB", '=IFERROR(AVERAGEIF(P15:P, "<0"), 0)'],
        ["Hệ số LN", '=IFERROR(SUMIF(P15:P, ">0") / ABS(SUMIF(P15:P, "<0")), 0)']
    ]
    ws.update('O4:P7', stats_g4, value_input_option='USER_ENTERED')
    
    # Group 5 (Q-R)
    stats_g5 = [
        ["Max DD", '=IFERROR(MIN(P15:P), 0)'],
        ["DD Tuyệt đối", '=IFERROR(R4/J4, 0)'],
        ["Mục tiêu/tháng", '=CONFIG!$G$6'],
        ["Rủi ro/lệnh", '=CONFIG!$G$5']
    ]
    ws.update('Q4:R7', stats_g5, value_input_option='USER_ENTERED')
    
    # Hidden Query String
    query_str = '="SELECT A, C, D, E, G, H, J, L, M, N, O, R, S, T, U, V, W WHERE D IS NOT NULL " & IF(E5="Tất cả", "", " AND C = \'" & E5 & "\' ") & IF(E9="Tất cả", "", " AND G = \'" & E9 & "\' ") & IF(E7="Tất cả", "", " AND E = \'" & E7 & "\' ") & IF(ISBLANK(G5), "", " AND H >= date \'" & TEXT(G5, "yyyy-mm-dd") & "\' ") & IF(ISBLANK(G7), "", " AND H <= date \'" & TEXT(G7, "yyyy-mm-dd") & "\' ")'
    ws.update('Z1', [[query_str]], value_input_option='USER_ENTERED')
    
    # Table Headers
    headers = ["#", "Trạng thái", "Tài sản", "Mã GD", "Vị thế", "Chiến lược", "Ngày Mở", "Ngày Đóng", "Số ngày", "Khối lượng", "Giá vào", "Giá đóng", "Biên độ", "Lãi/Lỗ Gộp", "Phí & Thuế", "Lãi/Lỗ Ròng", "Tâm lý", "Ghi chú"]
    ws.update('A13:R13', [headers], value_input_option='USER_ENTERED')
    
    # Row sequence formula
    seq_formulas = [[f'=IF(C{i}="","",ROW()-14)'] for i in range(15, 200)]
    ws.update('A15:A200', seq_formulas, value_input_option='USER_ENTERED')
    
    # Query Data formula
    ws.update('B15', [['=IFERROR(QUERY(JOURNAL!A2:W, Z1, 0), {"Không có dữ liệu phù hợp", "", "", "", "", "", "", "", "", "", "", "", "", "", "", "", ""})']], value_input_option='USER_ENTERED')
    
    # Apply validations
    ws_setup = sh.worksheet("SETUP")
    strategies = [r[0] for r in ws_setup.get_all_values()[2:] if len(r) > 20 and r[20]]
    strat_list = [{'userEnteredValue': 'Tất cả'}] + [{'userEnteredValue': s} for s in strategies if s]
    
    reqs = []
    # Tài sản
    reqs.append({'setDataValidation': {'range': {'sheetId': sid, 'startRowIndex': 4, 'endRowIndex': 5, 'startColumnIndex': 4, 'endColumnIndex': 5}, 'rule': {'condition': {'type': 'ONE_OF_LIST', 'values': [{'userEnteredValue': 'Tất cả'}, {'userEnteredValue': 'Cổ phiếu'}, {'userEnteredValue': 'Phái sinh'}]}, 'showCustomUi': True}}})
    # Chiến lược
    reqs.append({'setDataValidation': {'range': {'sheetId': sid, 'startRowIndex': 8, 'endRowIndex': 9, 'startColumnIndex': 4, 'endColumnIndex': 5}, 'rule': {'condition': {'type': 'ONE_OF_LIST', 'values': strat_list}, 'showCustomUi': True}}})
    # Vị thế
    reqs.append({'setDataValidation': {'range': {'sheetId': sid, 'startRowIndex': 6, 'endRowIndex': 7, 'startColumnIndex': 4, 'endColumnIndex': 5}, 'rule': {'condition': {'type': 'ONE_OF_LIST', 'values': [{'userEnteredValue': 'Tất cả'}, {'userEnteredValue': 'LONG'}, {'userEnteredValue': 'SHORT'}]}, 'showCustomUi': True}}})
    # Dates
    reqs.append({'setDataValidation': {'range': {'sheetId': sid, 'startRowIndex': 4, 'endRowIndex': 5, 'startColumnIndex': 6, 'endColumnIndex': 7}, 'rule': {'condition': {'type': 'DATE_IS_VALID'}, 'showCustomUi': True, 'strict': False}}})
    reqs.append({'setDataValidation': {'range': {'sheetId': sid, 'startRowIndex': 6, 'endRowIndex': 7, 'startColumnIndex': 6, 'endColumnIndex': 7}, 'rule': {'condition': {'type': 'DATE_IS_VALID'}, 'showCustomUi': True, 'strict': False}}})
    
    # Add borders to table header
    reqs.append({'updateBorders': {'range': {'sheetId': sid, 'startRowIndex': 12, 'endRowIndex': 13, 'startColumnIndex': 0, 'endColumnIndex': 18}, 'bottom': {'style': 'SOLID_MEDIUM'}}})
    
    sheets_api.spreadsheets().batchUpdate(spreadsheetId=SHEET_ID, body={'requests': reqs}).execute()
    print("Raw layout built successfully")

if __name__ == '__main__':
    build_raw()
