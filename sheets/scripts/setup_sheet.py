"""
setup_sheet.py — Tạo Google Sheet trên Drive cá nhân của anh qua OAuth
Lần đầu chạy sẽ mở trình duyệt để anh đăng nhập & cấp quyền.
"""
import sys, os, time, json
sys.path.insert(0, os.path.dirname(__file__))

from google_auth_oauthlib.flow import InstalledAppFlow
from google.auth.transport.requests import Request
from google.oauth2.credentials import Credentials as OAuthCreds
from googleapiclient.discovery import build
import gspread
from settings import CREDENTIALS_DIR, SCOPES, SERVICE_ACCOUNT_EMAIL, TOKEN_PATH
from fee_profile import ensure_fee_profile_sheet, ensure_fee_charges_sheet, apply_fee_profile_formulas

CREDS_DIR = str(CREDENTIALS_DIR)
TOKEN_PATH = str(TOKEN_PATH)

def get_oauth_client_secret():
    for f in os.listdir(CREDS_DIR):
        if f.startswith('client_secret') and f.endswith('.json'):
            return os.path.join(CREDS_DIR, f)
    raise FileNotFoundError("Khong tim thay client_secret*.json")

def get_user_credentials():
    """OAuth flow - lần đầu mở browser, sau đó dùng token đã lưu"""
    creds = None
    if os.path.exists(TOKEN_PATH):
        creds = OAuthCreds.from_authorized_user_file(TOKEN_PATH, SCOPES)
    if not creds or not creds.valid:
        if creds and creds.expired and creds.refresh_token:
            creds.refresh(Request())
        else:
            flow = InstalledAppFlow.from_client_secrets_file(get_oauth_client_secret(), SCOPES)
            creds = flow.run_local_server(port=0)
        with open(TOKEN_PATH, 'w') as f:
            f.write(creds.to_json())
        print(f"  Token saved to {TOKEN_PATH}")
    return creds

def load_config():
    p = os.path.join(os.path.dirname(__file__), '..', 'templates', 'config.json')
    with open(p, 'r', encoding='utf-8') as f:
        return json.load(f)

def load_schema():
    p = os.path.join(os.path.dirname(__file__), '..', 'templates', 'phai_sinh.json')
    with open(p, 'r', encoding='utf-8') as f:
        return json.load(f)


def col_to_index(col):
    result = 0
    for char in col.upper():
        result = result * 26 + ord(char) - ord('A') + 1
    return result - 1


def a1_range_to_grid_range(sheet_id, a1_range):
    start, end = a1_range.split(':')
    start_col = ''.join(ch for ch in start if ch.isalpha())
    start_row = ''.join(ch for ch in start if ch.isdigit())
    end_col = ''.join(ch for ch in end if ch.isalpha())
    end_row = ''.join(ch for ch in end if ch.isdigit())
    return {
        'sheetId': sheet_id,
        'startRowIndex': int(start_row) - 1,
        'endRowIndex': int(end_row),
        'startColumnIndex': col_to_index(start_col),
        'endColumnIndex': col_to_index(end_col) + 1,
    }

