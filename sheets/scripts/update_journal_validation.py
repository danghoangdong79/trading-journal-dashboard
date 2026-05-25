"""Update JOURNAL data validation and FORMULAS matrix for the A:Y layout."""
import os
import sys

sys.path.insert(0, os.path.dirname(__file__))

import gspread
from google.oauth2.credentials import Credentials as OAuthCreds
from googleapiclient.discovery import build
from settings import SHEET_ID as CONFIGURED_SHEET_ID, TOKEN_PATH as CONFIGURED_TOKEN_PATH

TOKEN_PATH = str(CONFIGURED_TOKEN_PATH)
SHEET_ID = CONFIGURED_SHEET_ID


def fix_journal():
    creds = OAuthCreds.from_authorized_user_file(TOKEN_PATH, ["https://www.googleapis.com/auth/spreadsheets"])
    gc = gspread.authorize(creds)
    sh = gc.open_by_key(SHEET_ID)
    sheets_api = build("sheets", "v4", credentials=creds)

    ws_formulas = sh.worksheet("FORMULAS")
    ws_journal = sh.worksheet("JOURNAL")

    ws_formulas.update_acell("M1", "MATRIX MÃ GD")
    matrix_formulas = []
    for row_number in range(2, 2001):
        formula = (
            f'=IFERROR(TRANSPOSE(IF(JOURNAL!$D{row_number}="Cổ phiếu", $A$2:$A, '
            f'IF(JOURNAL!$D{row_number}="Phái sinh", $B$2:$B, {{""}}))), "")'
        )
        matrix_formulas.append([formula])
    ws_formulas.update(values=matrix_formulas, range_name="M2:M2000", value_input_option="USER_ENTERED")

    requests = []

    def grid_col(column_index):
        return {
            "sheetId": ws_journal.id,
            "startRowIndex": 1,
            "endRowIndex": 2000,
            "startColumnIndex": column_index,
            "endColumnIndex": column_index + 1,
        }

    def clear_validation(column_index):
        requests.append({"setDataValidation": {"range": grid_col(column_index), "rule": None}})

    def add_val_range(column_index, range_str, strict=True):
        requests.append({
            "setDataValidation": {
                "range": grid_col(column_index),
                "rule": {
                    "condition": {"type": "ONE_OF_RANGE", "values": [{"userEnteredValue": range_str}]},
                    "showCustomUi": True,
                    "strict": strict,
                },
            }
        })

    def add_val_list(column_index, values, strict=True):
        requests.append({
            "setDataValidation": {
                "range": grid_col(column_index),
                "rule": {
                    "condition": {"type": "ONE_OF_LIST", "values": [{"userEnteredValue": value} for value in values]},
                    "showCustomUi": True,
                    "strict": strict,
                },
            }
        })

    for column_index in [1, 3, 4, 5, 6, 7, 8, 10, 22]:
        clear_validation(column_index)

    add_val_range(1, "=FORMULAS!$I$2:$I", strict=False)
    add_val_list(3, ["Cổ phiếu", "Phái sinh"])
    add_val_range(4, "=FORMULAS!M2:Z2")
    add_val_list(5, ["LONG", "SHORT"])
    add_val_range(6, "=FORMULAS!$E$2:$E")
    add_val_range(7, "=FORMULAS!$C$2:$C")

    for column_index in [8, 10]:
        requests.append({
            "setDataValidation": {
                "range": grid_col(column_index),
                "rule": {"condition": {"type": "DATE_IS_VALID"}, "showCustomUi": True, "strict": False},
            }
        })

    add_val_range(22, "=FORMULAS!$D$2:$D")

    sheets_api.spreadsheets().batchUpdate(spreadsheetId=SHEET_ID, body={"requests": requests}).execute()
    print("JOURNAL validations and FORMULAS matrix restored for A:Y layout.")


if __name__ == "__main__":
    fix_journal()
