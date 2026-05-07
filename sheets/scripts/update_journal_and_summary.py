import os, sys, json
sys.path.insert(0, os.path.dirname(__file__))
from settings import SHEET_ID as CONFIGURED_SHEET_ID, TOKEN_PATH as CONFIGURED_TOKEN_PATH
from google.oauth2.credentials import Credentials as OAuthCreds
from googleapiclient.discovery import build
import gspread

TOKEN_PATH = str(CONFIGURED_TOKEN_PATH)
SHEET_ID = CONFIGURED_SHEET_ID

def update_all():
    creds = OAuthCreds.from_authorized_user_file(TOKEN_PATH, ['https://www.googleapis.com/auth/spreadsheets'])
    gc = gspread.authorize(creds)
    sh = gc.open_by_key(SHEET_ID)
    sheets_api = build('sheets', 'v4', credentials=creds)

    # 1. UPDATE JOURNAL (Vị thế: Mua -> LONG, Bán -> SHORT)
    ws_journal = sh.worksheet("JOURNAL")
    journal_data = ws_journal.get_all_values()
    
    update_reqs = []
    for i, row in enumerate(journal_data):
        if i == 0: continue # Skip header
        if len(row) > 4:
            val = row[4] # Col E is Vị Thế
            new_val = None
            if val == "Mua": new_val = "LONG"
            elif val == "Bán": new_val = "SHORT"
            
            if new_val:
                update_reqs.append({
                    'updateCells': {
                        'range': {'sheetId': ws_journal.id, 'startRowIndex': i, 'endRowIndex': i+1, 'startColumnIndex': 4, 'endColumnIndex': 5},
                        'rows': [{'values': [{'userEnteredValue': {'stringValue': new_val}}]}],
                        'fields': 'userEnteredValue'
                    }
                })

    if update_reqs:
        sheets_api.spreadsheets().batchUpdate(spreadsheetId=SHEET_ID, body={'requests': update_reqs}).execute()

    # Update Data Validation for JOURNAL!E2:E
    val_req = {
        'setDataValidation': {
            'range': {'sheetId': ws_journal.id, 'startRowIndex': 1, 'endRowIndex': 2000, 'startColumnIndex': 4, 'endColumnIndex': 5},
            'rule': {'condition': {'type': 'ONE_OF_LIST', 'values': [{'userEnteredValue': 'LONG'}, {'userEnteredValue': 'SHORT'}]}, 'showCustomUi': True, 'strict': True}
        }
    }
    sheets_api.spreadsheets().batchUpdate(spreadsheetId=SHEET_ID, body={'requests': [val_req]}).execute()

    # 2. RENAME DASHBOARD TO SUMMARY AND REBUILD
    try:
        ws_summary = sh.worksheet("DASHBOARD")
        sheets_api.spreadsheets().batchUpdate(spreadsheetId=SHEET_ID, body={'requests': [{'updateSheetProperties': {'properties': {'sheetId': ws_summary.id, 'title': 'SUMMARY'}, 'fields': 'title'}}]}).execute()
        ws_summary = sh.worksheet("SUMMARY") # Re-fetch with new name
    except gspread.exceptions.WorksheetNotFound:
        try:
            ws_summary = sh.worksheet("SUMMARY")
        except gspread.exceptions.WorksheetNotFound:
            ws_summary = sh.add_worksheet(title="SUMMARY", rows=2000, cols=30)
            
    ws_summary.clear()
    sid = ws_summary.id

    # Layout Data
    # Row 1: Title
    ws_summary.update(values=[["SUMMARY DASHBOARD"]], range_name='A1', value_input_option='USER_ENTERED')
    
    # Row 2: Filters
    ws_summary.update(values=[["Từ ngày:"]], range_name='B2', value_input_option='USER_ENTERED')
    ws_summary.update(values=[["Đến ngày:"]], range_name='E2', value_input_option='USER_ENTERED')
    ws_summary.update(values=[["Tài sản:"]], range_name='H2', value_input_option='USER_ENTERED')
    ws_summary.update(values=[["Tất cả"]], range_name='I2', value_input_option='USER_ENTERED')
    ws_summary.update(values=[["Chiến lược:"]], range_name='K2', value_input_option='USER_ENTERED')
    ws_summary.update(values=[["Tất cả"]], range_name='L2', value_input_option='USER_ENTERED')
    ws_summary.update(values=[["Vị thế:"]], range_name='N2', value_input_option='USER_ENTERED')
    ws_summary.update(values=[["Tất cả"]], range_name='O2', value_input_option='USER_ENTERED')

    # Row 4-8: KPIs
    kpis = [
        ["Tổng GD", '=COUNTIF(C15:C, "<>")', "", "Lãi Ròng", '=SUM(O15:O)', "", "Lãi Cổ phiếu", '=SUMIF(B15:B, "Cổ phiếu", O15:O)', "", "Winrate", '=IFERROR(COUNTIF(A15:A,"Thắng")/COUNTIFS(A15:A,"<>",A15:A,"<>Đang mở"), 0)'],
        ["GD Thắng", '=COUNTIF(A15:A, "Thắng")', "", "Thắng TB", '=IFERROR(AVERAGEIF(O15:O, ">0"), 0)', "", "Lãi Phái sinh", '=SUMIF(B15:B, "Phái sinh", O15:O)', "", "Max DD", '=IFERROR(MIN(O15:O), 0)'],
        ["GD Thua", '=COUNTIF(A15:A, "Thua")', "", "Thua TB", '=IFERROR(AVERAGEIF(O15:O, "<0"), 0)', "", "Phí & Thuế", '=SUM(N15:N)', "", "Hệ số LN", '=IFERROR(SUMIF(O15:O, ">0") / ABS(SUMIF(O15:O, "<0")), 0)'],
        ["GD Hòa", '=COUNTIF(A15:A, "Hòa")', "", "", "", "", "", "", "", "", ""],
        ["Đang mở", '=COUNTIF(A15:A, "Đang mở")', "", "", "", "", "", "", "", "", ""]
    ]
    ws_summary.update(values=kpis, range_name='B4:L8', value_input_option='USER_ENTERED')

    # Row 13: Table Headers
    headers = ["Trạng Thái", "Tài Sản", "Mã GD", "Vị Thế", "Chiến Lược", "Ngày Mở", "Ngày Đóng", "Số Ngày", "Khối Lượng", "Giá Vào", "Giá Đóng", "Biên Độ", "Lãi/Lỗ Gộp", "Phí & Thuế", "Lãi/Lỗ Ròng", "Tâm Lý", "Ghi Chú"]
    ws_summary.update(values=[headers], range_name='A13:Q13', value_input_option='USER_ENTERED')

    # Row 14: Hidden Query String & Data Formula
    query_str = '="SELECT A, C, D, E, G, H, J, L, M, N, O, R, S, T, U, V, W WHERE D IS NOT NULL " & IF(I2="Tất cả", "", " AND C = \'" & I2 & "\' ") & IF(L2="Tất cả", "", " AND G = \'" & L2 & "\' ") & IF(O2="Tất cả", "", " AND E = \'" & O2 & "\' ") & IF(ISBLANK(C2), "", " AND H >= date \'" & TEXT(C2, "yyyy-mm-dd") & "\' ") & IF(ISBLANK(F2), "", " AND H <= date \'" & TEXT(F2, "yyyy-mm-dd") & "\' ")'
    ws_summary.update(values=[[query_str]], range_name='Z1', value_input_option='USER_ENTERED')
    ws_summary.update(values=[['=IFERROR(QUERY(JOURNAL!A2:W, Z1, 0), {"Không có dữ liệu phù hợp", "", "", "", "", "", "", "", "", "", "", "", "", "", "", "", ""})']], range_name='A15', value_input_option='USER_ENTERED')

    # Data Validation for Filters
    filter_vals = []
    # Tài sản
    filter_vals.append({'setDataValidation': {'range': {'sheetId': sid, 'startRowIndex': 1, 'endRowIndex': 2, 'startColumnIndex': 8, 'endColumnIndex': 9}, 'rule': {'condition': {'type': 'ONE_OF_LIST', 'values': [{'userEnteredValue': 'Tất cả'}, {'userEnteredValue': 'Cổ phiếu'}, {'userEnteredValue': 'Phái sinh'}]}, 'showCustomUi': True}}})
    # Chiến lược (Lấy từ SETUP + Tất cả) -> We'll just build the list dynamically based on SETUP
    ws_setup = sh.worksheet("SETUP")
    strategies = [r[0] for r in ws_setup.get_all_values()[2:] if len(r) > 20 and r[20]]
    strat_list = [{'userEnteredValue': 'Tất cả'}] + [{'userEnteredValue': s} for s in strategies if s]
    filter_vals.append({'setDataValidation': {'range': {'sheetId': sid, 'startRowIndex': 1, 'endRowIndex': 2, 'startColumnIndex': 11, 'endColumnIndex': 12}, 'rule': {'condition': {'type': 'ONE_OF_LIST', 'values': strat_list}, 'showCustomUi': True}}})
    # Vị thế
    filter_vals.append({'setDataValidation': {'range': {'sheetId': sid, 'startRowIndex': 1, 'endRowIndex': 2, 'startColumnIndex': 14, 'endColumnIndex': 15}, 'rule': {'condition': {'type': 'ONE_OF_LIST', 'values': [{'userEnteredValue': 'Tất cả'}, {'userEnteredValue': 'LONG'}, {'userEnteredValue': 'SHORT'}]}, 'showCustomUi': True}}})
    
    # Dates (valid date)
    filter_vals.append({'setDataValidation': {'range': {'sheetId': sid, 'startRowIndex': 1, 'endRowIndex': 2, 'startColumnIndex': 2, 'endColumnIndex': 3}, 'rule': {'condition': {'type': 'DATE_IS_VALID'}, 'showCustomUi': True, 'strict': False}}})
    filter_vals.append({'setDataValidation': {'range': {'sheetId': sid, 'startRowIndex': 1, 'endRowIndex': 2, 'startColumnIndex': 5, 'endColumnIndex': 6}, 'rule': {'condition': {'type': 'DATE_IS_VALID'}, 'showCustomUi': True, 'strict': False}}})

    sheets_api.spreadsheets().batchUpdate(spreadsheetId=SHEET_ID, body={'requests': filter_vals}).execute()

    # Formats
    reqs = []
    # Unmerge all first to prevent overlapping merge errors
    reqs.append({'unmergeCells': {'range': {'sheetId': sid, 'startRowIndex': 0, 'endRowIndex': 100, 'startColumnIndex': 0, 'endColumnIndex': 30}}})
    
    # Title
    reqs.append({'mergeCells': {'range': {'sheetId': sid, 'startRowIndex': 0, 'endRowIndex': 1, 'startColumnIndex': 0, 'endColumnIndex': 17}, 'mergeType': 'MERGE_ALL'}})
    reqs.append({'repeatCell': {'range': {'sheetId': sid, 'startRowIndex': 0, 'endRowIndex': 1, 'startColumnIndex': 0, 'endColumnIndex': 17}, 'cell': {'userEnteredFormat': {'backgroundColor': {'red': 0.11, 'green': 0.2, 'blue': 0.39}, 'textFormat': {'bold': True, 'fontSize': 14, 'foregroundColor': {'red': 1, 'green': 1, 'blue': 1}}, 'horizontalAlignment': 'CENTER'}}, 'fields': 'userEnteredFormat(backgroundColor,textFormat,horizontalAlignment)'}})
    
    # Filter Row background
    reqs.append({'repeatCell': {'range': {'sheetId': sid, 'startRowIndex': 1, 'endRowIndex': 2, 'startColumnIndex': 0, 'endColumnIndex': 17}, 'cell': {'userEnteredFormat': {'backgroundColor': {'red': 0.9, 'green': 0.95, 'blue': 0.98}, 'textFormat': {'bold': True}}}, 'fields': 'userEnteredFormat(backgroundColor,textFormat)'}})
    
    # KPI Headers
    for c in [1, 4, 7, 10]:
        reqs.append({'repeatCell': {'range': {'sheetId': sid, 'startRowIndex': 3, 'endRowIndex': 8, 'startColumnIndex': c, 'endColumnIndex': c+1}, 'cell': {'userEnteredFormat': {'textFormat': {'bold': True, 'fontSize': 10, 'foregroundColor': {'red': 0.3, 'green': 0.3, 'blue': 0.3}}}}, 'fields': 'userEnteredFormat.textFormat'}})
    for c in [2, 5, 8, 11]:
        reqs.append({'repeatCell': {'range': {'sheetId': sid, 'startRowIndex': 3, 'endRowIndex': 8, 'startColumnIndex': c, 'endColumnIndex': c+1}, 'cell': {'userEnteredFormat': {'textFormat': {'bold': True, 'fontSize': 12, 'foregroundColor': {'red': 0.1, 'green': 0.2, 'blue': 0.4}}}}, 'fields': 'userEnteredFormat.textFormat'}})
    
    # Currency / Percent formats for KPIs
    reqs.append({'repeatCell': {'range': {'sheetId': sid, 'startRowIndex': 3, 'endRowIndex': 4, 'startColumnIndex': 11, 'endColumnIndex': 12}, 'cell': {'userEnteredFormat': {'numberFormat': {'type': 'PERCENT', 'pattern': '0.0%'}}}, 'fields': 'userEnteredFormat.numberFormat'}})
    for r, c in [(3, 5), (4, 5), (5, 5), (3, 8), (4, 8), (5, 8), (4, 11)]: # Lãi ròng, Thắng TB, Thua TB, Lãi CP, Lãi PS, Phí Thuế, Max DD
        reqs.append({'repeatCell': {'range': {'sheetId': sid, 'startRowIndex': r, 'endRowIndex': r+1, 'startColumnIndex': c, 'endColumnIndex': c+1}, 'cell': {'userEnteredFormat': {'numberFormat': {'type': 'CURRENCY', 'pattern': '#,##0\ "₫"'}}}, 'fields': 'userEnteredFormat.numberFormat'}})
    
    # Table Headers
    reqs.append({'repeatCell': {'range': {'sheetId': sid, 'startRowIndex': 12, 'endRowIndex': 13, 'startColumnIndex': 0, 'endColumnIndex': 17}, 'cell': {'userEnteredFormat': {'backgroundColor': {'red': 0.2, 'green': 0.3, 'blue': 0.5}, 'textFormat': {'bold': True, 'foregroundColor': {'red': 1, 'green': 1, 'blue': 1}}, 'horizontalAlignment': 'CENTER'}}, 'fields': 'userEnteredFormat(backgroundColor,textFormat,horizontalAlignment)'}})
    reqs.append({'updateSheetProperties': {'properties': {'sheetId': sid, 'gridProperties': {'frozenRowCount': 13}}, 'fields': 'gridProperties.frozenRowCount'}})

    # Currency for table (Cols M, N, O) - 12, 13, 14
    reqs.append({'repeatCell': {'range': {'sheetId': sid, 'startRowIndex': 14, 'endRowIndex': 500, 'startColumnIndex': 12, 'endColumnIndex': 15}, 'cell': {'userEnteredFormat': {'numberFormat': {'type': 'CURRENCY', 'pattern': '#,##0\ "₫"'}}}, 'fields': 'userEnteredFormat.numberFormat'}})
    
    sheets_api.spreadsheets().batchUpdate(spreadsheetId=SHEET_ID, body={'requests': reqs}).execute()
    print("Done building SUMMARY")

if __name__ == '__main__':
    update_all()
