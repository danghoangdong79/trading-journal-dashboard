"""Safe rebuild for the live Ocean 24-column JOURNAL schema."""
import argparse
import json
import os
import sys

sys.path.insert(0, os.path.dirname(__file__))

import gspread
from google.oauth2.credentials import Credentials as OAuthCreds
from googleapiclient.discovery import build

from settings import (
    SHEET_ID as CONFIGURED_SHEET_ID,
    TOKEN_PATH as CONFIGURED_TOKEN_PATH,
    TEMPLATES_DIR,
    add_safety_args,
    require_confirmation,
)

TOKEN_PATH = str(CONFIGURED_TOKEN_PATH)
SHEET_ID = CONFIGURED_SHEET_ID
SCOPES = [
    "https://www.googleapis.com/auth/spreadsheets",
    "https://www.googleapis.com/auth/drive",
]


def load_journal_schema():
    with open(TEMPLATES_DIR / "phai_sinh.json", "r", encoding="ascii") as handle:
        return json.load(handle)


def get_gc():
    creds = OAuthCreds.from_authorized_user_file(TOKEN_PATH, SCOPES)
    return gspread.authorize(creds), creds


def col_letter_to_index(letter):
    result = 0
    for char in letter.upper():
        result = result * 26 + ord(char) - ord("A") + 1
    return result - 1


def set_validation(sheet_id, col, condition_type, values=None, start_row=2, end_row=2000, strict=True):
    condition = {"type": condition_type}
    if values:
        condition["values"] = [{"userEnteredValue": value} for value in values]
    col_index = col_letter_to_index(col)
    return {
        "setDataValidation": {
            "range": {
                "sheetId": sheet_id,
                "startRowIndex": start_row - 1,
                "endRowIndex": end_row,
                "startColumnIndex": col_index,
                "endColumnIndex": col_index + 1,
            },
            "rule": {"condition": condition, "strict": strict, "showCustomUi": True},
        }
    }


def build_config_rows():
    return [
        ["THAM SO GIAO DICH", "", "", "", "QUAN TRI RUI RO", "", "", "", "TICH HOP", "", ""],
        ["Loai", "Tham so", "Gia tri", "", "Tieu chi", "Tham so", "Gia tri", "", "Phan he", "Cau hinh", "Gia tri"],
        ["Co phieu", "He so gia", 1000, "", "Von", "Von Co Phieu", 500000000, "", "Google Sheets", "Sheet chinh", "JOURNAL"],
        ["Co phieu", "Phi giao dich", 0.0015, "", "Von", "Von Phai Sinh", 100000000, "", "Dashboard", "Range", "JOURNAL!A1:X2000"],
        ["Co phieu", "Thue TNCN", 0.001, "", "Rui ro", "Risk per trade", 0.02, "", "n8n", "Webhook", "Pending"],
        ["Phai sinh", "He so diem", 100000, "", "Muc tieu", "Monthly target", 0.05, "", "Telegram", "Bot", "Pending"],
        ["Phai sinh", "Phi giao dich", 4000, "", "", "", "", "", "Email", "Parser", "Pending"],
        ["Phai sinh", "Thue uoc tinh", 1000, "", "", "", "", "", "", "", ""],
    ]