def setup_trading_journal(client_name="KhangHang1 VIP", initial_capital=200000000):
    print("[0/6] Xac thuc OAuth (Drive ca nhan)...")
    creds = get_user_credentials()
    gc = gspread.authorize(creds)
    config = load_config()
    schema = load_schema()

    # --- Tao sheet moi tren Drive ca nhan ---
    title = f"📊 Nhật Ký GD — {client_name}"
    print(f"[1/6] Tao spreadsheet: {title}")
    sh = gc.create(title)

    # Share cho service account de n8n co the truy cap
    sa_email = SERVICE_ACCOUNT_EMAIL
    sh.share(sa_email, perm_type='user', role='writer')
    print(f"  Shared for SA: {sa_email}")

    # --- CONFIG ---
    print("[2/6] Thiet lap CONFIG...")
    ws_config = sh.sheet1
    ws_config.update_title("CONFIG")
    config_data = [
        ["Tham số", "Giá trị", "Mô tả"],
        ["Vốn ban đầu", initial_capital, "VNĐ"],
        ["Phí CP (%)", 0.0015, "0.15% giá trị giao dịch"],
        ["Thuế bán CP (%)", 0.001, "0.1% giá trị bán"],
        ["Phí PS / HĐ / chiều", 7700, "VNĐ"],
        ["Giá trị 1 điểm PS", 100000, "VNĐ"],
        ["Nạp tiền", 0, "Tổng tiền nạp thêm"],
        ["Rút tiền", 0, "Tổng tiền đã rút"],
        ["Tên khách hàng", client_name, ""],
        ["Ngày tạo", "=TODAY()", ""],
    ]
    ws_config.update(config_data, 'A1')
    ws_config.format('A1:C1', {
        "backgroundColor": {"red": 0.1, "green": 0.1, "blue": 0.2},
        "textFormat": {"bold": True, "foregroundColor": {"red": 1, "green": 1, "blue": 1}},
        "horizontalAlignment": "CENTER"
    })
    time.sleep(1)

    print("[2.5/6] Thiet lap FEE_PROFILE...")
    sheets_api = build('sheets', 'v4', credentials=creds)
    ensure_fee_profile_sheet(sh, sheets_api)
    ensure_fee_charges_sheet(sh, sheets_api)
    time.sleep(1)

    # --- JOURNAL ---
    print("[3/6] Thiet lap JOURNAL...")
    ws_journal = sh.add_worksheet(title="JOURNAL", rows=1000, cols=24)
    headers = [col['label'] for col in schema['columns']]
    ws_journal.update([headers], 'A1')
    ws_journal.format('A1:X1', {
        "backgroundColor": {"red": 0.04, "green": 0.055, "blue": 0.09},
        "textFormat": {"bold": True, "fontSize": 10, "foregroundColor": {"red": 0.976, "green": 0.976, "blue": 0.976}},
        "horizontalAlignment": "CENTER",
        "borders": {"bottom": {"style": "SOLID", "color": {"red": 0.23, "green": 0.51, "blue": 0.96}}}
    })
    ws_journal.freeze(rows=1)
    time.sleep(1)

    # --- DROPDOWNS ---
    print("[4/6] Thiet lap Dropdowns...")
    trang_thai = [o['icon'] + ' ' + o['value'] for o in config['trang_thai_options']]
    tam_ly = [o['icon'] + ' ' + o['value'] for o in config['tam_ly_options']]
    dropdowns = [
        ('B2:B1000', trang_thai),
        ('C2:C1000', ['Phái sinh', 'Cổ phiếu']),
        ('E2:E1000', config['chien_luoc_options']),
        ('F2:F1000', ['Long', 'Short', 'Mua', 'Bán']),
        ('G2:G1000', ['ATO', 'Sáng', 'Chiều', 'ATC']),
        ('V2:V1000', tam_ly),
    ]
    validation_requests = []
    for rng, opts in dropdowns:
        validation_requests.append({
            'setDataValidation': {
                'range': a1_range_to_grid_range(ws_journal.id, rng),
                'rule': {
                    'condition': {
                        'type': 'ONE_OF_LIST',
                        'values': [{'userEnteredValue': str(opt)} for opt in opts]
                    },
                    'showCustomUi': True,
                    'strict': False
                }
            }
        })
    if validation_requests:
        sheets_api.spreadsheets().batchUpdate(
            spreadsheetId=sh.id,
            body={'requests': validation_requests}
        ).execute()
    apply_fee_profile_formulas(ws_journal)
    time.sleep(1)

    # --- SUMMARY ---
    print("[5/6] Thiet lap SUMMARY...")
    ws_summary = sh.add_worksheet(title="SUMMARY", rows=50, cols=26)
    summary = [
        ["📊 THỐNG KÊ TỔNG QUAN", "", ""],
        ["", "", ""],
        ["KPI", "Giá trị", "Ghi chú"],
        ["Vốn ban đầu", "=CONFIG!B3", "VNĐ"],
        ["Nạp tiền", "=CONFIG!B7", "VNĐ"],
        ["Rút tiền", "=CONFIG!B8", "VNĐ"],
        ["", "", ""],
        ["Tổng giao dịch", '=COUNTA(JOURNAL!D2:D1000)', ""],
        ["GD Thắng", '=COUNTIF(JOURNAL!A2:A1000,"*Thắng*")', ""],
        ["GD Thua", '=COUNTIF(JOURNAL!A2:A1000,"*Thua*")', ""],
        ["GD Hòa", '=COUNTIF(JOURNAL!A2:A1000,"*Hòa*")', ""],
        ["GD Đang mở", '=COUNTIF(JOURNAL!A2:A1000,"*Đang mở*")', ""],
        ["", "", ""],
        ["Tỷ lệ thắng", '=IFERROR(COUNTIF(JOURNAL!A2:A1000,"Thắng")/COUNTIFS(JOURNAL!D2:D1000,"<>",JOURNAL!A2:A1000,"<>Đang mở"),0)', "%"],
        ["Lãi/Lỗ Ròng", '=SUM(JOURNAL!U2:U1000)', "VNĐ"],
        ["Số dư hiện tại", '=CONFIG!B3+SUM(JOURNAL!U2:U1000)+CONFIG!B7-CONFIG!B8', "VNĐ"],
        ["", "", ""],
        ["Thắng TB", '=IFERROR(AVERAGEIF(JOURNAL!A2:A1000,"Thắng",JOURNAL!U2:U1000),0)', "VNĐ"],
        ["Thua TB", '=IFERROR(AVERAGEIF(JOURNAL!A2:A1000,"Thua",JOURNAL!U2:U1000),0)', "VNĐ"],
        ["RRR Trung bình", '=IFERROR(AVERAGE(JOURNAL!U2:U1000),0)', ""],
        ["Hệ số lợi nhuận", '=IFERROR(SUMIF(JOURNAL!A2:A1000,"Thắng",JOURNAL!U2:U1000)/ABS(SUMIF(JOURNAL!A2:A1000,"Thua",JOURNAL!U2:U1000)),0)', "Profit Factor"],
        ["Max Drawdown %", '=IFERROR(MIN(JOURNAL!U2:U1000),0)', "%"],
        ["Tổng phí GD", '=SUM(JOURNAL!T2:T1000)', "VNĐ"],
        ["Tổng thuế", '=0', "VNĐ"],
    ]
    ws_summary.update(summary, 'A1')
    ws_summary.format('A1', {"textFormat": {"bold": True, "fontSize": 14, "foregroundColor": {"red": 0.23, "green": 0.51, "blue": 0.96}}})
    ws_summary.format('A3:C3', {
        "backgroundColor": {"red": 0.1, "green": 0.1, "blue": 0.2},
        "textFormat": {"bold": True, "foregroundColor": {"red": 1, "green": 1, "blue": 1}},
        "horizontalAlignment": "CENTER"
    })

    # --- DONE ---
    print(f"\n{'='*60}")
    print(f"  TAO THANH CONG!")
    print(f"  URL: {sh.url}")
    print(f"  Sheets: CONFIG | FEE_PROFILE | FEE_CHARGES | JOURNAL | SUMMARY")
    print(f"  Von: {initial_capital:,.0f} VND")
    print(f"  SA access: {sa_email}")
    print(f"{'='*60}")
    return sh.url

if __name__ == '__main__':
    import argparse
    parser = argparse.ArgumentParser()
    parser.add_argument('--name', default='KhangHang1 VIP')
    parser.add_argument('--capital', type=int, default=200000000)
    args = parser.parse_args()
    setup_trading_journal(args.name, args.capital)
