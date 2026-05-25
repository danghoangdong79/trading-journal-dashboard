
import { useEffect, useMemo, useState } from 'react';
import { ChevronLeft, ChevronRight, ExternalLink, CalendarRange, TrendingUp, TrendingDown, Target, Clock3, Flame } from 'lucide-react';
import { useApp } from '../context.tsx';
import { Card } from '../components/ui/Card.tsx';
import { TradeFilterBar } from '../components/filters/TradeFilterBar.tsx';
import { AnalyticsService } from '../services/analyticsService.ts';
import { cn, formatCurrency, formatPercent, buildSheetUrl, buildJournalRowUrl } from '../lib/utils.ts';
import { ALL_FILTER, filterTrades, getTradeFilterOptions, type TradeFilters, type TradeSelectFilterKey } from '../lib/tradeFilters.ts';
import type { Trade } from '../types.ts';

const DEFAULT_CALENDAR_FILTERS: TradeFilters = {
  account: ALL_FILTER,
  assetType: ALL_FILTER,
  symbol: ALL_FILTER,
  status: ALL_FILTER,
  strategy: ALL_FILTER,
  pnlBucket: ALL_FILTER,
  fromDate: '',
  toDate: '',
};

function dateKey(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

function compactCurrency(value: number) {
  const abs = Math.abs(value);
  const sign = value > 0 ? '+' : value < 0 ? '-' : '';
  if (abs >= 1_000_000_000) return `${sign}${(abs / 1_000_000_000).toFixed(1)}B`;
  if (abs >= 1_000_000) return `${sign}${(abs / 1_000_000).toFixed(1)}M`;
  if (abs >= 1_000) return `${sign}${(abs / 1_000).toFixed(0)}K`;
  return `${sign}${abs.toLocaleString('vi-VN')}`;
}

function formatDateLabel(date: Date) {
  return date.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

export default function Calendar() {
  const { settings, trades, availableAccounts } = useApp();
  const [filters, setFilters] = useState<TradeFilters>(DEFAULT_CALENDAR_FILTERS);
  const filterOptions = useMemo(() => getTradeFilterOptions(trades, availableAccounts), [availableAccounts, trades]);
  const calendarFilterFields = useMemo<TradeSelectFilterKey[]>(() => {
    const fields: TradeSelectFilterKey[] = ['pnlBucket'];
    if (filterOptions.accounts.length > 1) fields.unshift('account');
    if (filterOptions.assetTypes.length > 1) fields.push('assetType');
    return fields;
  }, [filterOptions.accounts.length, filterOptions.assetTypes.length]);
  const filteredTrades = useMemo(() => filterTrades(trades, filters), [filters, trades]);
  const dailyPnL = useMemo(() => AnalyticsService.getDailyPnL(filteredTrades), [filteredTrades]);
  const fallbackDate = new Date();
  const [viewDate, setViewDate] = useState(new Date(fallbackDate.getFullYear(), fallbackDate.getMonth(), 1));
  const [selectedKey, setSelectedKey] = useState(dateKey(fallbackDate));
  const [hasAutoSelectedDataMonth, setHasAutoSelectedDataMonth] = useState(false);

  const tradesByDate = useMemo(() => {
    const map: Record<string, Trade[]> = {};
    filteredTrades.forEach((trade) => {
      const date = AnalyticsService.parseTradeDate(trade);
      if (!date) return;
      const key = dateKey(date);
      map[key] ||= [];
      map[key].push(trade);
    });
    return map;
  }, [filteredTrades]);

  const dailyMap = useMemo(() => Object.fromEntries(dailyPnL.map((item) => [item.key, item])), [dailyPnL]);

  useEffect(() => {
    if (hasAutoSelectedDataMonth || dailyPnL.length === 0) return;
    const latest = dailyPnL.at(-1)!;
    setViewDate(new Date(latest.date.getFullYear(), latest.date.getMonth(), 1));
    setSelectedKey(latest.key);
    setHasAutoSelectedDataMonth(true);
  }, [dailyPnL, hasAutoSelectedDataMonth]);

  const monthDays = useMemo(() => {
    const first = new Date(viewDate.getFullYear(), viewDate.getMonth(), 1);
    const start = new Date(first);
    const mondayIndex = (first.getDay() + 6) % 7;
    start.setDate(first.getDate() - mondayIndex);
    return Array.from({ length: 42 }, (_, index) => {
      const date = new Date(start);
      date.setDate(start.getDate() + index);
      return date;
    });
  }, [viewDate]);

  const monthItems = dailyPnL.filter((item) => item.date.getFullYear() === viewDate.getFullYear() && item.date.getMonth() === viewDate.getMonth());
  const monthTrades = monthItems.flatMap((item) => tradesByDate[item.key] || []);
  const monthSummary = AnalyticsService.summarizeTrades(monthTrades);
  const monthPnl = monthItems.reduce((sum, item) => sum + item.pnl, 0);
  const winDays = monthItems.filter((item) => item.pnl > 0).length;
  const lossDays = monthItems.filter((item) => item.pnl < 0).length;
  const bestDay = monthItems.reduce<typeof monthItems[number] | undefined>((best, item) => (!best || item.pnl > best.pnl ? item : best), undefined);
  const worstDay = monthItems.reduce<typeof monthItems[number] | undefined>((worst, item) => (!worst || item.pnl < worst.pnl ? item : worst), undefined);
  const selectedDay = dailyMap[selectedKey];
  const selectedDate = selectedDay?.date || new Date(selectedKey);
  const selectedTrades = tradesByDate[selectedKey] || [];
  const selectedSummary = AnalyticsService.summarizeTrades(selectedTrades);
  const selectedFees = selectedTrades.reduce((sum, trade) => sum + trade.feesAndTaxes, 0);
  const selectedTopTrade = selectedTrades.slice().sort((a, b) => Math.abs(b.netPnL) - Math.abs(a.netPnL))[0];
  const maxAbs = Math.max(...monthItems.map((item) => Math.abs(item.pnl)), 1);
  const tradingDays = monthItems.length;
  const avgDailyPnl = tradingDays ? monthPnl / tradingDays : 0;
  const winRateMonth = monthSummary.closedTrades ? monthSummary.winningTrades / monthSummary.closedTrades : 0;
  const activeStreak = monthItems.reduce((best, item) => (item.pnl > 0 && best >= 0 ? best + 1 : item.pnl > 0 ? 1 : 0), 0);
  const monthMomentum = monthPnl >= 0 ? 'Đang đi lên' : 'Đang hồi phục';
  const monthSheetUrl = buildSheetUrl(settings.sheetId, 'JOURNAL!A1:Y2000', settings.journalGid, settings.configGid);
  const getTradeSheetUrl = (rowNumber: number) => buildJournalRowUrl(settings.sheetId, rowNumber, settings.journalGid);

  const moveMonth = (offset: number) => {
    setViewDate((current) => new Date(current.getFullYear(), current.getMonth() + offset, 1));
  };

  return (
    <div className="mx-auto max-w-[1440px] space-y-5">
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Card className="!p-4">
          <div className="flex items-start justify-between gap-3">
            <div>
              <div className="type-caption text-[10px]">PnL tháng</div>
              <div className={cn('mt-1 font-mono text-[20px] font-bold', monthPnl >= 0 ? 'text-[var(--win)]' : 'text-[var(--loss)]')}>
                {monthPnl >= 0 ? '+' : ''}{formatCurrency(monthPnl)}
              </div>
            </div>
            <div className="rounded-xl bg-[var(--accent-soft)] p-2 text-[var(--accent)]"><TrendingUp size={18} /></div>
          </div>
          <div className="mt-2 text-[11px] font-semibold text-[var(--muted)]">{monthMomentum}</div>
        </Card>
        <Card className="!p-4">
          <div className="flex items-start justify-between gap-3">
            <div>
              <div className="type-caption text-[10px]">Tỉ lệ thắng</div>
              <div className="mt-1 font-mono text-[20px] font-bold text-foreground">{formatPercent(winRateMonth)}</div>
            </div>
            <div className="rounded-xl bg-[var(--surface-soft)] p-2 text-[var(--accent)]"><Target size={18} /></div>
          </div>
          <div className="mt-2 text-[11px] font-semibold text-[var(--muted)]">{monthSummary.winningTrades}/{monthSummary.closedTrades} lệnh đã đóng</div>
        </Card>
        <Card className="!p-4">
          <div className="flex items-start justify-between gap-3">
            <div>
              <div className="type-caption text-[10px]">Số ngày có giao dịch</div>
              <div className="mt-1 font-mono text-[20px] font-bold text-foreground">{tradingDays}</div>
            </div>
            <div className="rounded-xl bg-[var(--surface-soft)] p-2 text-[var(--accent)]"><CalendarRange size={18} /></div>
          </div>
          <div className="mt-2 text-[11px] font-semibold text-[var(--muted)]">TB {formatCurrency(avgDailyPnl)}/ngày</div>
        </Card>
        <Card className="!p-4">
          <div className="flex items-start justify-between gap-3">
            <div>
              <div className="type-caption text-[10px]">Chuỗi thắng</div>
              <div className="mt-1 font-mono text-[20px] font-bold text-foreground">{activeStreak}</div>
            </div>
            <div className="rounded-xl bg-[var(--surface-soft)] p-2 text-[var(--accent)]"><Flame size={18} /></div>
          </div>
          <div className="mt-2 text-[11px] font-semibold text-[var(--muted)]">Ngày xanh liên tiếp hiện tại</div>
        </Card>
      </div>

      <TradeFilterBar
        title="Bộ lọc lịch PnL"
        filters={filters}
        options={filterOptions}
        fields={calendarFilterFields}
        onChange={(patch) => setFilters((current) => ({ ...current, ...patch }))}
        onReset={() => setFilters(DEFAULT_CALENDAR_FILTERS)}
        showDateRange
        resultCount={filteredTrades.length}
        totalCount={trades.length}
        compact
      />

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-[minmax(0,1fr)_360px] 2xl:grid-cols-[minmax(0,1fr)_390px]">
        {/* Calendar Grid */}
        <Card
          title="Lịch PnL tháng"
          subtitle="Ô ngày cho biết PnL, số lệnh và mã nổi bật; click để soi nhanh chi tiết"
          extra={
            <div className="flex items-center gap-2">
              <a
                href={monthSheetUrl}
                target={settings.sheetId ? '_blank' : '_self'}
                rel={settings.sheetId ? 'noreferrer' : undefined}
                className="inline-flex items-center gap-1.5 rounded-md border border-[var(--card-border)] px-3 py-1.5 text-[10px] font-bold uppercase text-[var(--muted)] transition-colors hover:border-[var(--accent)]/30 hover:bg-[var(--accent-soft)] hover:text-[var(--accent)]"
                title="Mở tab JOURNAL"
              >
                <ExternalLink size={13} />
                Sheet
              </a>
              <button onClick={() => moveMonth(-1)} className="rounded-md p-1.5 text-[var(--muted)] hover:bg-[var(--surface-hover)] hover:text-foreground">
                <ChevronLeft size={16} />
              </button>
              <button
                onClick={() => { const now = new Date(); setViewDate(new Date(now.getFullYear(), now.getMonth(), 1)); setSelectedKey(dateKey(now)); }}
                className="rounded-md bg-[var(--accent-soft)] px-3 py-1.5 text-[10px] font-bold uppercase text-[var(--accent)]"
              >
                Hôm nay
              </button>
              <span className="min-w-32 text-center text-[13px] font-bold text-foreground">
                Tháng {viewDate.getMonth() + 1}/{viewDate.getFullYear()}
              </span>
              <button onClick={() => moveMonth(1)} className="rounded-md p-1.5 text-[var(--muted)] hover:bg-[var(--surface-hover)] hover:text-foreground">
                <ChevronRight size={16} />
              </button>
            </div>
          }
        >
          <div className="grid grid-cols-7 overflow-hidden rounded-xl border border-[var(--card-border)]">
            {['T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'CN'].map((day) => (
              <div key={day} className="bg-[var(--surface-soft)] px-2 py-2 text-center text-[10px] font-bold uppercase text-[var(--muted)]">{day}</div>
            ))}
            {monthDays.map((date) => {
              const key = dateKey(date);
              const item = dailyMap[key];
              const dayTrades = tradesByDate[key] || [];
              const topTrade = dayTrades.slice().sort((a, b) => Math.abs(b.netPnL) - Math.abs(a.netPnL))[0];
              const isCurrentMonth = date.getMonth() === viewDate.getMonth();
              const isSelected = key === selectedKey;
              const intensity = item ? Math.max(0.12, Math.min(0.45, Math.abs(item.pnl) / maxAbs)) : 0;
              const background = item ? item.pnl >= 0 ? `rgba(16,185,129,${intensity})` : `rgba(244,63,94,${intensity})` : undefined;
              return (
                <button
                  key={key}
                  onClick={() => setSelectedKey(key)}
                  className={cn(
                    'min-h-20 border-r border-t border-[var(--card-border)] p-1.5 text-left transition-all hover:bg-[var(--surface-hover)]',
                    isSelected && 'ring-2 ring-[var(--accent)] ring-inset',
                    !isCurrentMonth && 'opacity-25'
                  )}
                  style={{ background }}
                >
                  <div className="flex items-start justify-between gap-1">
                    <span className={cn('text-[12px] font-bold', isCurrentMonth ? 'text-[var(--fg-color)]/80' : 'text-[var(--muted)]/85')}>{date.getDate()}</span>
                    {item && <span className="rounded-sm bg-[color-mix(in_srgb,var(--fg-color)_14%,transparent)] px-1 py-px text-[8px] font-bold text-[var(--fg-color)]/90">{item.trades}</span>}
                  </div>
                  {item ? (
                    <div className="mt-1.5 space-y-1">
                      <div className={cn('font-mono text-[12px] font-bold', item.pnl >= 0 ? 'text-[var(--heatmap-positive-text)]' : 'text-[var(--heatmap-negative-text)]')}>
                        {compactCurrency(item.pnl)}
                      </div>
                      {topTrade && <div className="truncate text-[9px] font-medium text-[var(--fg-color)]/72">{topTrade.symbol}</div>}
                      <div className="flex items-center justify-between text-[8px] font-semibold text-[var(--fg-color)]/68">
                        <span>{item.label}</span>
                        <span>{formatPercent(item.wins / Math.max(1, item.trades))}</span>
                      </div>
                    </div>
                  ) : (
                    <div className="mt-3 text-[8px] uppercase text-[var(--muted)]">—</div>
                  )}
                </button>
              );
            })}
          </div>
        </Card>

        {/* Sidebar */}
        <div className="space-y-4">
          <Card title={`Chi tiết ngày ${formatDateLabel(selectedDate)}`} subtitle={selectedDay ? `${selectedDay.trades} giao dịch · ${selectedSummary.winningTrades} thắng · ${selectedSummary.losingTrades} thua` : 'Không có giao dịch'}>
            {selectedDay ? (
              <div className="space-y-4">
                <div>
                  <div className="type-caption text-[10px]">Tổng PnL</div>
                  <div className={cn('mt-1 text-3xl font-mono font-bold', selectedDay.pnl >= 0 ? 'text-[var(--win)]' : 'text-[var(--loss)]')}>
                    {selectedDay.pnl >= 0 ? '+' : ''}{formatCurrency(selectedDay.pnl)}
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-2 text-[13px]">
                  <div className="rounded-lg bg-[var(--surface-soft)] p-2.5">
                    <div className="type-caption text-[10px]">Tỷ lệ thắng</div>
                    <div className="mt-0.5 font-mono font-bold text-foreground">{formatPercent(selectedSummary.winRate)}</div>
                  </div>
                  <div className="rounded-lg bg-[var(--surface-soft)] p-2.5">
                    <div className="type-caption text-[10px]">Thắng / Thua</div>
                    <div className="mt-0.5 font-mono font-bold text-foreground">{selectedSummary.winningTrades}/{selectedSummary.losingTrades}</div>
                  </div>
                  <div className="rounded-lg bg-[var(--surface-soft)] p-2.5">
                    <div className="type-caption text-[10px]">Phí & thuế</div>
                    <div className="mt-0.5 font-mono font-bold text-foreground">{formatCurrency(selectedFees)}</div>
                  </div>
                  <div className="rounded-lg bg-[var(--surface-soft)] p-2.5">
                    <div className="type-caption text-[10px]">Lệnh nổi bật</div>
                    <div className="mt-0.5 truncate font-mono font-bold text-foreground">{selectedTopTrade ? `${selectedTopTrade.symbol} ${compactCurrency(selectedTopTrade.netPnL)}` : '—'}</div>
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-2 text-[12px]">
                  <div className="rounded-lg bg-[var(--surface-soft)] p-2.5">
                    <div className="type-caption text-[10px]">Phí</div>
                    <div className="mt-0.5 font-mono font-bold text-foreground">{formatCurrency(selectedFees)}</div>
                  </div>
                  <div className="rounded-lg bg-[var(--surface-soft)] p-2.5">
                    <div className="type-caption text-[10px]">TB/lệnh</div>
                    <div className="mt-0.5 font-mono font-bold text-foreground">{formatCurrency(selectedSummary.avgPnL)}</div>
                  </div>
                  <div className="rounded-lg bg-[var(--surface-soft)] p-2.5">
                    <div className="type-caption text-[10px]">Giá trị lớn nhất</div>
                    <div className="mt-0.5 font-mono font-bold text-foreground">{selectedTopTrade ? compactCurrency(Math.abs(selectedTopTrade.netPnL)) : '—'}</div>
                  </div>
                </div>
                <div className="space-y-2">
                  {selectedTrades.map((trade) => (
                    <div key={trade.rowNumber} className="rounded-lg border border-[var(--card-border)] bg-[var(--surface-soft)] p-3 text-[13px]">
                      <div className="flex items-center justify-between gap-2">
                        <div>
                          <div className="font-semibold text-foreground">{trade.symbol}</div>
                          <div className="type-caption text-[10px]">{trade.strategy || trade.sector || 'Không ghi chú'}</div>
                        </div>
                        <div className="flex items-center gap-2">
                          <a
                            href={getTradeSheetUrl(trade.rowNumber)}
                            target={settings.sheetId ? '_blank' : '_self'}
                            rel={settings.sheetId ? 'noreferrer' : undefined}
                            className="inline-flex items-center gap-1 rounded-md border border-[var(--card-border)] px-2 py-1 text-[10px] font-bold text-[var(--muted)] transition-colors hover:border-[var(--accent)]/30 hover:bg-[var(--accent-soft)] hover:text-[var(--accent)]"
                            title={`Mở dòng ${trade.rowNumber} trên Google Sheet`}
                          >
                            Sheet
                            <ExternalLink size={11} />
                          </a>
                          <div className={cn('font-mono font-bold', trade.netPnL >= 0 ? 'text-[var(--win)]' : 'text-[var(--loss)]')}>
                            {trade.netPnL >= 0 ? '+' : ''}{formatCurrency(trade.netPnL)}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <p className="type-caption text-[13px]">Chọn một ngày trên lịch để xem chi tiết.</p>
            )}
          </Card>

          <Card title={`Thống kê tháng ${viewDate.getMonth() + 1}/${viewDate.getFullYear()}`}>
            <div className="grid grid-cols-2 gap-x-4 gap-y-2.5 text-[13px]">
              <span className="text-[var(--muted)]">PnL tháng</span>
              <span className={cn('text-right font-mono font-bold', monthPnl >= 0 ? 'text-[var(--win)]' : 'text-[var(--loss)]')}>{monthPnl >= 0 ? '+' : ''}{formatCurrency(monthPnl)}</span>
              <span className="text-[var(--muted)]">Tổng giao dịch</span>
              <span className="text-right font-mono font-bold text-foreground">{monthSummary.totalTrades}</span>
              <span className="text-[var(--muted)]">Ngày thắng</span>
              <span className="text-right font-bold text-[var(--win)]">{winDays}</span>
              <span className="text-[var(--muted)]">Ngày thua</span>
              <span className="text-right font-bold text-[var(--loss)]">{lossDays}</span>
              <span className="text-[var(--muted)]">Ngày tốt nhất</span>
              <span className="text-right font-mono font-bold text-[var(--win)]">{bestDay ? `${bestDay.label} · ${compactCurrency(bestDay.pnl)}` : '—'}</span>
              <span className="text-[var(--muted)]">Ngày xấu nhất</span>
              <span className="text-right font-mono font-bold text-[var(--loss)]">{worstDay ? `${worstDay.label} · ${compactCurrency(worstDay.pnl)}` : '—'}</span>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
