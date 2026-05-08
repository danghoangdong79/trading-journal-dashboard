import { useEffect, useState } from 'react';
import type { ReactNode } from 'react';
import { AlertCircle, BarChart3, CheckCircle, ChevronDown, Database, ExternalLink, Link2, LogOut, Monitor, Moon, Save, Sun, User } from 'lucide-react';
import type { MetricKey } from '../types.ts';
import { useApp } from '../context.tsx';
import { Card } from '../components/ui/Card.tsx';
import { formatCurrency, formatPercent } from '../lib/utils.ts';
import { cn } from '../lib/utils.ts';

function SettingsPanel({ title, subtitle, children, defaultOpen = false }: { title: string; subtitle?: string; children: ReactNode; defaultOpen?: boolean }) {
  return (
    <details open={defaultOpen} className="group premium-card p-4">
      <summary className="flex cursor-pointer list-none items-center justify-between gap-4 [&::-webkit-details-marker]:hidden">
        <div className="min-w-0">
          <h3 className="type-title truncate">{title}</h3>
          {subtitle && <p className="mt-1 type-caption text-[11px] leading-4">{subtitle}</p>}
        </div>
        <div className="rounded-md border border-[var(--card-border)] bg-[var(--surface-soft)] p-1.5 text-[var(--muted)] transition-transform group-open:rotate-180">
          <ChevronDown size={14} />
        </div>
      </summary>
      <div className="mt-4 border-t border-[var(--card-border)] pt-4">
        {children}
      </div>
    </details>
  );
}

const METRIC_DEFINITIONS: { key: MetricKey; label: string; meaning: string; input: string; source: string }[] = [
  { key: 'netPnL', label: 'Lãi/Lỗ ròng', meaning: 'Kết quả cuối cùng của các lệnh sau phí và thuế.', input: 'Nhập PnL/fees đúng trong JOURNAL. Dashboard đọc Net PnL để tính.', source: 'JOURNAL!U:U' },
  { key: 'currentBalance', label: 'Số dư hiện tại', meaning: 'Đường vốn tại giao dịch mới nhất, đã cộng nạp/rút nếu có.', input: 'Nhập JOURNAL theo thời gian và cập nhật CASHFLOW nếu có nạp/rút.', source: 'JOURNAL + CASHFLOW' },
  { key: 'totalTrades', label: 'Tổng số lệnh', meaning: 'Số lệnh đã đóng dùng cho KPI, không tính lệnh đang mở.', input: 'Mỗi lệnh nhập 1 dòng. Status Đang mở không tính vào closed trades.', source: 'JOURNAL!A:A' },
  { key: 'expectancy', label: 'Kỳ vọng/Lệnh', meaning: 'Lãi/lỗ trung bình trên mỗi lệnh đã đóng.', input: 'Cần nhập Net PnL chính xác. Dữ liệu càng đủ mẫu chỉ số càng đáng tin.', source: 'Tính từ JOURNAL' },
  { key: 'feeCharges', label: 'Phí định kỳ', meaning: 'Tổng chi phí ngoài từng lệnh: phí nền tảng, lãi vay, duy trì...', input: 'Nhập mỗi khoản phí 1 dòng trong FEE_CHARGES, Amount là số dương.', source: 'FEE_CHARGES!A:L' },
];

