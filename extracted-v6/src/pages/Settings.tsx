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

  return (
    <div className="mx-auto max-w-2xl space-y-8">
      <Card title="Bảo mật & Đăng nhập" subtitle="Cài đặt bảo vệ cho dashboard của bạn.">
        <div className="space-y-6 pt-4">
          <div className="mb-4 flex items-center justify-between rounded-xl border border-blue-500/10 bg-blue-500/5 p-4">
            <div><h4 className="text-sm font-bold text-foreground">Mật khẩu bảo vệ</h4><p className="text-xs text-gray-500">Yêu cầu đăng nhập khi mở dashboard.</p></div>
            <button onClick={() => setAuthEnabled(!authEnabled)} className={cn('relative h-6 w-12 rounded-full transition-colors', authEnabled ? 'bg-blue-500' : 'bg-gray-700')}>
              <div className={cn('absolute top-1 h-4 w-4 rounded-full bg-white transition-all', authEnabled ? 'left-7' : 'left-1')} />
            </button>
          </div>

          {authEnabled && <div className="space-y-4">
            <div className="space-y-1.5"><label className="flex items-center gap-2 text-xs font-bold uppercase text-gray-500"><User size={12} />Tên người dùng</label><input type="text" value={username} onChange={(event) => setUsername(event.target.value)} placeholder="Ví dụ: admin" className="w-full rounded-xl border border-foreground/10 bg-background px-4 py-3 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500/50" /></div>
            <div className="space-y-1.5"><label className="flex items-center gap-2 text-xs font-bold uppercase text-gray-500"><Lock size={12} />Mật khẩu</label><input type="password" value={password} onChange={(event) => setPassword(event.target.value)} placeholder="Nhập mật khẩu" className="w-full rounded-xl border border-foreground/10 bg-background px-4 py-3 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500/50" /></div>
          </div>}

          <div className="space-y-4 border-t border-foreground/5 pt-4">
            <div className="space-y-1.5"><label className="text-xs font-bold uppercase text-gray-500">Tên tài khoản / ứng dụng</label><input type="text" value={appName} onChange={(event) => setAppName(event.target.value)} placeholder="Ví dụ: Phương Trần" className="w-full rounded-xl border border-foreground/10 bg-background px-4 py-3 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500/50" /></div>
            <button onClick={handleSaveAuth} className="flex w-full items-center justify-center gap-2 rounded-xl bg-foreground px-4 py-3 font-bold text-background transition-all hover:opacity-90">{authSaveSuccess ? <CheckCircle size={18} /> : <Save size={18} />}{authSaveSuccess ? 'Đã lưu bảo mật' : 'Lưu bảo mật'}</button>
          </div>
        </div>
      </Card>

      <Card title="Kết nối Google Sheet" subtitle="Khai báo sheet thật hoặc dùng demo mode.">
        <div className="space-y-6 pt-4">
          <div className="flex items-center justify-between rounded-xl border border-blue-500/10 bg-blue-500/5 p-4">
            <div><h4 className="text-sm font-bold text-foreground">Chế độ Demo</h4><p className="text-xs text-gray-500">Dùng dữ liệu mẫu để trải nghiệm dashboard.</p></div>
            <button onClick={() => updateSettings({ isDemoMode: !settings.isDemoMode })} className={cn('relative h-6 w-12 rounded-full transition-colors', settings.isDemoMode ? 'bg-blue-500' : 'bg-gray-700')}><div className={cn('absolute top-1 h-4 w-4 rounded-full bg-white transition-all', settings.isDemoMode ? 'left-7' : 'left-1')} /></button>
          </div>

          <div className="space-y-4">
            <div className="space-y-1.5"><label className="flex items-center gap-2 text-xs font-bold uppercase text-gray-500"><Database size={12} />Google Sheet ID</label><input type="text" value={localSheetId} onChange={(event) => setLocalSheetId(event.target.value)} placeholder="Ví dụ: 1aBC...xyz" className="w-full rounded-xl border border-foreground/10 bg-background px-4 py-3 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500/50" /></div>
            <div className="space-y-1.5"><label className="flex items-center gap-2 text-xs font-bold uppercase text-gray-500"><Link2 size={12} />API Key</label><input type="password" value={localApiKey} onChange={(event) => setLocalApiKey(event.target.value)} placeholder="Nhập Google API Key của bạn" className="w-full rounded-xl border border-foreground/10 bg-background px-4 py-3 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500/50" /></div>
          </div>

          <div className="flex items-center gap-4 pt-4"><button onClick={handleSaveSheet} disabled={isLoading} className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-blue-600 py-3 font-bold text-white shadow-lg shadow-blue-600/20 transition-all hover:bg-blue-500 disabled:opacity-50">{saveSuccess ? <CheckCircle size={18} /> : <Save size={18} />}{saveSuccess ? 'Đã lưu' : 'Lưu kết nối'}</button><a href="https://console.cloud.google.com/apis/credentials" target="_blank" rel="noreferrer" className="rounded-xl border border-white/10 p-3 text-gray-400 transition-all hover:bg-white/5" title="Lấy API Key"><ExternalLink size={20} /></a></div>

          <div className="flex gap-4 rounded-xl border border-amber-500/10 bg-amber-500/5 p-4"><AlertCircle size={20} className="shrink-0 text-amber-500" /><div className="text-[11px] leading-relaxed text-gray-500"><p className="mb-1 font-bold text-amber-500">Lưu ý bảo mật:</p>API Key và Sheet ID chỉ được lưu cục bộ trong trình duyệt của bạn. Tab dữ liệu phải là <code className="text-foreground">JOURNAL</code> và app đọc range <code className="text-foreground">A1:X2000</code>.</div></div>
        </div>
      </Card>

      <Card title="Hướng dẫn cấu hình"><div className="space-y-4 text-sm leading-relaxed text-gray-500"><p>1. Mở Google Sheet nhật ký giao dịch của bạn.</p><p>2. Copy phần ID từ URL: <code className="text-blue-400">docs.google.com/spreadsheets/d/[SHEET_ID]/edit</code></p><p>3. Tạo API Key trong Google Cloud Console và bật Google Sheets API.</p><p>4. Đảm bảo tab có tên <code className="text-foreground">JOURNAL</code> với đúng schema 24 cột.</p></div></Card>
    </div>
  );
}
