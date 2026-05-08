import { Database, TrendingUp, Zap, History, Target, ShieldCheck } from 'lucide-react';
import type { ReactNode } from 'react';
import type { MetricKey } from '../types.ts';
import { useApp } from '../context.tsx';
import { KpiCard, Card } from '../components/ui/Card.tsx';
import { formatCurrency, formatPercent, cn } from '../lib/utils.ts';
import {
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  AreaChart,
  Area,
  PieChart,
  Pie,
  Cell,
} from 'recharts';
import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AnalyticsService } from '../services/analyticsService.ts';

const DEFAULT_CUSTOMER_NAME = 'Phương Trần';

export default function Overview() {
  const navigate = useNavigate();
  const { trades, feeCharges, stats, isLoading, authState, settings } = useApp();
  const [equityMode, setEquityMode] = useState<'trade' | 'day' | 'month' | 'year'>('day');

  const equityCurve = useMemo(() => AnalyticsService.getEquityTimeline(trades, equityMode), [trades, equityMode]);
  const profitFactor = Number.isFinite(stats?.profitFactor) ? stats!.profitFactor.toFixed(2) : '0.00';
  const totalFeeCharges = feeCharges.reduce((sum, item) => sum + item.amount, 0);
  const metricCards: { key: MetricKey; node: ReactNode }[] = [
    {
      key: 'netPnL',
      node: <KpiCard title="Lãi/Lỗ ròng" value={formatCurrency(stats?.netPnL || 0)} icon={TrendingUp} delta={`${stats?.totalTrades || 0} lệnh đã đóng`} deltaType={(stats?.netPnL || 0) >= 0 ? 'positive' : 'negative'} isLoading={isLoading} description="Tổng lãi/lỗ ròng sau phí và thuế của các giao dịch trong dữ liệu hiện tại." onClick={() => navigate('/journal')} />,
    },
    {
      key: 'currentBalance',
      node: <KpiCard title="Số dư hiện tại" value={formatCurrency(stats?.currentBalance || 0)} icon={Zap} isLoading={isLoading} description="Giá trị đường vốn tại giao dịch mới nhất, dùng để theo dõi vốn tăng hay giảm theo thời gian." onClick={() => navigate('/calendar')} />,
    },
    {
      key: 'totalTrades',
      node: <KpiCard title="Tổng số lệnh" value={stats?.totalTrades || 0} icon={History} isLoading={isLoading} description="Số giao dịch đã đóng được dùng để tính KPI, không bao gồm lệnh đang mở." onClick={() => navigate('/journal')} />,
    },
    {
      key: 'expectancy',
      node: <KpiCard title="Kỳ vọng/Lệnh" value={formatCurrency(stats?.expectancy || 0)} icon={Target} isLoading={isLoading} description="Lãi/lỗ trung bình trên mỗi lệnh đã đóng. Chỉ số này cho biết mỗi giao dịch kỳ vọng tạo ra bao nhiêu tiền." onClick={() => navigate('/analytics')} />,
    },
    {
      key: 'feeCharges',
      node: <KpiCard title="Phí định kỳ" value={formatCurrency(totalFeeCharges)} icon={ShieldCheck} isLoading={isLoading} description="Tổng phí ngoài lệnh đọc từ tab FEE_CHARGES. Dùng để nhìn chi phí vận hành thật." onClick={() => navigate('/guide')} />,
    },
  ];
  const visibleMetricCards = metricCards.filter((item) => settings.metrics.visible[item.key]).sort((left, right) => left.key === settings.metrics.primary ? -1 : right.key === settings.metrics.primary ? 1 : 0);
  const winRateData = [
    { name: 'Thắng', value: stats?.winningTrades || 0, color: 'var(--win)' },
    { name: 'Thua', value: stats?.losingTrades || 0, color: 'var(--loss)' },
    { name: 'Hòa', value: stats?.breakEvenTrades || 0, color: 'var(--warning)' },
  ].filter((data) => data.value > 0);

  const hour = new Date().getHours();
  let greeting = 'Chào buổi tối';
  if (hour >= 5 && hour < 12) greeting = 'Chào buổi sáng';
  else if (hour >= 12 && hour < 18) greeting = 'Chào buổi chiều';

  return (
    <div className="mx-auto max-w-7xl space-y-5 md:space-y-6">
      <Card className="overflow-hidden border-[var(--accent)]/20 bg-[linear-gradient(135deg,var(--accent-soft),transparent_36%),linear-gradient(315deg,var(--teal-soft),transparent_34%),var(--card-bg)]">
        <div className="grid gap-5 lg:grid-cols-[1fr_360px] xl:grid-cols-[1fr_420px] xl:items-stretch">
          <div className="flex min-w-0 flex-col justify-between gap-7">
            <div>
              <div className="mb-4 flex flex-wrap items-center gap-2">
                <span className="inline-flex items-center gap-2 rounded-full bg-[var(--accent-soft)] px-3 py-1 text-[10px] font-extrabold uppercase tracking-[0.04em] text-[var(--accent)]">
                  <ShieldCheck size={13} />
                  Dahodo.Journal
                </span>
                <span className="inline-flex items-center gap-2 rounded-full bg-[var(--teal-soft)] px-3 py-1 text-[10px] font-extrabold uppercase tracking-[0.04em] text-[var(--accent-2)]">
                  <Database size={13} />
                  {settings.isDemoMode ? 'Dữ liệu mẫu' : 'Sheet thật'}
                </span>
              </div>
              <h1 className="max-w-3xl text-[28px] font-extrabold leading-tight text-foreground sm:text-[34px]">
                {greeting}, {authState.username !== 'Guest' ? (authState.displayName || authState.username) : 'Nhà giao dịch'}
              </h1>
              <p className="mt-3 max-w-2xl text-[14px] font-medium leading-6 text-[var(--muted)]">
                {'Không gian nhật ký của '}
                <span className="font-bold text-foreground">{settings.appName || DEFAULT_CUSTOMER_NAME}</span>
                {' đang ghi nhận '}
                <span className={cn('font-mono font-extrabold', (stats?.netPnL || 0) >= 0 ? 'text-[var(--win)]' : 'text-[var(--loss)]')}>
                  {(stats?.netPnL || 0) >= 0 ? '+' : '-'}{formatCurrency(Math.abs(stats?.netPnL || 0))}
                </span>
                {' trong chu kỳ hiện tại.'}
              </p>
            </div>
            <div className="grid grid-cols-2 gap-3 text-[12px] sm:grid-cols-4">
              <div className="metric-surface p-3">
                <div className="type-caption text-[10px]">{'Giao dịch'}</div>
                <div className="mt-1 font-mono text-base font-extrabold text-foreground">{stats?.totalTrades || 0}</div>
              </div>
              <div className="metric-surface p-3">
                <div className="type-caption text-[10px]">{'Đang mở'}</div>
                <div className="mt-1 font-mono text-base font-extrabold text-foreground">{stats?.openTrades || 0}</div>
              </div>
              <div className="metric-surface p-3">
                <div className="type-caption text-[10px]">{'Thắng'}</div>
                <div className="mt-1 font-mono text-base font-extrabold text-[var(--win)]">{stats?.winningTrades || 0}</div>
              </div>
              <div className="metric-surface p-3">
                <div className="type-caption text-[10px]">Thua</div>
                <div className="mt-1 font-mono text-base font-extrabold text-[var(--loss)]">{stats?.losingTrades || 0}</div>
              </div>
            </div>
          </div>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3 xl:grid-cols-1">
            <div className="metric-surface p-4" title="Tỉ lệ lệnh thắng trên tổng số lệnh đã đóng.">
              <div className="type-caption text-[10px]">Tỉ lệ thắng</div>
              <div className="mt-2 font-mono text-2xl font-extrabold text-foreground">{formatPercent(stats?.winRate || 0)}</div>
            </div>
            <div className="metric-surface p-4" title="Tổng lãi chia cho tổng lỗ. Lớn hơn 1 nghĩa là hệ thống đang có lợi thế.">
              <div className="type-caption text-[10px]">Hệ số lợi nhuận</div>
              <div className="mt-2 font-mono text-2xl font-extrabold text-foreground">{profitFactor}</div>
            </div>
            <div className="metric-surface p-4" title="Mức sụt giảm vốn lớn nhất từ đỉnh xuống đáy trong chuỗi giao dịch.">
              <div className="type-caption text-[10px]">Sụt giảm tối đa</div>
              <div className="mt-2 font-mono text-2xl font-extrabold text-[var(--loss)]">{formatPercent(stats?.maxDrawdown || 0)}</div>
            </div>
          </div>
        </div>
      </Card>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-5">
        {visibleMetricCards.map((item) => <div key={item.key} className="h-full">{item.node}</div>)}
      </div>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-[minmax(0,2fr)_minmax(320px,1fr)]">
        <Card
          title="Đường vốn tích luỹ"
          subtitle="Theo dõi vốn theo lệnh, ngày, tháng hoặc năm để nhìn xu hướng tài khoản rõ hơn"
          extra={
            <div className="flex flex-wrap gap-1 rounded-xl border border-[var(--card-border)] bg-[var(--card-elevated)]/75 p-1">
              {[
                { key: 'trade', label: 'Theo lệnh' },
                { key: 'day', label: 'Theo ngày' },
                { key: 'month', label: 'Theo tháng' },
                { key: 'year', label: 'Theo năm' },
              ].map((item) => (
                <button
                  key={item.key}
                  onClick={() => setEquityMode(item.key as typeof equityMode)}
                  className={cn(
                    'rounded-lg px-2.5 py-1.5 text-[11px] font-semibold transition-colors',
                    equityMode === item.key ? 'bg-[var(--accent)] text-white' : 'text-[var(--muted)] hover:text-foreground',
                  )}
                >
                  {item.label}
                </button>
              ))}
            </div>
          }
        >
          <div className="mt-2 h-[260px] w-full sm:h-[320px]">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={equityCurve}>
                <defs>
                  <linearGradient id="eqGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="var(--accent)" stopOpacity={0.22} />
                    <stop offset="95%" stopColor="var(--accent)" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--chart-grid)" />
                <XAxis dataKey="label" stroke="var(--chart-axis)" fontSize={10} tickLine={false} axisLine={false} dy={8} />
                <YAxis stroke="var(--chart-axis)" fontSize={10} tickLine={false} axisLine={false} tickFormatter={(val) => `${(val / 1000000).toFixed(0)}M`} width={40} />
                <Tooltip
                  content={({ active, payload }) => {
                    if (active && payload && payload.length) {
                      return (
                        <div className="chart-tooltip p-2.5">
                          <p className="type-caption mb-0.5">{payload[0].payload.label}</p>
                          <p className="type-caption mb-1">{payload[0].payload.trades} giao dịch</p>
                          <p className="font-mono text-sm font-bold text-foreground">{formatCurrency(payload[0].value as number)}</p>
                        </div>
                      );
                    }
                    return null;
                  }}
                />
                <Area type="monotone" dataKey="balance" stroke="var(--accent)" strokeWidth={1.7} fillOpacity={1} fill="url(#eqGradient)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </Card>

        <Card title="Phân bổ kết quả" subtitle="Thắng, thua và hòa">
          <div className="relative mt-2 h-[250px] w-full">
            {winRateData.length > 0 ? (
              <>
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={winRateData} cx="50%" cy="50%" innerRadius={62} outerRadius={90} paddingAngle={4} dataKey="value" strokeWidth={0}>
                      {winRateData.map((entry, index) => <Cell key={`cell-${index}`} fill={entry.color} />)}
                    </Pie>
                  </PieChart>
                </ResponsiveContainer>
                <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
                  <span className="type-caption text-[9px]">{'Tỉ lệ thắng'}</span>
                  <span className="font-mono text-2xl font-extrabold text-foreground">{formatPercent(stats?.winRate || 0)}</span>
                </div>
              </>
            ) : (
              <div className="flex h-full items-center justify-center rounded-2xl border border-dashed border-[var(--card-border)] text-center">
                <div>
                  <div className="text-sm font-bold text-foreground">{'Chưa có dữ liệu kết quả'}</div>
                  <div className="mt-1 type-caption">{'Kết nối Sheet hoặc nhập giao dịch để xem phân bổ.'}</div>
                </div>
              </div>
            )}
          </div>
          <div className="mt-3 space-y-1.5 text-[12px]">
            {winRateData.map((item) => (
              <div key={item.name} className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="h-2 w-2 rounded-full" style={{ backgroundColor: item.color }} />
                  <span className="type-caption">{item.name}</span>
                </div>
                <span className="font-mono font-semibold text-foreground">{item.value} {'lệnh'}</span>
              </div>
            ))}
          </div>
        </Card>
      </div>

      <Card title="Giao dịch gần nhất" extra={<a href="/journal" className="type-caption font-semibold text-[var(--accent)] hover:underline">{'Xem tất cả ->'}</a>}>
        <div className="-mx-[var(--card-pad)] overflow-x-auto px-[var(--card-pad)]">
          <table className="w-full whitespace-nowrap text-left">
            <thead className="border-b border-[var(--card-border)]">
              <tr className="type-title text-[10px]">
                <th className="px-3 py-2.5 font-semibold">{'Mã'}</th>
                <th className="px-3 py-2.5 font-semibold">{'Vị thế'}</th>
                <th className="px-3 py-2.5 font-semibold">{'Giá vào'}</th>
                <th className="px-3 py-2.5 font-semibold">{'Giá đóng'}</th>
                <th className="px-3 py-2.5 text-right font-semibold">{'Lãi/Lỗ ròng'}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--card-border)]">
              {trades.slice(-5).reverse().map((trade) => (
                <tr key={trade.rowNumber} className="text-[13px] transition-colors hover:bg-[var(--row-hover)]">
                  <td className="px-3 py-3 font-semibold text-foreground">{trade.symbol}</td>
                  <td className="px-3 py-3">
                    <span className={cn('text-[10px] font-bold uppercase', trade.position === 'LONG' ? 'text-[var(--win)]' : 'text-[var(--loss)]')}>
                      {trade.position}
                    </span>
                  </td>
                  <td className="px-3 py-3 font-mono text-[12px] text-[var(--muted)]">{trade.entryPrice.toLocaleString()}</td>
                  <td className="px-3 py-3 font-mono text-[12px] text-[var(--muted)]">{trade.exitPrice.toLocaleString()}</td>
                  <td className={cn('px-3 py-3 text-right font-mono text-[12px] font-bold', trade.netPnL >= 0 ? 'text-[var(--win)]' : 'text-[var(--loss)]')}>
                    {trade.netPnL >= 0 ? '+' : ''}{formatCurrency(trade.netPnL)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
