"""Đọc nội dung sheet ban đầu của khách hàng"""
import json, os
from google.oauth2.service_account import Credentials
import gspread

creds = Credentials.from_service_account_file(
    r'credentials\gen-lang-client-0658622290-67f651f4974d.json',
    scopes=['https://www.googleapis.com/auth/spreadsheets','https://www.googleapis.com/auth/drive']
)
gc = gspread.authorize(creds)

SHEET_ID = "1EwOGMCbYbwvrRoQy4AIp0UKexoFhWg7JGKhUYZnk7sA"

try:
    sh = gc.open_by_key(SHEET_ID)
    worksheets = sh.worksheets()
    
    output = {}
    for ws in worksheets:
        try:
            values = ws.get_all_values()
            output[ws.title] = values
        except Exception as e:
            output[ws.title] = f"Error: {e}"

    with open('customer_sheet.json', 'w', encoding='utf-8') as f:
        json.dump(output, f, ensure_ascii=False, indent=2)
    print("Doc thanh cong customer_sheet.json")

except Exception as e:
    print(f"Error accessing sheet: {e}")
