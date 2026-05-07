import { 
  TrendingUp, 
  Zap, 
  History,
  Target
} from 'lucide-react';
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
  Cell
} from 'recharts';
import { AnalyticsService } from '../services/analyticsService.ts';

export default function Overview() {
  const { trades, stats, isLoading, authState } = useApp();

  const equityCurve = AnalyticsService.getEquityCurve(trades);
  const winRateData = [
    { name: 'Win', value: stats?.winningTrades || 0, color: 'var(--win)' },
    { name: 'Lose', value: stats?.losingTrades || 0, color: 'var(--loss)' },
    { name: 'Hòa', value: stats?.breakEvenTrades || 0, color: '#d97706' },
  ].filter(d => d.value > 0);

  const hour = new Date().getHours();
  let greeting = 'Chào buổi tối';
  if (hour >= 5 && hour < 12) greeting = 'Chào buổi sáng';
  else if (hour >= 12 && hour < 18) greeting = 'Chào buổi chiều';

  return (
    <div className="space-y-6 max-w-[1200px] mx-auto">
      {/* Compact Hero */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-lg font-bold text-foreground">
            {greeting}, {authState.username !== 'Guest' ? authState.username : 'Trader'}
          </h1>
          <p className="type-caption mt-0.5">
            {stats && stats.netPnL >= 0 ? "Lãi" : "Lỗ"}{' '}
            <span className={cn('font-bold font-mono', stats && stats.netPnL >= 0 ? 'text-[var(--win)]' : 'text-[var(--loss)]')}>
              {formatCurrency(Math.abs(stats?.netPnL || 0))}
            </span>{' '}
            trong chu kỳ hiện tại
          </p>
        </div>
        <div className="flex items-center gap-5 text-right">
          <div>
            <div className="type-caption text-[10px]">Win Rate</div>
            <div className="text-lg font-mono font-bold text-foreground">{formatPercent(stats?.winRate || 0)}</div>
          </div>
          <div className="h-6 w-px bg-[var(--card-border)]" />
          <div>
            <div className="type-caption text-[10px]">Profit Factor</div>
            <div className="text-lg font-mono font-bold text-foreground">{stats?.profitFactor.toFixed(2)}</div>
          </div>
          <div className="h-6 w-px bg-[var(--card-border)]" />
          <div>
            <div className="type-caption text-[10px]">Max DD</div>
            <div className="text-lg font-mono font-bold text-[var(--loss)]">{formatPercent(stats?.maxDrawdown || 0)}</div>
          </div>
        </div>
      </div>

      {/* KPI Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard 
          title="Lãi/Lỗ ròng" 
          value={formatCurrency(stats?.netPnL || 0)} 
          icon={TrendingUp}
          delta={`${stats?.totalTrades || 0} lệnh đã đóng`}
          deltaType={stats && stats.netPnL >= 0 ? "positive" : "negative"}
          isLoading={isLoading}
        />
        <KpiCard 
          title="Số dư hiện tại" 
          value={formatCurrency(stats?.currentBalance || 0)} 
          icon={Zap}
          isLoading={isLoading}
        />
        <KpiCard 
          title="Tổng số lệnh" 
          value={stats?.totalTrades || 0} 
          icon={History}
          isLoading={isLoading}
        />
        <KpiCard 
          title="Kỳ vọng/Lệnh" 
          value={formatCurrency(stats?.expectancy || 0)} 
          icon={Target}
          isLoading={isLoading}
        />
      </div>

      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-[2fr_1fr] gap-4">
        <Card title="Equity Curve">
          <div className="h-[280px] w-full mt-2">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={equityCurve}>
                <defs>
                  <linearGradient id="eqGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="var(--accent)" stopOpacity={0.2}/>
                    <stop offset="95%" stopColor="var(--accent)" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="currentColor" strokeOpacity={0.06} />
                <XAxis 
                  dataKey="name" 
                  stroke="var(--muted)" 
                  fontSize={10} 
                  tickLine={false} 
                  axisLine={false} 
                  dy={8}
                />
                <YAxis 
                  stroke="var(--muted)" 
                  fontSize={10} 
                  tickLine={false} 
                  axisLine={false} 
                  tickFormatter={(val) => `${(val/1000000).toFixed(0)}M`}
                  width={40}
                />
                <Tooltip 
                  content={({ active, payload }) => {
                    if (active && payload && payload.length) {
                      return (
                        <div className="premium-card p-2.5 shadow-lg !rounded-lg">
                          <p className="type-caption mb-0.5">Lệnh #{payload[0].payload.name}</p>
                          <p className="text-sm font-bold font-mono text-foreground">{formatCurrency(payload[0].value as number)}</p>
                        </div>
                      );
                    }
                    return null;
                  }}
                />
                <Area 
                  type="monotone" 
                  dataKey="balance" 
                  stroke="var(--accent)" 
                  strokeWidth={1.5}
                  fillOpacity={1} 
                  fill="url(#eqGradient)" 
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </Card>

        <Card title="Phân bổ kết quả">
          <div className="h-[200px] w-full mt-2 relative">
             <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={winRateData}
                    cx="50%"
                    cy="50%"
                    innerRadius={50}
                    outerRadius={75}
                    paddingAngle={3}
                    dataKey="value"
                    strokeWidth={0}
                  >
                    {winRateData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                </PieChart>
             </ResponsiveContainer>
             {/* Center text */}
             <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                <span className="type-caption text-[9px]">Tỉ lệ thắng</span>
                <span className="text-xl font-bold font-mono text-foreground">{formatPercent(stats?.winRate || 0)}</span>
             </div>
          </div>
          <div className="space-y-1.5 mt-3 text-[12px]">
             {winRateData.map((item) => (
               <div key={item.name} className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full" style={{ backgroundColor: item.color }} />
                    <span className="type-caption">{item.name}</span>
                  </div>
                  <span className="font-mono font-semibold text-foreground">{item.value} lệnh</span>
               </div>
             ))}
          </div>
        </Card>
      </div>

      {/* Recent Trades Table Preview */}
      <Card title="Giao dịch gần nhất" extra={<a href="/journal" className="type-caption font-semibold text-[var(--accent)] hover:underline">Xem tất cả →</a>}>
        <div className="overflow-x-auto -mx-[var(--card-pad,20px)] px-[var(--card-pad,20px)]">
          <table className="w-full text-left whitespace-nowrap">
            <thead className="border-b border-[var(--card-border)]">
              <tr className="type-title text-[10px]">
                <th className="px-3 py-2.5 font-semibold">Mã</th>
                <th className="px-3 py-2.5 font-semibold">Vị thế</th>
                <th className="px-3 py-2.5 font-semibold">Giá Vào</th>
                <th className="px-3 py-2.5 font-semibold">Giá Đóng</th>
                <th className="px-3 py-2.5 font-semibold text-right">Lãi/Lỗ Ròng</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--card-border)]">
              {trades.slice(-5).reverse().map((trade) => (
                <tr key={trade.rowNumber} className="text-[13px] hover:bg-foreground/[0.02] transition-colors">
                  <td className="px-3 py-3 font-semibold text-foreground">{trade.symbol}</td>
                  <td className="px-3 py-3">
                    <span className={cn(
                      "text-[10px] font-bold uppercase",
                      trade.position === 'LONG' ? "text-[var(--win)]" : "text-[var(--loss)]"
                    )}>
                      {trade.position}
                    </span>
                  </td>
                  <td className="px-3 py-3 font-mono text-[12px] text-[var(--muted)]">{trade.entryPrice.toLocaleString()}</td>
                  <td className="px-3 py-3 font-mono text-[12px] text-[var(--muted)]">{trade.exitPrice.toLocaleString()}</td>
                  <td className={cn(
                    "px-3 py-3 text-right font-mono text-[12px] font-bold",
                    trade.netPnL >= 0 ? "text-[var(--win)]" : "text-[var(--loss)]"
                  )}>
                    {trade.netPnL >= 0 ? "+" : ""}{formatCurrency(trade.netPnL)}
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
