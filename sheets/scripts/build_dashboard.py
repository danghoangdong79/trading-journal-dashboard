"""Build DASHBOARD sheet with KPI counters + filtered data table"""
import os, sys
sys.path.insert(0, os.path.dirname(__file__))
from google.oauth2.credentials import Credentials as OAuthCreds
from googleapiclient.discovery import build
import gspread

TOKEN_PATH = os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(__file__))), 'credentials', 'token.json')
SHEET_ID = '1PdCmBoBQsznOx6JXvOlbD-atxQnX9wHRXiM127f109I'

def build_dashboard():
    creds = OAuthCreds.from_authorized_user_file(TOKEN_PATH, ['https://www.googleapis.com/auth/spreadsheets'])
    gc = gspread.authorize(creds)
    sh = gc.open_by_key(SHEET_ID)
    sheets_api = build('sheets', 'v4', credentials=creds)

    # Create or get DASHBOARD sheet
    try:
        ws = sh.worksheet("DASHBOARD")
        ws.clear()
    except gspread.exceptions.WorksheetNotFound:
        ws = sh.add_worksheet(title="DASHBOARD", rows=2000, cols=30)

    sid = ws.id

    # =============================================
    # SECTION 1: KPI COUNTERS (Rows 1-11)
    # =============================================
    
    # Row 1: Title + Filter controls
    ws.update('A1', [["TỔNG HỢP GIAO DỊCH"]], value_input_option='USER_ENTERED')
    ws.update('F1', [["Lọc Tài sản:"]], value_input_option='USER_ENTERED')
    ws.update('G1', [["Tất cả"]], value_input_option='USER_ENTERED')
    ws.update('I1', [["Lọc Tháng:"]], value_input_option='USER_ENTERED')
    ws.update('J1', [["Tất cả"]], value_input_option='USER_ENTERED')
    
    # Row 3-4: KPI Box 1 - Tổng quan GD
    kpi_labels_1 = [
        ["TỔNG QUAN GIAO DỊCH", "", "", "", "", "", "HIỆU SUẤT", "", "", "", "", "", "RỦI RO & CHI PHÍ"],
    ]
    ws.update('A3:M3', kpi_labels_1, value_input_option='USER_ENTERED')
    
    # Row 4-8: KPI Values
    # Layout: [Label, Value, spacer] x 4 groups + [Label] = 13 cols (A:M)
    kpi_data = [
        # Row 4: A B C | D E F | G H I | J K L | M
        ["Tổng GD", '=COUNTIF(JOURNAL!D2:D, "<>")', "",
         "Winrate", '=IFERROR(COUNTIF(JOURNAL!A2:A,"Thắng")/COUNTIFS(JOURNAL!A2:A,"<>",JOURNAL!A2:A,"<>Đang mở"),0)', "",
         "Lãi Ròng", '=SUMPRODUCT((JOURNAL!A2:A<>"")*JOURNAL!U2:U)', "",
         "Max DD", '=IFERROR(MIN(JOURNAL!U2:U), 0)', "",
         '=IFERROR(SUMPRODUCT((JOURNAL!U2:U>0)*JOURNAL!U2:U)/ABS(SUMPRODUCT((JOURNAL!U2:U<0)*JOURNAL!U2:U)), 0)'],
        
        # Row 5
        ["GD Thắng", '=COUNTIF(JOURNAL!A2:A, "Thắng")', "",
         "Thắng TB", '=IFERROR(AVERAGEIF(JOURNAL!U2:U, ">"&0), 0)', "",
         "Lãi CP", '=SUMPRODUCT((JOURNAL!C2:C="Cổ phiếu")*JOURNAL!U2:U)', "",
         "Hệ số LN", "", "",
         '=SUMPRODUCT((JOURNAL!A2:A<>"")*JOURNAL!T2:T)'],
        
        # Row 6
        ["GD Thua", '=COUNTIF(JOURNAL!A2:A, "Thua")', "",
         "Thua TB", '=IFERROR(AVERAGEIF(JOURNAL!U2:U, "<"&0), 0)', "",
         "Lãi PS", '=SUMPRODUCT((JOURNAL!C2:C="Phái sinh")*JOURNAL!U2:U)', "",
         "TG GD TB", '=IFERROR(AVERAGE(JOURNAL!L2:L), 0)', "",
         '=COUNTIF(JOURNAL!A2:A, "Đang mở")'],
    ]
    ws.update('A4:M6', kpi_data, value_input_option='USER_ENTERED')
    
    # Row 7: Labels for the standalone values in col M
    ws.update('L4', [["Hệ số LN"]], value_input_option='USER_ENTERED')
    ws.update('L5', [["Phí & Thuế"]], value_input_option='USER_ENTERED')
    ws.update('L6', [["Đang mở"]], value_input_option='USER_ENTERED')
    
    # Row 8: Config references  
    extra_kpis = [
        ["Vốn CK", '=CONFIG!$G$3', "",
         "Mục tiêu", '=CONFIG!$G$6', "",
         "Vốn PS", '=CONFIG!$G$4', "",
         "R:R min", '=CONFIG!$G$7', "",
         '=CONFIG!$G$5'],
    ]
    ws.update('A8:M8', extra_kpis, value_input_option='USER_ENTERED')
    ws.update('L8', [["Rủi ro/Lệnh"]], value_input_option='USER_ENTERED')

    # =============================================
    # SECTION 2: DATA TABLE (Row 12+)
    # =============================================
    table_headers = [
        "#", "Trạng Thái", "Tài Sản", "Mã GD", "Vị Thế", "Chiến Lược",
        "Ngày Mở", "Ngày Đóng", "Số Ngày", "KL", "Giá Vào", "Giá Đóng",
        "Biên Độ", "Lãi/Lỗ Gộp", "Phí & Thuế", "Lãi/Lỗ Ròng", "Tâm Lý", "Ghi Chú"
    ]
    ws.update('A12:R12', [table_headers], value_input_option='USER_ENTERED')
    
    # Data rows: Direct reference to JOURNAL
    data_formulas = []
    for i in range(2, 200):
        row = [
            f'=IF(JOURNAL!D{i}="","",ROW()-12)',  # #
            f'=IF(JOURNAL!D{i}="","",JOURNAL!A{i})',  # Trạng Thái
            f'=IF(JOURNAL!D{i}="","",JOURNAL!C{i})',  # Tài Sản
            f'=IF(JOURNAL!D{i}="","",JOURNAL!D{i})',  # Mã GD
            f'=IF(JOURNAL!D{i}="","",JOURNAL!E{i})',  # Vị Thế
            f'=IF(JOURNAL!D{i}="","",JOURNAL!G{i})',  # Chiến Lược
            f'=IF(JOURNAL!D{i}="","",JOURNAL!H{i})',  # Ngày Mở
            f'=IF(JOURNAL!D{i}="","",JOURNAL!J{i})',  # Ngày Đóng
            f'=IF(JOURNAL!D{i}="","",JOURNAL!L{i})',  # Số Ngày
            f'=IF(JOURNAL!D{i}="","",JOURNAL!M{i})',  # KL
            f'=IF(JOURNAL!D{i}="","",JOURNAL!N{i})',  # Giá Vào
            f'=IF(JOURNAL!D{i}="","",JOURNAL!O{i})',  # Giá Đóng
            f'=IF(JOURNAL!D{i}="","",JOURNAL!R{i})',  # Biên Độ
            f'=IF(JOURNAL!D{i}="","",JOURNAL!S{i})',  # Lãi Gộp
            f'=IF(JOURNAL!D{i}="","",JOURNAL!T{i})',  # Phí Thuế
            f'=IF(JOURNAL!D{i}="","",JOURNAL!U{i})',  # Lãi Ròng
            f'=IF(JOURNAL!D{i}="","",JOURNAL!V{i})',  # Tâm Lý
            f'=IF(JOURNAL!D{i}="","",JOURNAL!W{i})',  # Ghi Chú
        ]
        data_formulas.append(row)
    
    ws.update('A13:R210', data_formulas, value_input_option='USER_ENTERED')

    # =============================================
    # SECTION 3: FORMATTING
    # =============================================
    reqs = []
    
    # Title merge & format (A1:E2)
    reqs.append({'mergeCells': {'range': {'sheetId': sid, 'startRowIndex': 0, 'endRowIndex': 2, 'startColumnIndex': 0, 'endColumnIndex': 5}, 'mergeType': 'MERGE_ALL'}})
    reqs.append({'repeatCell': {'range': {'sheetId': sid, 'startRowIndex': 0, 'endRowIndex': 2, 'startColumnIndex': 0, 'endColumnIndex': 5}, 'cell': {'userEnteredFormat': {'backgroundColor': {'red': 0.11, 'green': 0.2, 'blue': 0.39}, 'textFormat': {'bold': True, 'fontSize': 18, 'foregroundColor': {'red': 1, 'green': 1, 'blue': 1}}, 'horizontalAlignment': 'CENTER', 'verticalAlignment': 'MIDDLE'}}, 'fields': 'userEnteredFormat(backgroundColor,textFormat,horizontalAlignment,verticalAlignment)'}})
    
    # KPI Section Headers (Row 3)
    for start_col, end_col in [(0, 6), (6, 12), (12, 13)]:
        reqs.append({'mergeCells': {'range': {'sheetId': sid, 'startRowIndex': 2, 'endRowIndex': 3, 'startColumnIndex': start_col, 'endColumnIndex': end_col}, 'mergeType': 'MERGE_ALL'}})
    
    reqs.append({'repeatCell': {'range': {'sheetId': sid, 'startRowIndex': 2, 'endRowIndex': 3, 'startColumnIndex': 0, 'endColumnIndex': 13}, 'cell': {'userEnteredFormat': {'backgroundColor': {'red': 0.62, 'green': 0.77, 'blue': 0.91}, 'textFormat': {'bold': True, 'fontSize': 10, 'foregroundColor': {'red': 0.11, 'green': 0.2, 'blue': 0.39}}, 'horizontalAlignment': 'CENTER'}}, 'fields': 'userEnteredFormat(backgroundColor,textFormat,horizontalAlignment)'}})
    
    # KPI value labels (A,C columns - left side labels)
    for r in range(3, 9):
        for c in [0, 3, 6, 9, 12]:
            reqs.append({'repeatCell': {'range': {'sheetId': sid, 'startRowIndex': r, 'endRowIndex': r+1, 'startColumnIndex': c, 'endColumnIndex': c+1}, 'cell': {'userEnteredFormat': {'textFormat': {'bold': True, 'fontSize': 9, 'foregroundColor': {'red': 0.33, 'green': 0.33, 'blue': 0.33}}}}, 'fields': 'userEnteredFormat.textFormat'}})
    
    # KPI value cells (B,D columns)
    for r in range(3, 9):
        for c in [1, 4, 7, 10, 13]:
            reqs.append({'repeatCell': {'range': {'sheetId': sid, 'startRowIndex': r, 'endRowIndex': r+1, 'startColumnIndex': c, 'endColumnIndex': c+1}, 'cell': {'userEnteredFormat': {'textFormat': {'bold': True, 'fontSize': 12, 'foregroundColor': {'red': 0.11, 'green': 0.2, 'blue': 0.39}}}}, 'fields': 'userEnteredFormat.textFormat'}})
    
    # KPI area background
    reqs.append({'repeatCell': {'range': {'sheetId': sid, 'startRowIndex': 3, 'endRowIndex': 9, 'startColumnIndex': 0, 'endColumnIndex': 13}, 'cell': {'userEnteredFormat': {'backgroundColor': {'red': 0.93, 'green': 0.95, 'blue': 0.98}}}, 'fields': 'userEnteredFormat.backgroundColor'}})
    
    # Borders for KPI boxes
    border_style = {'style': 'SOLID', 'color': {'red': 0.62, 'green': 0.77, 'blue': 0.91}}
    for start_col, end_col in [(0, 6), (6, 12), (12, 13)]:
        reqs.append({'updateBorders': {'range': {'sheetId': sid, 'startRowIndex': 2, 'endRowIndex': 9, 'startColumnIndex': start_col, 'endColumnIndex': end_col}, 'top': border_style, 'bottom': border_style, 'left': border_style, 'right': border_style}})
    
    # Table headers (Row 12)
    reqs.append({'repeatCell': {'range': {'sheetId': sid, 'startRowIndex': 11, 'endRowIndex': 12, 'startColumnIndex': 0, 'endColumnIndex': 18}, 'cell': {'userEnteredFormat': {'backgroundColor': {'red': 0.11, 'green': 0.2, 'blue': 0.39}, 'textFormat': {'bold': True, 'foregroundColor': {'red': 1, 'green': 1, 'blue': 1}}, 'horizontalAlignment': 'CENTER'}}, 'fields': 'userEnteredFormat(backgroundColor,textFormat,horizontalAlignment)'}})
    
    # Freeze row 12 (header)
    reqs.append({'updateSheetProperties': {'properties': {'sheetId': sid, 'gridProperties': {'frozenRowCount': 12}}, 'fields': 'gridProperties.frozenRowCount'}})
    
    # Number formats for currency columns (N, O, P = 13, 14, 15 in data table)
    reqs.append({'repeatCell': {'range': {'sheetId': sid, 'startRowIndex': 12, 'endRowIndex': 210, 'startColumnIndex': 13, 'endColumnIndex': 16}, 'cell': {'userEnteredFormat': {'numberFormat': {'type': 'CURRENCY', 'pattern': '#,##0\ "₫"'}}}, 'fields': 'userEnteredFormat.numberFormat'}})
    
    # Winrate as %
    reqs.append({'repeatCell': {'range': {'sheetId': sid, 'startRowIndex': 3, 'endRowIndex': 4, 'startColumnIndex': 7, 'endColumnIndex': 8}, 'cell': {'userEnteredFormat': {'numberFormat': {'type': 'PERCENT', 'pattern': '0.0%'}}}, 'fields': 'userEnteredFormat.numberFormat'}})
    
    # DD % format
    reqs.append({'repeatCell': {'range': {'sheetId': sid, 'startRowIndex': 4, 'endRowIndex': 5, 'startColumnIndex': 13, 'endColumnIndex': 14}, 'cell': {'userEnteredFormat': {'numberFormat': {'type': 'PERCENT', 'pattern': '0.00%'}}}, 'fields': 'userEnteredFormat.numberFormat'}})
    
    # Currency format for KPI values
    for r_start, r_end, c_start, c_end in [(3, 4, 10, 11), (4, 5, 7, 8), (4, 5, 10, 11), (7, 8, 1, 2), (7, 8, 4, 5)]:
        reqs.append({'repeatCell': {'range': {'sheetId': sid, 'startRowIndex': r_start, 'endRowIndex': r_end, 'startColumnIndex': c_start, 'endColumnIndex': c_end}, 'cell': {'userEnteredFormat': {'numberFormat': {'type': 'CURRENCY', 'pattern': '#,##0\ "₫"'}}}, 'fields': 'userEnteredFormat.numberFormat'}})

    # Conditional formatting for status column (B = col 1 in table)
    # Thắng = Green
    reqs.append({'addConditionalFormatRule': {'rule': {'ranges': [{'sheetId': sid, 'startRowIndex': 12, 'endRowIndex': 210, 'startColumnIndex': 1, 'endColumnIndex': 2}], 'booleanRule': {'condition': {'type': 'TEXT_EQ', 'values': [{'userEnteredValue': 'Thắng'}]}, 'format': {'backgroundColor': {'red': 0.85, 'green': 0.95, 'blue': 0.85}, 'textFormat': {'foregroundColor': {'red': 0.15, 'green': 0.5, 'blue': 0.15}, 'bold': True}}}}, 'index': 0}})
    # Thua = Red
    reqs.append({'addConditionalFormatRule': {'rule': {'ranges': [{'sheetId': sid, 'startRowIndex': 12, 'endRowIndex': 210, 'startColumnIndex': 1, 'endColumnIndex': 2}], 'booleanRule': {'condition': {'type': 'TEXT_EQ', 'values': [{'userEnteredValue': 'Thua'}]}, 'format': {'backgroundColor': {'red': 0.98, 'green': 0.85, 'blue': 0.85}, 'textFormat': {'foregroundColor': {'red': 0.7, 'green': 0.15, 'blue': 0.15}, 'bold': True}}}}, 'index': 1}})
    # Đang mở = Amber
    reqs.append({'addConditionalFormatRule': {'rule': {'ranges': [{'sheetId': sid, 'startRowIndex': 12, 'endRowIndex': 210, 'startColumnIndex': 1, 'endColumnIndex': 2}], 'booleanRule': {'condition': {'type': 'TEXT_EQ', 'values': [{'userEnteredValue': 'Đang mở'}]}, 'format': {'backgroundColor': {'red': 1, 'green': 0.95, 'blue': 0.8}, 'textFormat': {'foregroundColor': {'red': 0.7, 'green': 0.5, 'blue': 0.1}, 'bold': True}}}}, 'index': 2}})
    
    # Conditional formatting for Lãi/Lỗ Ròng (P = col 15)
    reqs.append({'addConditionalFormatRule': {'rule': {'ranges': [{'sheetId': sid, 'startRowIndex': 12, 'endRowIndex': 210, 'startColumnIndex': 15, 'endColumnIndex': 16}], 'booleanRule': {'condition': {'type': 'NUMBER_GREATER', 'values': [{'userEnteredValue': '0'}]}, 'format': {'textFormat': {'foregroundColor': {'red': 0.15, 'green': 0.5, 'blue': 0.15}, 'bold': True}}}}, 'index': 3}})
    reqs.append({'addConditionalFormatRule': {'rule': {'ranges': [{'sheetId': sid, 'startRowIndex': 12, 'endRowIndex': 210, 'startColumnIndex': 15, 'endColumnIndex': 16}], 'booleanRule': {'condition': {'type': 'NUMBER_LESS', 'values': [{'userEnteredValue': '0'}]}, 'format': {'textFormat': {'foregroundColor': {'red': 0.7, 'green': 0.15, 'blue': 0.15}, 'bold': True}}}}, 'index': 4}})
    
    # Data validation for filters
    reqs.append({'setDataValidation': {'range': {'sheetId': sid, 'startRowIndex': 0, 'endRowIndex': 1, 'startColumnIndex': 6, 'endColumnIndex': 7}, 'rule': {'condition': {'type': 'ONE_OF_LIST', 'values': [{'userEnteredValue': 'Tất cả'}, {'userEnteredValue': 'Cổ phiếu'}, {'userEnteredValue': 'Phái sinh'}]}, 'showCustomUi': True}}})
    
    # Execute
    sheets_api.spreadsheets().batchUpdate(spreadsheetId=SHEET_ID, body={'requests': reqs}).execute()
    
    print("DASHBOARD built successfully!")

if __name__ == '__main__':
    build_dashboard()
