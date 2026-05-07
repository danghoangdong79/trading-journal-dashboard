import React, { useState } from 'react';
import { Navigate } from 'react-router-dom';
import { AlertCircle, Lock, LogIn } from 'lucide-react';
import { useApp } from '../context.tsx';
import { cn } from '../lib/utils.ts';

export default function Login() {
  const { authState, login, settings, updateSettings } = useApp();
  const [password, setPassword] = useState('');
  const [error, setError] = useState(false);
  const [remember, setRemember] = useState(settings.auth?.rememberMe || false);

  if (!settings.auth.enabled || authState.isAuthenticated) {
    return <Navigate to="/overview" replace />;
  }

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();

    if (remember !== settings.auth.rememberMe) {
      updateSettings({ auth: { ...settings.auth, rememberMe: remember } });
    }

    const success = login(password);
    if (!success) {
      setError(true);
      setPassword('');
    }
  };

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background p-4">
      <div className="w-full max-w-sm premium-card p-6 sm:p-8">
        <div className="mb-6 flex flex-col items-center">
          <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-lg bg-[var(--accent-soft)]">
            <Lock className="h-6 w-6 text-[var(--accent)]" />
          </div>
          <h1 className="text-center text-xl font-bold text-foreground">{settings.appName || 'Phương Trần'} Journal</h1>
          <p className="mt-1 type-caption text-center">Vui lòng đăng nhập để tiếp tục</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="mb-1.5 block type-title text-[10px]">Mật khẩu</label>
            <input
              type="password"
              value={password}
              onChange={(event) => { setPassword(event.target.value); setError(false); }}
              placeholder="Nhập mật khẩu..."
              className={cn('w-full rounded-lg border px-3 py-2.5 text-[13px] text-foreground transition-all focus:outline-none focus:ring-1 focus:ring-[var(--accent)]/40 bg-foreground/[0.03]', error ? 'border-[var(--loss)]/50' : 'border-[var(--card-border)]')}
              autoFocus
            />
            {error && <div className="mt-1.5 flex items-center gap-1.5 text-[12px] text-[var(--loss)]"><AlertCircle className="h-3.5 w-3.5" /><span>Mật khẩu không chính xác</span></div>}
          </div>

          <label className="flex items-center gap-2 type-caption cursor-pointer">
            <input type="checkbox" checked={remember} onChange={(event) => setRemember(event.target.checked)} className="rounded border-[var(--card-border)] bg-background text-[var(--accent)] focus:ring-[var(--accent)]" />
            <span>Ghi nhớ đăng nhập</span>
          </label>

          <button type="submit" className="flex w-full items-center justify-center gap-2 rounded-lg bg-[var(--accent)] py-2.5 text-[13px] font-semibold text-white transition-colors hover:opacity-90">
            <LogIn className="h-4 w-4" />
            Đăng nhập
          </button>
        </form>
      </div>

      <div className="mt-6 type-caption font-semibold uppercase tracking-wider">Powered by dahodo.com</div>
    </div>
  );
}
