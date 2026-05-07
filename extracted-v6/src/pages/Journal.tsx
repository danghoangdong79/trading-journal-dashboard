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
    <div className="mx-auto max-w-7xl space-y-6">
      <Card className="p-4">
        <div className="flex flex-col items-stretch gap-4 md:flex-row md:items-center">
          <div className="relative w-full flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" size={16} />
            <input
              type="text"
              placeholder="Tìm mã, chiến lược hoặc nhóm ngành..."
              value={searchTerm}
              onChange={(event) => setSearchTerm(event.target.value)}
              className="w-full rounded-xl border border-foreground/5 bg-foreground/5 py-2 pl-10 pr-4 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500/50"
            />
          </div>
          <div className="grid w-full grid-cols-1 gap-2 sm:grid-cols-3 md:w-auto">
            <select value={filterAsset} onChange={(event) => setFilterAsset(event.target.value)} className="rounded-xl border border-foreground/10 bg-background px-3 py-2 text-xs focus:outline-none">
              <option value="All">Tất cả tài sản</option>
              <option value="Phái sinh">Phái sinh</option>
              <option value="Cổ phiếu">Cổ phiếu</option>
            </select>
            <select value={filterStatus} onChange={(event) => setFilterStatus(event.target.value)} className="rounded-xl border border-foreground/10 bg-background px-3 py-2 text-xs focus:outline-none">
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
              className="flex items-center justify-center rounded-xl border border-foreground/10 p-2 text-gray-500 transition-colors hover:bg-foreground/5 hover:text-gray-700 dark:hover:text-gray-400"
              title="Xóa bộ lọc"
            >
              <X size={16} />
            </button>
          </div>
        </div>
      </Card>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-5">
        <KpiCard title="PnL theo bộ lọc" value={formatCurrency(summary.netPnL)} icon={Activity} delta={`${summary.totalTrades} lệnh`} deltaType={summary.netPnL >= 0 ? 'positive' : 'negative'} isLoading={isLoading} />
        <KpiCard title="Win rate" value={formatPercent(summary.winRate)} icon={Target} delta={`${summary.winningTrades}/${summary.closedTrades} lệnh đóng`} isLoading={isLoading} />
        <KpiCard title="Lãi TB" value={formatCurrency(summary.avgWin)} icon={TrendingUp} delta={`${summary.winningTrades} lệnh thắng`} deltaType="positive" isLoading={isLoading} />
        <KpiCard title="Lỗ TB" value={formatCurrency(summary.avgLoss)} icon={TrendingDown} delta={`${summary.losingTrades} lệnh thua`} deltaType="negative" isLoading={isLoading} />
        <KpiCard title="Mã nổi bật" value={topSymbol?.name || '—'} icon={Activity} delta={topSymbol ? formatCurrency(topSymbol.pnl) : 'Chưa có'} deltaType={(topSymbol?.pnl || 0) >= 0 ? 'positive' : 'negative'} isLoading={isLoading} />
      </div>

      <Card className="overflow-hidden p-0">
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-left whitespace-nowrap">
            <thead className="border-b border-foreground/5 bg-foreground/[0.02] text-[10px] font-bold uppercase tracking-widest text-gray-500">
              <tr>
                <th className="px-4 py-4 sm:px-6">Status</th>
                <th className="px-4 py-4 sm:px-6">Mã / Tài sản</th>
                <th className="px-4 py-4 text-center sm:px-6">Giá vào / đóng</th>
                <th className="px-4 py-4 text-center sm:px-6">Khối lượng</th>
                <th className="px-4 py-4 text-right sm:px-6">Lãi/lỗ ròng</th>
                <th className="px-4 py-4 text-center sm:px-6">Chiến lược</th>
                <th className="px-4 py-4 text-center sm:px-6">Ngày mở</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-white/5">
              {isLoading ? (
                Array.from({ length: 5 }).map((_, index) => (
                  <tr key={index} className="animate-pulse">
                    <td colSpan={7} className="px-4 py-6 sm:px-6"><div className="h-4 w-full rounded bg-foreground/5" /></td>
                  </tr>
                ))
              ) : filteredTrades.length > 0 ? (
                filteredTrades.map((trade) => {
                  const statusInfo = STATUS_CONFIG[trade.status];
                  return (
                    <tr key={trade.rowNumber} className="group cursor-pointer transition-colors hover:bg-gray-50 dark:hover:bg-white/5">
                      <td className="px-4 py-4 sm:px-6"><div className={cn('inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[10px] font-bold', statusInfo?.color || 'border-gray-500/20 bg-gray-500/10 text-gray-500')}>{statusInfo?.icon && <statusInfo.icon size={10} />}{trade.status}</div></td>
                      <td className="px-4 py-4 sm:px-6"><div className="flex flex-col"><span className="font-bold text-foreground">{trade.symbol}</span><span className="text-[10px] font-medium uppercase text-gray-500">{trade.assetType} • {trade.position}</span></div></td>
                      <td className="px-4 py-4 text-center sm:px-6"><div className="flex items-center justify-center gap-2"><span className="text-xs font-mono text-gray-500">{trade.entryPrice.toLocaleString('vi-VN')}</span><span className="text-gray-400">→</span><span className="text-xs font-mono text-foreground">{trade.exitPrice > 0 ? trade.exitPrice.toLocaleString('vi-VN') : '---'}</span></div></td>
                      <td className="px-4 py-4 text-center font-mono text-xs text-foreground sm:px-6">{trade.volume.toLocaleString('vi-VN')}</td>
                      <td className={cn('px-4 py-4 text-right font-mono text-xs font-bold sm:px-6', trade.netPnL >= 0 ? 'text-emerald-500' : 'text-rose-500')}>{trade.netPnL >= 0 ? '+' : ''}{formatCurrency(trade.netPnL)}</td>
                      <td className="px-4 py-4 text-center sm:px-6"><span className="rounded-lg bg-foreground/5 px-2 py-1 text-xs text-gray-500">{trade.strategy || '—'}</span></td>
                      <td className="px-4 py-4 text-center font-mono text-[10px] text-gray-500 sm:px-6">{trade.openDate} {trade.openTime}</td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={7} className="px-4 py-12 text-center text-gray-500 sm:px-6"><p className="mb-1 text-lg">Chưa có giao dịch phù hợp</p><p className="text-xs">Hãy thử thay đổi từ khóa tìm kiếm hoặc bộ lọc.</p></td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
