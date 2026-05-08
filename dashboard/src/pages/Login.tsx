import React, { useState } from 'react';
import { Navigate } from 'react-router-dom';
import { AlertCircle, LogIn, RefreshCw, RotateCcw } from 'lucide-react';
import { useApp } from '../context.tsx';
import { cn } from '../lib/utils.ts';

const DEFAULT_SHEET_ID = '1PdCmBoBQsznOx6JXvOlbD-atxQnX9wHRXiM127f109I';
const DEFAULT_CUSTOMER_NAME = 'Phương Trần';

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

export default function Login() {
  const { authState, login, settings, updateSettings, isAuthLoading, authError, refreshAuthUsers, sheetUsers } = useApp();
  const [username, setUsername] = useState(settings.auth?.username || 'admin');
  const [password, setPassword] = useState('');
  const [error, setError] = useState(false);
  const [remember, setRemember] = useState(settings.auth?.rememberMe || false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isRefreshingUsers, setIsRefreshingUsers] = useState(false);
  const siteName = settings.siteName || 'Dahodo.Journal';
  const customerName = settings.appName || DEFAULT_CUSTOMER_NAME;
  const hasEnabledUsers = sheetUsers.some((user) => isEnabledStatus(user.status));
  const hasAuthIssue = Boolean(authError) || (!isAuthLoading && !hasEnabledUsers);

  if (!settings.auth.enabled || authState.isAuthenticated) {
    return <Navigate to="/overview" replace />;
  }

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (isAuthLoading || !hasEnabledUsers) return;

    setIsSubmitting(true);
    const success = await login(username, password, remember).catch(() => false);
    setIsSubmitting(false);
    if (!success) {
      setError(true);
      setPassword('');
    }
  };

  const handleRefreshUsers = async () => {
    setIsRefreshingUsers(true);
    await refreshAuthUsers(true).catch(() => undefined);
    setIsRefreshingUsers(false);
  };

  const handleResetConnection = () => {
    updateSettings({
      sheetId: DEFAULT_SHEET_ID,
      apiKey: '',
      isDemoMode: false,
      auth: { ...settings.auth, username: 'admin' },
    });
    setError(false);
    setPassword('');
  };

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-[var(--app-bg)] p-4">
      <div className="w-full max-w-sm premium-card p-7 sm:p-8">
        <div className="mb-7 flex flex-col items-center">
          <div className="mb-4 flex h-14 w-14 items-center justify-center overflow-hidden rounded-2xl bg-white shadow-[0_18px_42px_-24px_rgba(255,255,255,0.85)] ring-1 ring-black/5 dark:ring-white/10">
            <img src="/logo.svg" alt="Dahodo" className="h-9 w-9 object-contain" />
          </div>
          <h1 className="text-center text-xl font-black tracking-tight text-foreground">{siteName}</h1>
          <p className="mt-1 text-center text-[10px] font-black uppercase tracking-[0.14em] text-[var(--accent)]">{customerName}</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="mb-1.5 block type-title text-[10px]">{'Tài khoản'}</label>
            <input
              type="text"
              value={username}
              onChange={(event) => { setUsername(event.target.value); setError(false); }}
              placeholder="admin"
              className={cn('w-full rounded-2xl border bg-[var(--input-bg)] px-3.5 py-3 text-[13px] text-foreground transition-all focus:outline-none focus:ring-2 focus:ring-[var(--accent)]/30', error ? 'border-[var(--loss)]/50' : 'border-[var(--card-border)]')}
              autoComplete="username"
              autoFocus
            />
          </div>

          <div>
            <label className="mb-1.5 block type-title text-[10px]">{'Mật khẩu'}</label>
            <input
              type="password"
              value={password}
              onChange={(event) => { setPassword(event.target.value); setError(false); }}
              placeholder={'Nhập mật khẩu...'}
              className={cn('w-full rounded-2xl border bg-[var(--input-bg)] px-3.5 py-3 text-[13px] text-foreground transition-all focus:outline-none focus:ring-2 focus:ring-[var(--accent)]/30', error ? 'border-[var(--loss)]/50' : 'border-[var(--card-border)]')}
              autoComplete="current-password"
            />
            {error && <div className="mt-2 flex items-center gap-1.5 text-[12px] text-[var(--loss)]"><AlertCircle className="h-3.5 w-3.5" /><span>{'Tài khoản hoặc mật khẩu không chính xác'}</span></div>}
            {!error && authError && <div className="mt-2 flex items-center gap-1.5 text-[12px] text-[var(--loss)]"><AlertCircle className="h-3.5 w-3.5" /><span>{authError}</span></div>}
            {!error && !authError && isAuthLoading && <div className="mt-2 text-[12px] text-[var(--muted)]">{'Đang đọc tab USERS...'}</div>}
            {!error && !authError && !isAuthLoading && !hasEnabledUsers && <div className="mt-2 text-[12px] text-[var(--muted)]">{'USERS chưa có user hợp lệ hoặc chưa có dòng trạng thái Bật.'}</div>}
          </div>

          <label className="flex cursor-pointer items-center gap-2 type-caption">
            <input type="checkbox" checked={remember} onChange={(event) => setRemember(event.target.checked)} className="rounded border-[var(--card-border)] bg-background text-[var(--accent)] focus:ring-[var(--accent)]" />
            <span>{'Ghi nhớ đăng nhập'}</span>
          </label>

          {hasAuthIssue && (
            <div className="rounded-2xl border border-[var(--card-border)] bg-[var(--surface-soft)] p-4 text-[12px] text-[var(--muted)]">
              <div className="font-semibold text-foreground">{'Chẩn đoán kết nối USERS'}</div>
              <div className="mt-2 text-[11px]">{'Sheet ID app đang dùng:'}</div>
              <div className="mt-1 break-all font-mono text-[11px] text-foreground">{settings.sheetId || '(chưa có Sheet ID)'}</div>
              <div className="mt-2">{`USERS đọc được: ${sheetUsers.length} user`}</div>
              <div className="mt-3 flex flex-col gap-2 sm:flex-row">
                <button type="button" onClick={() => void handleRefreshUsers()} disabled={isRefreshingUsers} className="flex flex-1 items-center justify-center gap-2 rounded-xl border border-[var(--card-border)] px-3 py-2 font-bold text-[var(--muted)] transition-all hover:bg-[var(--surface-hover)] hover:text-foreground disabled:cursor-not-allowed disabled:opacity-60">
                  <RefreshCw className={cn('h-4 w-4', isRefreshingUsers && 'animate-spin')} />
                  {isRefreshingUsers ? 'Đang đọc lại...' : 'Đọc lại USERS'}
                </button>
                <button type="button" onClick={handleResetConnection} className="flex flex-1 items-center justify-center gap-2 rounded-xl border border-[var(--card-border)] px-3 py-2 font-bold text-[var(--muted)] transition-all hover:bg-[var(--surface-hover)] hover:text-foreground">
                  <RotateCcw className="h-4 w-4" />
                  {'Dùng sheet mặc định'}
                </button>
              </div>
            </div>
          )}

          <button type="submit" disabled={isAuthLoading || isSubmitting || !hasEnabledUsers} className="flex w-full items-center justify-center gap-2 rounded-2xl bg-[var(--accent)] py-3 text-[13px] font-extrabold text-white shadow-lg shadow-blue-500/20 transition-all hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60">
            <LogIn className="h-4 w-4" />
            {isSubmitting ? 'Đang kiểm tra...' : 'Đăng nhập'}
          </button>
        </form>
      </div>

      <div className="mt-6 text-[10px] font-black uppercase tracking-[0.2em] text-[var(--muted)]">dahodo.com</div>
    </div>
  );
}
