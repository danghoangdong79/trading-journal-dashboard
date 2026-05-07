import 'dotenv/config';
import cors from 'cors';
import express from 'express';
import { GoogleAuth } from 'google-auth-library';

const SHEET_RANGE = 'JOURNAL!A1:X2000';
const CASHFLOW_RANGE = 'CASHFLOW!A1:E2000';
const INITIAL_CAPITAL = 200_000_000;
const PORT = Number(process.env.PORT || 8787);
const DEFAULT_SHEET_ID = process.env.KHANGHANG_SHEET_ID || '';
const ALLOWED_ORIGIN = process.env.ALLOWED_ORIGIN || 'https://journal.dahodo.com';

function parseNumber(value) {
    if (typeof value === 'number') return Number.isFinite(value) ? value : 0;
    const raw = String(value ?? '').trim();
    if (!raw) return 0;
    const normalized = raw.replace(/\s/g, '').replace(/₫/g, '');
    const commaCount = (normalized.match(/,/g) || []).length;
    const dotCount = (normalized.match(/\./g) || []).length;
    if (commaCount > 0 && dotCount > 0) {
        return normalized.lastIndexOf(',') > normalized.lastIndexOf('.')
            ? Number(normalized.replace(/\./g, '').replace(',', '.')) || 0
            : Number(normalized.replace(/,/g, '')) || 0;
    }
    if (commaCount > 1) return Number(normalized.replace(/,/g, '')) || 0;
    if (dotCount > 1) return Number(normalized.replace(/\./g, '')) || 0;
    if (commaCount === 1) {
        const [left, right] = normalized.split(',');
        return right.length === 3 ? Number(left + right) || 0 : Number(normalized.replace(',', '.')) || 0;
    }
    return Number(normalized) || 0;
}

function parseDateTime(dateStr, timeStr) {
    const dateValue = String(dateStr || '').trim();
    if (!dateValue) return null;
    const timeValue = String(timeStr || '').trim() || '00:00';
    const slashMatch = dateValue.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
    if (slashMatch) {
        const [, dd, mm, yyyy] = slashMatch;
        return new Date(`${yyyy}-${mm.padStart(2, '0')}-${dd.padStart(2, '0')}T${timeValue}`);
    }
    const parsed = new Date(`${dateValue} ${timeValue}`);
    return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function getDateKey(value) {
    const date = parseDateTime(value, '00:00');
    if (!date) return '';
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

function todayKey() {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
}

function mapCashFlows(values = []) {
    const map = {};
    values.slice(1).forEach((row) => {
        const key = getDateKey(String(row[0] || '').trim());
        if (!key) return;
        const type = String(row[2] || '').trim().toLowerCase();
        const amount = Math.abs(parseNumber(row[3]));
        if (!amount) return;
        map[key] = (map[key] || 0) + (type.includes('rút') || type.includes('rut') ? -amount : amount);
    });
    return Object.entries(map).map(([key, amount]) => ({ key, amount })).sort((a, b) => a.key.localeCompare(b.key));
}

function mapRows(values = [], cashFlows = []) {
    let runningEquity = INITIAL_CAPITAL;
    let cashFlowIndex = 0;
    const maxTradeKey = todayKey();
    const rows = values.slice(1).filter((row) => row.some((cell) => String(cell ?? '').trim() !== ''));
    return rows
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
        });
}

function loadCredentials() {
    if (process.env.GOOGLE_SERVICE_ACCOUNT_JSON) return JSON.parse(process.env.GOOGLE_SERVICE_ACCOUNT_JSON);
    return undefined;
}

async function fetchSheetValues(auth, sheetId, range) {
    const client = await auth.getClient();
    const token = await client.getAccessToken();
    const response = await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${sheetId}/values/${encodeURIComponent(range)}`, {
        headers: { Authorization: `Bearer ${token.token || token}` },
    });
    const data = await response.json();
    if (!response.ok) throw new Error(data?.error?.message || 'Cannot read Google Sheet');
    return Array.isArray(data.values) ? data.values : [];
}

const app = express();
app.disable('x-powered-by');
app.use(cors({ origin: ALLOWED_ORIGIN, credentials: false }));

let cache = { key: '', expiresAt: 0, payload: null };

app.get('/api/health', (_req, res) => {
    res.json({ ok: true, service: 'dahodo-journal-api' });
});

app.get('/api/trades', async (req, res) => {
    try {
        const sheetId = String(req.query.sheetId || DEFAULT_SHEET_ID).trim();
        if (!sheetId) return res.status(400).json({ error: 'Missing sheetId' });

        const cacheKey = sheetId;
        if (cache.key === cacheKey && cache.payload && Date.now() < cache.expiresAt) {
            return res.json({ ...cache.payload, cached: true });
        }

        const auth = new GoogleAuth({
            credentials: loadCredentials(),
            keyFile: process.env.GOOGLE_APPLICATION_CREDENTIALS,
            scopes: ['https://www.googleapis.com/auth/spreadsheets.readonly'],
        });
        const [journalValues, cashFlowValues] = await Promise.all([
            fetchSheetValues(auth, sheetId, SHEET_RANGE),
            fetchSheetValues(auth, sheetId, CASHFLOW_RANGE).catch(() => []),
        ]);
        const trades = mapRows(journalValues, mapCashFlows(cashFlowValues));
        const payload = { trades, source: 'vps-service-account', count: trades.length };
        cache = { key: cacheKey, expiresAt: Date.now() + 60_000, payload };
        res.json(payload);
    } catch (error) {
        res.status(500).json({ error: error instanceof Error ? error.message : 'Unknown API error' });
    }
});

app.listen(PORT, () => {
    console.log(`Dahodo Journal API listening on :${PORT}`);
});