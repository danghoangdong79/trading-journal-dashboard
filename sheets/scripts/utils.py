"""
utils.py — Hàm tiện ích cho Google Sheets API
Xử lý authentication, formatting, và các helper functions
"""
import gspread
from google.oauth2.service_account import Credentials
import os
import json
from settings import CREDENTIALS_DIR, SCOPES, TEMPLATES_DIR

# ============================================================
# CONSTANTS
# ============================================================
CREDENTIALS_DIR = str(CREDENTIALS_DIR)
TEMPLATES_DIR = str(TEMPLATES_DIR)

# ============================================================
# AUTHENTICATION
# ============================================================
def get_credentials_path():
    """Tìm file Service Account credentials trong thư mục credentials/"""
    # Ưu tiên file gen-lang-client (Service Account)
    files = os.listdir(CREDENTIALS_DIR)
    for f in files:
        if f.startswith('gen-lang-client') and f.endswith('.json'):
            return os.path.join(CREDENTIALS_DIR, f)
    for f in files:
        if f.endswith('.json') and 'service_account' in json.load(open(os.path.join(CREDENTIALS_DIR, f), encoding='utf-8')).get('type', ''):
            return os.path.join(CREDENTIALS_DIR, f)
    raise FileNotFoundError(f"Không tìm thấy file credentials trong {CREDENTIALS_DIR}")


def get_gspread_client():
    """Tạo gspread client đã xác thực"""
    creds_path = get_credentials_path()
    creds = Credentials.from_service_account_file(creds_path, scopes=SCOPES)
    return gspread.authorize(creds)


def get_service_account_email():
    """Lấy email của Service Account"""
    creds_path = get_credentials_path()
    with open(creds_path, 'r') as f:
        return json.load(f)['client_email']


# ============================================================
# TEMPLATE LOADING
# ============================================================
def load_config():
    """Load cấu hình hệ thống từ config.json"""
    config_path = os.path.join(TEMPLATES_DIR, 'config.json')
    with open(config_path, 'r', encoding='utf-8') as f:
        return json.load(f)


def load_schema(schema_name):
    """Load schema từ file JSON (phai_sinh / co_phieu)"""
    schema_path = os.path.join(TEMPLATES_DIR, f'{schema_name}.json')
    with open(schema_path, 'r', encoding='utf-8') as f:
        return json.load(f)


# ============================================================
# FORMATTING HELPERS
# ============================================================
def format_vnd(amount):
    """Format số tiền VNĐ: 1234567 → '1.234.567'"""
    if amount is None or amount == '':
        return ''
    try:
        return f"{int(amount):,.0f}".replace(',', '.')
    except (ValueError, TypeError):
        return str(amount)


def parse_vnd(text):
    """Parse chuỗi VNĐ: '1.234.567' → 1234567"""
    if not text or text.strip() == '':
        return 0
    return int(str(text).replace('.', '').replace(',', '').replace('VNĐ', '').replace(' ', ''))


def col_letter_to_index(letter):
    """Convert column letter to 0-based index: 'A' → 0, 'AA' → 26"""
    result = 0
    for char in letter.upper():
        result = result * 26 + (ord(char) - ord('A') + 1)
    return result - 1


def col_index_to_letter(index):
    """Convert 0-based index to column letter: 0 → 'A', 26 → 'AA'"""
    result = ''
    index += 1
    while index > 0:
        index, remainder = divmod(index - 1, 26)
        result = chr(65 + remainder) + result
    return result


# ============================================================
# DATA VALIDATION
# ============================================================
def validate_trade_data(data, market_type='phai_sinh'):
    """
    Validate dữ liệu giao dịch trước khi ghi vào sheet.
    Returns: (is_valid: bool, errors: list)
    """
    errors = []
    config = load_config()

    # Required fields
    required = ['ma_gd', 'vi_the', 'ngay_gio_vao', 'khoi_luong', 'gia_vao']
    for field in required:
        if field not in data or not data[field]:
            errors.append(f"Thiếu trường bắt buộc: {field}")

    # Validate vị thế
    if market_type == 'phai_sinh':
        valid_positions = config['phai_sinh']['vi_the_options']
    else:
        valid_positions = config['co_phieu']['vi_the_options']

    if data.get('vi_the') and data['vi_the'] not in valid_positions:
        errors.append(f"Vị thế không hợp lệ: {data['vi_the']}. Chấp nhận: {valid_positions}")

    # Validate khối lượng
    if data.get('khoi_luong'):
        try:
            kl = int(data['khoi_luong'])
            if kl <= 0:
                errors.append("Khối lượng phải > 0")
            if market_type == 'co_phieu' and kl % 100 != 0:
                errors.append("Số lượng cổ phiếu phải là bội số của 100 (trên HOSE)")
        except ValueError:
            errors.append(f"Khối lượng không hợp lệ: {data['khoi_luong']}")

    # Validate giá
    for price_field in ['gia_vao', 'cat_lo', 'chot_loi', 'gia_dong']:
        if data.get(price_field):
            try:
                price = float(data[price_field])
                if price <= 0:
                    errors.append(f"{price_field} phải > 0")
            except ValueError:
                errors.append(f"{price_field} không hợp lệ: {data[price_field]}")

    return (len(errors) == 0, errors)


if __name__ == '__main__':
    # Quick test
    print("Service Account:", get_service_account_email())
    print("Config loaded:", bool(load_config()))
    print("format_vnd(1234567):", format_vnd(1234567))
    print("parse_vnd('1.234.567'):", parse_vnd('1.234.567'))
    print("col_letter_to_index('AH'):", col_letter_to_index('AH'))
