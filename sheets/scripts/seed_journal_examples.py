"""Seed a curated JOURNAL test set without touching formula columns.

This script only writes manual-input columns:
B, C, D, E, F, G, H, I, J, K, M, N, O, P, Q, V, W.
It intentionally leaves auto/formula columns alone:
A, L, R, S, T, U, X.
"""

from __future__ import annotations

import os
import sys
from dataclasses import dataclass
from datetime import date, timedelta

sys.path.insert(0, os.path.dirname(__file__))

import gspread
from google.oauth2.credentials import Credentials as OAuthCreds
from google.oauth2.service_account import Credentials as ServiceAccountCreds

from settings import CREDENTIALS_DIR, SCOPES, SHEET_ID as CONFIGURED_SHEET_ID, TOKEN_PATH as CONFIGURED_TOKEN_PATH
from utils import get_credentials_path

TOKEN_PATH = str(CONFIGURED_TOKEN_PATH)
SHEET_ID = CONFIGURED_SHEET_ID


@dataclass(frozen=True)
class JournalSample:
    account: str
    asset_type: str
    symbol: str
    position: str
    order_type: str
    strategy: str
    open_date: str
    open_time: str
    close_date: str
    close_time: str
    volume: float
    entry_price: float
    exit_price: float | str
    stop_loss: float
    take_profit: float
    mood: str
    review_note: str


def get_gc():
    if os.path.exists(TOKEN_PATH):
        creds = OAuthCreds.from_authorized_user_file(TOKEN_PATH, SCOPES)
    else:
        creds = ServiceAccountCreds.from_service_account_file(get_credentials_path(), scopes=SCOPES)
    return gspread.authorize(creds)


def build_rows() -> list[JournalSample]:
    """Generate a deterministic, dropdown-safe stress-test data set."""
    accounts = ["D920568", "T271298"]
    stocks = [
        ("VCB", 92.0), ("BID", 46.0), ("CTG", 35.0), ("TCB", 43.0), ("VPB", 21.5),
        ("MBB", 22.5), ("ACB", 25.0), ("STB", 31.0), ("VHM", 42.0), ("VIC", 48.0),
        ("DIG", 27.0), ("DXG", 16.0), ("KBC", 29.0), ("IDC", 55.0), ("SSI", 35.0),
        ("VND", 22.0), ("VCI", 46.0), ("HCM", 29.0), ("HPG", 28.0), ("HSG", 22.0),
        ("NKG", 20.0), ("MWG", 58.0), ("FRT", 150.0), ("PNJ", 88.0), ("VNM", 69.0),
        ("MSN", 75.0), ("SAB", 58.0), ("GAS", 83.0), ("PVD", 30.0), ("PVS", 38.0),
        ("POW", 15.0), ("DGC", 96.0), ("DPM", 34.0), ("ANV", 32.0), ("VHC", 72.0),
        ("HVN", 22.0), ("VJC", 104.0), ("BMP", 92.0), ("GEX", 25.0), ("REE", 64.0),
        ("KDH", 37.0), ("PDR", 24.0), ("HDB", 27.0), ("EIB", 19.0), ("PLX", 40.0),
        ("BCM", 67.0), ("NVL", 18.0), ("FPT", 119.0),
    ]
    derivatives = [("VN30F1M", 1320.0), ("VN30F2M", 1324.0), ("VN30F1Q", 1330.0), ("VN30F2Q", 1336.0), ("41I1G5000", 9.8)]
    order_types = ["Lệnh thường", "ATO", "ATC", "MTL", "MOK", "MAK", "PLO"]
    strategies = ["Lướt sóng T0", "Phá nền", "Hồi kỹ thuật", "Bắt dao rơi", "Đầu tư giá trị", "Theo dòng tiền", "Ăn cổ tức", "Theo tin tức"]
    moods = ["Bình tĩnh", "Kỷ luật", "FOMO", "Sợ hãi", "Trả thù", "Thiếu kiên nhẫn", "Quá tự tin", "Do dự", "Hưng phấn", "Kỳ vọng", "Tuân thủ kỷ luật", "Tức giận", "Tiếc nuối", "Bình thường", "Tự tin", "Thoải mái"]
    notes = [
        "Tuân thủ đúng kế hoạch vào/ra", "Vào lệnh hơi sớm, cần đợi xác nhận", "Quản trị rủi ro tốt",
        "Không dời stoploss khi thị trường nhiễu", "Chốt một phần khi đạt vùng mục tiêu", "Setup đẹp nhưng thanh khoản yếu",
        "Có tin hỗ trợ nhưng phản ứng giá không mạnh", "Cần giảm size ở nhịp biến động cao", "Giữ lệnh theo trend chính",
        "Thoát lệnh khi mất vùng hỗ trợ", "Không FOMO sau nến kéo mạnh", "Review lại điểm vào sau phiên",
    ]

    rows: list[JournalSample] = []
    start_date = date(2025, 1, 2)
    for i in range(500):
        is_derivative = i % 4 == 0 or i % 11 == 0
        is_open = i % 17 == 0
        is_breakeven = i % 23 == 0
        is_loss = i % 5 in (1, 4)
        account = accounts[i % len(accounts)]
        position = "SHORT" if i % 6 in (2, 5) else "LONG"
        order_type = order_types[i % len(order_types)]
        strategy = strategies[(i * 3) % len(strategies)]
        mood = moods[(i * 5) % len(moods)]
        open_date = start_date + timedelta(days=i)
        hold_days = 0 if is_derivative else (1 + (i * 7) % 28)
        close_date = "" if is_open else (open_date + timedelta(days=hold_days)).isoformat()
        open_time = f"{9 + (i % 5):02d}:{15 + (i * 7) % 40:02d}:00"
        close_time = "" if is_open else f"{10 + (i % 5):02d}:{5 + (i * 11) % 50:02d}:00"

        if is_derivative:
            symbol, base = derivatives[i % len(derivatives)]
            asset_type = "Phái sinh"
            volume = 1 + (i * 2) % 8
            drift = ((i % 31) - 15) * 0.8
            entry = round(base + drift, 1)
            # With current CONFIG, a 0.1 favorable point move offsets round-trip futures fees,
            # producing real "Hòa" rows after formula columns calculate net P/L.
            move = 0.1 if is_breakeven else (0.8 + (i % 8) * 0.35)
        else:
            symbol, base = stocks[i % len(stocks)]
            asset_type = "Cổ phiếu"
            volume = 100 * (2 + (i * 5) % 18)
            drift = ((i % 21) - 10) * base * 0.006
            entry = round(base + drift, 2)
            move = 0 if is_breakeven else round(entry * (0.003 + (i % 7) * 0.0015), 2)

        signed_move = -move if is_loss else move
        if position == "SHORT":
            exit_price = "" if is_open else round(entry - signed_move, 2)
            stop_loss = round(entry + max(move * 0.8, entry * 0.01), 2)
            take_profit = round(entry - max(move * 1.6, entry * 0.018), 2)
        else:
            exit_price = "" if is_open else round(entry + signed_move, 2)
            stop_loss = round(entry - max(move * 0.8, entry * 0.01), 2)
            take_profit = round(entry + max(move * 1.6, entry * 0.018), 2)

        rows.append(
            JournalSample(
                account, asset_type, symbol, position, order_type, strategy,
                open_date.isoformat(), open_time, close_date, close_time,
                volume, entry, exit_price, stop_loss, take_profit,
                mood, notes[i % len(notes)],
            )
        )
    return rows

