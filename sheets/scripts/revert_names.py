"""Revert sheet names to English uppercase"""
import os, sys, time
sys.path.insert(0, os.path.dirname(__file__))
from google.oauth2.credentials import Credentials as OAuthCreds
from googleapiclient.discovery import build
import gspread

TOKEN_PATH = os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(__file__))), 'credentials', 'token.json')
SHEET_ID = '1PdCmBoBQsznOx6JXvOlbD-atxQnX9wHRXiM127f109I'

def get_gc():
    creds = OAuthCreds.from_authorized_user_file(TOKEN_PATH, ['https://www.googleapis.com/auth/spreadsheets'])
    return gspread.authorize(creds), creds

def revert_names():
    gc, creds = get_gc()
    sh = gc.open_by_key(SHEET_ID)
    
    name_map = {
        "CẤU HÌNH": "CONFIG",
        "CÀI ĐẶT": "SETUP",
        "NHẬT KÝ": "JOURNAL",
        "CÔNG THỨC": "FORMULAS",
        "THỐNG KÊ": "SUMMARY"
    }
    
    print("Đổi lại tên sheet sang Tiếng Anh...")
    for ws in sh.worksheets():
        if ws.title in name_map:
            ws.update_title(name_map[ws.title])
            print(f"  - {ws.title} -> {name_map[ws.title]}")

    print("Hoàn tất!")

if __name__ == '__main__':
    revert_names()
