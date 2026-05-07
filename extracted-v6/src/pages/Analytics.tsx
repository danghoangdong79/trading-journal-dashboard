import { useMemo, useState } from 'react';
import { useApp } from '../context.tsx';
import { Card } from '../components/ui/Card.tsx';
import { AnalyticsService, type GroupPnLItem } from '../services/analyticsService.ts';
import { formatCurrency, formatPercent } from '../lib/utils.ts';
import { BarChart, Bar, CartesianGrid, Cell, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';

type AnalyticsTab = 'strategy' | 'sector' | 'mood';

export default function Analytics() {
  const { trades } = useApp();
  const [activeTab, setActiveTab] = useState<AnalyticsTab>('strategy');

  const summary = useMemo(() => AnalyticsService.summarizeTrades(trades), [trades]);
  const activeData: GroupPnLItem[] = useMemo(() => {
    if (activeTab === 'strategy') return AnalyticsService.getPnLByStrategy(trades);
    if (activeTab === 'sector') return AnalyticsService.getPnLBySector(trades);
    return AnalyticsService.getPnLByMood(trades);
  }, [activeTab, trades]);

  const title = activeTab === 'strategy' ? 'Chiến lược' : activeTab === 'sector' ? 'Nhóm ngành' : 'Tâm lý';
  const bestItem = activeData[0];
  const worstItem = activeData.at(-1);

  return (
    <div className="mx-auto max-w-7xl space-y-8">
      <div className="flex w-fit flex-wrap gap-3 rounded-2xl bg-foreground/[0.04] p-2">
        {[
          { key: 'strategy', label: 'Chiến lược' },
          { key: 'sector', label: 'Nhóm ngành' },
          { key: 'mood', label: 'Tâm lý' },
        ].map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key as AnalyticsTab)}
            className={`rounded-xl px-5 py-3 text-sm font-semibold transition-all ${activeTab === tab.key ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/20' : 'text-gray-500 hover:text-foreground'}`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-[1.25fr_0.75fr]">
        <Card title={`PnL theo ${title.toLowerCase()}`} className="min-h-[460px]">
          <div className="mt-4 h-[360px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={activeData} layout="vertical" margin={{ top: 0, right: 24, left: 24, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(148,163,184,0.12)" horizontal={false} />
                <XAxis type="number" tick={{ fill: '#94a3b8', fontSize: 11 }} tickFormatter={(value) => `${(Number(value) / 1_000_000).toFixed(0)}M`} />
                <YAxis type="category" dataKey="name" width={120} tick={{ fill: '#94a3b8', fontSize: 11 }} />
                <Tooltip formatter={(value: number) => formatCurrency(value)} contentStyle={{ background: '#111318', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 14 }} />
                <Bar dataKey="pnl" radius={[0, 8, 8, 0]}>
                  {activeData.map((entry) => <Cell key={entry.name} fill={entry.pnl >= 0 ? '#10b981' : '#f43f5e'} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>

        <div className="space-y-6">
          <Card title="Phân tích chi tiết">
            <div className="space-y-4">
              {activeData.map((item) => (
                <div key={item.name} className="rounded-2xl border border-foreground/10 bg-foreground/[0.03] p-4">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <h4 className="text-xl font-bold text-foreground">{item.name}</h4>
                      <div className="mt-1 text-xs uppercase tracking-widest text-gray-500">{item.trades} giao dịch • win rate {formatPercent(item.winRate)}</div>
                    </div>
                    <div className={`text-right text-2xl font-mono font-bold ${item.pnl >= 0 ? 'text-emerald-500' : 'text-rose-500'}`}>{formatCurrency(item.pnl)}</div>
                  </div>
                  <div className="mt-3 grid grid-cols-3 gap-3 text-xs text-gray-500">
                    <div><div className="uppercase tracking-widest">PnL TB</div><div className="mt-1 font-mono text-foreground">{formatCurrency(item.avgPnL)}</div></div>
                    <div><div className="uppercase tracking-widest">Lệnh thắng</div><div className="mt-1 font-mono text-foreground">{item.wins}</div></div>
                    <div><div className="uppercase tracking-widest">Lệnh thua</div><div className="mt-1 font-mono text-foreground">{item.losses}</div></div>
                  </div>
                </div>
              ))}
            </div>
          </Card>

          <Card title="Snapshot hiệu suất">
            <div className="space-y-4 pt-1 text-sm">
              <div className="flex items-center justify-between"><span className="text-gray-500">Kỳ vọng mỗi lệnh</span><span className="font-mono font-bold text-foreground">{formatCurrency(summary.avgPnL)}</span></div>
              <div className="flex items-center justify-between"><span className="text-gray-500">Profit factor</span><span className="font-mono font-bold text-foreground">{Number.isFinite(summary.profitFactor) ? summary.profitFactor.toFixed(2) : '∞'}</span></div>
              <div className="flex items-center justify-between"><span className="text-gray-500">Best {title.toLowerCase()}</span><span className="font-mono font-bold text-emerald-500">{bestItem ? `${bestItem.name} • ${formatCurrency(bestItem.pnl)}` : '—'}</span></div>
              <div className="flex items-center justify-between"><span className="text-gray-500">Worst {title.toLowerCase()}</span><span className="font-mono font-bold text-rose-500">{worstItem ? `${worstItem.name} • ${formatCurrency(worstItem.pnl)}` : '—'}</span></div>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