export default function Settings() {
  const { settings, updateSettings, isLoading, refreshData, error, authState, logout, theme, setTheme, sheetConfig, effectiveRisk } = useApp();
  const [localSheetId, setLocalSheetId] = useState(settings.sheetId);
  const [localApiKey, setLocalApiKey] = useState(settings.apiKey);
  const [journalGid, setJournalGid] = useState(settings.journalGid || '913303097');
  const [configGid, setConfigGid] = useState(settings.configGid || '0');
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [authEnabled, setAuthEnabled] = useState(settings.auth?.enabled ?? true);
  const [username, setUsername] = useState(settings.auth?.username || 'admin');
  const [siteName, setSiteName] = useState(settings.siteName || 'Dahodo.Journal');
  const [customerName, setCustomerName] = useState(settings.appName || 'Phương Trần');
  const [authSaveSuccess, setAuthSaveSuccess] = useState(false);
  const [riskDraft, setRiskDraft] = useState(effectiveRisk);
  const [riskSaveSuccess, setRiskSaveSuccess] = useState(false);
  const [metricDraft, setMetricDraft] = useState(settings.metrics);
  const [metricSaveSuccess, setMetricSaveSuccess] = useState(false);
  const isSheetRiskActive = Boolean(sheetConfig);

  useEffect(() => {
    setRiskDraft(effectiveRisk);
  }, [effectiveRisk]);

  const handleSaveSheet = () => {
    const nextSheetId = localSheetId.trim();
    updateSettings({ sheetId: nextSheetId, apiKey: localApiKey.trim(), journalGid: journalGid.trim() || '913303097', configGid: configGid.trim() || '0', isDemoMode: nextSheetId ? false : true });
    setSaveSuccess(true);
    setTimeout(() => setSaveSuccess(false), 3000);
  };

  const handleSaveAuth = () => {
    const nextSiteName = siteName.trim() || 'Dahodo.Journal';
    const nextCustomerName = customerName.trim() || 'Phương Trần';
    updateSettings({ siteName: nextSiteName, appName: nextCustomerName, auth: { ...settings.auth, enabled: authEnabled, username: username.trim() || 'admin' } });
    setAuthSaveSuccess(true);
    setTimeout(() => setAuthSaveSuccess(false), 3000);
  };

  const handleSaveRisk = () => {
    updateSettings({ risk: riskDraft });
    setRiskSaveSuccess(true);
    setTimeout(() => setRiskSaveSuccess(false), 3000);
  };

  const handleSaveMetrics = () => {
    updateSettings({ metrics: metricDraft });
    setMetricSaveSuccess(true);
    setTimeout(() => setMetricSaveSuccess(false), 3000);
  };

  const updateMetricVisible = (key: MetricKey, value: boolean) => {
    setMetricDraft((current) => ({ ...current, visible: { ...current.visible, [key]: value }, primary: !value && current.primary === key ? 'netPnL' : current.primary }));
  };

  const updateRiskDraft = (key: keyof typeof riskDraft, value: number) => {
    setRiskDraft((current) => ({ ...current, [key]: Number.isFinite(value) ? value : 0 }));
  };

  const inputClass = "w-full rounded-md border border-[var(--card-border)] bg-[var(--input-bg)] px-3 py-2 text-[12.5px] transition-all focus:outline-none focus:ring-2 focus:ring-[var(--accent)]/20";

  return (
    <div className="mx-auto max-w-[760px] space-y-3">
      <Card className="!p-4" title="Hiển thị & thương hiệu" subtitle="Đổi tên site, tên user và chế độ sáng/tối. Tất cả lưu trên trình duyệt này.">
        <div className="space-y-3">
          <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
            <div className="space-y-1.5">
              <label className="type-title text-[10px]">Tên site / thương hiệu</label>
              <input type="text" value={siteName} onChange={(event) => setSiteName(event.target.value)} placeholder="Ví dụ: Dahodo.Journal" className={inputClass} />
            </div>
            <div className="space-y-1.5">
              <label className="type-title text-[10px]">Tên user hiển thị</label>
              <input type="text" value={customerName} onChange={(event) => setCustomerName(event.target.value)} placeholder="Ví dụ: Phương Trần" className={inputClass} />
            </div>
          </div>
          <div className="grid grid-cols-3 gap-2">
            {[
              { value: 'system' as const, label: 'Theo hệ thống', icon: Monitor },
              { value: 'light' as const, label: 'Sáng', icon: Sun },
              { value: 'dark' as const, label: 'Tối', icon: Moon },
            ].map((item) => (
              <button key={item.value} onClick={() => setTheme(item.value)} className={cn('flex items-center justify-center gap-2 rounded-md border px-3 py-2 text-[12px] font-bold transition-all', theme === item.value ? 'border-[var(--accent)] bg-[var(--accent-soft)] text-[var(--accent)]' : 'border-[var(--card-border)] text-[var(--muted)] hover:bg-[var(--surface-hover)] hover:text-foreground')}>
                <item.icon size={14} />
                {item.label}
              </button>
            ))}
          </div>
          <button onClick={handleSaveAuth} className="flex w-full items-center justify-center gap-2 rounded-md bg-foreground px-4 py-2 text-[12.5px] font-bold text-background transition-all hover:opacity-90">
            {authSaveSuccess ? <CheckCircle size={16} /> : <Save size={16} />}
            {authSaveSuccess ? 'Đã lưu hiển thị' : 'Lưu hiển thị'}
          </button>
        </div>
      </Card>

      <SettingsPanel title="Tài khoản đăng nhập" subtitle="Thông tin account hiển thị. Mật khẩu/quyền nằm trong tab USERS.">
        <div className="space-y-3">
          <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-3">
            <div className="rounded-md bg-[var(--surface-soft)] p-2.5">
              <p className="type-caption text-[10px]">Đăng nhập</p>
              <p className="mt-1 text-[13px] font-bold text-foreground">{settings.auth.enabled ? 'Đang bật đăng nhập' : 'Không yêu cầu đăng nhập'}</p>
            </div>
            <div className="rounded-md bg-[var(--surface-soft)] p-2.5">
              <p className="type-caption text-[10px]">Tài khoản hiện tại</p>
              <p className="mt-1 text-[13px] font-bold text-foreground">{authState.username || settings.auth.username || 'Guest'}</p>
            </div>
            <div className="rounded-md bg-[var(--surface-soft)] p-2.5">
              <p className="type-caption text-[10px]">Database</p>
              <p className="mt-1 text-[13px] font-bold text-foreground">USERS</p>
            </div>
          </div>

          <div className="flex items-center justify-between rounded-md border border-[var(--accent)]/10 bg-[var(--accent-soft)] p-3">
            <div>
              <h4 className="text-[13px] font-bold text-foreground">Bật đăng nhập</h4>
              <p className="type-caption text-[11px]">Khi chuyển Apps Script, chỉ user trong USERS và trạng thái Bật đăng nhập được.</p>
            </div>
            <button onClick={() => setAuthEnabled(!authEnabled)} className={cn('relative h-5 w-10 rounded-full transition-colors', authEnabled ? 'bg-[var(--accent)]' : 'bg-[var(--muted)]')}>
              <div className={cn('absolute top-0.5 h-4 w-4 rounded-full bg-white transition-all shadow-sm', authEnabled ? 'left-[22px]' : 'left-0.5')} />
            </button>
          </div>

          {authEnabled && (
            <div className="space-y-3">
              <div className="space-y-1.5">
                <label className="flex items-center gap-1.5 type-title text-[10px]"><User size={11} />Tên đăng nhập mặc định</label>
                <input type="text" value={username} onChange={(event) => setUsername(event.target.value)} placeholder="Ví dụ: admin" className={inputClass} />
              </div>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div className="rounded-md bg-[var(--surface-soft)] p-2.5">
                  <p className="type-caption text-[10px]">Quyền</p>
                  <p className="mt-1 text-[13px] font-bold text-foreground">Theo tab USERS</p>
                </div>
                <div className="rounded-md bg-[var(--surface-soft)] p-2.5">
                  <p className="type-caption text-[10px]">Ghi nhớ</p>
                  <p className="mt-1 text-[13px] font-bold text-foreground">{settings.auth.rememberMe ? 'Bật' : 'Theo phiên'}</p>
                </div>
              </div>
              <label className="flex items-center justify-between rounded-md border border-[var(--card-border)] bg-[var(--surface-soft)] p-3 text-[12px] font-semibold text-foreground">
                <span>Ghi nhớ đăng nhập trên trình duyệt này</span>
                <input type="checkbox" checked={settings.auth.rememberMe} onChange={(event) => updateSettings({ auth: { ...settings.auth, rememberMe: event.target.checked } })} className="h-4 w-4 accent-[var(--accent)]" />
              </label>
            </div>
          )}

          <div className="space-y-3 border-t border-[var(--card-border)] pt-3">
            <button onClick={handleSaveAuth} className="flex w-full items-center justify-center gap-2 rounded-md bg-foreground px-4 py-2.5 text-[13px] font-bold text-background transition-all hover:opacity-90">
              {authSaveSuccess ? <CheckCircle size={16} /> : <Save size={16} />}
              {authSaveSuccess ? 'Đã lưu tài khoản' : 'Lưu tài khoản'}
            </button>
            {settings.auth.enabled && authState.isAuthenticated && (
              <button onClick={logout} className="flex w-full items-center justify-center gap-2 rounded-md border border-[var(--card-border)] px-4 py-2.5 text-[13px] font-bold text-[var(--muted)] transition-all hover:bg-[var(--surface-hover)] hover:text-foreground">
                <LogOut size={16} />
                Đăng xuất tài khoản hiện tại
              </button>
            )}
          </div>
        </div>
      </SettingsPanel>

      <SettingsPanel title="Cấu hình rủi ro" subtitle="Vốn, risk/trade, mục tiêu tháng và RR tối thiểu.">
        <div className="space-y-3">
          <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
            <div className="space-y-1.5">
              <label className="type-title text-[10px]">Vốn cổ phiếu - CONFIG!G3</label>
              <input type="number" value={riskDraft.stockCapital} onChange={(event) => updateRiskDraft('stockCapital', Number(event.target.value))} className={inputClass} disabled={isSheetRiskActive} />
            </div>
            <div className="space-y-1.5">
              <label className="type-title text-[10px]">Vốn phái sinh - CONFIG!G4</label>
              <input type="number" value={riskDraft.derivativesCapital} onChange={(event) => updateRiskDraft('derivativesCapital', Number(event.target.value))} className={inputClass} disabled={isSheetRiskActive} />
            </div>
            <div className="space-y-1.5">
              <label className="type-title text-[10px]">Risk tối đa/lệnh (%) - CONFIG!G5</label>
              <input type="number" min="0" max="100" step="0.1" value={riskDraft.maxRiskPerTradePct * 100} onChange={(event) => updateRiskDraft('maxRiskPerTradePct', Number(event.target.value) / 100)} className={inputClass} disabled={isSheetRiskActive} />
            </div>
            <div className="space-y-1.5">
              <label className="type-title text-[10px]">Max drawdown cảnh báo (%)</label>
              <input type="number" min="0" max="100" step="0.5" value={riskDraft.maxDrawdownPct * 100} onChange={(event) => updateRiskDraft('maxDrawdownPct', Number(event.target.value) / 100)} className={inputClass} />
            </div>
            <div className="space-y-1.5">
              <label className="type-title text-[10px]">Mục tiêu tháng (%) - CONFIG!G6</label>
              <input type="number" min="0" max="100" step="0.5" value={riskDraft.monthlyTargetPct * 100} onChange={(event) => updateRiskDraft('monthlyTargetPct', Number(event.target.value) / 100)} className={inputClass} disabled={isSheetRiskActive} />
            </div>
            <div className="space-y-1.5">
              <label className="type-title text-[10px]">RR tối thiểu - CONFIG!G7</label>
              <input type="number" min="0" step="0.1" value={riskDraft.minRewardRisk} onChange={(event) => updateRiskDraft('minRewardRisk', Number(event.target.value))} className={inputClass} disabled={isSheetRiskActive} />
            </div>
          </div>

          <div className="rounded-md bg-[var(--surface-soft)] p-3 text-[12px] text-[var(--muted)]">
            Giới hạn lỗ/lệnh hiện tại: <span className="font-mono font-bold text-foreground">{formatCurrency((riskDraft.stockCapital + riskDraft.derivativesCapital) * riskDraft.maxRiskPerTradePct)}</span> ({formatPercent(riskDraft.maxRiskPerTradePct)} trên tổng vốn {formatCurrency(riskDraft.stockCapital + riskDraft.derivativesCapital)}).
          </div>

          {isSheetRiskActive && (
            <div className="rounded-md border border-[var(--accent)]/10 bg-[var(--accent-soft)] p-3 text-[12px] leading-5 text-[var(--muted)]">
              Runtime Ä‘ang Ä‘á»c tá»« <span className="font-mono text-foreground">CONFIG!G3:G7</span>. Äá»•i vá»‘n, risk/lá»‡nh, má»¥c tiÃªu thÃ¡ng vÃ  RR trá»±c tiáº¿p trÃªn Google Sheet rá»“i báº¥m <span className="font-semibold text-foreground">Kiá»ƒm tra</span>. Max drawdown váº«n lÃ  ngÆ°á»¡ng cáº£nh bÃ¡o local.
            </div>
          )}

          <button onClick={handleSaveRisk} className="flex w-full items-center justify-center gap-2 rounded-md bg-foreground px-4 py-2 text-[12.5px] font-bold text-background transition-all hover:opacity-90">
            {riskSaveSuccess ? <CheckCircle size={16} /> : <Save size={16} />}
            {riskSaveSuccess ? 'Đã lưu cấu hình rủi ro' : 'Lưu cấu hình rủi ro'}
          </button>
        </div>
      </SettingsPanel>

      <SettingsPanel title="Quản lý chỉ số" subtitle="Bật/tắt KPI trên Tổng quan, chọn chỉ số ưu tiên và đọc giải thích từng chỉ số." defaultOpen>
        <div className="space-y-3">
          <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
            {METRIC_DEFINITIONS.map((metric) => (
              <div key={metric.key} className="rounded-md border border-[var(--card-border)] bg-[var(--surface-soft)] p-3">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 text-[13px] font-extrabold text-foreground">
                      <BarChart3 size={14} className="text-[var(--accent)]" />
                      {metric.label}
                    </div>
                    <p className="mt-1 text-[11px] leading-4 text-[var(--muted)]">{metric.meaning}</p>
                  </div>
                  <button onClick={() => updateMetricVisible(metric.key, !metricDraft.visible[metric.key])} className={cn('relative h-5 w-10 shrink-0 rounded-full transition-colors', metricDraft.visible[metric.key] ? 'bg-[var(--accent)]' : 'bg-[var(--muted)]')}>
                    <div className={cn('absolute top-0.5 h-4 w-4 rounded-full bg-white shadow-sm transition-all', metricDraft.visible[metric.key] ? 'left-[22px]' : 'left-0.5')} />
                  </button>
                </div>
                <div className="mt-3 space-y-1.5 rounded-md bg-[var(--card-elevated)] p-2.5 text-[11px] leading-4 text-[var(--muted)]">
                  <p><b className="text-foreground">Cách nhập:</b> {metric.input}</p>
                  <p><b className="text-foreground">Nguồn:</b> <span className="font-mono text-[var(--accent)]">{metric.source}</span></p>
                </div>
                <label className="mt-2 flex items-center gap-2 text-[11px] font-bold text-[var(--muted)]">
                  <input type="radio" name="primaryMetric" checked={metricDraft.primary === metric.key} disabled={!metricDraft.visible[metric.key]} onChange={() => setMetricDraft((current) => ({ ...current, primary: metric.key }))} className="h-3.5 w-3.5 accent-[var(--accent)]" />
                  Đặt làm chỉ số ưu tiên trên Tổng quan
                </label>
              </div>
            ))}
          </div>
          <div className="rounded-md border border-[var(--accent)]/10 bg-[var(--accent-soft)] p-3 text-[12px] leading-5 text-[var(--muted)]">
            Chỉ số ưu tiên sẽ được đưa lên đầu hàng KPI ở trang Tổng quan. Nếu tắt một chỉ số, card đó sẽ ẩn khỏi Tổng quan nhưng dữ liệu gốc vẫn giữ nguyên.
          </div>
          <button onClick={handleSaveMetrics} className="flex w-full items-center justify-center gap-2 rounded-md bg-foreground px-4 py-2 text-[12.5px] font-bold text-background transition-all hover:opacity-90">
            {metricSaveSuccess ? <CheckCircle size={16} /> : <Save size={16} />}
            {metricSaveSuccess ? 'Đã lưu cấu hình chỉ số' : 'Lưu cấu hình chỉ số'}
          </button>
        </div>
      </SettingsPanel>

      <SettingsPanel title="Phí & thuế giao dịch" subtitle="Giai đoạn 2: quản lý bằng tab FEE_PROFILE theo tài khoản, tài sản và ngày hiệu lực.">
        <div className="space-y-3">
          <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-3">
            <div className="rounded-md bg-[var(--surface-soft)] p-2.5">
              <p className="type-caption text-[10px]">Nguồn chuẩn</p>
              <p className="mt-1 text-[13px] font-bold text-foreground">FEE_PROFILE</p>
            </div>
            <div className="rounded-md bg-[var(--surface-soft)] p-2.5">
              <p className="type-caption text-[10px]">Ưu tiên</p>
              <p className="mt-1 text-[13px] font-bold text-foreground">Tài khoản riêng &gt; *</p>
            </div>
            <div className="rounded-md bg-[var(--surface-soft)] p-2.5">
              <p className="type-caption text-[10px]">Ngày áp dụng</p>
              <p className="mt-1 text-[13px] font-bold text-foreground">Theo ngày đóng lệnh</p>
            </div>
          </div>
          <div className="rounded-md border border-[var(--accent)]/10 bg-[var(--accent-soft)] p-3 text-[12px] leading-5 text-[var(--muted)]">
            Công thức JOURNAL hiện đọc phí cổ phiếu/PS từ FEE_PROFILE. Nếu đổi biểu phí, thêm dòng mới với <b className="text-foreground">Từ ngày</b>; không sửa dữ liệu lịch sử để audit vẫn truy vết được.
          </div>
        </div>
      </SettingsPanel>

      <SettingsPanel title="Kết nối Google Sheet" subtitle="Sheet ID, API Key, GID tab và link mở nhanh.">
        <div className="space-y-3">
          <div className="flex items-center justify-between rounded-md border border-[var(--accent)]/10 bg-[var(--accent-soft)] p-3">
            <div>
              <h4 className="text-[13px] font-bold text-foreground">Chế độ Demo</h4>
              <p className="type-caption text-[11px]">Tắt demo để dashboard đọc dữ liệu thật từ Google Sheet.</p>
            </div>
            <button onClick={() => updateSettings({ isDemoMode: !settings.isDemoMode })} className={cn('relative h-5 w-10 rounded-full transition-colors', settings.isDemoMode ? 'bg-[var(--accent)]' : 'bg-[var(--muted)]')}>
              <div className={cn('absolute top-0.5 h-4 w-4 rounded-full bg-white transition-all shadow-sm', settings.isDemoMode ? 'left-[22px]' : 'left-0.5')} />
            </button>
          </div>

          <div className="space-y-3">
            <div className="space-y-1.5">
              <label className="flex items-center gap-1.5 type-title text-[10px]"><Database size={11} />Google Sheet ID</label>
              <input type="text" value={localSheetId} onChange={(event) => setLocalSheetId(event.target.value)} placeholder="Ví dụ: 1aBC...xyz" className={inputClass} />
            </div>
            <div className="space-y-1.5">
              <label className="flex items-center gap-1.5 type-title text-[10px]"><Link2 size={11} />API Key</label>
              <input type="password" value={localApiKey} onChange={(event) => setLocalApiKey(event.target.value)} placeholder="Có thể bỏ trống nếu server đã có service account" className={inputClass} />
            </div>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div className="space-y-1.5">
                <label className="type-title text-[10px]">GID tab JOURNAL</label>
                <input type="text" value={journalGid} onChange={(event) => setJournalGid(event.target.value)} className={inputClass} />
              </div>
              <div className="space-y-1.5">
                <label className="type-title text-[10px]">GID tab CONFIG</label>
                <input type="text" value={configGid} onChange={(event) => setConfigGid(event.target.value)} className={inputClass} />
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button onClick={handleSaveSheet} disabled={isLoading} className="flex flex-1 items-center justify-center gap-2 rounded-md bg-[var(--accent)] py-2.5 text-[13px] font-bold text-white transition-all hover:opacity-90 disabled:opacity-50">
              {saveSuccess ? <CheckCircle size={16} /> : <Save size={16} />}
              {saveSuccess ? 'Đã lưu' : 'Lưu kết nối'}
            </button>
            <button onClick={() => void refreshData()} disabled={isLoading} className="rounded-md border border-[var(--card-border)] px-3 py-2.5 text-[12px] font-semibold text-[var(--muted)] transition-all hover:bg-[var(--surface-hover)] hover:text-foreground disabled:opacity-50">
              Kiểm tra
            </button>
            <a href="https://console.cloud.google.com/apis/credentials" target="_blank" rel="noreferrer" className="rounded-md border border-[var(--card-border)] p-2.5 text-[var(--muted)] transition-all hover:bg-[var(--surface-hover)]" title="Lấy API Key">
              <ExternalLink size={16} />
            </a>
          </div>

          <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
            <a href={settings.sheetId ? `https://docs.google.com/spreadsheets/d/${settings.sheetId}/edit#gid=${settings.journalGid || journalGid}` : '/settings'} target={settings.sheetId ? '_blank' : '_self'} rel="noreferrer" className="rounded-md border border-[var(--card-border)] px-3 py-2 text-center text-[11px] font-bold text-[var(--muted)] hover:bg-[var(--surface-hover)] hover:text-foreground">Mở JOURNAL</a>
            <a href={settings.sheetId ? `https://docs.google.com/spreadsheets/d/${settings.sheetId}/edit#gid=${settings.configGid || configGid}` : '/settings'} target={settings.sheetId ? '_blank' : '_self'} rel="noreferrer" className="rounded-md border border-[var(--card-border)] px-3 py-2 text-center text-[11px] font-bold text-[var(--muted)] hover:bg-[var(--surface-hover)] hover:text-foreground">Mở CONFIG</a>
            <a href={settings.sheetId ? `https://docs.google.com/spreadsheets/d/${settings.sheetId}/edit#gid=780636680` : '/settings'} target={settings.sheetId ? '_blank' : '_self'} rel="noreferrer" className="rounded-md border border-[var(--card-border)] px-3 py-2 text-center text-[11px] font-bold text-[var(--muted)] hover:bg-[var(--surface-hover)] hover:text-foreground">Mở USERS</a>
          </div>

          {error && (
            <div className="flex gap-3 rounded-md border border-[var(--loss)]/15 bg-[var(--loss)]/5 p-3">
              <AlertCircle size={16} className="mt-0.5 shrink-0 text-[var(--loss)]" />
              <div className="type-caption text-[11px] leading-relaxed">
                <p className="mb-1 font-bold text-[var(--loss)]">Chưa đọc được dữ liệu thật</p>
                <p>{error}</p>
              </div>
            </div>
          )}

          <div className="flex gap-3 rounded-md border border-amber-500/10 bg-amber-500/5 p-3">
            <AlertCircle size={16} className="shrink-0 text-amber-500 mt-0.5" />
            <div className="type-caption text-[11px] leading-relaxed">
              <p className="mb-1 font-bold text-amber-600 dark:text-amber-400">Lưu ý bảo mật:</p>
              Sheet ID/API Key chỉ được lưu cục bộ trong trình duyệt. Nếu Sheet riêng tư, server cần <code className="font-mono text-foreground">GOOGLE_APPLICATION_CREDENTIALS</code>, <code className="font-mono text-foreground">KHANGHANG_SERVICE_ACCOUNT_PATH</code> hoặc <code className="font-mono text-foreground">GOOGLE_SERVICE_ACCOUNT_JSON</code>. Tab dữ liệu phải là <code className="font-mono text-foreground">JOURNAL</code> và app đọc range <code className="font-mono text-foreground">A1:X2000</code>.
            </div>
          </div>
        </div>
      </SettingsPanel>

      <SettingsPanel title="Hướng dẫn cấu hình">
        <div className="space-y-2.5 text-[13px] leading-relaxed text-[var(--muted)]">
          <p>1. Mở Google Sheet nhật ký giao dịch của bạn.</p>
          <p>2. Copy phần ID từ URL: <code className="font-mono text-[var(--accent)]">docs.google.com/spreadsheets/d/[SHEET_ID]/edit</code></p>
          <p>3. Tạo API Key trong Google Cloud Console và bật Google Sheets API.</p>
          <p>4. Đảm bảo tab có tên <code className="font-mono text-foreground">JOURNAL</code> với đúng schema 24 cột.</p>
        </div>
      </SettingsPanel>
    </div>
  );
}