def to_row(sample: JournalSample) -> list[object]:
    return [
        sample.account,
        sample.asset_type,
        sample.symbol,
        sample.position,
        sample.order_type,
        sample.strategy,
        sample.open_date,
        sample.open_time,
        sample.close_date,
        sample.close_time,
        sample.volume,
        sample.entry_price,
        sample.exit_price,
        sample.stop_loss,
        sample.take_profit,
        sample.mood,
        sample.review_note,
    ]


def main() -> None:
    gc = get_gc()
    sh = gc.open_by_key(SHEET_ID)
    ws = sh.worksheet("JOURNAL")

    samples = build_rows()
    rows = [to_row(sample) for sample in samples]

    # Clear only the manual-input range for test data.
    ws.batch_clear(["B2:K1000", "M2:Q1000", "V2:W1000"])

    # Leave formula columns untouched.
    ws.update(range_name=f"B2:K{len(rows) + 1}", values=[r[:10] for r in rows], value_input_option="USER_ENTERED")
    ws.update(range_name=f"M2:Q{len(rows) + 1}", values=[r[10:15] for r in rows], value_input_option="USER_ENTERED")
    ws.update(range_name=f"V2:W{len(rows) + 1}", values=[r[15:17] for r in rows], value_input_option="USER_ENTERED")

    try:
        cashflow_ws = sh.worksheet("CASHFLOW")
    except gspread.exceptions.WorksheetNotFound:
        cashflow_ws = sh.add_worksheet(title="CASHFLOW", rows=2000, cols=5)

    cashflow_ws.clear()
    cashflow_ws.update(
        range_name="A1:E4",
        values=[
            ["Ngày", "Tài khoản", "Loại", "Số tiền", "Ghi chú"],
            ["2025-04-01", "D920568", "Nạp", 50000000, "Bổ sung vốn kiểm thử"],
            ["2025-09-01", "T271298", "Nạp", 30000000, "Tăng sức mua giai đoạn 2"],
            ["2026-02-01", "D920568", "Rút", 20000000, "Rút lợi nhuận một phần"],
        ],
        value_input_option="USER_ENTERED",
    )

    print(f"Seeded {len(rows)} JOURNAL sample rows without touching formula columns.")


if __name__ == "__main__":
    main()