"""Shared runtime settings for Google Sheets scripts."""
import argparse
import os
from pathlib import Path

ROOT_DIR = Path(__file__).resolve().parents[2]
CREDENTIALS_DIR = Path(os.getenv("KHANGHANG_CREDENTIALS_DIR", ROOT_DIR / "credential"))
TEMPLATES_DIR = ROOT_DIR / "sheets" / "templates"

DEFAULT_SHEET_ID = "1PdCmBoBQsznOx6JXvOlbD-atxQnX9wHRXiM127f109I"
DEFAULT_SERVICE_ACCOUNT_EMAIL = "qhp-bot@gen-lang-client-0658622290.iam.gserviceaccount.com"

SHEET_ID = os.getenv("KHANGHANG_SHEET_ID", DEFAULT_SHEET_ID)
TOKEN_PATH = Path(os.getenv("KHANGHANG_TOKEN_PATH", CREDENTIALS_DIR / "token.json"))
SERVICE_ACCOUNT_EMAIL = os.getenv("KHANGHANG_SERVICE_ACCOUNT_EMAIL", DEFAULT_SERVICE_ACCOUNT_EMAIL)

SCOPES = [
    "https://www.googleapis.com/auth/spreadsheets",
    "https://www.googleapis.com/auth/drive",
]


def require_confirmation(action, sheet_id=SHEET_ID, confirm=False, dry_run=False):
    if dry_run:
        print(f"[DRY RUN] {action} on sheet {sheet_id}")
        return False
    if not confirm:
        raise SystemExit(
            f"Refusing to run '{action}' on sheet {sheet_id}. "
            "Re-run with --confirm after verifying KHANGHANG_SHEET_ID."
        )
    return True


def add_safety_args(parser: argparse.ArgumentParser):
    parser.add_argument("--sheet-id", default=SHEET_ID, help="Target Google Sheet ID")
    parser.add_argument("--confirm", action="store_true", help="Allow write/destructive actions")
    parser.add_argument("--dry-run", action="store_true", help="Print target action without writing")
    return parser

