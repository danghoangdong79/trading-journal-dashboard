"""Fix So Ngay formula"""
import os, sys
sys.path.insert(0, os.path.dirname(__file__))
from google.oauth2.credentials import Credentials as OAuthCreds
from googleapiclient.discovery import build
import gspread

TOKEN_PATH = os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(__file__))), 'credentials', 'token.json')
SHEET_ID = '1PdCmBoBQsznOx6JXvOlbD-atxQnX9wHRXiM127f109I'

def fix_songay():
    creds = OAuthCreds.from_authorized_user_file(TOKEN_PATH, ['https://www.googleapis.com/auth/spreadsheets'])
    gc = gspread.authorize(creds)
    sh = gc.open_by_key(SHEET_ID)
    ws_nk = sh.worksheet("JOURNAL")
    
    # Update formula in L1
    f_songay = '={"Số Ngày"; ARRAYFORMULA(IF(D2:D="", "", IF(J2:J="", "", J2:J - H2:H)))}'
    ws_nk.update_acell('L1', f_songay)
    print("Fixed Số Ngày formula.")

if __name__ == '__main__':
    fix_songay()
