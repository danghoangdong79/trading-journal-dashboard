"""Comprehensive audit of the entire Trading Journal system"""
import os, sys, json
sys.path.insert(0, os.path.dirname(__file__))
from google.oauth2.credentials import Credentials as OAuthCreds
from googleapiclient.discovery import build
import gspread

TOKEN_PATH = os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(__file__))), 'credentials', 'token.json')
SHEET_ID = '1PdCmBoBQsznOx6JXvOlbD-atxQnX9wHRXiM127f109I'

def audit():
    creds = OAuthCreds.from_authorized_user_file(TOKEN_PATH, ['https://www.googleapis.com/auth/spreadsheets'])
    gc = gspread.authorize(creds)
    sh = gc.open_by_key(SHEET_ID)
    sheets_api = build('sheets', 'v4', credentials=creds)

    report = []
    report.append("=" * 80)
    report.append("TRADING JOURNAL - FULL SYSTEM AUDIT")
    report.append("=" * 80)

    # ========== 1. SETUP ==========
    report.append("\n## 1. SETUP SHEET")
    ws_setup = sh.worksheet("SETUP")
    all_setup = ws_setup.get_all_values()
    report.append(f"  Total rows: {len(all_setup)}")
    report.append(f"  Total cols: {len(all_setup[0]) if all_setup else 0}")
    report.append(f"  Row 1 (Headers): {all_setup[0][:34] if all_setup else 'EMPTY'}")
    report.append(f"  Row 2 (Sub-headers): {all_setup[1][:34] if len(all_setup) > 1 else 'EMPTY'}")
    
    # Count data in each block
    nhom_cp = [r[0] for r in all_setup[2:] if r[0]]
    ma_cp = [r[4] for r in all_setup[2:] if len(r) > 4 and r[4]]
    nhom_ps = [r[10] for r in all_setup[2:] if len(r) > 10 and r[10]]
    ma_ps = [r[14] for r in all_setup[2:] if len(r) > 14 and r[14]]
    chien_luoc = [r[20] for r in all_setup[2:] if len(r) > 20 and r[20]]
    tam_ly = [r[25] for r in all_setup[2:] if len(r) > 25 and r[25]]
    loai_lenh = [r[30] for r in all_setup[2:] if len(r) > 30 and r[30]]
    
    report.append(f"  Block NHÓM NGÀNH: {len(nhom_cp)} items -> {nhom_cp}")
    report.append(f"  Block MÃ CỔ PHIẾU: {len(ma_cp)} items -> {ma_cp[:10]}...")
    report.append(f"  Block NHÓM PS: {len(nhom_ps)} items -> {nhom_ps}")
    report.append(f"  Block MÃ PS: {len(ma_ps)} items -> {ma_ps}")
    report.append(f"  Block CHIẾN LƯỢC: {len(chien_luoc)} items -> {chien_luoc}")
    report.append(f"  Block TÂM LÝ: {len(tam_ly)} items -> {tam_ly}")
    report.append(f"  Block LOẠI LỆNH: {len(loai_lenh)} items -> {loai_lenh}")

    # ========== 2. FORMULAS ==========
    report.append("\n## 2. FORMULAS SHEET")
    ws_formulas = sh.worksheet("FORMULAS")
    
    for cell in ['A1', 'B1', 'C1', 'D1', 'E1', 'G1', 'H1', 'M1']:
        v = ws_formulas.acell(cell).value
        report.append(f"  {cell}: {v}")
    
    for cell in ['A2', 'B2', 'C2', 'D2', 'E2', 'G2', 'H2']:
        f = ws_formulas.acell(cell, value_render_option='FORMULA').value
        v = ws_formulas.acell(cell).value
        report.append(f"  {cell} Formula: {f}")
        report.append(f"  {cell} Value: {v}")
    
    m2_f = ws_formulas.acell('M2', value_render_option='FORMULA').value
    m2_v = ws_formulas.acell('M2').value
    report.append(f"  M2 Formula: {m2_f}")
    report.append(f"  M2 Value: {m2_v}")

    # ========== 3. CONFIG ==========
    report.append("\n## 3. CONFIG SHEET")
    ws_config = sh.worksheet("CONFIG")
    all_config = ws_config.get_all_values()
    for i, row in enumerate(all_config):
        report.append(f"  Row {i+1}: {row[:11]}")
    
    # Check formats via API
    config_res = sheets_api.spreadsheets().get(
        spreadsheetId=SHEET_ID, 
        ranges=['CONFIG!C3:C8', 'CONFIG!G3:G7'],
        fields="sheets(data(rowData(values(formattedValue,effectiveFormat(numberFormat)))))"
    ).execute()
    
    report.append("  --- Format Check (C3:C8) ---")
    for sheet in config_res['sheets']:
        for data in sheet.get('data', []):
            for ri, row in enumerate(data.get('rowData', [])):
                for val in row.get('values', []):
                    fv = val.get('formattedValue', '')
                    nf = val.get('effectiveFormat', {}).get('numberFormat', {})
                    report.append(f"    Formatted: {fv} | NumFormat: {nf}")

    # ========== 4. JOURNAL ==========
    report.append("\n## 4. JOURNAL SHEET")
    ws_journal = sh.worksheet("JOURNAL")
    
    # Check all header formulas
    for cell in ['A1', 'L1', 'R1', 'S1', 'T1', 'U1']:
        f = ws_journal.acell(cell, value_render_option='FORMULA').value
        report.append(f"  {cell} Formula: {f}")
    
    # Check headers
    headers = ws_journal.row_values(1)
    report.append(f"  Headers ({len(headers)} cols): {headers}")
    
    # Check data row 2
    row2 = ws_journal.row_values(2)
    report.append(f"  Row 2 sample: {row2[:24]}")
    
    # Check data validation on key columns
    val_res = sheets_api.spreadsheets().get(
        spreadsheetId=SHEET_ID,
        ranges=['JOURNAL!C2', 'JOURNAL!D2', 'JOURNAL!E2', 'JOURNAL!F2', 'JOURNAL!G2', 'JOURNAL!V2'],
        fields="sheets(data(rowData(values(dataValidation))))"
    ).execute()
    
    col_names = ['C(Tài Sản)', 'D(Mã GD)', 'E(Vị Thế)', 'F(Loại Lệnh)', 'G(Chiến Lược)', 'V(Tâm Lý)']
    report.append("  --- Data Validation Rules ---")
    for sheet in val_res['sheets']:
        for idx, data in enumerate(sheet.get('data', [])):
            for row in data.get('rowData', []):
                for val in row.get('values', []):
                    dv = val.get('dataValidation', 'NONE')
                    report.append(f"    {col_names[idx]}: {dv}")

    # Count errors in sample data
    all_journal = ws_journal.get_all_values()
    total_rows = len([r for r in all_journal[1:] if r[3]])  # rows with Mã GD
    report.append(f"  Total data rows (with Mã GD): {total_rows}")
    
    # Check unique values in each dropdown column
    tai_san_vals = set(r[2] for r in all_journal[1:] if r[2])
    vi_the_vals = set(r[4] for r in all_journal[1:] if r[4])
    chien_luoc_vals = set(r[6] for r in all_journal[1:] if r[6])
    tam_ly_vals = set(r[21] for r in all_journal[1:] if len(r) > 21 and r[21])
    
    report.append(f"  Tài Sản values used: {tai_san_vals}")
    report.append(f"  Vị Thế values used: {vi_the_vals}")
    report.append(f"  Chiến Lược used: {chien_luoc_vals}")
    report.append(f"  Tâm Lý used: {tam_ly_vals}")
    
    # Cross-check: Are all Chiến Lược in JOURNAL also in SETUP?
    cl_in_setup = set(chien_luoc)
    cl_in_journal = chien_luoc_vals
    missing_cl = cl_in_journal - cl_in_setup
    if missing_cl:
        report.append(f"  ⚠️ CHIẾN LƯỢC in JOURNAL but NOT in SETUP: {missing_cl}")
    else:
        report.append(f"  ✅ All CHIẾN LƯỢC in JOURNAL exist in SETUP")

    # Cross-check: Mã GD
    all_ma_cp_setup = set(r[4] for r in all_setup[2:] if len(r) > 4 and r[4])
    all_ma_ps_setup = set(r[14] for r in all_setup[2:] if len(r) > 14 and r[14])
    all_ma_setup = all_ma_cp_setup | all_ma_ps_setup
    ma_gd_journal = set(r[3] for r in all_journal[1:] if r[3])
    missing_ma = ma_gd_journal - all_ma_setup
    if missing_ma:
        report.append(f"  ⚠️ MÃ GD in JOURNAL but NOT in SETUP: {missing_ma}")
    else:
        report.append(f"  ✅ All MÃ GD in JOURNAL exist in SETUP")

    # Print report
    full_report = "\n".join(report)
    print(full_report)
    return full_report

if __name__ == '__main__':
    audit()
