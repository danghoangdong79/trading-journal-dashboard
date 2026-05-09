import 'dotenv/config';
import cors from 'cors';
import express from 'express';
import { GoogleAuth } from 'google-auth-library';

const SHEET_RANGE = 'JOURNAL!A1:X2000';
const CASHFLOW_RANGE = 'CASHFLOW!A1:E2000';
const FEE_CHARGES_RANGE = 'FEE_CHARGES!A1:L2000';
const CONFIG_RISK_RANGE = 'CONFIG!G3:G7';
const USERS_RANGE = 'USERS!A1:G500';
const ACCOUNT_LIST_RANGES = ['FORMULAS!I2:I200', 'SETUP!AJ2:AJ200'];
const FALLBACK_INITIAL_CAPITAL = 200_000_000;
const GOOGLE_SHEETS_VALUE_PARAMS = 'valueRenderOption=UNFORMATTED_VALUE&dateTimeRenderOption=SERIAL_NUMBER';
const GOOGLE_SHEETS_EPOCH_MS = Date.UTC(1899, 11, 30);
const MS_PER_DAY = 24 * 60 * 60 * 1000;
const PORT = Number(process.env.PORT || 8787);
const DEFAULT_SHEET_ID = process.env.KHANGHANG_SHEET_ID || '';
const ALLOWED_ORIGIN = process.env.ALLOWED_ORIGIN || 'https://journal.dahodo.com';

function normalizeText(value) {
    return String(value ?? '')
        .trim()
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '');
}

function parseNumber(value) {
    if (typeof value === 'number') return Number.isFinite(value) ? value : 0;
    const raw = String(value ?? '').trim();
    if (!raw) return 0;

    const normalized = raw.replace(/[^\d,.\-]/g, '');
    const commaCount = (normalized.match(/,/g) || []).length;
    const dotCount = (normalized.match(/\./g) || []).length;

    if (commaCount > 0 && dotCount > 0) {
        return normalized.lastIndexOf(',') > normalized.lastIndexOf('.')
            ? Number(normalized.replace(/\./g, '').replace(',', '.')) || 0
            : Number(normalized.replace(/,/g, '')) || 0;
    }

    if (commaCount > 1 && dotCount === 0) return Number(normalized.replace(/,/g, '')) || 0;
    if (dotCount > 1 && commaCount === 0) return Number(normalized.replace(/\./g, '')) || 0;

    if (commaCount === 1 && dotCount === 0) {
        const [left, right] = normalized.split(',');
        return right.length === 3 ? Number(left + right) || 0 : Number(normalized.replace(',', '.')) || 0;
    }

    return Number(normalized) || 0;
}

function parsePercent(value) {
    const parsed = parseNumber(value);
    return parsed > 1 ? parsed / 100 : parsed;
}

function googleSerialDate(value) {
    if (!Number.isFinite(value)) return null;
    return new Date(GOOGLE_SHEETS_EPOCH_MS + Math.floor(value) * MS_PER_DAY);
}

function formatDateCell(value) {
    if (typeof value === 'number') {
        const date = googleSerialDate(value);
        if (date) {
            const day = String(date.getUTCDate()).padStart(2, '0');
            const month = String(date.getUTCMonth() + 1).padStart(2, '0');
            return `${day}/${month}/${date.getUTCFullYear()}`;
        }
    }

    return String(value || '').trim();
}

function formatTimeCell(value) {
    if (typeof value === 'number' && Number.isFinite(value)) {
        const fraction = ((value % 1) + 1) % 1;
        const totalMinutes = Math.round(fraction * 24 * 60) % (24 * 60);
        const hours = String(Math.floor(totalMinutes / 60)).padStart(2, '0');
        const minutes = String(totalMinutes % 60).padStart(2, '0');
        return `${hours}:${minutes}`;
    }

    return String(value || '').trim();
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

    const isoMatch = dateValue.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/);
    if (isoMatch) {
        const [, yyyy, mm, dd] = isoMatch;
        return new Date(`${yyyy}-${mm.padStart(2, '0')}-${dd.padStart(2, '0')}T${timeValue}`);
    }

    const parsed = new Date(`${dateValue} ${timeValue}`);
    return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function normalizeStatus(value) {
    const normalized = normalizeText(value);
    if (normalized === 'thang') return 'Thắng';
    if (normalized === 'thua') return 'Thua';
    if (normalized === 'hoa') return 'Hòa';
    if (normalized === 'dang mo') return 'Đang mở';
    return 'Đang mở';
}

function normalizeAssetType(value) {
    return normalizeText(value) === 'phai sinh' ? 'Phái sinh' : 'Cổ phiếu';
}

function normalizePosition(value) {
    return normalizeText(value) === 'short' ? 'SHORT' : 'LONG';
}

