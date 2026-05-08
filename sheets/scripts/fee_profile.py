"""Fee Profile helpers for stage-2 fee management.

This module creates a dedicated FEE_PROFILE sheet and centralizes JOURNAL
formulas that resolve fee rates by account, asset type and effective date.
"""

FEE_PROFILE_HEADERS = [
    "Tài khoản",
    "Tài sản",
    "Từ ngày",
    "Đến ngày",
    "Phí CP mua (%)",
    "Phí CP bán (%)",
    "Thuế bán CP (%)",
    "Phí CTCK PS/HĐ/chiều",
    "Phí Sở PS/HĐ/chiều",
    "Phí VSD PS/HĐ/chiều",
    "Phí QLTS ký quỹ PS (%/tháng)",
    "Phí QLTS tối thiểu/tháng",
    "Phí QLTS tối đa/tháng",
    "Giá trị 1 điểm PS",
    "Hệ số giá CP",
    "Ghi chú",
]

FEE_CHARGES_HEADERS = [
    "Ngày hạch toán",
    "Tháng phí",
    "Tài khoản",
    "Tài sản",
    "Loại phí",
    "Cơ sở tính phí",
    "Tỷ lệ",
    "Tối thiểu",
    "Tối đa",
    "Phí tính",
    "Phí thực thu",
    "Phí hạch toán",
    "Trạng thái",
    "Ghi chú",
]

FEE_CHARGES_SAMPLE_ROWS = [
    ["", "", "*", "Phái sinh", "QLTS ký quỹ PS", "", 0.000024, 100000, 1600000, "", "", "", "Chờ sao kê", "Nhập cơ sở tính phí hoặc phí thực thu từ sao kê VPS"],
]

DEFAULT_FEE_PROFILE_ROWS = [
    ["Tất cả", "Cổ phiếu", "01/01/2024", "", 0.0015, 0.0015, 0.001, 0, 0, 0, 0, 0, 0, 100000, 1000, "Mặc định cổ phiếu cho mọi tài khoản; có thể để trống hoặc dùng * / Tất cả"],
    ["Tất cả", "Phái sinh", "01/01/2024", "", 0, 0, 0, 0, 2700, 2550, 0.000024, 100000, 1600000, 100000, 1000, "Mặc định PS: Sở 2.700 + VSD 2.550 / HĐ / chiều; QLTS 0,0024%/tháng min 100k max 1,6tr"],
    ["D920568", "Phái sinh", "01/05/2026", "", 0, 0, 0, 0, 2700, 2550, 0.000024, 100000, 1600000, 100000, 1000, "Ví dụ profile riêng 1 tài khoản; nếu không cần thì xoá hoặc đổi mã TK"],
]

FEE_CHARGES_EXAMPLE_ROWS = [
    ["31/05/2026", "01/05/2026", "Tất cả", "Phái sinh", "QLTS ký quỹ PS", 5000000000, "", "", "", "", "", "", "Chờ sao kê", "Ví dụ: cơ sở tính phí 5 tỷ x 0,0024% = 120.000đ"],
    ["31/05/2026", "01/05/2026", "D920568", "Phái sinh", "QLTS ký quỹ PS", 5000000000, "", "", "", "", 113000, "", "Đã đối soát", "Ví dụ: có phí thực thu từ sao kê nên Lấy cột K thay cho phí tính"],
]


def _col_to_index(col):
    result = 0
    for char in col.upper():
        result = result * 26 + ord(char) - ord('A') + 1
    return result - 1


def _grid_range(sheet_id, start_col, start_row, end_col, end_row):
    return {
        "sheetId": sheet_id,
        "startRowIndex": start_row - 1,
        "endRowIndex": end_row,
        "startColumnIndex": _col_to_index(start_col),
        "endColumnIndex": _col_to_index(end_col) + 1,
    }


def _set_validation_request(sheet_id, start_col, start_row, end_col, end_row, condition_type, values=None, strict=False):
    condition = {"type": condition_type}
    if values is not None:
        condition["values"] = [{"userEnteredValue": str(v)} for v in values]
    return {
        "setDataValidation": {
            "range": _grid_range(sheet_id, start_col, start_row, end_col, end_row),
            "rule": {"condition": condition, "showCustomUi": True, "strict": strict},
        }
    }


