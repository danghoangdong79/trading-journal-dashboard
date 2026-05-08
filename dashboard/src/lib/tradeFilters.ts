import type { Trade } from '../types.ts';
import { AnalyticsService } from '../services/analyticsService.ts';

export const ALL_FILTER = 'All';

export type PnlBucket = 'All' | 'profit' | 'loss' | 'flat' | 'open';

export type TradeSelectFilterKey =
    | 'account'
    | 'assetType'
    | 'symbol'
    | 'position'
    | 'orderType'
    | 'strategy'
    | 'status'
    | 'sector'
    | 'mood'
    | 'pnlBucket';

export interface TradeFilters {
    search?: string;
    account?: string;
    assetType?: string;
    symbol?: string;
    position?: string;
    orderType?: string;
    strategy?: string;
    status?: string;
    sector?: string;
    mood?: string;
    fromDate?: string;
    toDate?: string;
    pnlBucket?: PnlBucket | string;
}

export interface TradeFilterOptions {
    accounts: string[];
    assetTypes: string[];
    positions: string[];
    statuses: string[];
    symbols: string[];
    orderTypes: string[];
    strategies: string[];
    sectors: string[];
    moods: string[];
}

function normalizeSearch(value: unknown) {
    return String(value || '')
        .toLocaleLowerCase('vi')
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '');
}

function dateInputKey(date: Date) {
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

function tradeDateKey(trade: Trade) {
    const date = AnalyticsService.parseTradeDate(trade);
    return date ? dateInputKey(date) : '';
}

function matchesExact(filterValue: string | undefined, tradeValue: string) {
    return !filterValue || filterValue === ALL_FILTER || tradeValue === filterValue;
}

function matchesPnlBucket(filterValue: string | undefined, trade: Trade) {
    if (!filterValue || filterValue === ALL_FILTER) return true;
    if (filterValue === 'profit') return trade.netPnL > 0;
    if (filterValue === 'loss') return trade.netPnL < 0;
    if (filterValue === 'flat') return trade.status !== 'Đang mở' && trade.netPnL === 0;
    if (filterValue === 'open') return trade.status === 'Đang mở';
    return true;
}

function uniqueSortedValues(trades: Trade[], getValue: (trade: Trade) => string) {
    const values = new Set<string>();
    trades.forEach((trade) => {
        const value = getValue(trade).trim();
        if (value) values.add(value);
    });
    return Array.from(values).sort((left, right) => left.localeCompare(right, 'vi'));
}

function uniqueSortedStrings(values: string[]) {
    const set = new Set<string>();
    values.forEach((value) => {
        const normalized = String(value || '').trim();
        if (normalized) set.add(normalized);
    });
    return Array.from(set).sort((left, right) => left.localeCompare(right, 'vi'));
}

export function getTradeFilterOptions(trades: Trade[], availableAccounts: string[] = []): TradeFilterOptions {
    return {
        accounts: uniqueSortedStrings([...availableAccounts, ...trades.map((trade) => trade.account)]),
        assetTypes: uniqueSortedValues(trades, (trade) => trade.assetType),
        positions: uniqueSortedValues(trades, (trade) => trade.position),
        statuses: uniqueSortedValues(trades, (trade) => trade.status),
        symbols: uniqueSortedValues(trades, (trade) => trade.symbol),
        orderTypes: uniqueSortedValues(trades, (trade) => trade.orderType),
        strategies: uniqueSortedValues(trades, (trade) => trade.strategy),
        sectors: uniqueSortedValues(trades, (trade) => trade.sector),
        moods: uniqueSortedValues(trades, (trade) => trade.mood),
    };
}

export function filterTrades(trades: Trade[], filters: TradeFilters): Trade[] {
    const keyword = normalizeSearch(filters.search).trim();
    const fromDate = filters.fromDate || '';
    const toDate = filters.toDate || '';

    return trades.filter((trade) => {
        if (keyword) {
            const haystack = normalizeSearch([
                trade.account,
                trade.assetType,
                trade.symbol,
                trade.position,
                trade.orderType,
                trade.strategy,
                trade.status,
                trade.sector,
                trade.mood,
                trade.reviewNote,
                trade.openDate,
                trade.closeDate,
            ].join(' '));

            if (!haystack.includes(keyword)) return false;
        }

        if (!matchesExact(filters.account, trade.account)) return false;
        if (!matchesExact(filters.assetType, trade.assetType)) return false;
        if (!matchesExact(filters.symbol, trade.symbol)) return false;
        if (!matchesExact(filters.position, trade.position)) return false;
        if (!matchesExact(filters.orderType, trade.orderType)) return false;
        if (!matchesExact(filters.strategy, trade.strategy)) return false;
        if (!matchesExact(filters.status, trade.status)) return false;
        if (!matchesExact(filters.sector, trade.sector)) return false;
        if (!matchesExact(filters.mood, trade.mood)) return false;
        if (!matchesPnlBucket(filters.pnlBucket, trade)) return false;

        if (fromDate || toDate) {
            const key = tradeDateKey(trade);
            if (!key) return false;
            if (fromDate && key < fromDate) return false;
            if (toDate && key > toDate) return false;
        }

        return true;
    });
}

export function countActiveTradeFilters(filters: TradeFilters) {
    return Object.values(filters).filter((value) => {
        if (typeof value !== 'string') return Boolean(value);
        return value.trim() !== '' && value !== ALL_FILTER;
    }).length;
}
