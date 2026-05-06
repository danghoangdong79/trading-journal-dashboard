import os, sys
sys.path.insert(0, os.path.dirname(__file__))
from google.oauth2.credentials import Credentials as OAuthCreds
from googleapiclient.discovery import build
import gspread

TOKEN_PATH = os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(__file__))), 'credentials', 'token.json')
SHEET_ID = '1PdCmBoBQsznOx6JXvOlbD-atxQnX9wHRXiM127f109I'

def build_final():
    creds = OAuthCreds.from_authorized_user_file(TOKEN_PATH, ['https://www.googleapis.com/auth/spreadsheets'])
    gc = gspread.authorize(creds)
    sh = gc.open_by_key(SHEET_ID)
    sheets_api = build('sheets', 'v4', credentials=creds)

    ws = sh.worksheet("SUMMARY")
    sid = ws.id
    
    # Fetch existing sheet to find number of conditional format rules to delete
    sheet_metadata = sheets_api.spreadsheets().get(spreadsheetId=SHEET_ID, fields="sheets.properties,sheets.conditionalFormats").execute()
    cf_rules_count = 0
    for s in sheet_metadata.get('sheets', []):
        if s.get('properties', {}).get('sheetId') == sid:
            cf_rules_count = len(s.get('conditionalFormats', []))
            break

    # 1. Clean up
    reqs = [
        # Clear Formats
        {'updateCells': {'range': {'sheetId': sid}, 'fields': 'userEnteredFormat'}},
        # Clear Merges
        {'unmergeCells': {'range': {'sheetId': sid, 'startRowIndex': 0, 'endRowIndex': 2000, 'startColumnIndex': 0, 'endColumnIndex': 50}}},
        # Clear Data Validations
        {'updateCells': {'range': {'sheetId': sid}, 'fields': 'dataValidation'}}
    ]
    
    # Delete existing CF rules (delete from last to first)
    for i in range(cf_rules_count - 1, -1, -1):
        reqs.append({'deleteConditionalFormatRule': {'index': i, 'sheetId': sid}})
        
    sheets_api.spreadsheets().batchUpdate(spreadsheetId=SHEET_ID, body={'requests': reqs}).execute()
    ws.clear()
    
    # 2. Build Layout (Shifted 1 column right)
    
    # Title Block
    ws.update('B1', [["TỔNG HỢP GIAO DỊCH"]], value_input_option='USER_ENTERED')
    
    # Headers Row 3
    ws.update('B3', [["Bộ lọc dữ liệu"]], value_input_option='USER_ENTERED')
    ws.update('F3', [["Thống kê nhanh"]], value_input_option='USER_ENTERED')
    
    # Filter Block (B4:E6)
    filters = [
        ["Lọc Tài sản", "Tất cả", "Từ ngày", ""],
        ["Lọc Vị thế", "Tất cả", "Đến ngày", ""],
        ["Lọc Chiến lược", "Tất cả", "", ""]
    ]
    ws.update('B4:E6', filters, value_input_option='USER_ENTERED')
    
    # Stats Block (F4:O7)
    stats_g1 = [
        ["Vốn ban đầu", "=CONFIG!$G$3 + CONFIG!$G$4"],
        ["Lãi/Lỗ chốt", "=SUM(Q10:Q)"],
        ["% Lãi/Lỗ", "=IFERROR(G5/G4, 0)"],
        ["Số dư h.tại", "=G4+G5"]
    ]
    ws.update('F4:G7', stats_g1, value_input_option='USER_ENTERED')
    
    stats_g2 = [
        ["Tổng GD", '=COUNTIF(D10:D, "<>")'],
        ["Winrate", '=IFERROR(COUNTIF(C10:C,"Thắng")/COUNTIFS(C10:C,"<>",C10:C,"<>Đang mở"), 0)'],
        ["GD Thắng", '=COUNTIF(C10:C, "Thắng")'],
        ["GD Thua", '=COUNTIF(C10:C, "Thua")']
    ]
    ws.update('H4:I7', stats_g2, value_input_option='USER_ENTERED')
    
    stats_g3 = [
        ["Đang mở", '=COUNTIF(C10:C, "Đang mở")'],
        ["GD Hòa", '=COUNTIF(C10:C, "Hòa")'],
        ["Thắng TB", '=IFERROR(AVERAGEIF(Q10:Q, ">0"), 0)'],
        ["Thua TB", '=IFERROR(AVERAGEIF(Q10:Q, "<0"), 0)']
    ]
    ws.update('J4:K7', stats_g3, value_input_option='USER_ENTERED')
    
    stats_g4 = [
        ["Lãi CP", '=SUMIF(D10:D, "Cổ phiếu", Q10:Q)'],
        ["Lãi PS", '=SUMIF(D10:D, "Phái sinh", Q10:Q)'],
        ["Phí & Thuế", '=SUM(P10:P)'],
        ["Hệ số LN", '=IFERROR(SUMIF(Q10:Q, ">0") / ABS(SUMIF(Q10:Q, "<0")), 0)']
    ]
    ws.update('L4:M7', stats_g4, value_input_option='USER_ENTERED')
    
    stats_g5 = [
        ["Max DD", '=IFERROR(MIN(Q10:Q), 0)'],
        ["DD Tuyệt đối", '=IFERROR(O4/G4, 0)'],
        ["Mục tiêu", '=CONFIG!$G$6'],
        ["Rủi ro/lệnh", '=CONFIG!$G$5']
    ]
    ws.update('N4:O7', stats_g5, value_input_option='USER_ENTERED')
    
    # Hidden Query String
    query_str = '="SELECT A, C, D, E, G, H, J, L, M, N, O, R, S, T, U, V, W WHERE D IS NOT NULL " & IF(C4="Tất cả", "", " AND C = \'" & C4 & "\' ") & IF(C6="Tất cả", "", " AND G = \'" & C6 & "\' ") & IF(C5="Tất cả", "", " AND E = \'" & C5 & "\' ") & IF(ISBLANK(E4), "", " AND H >= date \'" & TEXT(E4, "yyyy-mm-dd") & "\' ") & IF(ISBLANK(E5), "", " AND H <= date \'" & TEXT(E5, "yyyy-mm-dd") & "\' ")'
    ws.update('Z1', [[query_str]], value_input_option='USER_ENTERED')
    
    # Table Headers (Row 9)
    headers = ["#", "Trạng thái", "Tài sản", "Mã GD", "Vị thế", "Chiến lược", "Ngày Mở", "Ngày Đóng", "Số ngày", "Khối lượng", "Giá vào", "Giá đóng", "Biên độ", "Lãi/Lỗ Gộp", "Phí & Thuế", "Lãi/Lỗ Ròng", "Tâm lý", "Ghi chú"]
    ws.update('A9:R9', [headers], value_input_option='USER_ENTERED')
    
    # Table Data (Row 10+)
    # 1. ArrayFormula for Row numbers in A10
    ws.update('A10', [['=ARRAYFORMULA(IF(C10:C="", "", ROW(C10:C)-9))']], value_input_option='USER_ENTERED')
    
    # 2. Query Data formula in B10
    ws.update('B10', [['=IFERROR(QUERY(JOURNAL!A2:W, Z1, 0), {"Không có dữ liệu phù hợp", "", "", "", "", "", "", "", "", "", "", "", "", "", "", "", ""})']], value_input_option='USER_ENTERED')
    
    # Apply validations & formats
    ws_setup = sh.worksheet("SETUP")
    strategies = [r[0] for r in ws_setup.get_all_values()[2:] if len(r) > 20 and r[20]]
    strat_list = [{'userEnteredValue': 'Tất cả'}] + [{'userEnteredValue': s} for s in strategies if s]
    
    reqs = []
    # Data Validations (shifted right by 1 column)
    reqs.append({'setDataValidation': {'range': {'sheetId': sid, 'startRowIndex': 3, 'endRowIndex': 4, 'startColumnIndex': 2, 'endColumnIndex': 3}, 'rule': {'condition': {'type': 'ONE_OF_LIST', 'values': [{'userEnteredValue': 'Tất cả'}, {'userEnteredValue': 'Cổ phiếu'}, {'userEnteredValue': 'Phái sinh'}]}, 'showCustomUi': True}}})
    reqs.append({'setDataValidation': {'range': {'sheetId': sid, 'startRowIndex': 5, 'endRowIndex': 6, 'startColumnIndex': 2, 'endColumnIndex': 3}, 'rule': {'condition': {'type': 'ONE_OF_LIST', 'values': strat_list}, 'showCustomUi': True}}})
    reqs.append({'setDataValidation': {'range': {'sheetId': sid, 'startRowIndex': 4, 'endRowIndex': 5, 'startColumnIndex': 2, 'endColumnIndex': 3}, 'rule': {'condition': {'type': 'ONE_OF_LIST', 'values': [{'userEnteredValue': 'Tất cả'}, {'userEnteredValue': 'LONG'}, {'userEnteredValue': 'SHORT'}]}, 'showCustomUi': True}}})
    reqs.append({'setDataValidation': {'range': {'sheetId': sid, 'startRowIndex': 3, 'endRowIndex': 5, 'startColumnIndex': 4, 'endColumnIndex': 5}, 'rule': {'condition': {'type': 'DATE_IS_VALID'}, 'showCustomUi': True, 'strict': False}}})
    
    # Formats
    date_fmt = {'type': 'DATE', 'pattern': 'dd/mm/yyyy'}
    currency_fmt = {'type': 'CURRENCY', 'pattern': '#,##0\ "₫"'}
    pct_fmt = {'type': 'PERCENT', 'pattern': '0.00%'}
    
    # Date formatting for filters & table
    reqs.append({'repeatCell': {'range': {'sheetId': sid, 'startRowIndex': 3, 'endRowIndex': 5, 'startColumnIndex': 4, 'endColumnIndex': 5}, 'cell': {'userEnteredFormat': {'numberFormat': date_fmt}}, 'fields': 'userEnteredFormat.numberFormat'}})
    reqs.append({'repeatCell': {'range': {'sheetId': sid, 'startRowIndex': 9, 'endRowIndex': 500, 'startColumnIndex': 6, 'endColumnIndex': 8}, 'cell': {'userEnteredFormat': {'numberFormat': date_fmt}}, 'fields': 'userEnteredFormat.numberFormat'}})
    
    # Stats currency (Cols G=6, I=8, K=10, M=12, O=14)
    for r, c in [(3, 6), (4, 6), (6, 6), (5, 10), (6, 10), (3, 12), (4, 12), (5, 12), (3, 14), (4, 14), (5, 14)]:
        reqs.append({'repeatCell': {'range': {'sheetId': sid, 'startRowIndex': r, 'endRowIndex': r+1, 'startColumnIndex': c, 'endColumnIndex': c+1}, 'cell': {'userEnteredFormat': {'numberFormat': currency_fmt}}, 'fields': 'userEnteredFormat.numberFormat'}})
    
    # Stats percent
    reqs.append({'repeatCell': {'range': {'sheetId': sid, 'startRowIndex': 5, 'endRowIndex': 6, 'startColumnIndex': 6, 'endColumnIndex': 7}, 'cell': {'userEnteredFormat': {'numberFormat': pct_fmt}}, 'fields': 'userEnteredFormat.numberFormat'}}) # % Lãi/Lỗ
    reqs.append({'repeatCell': {'range': {'sheetId': sid, 'startRowIndex': 4, 'endRowIndex': 5, 'startColumnIndex': 8, 'endColumnIndex': 9}, 'cell': {'userEnteredFormat': {'numberFormat': pct_fmt}}, 'fields': 'userEnteredFormat.numberFormat'}}) # Winrate
    reqs.append({'repeatCell': {'range': {'sheetId': sid, 'startRowIndex': 4, 'endRowIndex': 5, 'startColumnIndex': 14, 'endColumnIndex': 15}, 'cell': {'userEnteredFormat': {'numberFormat': pct_fmt}}, 'fields': 'userEnteredFormat.numberFormat'}}) # DD Tuyệt đối
    
    # Table currency
    reqs.append({'repeatCell': {'range': {'sheetId': sid, 'startRowIndex': 9, 'endRowIndex': 500, 'startColumnIndex': 10, 'endColumnIndex': 12}, 'cell': {'userEnteredFormat': {'numberFormat': currency_fmt}}, 'fields': 'userEnteredFormat.numberFormat'}})
    reqs.append({'repeatCell': {'range': {'sheetId': sid, 'startRowIndex': 9, 'endRowIndex': 500, 'startColumnIndex': 13, 'endColumnIndex': 16}, 'cell': {'userEnteredFormat': {'numberFormat': currency_fmt}}, 'fields': 'userEnteredFormat.numberFormat'}})
    
    # CONDITIONAL FORMATTING
    # 1. Trạng thái (Col B, index 1)
    # Thắng -> Xanh (d9ead3)
    reqs.append({'addConditionalFormatRule': {'rule': {'ranges': [{'sheetId': sid, 'startRowIndex': 9, 'endRowIndex': 500, 'startColumnIndex': 1, 'endColumnIndex': 2}], 'booleanRule': {'condition': {'type': 'TEXT_EQ', 'values': [{'userEnteredValue': 'Thắng'}]}, 'format': {'backgroundColor': {'red': 0.85, 'green': 0.92, 'blue': 0.83}, 'textFormat': {'bold': True, 'foregroundColor': {'red': 0.15, 'green': 0.45, 'blue': 0.15}}}}}, 'index': 0}})
    # Thua -> Đỏ (f4cccc)
    reqs.append({'addConditionalFormatRule': {'rule': {'ranges': [{'sheetId': sid, 'startRowIndex': 9, 'endRowIndex': 500, 'startColumnIndex': 1, 'endColumnIndex': 2}], 'booleanRule': {'condition': {'type': 'TEXT_EQ', 'values': [{'userEnteredValue': 'Thua'}]}, 'format': {'backgroundColor': {'red': 0.96, 'green': 0.8, 'blue': 0.8}, 'textFormat': {'bold': True, 'foregroundColor': {'red': 0.8, 'green': 0, 'blue': 0}}}}}, 'index': 1}})
    # Đang mở -> Vàng (fff2cc)
    reqs.append({'addConditionalFormatRule': {'rule': {'ranges': [{'sheetId': sid, 'startRowIndex': 9, 'endRowIndex': 500, 'startColumnIndex': 1, 'endColumnIndex': 2}], 'booleanRule': {'condition': {'type': 'TEXT_EQ', 'values': [{'userEnteredValue': 'Đang mở'}]}, 'format': {'backgroundColor': {'red': 1, 'green': 0.95, 'blue': 0.8}, 'textFormat': {'bold': True, 'foregroundColor': {'red': 0.8, 'green': 0.6, 'blue': 0}}}}}, 'index': 2}})
    
    # 2. Lãi Ròng (Col P, index 15) -> >0 Xanh, <0 Đỏ
    reqs.append({'addConditionalFormatRule': {'rule': {'ranges': [{'sheetId': sid, 'startRowIndex': 9, 'endRowIndex': 500, 'startColumnIndex': 15, 'endColumnIndex': 16}], 'booleanRule': {'condition': {'type': 'NUMBER_GREATER', 'values': [{'userEnteredValue': '0'}]}, 'format': {'textFormat': {'bold': True, 'foregroundColor': {'red': 0.15, 'green': 0.45, 'blue': 0.15}}}}}, 'index': 3}})
    reqs.append({'addConditionalFormatRule': {'rule': {'ranges': [{'sheetId': sid, 'startRowIndex': 9, 'endRowIndex': 500, 'startColumnIndex': 15, 'endColumnIndex': 16}], 'booleanRule': {'condition': {'type': 'NUMBER_LESS', 'values': [{'userEnteredValue': '0'}]}, 'format': {'textFormat': {'bold': True, 'foregroundColor': {'red': 0.8, 'green': 0, 'blue': 0}}}}}, 'index': 4}})

    sheets_api.spreadsheets().batchUpdate(spreadsheetId=SHEET_ID, body={'requests': reqs}).execute()
    print("Final layout with CF built successfully")

if __name__ == '__main__':
    build_final()