def get_enabled_accounts(sh):
    """Read enabled accounts from SETUP and avoid brittle helper ranges for validations."""
    accounts = ["Tất cả", "*"]
    try:
        ws_setup = sh.worksheet("SETUP")
        rows = ws_setup.get("AJ3:AL1000")
    except Exception:
        rows = []
    for row in rows:
        account = str(row[0]).strip() if row else ""
        enabled = str(row[2]).strip().upper() if len(row) > 2 else "TRUE"
        if account and enabled not in {"FALSE", "0", "NO", "N"} and account not in accounts:
            accounts.append(account)
    return accounts


def clear_data_validation_request(sheet_id, start_col, start_row, end_col, end_row):
    return {
        "setDataValidation": {
            "range": _grid_range(sheet_id, start_col, start_row, end_col, end_row),
            "rule": None,
        }
    }


def get_gross_pnl_formula():
    return r'''={"Lãi/Lỗ Gộp"; MAP(B2:B,C2:C,D2:D,H2:H,J2:J,M2:M,R2:R,LAMBDA(acct,asset,symbol,openDate,closeDate,qty,amp,IF(symbol="","",IF(closeDate="","",LET(tradeDate,IF(closeDate="",openDate,closeDate),acctKey,IF(OR(acct="",acct="Tất cả"),"*",acct),profile,IFERROR(INDEX(SORT(FILTER({FEE_PROFILE!C$2:C,IF(FEE_PROFILE!A$2:A=acctKey,0,1),FEE_PROFILE!N$2:O},FEE_PROFILE!B$2:B=asset,FEE_PROFILE!C$2:C<=tradeDate,(FEE_PROFILE!D$2:D="")+(FEE_PROFILE!D$2:D>=tradeDate),(FEE_PROFILE!A$2:A=acctKey)+(FEE_PROFILE!A$2:A="")+(FEE_PROFILE!A$2:A="*")+(FEE_PROFILE!A$2:A="Tất cả")),1,FALSE,2,TRUE),1,),{"","",CONFIG!$C$6,CONFIG!$C$3}),pointValue,IFERROR(INDEX(profile,1,3),CONFIG!$C$6),stockMultiplier,IFERROR(INDEX(profile,1,4),CONFIG!$C$3),amp*qty*IF(asset="Phái sinh",pointValue,stockMultiplier))))))}'''


def get_fees_formula():
    return r'''={"Phí & Thuế"; MAP(B2:B,C2:C,D2:D,E2:E,H2:H,J2:J,M2:M,N2:N,O2:O,LAMBDA(acct,asset,symbol,side,openDate,closeDate,qty,entryPrice,exitPrice,IF(symbol="","",IF(exitPrice="","",LET(tradeDate,IF(closeDate="",openDate,closeDate),acctKey,IF(OR(acct="",acct="Tất cả"),"*",acct),profile,IFERROR(INDEX(SORT(FILTER({FEE_PROFILE!C$2:C,IF(FEE_PROFILE!A$2:A=acctKey,0,1),FEE_PROFILE!E$2:O},FEE_PROFILE!B$2:B=asset,FEE_PROFILE!C$2:C<=tradeDate,(FEE_PROFILE!D$2:D="")+(FEE_PROFILE!D$2:D>=tradeDate),(FEE_PROFILE!A$2:A=acctKey)+(FEE_PROFILE!A$2:A="")+(FEE_PROFILE!A$2:A="*")+(FEE_PROFILE!A$2:A="Tất cả")),1,FALSE,2,TRUE),1,),{"","",CONFIG!$C$4,CONFIG!$C$4,CONFIG!$C$5,0,CONFIG!$C$7,0,0,0,0,CONFIG!$C$6,CONFIG!$C$3}),stockBuyFee,IFERROR(INDEX(profile,1,3),CONFIG!$C$4),stockSellFee,IFERROR(INDEX(profile,1,4),CONFIG!$C$4),stockSellTax,IFERROR(INDEX(profile,1,5),CONFIG!$C$5),psBrokerFee,IFERROR(INDEX(profile,1,6),0),psExchangeFee,IFERROR(INDEX(profile,1,7),CONFIG!$C$7),psVsdFee,IFERROR(INDEX(profile,1,8),0),stockMultiplier,IFERROR(INDEX(profile,1,13),CONFIG!$C$3),IF(asset="Phái sinh",qty*(psBrokerFee+psExchangeFee+psVsdFee)*2,IF(REGEXMATCH(UPPER(side),"SHORT|BÁN|BAN"),entryPrice*qty*stockMultiplier*(stockSellFee+stockSellTax)+exitPrice*qty*stockMultiplier*stockBuyFee,entryPrice*qty*stockMultiplier*stockBuyFee+exitPrice*qty*stockMultiplier*(stockSellFee+stockSellTax))))))))}'''


