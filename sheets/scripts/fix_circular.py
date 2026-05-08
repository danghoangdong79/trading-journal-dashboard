"""Fix circular dependency in ArrayFormulas"""
import os, sys, time
sys.path.insert(0, os.path.dirname(__file__))
from settings import SHEET_ID as CONFIGURED_SHEET_ID, TOKEN_PATH as CONFIGURED_TOKEN_PATH
from google.oauth2.credentials import Credentials as OAuthCreds
from googleapiclient.discovery import build
import gspread
from fee_profile import apply_fee_profile_formulas

TOKEN_PATH = str(CONFIGURED_TOKEN_PATH)
SHEET_ID = CONFIGURED_SHEET_ID

def get_gc():
    creds = OAuthCreds.from_authorized_user_file(TOKEN_PATH, ['https://www.googleapis.com/auth/spreadsheets'])
    return gspread.authorize(creds), creds

def fix_circular():
    gc, creds = get_gc()
    sh = gc.open_by_key(SHEET_ID)
    
    print("Fixing circular dependency in JOURNAL...")
    ws_nk = sh.worksheet("JOURNAL")
    
    # Biên độ = O - N (Long/Mua) hoặc N - O (Short/Bán) -> Change A2:A="" to D2:D=""
    f_biendo = '={"Biên Độ"; ARRAYFORMULA(IF(D2:D="", "", IF(O2:O="", "", IF(REGEXMATCH(UPPER(E2:E), "MUA|LONG"), O2:O-N2:N, N2:N-O2:O))))}'
    
    # Số Ngày -> Change A2:A="" to D2:D=""
    f_songay = '={"Số Ngày"; ARRAYFORMULA(IF(D2:D="", "", IF(J2:J="", "Đang mở", J2:J - H2:H)))}'
    
    ws_nk.update_acell('L1', f_songay)
    ws_nk.update_acell('R1', f_biendo)
    apply_fee_profile_formulas(ws_nk)

    print("Circular dependency fixed!")

if __name__ == '__main__':
    fix_circular()
