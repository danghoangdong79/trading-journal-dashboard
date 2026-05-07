"""Add Conditional Formatting to JOURNAL"""
import os, sys
sys.path.insert(0, os.path.dirname(__file__))
from settings import SHEET_ID as CONFIGURED_SHEET_ID, TOKEN_PATH as CONFIGURED_TOKEN_PATH
from google.oauth2.credentials import Credentials as OAuthCreds
from googleapiclient.discovery import build
import gspread

TOKEN_PATH = str(CONFIGURED_TOKEN_PATH)
SHEET_ID = CONFIGURED_SHEET_ID

def add_conditional_formatting():
    creds = OAuthCreds.from_authorized_user_file(TOKEN_PATH, ['https://www.googleapis.com/auth/spreadsheets'])
    gc = gspread.authorize(creds)
    sh = gc.open_by_key(SHEET_ID)
    sheets_api = build('sheets', 'v4', credentials=creds)
    
    ws_nk = sh.worksheet("JOURNAL")
    nk_id = ws_nk.id
    
    # 1. Clear existing conditional formats on JOURNAL
    clear_req = {'updateSheetProperties': {'properties': {'sheetId': nk_id}, 'fields': '*(!conditionalFormats)'}}
    # Actually to clear all conditional formatting, it's safer to just set an empty list of conditionalFormats
    # or just use addConditionalFormatRule with index 0 and it will append. But we want to avoid duplicates.
    # We will fetch existing rules and delete them, or just use updateCells to clear formatting, 
    # but the easiest way to reset all conditional formats is to pass an empty array of conditionalFormats:
    # Wait, you can't easily clear conditional formats without getting them first.
    # Let's just retrieve and delete, or add new ones to the top. I'll add new ones to the top (index=0).
    
    reqs = []
    
    def add_rule(start_col, end_col, condition_type, values, bg_color=None, text_color=None, is_bold=True):
        format_dict = {}
        if bg_color:
            format_dict['backgroundColor'] = {'red': bg_color[0], 'green': bg_color[1], 'blue': bg_color[2]}
        if text_color:
            format_dict['textFormat'] = {'foregroundColor': {'red': text_color[0], 'green': text_color[1], 'blue': text_color[2]}}
            if is_bold:
                format_dict['textFormat']['bold'] = True
        
        cond_values = [{'userEnteredValue': v} for v in values]
        
        reqs.append({
            'addConditionalFormatRule': {
                'rule': {
                    'ranges': [{'sheetId': nk_id, 'startRowIndex': 1, 'endRowIndex': 2000, 'startColumnIndex': start_col, 'endColumnIndex': end_col}],
                    'booleanRule': {
                        'condition': {'type': condition_type, 'values': cond_values},
                        'format': format_dict
                    }
                },
                'index': 0
            }
        })

    # Cột A (0:1) - Trạng Thái
    add_rule(0, 1, 'TEXT_EQ', ['Thắng'], bg_color=[0.1, 0.6, 0.2], text_color=[1, 1, 1])
    add_rule(0, 1, 'TEXT_EQ', ['Thua'], bg_color=[0.8, 0.1, 0.2], text_color=[1, 1, 1])
    add_rule(0, 1, 'TEXT_EQ', ['Đang mở'], bg_color=[0.9, 0.7, 0.1], text_color=[0, 0, 0])
    add_rule(0, 1, 'TEXT_EQ', ['Hòa'], bg_color=[0.6, 0.6, 0.6], text_color=[1, 1, 1])
    
    # Cột E (4:5) - Vị Thế
    add_rule(4, 5, 'TEXT_EQ', ['LONG'], text_color=[0.1, 0.6, 0.2])
    add_rule(4, 5, 'TEXT_EQ', ['Mua'], text_color=[0.1, 0.6, 0.2])
    add_rule(4, 5, 'TEXT_EQ', ['SHORT'], text_color=[0.8, 0.1, 0.2])
    add_rule(4, 5, 'TEXT_EQ', ['Bán'], text_color=[0.8, 0.1, 0.2])
    
    # Cột U (20:21) - Lãi Ròng
    add_rule(20, 21, 'NUMBER_GREATER', ['0'], text_color=[0.1, 0.6, 0.2])
    add_rule(20, 21, 'NUMBER_LESS', ['0'], text_color=[0.8, 0.1, 0.2])

    # To avoid stacking infinite rules if we run this multiple times, it's better to clear existing ones.
    # Retrieve the sheet's current rules
    sheet_data = sheets_api.spreadsheets().get(spreadsheetId=SHEET_ID, fields="sheets(properties/sheetId,conditionalFormats)").execute()
    journal_sheet = next(s for s in sheet_data['sheets'] if s['properties']['sheetId'] == nk_id)
    if 'conditionalFormats' in journal_sheet:
        delete_reqs = [{'deleteConditionalFormatRule': {'sheetId': nk_id, 'index': 0}} for _ in journal_sheet['conditionalFormats']]
        sheets_api.spreadsheets().batchUpdate(spreadsheetId=SHEET_ID, body={'requests': delete_reqs}).execute()

    sheets_api.spreadsheets().batchUpdate(spreadsheetId=SHEET_ID, body={'requests': reqs[::-1]}).execute()
    print("Conditional formats added.")

if __name__ == '__main__':
    add_conditional_formatting()
