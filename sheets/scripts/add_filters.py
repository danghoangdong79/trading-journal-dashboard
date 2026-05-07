import os, sys
sys.path.insert(0, os.path.dirname(__file__))
from settings import SHEET_ID as CONFIGURED_SHEET_ID, TOKEN_PATH as CONFIGURED_TOKEN_PATH
from google.oauth2.credentials import Credentials as OAuthCreds
from googleapiclient.discovery import build
import gspread

TOKEN_PATH = str(CONFIGURED_TOKEN_PATH)
SHEET_ID = CONFIGURED_SHEET_ID

def add_filters():
    creds = OAuthCreds.from_authorized_user_file(TOKEN_PATH, ['https://www.googleapis.com/auth/spreadsheets'])
    gc = gspread.authorize(creds)
    sh = gc.open_by_key(SHEET_ID)
    sheets_api = build('sheets', 'v4', credentials=creds)

    # 1. ADD HELPER COLUMN TO JOURNAL
    ws_journal = sh.worksheet("JOURNAL")
    ws_journal.update(values=[["Nhóm Ngành"]], range_name='X1', value_input_option='USER_ENTERED')
    ws_journal.update(values=[['=ARRAYFORMULA(IF(D2:D="", "", IFERROR(VLOOKUP(D2:D, SETUP!E:G, 3, 0), IFERROR(VLOOKUP(D2:D, SETUP!O:Q, 3, 0), "Khác"))))']], range_name='X2', value_input_option='USER_ENTERED')
    
    # 2. UPDATE SUMMARY LAYOUT
    ws = sh.worksheet("SUMMARY")
    sid = ws.id
    
    # New Filter Block Layout (B4:E8)
    filters = [
        ["Lọc Tài sản", "Tất cả", "Lọc thời gian", "Theo khoảng"],
        ["Lọc Vị thế", "Tất cả", "Chọn Năm", "Tất cả"],
        ["Lọc Chiến lược", "Tất cả", "Chọn Tháng", "Tất cả"],
        ["Lọc Nhóm ngành", "Tất cả", "Từ ngày", ""],
        ["", "", "Đến ngày", ""]
    ]
    ws.update(values=filters, range_name='B4:E8', value_input_option='USER_ENTERED')
    
    # Get values for Nhóm ngành dropdown from SETUP
    ws_setup = sh.worksheet("SETUP")
    nhom_nganh = [r[0].strip() for r in ws_setup.get_all_values()[2:] if len(r) > 0 and r[0].strip()]
    nhom_nganh_list = [{'userEnteredValue': 'Tất cả'}] + [{'userEnteredValue': n} for n in nhom_nganh]
    
    # Hidden Query String - WITH MONTH, YEAR AND NHÓM NGÀNH FILTER SUPPORT
    # E4: Chế độ, E5: Năm, E6: Tháng, E7: Từ ngày, E8: Đến ngày
    # C4: Tài sản, C5: Vị thế, C6: Chiến lược, C7: Nhóm ngành
    # JOURNAL!X is Nhóm Ngành
    query_str = '="SELECT A, C, D, E, G, H, J, L, M, N, O, R, S, T, U, V, W WHERE D IS NOT NULL " & IF(C4="Tất cả", "", " AND C = \'" & C4 & "\' ") & IF(C6="Tất cả", "", " AND G = \'" & C6 & "\' ") & IF(C5="Tất cả", "", " AND E = \'" & C5 & "\' ") & IF(C7="Tất cả", "", " AND X = \'" & C7 & "\' ") & IF(E4="Theo tháng", IF(E5="Tất cả", "", " AND YEAR(H) = " & E5 & " ") & IF(E6="Tất cả", "", " AND month(H) = " & IFERROR(E6-1, 0) & " "), IF(ISBLANK(E7), "", " AND H >= date \'" & TEXT(E7, "yyyy-mm-dd") & "\' ") & IF(ISBLANK(E8), "", " AND H <= date \'" & TEXT(E8, "yyyy-mm-dd") & "\' "))'
    ws.update(values=[[query_str]], range_name='Z1', value_input_option='USER_ENTERED')
    
    # Update Query Formula reference
    ws.update(values=[['=IFERROR(QUERY(JOURNAL!A2:X, Z1, 0), {"Không có dữ liệu phù hợp", "", "", "", "", "", "", "", "", "", "", "", "", "", "", "", ""})']], range_name='B10', value_input_option='USER_ENTERED')
    
    # Apply validations & formats
    reqs = []
    
    # Data Validation for Nhóm ngành (C7)
    reqs.append({'setDataValidation': {'range': {'sheetId': sid, 'startRowIndex': 6, 'endRowIndex': 7, 'startColumnIndex': 2, 'endColumnIndex': 3}, 'rule': {'condition': {'type': 'ONE_OF_LIST', 'values': nhom_nganh_list}, 'showCustomUi': True}}})
    
    # Data Validation for Time Filters (Cols D-E, Rows 4-8)
    reqs.append({'setDataValidation': {'range': {'sheetId': sid, 'startRowIndex': 3, 'endRowIndex': 4, 'startColumnIndex': 4, 'endColumnIndex': 5}, 'rule': {'condition': {'type': 'ONE_OF_LIST', 'values': [{'userEnteredValue': 'Theo khoảng'}, {'userEnteredValue': 'Theo tháng'}]}, 'showCustomUi': True}}})
    reqs.append({'setDataValidation': {'range': {'sheetId': sid, 'startRowIndex': 4, 'endRowIndex': 5, 'startColumnIndex': 4, 'endColumnIndex': 5}, 'rule': {'condition': {'type': 'ONE_OF_LIST', 'values': [{'userEnteredValue': 'Tất cả'}] + [{'userEnteredValue': str(y)} for y in range(2024, 2030)]}, 'showCustomUi': True}}}) # Năm
    reqs.append({'setDataValidation': {'range': {'sheetId': sid, 'startRowIndex': 5, 'endRowIndex': 6, 'startColumnIndex': 4, 'endColumnIndex': 5}, 'rule': {'condition': {'type': 'ONE_OF_LIST', 'values': [{'userEnteredValue': 'Tất cả'}] + [{'userEnteredValue': str(m)} for m in range(1, 13)]}, 'showCustomUi': True}}}) # Tháng
    reqs.append({'setDataValidation': {'range': {'sheetId': sid, 'startRowIndex': 6, 'endRowIndex': 8, 'startColumnIndex': 4, 'endColumnIndex': 5}, 'rule': {'condition': {'type': 'DATE_IS_VALID'}, 'showCustomUi': True, 'strict': False}}}) # Date
    
    # Clear Date Validation from old Row 5 if any (since D5/E5 is now Năm)
    # The batchUpdate will just overwrite.
    
    # Date formatting for new date cells (E7:E8)
    date_fmt = {'type': 'DATE', 'pattern': 'dd/mm/yyyy'}
    reqs.append({'repeatCell': {'range': {'sheetId': sid, 'startRowIndex': 6, 'endRowIndex': 8, 'startColumnIndex': 4, 'endColumnIndex': 5}, 'cell': {'userEnteredFormat': {'numberFormat': date_fmt}}, 'fields': 'userEnteredFormat.numberFormat'}})
    
    # Clear date format from E5, E6 (Năm, Tháng) -> set to normal number
    normal_fmt = {'type': 'NUMBER', 'pattern': '0'}
    reqs.append({'repeatCell': {'range': {'sheetId': sid, 'startRowIndex': 4, 'endRowIndex': 6, 'startColumnIndex': 4, 'endColumnIndex': 5}, 'cell': {'userEnteredFormat': {'numberFormat': normal_fmt}}, 'fields': 'userEnteredFormat.numberFormat'}})
    
    sheets_api.spreadsheets().batchUpdate(spreadsheetId=SHEET_ID, body={'requests': reqs}).execute()
    print("Filters expanded successfully")

if __name__ == '__main__':
    add_filters()
