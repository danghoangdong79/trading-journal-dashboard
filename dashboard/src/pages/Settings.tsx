import { useState } from 'react';
import { AlertCircle, CheckCircle, Database, ExternalLink, Link2, Lock, Save, User } from 'lucide-react';
import { useApp } from '../context.tsx';
import { Card } from '../components/ui/Card.tsx';
import { cn } from '../lib/utils.ts';

export default function Settings() {
  const { settings, updateSettings, isLoading } = useApp();
  const [localSheetId, setLocalSheetId] = useState(settings.sheetId);
  const [localApiKey, setLocalApiKey] = useState(settings.apiKey);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [authEnabled, setAuthEnabled] = useState(settings.auth?.enabled ?? true);
  const [username, setUsername] = useState(settings.auth?.username || 'Phương Trần');
  const [password, setPassword] = useState(settings.auth?.passwordHash || '');
  const [appName, setAppName] = useState(settings.appName || 'Phương Trần');
  const [authSaveSuccess, setAuthSaveSuccess] = useState(false);

  const handleSaveSheet = () => {
    const hasLiveConfig = Boolean(localSheetId.trim() && localApiKey.trim());
    updateSettings({ sheetId: localSheetId.trim(), apiKey: localApiKey.trim(), isDemoMode: hasLiveConfig ? settings.isDemoMode : true });
    setSaveSuccess(true);
    setTimeout(() => setSaveSuccess(false), 3000);
  };

  const handleSaveAuth = () => {
    updateSettings({ appName: appName.trim() || 'Phương Trần', auth: { ...settings.auth, enabled: authEnabled, username: username.trim() || 'Phương Trần', passwordHash: password.trim() || 'admin123' } });
    setAuthSaveSuccess(true);
    setTimeout(() => setAuthSaveSuccess(false), 3000);
  };

  const inputClass = "w-full rounded-lg border border-[var(--card-border)] bg-background px-3 py-2.5 text-[13px] focus:outline-none focus:ring-1 focus:ring-[var(--accent)]/40 transition-all";

  return (
    <div className="mx-auto max-w-2xl space-y-5">
      {/* Auth Settings */}
      <Card title="Bảo mật & Đăng nhập" subtitle="Cài đặt bảo vệ cho dashboard của bạn.">
        <div className="space-y-4">
          <div className="flex items-center justify-between rounded-lg border border-[var(--accent)]/10 bg-[var(--accent-soft)] p-3">
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
            </div>
          )}

          <div className="space-y-3 border-t border-[var(--card-border)] pt-3">
            <div className="space-y-1.5">
              <label className="type-title text-[10px]">Tên tài khoản / ứng dụng</label>
              <input type="text" value={appName} onChange={(event) => setAppName(event.target.value)} placeholder="Ví dụ: Phương Trần" className={inputClass} />
            </div>
            <button onClick={handleSaveAuth} className="flex w-full items-center justify-center gap-2 rounded-lg bg-foreground px-4 py-2.5 text-[13px] font-bold text-background transition-all hover:opacity-90">
              {authSaveSuccess ? <CheckCircle size={16} /> : <Save size={16} />}
              {authSaveSuccess ? 'Đã lưu bảo mật' : 'Lưu bảo mật'}
            </button>
          </div>
        </div>
      </Card>

      {/* Sheet Connection */}
      <Card title="Kết nối Google Sheet" subtitle="Khai báo sheet thật hoặc dùng demo mode.">
        <div className="space-y-4">
          <div className="flex items-center justify-between rounded-lg border border-[var(--accent)]/10 bg-[var(--accent-soft)] p-3">
            <div>
              <h4 className="text-[13px] font-bold text-foreground">Chế độ Demo</h4>
              <p className="type-caption text-[11px]">Dùng dữ liệu mẫu để trải nghiệm dashboard.</p>
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
              <input type="password" value={localApiKey} onChange={(event) => setLocalApiKey(event.target.value)} placeholder="Nhập Google API Key của bạn" className={inputClass} />
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button onClick={handleSaveSheet} disabled={isLoading} className="flex flex-1 items-center justify-center gap-2 rounded-lg bg-[var(--accent)] py-2.5 text-[13px] font-bold text-white transition-all hover:opacity-90 disabled:opacity-50">
              {saveSuccess ? <CheckCircle size={16} /> : <Save size={16} />}
              {saveSuccess ? 'Đã lưu' : 'Lưu kết nối'}
            </button>
            <a href="https://console.cloud.google.com/apis/credentials" target="_blank" rel="noreferrer" className="rounded-lg border border-[var(--card-border)] p-2.5 text-[var(--muted)] transition-all hover:bg-foreground/5" title="Lấy API Key">
              <ExternalLink size={16} />
            </a>
          </div>

          <div className="flex gap-3 rounded-lg border border-amber-500/10 bg-amber-500/5 p-3">
            <AlertCircle size={16} className="shrink-0 text-amber-500 mt-0.5" />
            <div className="type-caption text-[11px] leading-relaxed">
              <p className="mb-1 font-bold text-amber-600 dark:text-amber-400">Lưu ý bảo mật:</p>
              API Key và Sheet ID chỉ được lưu cục bộ trong trình duyệt của bạn. Tab dữ liệu phải là <code className="font-mono text-foreground">JOURNAL</code> và app đọc range <code className="font-mono text-foreground">A1:X2000</code>.
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
