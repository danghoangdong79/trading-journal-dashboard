import os, sys
sys.path.insert(0, os.path.dirname(__file__))
from settings import SHEET_ID as CONFIGURED_SHEET_ID, TOKEN_PATH as CONFIGURED_TOKEN_PATH
from google.oauth2.credentials import Credentials as OAuthCreds
from googleapiclient.discovery import build
import gspread

TOKEN_PATH = str(CONFIGURED_TOKEN_PATH)
SHEET_ID = CONFIGURED_SHEET_ID

def summary_cashflow_formula():
    tat_ca = "T\u1ea5t c\u1ea3"
    theo_thang = "Theo th\u00e1ng"
    regex = "r\u00fat|rut|withdraw|outflow"
    return (
        '=IFERROR(SUM(FILTER('
        f'IF(REGEXMATCH(LOWER(CASHFLOW!C2:C),"{regex}"),-ABS(CASHFLOW!D2:D),ABS(CASHFLOW!D2:D)),'
        'CASHFLOW!A2:A<>"",'
        f'IF(OR($C$8="",$C$8="{tat_ca}"),CASHFLOW!B2:B<>"",CASHFLOW!B2:B=$C$8),'
        f'IF($E$4="{theo_thang}",IF($E$5="{tat_ca}",CASHFLOW!A2:A<>"",YEAR(CASHFLOW!A2:A)=$E$5),IF(ISBLANK($E$7),CASHFLOW!A2:A<>"",CASHFLOW!A2:A>=$E$7)),'
        f'IF($E$4="{theo_thang}",IF($E$6="{tat_ca}",CASHFLOW!A2:A<>"",MONTH(CASHFLOW!A2:A)=$E$6),IF(ISBLANK($E$8),CASHFLOW!A2:A<>"",CASHFLOW!A2:A<=$E$8))'
        ')),0)'
    )

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
    ws.update(values=[["TỔNG HỢP GIAO DỊCH"]], range_name='B1', value_input_option='USER_ENTERED')
    
    # Headers Row 3
    ws.update(values=[["Bộ lọc dữ liệu"]], range_name='B3', value_input_option='USER_ENTERED')
    ws.update(values=[["Thống kê nhanh"]], range_name='F3', value_input_option='USER_ENTERED')
    
    # Filter Block (B4:E6)
    filters = [
        ["Lọc Tài sản", "Tất cả", "Từ ngày", ""],
        ["Lọc Vị thế", "Tất cả", "Đến ngày", ""],
        ["Lọc Chiến lược", "Tất cả", "", ""]
    ]
    ws.update(values=filters, range_name='B4:E6', value_input_option='USER_ENTERED')
    
    # Stats Block (F4:O7)
    stats_g1 = [
        ["V\u1ed1n ban \u0111\u1ea7u", "=CONFIG!$G$3 + CONFIG!$G$4"],
        ["L\u00e3i/L\u1ed7 ch\u1ed1t", "=SUM(Q10:Q)"],
        ["% L\u00e3i/L\u1ed7", "=IFERROR(G5/G4, 0)"],
        ["N\u1ea1p/R\u00fat r\u00f2ng", summary_cashflow_formula()],
        ["S\u1ed1 d\u01b0 h.t\u1ea1i", "=G4+G5+G7"]
    ]
    ws.update(values=stats_g1, range_name='F4:G8', value_input_option='USER_ENTERED')
    
    stats_g2 = [
        ["Tổng GD", '=COUNTIF(D10:D, "<>")'],
        ["Winrate", '=IFERROR(COUNTIF(C10:C,"Thắng")/COUNTIFS(C10:C,"<>",C10:C,"<>Đang mở"), 0)'],
        ["GD Thắng", '=COUNTIF(C10:C, "Thắng")'],
        ["GD Thua", '=COUNTIF(C10:C, "Thua")']
    ]
    ws.update(values=stats_g2, range_name='H4:I7', value_input_option='USER_ENTERED')
    
    stats_g3 = [
        ["Đang mở", '=COUNTIF(C10:C, "Đang mở")'],
        ["GD Hòa", '=COUNTIF(C10:C, "Hòa")'],
        ["Thắng TB", '=IFERROR(AVERAGEIF(Q10:Q, ">0"), 0)'],
        ["Thua TB", '=IFERROR(AVERAGEIF(Q10:Q, "<0"), 0)']
    ]
    ws.update(values=stats_g3, range_name='J4:K7', value_input_option='USER_ENTERED')
    
    stats_g4 = [
        ["Lãi CP", '=SUMIF(D10:D, "Cổ phiếu", Q10:Q)'],
        ["Lãi PS", '=SUMIF(D10:D, "Phái sinh", Q10:Q)'],
        ["Phí & Thuế", '=SUM(P10:P)'],
        ["Hệ số LN", '=IFERROR(SUMIF(Q10:Q, ">0") / ABS(SUMIF(Q10:Q, "<0")), 0)']
    ]
    ws.update(values=stats_g4, range_name='L4:M7', value_input_option='USER_ENTERED')
    
    stats_g5 = [
        ["Max DD", '=IFERROR(MIN(Q10:Q), 0)'],
        ["DD Tuy\u1ec7t \u0111\u1ed1i", '=IFERROR(O4/G4, 0)'],
        ["M\u1ee5c ti\u00eau", '=CONFIG!$G$6'],
        ["R\u1ee7i ro/l\u1ec7nh", '=CONFIG!$G$5']
    ]
    ws.update(values=stats_g5, range_name='N4:O7', value_input_option='USER_ENTERED')
    
    # Hidden Query String
    query_str = '="SELECT A, C, D, E, G, H, J, L, M, N, O, R, S, T, U, V, W WHERE D IS NOT NULL " & IF(C4="Tất cả", "", " AND C = \'" & C4 & "\' ") & IF(C6="Tất cả", "", " AND G = \'" & C6 & "\' ") & IF(C5="Tất cả", "", " AND E = \'" & C5 & "\' ") & IF(ISBLANK(E4), "", " AND H >= date \'" & TEXT(E4, "yyyy-mm-dd") & "\' ") & IF(ISBLANK(E5), "", " AND H <= date \'" & TEXT(E5, "yyyy-mm-dd") & "\' ")'
    ws.update(values=[[query_str]], range_name='Z1', value_input_option='USER_ENTERED')
    
    # Table Headers (Row 9)
    headers = ["#", "Trạng thái", "Tài sản", "Mã GD", "Vị thế", "Chiến lược", "Ngày Mở", "Ngày Đóng", "Số ngày", "Khối lượng", "Giá vào", "Giá đóng", "Biên độ", "Lãi/Lỗ Gộp", "Phí & Thuế", "Lãi/Lỗ Ròng", "Tâm lý", "Ghi chú"]
    ws.update(values=[headers], range_name='A9:R9', value_input_option='USER_ENTERED')
    
    # Table Data (Row 10+)
    # 1. ArrayFormula for Row numbers in A10
    ws.update(values=[['=ARRAYFORMULA(IF(C10:C="", "", ROW(C10:C)-9))']], range_name='A10', value_input_option='USER_ENTERED')
    
    # 2. Query Data formula in B10
    ws.update(values=[['=IFERROR(QUERY(JOURNAL!A2:W, Z1, 0), {"Không có dữ liệu phù hợp", "", "", "", "", "", "", "", "", "", "", "", "", "", "", "", ""})']], range_name='B10', value_input_option='USER_ENTERED')
    
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
