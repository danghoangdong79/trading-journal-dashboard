import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatCurrency(value: number) {
  return new Intl.NumberFormat('vi-VN', {
    style: 'currency',
    currency: 'VND',
  }).format(value);
}

export function formatCompactNumber(value: number) {
  return new Intl.NumberFormat('vi-VN', {
    notation: 'compact',
    maximumFractionDigits: 1,
  }).format(value);
}

export function formatPercent(value: number) {
  return new Intl.NumberFormat('vi-VN', {
    style: 'percent',
    minimumFractionDigits: 2,
  }).format(value);
}

// ── Google Sheet URL helpers ────────────────────────────────────────────

const DEFAULT_JOURNAL_GID = '913303097';
const DEFAULT_CONFIG_GID = '0';

/** Map a range like "JOURNAL!A5:X5" or "CONFIG!E1:G7" to the correct gid + cell range */
function resolveGid(range: string, journalGid?: string, configGid?: string): { gid: string; cellRange: string } {
  const [tabName, cellRange] = range.includes('!') ? range.split('!') : ['JOURNAL', range];
  const tab = tabName.toUpperCase();
  const gid = tab === 'CONFIG'
    ? (configGid || DEFAULT_CONFIG_GID)
    : (journalGid || DEFAULT_JOURNAL_GID);
  return { gid, cellRange: cellRange || 'A1' };
}

/**
 * Build a Google Sheets URL that navigates to the correct tab AND cell range.
 * @param sheetId  The spreadsheet ID
 * @param range    e.g. "JOURNAL!A5:X5" or "CONFIG!E1:G7"
 * @param journalGid  Optional override from settings
 * @param configGid   Optional override from settings
 */
export function buildSheetUrl(sheetId: string, range: string, journalGid?: string, configGid?: string): string {
  if (!sheetId) return '/settings';
  const { gid, cellRange } = resolveGid(range, journalGid, configGid);
  return `https://docs.google.com/spreadsheets/d/${sheetId}/edit#gid=${gid}&range=${encodeURIComponent(cellRange)}`;
}

/**
 * Build a URL to a specific JOURNAL row.
 */
export function buildJournalRowUrl(sheetId: string, rowNumber: number, journalGid?: string): string {
  if (!sheetId) return '/settings';
  const gid = journalGid || DEFAULT_JOURNAL_GID;
  return `https://docs.google.com/spreadsheets/d/${sheetId}/edit#gid=${gid}&range=A${rowNumber}:X${rowNumber}`;
}
