"""Translate all English terminology to Vietnamese - Fixed"""
import os, sys, time
sys.path.insert(0, os.path.dirname(__file__))
from google.oauth2.credentials import Credentials as OAuthCreds
from googleapiclient.discovery import build
import gspread

TOKEN_PATH = os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(__file__))), 'credentials', 'token.json')
SHEET_ID = '1PdCmBoBQsznOx6JXvOlbD-atxQnX9wHRXiM127f109I'

def get_gc():
    creds = OAuthCreds.from_authorized_user_file(TOKEN_PATH, ['https://www.googleapis.com/auth/spreadsheets'])
    return gspread.authorize(creds), creds

def translate_to_vi():
    gc, creds = get_gc()
    sh = gc.open_by_key(SHEET_ID)
    sheets_api = build('sheets', 'v4', credentials=creds)

    print("1. Đổi tên các Sheet sang Tiếng Việt...")
    name_map = {
        "CONFIG": "CẤU HÌNH",
        "SETUP": "CÀI ĐẶT",
        "JOURNAL": "NHẬT KÝ",
        "FORMULAS": "CÔNG THỨC",
        "SUMMARY": "THỐNG KÊ"
    }
    
    for ws in sh.worksheets():
        old_title = ws.title
        if old_title in name_map:
            ws.update_title(name_map[old_title])
            print(f"  - {old_title} -> {name_map[old_title]}")

    time.sleep(1)
    
    print("2. Cập nhật Dropdown Trạng Thái (Win/Lose -> Thắng/Thua)...")
    ws_nk = sh.worksheet("NHẬT KÝ")
    nk_id = ws_nk.id
    reqs = []
    # Dropdown Cột A (Trạng thái)
    reqs.append({
        'setDataValidation': {
            'range': {'sheetId': nk_id, 'startRowIndex': 1, 'endRowIndex': 2000, 'startColumnIndex': 0, 'endColumnIndex': 1},
            'rule': {'condition': {'type': 'ONE_OF_LIST', 'values': [{'userEnteredValue': v} for v in ['Thắng', 'Thua', 'Hòa', 'Đang mở']]}, 'showCustomUi': True, 'strict': False}
        }
    })
    sheets_api.spreadsheets().batchUpdate(spreadsheetId=SHEET_ID, body={'requests': reqs}).execute()

    # Cập nhật Data sample
    try:
        val = ws_nk.acell('A2').value
        if val == "Win": ws_nk.update_acell('A2', "Thắng")
        if val == "Lose": ws_nk.update_acell('A2', "Thua")
        val3 = ws_nk.acell('A4').value
        if val3 == "Win": ws_nk.update_acell('A4', "Thắng")
        if val3 == "Lose": ws_nk.update_acell('A4', "Thua")
    except: pass

    print("3. Việt hóa Data trong CÀI ĐẶT...")
    try:
        ws_cd = sh.worksheet("CÀI ĐẶT")
        cells = ws_cd.range('F3:F20')
        for cell in cells:
            if cell.value and "Breakout" in cell.value: cell.value = "Phá nền"
            if cell.value and "Pullback" in cell.value: cell.value = "Hồi kỹ thuật"
            if cell.value and "Scalping" in cell.value: cell.value = "Lướt sóng T0"
        ws_cd.update_cells(cells)
        
        cells_ord = ws_cd.range('P3:P20')
        for cell in cells_ord:
            if cell.value and "Limit" in cell.value: cell.value = "Lệnh thường"
        ws_cd.update_cells(cells_ord)
    except Exception as e:
        print("Loi setup:", e)
    
    print("4. Cập nhật công thức THỐNG KÊ (Win/Lose -> Thắng/Thua)...")
    try:
        ws_tk = sh.worksheet("THỐNG KÊ")
        ws_tk.update_acell('A9', "Lệnh Thắng")
        ws_tk.update_acell('A10', "Lệnh Thua")
        ws_tk.update_acell('A18', "Trung bình Thắng")
        ws_tk.update_acell('A19', "Trung bình Thua")
        
        # Công thức
        ws_tk.update_acell('B9', '=COUNTIF(\'NHẬT KÝ\'!A2:A2000,"Thắng")')
        ws_tk.update_acell('B10', '=COUNTIF(\'NHẬT KÝ\'!A2:A2000,"Thua")')
        ws_tk.update_acell('B18', '=IFERROR(AVERAGEIF(\'NHẬT KÝ\'!A2:A2000,"Thắng",\'NHẬT KÝ\'!U2:U2000),0)')
        ws_tk.update_acell('B19', '=IFERROR(AVERAGEIF(\'NHẬT KÝ\'!A2:A2000,"Thua",\'NHẬT KÝ\'!U2:U2000),0)')
        ws_tk.update_acell('B20', '=IFERROR(SUMIF(\'NHẬT KÝ\'!A2:A2000,"Thắng",\'NHẬT KÝ\'!U2:U2000)/ABS(SUMIF(\'NHẬT KÝ\'!A2:A2000,"Thua",\'NHẬT KÝ\'!U2:U2000)),0)')
    except Exception as e:
        print("Loi update Thong ke:", e)

    print("Hoàn tất Việt hóa!")

if __name__ == '__main__':
    translate_to_vi()
