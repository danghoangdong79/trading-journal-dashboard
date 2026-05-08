import { useMemo, useState } from 'react';
import { Activity, ExternalLink, Target, TrendingDown, TrendingUp } from 'lucide-react';
import { useApp } from '../context.tsx';
import { Card, KpiCard } from '../components/ui/Card.tsx';
import { cn, formatCurrency, formatPercent, buildJournalRowUrl } from '../lib/utils.ts';
import { STATUS_CONFIG } from '../constants.ts';
import { AnalyticsService } from '../services/analyticsService.ts';
import { TradeFilterBar } from '../components/filters/TradeFilterBar.tsx';
import { ALL_FILTER, filterTrades, getTradeFilterOptions, type TradeFilters, type TradeSelectFilterKey } from '../lib/tradeFilters.ts';

const DEFAULT_JOURNAL_FILTERS: TradeFilters = {
  search: '',
  account: ALL_FILTER,
  assetType: ALL_FILTER,
  symbol: ALL_FILTER,
  position: ALL_FILTER,
  orderType: ALL_FILTER,
  status: ALL_FILTER,
  strategy: ALL_FILTER,
  sector: ALL_FILTER,
  mood: ALL_FILTER,
  pnlBucket: ALL_FILTER,
  fromDate: '',
  toDate: '',
};