function getDateKey(value) {
    const date = parseDateTime(value, '00:00');
    if (!date) return '';
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

function mapCashFlows(values = []) {
    const map = {};
    values.slice(1).forEach((row) => {
        const key = getDateKey(formatDateCell(row[0]));
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

function mapFeeCharges(values = []) {
    return values.slice(1)
        .filter((row) => Array.isArray(row) && row.some((cell) => String(cell ?? '').trim() !== ''))
        .map((row, index) => ({
            rowNumber: index + 2,
            date: formatDateCell(row[0]),
            account: String(row[2] || '').trim(),
            category: String(row[4] || 'Phí định kỳ').trim(),
            amount: Math.abs(parseNumber(row[11] ?? row[10] ?? row[9])),
            note: [String(row[3] || '').trim(), String(row[1] || '').trim()].filter(Boolean).join(' · '),
        }))
        .filter((charge) => charge.amount > 0 && charge.date);
}

function mapSheetConfig(values = []) {
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

function uniqueSortedStrings(values = []) {
    const set = new Set();
    values.forEach((value) => {
        const normalized = String(value || '').trim();
        if (!normalized) return;
        set.add(normalized);
    });
    return Array.from(set).sort((left, right) => left.localeCompare(right, 'vi'));
}

function mapAvailableAccounts(values = []) {
  return uniqueSortedStrings(
        values
            .map((row) => String(row?.[0] || '').trim())
            .filter((value) => {
                const normalized = normalizeText(value);
                return value && value !== '*' && normalized !== 'tat ca' && normalized !== 'tai khoan';
            }),
    );
}

function mapUsers(values = []) {
    return values
        .slice(1)
        .filter((row) => Array.isArray(row) && row.some((cell) => String(cell ?? '').trim() !== ''))
        .map((row, index) => ({
            rowNumber: Number.parseInt(String(row[0] || '').trim(), 10) || index + 2,
            username: String(row[1] || '').trim(),
            passwordHash: String(row[2] || '').trim(),
            role: String(row[3] || '').trim(),
            displayName: String(row[4] || '').trim(),
            status: String(row[5] || '').trim(),
            lastLoginAt: String(row[6] || '').trim(),
        }))
        .filter((user) => user.username && user.passwordHash);
}

function mapRows(values = [], cashFlows = [], initialCapital = FALLBACK_INITIAL_CAPITAL) {
    let runningEquity = initialCapital;
    let cashFlowIndex = 0;

    const trades = values
        .slice(1)
        .filter((row) => row.some((cell) => String(cell ?? '').trim() !== ''))
        .map((row, index) => {
            const netPnL = parseNumber(row[20]);
            const openDate = formatDateCell(row[7]);
            const openTime = formatTimeCell(row[8]);
            const closeDate = formatDateCell(row[9]);
            const closeTime = formatTimeCell(row[10]);
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

function loadCredentials() {
    if (process.env.GOOGLE_SERVICE_ACCOUNT_JSON) return JSON.parse(process.env.GOOGLE_SERVICE_ACCOUNT_JSON);
    return undefined;
}

async function fetchSheetValues(auth, sheetId, range) {
    const client = await auth.getClient();
    const token = await client.getAccessToken();
    const response = await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${sheetId}/values/${encodeURIComponent(range)}?${GOOGLE_SHEETS_VALUE_PARAMS}`, {
        headers: { Authorization: `Bearer ${token.token || token}` },
    });
    const data = await response.json();
    if (!response.ok) throw new Error(data?.error?.message || `Cannot read range ${range}`);
    return Array.isArray(data.values) ? data.values : [];
}

async function fetchAvailableAccounts(auth, sheetId) {
    for (const range of ACCOUNT_LIST_RANGES) {
        const values = await fetchSheetValues(auth, sheetId, range).catch(() => []);
        const accounts = mapAvailableAccounts(values);
        if (accounts.length > 0) return accounts;
    }
    return [];
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
        const forceRefresh = String(req.query.refresh || req.query.force || '') === '1';
        if (!forceRefresh && cache.key === cacheKey && cache.payload && Date.now() < cache.expiresAt) {
            return res.json({ ...cache.payload, cached: true });
        }

        const auth = new GoogleAuth({
            credentials: loadCredentials(),
            keyFile: process.env.GOOGLE_APPLICATION_CREDENTIALS,
            scopes: ['https://www.googleapis.com/auth/spreadsheets.readonly'],
        });

        const [journalValues, cashFlowValues, feeValues, configValues, userValues, availableAccounts] = await Promise.all([
            fetchSheetValues(auth, sheetId, SHEET_RANGE),
            fetchSheetValues(auth, sheetId, CASHFLOW_RANGE).catch(() => []),
            fetchSheetValues(auth, sheetId, FEE_CHARGES_RANGE).catch(() => []),
            fetchSheetValues(auth, sheetId, CONFIG_RISK_RANGE).catch(() => []),
            fetchSheetValues(auth, sheetId, USERS_RANGE).catch(() => []),
            fetchAvailableAccounts(auth, sheetId),
        ]);

        const sheetConfig = mapSheetConfig(configValues);
        const trades = mapRows(journalValues, mapCashFlows(cashFlowValues), sheetConfig?.initialCapital ?? FALLBACK_INITIAL_CAPITAL);
        const feeCharges = mapFeeCharges(feeValues);
        const users = mapUsers(userValues);

        const payload = {
            trades,
            feeCharges,
            availableAccounts,
            sheetConfig,
            users,
            source: 'vps-service-account',
            count: trades.length,
            feeChargeCount: feeCharges.length,
            userCount: users.length,
        };

        cache = { key: cacheKey, expiresAt: Date.now() + 60_000, payload };
        res.json(payload);
    } catch (error) {
        res.status(500).json({ error: error instanceof Error ? error.message : 'Unknown API error' });
    }
});

app.listen(PORT, () => {
    console.log(`Dahodo Journal API listening on :${PORT}`);
});
