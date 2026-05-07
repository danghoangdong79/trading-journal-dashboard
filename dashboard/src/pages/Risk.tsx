
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
  }, [lossLimit, stats?.maxDrawdown, trades]);

  const warnings = [
    { active: (stats?.maxDrawdown || 0) > drawdownLimit, title: 'Drawdown vượt ngưỡng', text: `Drawdown hiện tại ${formatPercent(stats?.maxDrawdown || 0)} cao hơn giới hạn ${formatPercent(drawdownLimit)}.` },
    { active: risk.lossStreak >= 3, title: 'Chuỗi thua kéo dài', text: `Đang ghi nhận chuỗi thua tối đa ${risk.lossStreak} lệnh. Nên giảm quy mô hoặc nghỉ giao dịch.` },
    { active: risk.lossLimitBreaches.length > 0, title: 'Có lệnh vượt giới hạn lỗ', text: `${risk.lossLimitBreaches.length} lệnh có mức lỗ lớn hơn ${formatCurrency(lossLimit)}.` },
    { active: risk.riskReward < 1 && risk.summary.losingTrades > 0, title: 'Reward/Risk yếu', text: `Lãi trung bình chưa bù được lỗ trung bình. R/R hiện tại ${risk.riskReward.toFixed(2)}.` },
  ];

  return (
    <div className="mx-auto max-w-[1200px] space-y-6">
      {/* KPI Row */}
      <div className="grid grid-cols-2 gap-3 xl:grid-cols-5">
        <KpiCard title="Risk score" value={`${risk.score.toFixed(0)}/100`} icon={ShieldCheck} delta={risk.score >= 70 ? 'Ổn định' : risk.score >= 45 ? 'Cần kiểm soát' : 'Rủi ro cao'} deltaType={risk.score >= 70 ? 'positive' : risk.score >= 45 ? 'neutral' : 'negative'} />
        <KpiCard title="Max drawdown" value={formatPercent(stats?.maxDrawdown || 0)} icon={TrendingDown} delta={`Cần hồi ${formatPercent(risk.recoveryNeeded)}`} deltaType="negative" />
        <KpiCard title="Chuỗi thua max" value={risk.lossStreak} icon={Flame} delta={`Chuỗi thắng ${risk.winStreak}`} deltaType={risk.lossStreak >= 3 ? 'negative' : 'neutral'} />
        <KpiCard title="Lỗ lớn nhất" value={formatCurrency(Math.abs(risk.maxLossTrade?.netPnL || 0))} icon={ZapOff} delta={risk.maxLossTrade?.symbol || '?'} deltaType="negative" />
        <KpiCard title="Reward/Risk" value={risk.riskReward.toFixed(2)} icon={Target} delta={`${formatCurrency(risk.summary.avgWin)} / ${formatCurrency(risk.summary.avgLoss)}`} deltaType={risk.riskReward >= 1.5 ? 'positive' : risk.riskReward >= 1 ? 'neutral' : 'negative'} />
      </div>

      {/* Risk Controls + Warnings */}
      <div className="grid grid-cols-1 gap-4 xl:grid-cols-[340px_1fr]">
        <Card title="Bộ lọc rủi ro" subtitle="Điều chỉnh ngưỡng để xem cảnh báo tức thời.">
          <div className="space-y-5">
            <label className="block">
              <div className="mb-2 flex items-center justify-between text-[13px]"><span className="text-[var(--muted)]">Giới hạn lỗ/lệnh</span><span className="font-mono font-bold text-foreground">{formatCurrency(lossLimit)}</span></div>
              <input type="range" min={5_000_000} max={120_000_000} step={5_000_000} value={lossLimit} onChange={(event) => setLossLimit(Number(event.target.value))} className="w-full" />
            </label>
            <label className="block">
              <div className="mb-2 flex items-center justify-between text-[13px]"><span className="text-[var(--muted)]">Ngưỡng drawdown</span><span className="font-mono font-bold text-foreground">{formatPercent(drawdownLimit)}</span></div>
              <input type="range" min={0.03} max={0.4} step={0.01} value={drawdownLimit} onChange={(event) => setDrawdownLimit(Number(event.target.value))} className="w-full" />
            </label>
            <div className="rounded-lg bg-foreground/[0.03] p-3 text-[12px] text-[var(--muted)]">
              <div className="type-title text-[10px] text-foreground mb-2">Cơ sở đánh giá</div>
              <ul className="space-y-1.5 list-disc pl-4">
                <li>Max drawdown và mức hồi vốn cần thiết.</li>
                <li>Chuỗi thua để quyết định giảm quy mô.</li>
                <li>Lệnh vượt giới hạn lỗ để kiểm tra kỷ luật cắt lỗ.</li>
                <li>Reward/Risk để biết lợi nhuận trung bình có bù được rủi ro không.</li>
              </ul>
            </div>
          </div>
        </Card>

        <Card title="Cảnh báo rủi ro & kỷ luật">
          <div className="space-y-3">
            {warnings.map((warning) => (
              <div key={warning.title} className={cn('flex gap-3 rounded-lg border p-3', warning.active ? 'border-[var(--loss)]/20 bg-[var(--loss)]/5' : 'border-[var(--accent)]/15 bg-[var(--accent)]/5')}>
                {warning.active ? <AlertCircle className="shrink-0 text-[var(--loss)]" size={18} /> : <CheckCircle2 className="shrink-0 text-[var(--accent)]" size={18} />}
                <div>
                  <h4 className={cn('text-[13px] font-bold', warning.active ? 'text-[var(--loss)]' : 'text-[var(--accent)]')}>{warning.active ? warning.title : `${warning.title}: ổn`}</h4>
                  <p className="mt-0.5 type-caption text-[11px]">{warning.text}</p>
                </div>
              </div>
            ))}
          </div>
        </Card>
      </div>

      {/* Review Lists */}
      <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
        <Card title="Top lệnh cần review">
          <div className="space-y-2">
            {risk.losses.slice().sort((a, b) => a.netPnL - b.netPnL).slice(0, 6).map((trade) => (
              <div key={trade.rowNumber} className="flex items-center justify-between rounded-lg bg-foreground/[0.03] p-3 text-[13px]">
                <div>
                  <div className="font-semibold text-foreground">{trade.symbol}</div>
                  <div className="type-caption text-[10px]">{trade.strategy} · {trade.openDate}</div>
                </div>
                <div className="font-mono font-bold text-[var(--loss)]">{formatCurrency(trade.netPnL)}</div>
              </div>
            ))}
          </div>
        </Card>
        <Card title="Lệnh tốt để học lại">
          <div className="space-y-2">
            {risk.closed.slice().sort((a, b) => b.netPnL - a.netPnL).slice(0, 6).map((trade) => (
              <div key={trade.rowNumber} className="flex items-center justify-between rounded-lg bg-foreground/[0.03] p-3 text-[13px]">
                <div>
                  <div className="font-semibold text-foreground">{trade.symbol}</div>
                  <div className="type-caption text-[10px]">{trade.strategy} · {trade.openDate}</div>
                </div>
                <div className="font-mono font-bold text-[var(--win)]">+{formatCurrency(trade.netPnL)}</div>
              </div>
            ))}
          </div>
        </Card>
      </div>
    </div>
  );
}
