"""Modern Pastel UX and Dynamic Validation"""
import os, sys
sys.path.insert(0, os.path.dirname(__file__))
from settings import SHEET_ID as CONFIGURED_SHEET_ID, TOKEN_PATH as CONFIGURED_TOKEN_PATH
from google.oauth2.credentials import Credentials as OAuthCreds
from googleapiclient.discovery import build
import gspread

TOKEN_PATH = str(CONFIGURED_TOKEN_PATH)
SHEET_ID = CONFIGURED_SHEET_ID

def modern_ux():
    creds = OAuthCreds.from_authorized_user_file(TOKEN_PATH, ['https://www.googleapis.com/auth/spreadsheets'])
    gc = gspread.authorize(creds)
    sh = gc.open_by_key(SHEET_ID)
    sheets_api = build('sheets', 'v4', credentials=creds)
    
    ws_nk = sh.worksheet("JOURNAL")
    nk_id = ws_nk.id

    # 1. Clear existing rules
    sheet_data = sheets_api.spreadsheets().get(spreadsheetId=SHEET_ID, fields="sheets(properties/sheetId,conditionalFormats)").execute()
    journal_sheet = next(s for s in sheet_data['sheets'] if s['properties']['sheetId'] == nk_id)
    if 'conditionalFormats' in journal_sheet:
        delete_reqs = [{'deleteConditionalFormatRule': {'sheetId': nk_id, 'index': 0}} for _ in journal_sheet['conditionalFormats']]
        if delete_reqs:
            sheets_api.spreadsheets().batchUpdate(spreadsheetId=SHEET_ID, body={'requests': delete_reqs}).execute()

    reqs = []
    
    def add_rule(ranges, condition_type, values, bg_color=None, text_color=None, is_bold=True):
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
                    'ranges': ranges,
                    'booleanRule': {
                        'condition': {'type': condition_type, 'values': cond_values},
                        'format': format_dict
                    }
                },
                'index': 0
            }
        })

    def r(start_col, end_col):
        return {'sheetId': nk_id, 'startRowIndex': 1, 'endRowIndex': 2000, 'startColumnIndex': start_col, 'endColumnIndex': end_col}

    # 1. Trạng Thái (Pastel colors)
    add_rule([r(0, 1)], 'TEXT_EQ', ['Thắng'], bg_color=[0.90, 0.96, 0.91], text_color=[0.08, 0.34, 0.14])
    add_rule([r(0, 1)], 'TEXT_EQ', ['Thua'], bg_color=[0.99, 0.91, 0.90], text_color=[0.45, 0.11, 0.14])
    add_rule([r(0, 1)], 'TEXT_EQ', ['Đang mở'], bg_color=[1.0, 0.95, 0.80], text_color=[0.52, 0.39, 0.02])
    add_rule([r(0, 1)], 'TEXT_EQ', ['Hòa'], bg_color=[0.95, 0.95, 0.96], text_color=[0.24, 0.25, 0.26])

    # 2. Vị Thế (LONG/Mua green, SHORT/Bán red - but slightly softer)
    add_rule([r(4, 5)], 'TEXT_EQ', ['LONG'], text_color=[0.1, 0.6, 0.2])
    add_rule([r(4, 5)], 'TEXT_EQ', ['Mua'], text_color=[0.1, 0.6, 0.2])
    add_rule([r(4, 5)], 'TEXT_EQ', ['SHORT'], text_color=[0.8, 0.2, 0.2])
    add_rule([r(4, 5)], 'TEXT_EQ', ['Bán'], text_color=[0.8, 0.2, 0.2])

    # 3. Lãi Ròng (U)
    add_rule([r(20, 21)], 'NUMBER_GREATER', ['0'], text_color=[0.1, 0.6, 0.2])
    add_rule([r(20, 21)], 'NUMBER_LESS', ['0'], text_color=[0.8, 0.2, 0.2])

    # 4. Required Field Highlight UX
    # Highlight missing required fields when Mã GD (D) is entered.
    # Required ranges to open a trade: B:C (1:3), E:I (4:9), M:N (12:14)
    # Using CUSTOM_FORMULA: =AND($D2<>"", B2="") -> Since ranges start at B2, the formula maps relatively.
    # Actually, B2 corresponds to the top-left cell of the first range.
    # Wait, if I pass multiple ranges, the formula B2=""" is evaluated relative to the top-left of EACH range?
    # No, in Google Sheets API, custom formula references are relative to the top-left cell of the *first* range in the list!
    # Wait, to be safe, I should add separate rules for each block to ensure relative referencing works correctly,
    # OR just write the formula for the exact top-left cell of that specific block.
    
    # Block 1: B:C
    add_rule([r(1, 3)], 'CUSTOM_FORMULA', ['=AND($D2<>"", B2="")'], bg_color=[0.91, 0.96, 1.0], is_bold=False)
    # Block 2: E:I
    add_rule([r(4, 9)], 'CUSTOM_FORMULA', ['=AND($D2<>"", E2="")'], bg_color=[0.91, 0.96, 1.0], is_bold=False)
    # Block 3: M:N
    add_rule([r(12, 14)], 'CUSTOM_FORMULA', ['=AND($D2<>"", M2="")'], bg_color=[0.91, 0.96, 1.0], is_bold=False)
    
    # BONUS: Highlight missing Close fields (J, K, O) when the user decides to close a trade.
    # How to know they are closing? If ANY of J, K, O is filled, the others should be required.
    # OR if Trạng Thái = "Đang mở" and they want to close. No, let's just do: if O is filled, J, K are required.
    # If J is filled, O, K are required.
    # Formula: =AND(OR($J2<>"", $K2<>"", $O2<>""), J2="")
    add_rule([r(9, 11)], 'CUSTOM_FORMULA', ['=AND(OR($J2<>"", $K2<>"", $O2<>""), J2="")'], bg_color=[0.98, 0.9, 0.98], is_bold=False) # Soft purple for closing
    add_rule([r(14, 15)], 'CUSTOM_FORMULA', ['=AND(OR($J2<>"", $K2<>"", $O2<>""), O2="")'], bg_color=[0.98, 0.9, 0.98], is_bold=False)


    # Reverse the list so the first added has the highest priority
    sheets_api.spreadsheets().batchUpdate(spreadsheetId=SHEET_ID, body={'requests': reqs[::-1]}).execute()
    print("Modern UX rules added successfully.")

if __name__ == '__main__':
    modern_ux()
