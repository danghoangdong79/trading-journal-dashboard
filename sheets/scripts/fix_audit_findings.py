"""Fix minor audit findings: add PLO and Do dự"""
import os, sys
sys.path.insert(0, os.path.dirname(__file__))
from settings import SHEET_ID as CONFIGURED_SHEET_ID, TOKEN_PATH as CONFIGURED_TOKEN_PATH
from google.oauth2.credentials import Credentials as OAuthCreds
from googleapiclient.discovery import build
import gspread

TOKEN_PATH = str(CONFIGURED_TOKEN_PATH)
SHEET_ID = CONFIGURED_SHEET_ID

def fix():
    creds = OAuthCreds.from_authorized_user_file(TOKEN_PATH, ['https://www.googleapis.com/auth/spreadsheets'])
    gc = gspread.authorize(creds)
    sh = gc.open_by_key(SHEET_ID)
    ws_setup = sh.worksheet("SETUP")

    # Add PLO to LOẠI LỆNH (Block starts at AE col=30)
    ws_setup.update(values=[["PLO", "PLO", "Sau giờ", True]], range_name='AE9:AH9', value_input_option='USER_ENTERED')
    
    # Add Do dự to TÂM LÝ (Block starts at Z col=25)
    ws_setup.update(values=[["Do dự", "Hesitation", "Trễ nhịp thị trường", True]], range_name='Z10:AC10', value_input_option='USER_ENTERED')

    print("Fixed: Added PLO and Do dự to SETUP")

if __name__ == '__main__':
    fix()
