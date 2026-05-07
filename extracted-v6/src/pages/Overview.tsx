import { 
  TrendingUp, 
  BarChart3, 
  Target, 
  Percent, 
  Zap, 
  ArrowUpRight, 
  History,
  Activity
} from 'lucide-react';
import { useApp } from '../context.tsx';
import { KpiCard, Card } from '../components/ui/Card.tsx';
import { formatCurrency, formatPercent, cn } from '../lib/utils.ts';
import { 
  LineChart, 
  Line, 
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
    { name: 'Win', value: stats?.winningTrades || 0, color: '#10B981' },
    { name: 'Lose', value: stats?.losingTrades || 0, color: '#EF4444' },
    { name: 'Hòa', value: stats?.breakEvenTrades || 0, color: '#F59E0B' },
  ].filter(d => d.value > 0);

  const hour = new Date().getHours();
  let greeting = 'Chào buổi tối';
  let icon = '🌙';
  if (hour >= 5 && hour < 12) {
    greeting = 'Chào buổi sáng';
    icon = '☀️';
  } else if (hour >= 12 && hour < 18) {
    greeting = 'Chào buổi chiều';
    icon = '🌅';
  }

  return (
    <div className="space-y-8 max-w-7xl mx-auto">
      {/* Hero Summary */}
      <Card className="bg-gradient-to-br from-blue-600/10 via-transparent to-transparent border-blue-500/20">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
           <div>
            <h1 className="text-xl font-bold text-foreground flex items-center gap-2">
              {greeting}, {authState.username !== 'Guest' ? authState.username : 'Trader'}! 
              <span className="text-2xl animate-bounce">{icon}</span>
            </h1>
            <p className="text-gray-500 font-medium text-sm mt-1">
              Bạn đang {stats && stats.netPnL >= 0 ? "lãi" : "lỗ"} 
              <span className={stats && stats.netPnL >= 0 ? "text-emerald-500 font-bold mx-1" : "text-rose-500 font-bold mx-1"}>
                {formatCurrency(Math.abs(stats?.netPnL || 0))}
              </span>
              trong chu kỳ hiện tại.
            </p>
          </div>
          <div className="flex items-center gap-4">
             <div className="text-right">
                <div className="text-[10px] text-gray-500 uppercase font-bold tracking-wider">Win Rate</div>
                <div className="text-xl font-mono font-bold text-foreground">{formatPercent(stats?.winRate || 0)}</div>
             </div>
             <div className="h-8 w-px bg-foreground/10" />
             <div className="text-right">
                <div className="text-[10px] text-gray-500 uppercase font-bold tracking-wider">Profit Factor</div>
                <div className="text-xl font-mono font-bold text-foreground">{stats?.profitFactor.toFixed(2)}</div>
             </div>
             <div className="h-8 w-px bg-foreground/10" />
             <div className="text-right">
                <div className="text-[10px] text-gray-500 uppercase font-bold tracking-wider">Max DD</div>
                <div className="text-xl font-mono font-bold text-rose-500">{formatPercent(stats?.maxDrawdown || 0)}</div>
             </div>
          </div>
        </div>
      </Card>

      {/* KPI Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard 
          title="Lãi/Lỗ Ròng" 
          value={formatCurrency(stats?.netPnL || 0)} 
          icon={TrendingUp}
          delta="+12%"
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
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card title="Equity Curve" className="lg:col-span-2 min-h-[400px]">
          <div className="h-[320px] w-full mt-4">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={equityCurve}>
                <defs>
                  <linearGradient id="eqGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#3B82F6" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#3B82F6" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(255,255,255,0.05)" />
                <XAxis 
                  dataKey="name" 
                  stroke="#4B5563" 
                  fontSize={10} 
                  tickLine={false} 
                  axisLine={false} 
                  dy={10}
                />
                <YAxis 
                  stroke="#4B5563" 
                  fontSize={10} 
                  tickLine={false} 
                  axisLine={false} 
                  tickFormatter={(val) => `${(val/1000000).toFixed(0)}M`}
                />
                <Tooltip 
                  content={({ active, payload }) => {
                    if (active && payload && payload.length) {
                      return (
                        <div className="bg-background border border-foreground/10 p-3 rounded-lg shadow-xl">
                          <p className="text-xs text-gray-500 mb-1">Lệnh #{payload[0].payload.name}</p>
                          <p className="text-sm font-bold text-foreground">{formatCurrency(payload[0].value as number)}</p>
                        </div>
                      );
                    }
                    return null;
                  }}
                />
                <Area 
                  type="monotone" 
                  dataKey="balance" 
                  stroke="#3B82F6" 
                  strokeWidth={2}
                  fillOpacity={1} 
                  fill="url(#eqGradient)" 
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </Card>

        <Card title="Phân bổ kết quả" className="min-h-[400px]">
          <div className="h-[280px] w-full mt-4 relative">
             <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={winRateData}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={85}
                    paddingAngle={5}
                    dataKey="value"
                  >
                    {winRateData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
             </ResponsiveContainer>
             {/* Center text */}
             <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none pb-2">
                <span className="text-[10px] text-gray-500 uppercase font-bold tracking-widest">Tỉ lệ thắng</span>
                <span className="text-2xl font-bold font-mono text-foreground">{formatPercent(stats?.winRate || 0)}</span>
             </div>
          </div>
          <div className="space-y-2 mt-4 text-xs font-medium">
             {winRateData.map((item) => (
               <div key={item.name} className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full" style={{ backgroundColor: item.color }} />
                    <span className="text-gray-500">{item.name}</span>
                  </div>
                  <span className="text-foreground">{item.value} lệnh</span>
               </div>
             ))}
          </div>
        </Card>
      </div>

      {/* Recent Trades Table Preview */}
      <Card title="Giao dịch gần nhất" extra={<a href="/journal" className="text-xs text-blue-400 hover:underline">Xem tất cả</a>}>
        <div className="overflow-x-auto">
          <table className="w-full text-left whitespace-nowrap">
            <thead className="border-b border-foreground/10 text-[10px] text-gray-500 uppercase tracking-wider font-bold">
              <tr>
                <th className="px-4 py-3">Mã</th>
                <th className="px-4 py-3">Vị thế</th>
                <th className="px-4 py-3">Giá Vào</th>
                <th className="px-4 py-3">Giá Đóng</th>
                <th className="px-4 py-3 text-right">Lãi/Lỗ Ròng</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-foreground/5">
              {trades.slice(-5).reverse().map((trade) => (
                <tr key={trade.rowNumber} className="text-sm hover:bg-foreground/5 transition-colors">
                  <td className="px-4 py-4 font-bold text-foreground">{trade.symbol}</td>
                  <td className="px-4 py-4">
                    <span className={cn(
                      "px-2 py-0.5 rounded text-[10px] font-bold uppercase",
                      trade.position === 'LONG' ? "bg-emerald-500/10 text-emerald-500" : "bg-rose-500/10 text-rose-500"
                    )}>
                      {trade.position}
                    </span>
                  </td>
                  <td className="px-4 py-4 font-mono text-xs">{trade.entryPrice.toLocaleString()}</td>
                  <td className="px-4 py-4 font-mono text-xs">{trade.exitPrice.toLocaleString()}</td>
                  <td className={cn(
                    "px-4 py-4 text-right font-mono text-xs font-bold",
                    trade.netPnL >= 0 ? "text-emerald-500" : "text-rose-500"
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
