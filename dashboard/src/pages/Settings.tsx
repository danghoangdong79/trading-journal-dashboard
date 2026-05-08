import { useEffect, useState } from 'react';
import type { Dispatch, ReactNode, SetStateAction } from 'react';
import { AlertCircle, BarChart3, CheckCircle, ChevronDown, Copy, Database, ExternalLink, KeyRound, Link2, LogOut, Monitor, Moon, Save, Sun, User, UserPlus, Users } from 'lucide-react';
import type { MetricKey } from '../types.ts';
import { useApp } from '../context.tsx';
import { Card } from '../components/ui/Card.tsx';
import { formatCurrency, formatPercent } from '../lib/utils.ts';
import { cn } from '../lib/utils.ts';

function normalizeText(value: string) {
  return String(value || '')
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
}

function isEnabledStatus(value: string) {
  const normalized = normalizeText(value);
  return normalized === 'bat' || normalized === 'enabled' || normalized === 'active' || normalized === 'true' || normalized === '1' || normalized === 'on';
}

async function sha256Hex(value: string) {
  const encoded = new TextEncoder().encode(value);
  const digest = await crypto.subtle.digest('SHA-256', encoded);
  return Array.from(new Uint8Array(digest))
    .map((item) => item.toString(16).padStart(2, '0'))
    .join('');
}

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
  const { settings, updateSettings, isLoading, isAuthLoading, refreshData, error, authError, authState, logout, theme, setTheme, sheetConfig, effectiveRisk, sheetUsers } = useApp();
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
  const [passwordTarget, setPasswordTarget] = useState('');
  const [passwordPlain, setPasswordPlain] = useState('');
  const [passwordHash, setPasswordHash] = useState('');
  const [passwordHelperMessage, setPasswordHelperMessage] = useState('');
  const [newUserName, setNewUserName] = useState('');
  const [newUserPassword, setNewUserPassword] = useState('');
  const [newUserRole, setNewUserRole] = useState('Thành viên');
  const [newUserDisplayName, setNewUserDisplayName] = useState('');
  const [newUserStatus, setNewUserStatus] = useState('Bật');
  const [newUserHash, setNewUserHash] = useState('');
  const [newUserRow, setNewUserRow] = useState('');
  const [newUserHelperMessage, setNewUserHelperMessage] = useState('');
  const isSheetRiskActive = Boolean(sheetConfig);
  const enabledUsers = sheetUsers.filter((user) => isEnabledStatus(user.status));
  const nextUserStt = sheetUsers.reduce((max, user) => (
    Number.isFinite(user.rowNumber) ? Math.max(max, user.rowNumber) : max
  ), 0) + 1;

  useEffect(() => {
    setRiskDraft(effectiveRisk);
  }, [effectiveRisk]);

  useEffect(() => {
    setUsername(settings.auth?.username || 'admin');
  }, [settings.auth?.username]);

  useEffect(() => {
    if (passwordTarget) return;
    const preferredUser = enabledUsers.find((user) => normalizeText(user.username) === normalizeText(authState.username || ''));
    if (preferredUser) {
      setPasswordTarget(preferredUser.username);
      return;
    }
    if (enabledUsers[0]) setPasswordTarget(enabledUsers[0].username);
  }, [authState.username, enabledUsers, passwordTarget]);

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
  const helperButtonClass = "inline-flex items-center justify-center gap-2 rounded-md border border-[var(--card-border)] px-3 py-2 text-[12px] font-bold text-[var(--muted)] transition-all hover:bg-[var(--surface-hover)] hover:text-foreground";

  const flashMessage = (setter: Dispatch<SetStateAction<string>>, message: string) => {
    setter(message);
    window.setTimeout(() => setter(''), 2500);
  };

  const copyText = async (value: string, setter: Dispatch<SetStateAction<string>>, successMessage: string) => {
    if (!value.trim()) return;

    try {
      await navigator.clipboard.writeText(value);
      flashMessage(setter, successMessage);
    } catch {
      flashMessage(setter, 'Trình duyệt chưa copy được. Hãy copy thủ công.');
    }
  };

  const handleGeneratePasswordHash = async () => {
    if (!passwordTarget.trim()) {
      flashMessage(setPasswordHelperMessage, 'Chọn user cần đổi mật khẩu trước.');
      return;
    }
    if (!passwordPlain.trim()) {
      flashMessage(setPasswordHelperMessage, 'Nhập mật khẩu mới trước khi sinh hash.');
      return;
    }

    setPasswordHash(await sha256Hex(passwordPlain));
    flashMessage(setPasswordHelperMessage, `Đã sinh hash cho ${passwordTarget}.`);
  };

  const handleBuildUserRow = async () => {
    const normalizedNewUsername = normalizeText(newUserName);
    if (!normalizedNewUsername) {
      flashMessage(setNewUserHelperMessage, 'Nhập tên đăng nhập cho thành viên mới.');
      return;
    }
    if (!newUserPassword.trim()) {
      flashMessage(setNewUserHelperMessage, 'Nhập mật khẩu trước khi tạo dòng USERS.');
      return;
    }
    if (sheetUsers.some((user) => normalizeText(user.username) === normalizedNewUsername)) {
      flashMessage(setNewUserHelperMessage, 'Username này đã tồn tại trong USERS.');
      return;
    }

    const hash = await sha256Hex(newUserPassword);
    const row = [
      String(nextUserStt),
      newUserName.trim(),
      hash,
      newUserRole.trim() || 'Thành viên',
      newUserDisplayName.trim() || newUserName.trim(),
      newUserStatus,
      '',
    ].join('\t');

    setNewUserHash(hash);
    setNewUserRow(row);
    flashMessage(setNewUserHelperMessage, 'Đã tạo sẵn dòng USERS để copy.');
  };

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

      <SettingsPanel title="Tài khoản đăng nhập" subtitle="Runtime bắt buộc đọc tab USERS. Local chỉ lưu bật/tắt login, user gợi ý và ghi nhớ phiên.">
        <div className="space-y-3">
          <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-3">
            <div className="rounded-md bg-[var(--surface-soft)] p-2.5">
              <p className="type-caption text-[10px]">Đăng nhập</p>
              <p className="mt-1 text-[13px] font-bold text-foreground">{settings.auth.enabled ? 'Đang bật đăng nhập' : 'Không yêu cầu đăng nhập'}</p>
            </div>
            <div className="rounded-md bg-[var(--surface-soft)] p-2.5">
              <p className="type-caption text-[10px]">User đang dùng</p>
              <p className="mt-1 text-[13px] font-bold text-foreground">{authState.displayName || authState.username || settings.auth.username || 'Guest'}</p>
            </div>
            <div className="rounded-md bg-[var(--surface-soft)] p-2.5">
              <p className="type-caption text-[10px]">USERS đang bật</p>
              <p className="mt-1 text-[13px] font-bold text-foreground">{isAuthLoading ? 'Đang đọc...' : `${enabledUsers.length}/${sheetUsers.length}`}</p>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-3">
            <div className="rounded-md bg-[var(--surface-soft)] p-2.5">
              <p className="type-caption text-[10px]">Nguồn runtime</p>
              <p className="mt-1 text-[13px] font-bold text-foreground">USERS</p>
            </div>
            <div className="rounded-md bg-[var(--surface-soft)] p-2.5">
              <p className="type-caption text-[10px]">Vai trò</p>
              <p className="mt-1 text-[13px] font-bold text-foreground">{authState.role || 'Theo USERS'}</p>
            </div>
            <div className="rounded-md bg-[var(--surface-soft)] p-2.5">
              <p className="type-caption text-[10px]">User gợi ý</p>
              <p className="mt-1 text-[13px] font-bold text-foreground">{settings.auth.username || 'admin'}</p>
            </div>
          </div>

          <div className="flex items-center justify-between rounded-md border border-[var(--accent)]/10 bg-[var(--accent-soft)] p-3">
            <div>
              <h4 className="text-[13px] font-bold text-foreground">Bật đăng nhập</h4>
              <p className="type-caption text-[11px]">Chỉ dòng có username, mật khẩu mã hóa và trạng thái Bật trong USERS mới đăng nhập được.</p>
            </div>
            <button onClick={() => setAuthEnabled(!authEnabled)} className={cn('relative h-5 w-10 rounded-full transition-colors', authEnabled ? 'bg-[var(--accent)]' : 'bg-[var(--muted)]')}>
              <div className={cn('absolute top-0.5 h-4 w-4 rounded-full bg-white transition-all shadow-sm', authEnabled ? 'left-[22px]' : 'left-0.5')} />
            </button>
          </div>

          {authEnabled && (
            <div className="space-y-3">
              <div className="space-y-1.5">
                <label className="flex items-center gap-1.5 type-title text-[10px]"><User size={11} />Tài khoản gợi ý ở màn login</label>
                <input type="text" value={username} onChange={(event) => setUsername(event.target.value)} placeholder="Ví dụ: admin" className={inputClass} />
              </div>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div className="rounded-md bg-[var(--surface-soft)] p-2.5">
                  <p className="type-caption text-[10px]">Mật khẩu</p>
                  <p className="mt-1 text-[13px] font-bold text-foreground">Đọc hash từ USERS</p>
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

          {authError && (
            <div className="flex gap-3 rounded-md border border-[var(--loss)]/15 bg-[var(--loss)]/5 p-3">
              <AlertCircle size={16} className="mt-0.5 shrink-0 text-[var(--loss)]" />
              <div className="type-caption text-[11px] leading-relaxed">
                <p className="mb-1 font-bold text-[var(--loss)]">USERS chưa đọc được</p>
                <p>{authError}</p>
              </div>
            </div>
          )}

          {!authError && authEnabled && (
            <div className="rounded-md border border-[var(--accent)]/10 bg-[var(--accent-soft)] p-3 text-[12px] leading-5 text-[var(--muted)]">
              Runtime đang đọc trực tiếp <span className="font-mono text-foreground">USERS!A:G</span>. Username local chỉ để điền sẵn ô login; xác thực thật dùng <span className="font-semibold text-foreground">Tên đăng nhập + Mật khẩu mã hóa + Trạng thái</span> trong sheet.
            </div>
          )}

          {!authError && (
            <div className="space-y-3 border-t border-[var(--card-border)] pt-3">
              <div className="flex items-center gap-2 text-[13px] font-bold text-foreground">
                <Users size={15} className="text-[var(--accent)]" />
                Tiện ích USERS
              </div>

              <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
                {sheetUsers.map((user) => (
                  <div key={user.username} className="rounded-md border border-[var(--card-border)] bg-[var(--surface-soft)] p-3">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="truncate text-[13px] font-bold text-foreground">{user.displayName || user.username}</p>
                        <p className="mt-1 font-mono text-[11px] text-[var(--muted)]">{user.username}</p>
                      </div>
                      <span className={cn('rounded-full px-2 py-1 text-[10px] font-extrabold uppercase tracking-[0.04em]', isEnabledStatus(user.status) ? 'bg-[var(--win)]/12 text-[var(--win)]' : 'bg-[var(--loss)]/10 text-[var(--loss)]')}>
                        {user.status || 'Không rõ'}
                      </span>
                    </div>
                    <div className="mt-2 text-[11px] text-[var(--muted)]">
                      Vai trò: <span className="font-semibold text-foreground">{user.role || 'Chưa ghi'}</span>
                    </div>
                  </div>
                ))}
                {sheetUsers.length === 0 && (
                  <div className="rounded-md border border-dashed border-[var(--card-border)] p-3 text-[12px] text-[var(--muted)] sm:col-span-2">
                    Chưa có user hợp lệ để hiển thị từ tab USERS.
                  </div>
                )}
              </div>

              <div className="grid grid-cols-1 gap-3 xl:grid-cols-2">
                <div className="rounded-md border border-[var(--card-border)] bg-[var(--surface-soft)] p-3">
                  <div className="flex items-center gap-2 text-[13px] font-bold text-foreground">
                    <KeyRound size={15} className="text-[var(--accent)]" />
                    Đổi mật khẩu
                  </div>
                  <div className="mt-3 space-y-3">
                    <div className="space-y-1.5">
                      <label className="type-title text-[10px]">User cần đổi</label>
                      <select value={passwordTarget} onChange={(event) => setPasswordTarget(event.target.value)} className={inputClass}>
                        <option value="">Chọn user</option>
                        {sheetUsers.map((user) => (
                          <option key={user.username} value={user.username}>{user.username}</option>
                        ))}
                      </select>
                    </div>
                    <div className="space-y-1.5">
                      <label className="type-title text-[10px]">Mật khẩu mới</label>
                      <input type="password" value={passwordPlain} onChange={(event) => setPasswordPlain(event.target.value)} placeholder="Nhập mật khẩu mới..." className={inputClass} />
                    </div>
                    <button onClick={() => void handleGeneratePasswordHash()} className="flex w-full items-center justify-center gap-2 rounded-md bg-foreground px-4 py-2 text-[12.5px] font-bold text-background transition-all hover:opacity-90">
                      <KeyRound size={15} />
                      Sinh hash mật khẩu
                    </button>
                    <div className="space-y-1.5">
                      <label className="type-title text-[10px]">Hash để dán vào USERS cột C</label>
                      <textarea value={passwordHash} readOnly rows={3} className={`${inputClass} resize-none font-mono text-[11px]`} placeholder="Hash sẽ hiện ở đây sau khi sinh." />
                    </div>
                    <div className="flex gap-2">
                      <button onClick={() => void copyText(passwordHash, setPasswordHelperMessage, 'Đã copy hash mật khẩu.')} disabled={!passwordHash} className={`${helperButtonClass} flex-1 disabled:cursor-not-allowed disabled:opacity-50`}>
                        <Copy size={14} />
                        Copy hash
                      </button>
                      <a href={settings.sheetId ? `https://docs.google.com/spreadsheets/d/${settings.sheetId}/edit#gid=780636680` : '/settings'} target={settings.sheetId ? '_blank' : '_self'} rel="noreferrer" className={helperButtonClass}>
                        <ExternalLink size={14} />
                        Mở USERS
                      </a>
                    </div>
                    <div className="rounded-md bg-[var(--card-elevated)] p-2.5 text-[11px] leading-5 text-[var(--muted)]">
                      Sau khi copy, mở tab <span className="font-mono text-foreground">USERS</span> và thay giá trị ở cột <span className="font-mono text-foreground">C</span> của user <span className="font-semibold text-foreground">{passwordTarget || 'đã chọn'}</span>.
                    </div>
                    {passwordHelperMessage && <p className="text-[11px] font-semibold text-[var(--accent)]">{passwordHelperMessage}</p>}
                  </div>
                </div>

                <div className="rounded-md border border-[var(--card-border)] bg-[var(--surface-soft)] p-3">
                  <div className="flex items-center gap-2 text-[13px] font-bold text-foreground">
                    <UserPlus size={15} className="text-[var(--accent)]" />
                    Thêm thành viên mới
                  </div>
                  <div className="mt-3 space-y-3">
                    <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
                      <div className="space-y-1.5">
                        <label className="type-title text-[10px]">Tên đăng nhập</label>
                        <input type="text" value={newUserName} onChange={(event) => setNewUserName(event.target.value)} placeholder="Ví dụ: trader01" className={inputClass} />
                      </div>
                      <div className="space-y-1.5">
                        <label className="type-title text-[10px]">Tên hiển thị</label>
                        <input type="text" value={newUserDisplayName} onChange={(event) => setNewUserDisplayName(event.target.value)} placeholder="Ví dụ: Trader 01" className={inputClass} />
                      </div>
                      <div className="space-y-1.5">
                        <label className="type-title text-[10px]">Vai trò</label>
                        <input type="text" value={newUserRole} onChange={(event) => setNewUserRole(event.target.value)} placeholder="Ví dụ: Thành viên" className={inputClass} />
                      </div>
                      <div className="space-y-1.5">
                        <label className="type-title text-[10px]">Trạng thái</label>
                        <select value={newUserStatus} onChange={(event) => setNewUserStatus(event.target.value)} className={inputClass}>
                          <option value="Bật">Bật</option>
                          <option value="Tắt">Tắt</option>
                        </select>
                      </div>
                    </div>
                    <div className="space-y-1.5">
                      <label className="type-title text-[10px]">Mật khẩu khởi tạo</label>
                      <input type="password" value={newUserPassword} onChange={(event) => setNewUserPassword(event.target.value)} placeholder="Nhập mật khẩu tạm thời..." className={inputClass} />
                    </div>
                    <button onClick={() => void handleBuildUserRow()} className="flex w-full items-center justify-center gap-2 rounded-md bg-foreground px-4 py-2 text-[12.5px] font-bold text-background transition-all hover:opacity-90">
                      <UserPlus size={15} />
                      Tạo dòng USERS
                    </button>
                    <div className="space-y-1.5">
                      <label className="type-title text-[10px]">Hash mật khẩu mới</label>
                      <textarea value={newUserHash} readOnly rows={2} className={`${inputClass} resize-none font-mono text-[11px]`} placeholder="Hash cho thành viên mới sẽ hiện ở đây." />
                    </div>
                    <div className="space-y-1.5">
                      <label className="type-title text-[10px]">Dòng để dán vào USERS</label>
                      <textarea value={newUserRow} readOnly rows={4} className={`${inputClass} resize-none font-mono text-[11px]`} placeholder="Hệ thống sẽ tạo sẵn 1 dòng TSV theo thứ tự STT, Username, Hash, Vai trò, Tên hiển thị, Trạng thái, Lần đăng nhập cuối." />
                    </div>
                    <div className="flex gap-2">
                      <button onClick={() => void copyText(newUserRow, setNewUserHelperMessage, 'Đã copy dòng USERS mới.')} disabled={!newUserRow} className={`${helperButtonClass} flex-1 disabled:cursor-not-allowed disabled:opacity-50`}>
                        <Copy size={14} />
                        Copy dòng
                      </button>
                      <button onClick={() => void copyText(newUserHash, setNewUserHelperMessage, 'Đã copy hash user mới.')} disabled={!newUserHash} className={`${helperButtonClass} flex-1 disabled:cursor-not-allowed disabled:opacity-50`}>
                        <Copy size={14} />
                        Copy hash
                      </button>
                    </div>
                    <div className="rounded-md bg-[var(--card-elevated)] p-2.5 text-[11px] leading-5 text-[var(--muted)]">
                      Dòng mới sẽ bắt đầu với STT <span className="font-mono text-foreground">{nextUserStt}</span>. Mở tab <span className="font-mono text-foreground">USERS</span>, paste vào dòng trống kế tiếp rồi bấm <span className="font-semibold text-foreground">Kiểm tra</span> để app đọc lại.
                    </div>
                    {newUserHelperMessage && <p className="text-[11px] font-semibold text-[var(--accent)]">{newUserHelperMessage}</p>}
                  </div>
                </div>
              </div>
            </div>
          )}

          <div className="space-y-3 border-t border-[var(--card-border)] pt-3">
            <button onClick={handleSaveAuth} className="flex w-full items-center justify-center gap-2 rounded-md bg-foreground px-4 py-2.5 text-[13px] font-bold text-background transition-all hover:opacity-90">
              {authSaveSuccess ? <CheckCircle size={16} /> : <Save size={16} />}
              {authSaveSuccess ? 'Đã lưu cấu hình login' : 'Lưu cấu hình login'}
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