def build_setup_rows():
    cp = "C\u1ed5 phi\u1ebfu"
    ps = "Ph\u00e1i sinh"
    return [
        ["NHOM NGANH", "", "", "", "MA CO PHIEU", "", "", "", "", "", "NHOM PHAI SINH", "", "", "", "MA PHAI SINH", "", "", "", "", "", "CHIEN LUOC", "", "", "", "", "TAM LY", "", "", "", "", "LOAI LENH", "", "", "", "", "TAI KHOAN", "", ""],
        ["Ten Nhom", "Mo ta", "Bat", "", "Ma", "Ten", "Nhom Nganh", "San", "Bat", "", "Nhom PS", "Mo ta", "Bat", "", "Ma", "Ten", "Nhom PS", "San", "Bat", "", "Ma", "Ten", "Mo ta", "Bat", "", "Ma", "Ten", "Mo ta", "Bat", "", "Ma", "Ten", "Mo ta", "Bat", "", "Ma", "Ten", "Bat"],
        ["Ngan hang", "Banking", True, "", "VCB", "VCB", "Ngan hang", "HOSE", True, "", "HDTL Chi so", "VN30 futures", True, "", "VN30F1M", "VN30F1M", "HDTL Chi so", "HNX", True, "", "Luot song T0", "T0", "Intraday", True, "", "Binh tinh", "Binh tinh", "Calm", True, "", "Lenh thuong", "Lenh thuong", "Basic", True, "", "D920568", "Account 1", True],
        ["Chung khoan", "Securities", True, "", "SSI", "SSI", "Chung khoan", "HOSE", True, "", "", "", "", "", "VN30F2M", "VN30F2M", "HDTL Chi so", "HNX", True, "", "Dau tu gia tri", "Value", "Value", True, "", "Ky luat", "Ky luat", "Discipline", True, "", "ATO", "ATO", "Open", True, "", "T271298", "Account 2", True],
        ["Ban le", "Retail", True, "", "MWG", "MWG", "Ban le", "HOSE", True, "", "", "", "", "", "", "", "", "", "", "", "Theo dong tien", "Flow", "Money flow", True, "", "FOMO", "FOMO", "FOMO", True, "", "ATC", "ATC", "Close", True, "", "", "", ""],
        ["Cong nghe", "Technology", True, "", "FPT", "FPT", "Cong nghe", "HOSE", True, "", "", "", "", "", "", "", "", "", "", "", "Pha nen", "Breakdown", "Break support", True, "", "So hai", "So hai", "Fear", True, "", "MAK", "MAK", "Market", True, "", "", "", ""],
        ["Thep", "Steel", True, "", "HPG", "HPG", "Thep", "HOSE", True, "", "", "", "", "", "", "", "", "", "", "", "Hoi ky thuat", "Pullback", "Mean reversion", True, "", "Qua tu tin", "Qua tu tin", "Overconfidence", True, "", "MTL", "MTL", "Market to limit", True, "", "", "", ""],
    ]


def build_summary_rows():
    return [
        ["", "TONG HOP GIAO DICH"],
        [],
        ["", "Bo loc", "Gia tri", "", "", "", "", "KPI", "Gia tri", "", "KPI", "Gia tri", "", "KPI", "Gia tri"],
        ["", "Tai san", "Tat ca", "", "", "", "", "Von ban dau", "=CONFIG!$G$3 + CONFIG!$G$4", "", "Tong GD", '=COUNTA(JOURNAL!D2:D)', "", "Lai CP", '=SUMIF(JOURNAL!C2:C,"C\u1ed5 phi\u1ebfu",JOURNAL!U2:U)'],
        ["", "Vi the", "Tat ca", "", "", "", "", "Lai/Lo rong", '=SUM(JOURNAL!U2:U)', "", "Win rate", '=IFERROR(COUNTIF(JOURNAL!A2:A,"Th\u1eafng")/COUNTIFS(JOURNAL!A2:A,"<>",JOURNAL!A2:A,"<>\u0110ang m\u1edf"),0)', "", "Lai PS", '=SUMIF(JOURNAL!C2:C,"Ph\u00e1i sinh",JOURNAL!U2:U)'],
        ["", "Chien luoc", "Tat ca", "", "", "", "", "Tang truong", '=IFERROR(I5/I4,0)', "", "GD thang", '=COUNTIF(JOURNAL!A2:A,"Th\u1eafng")', "", "Phi & Thue", '=SUM(JOURNAL!T2:T)'],
        ["", "Nhom nganh", "Tat ca", "", "", "", "", "So du hien tai", '=I4+I5', "", "GD thua", '=COUNTIF(JOURNAL!A2:A,"Thua")', "", "Profit Factor", '=IFERROR(SUMIF(JOURNAL!U2:U,">0")/ABS(SUMIF(JOURNAL!U2:U,"<0")),0)'],
        ["", "Tai khoan", "Tat ca", "", "", "", "", "", "", "", "Dang mo", '=COUNTIF(JOURNAL!A2:A,"\u0110ang m\u1edf")', "", "Max Loss", '=IFERROR(MIN(JOURNAL!U2:U),0)'],
        [],
        ["Trang Thai", "Tai San", "Ma GD", "Vi The", "Chien Luoc", "Ngay Mo", "Ngay Dong", "So Ngay", "Khoi Luong", "Gia Vao", "Gia Dong", "Bien Do", "Lai/Lo Gop", "Phi & Thue", "Lai/Lo Rong", "Tam Ly", "Ghi Chu Review"],
        ['=IFERROR(QUERY(JOURNAL!A2:W,"select A,C,D,E,G,H,J,L,M,N,O,R,S,T,U,V,W where D is not null",0),{"No data","","","","","","","","","","","","","","","",""})'],
    ]


