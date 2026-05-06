"""Update Setup with rich stock list and new columns"""
import os, sys
sys.path.insert(0, os.path.dirname(__file__))
from google.oauth2.credentials import Credentials as OAuthCreds
from googleapiclient.discovery import build
import gspread

TOKEN_PATH = os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(__file__))), 'credentials', 'token.json')
SHEET_ID = '1PdCmBoBQsznOx6JXvOlbD-atxQnX9wHRXiM127f109I'

def update_rich_stocks():
    creds = OAuthCreds.from_authorized_user_file(TOKEN_PATH, ['https://www.googleapis.com/auth/spreadsheets'])
    gc = gspread.authorize(creds)
    sh = gc.open_by_key(SHEET_ID)
    sheets_api = build('sheets', 'v4', credentials=creds)
    
    ws_setup = sh.worksheet("SETUP")
    ws_formulas = sh.worksheet("FORMULAS")

    # Full list of stocks
    stocks_data = [
        # Ngân hàng (Banks)
        ["VCB", "Vietcombank", "Ngân hàng", "HOSE", True],
        ["BID", "BIDV", "Ngân hàng", "HOSE", True],
        ["CTG", "VietinBank", "Ngân hàng", "HOSE", True],
        ["TCB", "Techcombank", "Ngân hàng", "HOSE", True],
        ["VPB", "VPBank", "Ngân hàng", "HOSE", True],
        ["MBB", "MB Bank", "Ngân hàng", "HOSE", True],
        ["ACB", "ACB", "Ngân hàng", "HOSE", True],
        ["STB", "Sacombank", "Ngân hàng", "HOSE", True],
        ["HDB", "HDBank", "Ngân hàng", "HOSE", True],
        ["VIB", "VIB", "Ngân hàng", "HOSE", True],
        ["TPB", "TPBank", "Ngân hàng", "HOSE", True],
        ["SHB", "SHB", "Ngân hàng", "HOSE", True],
        ["LPB", "LPBank", "Ngân hàng", "HOSE", True],
        ["EIB", "Eximbank", "Ngân hàng", "HOSE", True],
        # Bất động sản (Real Estate)
        ["VHM", "Vinhomes", "Bất động sản", "HOSE", True],
        ["VIC", "Vingroup", "Bất động sản", "HOSE", True],
        ["VRE", "Vincom Retail", "Bất động sản", "HOSE", True],
        ["KDH", "Khang Điền", "Bất động sản", "HOSE", True],
        ["NLG", "Nam Long", "Bất động sản", "HOSE", True],
        ["DIG", "DIC Corp", "Bất động sản", "HOSE", True],
        ["DXG", "Đất Xanh", "Bất động sản", "HOSE", True],
        ["PDR", "Phát Đạt", "Bất động sản", "HOSE", True],
        ["NVL", "Novaland", "Bất động sản", "HOSE", True],
        ["CEO", "C.E.O", "Bất động sản", "HNX", True],
        ["KBC", "Kinh Bắc", "BĐS Khu công nghiệp", "HOSE", True],
        ["IDC", "Idico", "BĐS Khu công nghiệp", "HNX", True],
        ["SZC", "Sonadezi Châu Đức", "BĐS Khu công nghiệp", "HOSE", True],
        # Chứng khoán (Securities)
        ["SSI", "SSI", "Chứng khoán", "HOSE", True],
        ["VND", "VNDirect", "Chứng khoán", "HOSE", True],
        ["VCI", "Vietcap", "Chứng khoán", "HOSE", True],
        ["HCM", "HSC", "Chứng khoán", "HOSE", True],
        ["SHS", "SHS", "Chứng khoán", "HNX", True],
        ["MBS", "MBS", "Chứng khoán", "HNX", True],
        ["VIX", "VIX", "Chứng khoán", "HOSE", True],
        ["FTS", "FPT Securities", "Chứng khoán", "HOSE", True],
        # Thép & VLXD (Steel & Materials)
        ["HPG", "Hòa Phát", "Thép", "HOSE", True],
        ["HSG", "Hoa Sen", "Thép", "HOSE", True],
        ["NKG", "Nam Kim", "Thép", "HOSE", True],
        ["HT1", "Hà Tiên 1", "VLXD", "HOSE", True],
        # Bán lẻ (Retail)
        ["MWG", "Thế Giới Di Động", "Bán lẻ", "HOSE", True],
        ["PNJ", "Vàng bạc Phú Nhuận", "Bán lẻ", "HOSE", True],
        ["FRT", "FPT Retail", "Bán lẻ", "HOSE", True],
        ["DGW", "Digiworld", "Bán lẻ", "HOSE", True],
        # Công nghệ (Tech)
        ["FPT", "FPT", "Công nghệ", "HOSE", True],
        ["CMG", "CMC", "Công nghệ", "HOSE", True],
        # Thực phẩm (Food)
        ["VNM", "Vinamilk", "Thực phẩm", "HOSE", True],
        ["MSN", "Masan", "Thực phẩm", "HOSE", True],
        ["SAB", "Sabeco", "Thực phẩm", "HOSE", True],
        ["DBC", "Dabaco", "Thực phẩm", "HOSE", True],
        # Năng lượng & Dầu khí (Energy & Oil)
        ["GAS", "PV Gas", "Dầu khí", "HOSE", True],
        ["PLX", "Petrolimex", "Dầu khí", "HOSE", True],
        ["POW", "PV Power", "Năng lượng", "HOSE", True],
        ["PVD", "PV Drilling", "Dầu khí", "HOSE", True],
        ["PVS", "PTSC", "Dầu khí", "HNX", True],
        ["BSR", "Lọc hóa dầu Bình Sơn", "Dầu khí", "UPCOM", True],
        # Hóa chất & Khác
        ["DGC", "Hóa chất Đức Giang", "Hóa chất", "HOSE", True],
        ["DCM", "Đạm Cà Mau", "Phân bón", "HOSE", True],
        ["DPM", "Đạm Phú Mỹ", "Phân bón", "HOSE", True],
        ["GVR", "Tập đoàn Công nghiệp Cao su", "Hóa chất/KCN", "HOSE", True],
        ["VHC", "Vĩnh Hoàn", "Thủy sản", "HOSE", True],
        ["ANV", "Nam Việt", "Thủy sản", "HOSE", True],
        ["REE", "Cơ điện lạnh", "Đa ngành", "HOSE", True],
        ["GEX", "Gelex", "Đa ngành", "HOSE", True],
        ["VJC", "Vietjet", "Hàng không", "HOSE", True],
        ["HVN", "Vietnam Airlines", "Hàng không", "HOSE", True]
    ]

    # Update Headers in SETUP
    ws_setup.update('A2:E2', [["Mã", "Tên Công Ty", "Nhóm/Ngành", "Sàn", "Bật"]], value_input_option='USER_ENTERED')
    
    # Clear old stocks
    ws_setup.batch_clear(["A3:E500"])
    
    # Insert new rich stock list
    ws_setup.update('A3:E' + str(2 + len(stocks_data)), stocks_data, value_input_option='USER_ENTERED')
    
    # Update Data validation (checkbox) for column E
    reqs = []
    # Clear old validation in D
    reqs.append({'setDataValidation': {'range': {'sheetId': ws_setup.id, 'startRowIndex': 2, 'endRowIndex': 500, 'startColumnIndex': 3, 'endColumnIndex': 4}, 'rule': None}})
    # Set validation in E
    reqs.append({'setDataValidation': {'range': {'sheetId': ws_setup.id, 'startRowIndex': 2, 'endRowIndex': 500, 'startColumnIndex': 4, 'endColumnIndex': 5}, 'rule': {'condition': {'type': 'BOOLEAN'}, 'showCustomUi': True}}})
    
    sheets_api.spreadsheets().batchUpdate(spreadsheetId=SHEET_ID, body={'requests': reqs}).execute()

    # Update FORMULAS references
    # Cổ phiếu filter now checks column E
    ws_formulas.update_acell('A2', '=FILTER(SETUP!A3:A, SETUP!E3:E=TRUE)')

    print(f"Updated SETUP with {len(stocks_data)} stocks successfully!")

if __name__ == '__main__':
    update_rich_stocks()
