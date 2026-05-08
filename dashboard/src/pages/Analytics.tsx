import { useMemo, useState } from 'react';
import { Award, BarChart3, Target, TrendingDown, TrendingUp } from 'lucide-react';
import { useApp } from '../context.tsx';
import { Card, KpiCard } from '../components/ui/Card.tsx';
import { TradeFilterBar } from '../components/filters/TradeFilterBar.tsx';
import { AnalyticsService, type GroupPnLItem } from '../services/analyticsService.ts';
import { formatCurrency, formatPercent } from '../lib/utils.ts';
import { ALL_FILTER, filterTrades, getTradeFilterOptions, type TradeFilters, type TradeSelectFilterKey } from '../lib/tradeFilters.ts';
import { BarChart, Bar, CartesianGrid, Cell, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';

type AnalyticsTab = 'strategy' | 'sector' | 'mood';

const DEFAULT_ANALYTICS_FILTERS: TradeFilters = {
  search: '',
  account: ALL_FILTER,
  assetType: ALL_FILTER,
  symbol: ALL_FILTER,
  position: ALL_FILTER,
  strategy: ALL_FILTER,
  sector: ALL_FILTER,
  mood: ALL_FILTER,
  pnlBucket: ALL_FILTER,
  fromDate: '',
  toDate: '',
};

export default function Analytics() {
  const { trades, feeCharges, availableAccounts } = useApp();
  const [activeTab, setActiveTab] = useState<AnalyticsTab>('strategy');
  const [filters, setFilters] = useState<TradeFilters>(DEFAULT_ANALYTICS_FILTERS);

  const filterOptions = useMemo(() => getTradeFilterOptions(trades, availableAccounts), [availableAccounts, trades]);
  const filteredTrades = useMemo(() => filterTrades(trades, filters), [trades, filters]);
  const analyticsFilterFields = useMemo<TradeSelectFilterKey[]>(() => {
    const fields: TradeSelectFilterKey[] = ['pnlBucket'];
    if (filterOptions.accounts.length > 1) fields.unshift('account');
    if (filterOptions.assetTypes.length > 1) fields.push('assetType');
    if (filterOptions.positions.length > 1) fields.push('position');
    return fields;
  }, [activeTab, filterOptions.accounts.length, filterOptions.assetTypes.length, filterOptions.positions.length]);

  const summary = useMemo(() => AnalyticsService.summarizeTrades(filteredTrades), [filteredTrades]);
  const activeData: GroupPnLItem[] = useMemo(() => {
    if (activeTab === 'strategy') return AnalyticsService.getPnLByStrategy(filteredTrades);
    if (activeTab === 'sector') return AnalyticsService.getPnLBySector(filteredTrades);
    return AnalyticsService.getPnLByMood(filteredTrades);
  }, [activeTab, filteredTrades]);

  const title = activeTab === 'strategy' ? 'Chiến lược' : activeTab === 'sector' ? 'Nhóm ngành' : 'Tâm lý';
  const bestItem = activeData[0];
  const worstItem = activeData.at(-1);
  const reliableItems = activeData.filter((item) => item.trades >= 3);
  const mostReliable = reliableItems.slice().sort((left, right) => right.winRate - left.winRate || right.pnl - left.pnl)[0];
  const negativeItems = activeData.filter((item) => item.pnl < 0);
  const positiveItems = activeData.filter((item) => item.pnl > 0);
  const totalGroupedPnl = activeData.reduce((sum, item) => sum + item.pnl, 0);
  const topContribution = totalGroupedPnl > 0 && bestItem ? bestItem.pnl / totalGroupedPnl : 0;
  const totalFeeCharges = feeCharges.reduce((sum, item) => sum + item.amount, 0);
  return (
    <div className="mx-auto max-w-[1440px] space-y-5">
      <div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
        <div>
          <div className="type-title mb-2">Trung tâm phân tích</div>
          <h1 className="text-2xl font-extrabold tracking-tight text-foreground sm:text-3xl">Hiệu suất theo {title.toLowerCase()}</h1>
          <p className="mt-2 max-w-2xl text-[13px] font-semibold leading-6 text-[var(--muted)]">Tìm nhóm tạo lợi nhuận, nhóm làm giảm hiệu suất và điểm cần review trước phiên giao dịch tiếp theo.</p>
        </div>
        <div className="flex w-fit gap-1 rounded-xl border border-[var(--card-border)] bg-[var(--surface-soft)] p-1 shadow-sm">
          {[
            { key: 'strategy', label: 'Chiến lược' },
            { key: 'sector', label: 'Nhóm ngành' },
            { key: 'mood', label: 'Tâm lý' },
          ].map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key as AnalyticsTab)}
              className={`rounded-lg px-4 py-2 text-[12px] font-bold transition-all ${activeTab === tab.key ? 'bg-[var(--accent)] text-white shadow-sm shadow-blue-600/15' : 'text-[var(--muted)] hover:text-foreground'}`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      <TradeFilterBar
        title="Bộ lọc phân tích"
        filters={filters}
        options={filterOptions}
        fields={analyticsFilterFields}
        onChange={(patch) => setFilters((current) => ({ ...current, ...patch }))}
        onReset={() => setFilters(DEFAULT_ANALYTICS_FILTERS)}
        showSearch
        showDateRange
        searchPlaceholder="Tìm mã, nhóm ngành, chiến lược hoặc tâm lý..."
        resultCount={filteredTrades.length}
        totalCount={trades.length}
        compact
      />

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-5">
        <KpiCard title="Nhóm tốt nhất" value={bestItem?.name || '—'} icon={Award} delta={bestItem ? formatCurrency(bestItem.pnl) : 'Chưa có'} deltaType={(bestItem?.pnl || 0) >= 0 ? 'positive' : 'negative'} description={`Nhóm ${title.toLowerCase()} có tổng PnL cao nhất trong dữ liệu hiện tại.`} />
        <KpiCard title="Tỉ trọng top" value={formatPercent(topContribution)} icon={BarChart3} delta={bestItem ? bestItem.name : 'Chưa có'} description="Cho biết hiệu suất có đang phụ thuộc quá nhiều vào một nhóm duy nhất hay không." />
        <KpiCard title="Nhóm âm" value={negativeItems.length} icon={TrendingDown} delta={`${positiveItems.length} nhóm dương`} deltaType={negativeItems.length > positiveItems.length ? 'negative' : 'neutral'} description="Số nhóm đang có tổng PnL âm. Đây là danh sách cần review để giảm rò rỉ lợi nhuận." />
        <KpiCard title="Ổn định nhất" value={mostReliable?.name || '—'} icon={Target} delta={mostReliable ? formatPercent(mostReliable.winRate) : 'Chưa đủ mẫu'} deltaType={(mostReliable?.winRate || 0) >= 0.5 ? 'positive' : 'neutral'} description="Nhóm có win rate tốt nhất trong các nhóm có tối thiểu 3 giao dịch." />
        <KpiCard title="Phí định kỳ" value={formatCurrency(totalFeeCharges)} icon={TrendingUp} delta={`${feeCharges.length} dòng phí`} description="Tổng phí đọc từ tab FEE_CHARGES. Dùng để so với PnL nhóm." />
      </div>

      <Card title="Tóm tắt hiệu suất" subtitle="Các chỉ số lõi để quyết định nên tăng cường, giảm size hay tiếp tục quan sát">
        <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
          <div className="rounded-xl bg-[var(--surface-soft)] p-3">
            <div className="type-caption text-[10px]">Kỳ vọng mỗi lệnh</div>
            <div className="mt-1 font-mono text-[15px] font-bold text-foreground">{formatCurrency(summary.avgPnL)}</div>
          </div>
          <div className="rounded-xl bg-[var(--surface-soft)] p-3">
            <div className="type-caption text-[10px]">Hệ số lợi nhuận</div>
            <div className="mt-1 font-mono text-[15px] font-bold text-foreground">{Number.isFinite(summary.profitFactor) ? summary.profitFactor.toFixed(2) : '∞'}</div>
          </div>
          <div className="rounded-xl bg-[var(--surface-soft)] p-3">
            <div className="type-caption text-[10px]">Tốt nhất</div>
            <div className="mt-1 truncate font-mono text-[13px] font-bold text-[var(--win)]">{bestItem ? `${bestItem.name} · ${formatCurrency(bestItem.pnl)}` : '—'}</div>
          </div>
          <div className="rounded-xl bg-[var(--surface-soft)] p-3">
            <div className="type-caption text-[10px]">Kém nhất</div>
            <div className="mt-1 truncate font-mono text-[13px] font-bold text-[var(--loss)]">{worstItem ? `${worstItem.name} · ${formatCurrency(worstItem.pnl)}` : '—'}</div>
          </div>
        </div>
      </Card>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-[minmax(0,1.55fr)_minmax(360px,0.75fr)]">
        <Card title={`PnL theo ${title.toLowerCase()}`} subtitle="Top nhóm có đóng góp lớn nhất, tách rõ bên tạo tiền và bên làm mất tiền">
          <div className="mt-1 h-[320px] w-full sm:h-[380px] xl:h-[420px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={activeData.slice(0, 10)} layout="vertical" margin={{ top: 6, right: 28, left: 12, bottom: 6 }} barCategoryGap={14}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--chart-grid)" horizontal={false} />
                <XAxis type="number" tick={{ fill: 'var(--chart-axis)', fontSize: 10 }} tickFormatter={(value) => `${(Number(value) / 1_000_000).toFixed(0)}M`} />
                <YAxis type="category" dataKey="name" width={120} tick={{ fill: 'var(--chart-axis)', fontSize: 11, fontWeight: 700 }} />
                <Tooltip
                  wrapperClassName="!outline-none"
                  content={({ active, payload }) => {
                    if (!active || !payload?.length) return null;
                    const item = payload[0].payload as GroupPnLItem;
                    return (
                      <div className="chart-tooltip p-3">
                        <div className="text-[13px] font-extrabold text-foreground">{item.name}</div>
                        <div className="mt-1 font-mono text-[13px] font-bold text-foreground">{formatCurrency(item.pnl)}</div>
                        <div className="mt-2 grid grid-cols-2 gap-x-4 gap-y-1 text-[11px] font-semibold text-[var(--muted)]">
                          <span>{item.trades} giao dịch</span>
                          <span>{formatPercent(item.winRate)} thắng</span>
                          <span>TB {formatCurrency(item.avgPnL)}</span>
                          <span>{item.losses} lệnh thua</span>
                        </div>
                      </div>
                    );
                  }}
                />
                <Bar dataKey="pnl" radius={[8, 8, 8, 8]} barSize={22}>
                  {activeData.slice(0, 10).map((entry) => <Cell key={entry.name} fill={entry.pnl >= 0 ? 'var(--win)' : 'var(--loss)'} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>

        <div className="space-y-4 xl:max-h-[512px] xl:overflow-y-auto xl:pr-1">
          <Card title="Bảng xếp hạng chi tiết" subtitle="Ưu tiên nhóm nhiều mẫu, PnL rõ ràng và win rate ổn định">
            <div className="space-y-2.5">
              {activeData.map((item) => (
                <div key={item.name} className="rounded-xl border border-[var(--card-border)] bg-[var(--surface-soft)] p-3.5">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <h4 className="text-[15px] font-extrabold tracking-[-0.02em] text-foreground">{item.name}</h4>
                      <div className="mt-0.5 type-caption text-[11px]">{item.trades} giao dịch · tỉ lệ thắng {formatPercent(item.winRate)}</div>
                    </div>
                    <div className={`text-right text-lg font-mono font-bold ${item.pnl >= 0 ? 'text-[var(--win)]' : 'text-[var(--loss)]'}`}>{formatCurrency(item.pnl)}</div>
                  </div>
                  <div className="mt-2 grid grid-cols-3 gap-2 text-[11px]">
                    <div><div className="type-caption text-[9px]">PnL TB</div><div className="mt-0.5 font-mono font-semibold text-foreground">{formatCurrency(item.avgPnL)}</div></div>
                    <div><div className="type-caption text-[9px]">Lệnh thắng</div><div className="mt-0.5 font-mono font-semibold text-foreground">{item.wins}</div></div>
                    <div><div className="type-caption text-[9px]">Lệnh thua</div><div className="mt-0.5 font-mono font-semibold text-foreground">{item.losses}</div></div>
                  </div>
                </div>
              ))}
            </div>
          </Card>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-3">
        <Card title="Nên tập trung" subtitle="Nhóm có PnL dương và số mẫu đáng xem">
          <div className="space-y-2.5">
            {positiveItems.slice(0, 5).map((item) => (
              <div key={item.name} className="flex items-center justify-between rounded-xl bg-[var(--surface-soft)] p-3 text-[13px]">
                <div><div className="font-bold text-foreground">{item.name}</div><div className="type-caption text-[10px]">{item.trades} lệnh · {formatPercent(item.winRate)}</div></div>
                <div className="font-mono font-bold text-[var(--win)]">{formatCurrency(item.pnl)}</div>
              </div>
            ))}
          </div>
        </Card>
        <Card title="Cần cắt giảm" subtitle="Nhóm âm nhiều nhất, nên review setup hoặc giảm size">
          <div className="space-y-2.5">
            {negativeItems.slice().sort((a, b) => a.pnl - b.pnl).slice(0, 5).map((item) => (
              <div key={item.name} className="flex items-center justify-between rounded-xl bg-[var(--surface-soft)] p-3 text-[13px]">
                <div><div className="font-bold text-foreground">{item.name}</div><div className="type-caption text-[10px]">{item.trades} lệnh · {formatPercent(item.winRate)}</div></div>
                <div className="font-mono font-bold text-[var(--loss)]">{formatCurrency(item.pnl)}</div>
              </div>
            ))}
          </div>
        </Card>
        <Card title="Cần thêm mẫu" subtitle="Nhóm có ít giao dịch, chưa nên kết luận quá sớm">
          <div className="space-y-2.5">
            {activeData.filter((item) => item.trades < 3).slice(0, 5).map((item) => (
              <div key={item.name} className="flex items-center justify-between rounded-xl bg-[var(--surface-soft)] p-3 text-[13px]">
                <div><div className="font-bold text-foreground">{item.name}</div><div className="type-caption text-[10px]">Mới {item.trades} lệnh</div></div>
                <div className={`font-mono font-bold ${item.pnl >= 0 ? 'text-[var(--win)]' : 'text-[var(--loss)]'}`}>{formatCurrency(item.pnl)}</div>
              </div>
            ))}
          </div>
        </Card>
      </div>
    </div>
  );
}
