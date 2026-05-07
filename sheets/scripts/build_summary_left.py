import os, sys
sys.path.insert(0, os.path.dirname(__file__))
from settings import SHEET_ID as CONFIGURED_SHEET_ID, TOKEN_PATH as CONFIGURED_TOKEN_PATH
from google.oauth2.credentials import Credentials as OAuthCreds
from googleapiclient.discovery import build
import gspread

TOKEN_PATH = str(CONFIGURED_TOKEN_PATH)
SHEET_ID = CONFIGURED_SHEET_ID

def build_left_layout():
    creds = OAuthCreds.from_authorized_user_file(TOKEN_PATH, ['https://www.googleapis.com/auth/spreadsheets'])
    gc = gspread.authorize(creds)
    sh = gc.open_by_key(SHEET_ID)
    sheets_api = build('sheets', 'v4', credentials=creds)

    ws = sh.worksheet("SUMMARY")
    sid = ws.id
    
    # 1. Clear everything PROPERLY (data, formats, AND data validations)
    sheets_api.spreadsheets().batchUpdate(
        spreadsheetId=SHEET_ID,
        body={'requests': [
            # Clear Formats
            {'updateCells': {'range': {'sheetId': sid}, 'fields': 'userEnteredFormat'}},
            # Clear Merges
            {'unmergeCells': {'range': {'sheetId': sid, 'startRowIndex': 0, 'endRowIndex': 2000, 'startColumnIndex': 0, 'endColumnIndex': 50}}},
            # Clear Data Validations (by passing an empty rule or just not specifying rule field)
            {'updateCells': {'range': {'sheetId': sid}, 'fields': 'dataValidation'}}
        ]}
    ).execute()
    ws.clear()
    
    # 2. Build the Layout COMPACT & LEFT-ALIGNED
    
    # Title Block
    ws.update(values=[["TỔNG HỢP GIAO DỊCH"]], range_name='A1', value_input_option='USER_ENTERED')
    
    # Headers Row 3
    ws.update(values=[["Bộ lọc dữ liệu"]], range_name='A3', value_input_option='USER_ENTERED')
    ws.update(values=[["Thống kê nhanh"]], range_name='E3', value_input_option='USER_ENTERED')
    
    # Filter Block (A4:D6)
    filters = [
        ["Lọc Tài sản", "Tất cả", "Từ ngày", ""],
        ["Lọc Vị thế", "Tất cả", "Đến ngày", ""],
        ["Lọc Chiến lược", "Tất cả", "", ""]
    ]
    ws.update(values=filters, range_name='A4:D6', value_input_option='USER_ENTERED')
    
    # Stats Block (E4:N7)
    stats_g1 = [
        ["Vốn ban đầu", "=CONFIG!$G$3 + CONFIG!$G$4"],
        ["Lãi/Lỗ chốt", "=SUM(P11:P)"],
        ["% Lãi/Lỗ", "=IFERROR(F5/F4, 0)"],
        ["Số dư h.tại", "=F4+F5"]
    ]
    ws.update(values=stats_g1, range_name='E4:F7', value_input_option='USER_ENTERED')
    
    stats_g2 = [
        ["Tổng GD", '=COUNTIF(C11:C, "<>")'],
        ["Winrate", '=IFERROR(COUNTIF(B11:B,"Thắng")/COUNTIFS(B11:B,"<>",B11:B,"<>Đang mở"), 0)'],
        ["GD Thắng", '=COUNTIF(B11:B, "Thắng")'],
        ["GD Thua", '=COUNTIF(B11:B, "Thua")']
    ]
    ws.update(values=stats_g2, range_name='G4:H7', value_input_option='USER_ENTERED')
    
    stats_g3 = [
        ["Đang mở", '=COUNTIF(B11:B, "Đang mở")'],
        ["GD Hòa", '=COUNTIF(B11:B, "Hòa")'],
        ["Thắng TB", '=IFERROR(AVERAGEIF(P11:P, ">0"), 0)'],
        ["Thua TB", '=IFERROR(AVERAGEIF(P11:P, "<0"), 0)']
    ]
    ws.update(values=stats_g3, range_name='I4:J7', value_input_option='USER_ENTERED')
    
    stats_g4 = [
        ["Lãi CP", '=SUMIF(C11:C, "Cổ phiếu", P11:P)'],
        ["Lãi PS", '=SUMIF(C11:C, "Phái sinh", P11:P)'],
        ["Phí & Thuế", '=SUM(O11:O)'],
        ["Hệ số LN", '=IFERROR(SUMIF(P11:P, ">0") / ABS(SUMIF(P11:P, "<0")), 0)']
    ]
    ws.update(values=stats_g4, range_name='K4:L7', value_input_option='USER_ENTERED')
    
    stats_g5 = [
        ["Max DD", '=IFERROR(MIN(P11:P), 0)'],
        ["DD Tuyệt đối", '=IFERROR(N4/F4, 0)'],
        ["Mục tiêu", '=CONFIG!$G$6'],
        ["Rủi ro/lệnh", '=CONFIG!$G$5']
    ]
    ws.update(values=stats_g5, range_name='M4:N7', value_input_option='USER_ENTERED')
    
    # Hidden Query String
    query_str = '="SELECT A, C, D, E, G, H, J, L, M, N, O, R, S, T, U, V, W WHERE D IS NOT NULL " & IF(B4="Tất cả", "", " AND C = \'" & B4 & "\' ") & IF(B6="Tất cả", "", " AND G = \'" & B6 & "\' ") & IF(B5="Tất cả", "", " AND E = \'" & B5 & "\' ") & IF(ISBLANK(D4), "", " AND H >= date \'" & TEXT(D4, "yyyy-mm-dd") & "\' ") & IF(ISBLANK(D5), "", " AND H <= date \'" & TEXT(D5, "yyyy-mm-dd") & "\' ")'
    ws.update(values=[[query_str]], range_name='Z1', value_input_option='USER_ENTERED')
    
    # Table Headers
    headers = ["#", "Trạng thái", "Tài sản", "Mã GD", "Vị thế", "Chiến lược", "Ngày Mở", "Ngày Đóng", "Số ngày", "Khối lượng", "Giá vào", "Giá đóng", "Biên độ", "Lãi/Lỗ Gộp", "Phí & Thuế", "Lãi/Lỗ Ròng", "Tâm lý", "Ghi chú"]
    ws.update(values=[headers], range_name='A9:R9', value_input_option='USER_ENTERED')
    
    # Row sequence formula
    seq_formulas = [[f'=IF(C{i}="","",ROW()-10)'] for i in range(11, 200)]
    ws.update(values=seq_formulas, range_name='A11:A200', value_input_option='USER_ENTERED')
    
    # Query Data formula
    ws.update(values=[['=IFERROR(QUERY(JOURNAL!A2:W, Z1, 0), {"Không có dữ liệu phù hợp", "", "", "", "", "", "", "", "", "", "", "", "", "", "", "", ""})']], range_name='B11', value_input_option='USER_ENTERED')
    
    # Apply validations
    ws_setup = sh.worksheet("SETUP")
    strategies = [r[0] for r in ws_setup.get_all_values()[2:] if len(r) > 20 and r[20]]
    strat_list = [{'userEnteredValue': 'Tất cả'}] + [{'userEnteredValue': s} for s in strategies if s]
    
    reqs = []
    # Data Validations
    reqs.append({'setDataValidation': {'range': {'sheetId': sid, 'startRowIndex': 3, 'endRowIndex': 4, 'startColumnIndex': 1, 'endColumnIndex': 2}, 'rule': {'condition': {'type': 'ONE_OF_LIST', 'values': [{'userEnteredValue': 'Tất cả'}, {'userEnteredValue': 'Cổ phiếu'}, {'userEnteredValue': 'Phái sinh'}]}, 'showCustomUi': True}}})
    reqs.append({'setDataValidation': {'range': {'sheetId': sid, 'startRowIndex': 5, 'endRowIndex': 6, 'startColumnIndex': 1, 'endColumnIndex': 2}, 'rule': {'condition': {'type': 'ONE_OF_LIST', 'values': strat_list}, 'showCustomUi': True}}})
    reqs.append({'setDataValidation': {'range': {'sheetId': sid, 'startRowIndex': 4, 'endRowIndex': 5, 'startColumnIndex': 1, 'endColumnIndex': 2}, 'rule': {'condition': {'type': 'ONE_OF_LIST', 'values': [{'userEnteredValue': 'Tất cả'}, {'userEnteredValue': 'LONG'}, {'userEnteredValue': 'SHORT'}]}, 'showCustomUi': True}}})
    reqs.append({'setDataValidation': {'range': {'sheetId': sid, 'startRowIndex': 3, 'endRowIndex': 5, 'startColumnIndex': 3, 'endColumnIndex': 4}, 'rule': {'condition': {'type': 'DATE_IS_VALID'}, 'showCustomUi': True, 'strict': False}}})
    
    # Date formatting for table and filters (dd/mm/yyyy)
    date_fmt = {'type': 'DATE', 'pattern': 'dd/mm/yyyy'}
    reqs.append({'repeatCell': {'range': {'sheetId': sid, 'startRowIndex': 3, 'endRowIndex': 5, 'startColumnIndex': 3, 'endColumnIndex': 4}, 'cell': {'userEnteredFormat': {'numberFormat': date_fmt}}, 'fields': 'userEnteredFormat.numberFormat'}})
    reqs.append({'repeatCell': {'range': {'sheetId': sid, 'startRowIndex': 10, 'endRowIndex': 500, 'startColumnIndex': 6, 'endColumnIndex': 8}, 'cell': {'userEnteredFormat': {'numberFormat': date_fmt}}, 'fields': 'userEnteredFormat.numberFormat'}})
    
    # Currency formatting for stats and table
    currency_fmt = {'type': 'CURRENCY', 'pattern': '#,##0\ "₫"'}
    pct_fmt = {'type': 'PERCENT', 'pattern': '0.00%'}
    # Stats currency
    for r, c in [(3, 5), (4, 5), (6, 5), (5, 9), (6, 9), (3, 11), (4, 11), (5, 11), (3, 13), (4, 13), (5, 13)]:
        reqs.append({'repeatCell': {'range': {'sheetId': sid, 'startRowIndex': r, 'endRowIndex': r+1, 'startColumnIndex': c, 'endColumnIndex': c+1}, 'cell': {'userEnteredFormat': {'numberFormat': currency_fmt}}, 'fields': 'userEnteredFormat.numberFormat'}})
    # Stats percent
    reqs.append({'repeatCell': {'range': {'sheetId': sid, 'startRowIndex': 5, 'endRowIndex': 6, 'startColumnIndex': 5, 'endColumnIndex': 6}, 'cell': {'userEnteredFormat': {'numberFormat': pct_fmt}}, 'fields': 'userEnteredFormat.numberFormat'}}) # % Lãi/Lỗ
    reqs.append({'repeatCell': {'range': {'sheetId': sid, 'startRowIndex': 4, 'endRowIndex': 5, 'startColumnIndex': 7, 'endColumnIndex': 8}, 'cell': {'userEnteredFormat': {'numberFormat': pct_fmt}}, 'fields': 'userEnteredFormat.numberFormat'}}) # Winrate
    reqs.append({'repeatCell': {'range': {'sheetId': sid, 'startRowIndex': 4, 'endRowIndex': 5, 'startColumnIndex': 13, 'endColumnIndex': 14}, 'cell': {'userEnteredFormat': {'numberFormat': pct_fmt}}, 'fields': 'userEnteredFormat.numberFormat'}}) # DD Tuyệt đối
    
    # Table currency (Cols 10, 11, 13, 14, 15) -> K, L, N, O, P
    reqs.append({'repeatCell': {'range': {'sheetId': sid, 'startRowIndex': 10, 'endRowIndex': 500, 'startColumnIndex': 10, 'endColumnIndex': 12}, 'cell': {'userEnteredFormat': {'numberFormat': currency_fmt}}, 'fields': 'userEnteredFormat.numberFormat'}})
    reqs.append({'repeatCell': {'range': {'sheetId': sid, 'startRowIndex': 10, 'endRowIndex': 500, 'startColumnIndex': 13, 'endColumnIndex': 16}, 'cell': {'userEnteredFormat': {'numberFormat': currency_fmt}}, 'fields': 'userEnteredFormat.numberFormat'}})
    
    sheets_api.spreadsheets().batchUpdate(spreadsheetId=SHEET_ID, body={'requests': reqs}).execute()
    print("Left-aligned layout built successfully")

if __name__ == '__main__':
    build_left_layout()
