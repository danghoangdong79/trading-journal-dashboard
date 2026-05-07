import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import { defineConfig, loadEnv, type Plugin } from 'vite';

const DEFAULT_SHEET_ID = '1PdCmBoBQsznOx6JXvOlbD-atxQnX9wHRXiM127f109I';
const SHEET_RANGE = 'JOURNAL!A1:X2000';
const CASHFLOW_RANGE = 'CASHFLOW!A1:E2000';
const DEFAULT_SERVICE_ACCOUNT_FILE = 'gen-lang-client-0658622290-67f651f4974d.json';
const INITIAL_CAPITAL = 200_000_000;

interface CashFlowEvent {
  key: string;
  amount: number;
}

function parseNumber(value: unknown): number {
  if (typeof value === 'number') return Number.isFinite(value) ? value : 0;
  const raw = String(value ?? '').trim();
  if (!raw) return 0;
  const normalized = raw.replace(/\s/g, '').replace(/₫/g, '');
  const commaCount = (normalized.match(/,/g) || []).length;
  const dotCount = (normalized.match(/\./g) || []).length;
  if (commaCount > 0 && dotCount > 0) {
    if (normalized.lastIndexOf(',') > normalized.lastIndexOf('.')) {
      return Number(normalized.replace(/\./g, '').replace(',', '.')) || 0;
    }
    return Number(normalized.replace(/,/g, '')) || 0;
  }
  if (commaCount > 1) return Number(normalized.replace(/,/g, '')) || 0;
  if (dotCount > 1) return Number(normalized.replace(/\./g, '')) || 0;
  if (commaCount === 1) {
    const [left, right] = normalized.split(',');
    return right.length === 3 ? Number(left + right) || 0 : Number(normalized.replace(',', '.')) || 0;
  }
  return Number(normalized) || 0;
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
    const type = String(row[2] || '').trim().toLowerCase();
    const amount = Math.abs(parseNumber(row[3]));
    if (!amount) return;
    map[key] = (map[key] || 0) + (type.includes('rút') || type.includes('rut') ? -amount : amount);
  });
  return Object.entries(map)
    .map(([key, amount]) => ({ key, amount }))
    .sort((left, right) => left.key.localeCompare(right.key));
}

function mapRows(values: unknown[][], cashFlows: CashFlowEvent[] = []) {
  let runningEquity = INITIAL_CAPITAL;
  let cashFlowIndex = 0;
  const maxTradeKey = todayKey();
  return values.slice(1)
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
      const statusText = String(row[0] || '').trim();
      const assetText = String(row[2] || '').trim();
      const positionText = String(row[4] || '').trim();
      return {
        rowNumber: index + 2,
        status: ['Thắng', 'Thua', 'Hòa', 'Đang mở'].includes(statusText) ? statusText : 'Đang mở',
        account: String(row[1] || '').trim(),
        assetType: assetText === 'Phái sinh' ? 'Phái sinh' : 'Cổ phiếu',
        symbol: String(row[3] || '').trim(),
        position: positionText === 'SHORT' ? 'SHORT' : 'LONG',
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
    }).map((trade, index, trades) => {
      if (index === trades.length - 1) {
        const trailingCashFlow = cashFlows.slice(cashFlowIndex).reduce((sum, item) => sum + item.amount, 0);
        if (trailingCashFlow) return { ...trade, cashFlow: trade.cashFlow + trailingCashFlow, equity: trade.equity + trailingCashFlow };
      }
      return trade;
    });
}

function createJwt(serviceAccount: any) {
  const now = Math.floor(Date.now() / 1000);
  const header = Buffer.from(JSON.stringify({ alg: 'RS256', typ: 'JWT' })).toString('base64url');
  const payload = Buffer.from(JSON.stringify({
    iss: serviceAccount.client_email,
    scope: 'https://www.googleapis.com/auth/spreadsheets.readonly',
    aud: 'https://oauth2.googleapis.com/token',
    exp: now + 3600,
    iat: now,
  })).toString('base64url');
  const signature = cryptoSign(`${header}.${payload}`, serviceAccount.private_key);
  return `${header}.${payload}.${signature}`;
}

function cryptoSign(input: string, privateKey: string) {
  return crypto.createSign('RSA-SHA256').update(input).sign(privateKey, 'base64url');
}

async function getAccessToken(serviceAccount: any) {
  const jwt = createJwt(serviceAccount);
  const body = new URLSearchParams({ grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer', assertion: jwt });
  const response = await fetch('https://oauth2.googleapis.com/token', { method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, body });
  const data = await response.json();
  if (!response.ok) throw new Error(data.error_description || data.error || 'Cannot get Google access token');
  return data.access_token as string;
}

function loadServiceAccount(env: Record<string, string>) {
  const inlineJson = env.GOOGLE_SERVICE_ACCOUNT_JSON || env.KHANGHANG_SERVICE_ACCOUNT_JSON;
  if (inlineJson) return JSON.parse(inlineJson);

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
    throw new Error('Chưa cấu hình service account. Đặt GOOGLE_APPLICATION_CREDENTIALS, KHANGHANG_SERVICE_ACCOUNT_PATH hoặc GOOGLE_SERVICE_ACCOUNT_JSON để đọc Sheet riêng tư.');
  }

  return JSON.parse(fs.readFileSync(credentialsPath, 'utf8'));
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
          const headers = { Authorization: `Bearer ${token}` };
          const url = `https://sheets.googleapis.com/v4/spreadsheets/${sheetId}/values/${encodeURIComponent(SHEET_RANGE)}`;
          const cashUrl = `https://sheets.googleapis.com/v4/spreadsheets/${sheetId}/values/${encodeURIComponent(CASHFLOW_RANGE)}`;
          const [response, cashResponse] = await Promise.all([fetch(url, { headers }), fetch(cashUrl, { headers })]);
          const data = await response.json();
          const cashData = await cashResponse.json();
          if (!response.ok) throw new Error(data?.error?.message || 'Cannot read Google Sheet');
          const cashFlows = cashResponse.ok && Array.isArray(cashData.values) ? mapCashFlows(cashData.values) : [];
          const trades = mapRows(data.values || [], cashFlows);
          res.setHeader('Content-Type', 'application/json; charset=utf-8');
          res.end(JSON.stringify({ trades, source: 'google-service-account', count: trades.length }));
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
