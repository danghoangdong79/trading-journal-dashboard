"""Fix CASHFLOW dropdowns without rebuilding the workbook.

This repairs the common encoding mismatch where the `Loại` dropdown displays
`N?p/R?t` while actual values are `Nạp/Rút`, causing Google Sheets to mark the
cells invalid. The fix stores dropdown values in FORMULAS!K2:K3 and points
CASHFLOW!C2:C to that range instead of hardcoding accented literals inside the
validation rule.
"""

from __future__ import annotations

import os
import sys

sys.path.insert(0, os.path.dirname(__file__))

import gspread
from google.oauth2.credentials import Credentials as OAuthCreds
from google.oauth2.service_account import Credentials as ServiceAccountCreds
from googleapiclient.discovery import build

from settings import CREDENTIALS_DIR, SHEET_ID as CONFIGURED_SHEET_ID, TOKEN_PATH as CONFIGURED_TOKEN_PATH


TOKEN_PATH = str(CONFIGURED_TOKEN_PATH)
SHEET_ID = CONFIGURED_SHEET_ID
SCOPES = ["https://www.googleapis.com/auth/spreadsheets"]
DEFAULT_SERVICE_ACCOUNT_FILE = "gen-lang-client-0658622290-67f651f4974d.json"


def get_credentials():
    if os.path.exists(TOKEN_PATH):
        return OAuthCreds.from_authorized_user_file(TOKEN_PATH, SCOPES)

    service_account_path = os.getenv("GOOGLE_APPLICATION_CREDENTIALS") or os.getenv("KHANGHANG_SERVICE_ACCOUNT_PATH")
    if not service_account_path:
        service_account_path = str(CREDENTIALS_DIR / DEFAULT_SERVICE_ACCOUNT_FILE)
    return ServiceAccountCreds.from_service_account_file(service_account_path, scopes=SCOPES)


def validation_request(sheet_id: int, col_index: int, condition_type: str, values: list[str] | None = None, strict: bool = True):
    condition: dict[str, object] = {"type": condition_type}
    if values:
        condition["values"] = [{"userEnteredValue": value} for value in values]
    return {
        "setDataValidation": {
            "range": {
                "sheetId": sheet_id,
                "startRowIndex": 1,
                "endRowIndex": 2000,
                "startColumnIndex": col_index,
                "endColumnIndex": col_index + 1,
            },
            "rule": {"condition": condition, "strict": strict, "showCustomUi": True},
        }
    }


def fix_cashflow_validation() -> None:
    creds = get_credentials()
    gc = gspread.authorize(creds)
    sh = gc.open_by_key(SHEET_ID)
    sheets_api = build("sheets", "v4", credentials=creds)

    ws_formulas = sh.worksheet("FORMULAS")
    try:
        ws_cashflow = sh.worksheet("CASHFLOW")
    except gspread.exceptions.WorksheetNotFound:
        ws_cashflow = sh.add_worksheet(title="CASHFLOW", rows=2000, cols=5)
        ws_cashflow.update(
            values=[["Ngày", "Tài khoản", "Loại", "Số tiền", "Ghi chú"]],
            range_name="A1:E1",
            value_input_option="USER_ENTERED",
        )

    # Store dropdown source values in cells so validation does not corrupt accents.
    ws_formulas.update(
        values=[["LOAI DONG TIEN"], ["Nạp"], ["Rút"]],
        range_name="K1:K3",
        value_input_option="USER_ENTERED",
    )

    # Normalize existing legacy mojibake values if they already exist in CASHFLOW.
    values = ws_cashflow.get("C2:C2000")
    normalized: list[list[str]] = []
    changed = False
    for row in values:
        value = row[0] if row else ""
        fixed = "Nạp" if value in {"N?p", "Nap"} else "Rút" if value in {"R?t", "Rut"} else value
        normalized.append([fixed])
        changed = changed or fixed != value
    if changed and normalized:
        ws_cashflow.update(values=normalized, range_name=f"C2:C{len(normalized) + 1}", value_input_option="USER_ENTERED")

    requests = [
        # Clear old broken validation on CASHFLOW A:C before reapplying.
        {
            "setDataValidation": {
                "range": {
                    "sheetId": ws_cashflow.id,
                    "startRowIndex": 1,
                    "endRowIndex": 2000,
                    "startColumnIndex": 0,
                    "endColumnIndex": 3,
                },
                "rule": None,
            }
        },
        validation_request(ws_cashflow.id, 0, "DATE_IS_VALID", strict=False),
        validation_request(ws_cashflow.id, 1, "ONE_OF_RANGE", ["=FORMULAS!$I$2:$I"]),
        validation_request(ws_cashflow.id, 2, "ONE_OF_RANGE", ["=FORMULAS!$K$2:$K$3"]),
    ]
    sheets_api.spreadsheets().batchUpdate(spreadsheetId=SHEET_ID, body={"requests": requests}).execute()
    print("Fixed CASHFLOW validations: A=date, B=FORMULAS!I2:I, C=FORMULAS!K2:K3 (Nạp/Rút).")


if __name__ == "__main__":
    fix_cashflow_validation()