def ensure_fee_profile_sheet(sh, sheets_api=None):
    """Create/update FEE_PROFILE sheet with default stage-2 fee rows."""
    try:
        ws_fee = sh.worksheet("FEE_PROFILE")
        ws_fee.clear()
    except Exception:
        ws_fee = sh.add_worksheet(title="FEE_PROFILE", rows=200, cols=len(FEE_PROFILE_HEADERS))

    ws_fee.update(values=[FEE_PROFILE_HEADERS] + DEFAULT_FEE_PROFILE_ROWS, range_name="A1", value_input_option="USER_ENTERED")
    ws_fee.freeze(rows=1)
    ws_fee.format("A1:P1", {
        "backgroundColor": {"red": 0.1, "green": 0.2, "blue": 0.4},
        "textFormat": {"bold": True, "foregroundColor": {"red": 1, "green": 1, "blue": 1}},
        "horizontalAlignment": "CENTER",
    })
    ws_fee.format("C:D", {"numberFormat": {"type": "DATE", "pattern": "dd/mm/yyyy"}})
    ws_fee.format("E:G", {"numberFormat": {"type": "PERCENT", "pattern": "0.000%"}})
    ws_fee.format("K:K", {"numberFormat": {"type": "PERCENT", "pattern": "0.0000%"}})
    ws_fee.format("H:J", {"numberFormat": {"type": "NUMBER", "pattern": "#,##0"}})
    ws_fee.format("L:O", {"numberFormat": {"type": "NUMBER", "pattern": "#,##0"}})
    ws_fee.format("A:P", {"verticalAlignment": "MIDDLE"})
    try:
        ws_fee.columns_auto_resize(0, len(FEE_PROFILE_HEADERS))
    except Exception:
        pass

    if sheets_api:
        accounts = get_enabled_accounts(sh)
        reqs = [
            clear_data_validation_request(ws_fee.id, "A", 2, "B", 200),
            _set_validation_request(ws_fee.id, "A", 2, "A", 200, "ONE_OF_LIST", accounts, strict=False),
            _set_validation_request(ws_fee.id, "B", 2, "B", 200, "ONE_OF_LIST", ["Cổ phiếu", "Phái sinh"], strict=True),
            _set_validation_request(ws_fee.id, "C", 2, "D", 200, "DATE_IS_VALID", strict=False),
        ]
        sheets_api.spreadsheets().batchUpdate(spreadsheetId=sh.id, body={"requests": reqs}).execute()
    return ws_fee


