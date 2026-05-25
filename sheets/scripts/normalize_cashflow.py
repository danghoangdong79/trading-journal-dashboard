"""Normalize CASHFLOW tab headers, dropdowns, formats, and legacy wrong type values."""
import argparse
import os
import sys

sys.path.insert(0, os.path.dirname(__file__))

import gspread
from google.oauth2.credentials import Credentials as OAuthCreds
from googleapiclient.discovery import build

from settings import SHEET_ID as CONFIGURED_SHEET_ID, TOKEN_PATH as CONFIGURED_TOKEN_PATH, add_safety_args, require_confirmation

TOKEN_PATH = str(CONFIGURED_TOKEN_PATH)
SHEET_ID = CONFIGURED_SHEET_ID
SCOPES = ["https://www.googleapis.com/auth/spreadsheets"]
HEADERS = ["Ng\u00e0y", "T\u00e0i kho\u1ea3n", "Lo\u1ea1i", "S\u1ed1 ti\u1ec1n", "Ghi ch\u00fa"]
CASHFLOW_TYPES = ["N\u1ea1p ti\u1ec1n", "R\u00fat ti\u1ec1n"]


def normalize_text(value):
    import unicodedata
    text = str(value or "").strip().lower()
    text = "".join(ch for ch in unicodedata.normalize("NFD", text) if unicodedata.category(ch) != "Mn")
    return text


def get_clients():
    creds = OAuthCreds.from_authorized_user_file(TOKEN_PATH, SCOPES)
    return gspread.authorize(creds), build("sheets", "v4", credentials=creds)


def ensure_cashflow_sheet(sh):
    try:
        ws = sh.worksheet("CASHFLOW")
    except gspread.WorksheetNotFound:
        ws = sh.add_worksheet("CASHFLOW", rows=2000, cols=len(HEADERS))
    if ws.row_count < 2000 or ws.col_count < len(HEADERS):
        ws.resize(rows=max(ws.row_count, 2000), cols=max(ws.col_count, len(HEADERS)))
    ws.update(values=[HEADERS], range_name="A1:E1")
    return ws


def detect_cashflow_type(row):
    current = normalize_text(row[2] if len(row) > 2 else "")
    note = normalize_text(row[4] if len(row) > 4 else "")
    if current in {"nap tien", "rut tien"}:
        return row[2]
    text = f"{current} {note}"
    if "rut" in text or "withdraw" in text or "outflow" in text or "chi tien" in text:
        return "R\u00fat ti\u1ec1n"
    return "N\u1ea1p ti\u1ec1n"


def build_grid_range(sheet_id, start_col, end_col, start_row=2, end_row=2000):
    return {
        "sheetId": sheet_id,
        "startRowIndex": start_row - 1,
        "endRowIndex": end_row,
        "startColumnIndex": start_col,
        "endColumnIndex": end_col,
    }


def set_validation(sheet_id, start_col, end_col, condition_type, values=None, strict=False):
    condition = {"type": condition_type}
    if values:
        condition["values"] = [{"userEnteredValue": value} for value in values]
    return {
        "setDataValidation": {
            "range": build_grid_range(sheet_id, start_col, end_col),
            "rule": {"condition": condition, "showCustomUi": True, "strict": strict},
        }
    }


def normalize_cashflow(sheet_id=SHEET_ID, confirm=False, dry_run=False):
    if not require_confirmation("normalize CASHFLOW tab", sheet_id=sheet_id, confirm=confirm, dry_run=dry_run):
        return

    gc, sheets_api = get_clients()
    sh = gc.open_by_key(sheet_id)
    ws = ensure_cashflow_sheet(sh)

    rows = ws.get("A2:E2000")
    updates = []
    for offset, row in enumerate(rows, start=2):
        if not any(str(cell or "").strip() for cell in row):
            continue
        padded = row + [""] * (len(HEADERS) - len(row))
        next_type = detect_cashflow_type(padded)
        if padded[2] != next_type:
            updates.append({"range": f"C{offset}", "values": [[next_type]]})

    if updates:
        ws.batch_update(updates, value_input_option="USER_ENTERED")

    requests = [
        set_validation(ws.id, 0, 1, "DATE_IS_VALID", strict=False),
        set_validation(ws.id, 1, 2, "ONE_OF_RANGE", ["=FORMULAS!$I$2:$I"], strict=False),
        set_validation(ws.id, 2, 3, "ONE_OF_LIST", CASHFLOW_TYPES, strict=True),
        {"repeatCell": {"range": build_grid_range(ws.id, 0, 5, 1, 1), "cell": {"userEnteredFormat": {"backgroundColor": {"red": 0.04, "green": 0.055, "blue": 0.09}, "textFormat": {"bold": True, "foregroundColor": {"red": 1, "green": 1, "blue": 1}}, "horizontalAlignment": "CENTER"}}, "fields": "userEnteredFormat"}},
        {"repeatCell": {"range": build_grid_range(ws.id, 0, 1), "cell": {"userEnteredFormat": {"numberFormat": {"type": "DATE", "pattern": "dd/MM/yyyy"}}}, "fields": "userEnteredFormat.numberFormat"}},
        {"repeatCell": {"range": build_grid_range(ws.id, 3, 4), "cell": {"userEnteredFormat": {"numberFormat": {"type": "NUMBER", "pattern": "#,##0"}}}, "fields": "userEnteredFormat.numberFormat"}},
    ]
    sheets_api.spreadsheets().batchUpdate(spreadsheetId=sheet_id, body={"requests": requests}).execute()
    print(f"CASHFLOW normalized: {len(updates)} legacy type cells updated")


if __name__ == "__main__":
    parser = add_safety_args(argparse.ArgumentParser())
    args = parser.parse_args()
    normalize_cashflow(sheet_id=args.sheet_id, confirm=args.confirm, dry_run=args.dry_run)
