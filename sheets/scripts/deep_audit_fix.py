"""Deep Audit and Fix Logic & Formats - Fixed names"""
import os, sys, time
sys.path.insert(0, os.path.dirname(__file__))
from settings import SHEET_ID as CONFIGURED_SHEET_ID, TOKEN_PATH as CONFIGURED_TOKEN_PATH
from google.oauth2.credentials import Credentials as OAuthCreds
from googleapiclient.discovery import build
import gspread
from fee_profile import ensure_fee_profile_sheet, ensure_fee_charges_sheet, apply_fee_profile_formulas

TOKEN_PATH = str(CONFIGURED_TOKEN_PATH)
SHEET_ID = CONFIGURED_SHEET_ID

def get_gc():
    creds = OAuthCreds.from_authorized_user_file(TOKEN_PATH, ['https://www.googleapis.com/auth/spreadsheets'])
    return gspread.authorize(creds), creds

def deep_audit():
    gc, creds = get_gc()
    sh = gc.open_by_key(SHEET_ID)
    sheets_api = build('sheets', 'v4', credentials=creds)

    print("1. Audit CONFIG...")
    ws_cfg = sh.worksheet("CONFIG")
    
    cfg_data = [
        ["THÔNG SỐ", "GIÁ TRỊ"],
        ["", ""],
        ["THỊ TRƯỜNG CỔ PHIẾU", ""],
        ["Hệ số nhân Cổ Phiếu (VND)", 1000],
        ["Thuế Bán Cổ Phiếu (%)", 0.001],
        ["Phí Mua Cổ Phiếu (%)", 0.0015],
        ["Phí Bán Cổ Phiếu (%)", 0.0015],
        ["", ""],
        ["THỊ TRƯỜNG PHÁI SINH", ""],
        ["Hệ số nhân Phái Sinh (VND)", 100000],
        ["Phí PS dự phòng / HĐ / Chiều (VND)", 5250]
    ]
    ws_cfg.batch_clear(["A1:B20"])
    ws_cfg.update(values=cfg_data, range_name='A1', value_input_option='USER_ENTERED')
    ws_cfg.format('A4:B7', {"numberFormat": {"type": "PERCENT"}})
    ws_cfg.format('B4', {"numberFormat": {"type": "NUMBER"}})
    ws_cfg.format('B10:B11', {"numberFormat": {"type": "NUMBER"}})
    ensure_fee_profile_sheet(sh, sheets_api)
    ensure_fee_charges_sheet(sh, sheets_api)

    print("2. Audit & Fix ArrayFormulas trong JOURNAL...")
    ws_nk = sh.worksheet("JOURNAL")
    
    # Biên độ = O - N (Long/Mua) hoặc N - O (Short/Bán)
    f_biendo = '={"Biên Độ"; ARRAYFORMULA(IF(A2:A="", "", IF(O2:O="", "", IF(REGEXMATCH(UPPER(E2:E), "MUA|LONG"), O2:O-N2:N, N2:N-O2:O))))}'
    
    # Số Ngày
    f_songay = '={"Số Ngày"; ARRAYFORMULA(IF(A2:A="", "", IF(J2:J="", "Đang mở", J2:J - H2:H)))}'
    
    ws_nk.update_acell('L1', f_songay)
    ws_nk.update_acell('R1', f_biendo)
    apply_fee_profile_formulas(ws_nk)

    print("3. Audit Format & Data Sample...")
    try:
        ws_nk.update_acell('E2', 'SHORT')
        ws_nk.update_acell('E3', 'LONG')
        ws_nk.update_acell('E4', 'SHORT')
        ws_nk.update_acell('E5', 'LONG')
        ws_nk.update_acell('A5', 'Đang mở')
    except: pass
    
    val_vithe = {'setDataValidation': {'range': {'sheetId': ws_nk.id, 'startRowIndex': 1, 'endRowIndex': 2000, 'startColumnIndex': 4, 'endColumnIndex': 5}, 'rule': {'condition': {'type': 'ONE_OF_LIST', 'values': [{'userEnteredValue': v} for v in ['LONG', 'SHORT', 'Mua', 'Bán']]}, 'showCustomUi': True, 'strict': False}}}
    sheets_api.spreadsheets().batchUpdate(spreadsheetId=SHEET_ID, body={'requests': [val_vithe]}).execute()
    
    print("4. Tính Auto-Status theo Lãi Ròng...")
    f_trangthai = '={"Trạng Thái"; ARRAYFORMULA(IF(D2:D="", "", IF(O2:O="", "Đang mở", IF(U2:U>0, "Thắng", IF(U2:U<0, "Thua", "Hòa")))))}'
    ws_nk.update_acell('A1', f_trangthai)
    ws_nk.batch_clear(["A2:A2000"])
    
    clear_a_req = {'setDataValidation': {'range': {'sheetId': ws_nk.id, 'startRowIndex': 1, 'endRowIndex': 2000, 'startColumnIndex': 0, 'endColumnIndex': 1}, 'rule': None}}
    sheets_api.spreadsheets().batchUpdate(spreadsheetId=SHEET_ID, body={'requests': [clear_a_req]}).execute()

    reqs_fmt = [
        {'repeatCell': {'range': {'sheetId': ws_nk.id, 'startRowIndex': 1, 'endRowIndex': 2000, 'startColumnIndex': 18, 'endColumnIndex': 21}, 'cell': {'userEnteredFormat': {'numberFormat': {'type': 'NUMBER', 'pattern': '#,##0'}}}, 'fields': 'userEnteredFormat.numberFormat'}},
        {'repeatCell': {'range': {'sheetId': ws_nk.id, 'startRowIndex': 1, 'endRowIndex': 2000, 'startColumnIndex': 13, 'endColumnIndex': 17}, 'cell': {'userEnteredFormat': {'numberFormat': {'type': 'NUMBER', 'pattern': '#,##0.00'}}}, 'fields': 'userEnteredFormat.numberFormat'}}
    ]
    sheets_api.spreadsheets().batchUpdate(spreadsheetId=SHEET_ID, body={'requests': reqs_fmt}).execute()

    print("Hoàn tất Deep Audit & Standardization!")

if __name__ == '__main__':
    deep_audit()