export default function Journal() {
  const { settings, trades, availableAccounts, isLoading } = useApp();
  const [filters, setFilters] = useState<TradeFilters>(DEFAULT_JOURNAL_FILTERS);

  const filterOptions = useMemo(() => getTradeFilterOptions(trades, availableAccounts), [availableAccounts, trades]);
  const journalFilterFields = useMemo<TradeSelectFilterKey[]>(() => {
    const fields: TradeSelectFilterKey[] = [];
    if (filterOptions.accounts.length > 1) fields.push('account');
    if (filterOptions.assetTypes.length > 1) fields.push('assetType');
    if (filterOptions.statuses.length > 1) fields.push('status');
    if (filterOptions.strategies.length > 1) fields.push('strategy');
    return fields;
  }, [filterOptions.accounts.length, filterOptions.assetTypes.length, filterOptions.statuses.length, filterOptions.strategies.length]);
  const filteredAsc = useMemo(() => filterTrades(trades, filters), [filters, trades]);

  const filteredTrades = useMemo(() => filteredAsc.slice().reverse(), [filteredAsc]);
  const summary = useMemo(() => AnalyticsService.summarizeTrades(filteredAsc), [filteredAsc]);
  const topSymbol = useMemo(() => AnalyticsService.groupPnL(filteredAsc, (trade) => trade.symbol)[0], [filteredAsc]);
  const getSheetRowUrl = (rowNumber: number) => buildJournalRowUrl(settings.sheetId, rowNumber, settings.journalGid);
  const updateFilters = (patch: Partial<TradeFilters>) => setFilters((current) => ({ ...current, ...patch }));

  return (
    <div className="mx-auto max-w-[1280px] space-y-5">
      <TradeFilterBar
        filters={filters}
        options={filterOptions}
        fields={journalFilterFields}
        onChange={updateFilters}
        onReset={() => setFilters(DEFAULT_JOURNAL_FILTERS)}
        showSearch
        showDateRange
        searchPlaceholder="Tìm mã, chiến lược, nhóm ngành hoặc ghi chú..."
        resultCount={filteredAsc.length}
        totalCount={trades.length}
        title="Bộ lọc nhật ký"
      />

      {/* KPI Row */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-5">
        <KpiCard title="Lãi/Lỗ theo lọc" value={formatCurrency(summary.netPnL)} icon={Activity} delta={`${summary.totalTrades} lệnh`} deltaType={summary.netPnL >= 0 ? 'positive' : 'negative'} isLoading={isLoading} description="Tổng lãi/lỗ ròng của các giao dịch đang khớp với bộ lọc hiện tại." />
        <KpiCard title="Tỉ lệ thắng" value={formatPercent(summary.winRate)} icon={Target} delta={`${summary.winningTrades}/${summary.closedTrades} đóng`} isLoading={isLoading} description="Tỉ lệ lệnh thắng trên tổng số lệnh đã đóng trong kết quả lọc." />
        <KpiCard title="Lãi TB" value={formatCurrency(summary.avgWin)} icon={TrendingUp} delta={`${summary.winningTrades} lệnh thắng`} deltaType="positive" isLoading={isLoading} description="Lãi trung bình của các lệnh thắng trong kết quả lọc." />
        <KpiCard title="Lỗ TB" value={formatCurrency(summary.avgLoss)} icon={TrendingDown} delta={`${summary.losingTrades} lệnh thua`} deltaType="negative" isLoading={isLoading} description="Lỗ trung bình của các lệnh thua trong kết quả lọc." />
        <KpiCard title="Mã nổi bật" value={topSymbol?.name || '—'} icon={Activity} delta={topSymbol ? formatCurrency(topSymbol.pnl) : 'Chưa có'} deltaType={(topSymbol?.pnl || 0) >= 0 ? 'positive' : 'negative'} isLoading={isLoading} description="Mã giao dịch có tổng lãi/lỗ cao nhất trong kết quả lọc." />
      </div>

      {/* Trade Table */}
      <Card className="overflow-hidden !p-0">
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-left whitespace-nowrap">
            <thead className="border-b border-[var(--card-border)] bg-[var(--surface-soft)]">
              <tr className="type-title text-[10px]">
                <th className="px-4 py-3 font-semibold sm:px-5">Trạng thái</th>
                <th className="px-4 py-3 font-semibold sm:px-5">Mã / Tài sản</th>
                <th className="px-4 py-3 font-semibold text-center sm:px-5">Giá vào / đóng</th>
                <th className="px-4 py-3 font-semibold text-center sm:px-5">Khối lượng</th>
                <th className="px-4 py-3 font-semibold text-right sm:px-5">Lãi/lỗ ròng</th>
                <th className="px-4 py-3 font-semibold text-center sm:px-5">Chiến lược</th>
                <th className="px-4 py-3 font-semibold text-center sm:px-5">Ngày mở</th>
                <th className="px-4 py-3 font-semibold text-center sm:px-5">Sheet</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--card-border)]">
              {isLoading ? (
                Array.from({ length: 5 }).map((_, index) => (
                  <tr key={index} className="animate-pulse">
                    <td colSpan={8} className="px-4 py-5 sm:px-5"><div className="h-4 w-full rounded bg-[var(--surface-strong)]" /></td>
                  </tr>
                ))
              ) : filteredTrades.length > 0 ? (
                filteredTrades.map((trade) => {
                  const statusInfo = STATUS_CONFIG[trade.status];
                  return (
                    <tr key={trade.rowNumber} className="group transition-colors hover:bg-[var(--surface-hover)]">
                      <td className="px-4 py-3 sm:px-5">
                        <div className={cn('inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-[10px] font-bold', statusInfo?.color || 'bg-gray-500/10 text-[var(--muted)]')}>
                          {statusInfo?.icon && <statusInfo.icon size={10} />}{trade.status}
                        </div>
                      </td>
                      <td className="px-4 py-3 sm:px-5">
                        <div className="flex flex-col">
                          <span className="font-semibold text-foreground">{trade.symbol}</span>
                          <span className="type-caption text-[10px] uppercase">{trade.assetType} · {trade.position}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-center sm:px-5">
                        <div className="flex items-center justify-center gap-1.5">
                          <span className="font-mono text-[12px] text-[var(--muted)]">{trade.entryPrice.toLocaleString('vi-VN')}</span>
                          <span className="text-[var(--card-border)]">→</span>
                          <span className="font-mono text-[12px] text-foreground">{trade.exitPrice > 0 ? trade.exitPrice.toLocaleString('vi-VN') : '---'}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-center font-mono text-[12px] text-foreground sm:px-5">{trade.volume.toLocaleString('vi-VN')}</td>
                      <td className={cn('px-4 py-3 text-right font-mono text-[12px] font-bold sm:px-5', trade.netPnL >= 0 ? 'text-[var(--win)]' : 'text-[var(--loss)]')}>{trade.netPnL >= 0 ? '+' : ''}{formatCurrency(trade.netPnL)}</td>
                      <td className="px-4 py-3 text-center sm:px-5"><span className="rounded-md bg-[var(--surface-soft)] px-2 py-0.5 text-[11px] text-[var(--muted)]">{trade.strategy || '—'}</span></td>
                      <td className="px-4 py-3 text-center font-mono text-[10px] text-[var(--muted)] sm:px-5">{trade.openDate} {trade.openTime}</td>
                      <td className="px-4 py-3 text-center sm:px-5">
                        <a
                          href={getSheetRowUrl(trade.rowNumber)}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-center gap-1 rounded-md border border-[var(--card-border)] px-2 py-1 text-[10px] font-bold text-[var(--muted)] transition-colors hover:border-[var(--accent)]/30 hover:bg-[var(--accent-soft)] hover:text-[var(--accent)]"
                          title={`Mở JOURNAL dòng ${trade.rowNumber} trên Google Sheet`}
                        >
                          Dòng {trade.rowNumber}
                          <ExternalLink size={11} />
                        </a>
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={8} className="px-4 py-10 text-center text-[var(--muted)] sm:px-5">
                    <p className="mb-1 text-base font-medium">Chưa có giao dịch phù hợp</p>
                    <p className="type-caption">Hãy thử thay đổi từ khóa tìm kiếm hoặc bộ lọc.</p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
