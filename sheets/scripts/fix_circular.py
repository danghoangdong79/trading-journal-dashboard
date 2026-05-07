"""Fix circular dependency in ArrayFormulas"""
import os, sys, time
sys.path.insert(0, os.path.dirname(__file__))
from settings import SHEET_ID as CONFIGURED_SHEET_ID, TOKEN_PATH as CONFIGURED_TOKEN_PATH
from google.oauth2.credentials import Credentials as OAuthCreds
from googleapiclient.discovery import build
import gspread

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
    
    # Lãi Gộp -> Change A2:A="" to D2:D=""
    f_laigop = '={"Lãi/Lỗ Gộp"; ARRAYFORMULA(IF(D2:D="", "", IF(O2:O="", "", R2:R * M2:M * IF(C2:C="Phái sinh", CONFIG!$B$10, CONFIG!$B$4))))}'
    
    # Phí Thuế -> Change A2:A="" to D2:D=""
    f_phithue = '={"Phí & Thuế"; ARRAYFORMULA(IF(D2:D="", "", IF(O2:O="", "", IF(C2:C="Phái sinh", M2:M*CONFIG!$B$11*2, (N2:N*M2:M*CONFIG!$B$4*CONFIG!$B$6) + (O2:O*M2:M*CONFIG!$B$4*(CONFIG!$B$7+CONFIG!$B$5))))))}'
    
    # Lãi Ròng -> Change A2:A="" to D2:D=""
    f_lairong = '={"Lãi/Lỗ Ròng"; ARRAYFORMULA(IF(D2:D="", "", IF(O2:O="", "", S2:S - T2:T)))}'
    
    # Số Ngày -> Change A2:A="" to D2:D=""
    f_songay = '={"Số Ngày"; ARRAYFORMULA(IF(D2:D="", "", IF(J2:J="", "Đang mở", J2:J - H2:H)))}'
    
    ws_nk.update_acell('L1', f_songay)
    ws_nk.update_acell('R1', f_biendo)
    ws_nk.update_acell('S1', f_laigop)
    ws_nk.update_acell('T1', f_phithue)
    ws_nk.update_acell('U1', f_lairong)

    print("Circular dependency fixed!")

if __name__ == '__main__':
    fix_circular()
