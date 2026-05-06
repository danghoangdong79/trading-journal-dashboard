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

SCOPES = [
    'https://www.googleapis.com/auth/spreadsheets',
    'https://www.googleapis.com/auth/drive'
]

CREDS_DIR = os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(__file__))), 'credentials')
TOKEN_PATH = os.path.join(CREDS_DIR, 'token.json')

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
    sa_email = "qhp-bot@gen-lang-client-0658622290.iam.gserviceaccount.com"
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

    # --- JOURNAL_LOG ---
    print("[3/6] Thiet lap JOURNAL_LOG...")
    ws_journal = sh.add_worksheet(title="JOURNAL_LOG", rows=1000, cols=34)
    headers = [col['label'] for col in schema['columns']]
    ws_journal.update([headers], 'A1')
    ws_journal.format('A1:AH1', {
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
        ('AG2:AG1000', tam_ly),
    ]
    for rng, opts in dropdowns:
        try:
            rule = gspread.worksheet.DataValidationRule(
                gspread.worksheet.BooleanCondition('ONE_OF_LIST', opts),
                showCustomUi=True, strict=False
            )
            ws_journal.set_data_validation(rng, rule)
        except Exception as e:
            print(f"  Warning dropdown {rng}: {e}")
    time.sleep(1)

    # --- SUMMARY ---
    print("[5/6] Thiet lap SUMMARY...")
    ws_summary = sh.add_worksheet(title="SUMMARY", rows=50, cols=10)
    summary = [
        ["📊 THỐNG KÊ TỔNG QUAN", "", ""],
        ["", "", ""],
        ["KPI", "Giá trị", "Ghi chú"],
        ["Vốn ban đầu", "=CONFIG!B2", "VNĐ"],
        ["Nạp tiền", "=CONFIG!B7", "VNĐ"],
        ["Rút tiền", "=CONFIG!B8", "VNĐ"],
        ["", "", ""],
        ["Tổng giao dịch", '=COUNTA(JOURNAL_LOG!D2:D1000)', ""],
        ["GD Thắng", '=COUNTIF(JOURNAL_LOG!B2:B1000,"*Win*")', ""],
        ["GD Thua", '=COUNTIF(JOURNAL_LOG!B2:B1000,"*Lose*")', ""],
        ["GD Hòa", '=COUNTIF(JOURNAL_LOG!B2:B1000,"*Hòa*")', ""],
        ["GD Đang mở", '=COUNTIF(JOURNAL_LOG!B2:B1000,"*Đang mở*")', ""],
        ["", "", ""],
        ["Tỷ lệ thắng", '=IFERROR(COUNTIF(JOURNAL_LOG!B2:B1000,"*Win*")/COUNTA(JOURNAL_LOG!D2:D1000),0)', "%"],
        ["Lãi/Lỗ Ròng", '=SUM(JOURNAL_LOG!AB2:AB1000)', "VNĐ"],
        ["Số dư hiện tại", '=CONFIG!B2+SUM(JOURNAL_LOG!AB2:AB1000)+CONFIG!B7-CONFIG!B8', "VNĐ"],
        ["", "", ""],
        ["Thắng TB", '=IFERROR(AVERAGEIF(JOURNAL_LOG!B2:B1000,"*Win*",JOURNAL_LOG!AB2:AB1000),0)', "VNĐ"],
        ["Thua TB", '=IFERROR(AVERAGEIF(JOURNAL_LOG!B2:B1000,"*Lose*",JOURNAL_LOG!AB2:AB1000),0)', "VNĐ"],
        ["RRR Trung bình", '=IFERROR(AVERAGE(JOURNAL_LOG!U2:U1000),0)', ""],
        ["Hệ số lợi nhuận", '=IFERROR(SUMIF(JOURNAL_LOG!B2:B1000,"*Win*",JOURNAL_LOG!AB2:AB1000)/ABS(SUMIF(JOURNAL_LOG!B2:B1000,"*Lose*",JOURNAL_LOG!AB2:AB1000)),0)', "Profit Factor"],
        ["Max Drawdown %", '=IFERROR(MIN(JOURNAL_LOG!AE2:AE1000),0)', "%"],
        ["Tổng phí GD", '=SUM(JOURNAL_LOG!Z2:Z1000)', "VNĐ"],
        ["Tổng thuế", '=SUM(JOURNAL_LOG!AA2:AA1000)', "VNĐ"],
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
    print(f"  Sheets: CONFIG | JOURNAL_LOG | SUMMARY")
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
