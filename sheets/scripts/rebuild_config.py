"""Rebuild CONFIG sheet and update JOURNAL formulas"""
import os, sys
sys.path.insert(0, os.path.dirname(__file__))
from settings import SHEET_ID as CONFIGURED_SHEET_ID, TOKEN_PATH as CONFIGURED_TOKEN_PATH
from google.oauth2.credentials import Credentials as OAuthCreds
from googleapiclient.discovery import build
import gspread
from fee_profile import ensure_fee_profile_sheet, ensure_fee_charges_sheet, apply_fee_profile_formulas

TOKEN_PATH = str(CONFIGURED_TOKEN_PATH)
SHEET_ID = CONFIGURED_SHEET_ID

def rebuild():
    creds = OAuthCreds.from_authorized_user_file(TOKEN_PATH, ['https://www.googleapis.com/auth/spreadsheets'])
    gc = gspread.authorize(creds)
    sh = gc.open_by_key(SHEET_ID)
    sheets_api = build('sheets', 'v4', credentials=creds)
    
    ws_config = sh.worksheet("CONFIG")
    ws_journal = sh.worksheet("JOURNAL")

    # Clear old CONFIG
    ws_config.batch_clear(["A1:Z100"])

    # Build new layout
    headers = ["THAM SỐ GIAO DỊCH", "", "", "", "QUẢN TRỊ RỦI RO & MỤC TIÊU", "", "", "", "TÍCH HỢP HỆ THỐNG N8N", "", ""]
    sub_headers = ["Loại", "Tham số", "Giá trị", "", "Tiêu chí", "Tham số", "Giá trị", "", "Phân hệ", "Cấu hình", "Trạng thái/Giá trị"]
    
    data = [
        ["Cổ Phiếu", "Hệ số giá", 1000, "", "Quản trị Vốn", "Vốn Cổ Phiếu (VNĐ)", 500000000, "", "Hệ thống", "Múi giờ", "GMT+7"],
        ["Cổ Phiếu", "Phí giao dịch", 0.0015, "", "Quản trị Vốn", "Vốn Phái Sinh (VNĐ)", 100000000, "", "Telegram", "Gửi thông báo", True],
        ["Cổ Phiếu", "Thuế TNCN (Bán)", 0.001, "", "Rủi ro", "Rủi ro Tối đa / Lệnh", 0.02, "", "N8N", "Webhook URL", "https://n8n.webhook.example.com"],
        ["Phái Sinh", "Hệ số điểm", 100000, "", "Mục tiêu", "Lợi nhuận kỳ vọng / Tháng", 0.05, "", "", "", ""],
        ["Phái Sinh", "Phí giao dịch / chiều", 4000, "", "Mục tiêu", "Tỷ lệ R:R tối thiểu", 2, "", "", "", ""]
    ]

    ws_config.update(values=[headers], range_name='A1:K1', value_input_option='USER_ENTERED')
    ws_config.update(values=[sub_headers], range_name='A2:K2', value_input_option='USER_ENTERED')
    ws_config.update(values=data, range_name='A3:K7', value_input_option='USER_ENTERED')

    # Formatting headers
    reqs = []
    
    # Merge cells for super headers
    reqs.append({'mergeCells': {'range': {'sheetId': ws_config.id, 'startRowIndex': 0, 'endRowIndex': 1, 'startColumnIndex': 0, 'endColumnIndex': 3}, 'mergeType': 'MERGE_ALL'}})
    reqs.append({'mergeCells': {'range': {'sheetId': ws_config.id, 'startRowIndex': 0, 'endRowIndex': 1, 'startColumnIndex': 4, 'endColumnIndex': 7}, 'mergeType': 'MERGE_ALL'}})
    reqs.append({'mergeCells': {'range': {'sheetId': ws_config.id, 'startRowIndex': 0, 'endRowIndex': 1, 'startColumnIndex': 8, 'endColumnIndex': 11}, 'mergeType': 'MERGE_ALL'}})

    # Format Super Headers
    reqs.append({
        'repeatCell': {
            'range': {'sheetId': ws_config.id, 'startRowIndex': 0, 'endRowIndex': 2, 'startColumnIndex': 0, 'endColumnIndex': 11},
            'cell': {'userEnteredFormat': {'backgroundColor': {'red': 0.1, 'green': 0.2, 'blue': 0.4}, 'textFormat': {'bold': True, 'foregroundColor': {'red': 1, 'green': 1, 'blue': 1}}, 'horizontalAlignment': 'CENTER'}},
            'fields': 'userEnteredFormat(backgroundColor,textFormat,horizontalAlignment)'
        }
    })

    # Format values (Percent and Currency)
    reqs.append({
        'repeatCell': {
            'range': {'sheetId': ws_config.id, 'startRowIndex': 2, 'endRowIndex': 8, 'startColumnIndex': 2, 'endColumnIndex': 3},
            'cell': {'userEnteredFormat': {'numberFormat': {'type': 'NUMBER', 'pattern': '#,##0.00'}}},
            'fields': 'userEnteredFormat.numberFormat'
        }
    })
    
    sheets_api.spreadsheets().batchUpdate(spreadsheetId=SHEET_ID, body={'requests': reqs}).execute()
    
    # Overwrite formatting specifically for percentage
    ws_config.format('C4:C5', {'numberFormat': {'type': 'PERCENT', 'pattern': '0.00%'}})
    ws_config.format('C7', {'numberFormat': {'type': 'NUMBER', 'pattern': '#,##0'}})
    ws_config.format('G3:G4', {'numberFormat': {'type': 'CURRENCY', 'pattern': '#,##0\ "₫"'}})
    ws_config.format('G5:G6', {'numberFormat': {'type': 'PERCENT', 'pattern': '0.0%'}})

    # Set Telegram Checkbox Validation
    v_reqs = [{'setDataValidation': {'range': {'sheetId': ws_config.id, 'startRowIndex': 3, 'endRowIndex': 4, 'startColumnIndex': 10, 'endColumnIndex': 11}, 'rule': {'condition': {'type': 'BOOLEAN'}, 'showCustomUi': True}}}]
    sheets_api.spreadsheets().batchUpdate(spreadsheetId=SHEET_ID, body={'requests': v_reqs}).execute()

    # Stage-2 fee management: account/asset/date effective fee profile.
    ensure_fee_profile_sheet(sh, sheets_api)
    ensure_fee_charges_sheet(sh, sheets_api)
    apply_fee_profile_formulas(ws_journal)

    print("Rebuilt CONFIG, FEE_PROFILE, FEE_CHARGES and updated JOURNAL formulas successfully!")

if __name__ == '__main__':
    rebuild()