def build_cashflow_rows():
    return [
        ["Ngày", "Tài khoản", "Loại", "Số tiền", "Ghi chú"],
        ["2025-04-01", "D920568", "Nạp", 50000000, "Bổ sung vốn kiểm thử"],
        ["2025-09-01", "T271298", "Nạp", 30000000, "Tăng sức mua giai đoạn 2"],
        ["2026-02-01", "D920568", "Rút", 20000000, "Rút lợi nhuận một phần"],
    ]


def rebuild(sheet_id=SHEET_ID, confirm=False, dry_run=False):
    if not require_confirmation("rebuild all tabs", sheet_id=sheet_id, confirm=confirm, dry_run=dry_run):
        return

    schema = load_journal_schema()
    headers = [col["label"] for col in schema["columns"]]
    formulas = {col["col"]: col["formula"] for col in schema["columns"] if "formula" in col}

    gc, creds = get_gc()
    sh = gc.open_by_key(sheet_id)
    sheets_api = build("sheets", "v4", credentials=creds)

    existing = sh.worksheets()
    for ws in existing[1:]:
        sh.del_worksheet(ws)
    existing[0].update_title("CONFIG")
    existing[0].resize(rows=1000, cols=26)
    existing[0].clear()

    ws_config = sh.worksheet("CONFIG")
    ws_config.update(values=build_config_rows(), range_name="A1")

    ws_setup = sh.add_worksheet("SETUP", rows=100, cols=39)
    ws_setup.update(values=build_setup_rows(), range_name="A1")

    ws_formulas = sh.add_worksheet("FORMULAS", rows=2000, cols=87)
    ws_formulas.update(values=[["CO PHIEU", "PHAI SINH", "CHIEN LUOC", "TAM LY", "LOAI LENH", "", "NHOM CP", "NHOM PS", "TAI KHOAN", "TAI KHOAN LOC", "LOAI DONG TIEN", "", "MATRIX MA GD"]], range_name="A1")
    ws_formulas.update(values=[[
        "=FILTER(SETUP!E3:E, SETUP!I3:I=TRUE)",
        "=FILTER(SETUP!O3:O, SETUP!S3:S=TRUE)",
        "=FILTER(SETUP!U3:U, SETUP!X3:X=TRUE)",
        "=FILTER(SETUP!Z3:Z, SETUP!AC3:AC=TRUE)",
        "=FILTER(SETUP!AE3:AE, SETUP!AH3:AH=TRUE)",
        "",
        "=FILTER(SETUP!A3:A, SETUP!C3:C=TRUE)",
        "=FILTER(SETUP!K3:K, SETUP!M3:M=TRUE)",
        "=IFERROR(FILTER(SETUP!AJ3:AJ, SETUP!AL3:AL=TRUE), \"\")",
        "={\"Tat ca\"; IFERROR(FILTER(SETUP!AJ3:AJ, SETUP!AL3:AL=TRUE), \"\")}",
        "Nạp",
    ]], range_name="A2", value_input_option="USER_ENTERED")
    ws_formulas.update(values=[["Rút"]], range_name="K3", value_input_option="USER_ENTERED")
    matrix = [[f'=IFERROR(TRANSPOSE(IF(JOURNAL!$C{row}="Cổ phiếu", $A$2:$A, IF(JOURNAL!$C{row}="Phái sinh", $B$2:$B, {{""}}))), "")'] for row in range(2, 102)]
    ws_formulas.update(values=matrix, range_name="M2", value_input_option="USER_ENTERED")

    ws_journal = sh.add_worksheet("JOURNAL", rows=2000, cols=24)
    ws_journal.update(values=[headers], range_name="A1")
    for col, formula in formulas.items():
        cell = f"{col}1" if col != "X" else "X2"
        ws_journal.update(values=[[formula]], range_name=cell, value_input_option="USER_ENTERED")

    ws_summary = sh.add_worksheet("SUMMARY", rows=2000, cols=40)
    ws_summary.update(values=build_summary_rows(), range_name="A1", value_input_option="USER_ENTERED")

    ws_cashflow = sh.add_worksheet("CASHFLOW", rows=2000, cols=5)
    ws_cashflow.update(values=build_cashflow_rows(), range_name="A1", value_input_option="USER_ENTERED")

    requests = [
        {"updateSheetProperties": {"properties": {"sheetId": ws_formulas.id, "hidden": True}, "fields": "hidden"}},
        {"repeatCell": {"range": {"sheetId": ws_journal.id, "startRowIndex": 0, "endRowIndex": 1}, "cell": {"userEnteredFormat": {"backgroundColor": {"red": 0.04, "green": 0.055, "blue": 0.09}, "textFormat": {"bold": True, "foregroundColor": {"red": 1, "green": 1, "blue": 1}}, "horizontalAlignment": "CENTER"}}, "fields": "userEnteredFormat"}},
        set_validation(ws_journal.id, "B", "ONE_OF_RANGE", ["=FORMULAS!$I$2:$I"]),
        set_validation(ws_journal.id, "C", "ONE_OF_LIST", ["Cổ phiếu", "Phái sinh"]),
        set_validation(ws_journal.id, "D", "ONE_OF_RANGE", ["=FORMULAS!M2:ZZ2"]),
        set_validation(ws_journal.id, "E", "ONE_OF_LIST", ["LONG", "SHORT"]),
        set_validation(ws_journal.id, "F", "ONE_OF_RANGE", ["=FORMULAS!$E$2:$E"]),
        set_validation(ws_journal.id, "G", "ONE_OF_RANGE", ["=FORMULAS!$C$2:$C"]),
        set_validation(ws_journal.id, "H", "DATE_IS_VALID", None),
        set_validation(ws_journal.id, "J", "DATE_IS_VALID", None),
        set_validation(ws_journal.id, "V", "ONE_OF_RANGE", ["=FORMULAS!$D$2:$D"]),
        set_validation(ws_cashflow.id, "A", "DATE_IS_VALID", None, strict=False),
        set_validation(ws_cashflow.id, "B", "ONE_OF_RANGE", ["=FORMULAS!$I$2:$I"]),
        set_validation(ws_cashflow.id, "C", "ONE_OF_RANGE", ["=FORMULAS!$K$2:$K$3"]),
    ]
    sheets_api.spreadsheets().batchUpdate(spreadsheetId=sheet_id, body={"requests": requests}).execute()

    print(f"Rebuild complete: https://docs.google.com/spreadsheets/d/{sheet_id}")
    print("Tabs: CONFIG | SETUP | FORMULAS | JOURNAL | SUMMARY")


if __name__ == "__main__":
    parser = add_safety_args(argparse.ArgumentParser())
    args = parser.parse_args()
    rebuild(sheet_id=args.sheet_id, confirm=args.confirm, dry_run=args.dry_run)
