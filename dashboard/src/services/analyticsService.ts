
import type { Trade, TradingStats } from '../types.ts';

export interface GroupPnLItem {
  name: string;
  pnl: number;
  trades: number;
  wins: number;
  losses: number;
  winRate: number;
  avgPnL: number;
}

export interface DailyPnLItem {
  key: string;
  date: Date;
  label: string;
  pnl: number;
  trades: number;
  wins: number;
  losses: number;
}

export interface EquityTimelineItem {
  key: string;
  label: string;
  balance: number;
  pnl: number;
  trades: number;
}

export interface TradeSummary {
  netPnL: number;
  totalTrades: number;
  closedTrades: number;
  winningTrades: number;
  losingTrades: number;
  breakEvenTrades: number;
  openTrades: number;
  winRate: number;
  avgWin: number;
  avgLoss: number;
  avgPnL: number;
  profitFactor: number;
  bestTrade: Trade | null;
  worstTrade: Trade | null;
}

function parseDatePart(dateStr: string): Date | null {
  const value = String(dateStr || '').trim();
  if (!value) return null;
  const slash = value.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (slash) {
    const [, day, month, year] = slash;
    return new Date(Number(year), Number(month) - 1, Number(day));
  }
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function formatDateKey(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

function formatMonthKey(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
}

function formatYearKey(date: Date) {
  return String(date.getFullYear());
}

export class AnalyticsService {
  static parseTradeDate(trade: Trade): Date | null {
    return parseDatePart(trade.closeDate || trade.openDate);
  }

  static calculateStats(trades: Trade[]): TradingStats {
    const summary = this.summarizeTrades(trades);
    const currentBalance = trades.length > 0 ? trades[trades.length - 1].equity : 0;

    let maxDrawdown = 0;
    let peak = 0;
    trades.forEach((trade) => {
      const balance = trade.equity;
      if (balance > peak) peak = balance;
      const drawdown = peak > 0 ? (peak - balance) / peak : 0;
      if (drawdown > maxDrawdown) maxDrawdown = drawdown;
    });

    return {
      netPnL: summary.netPnL,
      currentBalance,
      totalTrades: summary.closedTrades,
      winRate: summary.winRate,
      profitFactor: summary.profitFactor,
      maxDrawdown,
      expectancy: summary.avgPnL,
      avgRR: summary.avgLoss > 0 ? summary.avgWin / summary.avgLoss : 0,
      winningTrades: summary.winningTrades,
      losingTrades: summary.losingTrades,
      breakEvenTrades: summary.breakEvenTrades,
      openTrades: summary.openTrades,
    };
  }

  static summarizeTrades(trades: Trade[]): TradeSummary {
    const closedTrades = trades.filter((trade) => trade.status !== 'Đang mở');
    // Prioritize status field; only fall back to PnL sign when status is ambiguous
    const winning = closedTrades.filter((trade) => trade.status === 'Thắng' || (trade.status !== 'Thua' && trade.status !== 'Hòa' && trade.netPnL > 0));
    const losing = closedTrades.filter((trade) => trade.status === 'Thua' || (trade.status !== 'Thắng' && trade.status !== 'Hòa' && trade.netPnL < 0));
    const breakEven = closedTrades.filter((trade) => trade.status === 'Hòa' || (trade.status !== 'Thắng' && trade.status !== 'Thua' && trade.netPnL === 0));
    const grossProfit = winning.reduce((sum, trade) => sum + Math.max(trade.netPnL, 0), 0);
    const grossLoss = Math.abs(losing.reduce((sum, trade) => sum + Math.min(trade.netPnL, 0), 0));
    const netPnL = trades.reduce((sum, trade) => sum + trade.netPnL, 0);
    const bestTrade = closedTrades.reduce<Trade | null>((best, trade) => (!best || trade.netPnL > best.netPnL ? trade : best), null);
    const worstTrade = closedTrades.reduce<Trade | null>((worst, trade) => (!worst || trade.netPnL < worst.netPnL ? trade : worst), null);

    return {
      netPnL,
      totalTrades: trades.length,
      closedTrades: closedTrades.length,
      winningTrades: winning.length,
      losingTrades: losing.length,
      breakEvenTrades: breakEven.length,
      openTrades: trades.filter((trade) => trade.status === 'Đang mở').length,
      winRate: closedTrades.length ? winning.length / closedTrades.length : 0,
      avgWin: winning.length ? grossProfit / winning.length : 0,
      avgLoss: losing.length ? grossLoss / losing.length : 0,
      avgPnL: closedTrades.length ? netPnL / closedTrades.length : 0,
      profitFactor: grossLoss > 0 ? grossProfit / grossLoss : grossProfit > 0 ? Infinity : 0,
      bestTrade,
      worstTrade,
    };
  }

  static groupPnL(trades: Trade[], getName: (trade: Trade) => string): GroupPnLItem[] {
    const map: Record<string, GroupPnLItem> = {};
    trades.forEach((trade) => {
      const name = getName(trade) || 'Không xác định';
      if (!map[name]) {
        map[name] = { name, pnl: 0, trades: 0, wins: 0, losses: 0, winRate: 0, avgPnL: 0 };
      }
      map[name].pnl += trade.netPnL;
      map[name].trades += 1;
      if (trade.netPnL > 0) map[name].wins += 1;
      if (trade.netPnL < 0) map[name].losses += 1;
    });

    return Object.values(map)
      .map((item) => ({ ...item, winRate: item.trades ? item.wins / item.trades : 0, avgPnL: item.trades ? item.pnl / item.trades : 0 }))
      .sort((left, right) => right.pnl - left.pnl);
  }

  static getDailyPnL(trades: Trade[]): DailyPnLItem[] {
    const map: Record<string, DailyPnLItem> = {};
    trades.forEach((trade) => {
      const date = this.parseTradeDate(trade);
      if (!date) return;
      const key = formatDateKey(date);
      if (!map[key]) {
        map[key] = {
          key,
          date,
          label: date.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit' }),
          pnl: 0,
          trades: 0,
          wins: 0,
          losses: 0,
        };
      }
      map[key].pnl += trade.netPnL;
      map[key].trades += 1;
      if (trade.netPnL > 0) map[key].wins += 1;
      if (trade.netPnL < 0) map[key].losses += 1;
    });
    return Object.values(map).sort((left, right) => left.date.getTime() - right.date.getTime());
  }

  static getEquityCurve(trades: Trade[]) {
    return trades.map((trade, index) => ({ name: index + 1, date: trade.closeDate || trade.openDate, balance: trade.equity }));
  }

  static getEquityTimeline(trades: Trade[], mode: 'trade' | 'day' | 'month' | 'year'): EquityTimelineItem[] {
    if (mode === 'trade') {
      return trades.map((trade, index) => ({
        key: String(index + 1),
        label: `Lệnh ${index + 1}`,
        balance: trade.equity,
        pnl: trade.netPnL + trade.cashFlow,
        trades: 1,
      }));
    }

    const map: Record<string, EquityTimelineItem> = {};
    trades.forEach((trade) => {
      const date = this.parseTradeDate(trade);
      if (!date) return;

      const key = mode === 'day' ? formatDateKey(date) : mode === 'month' ? formatMonthKey(date) : formatYearKey(date);
      const label =
        mode === 'day'
          ? date.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit' })
          : mode === 'month'
            ? date.toLocaleDateString('vi-VN', { month: '2-digit', year: 'numeric' })
            : date.toLocaleDateString('vi-VN', { year: 'numeric' });

      if (!map[key]) {
        map[key] = { key, label, balance: trade.equity, pnl: 0, trades: 0 };
      }

      map[key].pnl += trade.netPnL + trade.cashFlow;
      map[key].trades += 1;
      map[key].balance = trade.equity;
    });

    return Object.values(map).sort((left, right) => left.key.localeCompare(right.key));
  }

  static getPnLByStrategy(trades: Trade[]) {
    return this.groupPnL(trades, (trade) => trade.strategy || 'Không tên').map((item) => ({ strategy: item.name, ...item }));
  }

  static getPnLByMood(trades: Trade[]) {
    return this.groupPnL(trades, (trade) => trade.mood || 'Không ghi chú').map((item) => ({ mood: item.name, ...item }));
  }

  static getPnLBySector(trades: Trade[]) {
    return this.groupPnL(trades, (trade) => trade.sector || 'Chưa phân loại').map((item) => ({ sector: item.name, ...item }));
  }
}
