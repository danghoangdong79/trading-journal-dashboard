
import { useMemo, useState } from 'react';
import { AlertCircle, CheckCircle2, Flame, ShieldCheck, Target, TrendingDown, ZapOff } from 'lucide-react';
import { useApp } from '../context.tsx';
import { Card, KpiCard } from '../components/ui/Card.tsx';
import { formatCurrency, formatPercent, cn } from '../lib/utils.ts';
import { AnalyticsService } from '../services/analyticsService.ts';

function longestStreak(values: boolean[]) {
  let best = 0;
  let current = 0;
  values.forEach((value) => {
    current = value ? current + 1 : 0;
    if (current > best) best = current;
  });
  return best;
}

export default function Risk() {
  const { stats, trades } = useApp();
  const [lossLimit, setLossLimit] = useState(50_000_000);
  const [drawdownLimit, setDrawdownLimit] = useState(0.15);

  const risk = useMemo(() => {
    const closed = trades.filter((trade) => trade.status !== 'Đang mở');
    const summary = AnalyticsService.summarizeTrades(closed);
    const losses = closed.filter((trade) => trade.netPnL < 0);
    const wins = closed.filter((trade) => trade.netPnL > 0);
    const maxLossTrade = losses.reduce<typeof losses[number] | undefined>((worst, trade) => (!worst || trade.netPnL < worst.netPnL ? trade : worst), undefined);
    const maxWinTrade = wins.reduce<typeof wins[number] | undefined>((best, trade) => (!best || trade.netPnL > best.netPnL ? trade : best), undefined);
    const lossStreak = longestStreak(closed.map((trade) => trade.netPnL < 0));
    const winStreak = longestStreak(closed.map((trade) => trade.netPnL > 0));
    const lossLimitBreaches = losses.filter((trade) => Math.abs(trade.netPnL) > lossLimit);
    const riskReward = summary.avgLoss > 0 ? summary.avgWin / summary.avgLoss : 0;
    const recoveryNeeded = stats?.maxDrawdown ? stats.maxDrawdown / Math.max(1 - stats.maxDrawdown, 0.01) : 0;
    const score = Math.max(0, Math.min(100, 100 - (stats?.maxDrawdown || 0) * 160 - lossStreak * 7 - lossLimitBreaches.length * 6 + summary.winRate * 20 + Math.min(riskReward, 3) * 5));
    return { closed, summary, losses, maxLossTrade, maxWinTrade, lossStreak, winStreak, lossLimitBreaches, riskReward, recoveryNeeded, score };
  }, [drawdownLimit, lossLimit, stats?.maxDrawdown, trades]);

  const warnings = [
    { active: (stats?.maxDrawdown || 0) > drawdownLimit, title: 'Drawdown vượt ngưỡng', text: `Drawdown hiện tại ${formatPercent(stats?.maxDrawdown || 0)} cao hơn giới hạn ${formatPercent(drawdownLimit)}.` },
    { active: risk.lossStreak >= 3, title: 'Chuỗi thua kéo dài', text: `Đang ghi nhận chuỗi thua tối đa ${risk.lossStreak} l?nh. N?n gi?m quy m? ho?c ngh? giao dịch.` },
    { active: risk.lossLimitBreaches.length > 0, title: 'Có lệnh vượt giới hạn lỗ', text: `${risk.lossLimitBreaches.length} lệnh có mức lỗ lớn hơn ${formatCurrency(lossLimit)}.` },
    { active: risk.riskReward < 1 && risk.summary.losingTrades > 0, title: 'Reward/Risk yếu', text: `Lãi trung bình chưa bù được lỗ trung bình. R/R hiện tại ${risk.riskReward.toFixed(2)}.` },
  ];

  return (
    <div className="mx-auto max-w-7xl space-y-8">
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-5">
        <KpiCard title="Risk score" value={`${risk.score.toFixed(0)}/100`} icon={ShieldCheck} delta={risk.score >= 70 ? 'Ổn định' : risk.score >= 45 ? 'Cần kiểm soát' : 'Rủi ro cao'} deltaType={risk.score >= 70 ? 'positive' : risk.score >= 45 ? 'neutral' : 'negative'} />
        <KpiCard title="Max drawdown" value={formatPercent(stats?.maxDrawdown || 0)} icon={TrendingDown} delta={`Cần hồi ${formatPercent(risk.recoveryNeeded)}`} deltaType="negative" />
        <KpiCard title="Chuỗi thua max" value={risk.lossStreak} icon={Flame} delta={`Chuỗi thắng ${risk.winStreak}`} deltaType={risk.lossStreak >= 3 ? 'negative' : 'neutral'} />
        <KpiCard title="Lỗ lớn nhất" value={formatCurrency(Math.abs(risk.maxLossTrade?.netPnL || 0))} icon={ZapOff} delta={risk.maxLossTrade?.symbol || '?'} deltaType="negative" />
        <KpiCard title="Reward/Risk" value={risk.riskReward.toFixed(2)} icon={Target} delta={`${formatCurrency(risk.summary.avgWin)} / ${formatCurrency(risk.summary.avgLoss)}`} deltaType={risk.riskReward >= 1.5 ? 'positive' : risk.riskReward >= 1 ? 'neutral' : 'negative'} />
      </div>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-[380px_1fr]">
        <Card title="Bộ lọc rủi ro tương tác" subtitle="Điều chỉnh ngưỡng để xem cảnh báo tức thời.">
          <div className="space-y-6">
            <label className="block">
              <div className="mb-2 flex items-center justify-between text-sm"><span className="text-gray-500">Giới hạn lỗ/lệnh</span><span className="font-mono font-bold text-foreground">{formatCurrency(lossLimit)}</span></div>
              <input type="range" min={5_000_000} max={120_000_000} step={5_000_000} value={lossLimit} onChange={(event) => setLossLimit(Number(event.target.value))} className="w-full accent-blue-500" />
            </label>
            <label className="block">
              <div className="mb-2 flex items-center justify-between text-sm"><span className="text-gray-500">Ngưỡng drawdown</span><span className="font-mono font-bold text-foreground">{formatPercent(drawdownLimit)}</span></div>
              <input type="range" min={0.03} max={0.4} step={0.01} value={drawdownLimit} onChange={(event) => setDrawdownLimit(Number(event.target.value))} className="w-full accent-blue-500" />
            </label>
            <div className="rounded-2xl bg-foreground/5 p-4 text-xs text-gray-500">
              <div className="font-bold uppercase tracking-widest text-foreground">NỔn định gi?</div>
              <div className="mt-3 space-y-2"><p>Max drawdown và mức hồi vốn cần thiết.</p><p>Chuỗi thua để quyết định giảm quy mô.</p><p>Lệnh vượt giới hạn lỗ để kiểm tra kỷ luật cắt lỗ.</p><p>Reward/Risk để biết lợi nhuận trung bình có bù được rủi ro không.</p></div>
            </div>
          </div>
        </Card>

        <Card title="Cảnh báo rủi ro & kỷ luật">
          <div className="space-y-4">
            {warnings.map((warning) => (
              <div key={warning.title} className={cn('flex gap-4 rounded-xl border p-4', warning.active ? 'border-rose-500/20 bg-rose-500/10' : 'border-blue-500/20 bg-blue-500/10')}>
                {warning.active ? <AlertCircle className="shrink-0 text-rose-500" /> : <CheckCircle2 className="shrink-0 text-blue-500" />}
                <div><h4 className={cn('text-sm font-bold', warning.active ? 'text-rose-400' : 'text-blue-400')}>{warning.active ? warning.title : `${warning.title}: ổn`}</h4><p className="mt-1 text-xs text-gray-400">{warning.text}</p></div>
              </div>
            ))}
          </div>
        </Card>
      </div>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
        <Card title="Top lệnh cần review">
          <div className="space-y-3">
            {risk.losses.slice().sort((a, b) => a.netPnL - b.netPnL).slice(0, 6).map((trade) => <div key={trade.rowNumber} className="flex items-center justify-between rounded-xl bg-foreground/5 p-3 text-sm"><div><div className="font-bold text-foreground">{trade.symbol}</div><div className="text-xs text-gray-500">{trade.strategy} ? {trade.openDate}</div></div><div className="font-mono font-bold text-rose-500">{formatCurrency(trade.netPnL)}</div></div>)}
          </div>
        </Card>
        <Card title="Lệnh tốt để học lại">
          <div className="space-y-3">
            {risk.closed.slice().sort((a, b) => b.netPnL - a.netPnL).slice(0, 6).map((trade) => <div key={trade.rowNumber} className="flex items-center justify-between rounded-xl bg-foreground/5 p-3 text-sm"><div><div className="font-bold text-foreground">{trade.symbol}</div><div className="text-xs text-gray-500">{trade.strategy} ? {trade.openDate}</div></div><div className="font-mono font-bold text-emerald-500">+{formatCurrency(trade.netPnL)}</div></div>)}
          </div>
        </Card>
      </div>
    </div>
  );
}
