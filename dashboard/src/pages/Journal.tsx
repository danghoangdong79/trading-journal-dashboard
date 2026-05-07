import { useMemo, useState } from 'react';
import { Activity, Search, Target, TrendingDown, TrendingUp, X } from 'lucide-react';
import { useApp } from '../context.tsx';
import { Card, KpiCard } from '../components/ui/Card.tsx';
import { cn, formatCurrency, formatPercent } from '../lib/utils.ts';
import { STATUS_CONFIG } from '../constants.ts';
import { AnalyticsService } from '../services/analyticsService.ts';

export default function Journal() {
  const { trades, isLoading } = useApp();
  const [searchTerm, setSearchTerm] = useState('');
  const [filterAsset, setFilterAsset] = useState('All');
  const [filterStatus, setFilterStatus] = useState('All');

  const filteredAsc = useMemo(
    () =>
      trades.filter((trade) => {
        const keyword = searchTerm.trim().toLowerCase();
        const matchesSearch =
          !keyword ||
          trade.symbol.toLowerCase().includes(keyword) ||
          trade.strategy.toLowerCase().includes(keyword) ||
          trade.sector.toLowerCase().includes(keyword);
        const matchesAsset = filterAsset === 'All' || trade.assetType === filterAsset;
        const matchesStatus = filterStatus === 'All' || trade.status === filterStatus;
        return matchesSearch && matchesAsset && matchesStatus;
      }),
    [filterAsset, filterStatus, searchTerm, trades],
  );

  const filteredTrades = useMemo(() => filteredAsc.slice().reverse(), [filteredAsc]);
  const summary = useMemo(() => AnalyticsService.summarizeTrades(filteredAsc), [filteredAsc]);
  const topSymbol = useMemo(() => AnalyticsService.groupPnL(filteredAsc, (trade) => trade.symbol)[0], [filteredAsc]);

  return (
    <div className="mx-auto max-w-[1200px] space-y-5">
      {/* Search & Filters */}
      <div className="flex flex-col items-stretch gap-3 md:flex-row md:items-center">
        <div className="relative w-full flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--muted)]" size={15} />
          <input
            type="text"
            placeholder="Tìm mã, chiến lược hoặc nhóm ngành..."
            value={searchTerm}
            onChange={(event) => setSearchTerm(event.target.value)}
            className="w-full rounded-lg border border-[var(--card-border)] bg-[var(--card-bg)] py-2 pl-9 pr-4 text-[13px] transition-all focus:outline-none focus:ring-1 focus:ring-[var(--accent)]/40 placeholder:text-[var(--muted)]"
          />
        </div>
        <div className="flex gap-2">
          <select value={filterAsset} onChange={(event) => setFilterAsset(event.target.value)} className="rounded-lg border border-[var(--card-border)] bg-[var(--card-bg)] px-3 py-2 text-[12px] focus:outline-none">
            <option value="All">Tất cả tài sản</option>
            <option value="Phái sinh">Phái sinh</option>
            <option value="Cổ phiếu">Cổ phiếu</option>
          </select>
          <select value={filterStatus} onChange={(event) => setFilterStatus(event.target.value)} className="rounded-lg border border-[var(--card-border)] bg-[var(--card-bg)] px-3 py-2 text-[12px] focus:outline-none">
            <option value="All">Tất cả trạng thái</option>
            <option value="Thắng">Thắng</option>
            <option value="Thua">Thua</option>
            <option value="Hòa">Hòa</option>
            <option value="Đang mở">Đang mở</option>
          </select>
          <button
            onClick={() => {
              setSearchTerm('');
              setFilterAsset('All');
              setFilterStatus('All');
            }}
            className="flex items-center justify-center rounded-lg border border-[var(--card-border)] p-2 text-[var(--muted)] transition-colors hover:bg-foreground/5 hover:text-foreground"
            title="Xóa bộ lọc"
          >
            <X size={15} />
          </button>
        </div>
      </div>

      {/* KPI Row */}
      <div className="grid grid-cols-2 gap-3 xl:grid-cols-5">
        <KpiCard title="PnL theo bộ lọc" value={formatCurrency(summary.netPnL)} icon={Activity} delta={`${summary.totalTrades} lệnh`} deltaType={summary.netPnL >= 0 ? 'positive' : 'negative'} isLoading={isLoading} />
        <KpiCard title="Win rate" value={formatPercent(summary.winRate)} icon={Target} delta={`${summary.winningTrades}/${summary.closedTrades} đóng`} isLoading={isLoading} />
        <KpiCard title="Lãi TB" value={formatCurrency(summary.avgWin)} icon={TrendingUp} delta={`${summary.winningTrades} lệnh thắng`} deltaType="positive" isLoading={isLoading} />
        <KpiCard title="Lỗ TB" value={formatCurrency(summary.avgLoss)} icon={TrendingDown} delta={`${summary.losingTrades} lệnh thua`} deltaType="negative" isLoading={isLoading} />
        <KpiCard title="Mã nổi bật" value={topSymbol?.name || '—'} icon={Activity} delta={topSymbol ? formatCurrency(topSymbol.pnl) : 'Chưa có'} deltaType={(topSymbol?.pnl || 0) >= 0 ? 'positive' : 'negative'} isLoading={isLoading} />
      </div>

      {/* Trade Table */}
      <Card className="overflow-hidden !p-0">
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-left whitespace-nowrap">
            <thead className="border-b border-[var(--card-border)] bg-foreground/[0.02]">
              <tr className="type-title text-[10px]">
                <th className="px-4 py-3 font-semibold sm:px-5">Status</th>
                <th className="px-4 py-3 font-semibold sm:px-5">Mã / Tài sản</th>
                <th className="px-4 py-3 font-semibold text-center sm:px-5">Giá vào / đóng</th>
                <th className="px-4 py-3 font-semibold text-center sm:px-5">Khối lượng</th>
                <th className="px-4 py-3 font-semibold text-right sm:px-5">Lãi/lỗ ròng</th>
                <th className="px-4 py-3 font-semibold text-center sm:px-5">Chiến lược</th>
                <th className="px-4 py-3 font-semibold text-center sm:px-5">Ngày mở</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--card-border)]">
              {isLoading ? (
                Array.from({ length: 5 }).map((_, index) => (
                  <tr key={index} className="animate-pulse">
                    <td colSpan={7} className="px-4 py-5 sm:px-5"><div className="h-4 w-full rounded bg-foreground/5" /></td>
                  </tr>
                ))
              ) : filteredTrades.length > 0 ? (
                filteredTrades.map((trade) => {
                  const statusInfo = STATUS_CONFIG[trade.status];
                  return (
                    <tr key={trade.rowNumber} className="group transition-colors hover:bg-foreground/[0.02]">
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
                      <td className="px-4 py-3 text-center sm:px-5"><span className="rounded-md bg-foreground/[0.04] px-2 py-0.5 text-[11px] text-[var(--muted)]">{trade.strategy || '—'}</span></td>
                      <td className="px-4 py-3 text-center font-mono text-[10px] text-[var(--muted)] sm:px-5">{trade.openDate} {trade.openTime}</td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={7} className="px-4 py-10 text-center text-[var(--muted)] sm:px-5">
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
