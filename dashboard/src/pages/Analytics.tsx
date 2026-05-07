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
    <div className="mx-auto max-w-[1200px] space-y-6">
      {/* Tab Switcher */}
      <div className="flex gap-1 rounded-lg bg-foreground/[0.04] p-1 w-fit">
        {[
          { key: 'strategy', label: 'Chiến lược' },
          { key: 'sector', label: 'Nhóm ngành' },
          { key: 'mood', label: 'Tâm lý' },
        ].map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key as AnalyticsTab)}
            className={`rounded-md px-4 py-2 text-[12px] font-semibold transition-all ${activeTab === tab.key ? 'bg-[var(--accent)] text-white shadow-sm' : 'text-[var(--muted)] hover:text-foreground'}`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-[1.3fr_0.7fr]">
        <Card title={`PnL theo ${title.toLowerCase()}`}>
          <div className="mt-2 h-[340px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={activeData} layout="vertical" margin={{ top: 0, right: 16, left: 16, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--card-border)" horizontal={false} />
                <XAxis type="number" tick={{ fill: 'var(--muted)', fontSize: 10 }} tickFormatter={(value) => `${(Number(value) / 1_000_000).toFixed(0)}M`} />
                <YAxis type="category" dataKey="name" width={110} tick={{ fill: 'var(--muted)', fontSize: 10 }} />
                <Tooltip formatter={(value: number) => formatCurrency(value)} contentStyle={{ background: 'var(--card-bg)', border: '1px solid var(--card-border)', borderRadius: 8 }} />
                <Bar dataKey="pnl" radius={[0, 4, 4, 0]}>
                  {activeData.map((entry) => <Cell key={entry.name} fill={entry.pnl >= 0 ? 'var(--win)' : 'var(--loss)'} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>

        <div className="space-y-4">
          <Card title="Phân tích chi tiết">
            <div className="space-y-3">
              {activeData.map((item) => (
                <div key={item.name} className="rounded-lg border border-[var(--card-border)] bg-foreground/[0.02] p-3">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <h4 className="text-base font-bold text-foreground">{item.name}</h4>
                      <div className="mt-0.5 type-caption text-[10px]">{item.trades} giao dịch · win rate {formatPercent(item.winRate)}</div>
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

          <Card title="Snapshot hiệu suất">
            <div className="space-y-3 text-[13px]">
              <div className="flex items-center justify-between"><span className="text-[var(--muted)]">Kỳ vọng mỗi lệnh</span><span className="font-mono font-bold text-foreground">{formatCurrency(summary.avgPnL)}</span></div>
              <div className="flex items-center justify-between"><span className="text-[var(--muted)]">Profit factor</span><span className="font-mono font-bold text-foreground">{Number.isFinite(summary.profitFactor) ? summary.profitFactor.toFixed(2) : '∞'}</span></div>
              <div className="flex items-center justify-between"><span className="text-[var(--muted)]">Best {title.toLowerCase()}</span><span className="font-mono font-bold text-[var(--win)]">{bestItem ? `${bestItem.name} · ${formatCurrency(bestItem.pnl)}` : '—'}</span></div>
              <div className="flex items-center justify-between"><span className="text-[var(--muted)]">Worst {title.toLowerCase()}</span><span className="font-mono font-bold text-[var(--loss)]">{worstItem ? `${worstItem.name} · ${formatCurrency(worstItem.pnl)}` : '—'}</span></div>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
