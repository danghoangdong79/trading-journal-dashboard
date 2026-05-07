import { useState } from 'react';
import { AlertCircle, CheckCircle, Database, ExternalLink, Link2, Lock, LogOut, Save, User } from 'lucide-react';
import { useApp } from '../context.tsx';
import { Card } from '../components/ui/Card.tsx';
import { formatCurrency, formatPercent } from '../lib/utils.ts';
import { cn } from '../lib/utils.ts';

export default function Settings() {
  const { settings, updateSettings, isLoading, refreshData, error, authState, logout } = useApp();
  const [localSheetId, setLocalSheetId] = useState(settings.sheetId);
  const [localApiKey, setLocalApiKey] = useState(settings.apiKey);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [authEnabled, setAuthEnabled] = useState(settings.auth?.enabled ?? true);
  const [username, setUsername] = useState(settings.auth?.username || 'Phương Trần');
  const [password, setPassword] = useState(settings.auth?.passwordHash || '');
  const [customerName, setCustomerName] = useState(settings.appName || 'Phương Trần');
  const [authSaveSuccess, setAuthSaveSuccess] = useState(false);
  const [riskDraft, setRiskDraft] = useState(settings.risk);
  const [riskSaveSuccess, setRiskSaveSuccess] = useState(false);

  const handleSaveSheet = () => {
    const nextSheetId = localSheetId.trim();
    updateSettings({ sheetId: nextSheetId, apiKey: localApiKey.trim(), isDemoMode: nextSheetId ? false : true });
    setSaveSuccess(true);
    setTimeout(() => setSaveSuccess(false), 3000);
  };

  const handleSaveAuth = () => {
    const nextCustomerName = customerName.trim() || 'Phương Trần';
    updateSettings({ appName: nextCustomerName, auth: { ...settings.auth, enabled: authEnabled, username: username.trim() || nextCustomerName, passwordHash: password.trim() || 'admin123' } });
    setAuthSaveSuccess(true);
    setTimeout(() => setAuthSaveSuccess(false), 3000);
  };

  const handleSaveRisk = () => {
    updateSettings({ risk: riskDraft });
    setRiskSaveSuccess(true);
    setTimeout(() => setRiskSaveSuccess(false), 3000);
  };

  const updateRiskDraft = (key: keyof typeof riskDraft, value: number) => {
    setRiskDraft((current) => ({ ...current, [key]: Number.isFinite(value) ? value : 0 }));
  };

  const inputClass = "w-full rounded-md border border-[var(--card-border)] bg-[var(--input-bg)] px-3 py-2.5 text-[13px] transition-all focus:outline-none focus:ring-2 focus:ring-[var(--accent)]/20";

  return (
    <div className="mx-auto max-w-[760px] space-y-5">
      {/* Auth Settings */}
      <Card title="Bảo mật & tài khoản đăng nhập" subtitle="Quản lý tài khoản đăng nhập, mật khẩu và tên khách hàng hiển thị.">
        <div className="space-y-4">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            <div className="rounded-md bg-[var(--surface-soft)] p-3">
              <p className="type-caption text-[10px]">Trạng thái</p>
              <p className="mt-1 text-[13px] font-bold text-foreground">{settings.auth.enabled ? 'Đang bật đăng nhập' : 'Không yêu cầu đăng nhập'}</p>
            </div>
            <div className="rounded-md bg-[var(--surface-soft)] p-3">
              <p className="type-caption text-[10px]">Tài khoản hiện tại</p>
              <p className="mt-1 text-[13px] font-bold text-foreground">{authState.username || settings.auth.username || 'Guest'}</p>
            </div>
            <div className="rounded-md bg-[var(--surface-soft)] p-3">
              <p className="type-caption text-[10px]">Ghi nhớ đăng nhập</p>
              <p className="mt-1 text-[13px] font-bold text-foreground">{settings.auth.rememberMe ? 'Bật' : 'Theo phiên'}</p>
            </div>
          </div>

          <div className="flex items-center justify-between rounded-md border border-[var(--accent)]/10 bg-[var(--accent-soft)] p-3">
            <div>
              <h4 className="text-[13px] font-bold text-foreground">Mật khẩu bảo vệ</h4>
              <p className="type-caption text-[11px]">Yêu cầu đăng nhập khi mở dashboard.</p>
            </div>
            <button onClick={() => setAuthEnabled(!authEnabled)} className={cn('relative h-5 w-10 rounded-full transition-colors', authEnabled ? 'bg-[var(--accent)]' : 'bg-[var(--muted)]')}>
              <div className={cn('absolute top-0.5 h-4 w-4 rounded-full bg-white transition-all shadow-sm', authEnabled ? 'left-[22px]' : 'left-0.5')} />
            </button>
          </div>

          {authEnabled && (
            <div className="space-y-3">
              <div className="space-y-1.5">
                <label className="flex items-center gap-1.5 type-title text-[10px]"><User size={11} />Tên người dùng</label>
                <input type="text" value={username} onChange={(event) => setUsername(event.target.value)} placeholder="Ví dụ: admin" className={inputClass} />
              </div>
              <div className="space-y-1.5">
                <label className="flex items-center gap-1.5 type-title text-[10px]"><Lock size={11} />Mật khẩu</label>
                <input type="password" value={password} onChange={(event) => setPassword(event.target.value)} placeholder="Nhập mật khẩu" className={inputClass} />
              </div>
              <label className="flex items-center justify-between rounded-md border border-[var(--card-border)] bg-[var(--surface-soft)] p-3 text-[12px] font-semibold text-foreground">
                <span>Ghi nhớ đăng nhập trên trình duyệt này</span>
                <input type="checkbox" checked={settings.auth.rememberMe} onChange={(event) => updateSettings({ auth: { ...settings.auth, rememberMe: event.target.checked } })} className="h-4 w-4 accent-[var(--accent)]" />
              </label>
            </div>
          )}

          <div className="space-y-3 border-t border-[var(--card-border)] pt-3">
            <div className="space-y-1.5">
              <label className="type-title text-[10px]">Tên khách hàng</label>
              <input type="text" value={customerName} onChange={(event) => setCustomerName(event.target.value)} placeholder="Ví dụ: Phương Trần" className={inputClass} />
            </div>
            <button onClick={handleSaveAuth} className="flex w-full items-center justify-center gap-2 rounded-md bg-foreground px-4 py-2.5 text-[13px] font-bold text-background transition-all hover:opacity-90">
              {authSaveSuccess ? <CheckCircle size={16} /> : <Save size={16} />}
              {authSaveSuccess ? 'Đã lưu bảo mật' : 'Lưu bảo mật'}
            </button>
            {settings.auth.enabled && authState.isAuthenticated && (
              <button onClick={logout} className="flex w-full items-center justify-center gap-2 rounded-md border border-[var(--card-border)] px-4 py-2.5 text-[13px] font-bold text-[var(--muted)] transition-all hover:bg-[var(--surface-hover)] hover:text-foreground">
                <LogOut size={16} />
                Đăng xuất tài khoản hiện tại
              </button>
            )}
          </div>
        </div>
      </Card>

      <Card title="Cấu hình rủi ro" subtitle="Đồng bộ logic với sheet CONFIG: vốn, risk/trade, mục tiêu tháng và RR tối thiểu.">
        <div className="space-y-4">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div className="space-y-1.5">
              <label className="type-title text-[10px]">Vốn cổ phiếu - CONFIG!G3</label>
              <input type="number" value={riskDraft.stockCapital} onChange={(event) => updateRiskDraft('stockCapital', Number(event.target.value))} className={inputClass} />
            </div>
            <div className="space-y-1.5">
              <label className="type-title text-[10px]">Vốn phái sinh - CONFIG!G4</label>
              <input type="number" value={riskDraft.derivativesCapital} onChange={(event) => updateRiskDraft('derivativesCapital', Number(event.target.value))} className={inputClass} />
            </div>
            <div className="space-y-1.5">
              <label className="type-title text-[10px]">Risk tối đa/lệnh (%) - CONFIG!G5</label>
              <input type="number" min="0" max="100" step="0.1" value={riskDraft.maxRiskPerTradePct * 100} onChange={(event) => updateRiskDraft('maxRiskPerTradePct', Number(event.target.value) / 100)} className={inputClass} />
            </div>
            <div className="space-y-1.5">
              <label className="type-title text-[10px]">Max drawdown cảnh báo (%)</label>
              <input type="number" min="0" max="100" step="0.5" value={riskDraft.maxDrawdownPct * 100} onChange={(event) => updateRiskDraft('maxDrawdownPct', Number(event.target.value) / 100)} className={inputClass} />
            </div>
            <div className="space-y-1.5">
              <label className="type-title text-[10px]">Mục tiêu tháng (%) - CONFIG!G6</label>
              <input type="number" min="0" max="100" step="0.5" value={riskDraft.monthlyTargetPct * 100} onChange={(event) => updateRiskDraft('monthlyTargetPct', Number(event.target.value) / 100)} className={inputClass} />
            </div>
            <div className="space-y-1.5">
              <label className="type-title text-[10px]">RR tối thiểu - CONFIG!G7</label>
              <input type="number" min="0" step="0.1" value={riskDraft.minRewardRisk} onChange={(event) => updateRiskDraft('minRewardRisk', Number(event.target.value))} className={inputClass} />
            </div>
          </div>

          <div className="rounded-md bg-[var(--surface-soft)] p-3 text-[12px] text-[var(--muted)]">
            Giới hạn lỗ/lệnh hiện tại: <span className="font-mono font-bold text-foreground">{formatCurrency((riskDraft.stockCapital + riskDraft.derivativesCapital) * riskDraft.maxRiskPerTradePct)}</span> ({formatPercent(riskDraft.maxRiskPerTradePct)} trên tổng vốn {formatCurrency(riskDraft.stockCapital + riskDraft.derivativesCapital)}).
          </div>

          <button onClick={handleSaveRisk} className="flex w-full items-center justify-center gap-2 rounded-md bg-foreground px-4 py-2.5 text-[13px] font-bold text-background transition-all hover:opacity-90">
            {riskSaveSuccess ? <CheckCircle size={16} /> : <Save size={16} />}
            {riskSaveSuccess ? 'Đã lưu cấu hình rủi ro' : 'Lưu cấu hình rủi ro'}
          </button>
        </div>
      </Card>

      {/* Sheet Connection */}
      <Card title="Kết nối Google Sheet" subtitle="Ưu tiên dữ liệu thật từ tab JOURNAL, API Key chỉ cần khi Sheet đọc công khai qua trình duyệt.">
        <div className="space-y-4">
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
      </Card>

      {/* Guide */}
      <Card title="Hướng dẫn cấu hình">
        <div className="space-y-2.5 text-[13px] leading-relaxed text-[var(--muted)]">
          <p>1. Mở Google Sheet nhật ký giao dịch của bạn.</p>
          <p>2. Copy phần ID từ URL: <code className="font-mono text-[var(--accent)]">docs.google.com/spreadsheets/d/[SHEET_ID]/edit</code></p>
          <p>3. Tạo API Key trong Google Cloud Console và bật Google Sheets API.</p>
          <p>4. Đảm bảo tab có tên <code className="font-mono text-foreground">JOURNAL</code> với đúng schema 24 cột.</p>
        </div>
      </Card>
    </div>
  );
}