def ensure_fee_charges_sheet(sh, sheets_api=None):
    """Create/update a ledger for periodic/non-trade fees such as margin asset management."""
    try:
        ws_fee_charges = sh.worksheet("FEE_CHARGES")
        existing = ws_fee_charges.get("A1:N1")
        if not existing or existing[0] != FEE_CHARGES_HEADERS:
            ws_fee_charges.update(values=[FEE_CHARGES_HEADERS], range_name="A1", value_input_option="USER_ENTERED")
    except Exception:
        ws_fee_charges = sh.add_worksheet(title="FEE_CHARGES", rows=500, cols=len(FEE_CHARGES_HEADERS))
        ws_fee_charges.update(values=[FEE_CHARGES_HEADERS] + FEE_CHARGES_SAMPLE_ROWS, range_name="A1", value_input_option="USER_ENTERED")

    existing_rows = ws_fee_charges.get("A2:N50")
    has_data = any(any(str(cell).strip() for cell in row[:13]) for row in existing_rows)
    has_examples = any(len(row) > 13 and "Ví dụ:" in str(row[13]) for row in existing_rows)
    if not has_data:
        ws_fee_charges.update(values=FEE_CHARGES_SAMPLE_ROWS + FEE_CHARGES_EXAMPLE_ROWS, range_name="A2", value_input_option="USER_ENTERED")
    elif not has_examples:
        first_empty_row = 2
        for idx, row in enumerate(existing_rows, start=2):
            if any(str(cell).strip() for cell in row[:13]):
                first_empty_row = idx + 1
        ws_fee_charges.update(values=FEE_CHARGES_EXAMPLE_ROWS, range_name=f"A{first_empty_row}", value_input_option="USER_ENTERED")

    ws_fee_charges.freeze(rows=1)
    ws_fee_charges.format("A1:N1", {
        "backgroundColor": {"red": 0.1, "green": 0.2, "blue": 0.4},
        "textFormat": {"bold": True, "foregroundColor": {"red": 1, "green": 1, "blue": 1}},
        "horizontalAlignment": "CENTER",
    })
    ws_fee_charges.format("A:B", {"numberFormat": {"type": "DATE", "pattern": "dd/mm/yyyy"}})
    ws_fee_charges.format("G:G", {"numberFormat": {"type": "PERCENT", "pattern": "0.0000%"}})
    ws_fee_charges.format("F:F", {"numberFormat": {"type": "NUMBER", "pattern": "#,##0"}})
    ws_fee_charges.format("H:L", {"numberFormat": {"type": "NUMBER", "pattern": "#,##0"}})
    ws_fee_charges.format("A:N", {"verticalAlignment": "MIDDLE"})
    ws_fee_charges.format("J:J", {"backgroundColor": {"red": 0.94, "green": 0.97, "blue": 1}})
    ws_fee_charges.format("L:L", {"backgroundColor": {"red": 0.92, "green": 0.98, "blue": 0.92}})
    ws_fee_charges.format("A1:N1", {"wrapStrategy": "CLIP"})
    apply_fee_charges_formulas(ws_fee_charges)

    if sheets_api:
        accounts = get_enabled_accounts(sh)
        reqs = [
            clear_data_validation_request(ws_fee_charges.id, "A", 2, "N", 500),
            _set_validation_request(ws_fee_charges.id, "A", 2, "B", 500, "DATE_IS_VALID", strict=False),
            _set_validation_request(ws_fee_charges.id, "C", 2, "C", 500, "ONE_OF_LIST", accounts, strict=False),
            _set_validation_request(ws_fee_charges.id, "D", 2, "D", 500, "ONE_OF_LIST", ["Cổ phiếu", "Phái sinh"], strict=True),
            _set_validation_request(ws_fee_charges.id, "E", 2, "E", 500, "ONE_OF_LIST", ["QLTS ký quỹ PS", "Phí khác", "Điều chỉnh phí"], strict=False),
            _set_validation_request(ws_fee_charges.id, "M", 2, "M", 500, "ONE_OF_LIST", ["Chờ sao kê", "Đã tính", "Đã đối soát", "Bỏ qua"], strict=False),
        ]
        sheets_api.spreadsheets().batchUpdate(spreadsheetId=sh.id, body={"requests": reqs}).execute()
    try:
        ws_fee_charges.columns_auto_resize(0, len(FEE_CHARGES_HEADERS))
    except Exception:
        pass
    return ws_fee_charges


def get_fee_charges_calculated_formula():
    return r'''={"Phí tính"; MAP(E2:E,F2:F,G2:G,H2:H,I2:I,LAMBDA(kind,basis,rateInput,minInput,maxInput,IF(kind="","",LET(rate,IF(rateInput="",0.000024,rateInput),minFee,IF(minInput="",100000,minInput),maxFee,IF(maxInput="",1600000,maxInput),IFERROR(IF(REGEXMATCH(UPPER(kind),"QLTS|KÝ QUỸ|KY QUY|QUẢN LÝ"),MIN(MAX(basis*rate,minFee),maxFee),basis*rate),0)))))}'''


def get_fee_charges_booked_formula():
    return r'''={"Phí hạch toán"; ARRAYFORMULA(IF(E2:E="","",IF(K2:K<>"",K2:K,J2:J)))}'''


def apply_fee_charges_formulas(ws_fee_charges):
    """Apply formulas for calculated and booked non-trade fees."""
    ws_fee_charges.update_acell("J1", get_fee_charges_calculated_formula())
    ws_fee_charges.update_acell("L1", get_fee_charges_booked_formula())


def apply_fee_profile_formulas(ws_journal):
    """Apply formulas that calculate gross/net PnL using FEE_PROFILE."""
    ws_journal.update_acell("S1", get_gross_pnl_formula())
    ws_journal.update_acell("T1", get_fees_formula())
    ws_journal.update_acell("U1", r'''={"Lãi/Lỗ Ròng"; ARRAYFORMULA(IF(D2:D="", "", IF(O2:O="", "", S2:S - T2:T)))}''')