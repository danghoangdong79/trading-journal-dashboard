
import { useMemo, useState } from 'react';
import { AlertCircle, CheckCircle2, Flame, Gauge, ShieldCheck, Target, TrendingDown, TrendingUp, ZapOff } from 'lucide-react';
import { useApp } from '../context.tsx';
import { Card, KpiCard } from '../components/ui/Card.tsx';
import { TradeFilterBar } from '../components/filters/TradeFilterBar.tsx';
import { formatCurrency, formatPercent, cn } from '../lib/utils.ts';
import { AnalyticsService } from '../services/analyticsService.ts';
import { ALL_FILTER, filterTrades, getTradeFilterOptions, type TradeFilters, type TradeSelectFilterKey } from '../lib/tradeFilters.ts';

const DEFAULT_RISK_FILTERS: TradeFilters = {
  search: '',
  account: ALL_FILTER,
  assetType: ALL_FILTER,
  symbol: ALL_FILTER,
  status: ALL_FILTER,
  position: ALL_FILTER,
  strategy: ALL_FILTER,
  mood: ALL_FILTER,
  pnlBucket: ALL_FILTER,
  fromDate: '',
  toDate: '',
};

function longestStreak(values: boolean[]) {
  let best = 0;
  let current = 0;
  values.forEach((value) => {
    current = value ? current + 1 : 0;
    if (current > best) best = current;
  });
  return best;
}

function standardDeviation(values: number[]) {
  if (values.length < 2) return 0;
  const avg = values.reduce((sum, value) => sum + value, 0) / values.length;
  return Math.sqrt(values.reduce((sum, value) => sum + (value - avg) ** 2, 0) / (values.length - 1));
}

function scoreStatus(score: number) {
  if (score >= 80) return { label: 'Tốt', tone: 'positive' as const };
  if (score >= 60) return { label: 'Ổn nhưng cần theo dõi', tone: 'neutral' as const };
  return { label: 'Cần giảm rủi ro', tone: 'negative' as const };
}

function sharpeLabel(value: number) {
  if (value < 0) return 'Kém';
  if (value < 1) return 'Trung bình';
  if (value < 2) return 'Tốt';
  if (value < 3) return 'Rất tốt';
  return 'Xuất sắc';
}

function getRiskMoney(trade: { stopLoss: number; entryPrice: number; volume: number; netPnL: number }) {
  if (trade.stopLoss > 0 && trade.entryPrice > 0 && trade.volume > 0) return Math.abs(trade.entryPrice - trade.stopLoss) * trade.volume;
  return Math.abs(Math.min(trade.netPnL, 0));
}

