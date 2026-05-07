
import { useEffect, useMemo, useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { useApp } from '../context.tsx';
import { Card } from '../components/ui/Card.tsx';
import { AnalyticsService } from '../services/analyticsService.ts';
import { cn, formatCurrency, formatPercent } from '../lib/utils.ts';
import type { Trade } from '../types.ts';

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
  const { trades } = useApp();
  const dailyPnL = useMemo(() => AnalyticsService.getDailyPnL(trades), [trades]);
  const fallbackDate = new Date();
  const [viewDate, setViewDate] = useState(new Date(fallbackDate.getFullYear(), fallbackDate.getMonth(), 1));
  const [selectedKey, setSelectedKey] = useState(dateKey(fallbackDate));
  const [hasAutoSelectedDataMonth, setHasAutoSelectedDataMonth] = useState(false);

  const tradesByDate = useMemo(() => {
    const map: Record<string, Trade[]> = {};
    trades.forEach((trade) => {
      const date = AnalyticsService.parseTradeDate(trade);
      if (!date) return;
      const key = dateKey(date);
      map[key] ||= [];
      map[key].push(trade);
    });
    return map;
  }, [trades]);

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

  const moveMonth = (offset: number) => {
    setViewDate((current) => new Date(current.getFullYear(), current.getMonth() + offset, 1));
  };

  return (
    <div className="mx-auto max-w-[1200px] space-y-5">
      <div className="grid grid-cols-1 gap-4 2xl:grid-cols-[1fr_360px]">
        {/* Calendar Grid */}
        <Card
          title="Lịch PnL tháng"
          extra={
            <div className="flex items-center gap-2">
              <button onClick={() => moveMonth(-1)} className="rounded-md p-1.5 text-[var(--muted)] hover:bg-foreground/5 hover:text-foreground">
                <ChevronLeft size={16} />
              </button>
              <button
                onClick={() => { const now = new Date(); setViewDate(new Date(now.getFullYear(), now.getMonth(), 1)); setSelectedKey(dateKey(now)); }}
                className="rounded-md bg-[var(--accent-soft)] px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider text-[var(--accent)]"
              >
                Hôm nay
              </button>
              <span className="min-w-32 text-center text-[13px] font-bold text-foreground">
                Tháng {viewDate.getMonth() + 1}/{viewDate.getFullYear()}
              </span>
              <button onClick={() => moveMonth(1)} className="rounded-md p-1.5 text-[var(--muted)] hover:bg-foreground/5 hover:text-foreground">
                <ChevronRight size={16} />
              </button>
            </div>
          }
        >
          <div className="grid grid-cols-7 overflow-hidden rounded-lg border border-[var(--card-border)]">
            {['T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'CN'].map((day) => (
              <div key={day} className="bg-foreground/[0.03] px-2 py-2 text-center text-[10px] font-bold uppercase tracking-wider text-[var(--muted)]">{day}</div>
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
                    'min-h-20 border-r border-t border-[var(--card-border)] p-1.5 text-left transition-all hover:bg-foreground/[0.03]',
                    isSelected && 'ring-2 ring-[var(--accent)] ring-inset',
                    !isCurrentMonth && 'opacity-25'
                  )}
                  style={{ background }}
                >
                  <div className="flex items-start justify-between gap-1">
                    <span className="text-[12px] font-bold text-foreground/70">{date.getDate()}</span>
                    {item && <span className="rounded-sm bg-black/20 px-1 py-px text-[8px] font-bold text-white">{item.trades}</span>}
                  </div>
                  {item ? (
                    <div className="mt-1.5">
                      <div className={cn('font-mono text-[12px] font-bold', item.pnl >= 0 ? 'text-emerald-100' : 'text-rose-100')}>
                        {compactCurrency(item.pnl)}
                      </div>
                      {topTrade && <div className="truncate text-[9px] font-medium text-white/60">{topTrade.symbol}</div>}
                    </div>
                  ) : (
                    <div className="mt-3 text-[8px] uppercase tracking-wider text-[var(--muted)]">—</div>
                  )}
                </button>
              );
            })}
          </div>
        </Card>

        {/* Sidebar */}
        <div className="space-y-4">
          <Card title={`Chi tiết ngày ${formatDateLabel(selectedDate)}`} subtitle={selectedDay ? `${selectedDay.trades} giao dịch` : 'Không có giao dịch'}>
            {selectedDay ? (
              <div className="space-y-4">
                <div>
                  <div className="type-caption text-[10px]">Tổng PnL</div>
                  <div className={cn('mt-1 text-3xl font-mono font-bold', selectedDay.pnl >= 0 ? 'text-[var(--win)]' : 'text-[var(--loss)]')}>
                    {selectedDay.pnl >= 0 ? '+' : ''}{formatCurrency(selectedDay.pnl)}
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-2 text-[13px]">
                  <div className="rounded-lg bg-foreground/[0.03] p-2.5">
                    <div className="type-caption text-[10px]">Tỷ lệ thắng</div>
                    <div className="mt-0.5 font-mono font-bold text-foreground">{formatPercent(selectedSummary.winRate)}</div>
                  </div>
                  <div className="rounded-lg bg-foreground/[0.03] p-2.5">
                    <div className="type-caption text-[10px]">Thắng / Thua</div>
                    <div className="mt-0.5 font-mono font-bold text-foreground">{selectedSummary.winningTrades}/{selectedSummary.losingTrades}</div>
                  </div>
                  <div className="rounded-lg bg-foreground/[0.03] p-2.5">
                    <div className="type-caption text-[10px]">Phí & thuế</div>
                    <div className="mt-0.5 font-mono font-bold text-foreground">{formatCurrency(selectedFees)}</div>
                  </div>
                  <div className="rounded-lg bg-foreground/[0.03] p-2.5">
                    <div className="type-caption text-[10px]">Lệnh nổi bật</div>
                    <div className="mt-0.5 truncate font-mono font-bold text-foreground">{selectedTopTrade ? `${selectedTopTrade.symbol} ${compactCurrency(selectedTopTrade.netPnL)}` : '—'}</div>
                  </div>
                </div>
                <div className="space-y-2">
                  {selectedTrades.map((trade) => (
                    <div key={trade.rowNumber} className="rounded-lg border border-[var(--card-border)] bg-foreground/[0.02] p-3 text-[13px]">
                      <div className="flex items-center justify-between gap-2">
                        <div>
                          <div className="font-semibold text-foreground">{trade.symbol}</div>
                          <div className="type-caption text-[10px]">{trade.strategy || trade.sector || 'Không ghi chú'}</div>
                        </div>
                        <div className={cn('font-mono font-bold', trade.netPnL >= 0 ? 'text-[var(--win)]' : 'text-[var(--loss)]')}>
                          {trade.netPnL >= 0 ? '+' : ''}{formatCurrency(trade.netPnL)}
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
