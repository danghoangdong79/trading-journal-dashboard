"""Patch missing items in SETUP"""
import os, sys
sys.path.insert(0, os.path.dirname(__file__))
from settings import SHEET_ID as CONFIGURED_SHEET_ID, TOKEN_PATH as CONFIGURED_TOKEN_PATH
from google.oauth2.credentials import Credentials as OAuthCreds
from googleapiclient.discovery import build
import gspread

TOKEN_PATH = str(CONFIGURED_TOKEN_PATH)
SHEET_ID = CONFIGURED_SHEET_ID

def patch():
    creds = OAuthCreds.from_authorized_user_file(TOKEN_PATH, ['https://www.googleapis.com/auth/spreadsheets'])
    gc = gspread.authorize(creds)
    sh = gc.open_by_key(SHEET_ID)
    ws_setup = sh.worksheet("SETUP")

    # Add missing items manually at the bottom of the blocks
    ws_setup.update(values=[["Ăn cổ tức", "Dividend", "Nhận cổ tức", True], ["Theo tin tức", "News", "Đánh theo báo cáo", True]], range_name='U9:X10', value_input_option='USER_ENTERED')
    ws_setup.update(values=[["Thiếu kiên nhẫn", "Impatient", "Phá plan vì đợi lâu", True], ["Quá tự tin", "Overconfident", "Sai tỷ trọng", True]], range_name='Z8:AC9', value_input_option='USER_ENTERED')

    print("Patched SETUP missing items")

if __name__ == '__main__':
    patch()
