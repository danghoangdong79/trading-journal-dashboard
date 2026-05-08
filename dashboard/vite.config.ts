import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import { defineConfig, loadEnv, type Plugin } from 'vite';

const DEFAULT_SHEET_ID = '1PdCmBoBQsznOx6JXvOlbD-atxQnX9wHRXiM127f109I';
const SHEET_RANGE = 'JOURNAL!A1:X2000';
const CASHFLOW_RANGE = 'CASHFLOW!A1:E2000';
const FEE_CHARGES_RANGE = 'FEE_CHARGES!A1:L2000';
const CONFIG_RISK_RANGE = 'CONFIG!G3:G7';
const ACCOUNT_LIST_RANGES = ['FORMULAS!I2:I200', 'SETUP!AJ2:AJ200'];
const DEFAULT_SERVICE_ACCOUNT_FILE = 'gen-lang-client-0658622290-67f651f4974d.json';
const FALLBACK_INITIAL_CAPITAL = 200_000_000;

interface CashFlowEvent {
  key: string;
  amount: number;
}

interface SheetRuntimeConfig {
  initialCapital: number;
  stockCapital: number;
  derivativesCapital: number;
  maxRiskPerTradePct: number;
  monthlyTargetPct: number;
  minRewardRisk: number;
}

function normalizeText(value: unknown) {
  return String(value ?? '')
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
}

function parseNumber(value: unknown): number {
  if (typeof value === 'number') return Number.isFinite(value) ? value : 0;

  const raw = String(value ?? '').trim();
  if (!raw) return 0;

  const normalized = raw.replace(/[^\d,.\-]/g, '');
  const commaCount = (normalized.match(/,/g) || []).length;
  const dotCount = (normalized.match(/\./g) || []).length;

  if (commaCount > 0 && dotCount > 0) {
    if (normalized.lastIndexOf(',') > normalized.lastIndexOf('.')) {
      return Number(normalized.replace(/\./g, '').replace(',', '.')) || 0;
    }
    return Number(normalized.replace(/,/g, '')) || 0;
  }

  if (commaCount > 1 && dotCount === 0) return Number(normalized.replace(/,/g, '')) || 0;
  if (dotCount > 1 && commaCount === 0) return Number(normalized.replace(/\./g, '')) || 0;

  if (commaCount === 1 && dotCount === 0) {
    const [left, right] = normalized.split(',');
    return right.length === 3 ? Number(left + right) || 0 : Number(normalized.replace(',', '.')) || 0;
  }

  return Number(normalized) || 0;
}

function parsePercent(value: unknown): number {
  const parsed = parseNumber(value);
  return parsed > 1 ? parsed / 100 : parsed;
}

function parseDateTime(dateStr: string, timeStr: string): Date | null {
  const dateValue = String(dateStr || '').trim();
  if (!dateValue) return null;

  const timeValue = String(timeStr || '').trim() || '00:00';
  const slashMatch = dateValue.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (slashMatch) {
    const [, dd, mm, yyyy] = slashMatch;
    return new Date(`${yyyy}-${mm.padStart(2, '0')}-${dd.padStart(2, '0')}T${timeValue}`);
  }

  const isoMatch = dateValue.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/);
  if (isoMatch) {
    const [, yyyy, mm, dd] = isoMatch;
    return new Date(`${yyyy}-${mm.padStart(2, '0')}-${dd.padStart(2, '0')}T${timeValue}`);
  }

  const parsed = new Date(`${dateValue} ${timeValue}`);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function normalizeStatus(value: unknown) {
  const normalized = normalizeText(value);
  if (normalized === 'thang') return 'Thắng';
  if (normalized === 'thua') return 'Thua';
  if (normalized === 'hoa') return 'Hòa';
  return 'Đang mở';
}

function normalizeAssetType(value: unknown) {
  return normalizeText(value) === 'phai sinh' ? 'Phái sinh' : 'Cổ phiếu';
}

function normalizePosition(value: unknown) {
  return normalizeText(value) === 'short' ? 'SHORT' : 'LONG';
}

