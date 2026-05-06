"""Patch missing items in SETUP"""
import os, sys
sys.path.insert(0, os.path.dirname(__file__))
from google.oauth2.credentials import Credentials as OAuthCreds
from googleapiclient.discovery import build
import gspread

TOKEN_PATH = os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(__file__))), 'credentials', 'token.json')
SHEET_ID = '1PdCmBoBQsznOx6JXvOlbD-atxQnX9wHRXiM127f109I'

def patch():
    creds = OAuthCreds.from_authorized_user_file(TOKEN_PATH, ['https://www.googleapis.com/auth/spreadsheets'])
    gc = gspread.authorize(creds)
    sh = gc.open_by_key(SHEET_ID)
    ws_setup = sh.worksheet("SETUP")

    # Add missing items manually at the bottom of the blocks
    ws_setup.update('U9:X10', [["Ăn cổ tức", "Dividend", "Nhận cổ tức", True], ["Theo tin tức", "News", "Đánh theo báo cáo", True]], value_input_option='USER_ENTERED')
    ws_setup.update('Z8:AC9', [["Thiếu kiên nhẫn", "Impatient", "Phá plan vì đợi lâu", True], ["Quá tự tin", "Overconfident", "Sai tỷ trọng", True]], value_input_option='USER_ENTERED')

    print("Patched SETUP missing items")

if __name__ == '__main__':
    patch()