export default function Risk() {
  const { stats, trades, availableAccounts, effectiveRisk } = useApp();
  const [filters, setFilters] = useState<TradeFilters>(DEFAULT_RISK_FILTERS);
  const riskConfig = effectiveRisk;
  const accountCapital = riskConfig.stockCapital + riskConfig.derivativesCapital;
  const lossLimit = accountCapital * riskConfig.maxRiskPerTradePct;
  const drawdownLimit = riskConfig.maxDrawdownPct;
  const dailyDrawdownLimit = 0.035;
  const filterOptions = useMemo(() => getTradeFilterOptions(trades, availableAccounts), [availableAccounts, trades]);
  const riskFilterFields = useMemo<TradeSelectFilterKey[]>(() => {
    const fields: TradeSelectFilterKey[] = [];
    if (filterOptions.accounts.length > 1) fields.push('account');
    if (filterOptions.assetTypes.length > 1) fields.push('assetType');
    if (filterOptions.statuses.length > 1) fields.push('status');
    if (filterOptions.strategies.length > 1) fields.push('strategy');
    return fields;
  }, [filterOptions.accounts.length, filterOptions.assetTypes.length, filterOptions.statuses.length, filterOptions.strategies.length]);
  const filteredTrades = useMemo(() => filterTrades(trades, filters), [filters, trades]);
  const filteredStats = useMemo(() => AnalyticsService.calculateStats(filteredTrades), [filteredTrades]);
  const maxDrawdown = filteredTrades.length > 0 ? filteredStats.maxDrawdown : (stats?.maxDrawdown || 0);

  const risk = useMemo(() => {
    const closed = filteredTrades.filter((trade) => trade.status !== 'Đang mở');
    const summary = AnalyticsService.summarizeTrades(closed);
    const daily = AnalyticsService.getDailyPnL(closed);
    const losses = closed.filter((trade) => trade.netPnL < 0);
    const wins = closed.filter((trade) => trade.netPnL > 0);
    const maxLossTrade = losses.reduce<typeof losses[number] | undefined>((worst, trade) => (!worst || trade.netPnL < worst.netPnL ? trade : worst), undefined);
    const maxWinTrade = wins.reduce<typeof wins[number] | undefined>((best, trade) => (!best || trade.netPnL > best.netPnL ? trade : best), undefined);
    const lossStreak = longestStreak(closed.map((trade) => trade.netPnL < 0));
    const winStreak = longestStreak(closed.map((trade) => trade.netPnL > 0));
    const riskAmounts = closed.map(getRiskMoney).filter((value) => value > 0);
    const avgRiskMoney = riskAmounts.length ? riskAmounts.reduce((sum, value) => sum + value, 0) / riskAmounts.length : 0;
    const avgRiskPct = accountCapital > 0 ? avgRiskMoney / accountCapital : 0;
    const lossLimitBreaches = losses.filter((trade) => Math.abs(trade.netPnL) > lossLimit);
    const riskReward = summary.avgLoss > 0 ? summary.avgWin / summary.avgLoss : 0;
    const expectancyR = summary.avgLoss > 0 ? summary.avgPnL / summary.avgLoss : 0;
    const recoveryNeeded = maxDrawdown ? maxDrawdown / Math.max(1 - maxDrawdown, 0.01) : 0;
    const dailyReturns = daily.map((item) => accountCapital > 0 ? item.pnl / accountCapital : 0);
    const avgDailyReturn = dailyReturns.length ? dailyReturns.reduce((sum, value) => sum + value, 0) / dailyReturns.length : 0;
    const dailyStd = standardDeviation(dailyReturns);
    const sharpe = dailyStd > 0 ? (avgDailyReturn / dailyStd) * Math.sqrt(252) : avgDailyReturn > 0 ? 99 : 0;
    const worstDay = daily.reduce<typeof daily[number] | undefined>((worst, item) => (!worst || item.pnl < worst.pnl ? item : worst), undefined);
    const dailyDd = accountCapital > 0 ? Math.abs(Math.min(worstDay?.pnl || 0, 0)) / accountCapital : 0;
    const grossProfit = wins.reduce((sum, trade) => sum + trade.netPnL, 0);
    const topWinContribution = grossProfit > 0 && maxWinTrade ? maxWinTrade.netPnL / grossProfit : 0;
    const consistencyRatio = Math.max(0, 1 - topWinContribution);
    const tiltKeywords = ['revenge', 'fomo', 'tilt', 'over', 'quá tay', 'phá kỷ luật', 'vi phạm', 'vào sớm', 'nôn nóng'];
    const ruleViolations = closed.filter((trade) => tiltKeywords.some((keyword) => `${trade.mood} ${trade.reviewNote}`.toLowerCase().includes(keyword)));
    const capitalScore = Math.max(0, 100 - Math.max(0, maxDrawdown - 0.08) * 700 - Math.max(0, avgRiskPct - 0.01) * 2500);
    const disciplineScore = Math.max(0, 100 - ruleViolations.length * 12 - lossLimitBreaches.length * 15 - Math.max(0, lossStreak - 2) * 8);
    const edgeScore = Math.max(0, Math.min(100, 45 + Math.min(riskReward, 3) * 12 + Math.min(summary.profitFactor, 3) * 8 + expectancyR * 45 + Math.min(Math.max(sharpe, -1), 3) * 6));
    const score = Math.round(capitalScore * 0.38 + disciplineScore * 0.34 + edgeScore * 0.28);
    return { closed, summary, losses, maxLossTrade, maxWinTrade, lossStreak, winStreak, lossLimitBreaches, riskReward, recoveryNeeded, avgRiskMoney, avgRiskPct, expectancyR, sharpe, worstDay, dailyDd, topWinContribution, consistencyRatio, ruleViolations, capitalScore, disciplineScore, edgeScore, score };
  }, [accountCapital, filteredTrades, lossLimit, maxDrawdown]);

  const warnings = [
    { active: maxDrawdown > drawdownLimit, title: 'Drawdown vượt ngưỡng', text: `Drawdown hiện tại ${formatPercent(maxDrawdown)} cao hơn giới hạn ${formatPercent(drawdownLimit)}.` },
    { active: risk.lossStreak >= 3, title: 'Chuỗi thua kéo dài', text: `Đang ghi nhận chuỗi thua tối đa ${risk.lossStreak} lệnh. Nên giảm quy mô hoặc nghỉ giao dịch.` },
    { active: risk.lossLimitBreaches.length > 0, title: 'Có lệnh vượt giới hạn lỗ', text: `${risk.lossLimitBreaches.length} lệnh có mức lỗ lớn hơn ${formatCurrency(lossLimit)}.` },
    { active: risk.riskReward < riskConfig.minRewardRisk && risk.summary.losingTrades > 0, title: 'Reward/Risk yếu', text: `R/R hiện tại ${risk.riskReward.toFixed(2)} thấp hơn mục tiêu ${riskConfig.minRewardRisk.toFixed(2)}.` },
    { active: risk.avgRiskPct > 0.01, title: 'Average risk/lệnh cao', text: `Đang ${formatPercent(risk.avgRiskPct)} vốn/lệnh. Vùng tốt là 0.5–1%.` },
    { active: risk.ruleViolations.length > 0, title: 'Có dấu hiệu tilt/FOMO', text: `${risk.ruleViolations.length} lệnh có ghi chú/tâm lý cần review kỷ luật.` },
  ];

  const status = scoreStatus(risk.score);
  const metricRows = [
    { group: 'Lợi nhuận', name: 'Profit Factor', value: Number.isFinite(risk.summary.profitFactor) ? risk.summary.profitFactor.toFixed(2) : '∞', target: '> 1.5 tốt', ok: risk.summary.profitFactor >= 1.5 },
    { group: 'Rủi ro', name: 'Max Drawdown', value: formatPercent(maxDrawdown), target: '< 8–10%', ok: maxDrawdown <= 0.1 },
    { group: 'Rủi ro', name: 'Average Risk / Trade', value: formatPercent(risk.avgRiskPct), target: '0.5–1%/lệnh', ok: risk.avgRiskPct <= 0.01 },
    { group: 'Hiệu quả', name: 'Average R:R', value: risk.riskReward.toFixed(2), target: '>= 2.0 tốt', ok: risk.riskReward >= 2 },
    { group: 'Nhất quán', name: 'Expectancy (R)', value: risk.expectancyR.toFixed(2), target: '> 0.20', ok: risk.expectancyR > 0.2 },
    { group: 'Nhất quán', name: 'Consistency Ratio', value: formatPercent(risk.consistencyRatio), target: 'Top lệnh không > 40% lãi', ok: risk.topWinContribution <= 0.4 },
    { group: 'Kỷ luật', name: 'Rule Violation / Tilt', value: String(risk.ruleViolations.length), target: '0 lần/tháng', ok: risk.ruleViolations.length === 0 },
    { group: 'Rủi ro điều chỉnh', name: 'Sharpe Ratio', value: risk.sharpe > 20 ? '∞' : risk.sharpe.toFixed(2), target: '> 1.5 tốt', ok: risk.sharpe >= 1.5 },
  ];

  return (
    <div className="mx-auto max-w-[1280px] space-y-6">
      <TradeFilterBar
        filters={filters}
        options={filterOptions}
        fields={riskFilterFields}
        onChange={(patch) => setFilters((current) => ({ ...current, ...patch }))}
        onReset={() => setFilters(DEFAULT_RISK_FILTERS)}
        showSearch
        showDateRange
        searchPlaceholder="Tìm mã, chiến lược, tâm lý hoặc ghi chú rủi ro..."
        resultCount={filteredTrades.length}
        totalCount={trades.length}
        title="Bộ lọc rủi ro"
      />

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-[1.05fr_1.4fr]">
        <Card className="border-[var(--accent)]/25 bg-[linear-gradient(135deg,var(--surface-soft),transparent)]">
          <div className="flex items-start justify-between gap-4"><div><div className="type-title mb-2">Risk Health Score</div><div className={cn('text-5xl font-black tracking-tight', status.tone === 'positive' ? 'text-[var(--win)]' : status.tone === 'negative' ? 'text-[var(--loss)]' : 'text-[var(--accent)]')}>{risk.score}/100</div><p className="mt-2 text-[13px] font-semibold text-[var(--muted)]">{status.label} · Tổng hợp bảo toàn vốn, kỷ luật và edge.</p></div><div className="rounded-2xl bg-[var(--accent-soft)] p-4 text-[var(--accent)]"><Gauge size={30} /></div></div>
          <div className="mt-5 grid grid-cols-3 gap-2 text-[12px]"><div className="rounded-xl bg-[var(--surface-soft)] p-3"><div className="type-caption text-[9px]">Bảo toàn vốn</div><div className="mt-1 font-mono text-lg font-bold text-foreground">{risk.capitalScore.toFixed(0)}</div></div><div className="rounded-xl bg-[var(--surface-soft)] p-3"><div className="type-caption text-[9px]">Kỷ luật</div><div className="mt-1 font-mono text-lg font-bold text-foreground">{risk.disciplineScore.toFixed(0)}</div></div><div className="rounded-xl bg-[var(--surface-soft)] p-3"><div className="type-caption text-[9px]">Edge</div><div className="mt-1 font-mono text-lg font-bold text-foreground">{risk.edgeScore.toFixed(0)}</div></div></div>
        </Card>
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          <KpiCard title="Profit Factor" value={Number.isFinite(risk.summary.profitFactor) ? risk.summary.profitFactor.toFixed(2) : '∞'} icon={TrendingUp} delta={risk.summary.profitFactor >= 1.5 ? 'Đạt chuẩn' : 'Cần cải thiện'} deltaType={risk.summary.profitFactor >= 1.5 ? 'positive' : 'negative'} />
          <KpiCard title="Max drawdown" value={formatPercent(maxDrawdown)} icon={TrendingDown} delta={`Cần hồi ${formatPercent(risk.recoveryNeeded)}`} deltaType="negative" />
          <KpiCard title="Avg Risk/Lệnh" value={formatPercent(risk.avgRiskPct)} icon={ShieldCheck} delta={formatCurrency(risk.avgRiskMoney)} deltaType={risk.avgRiskPct <= 0.01 ? 'positive' : 'negative'} />
          <KpiCard title="Sharpe Ratio" value={risk.sharpe > 20 ? '∞' : risk.sharpe.toFixed(2)} icon={Target} delta={sharpeLabel(risk.sharpe)} deltaType={risk.sharpe >= 1.5 ? 'positive' : risk.sharpe < 0 ? 'negative' : 'neutral'} />
          <KpiCard title="Expectancy (R)" value={risk.expectancyR.toFixed(2)} icon={Target} delta={formatCurrency(risk.summary.avgPnL)} deltaType={risk.expectancyR > 0.2 ? 'positive' : 'negative'} />
          <KpiCard title="Average R:R" value={risk.riskReward.toFixed(2)} icon={TrendingUp} delta={`${formatCurrency(risk.summary.avgWin)} / ${formatCurrency(risk.summary.avgLoss)}`} deltaType={risk.riskReward >= 2 ? 'positive' : 'negative'} />
          <KpiCard title="Daily DD xấu nhất" value={formatPercent(risk.dailyDd)} icon={ZapOff} delta={risk.worstDay ? `${risk.worstDay.label} · ${formatCurrency(risk.worstDay.pnl)}` : 'Chưa có'} deltaType={risk.dailyDd <= dailyDrawdownLimit ? 'neutral' : 'negative'} />
          <KpiCard title="Vi phạm kỷ luật" value={risk.ruleViolations.length} icon={Flame} delta={`${risk.lossLimitBreaches.length} lệnh vượt lỗ`} deltaType={risk.ruleViolations.length === 0 && risk.lossLimitBreaches.length === 0 ? 'positive' : 'negative'} />
        </div>
      </div>

      <Card title="Bảng audit chỉ số khách hàng cần" subtitle="Đối chiếu benchmark phổ biến để biết đang nên tăng size, giảm size hay dừng review.">
        <div className="overflow-x-auto"><table className="w-full text-left text-[12px]"><thead className="type-title border-b border-[var(--card-border)] text-[10px]"><tr><th className="py-2">Nhóm</th><th>Chỉ số</th><th>Hiện tại</th><th>Mục tiêu</th><th className="text-center">Audit</th></tr></thead><tbody className="divide-y divide-[var(--card-border)]">{metricRows.map((row) => <tr key={row.name}><td className="py-2 text-[var(--muted)]">{row.group}</td><td className="font-bold text-foreground">{row.name}</td><td className="font-mono font-bold text-foreground">{row.value}</td><td className="text-[var(--muted)]">{row.target}</td><td className="text-center">{row.ok ? <CheckCircle2 className="mx-auto text-[var(--win)]" size={16} /> : <AlertCircle className="mx-auto text-[var(--loss)]" size={16} />}</td></tr>)}</tbody></table></div>
      </Card>

      {/* Risk Controls + Warnings */}
      <div className="grid grid-cols-1 gap-4 xl:grid-cols-[340px_1fr]">
        <Card title="Ngưỡng rủi ro" subtitle="Đọc từ Cài đặt, tương ứng block CONFIG!E1:G7.">
          <div className="space-y-5">
            <div className="block">
              <div className="mb-2 flex items-center justify-between text-[13px]"><span className="text-[var(--muted)]">Giới hạn lỗ/lệnh</span><span className="font-mono font-bold text-foreground">{formatCurrency(lossLimit)}</span></div>
              <p className="type-caption text-[11px]">{formatPercent(riskConfig.maxRiskPerTradePct)} x tổng vốn {formatCurrency(accountCapital)}.</p>
            </div>
            <div className="block">
              <div className="mb-2 flex items-center justify-between text-[13px]"><span className="text-[var(--muted)]">Ngưỡng drawdown</span><span className="font-mono font-bold text-foreground">{formatPercent(drawdownLimit)}</span></div>
              <p className="type-caption text-[11px]">Cập nhật tại Cài đặt để toàn dashboard dùng cùng một ngưỡng.</p>
            </div>
            <div className="grid grid-cols-2 gap-2 text-[12px]">
              <div className="rounded-lg bg-[var(--surface-soft)] p-3"><div className="type-caption text-[10px]">Mục tiêu tháng</div><div className="font-mono font-bold text-foreground">{formatPercent(riskConfig.monthlyTargetPct)}</div></div>
              <div className="rounded-lg bg-[var(--surface-soft)] p-3"><div className="type-caption text-[10px]">RR tối thiểu</div><div className="font-mono font-bold text-foreground">{riskConfig.minRewardRisk.toFixed(2)}</div></div>
            </div>
            <div className="rounded-lg bg-[var(--surface-soft)] p-3 text-[12px] text-[var(--muted)]">
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
              <div key={trade.rowNumber} className="flex items-center justify-between rounded-lg bg-[var(--surface-soft)] p-3 text-[13px]">
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
              <div key={trade.rowNumber} className="flex items-center justify-between rounded-lg bg-[var(--surface-soft)] p-3 text-[13px]">
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