function getDateKey(value: string) {
  const date = parseDateTime(value, '00:00');
  if (!date) return '';
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

function todayKey() {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
}

function mapCashFlows(values: unknown[][]): CashFlowEvent[] {
  const map: Record<string, number> = {};

  values.slice(1).forEach((row) => {
    const key = getDateKey(String(row[0] || '').trim());
    if (!key) return;

    const type = normalizeText(row[2]);
    const amount = Math.abs(parseNumber(row[3]));
    if (!amount) return;

    map[key] = (map[key] || 0) + (type.includes('rut') ? -amount : amount);
  });

  return Object.entries(map)
    .map(([key, amount]) => ({ key, amount }))
    .sort((left, right) => left.key.localeCompare(right.key));
}

function mapFeeCharges(values: unknown[][]) {
  return values.slice(1)
    .filter((row) => Array.isArray(row) && row.some((cell) => String(cell ?? '').trim() !== ''))
    .map((row, index) => ({
      rowNumber: index + 2,
      date: String(row[0] || '').trim(),
      account: String(row[2] || '').trim(),
      category: String(row[4] || 'Phí định kỳ').trim(),
      amount: Math.abs(parseNumber(row[11] ?? row[10] ?? row[9])),
      note: [String(row[3] || '').trim(), String(row[1] || '').trim()].filter(Boolean).join(' · '),
    }))
    .filter((charge) => charge.amount > 0 && charge.date);
}

function mapSheetConfig(values: unknown[][]): SheetRuntimeConfig | null {
  const stockCapital = parseNumber(values[0]?.[0]);
  const derivativesCapital = parseNumber(values[1]?.[0]);
  const maxRiskPerTradePct = parsePercent(values[2]?.[0]);
  const monthlyTargetPct = parsePercent(values[3]?.[0]);
  const minRewardRisk = parseNumber(values[4]?.[0]);

  if (![stockCapital, derivativesCapital, maxRiskPerTradePct, monthlyTargetPct, minRewardRisk].some((value) => value > 0)) {
    return null;
  }

  return {
    initialCapital: stockCapital + derivativesCapital,
    stockCapital,
    derivativesCapital,
    maxRiskPerTradePct,
    monthlyTargetPct,
    minRewardRisk,
  };
}

function uniqueSortedStrings(values: string[]) {
  const set = new Set<string>();
  values.forEach((value) => {
    const normalized = String(value || '').trim();
    if (normalized) set.add(normalized);
  });
  return Array.from(set).sort((left, right) => left.localeCompare(right, 'vi'));
}

function mapAvailableAccounts(values: unknown[][]) {
  return uniqueSortedStrings(
    values
      .map((row) => String(row?.[0] || '').trim())
      .filter((value) => {
        const normalized = normalizeText(value);
        return value && value !== '*' && normalized !== 'tat ca' && normalized !== 'tai khoan';
      }),
  );
}

function mapRows(values: unknown[][], cashFlows: CashFlowEvent[] = [], initialCapital = FALLBACK_INITIAL_CAPITAL) {
  let runningEquity = initialCapital;
  let cashFlowIndex = 0;
  const maxTradeKey = todayKey();

  const trades = values
    .slice(1)
    .filter((row) => row.some((cell) => String(cell ?? '').trim() !== ''))
    .filter((row) => {
      const tradeKey = getDateKey(String(row[9] || row[7] || '').trim());
      return !tradeKey || tradeKey <= maxTradeKey;
    })
    .map((row, index) => {
      const netPnL = parseNumber(row[20]);
      const openDate = String(row[7] || '').trim();
      const openTime = String(row[8] || '').trim();
      const closeDate = String(row[9] || '').trim();
      const closeTime = String(row[10] || '').trim();
      const tradeKey = getDateKey(closeDate || openDate);
      let cashFlow = 0;

      while (cashFlowIndex < cashFlows.length && (!tradeKey || cashFlows[cashFlowIndex].key <= tradeKey)) {
        cashFlow += cashFlows[cashFlowIndex].amount;
        cashFlowIndex += 1;
      }

      runningEquity += cashFlow + netPnL;

      return {
        rowNumber: index + 2,
        status: normalizeStatus(row[0]),
        account: String(row[1] || '').trim(),
        assetType: normalizeAssetType(row[2]),
        symbol: String(row[3] || '').trim(),
        position: normalizePosition(row[4]),
        orderType: String(row[5] || '').trim(),
        strategy: String(row[6] || '').trim(),
        openDate,
        openTime,
        closeDate,
        closeTime,
        holdingDays: parseNumber(row[11]),
        volume: parseNumber(row[12]),
        entryPrice: parseNumber(row[13]),
        exitPrice: parseNumber(row[14]),
        stopLoss: parseNumber(row[15]),
        takeProfit: parseNumber(row[16]),
        amplitude: parseNumber(row[17]),
        grossPnL: parseNumber(row[18]),
        feesAndTaxes: parseNumber(row[19]),
        netPnL,
        mood: String(row[21] || '').trim(),
        reviewNote: String(row[22] || '').trim(),
        sector: String(row[23] || '').trim(),
        entryDateTime: parseDateTime(openDate, openTime),
        exitDateTime: parseDateTime(closeDate, closeTime),
        cashFlow,
        equity: runningEquity,
      };
    });

  const trailingCashFlow = cashFlows.slice(cashFlowIndex).reduce((sum, item) => sum + item.amount, 0);
  if (trailingCashFlow && trades.length > 0) {
    const lastTrade = trades[trades.length - 1];
    lastTrade.cashFlow += trailingCashFlow;
    lastTrade.equity += trailingCashFlow;
  }

  return trades;
}

function createJwt(serviceAccount: { client_email: string; private_key: string }) {
  const now = Math.floor(Date.now() / 1000);
  const header = Buffer.from(JSON.stringify({ alg: 'RS256', typ: 'JWT' })).toString('base64url');
  const payload = Buffer.from(JSON.stringify({
    iss: serviceAccount.client_email,
    scope: 'https://www.googleapis.com/auth/spreadsheets.readonly',
    aud: 'https://oauth2.googleapis.com/token',
    exp: now + 3600,
    iat: now,
  })).toString('base64url');

  const signature = crypto.createSign('RSA-SHA256').update(`${header}.${payload}`).sign(serviceAccount.private_key, 'base64url');
  return `${header}.${payload}.${signature}`;
}

async function getAccessToken(serviceAccount: { client_email: string; private_key: string }) {
  const jwt = createJwt(serviceAccount);
  const body = new URLSearchParams({ grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer', assertion: jwt });
  const response = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body,
  });
  const data = await response.json();
  if (!response.ok) throw new Error(data.error_description || data.error || 'Cannot get Google access token');
  return data.access_token as string;
}

async function fetchSheetValues(token: string, sheetId: string, range: string) {
  const response = await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${sheetId}/values/${encodeURIComponent(range)}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  const data = await response.json();
  if (!response.ok) throw new Error(data?.error?.message || `Cannot read range ${range}`);
  return Array.isArray(data.values) ? data.values : [];
}

async function fetchAvailableAccounts(token: string, sheetId: string) {
  for (const range of ACCOUNT_LIST_RANGES) {
    const values = await fetchSheetValues(token, sheetId, range).catch(() => []);
    const accounts = mapAvailableAccounts(values);
    if (accounts.length > 0) return accounts;
  }
  return [];
}

function loadServiceAccount(env: Record<string, string>) {
  const inlineJson = env.GOOGLE_SERVICE_ACCOUNT_JSON || env.KHANGHANG_SERVICE_ACCOUNT_JSON;
  if (inlineJson) return JSON.parse(inlineJson) as { client_email: string; private_key: string };

  const credentialPaths = [
    env.GOOGLE_APPLICATION_CREDENTIALS,
    env.KHANGHANG_SERVICE_ACCOUNT_PATH,
    env.KHANGHANG_CREDENTIALS_PATH,
    path.resolve(__dirname, '..', 'credentials', DEFAULT_SERVICE_ACCOUNT_FILE),
    path.resolve(__dirname, '..', 'credential', DEFAULT_SERVICE_ACCOUNT_FILE),
    path.resolve(__dirname, '..', '..', 'credentials', DEFAULT_SERVICE_ACCOUNT_FILE),
    path.resolve(__dirname, '..', '..', 'credential', DEFAULT_SERVICE_ACCOUNT_FILE),
  ].filter((value): value is string => Boolean(value));

  const credentialsPath = credentialPaths.find((candidate) => fs.existsSync(candidate));
  if (!credentialsPath) {
    throw new Error('Chua cau hinh service account. Dat GOOGLE_APPLICATION_CREDENTIALS, KHANGHANG_SERVICE_ACCOUNT_PATH hoac GOOGLE_SERVICE_ACCOUNT_JSON de doc Sheet rieng tu.');
  }

  return JSON.parse(fs.readFileSync(credentialsPath, 'utf8')) as { client_email: string; private_key: string };
}

function sheetApiPlugin(env: Record<string, string>): Plugin {
  return {
    name: 'khanghang-sheet-api',
    configureServer(server) {
      server.middlewares.use('/api/trades', async (req, res) => {
        try {
          const requestUrl = new URL(req.url || '/', 'http://localhost');
          const sheetId = requestUrl.searchParams.get('sheetId') || env.KHANGHANG_SHEET_ID || env.VITE_KHANGHANG_SHEET_ID || DEFAULT_SHEET_ID;
          const serviceAccount = loadServiceAccount(env);
          const token = await getAccessToken(serviceAccount);

          const [journalValues, cashFlowValues, feeValues, configValues, availableAccounts] = await Promise.all([
            fetchSheetValues(token, sheetId, SHEET_RANGE),
            fetchSheetValues(token, sheetId, CASHFLOW_RANGE).catch(() => []),
            fetchSheetValues(token, sheetId, FEE_CHARGES_RANGE).catch(() => []),
            fetchSheetValues(token, sheetId, CONFIG_RISK_RANGE).catch(() => []),
            fetchAvailableAccounts(token, sheetId),
          ]);

          const sheetConfig = mapSheetConfig(configValues);
          const trades = mapRows(journalValues || [], mapCashFlows(cashFlowValues), sheetConfig?.initialCapital ?? FALLBACK_INITIAL_CAPITAL);
          const feeCharges = mapFeeCharges(feeValues);

          res.setHeader('Content-Type', 'application/json; charset=utf-8');
          res.end(JSON.stringify({
            trades,
            feeCharges,
            availableAccounts,
            sheetConfig,
            source: 'google-service-account',
            count: trades.length,
            feeChargeCount: feeCharges.length,
          }));
        } catch (error) {
          res.statusCode = 500;
          res.setHeader('Content-Type', 'application/json; charset=utf-8');
          res.end(JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown sheet API error' }));
        }
      });
    },
  };
}

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, '.', '');

  return {
    plugins: [sheetApiPlugin(env), react(), tailwindcss()],
    define: {
      'process.env.GEMINI_API_KEY': JSON.stringify(env.GEMINI_API_KEY),
    },
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
    },
    server: {
      hmr: process.env.DISABLE_HMR !== 'true',
    },
  };
});
