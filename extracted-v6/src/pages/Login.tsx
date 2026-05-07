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
      <div className="w-full max-w-md rounded-2xl border border-foreground/5 bg-background p-6 shadow-2xl sm:p-8">
        <div className="mb-8 flex flex-col items-center">
          <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl border border-blue-500/20 bg-blue-500/10">
            <Lock className="h-8 w-8 text-blue-500" />
          </div>
          <h1 className="text-center text-2xl font-bold text-foreground">{settings.appName || 'Phương Trần'} Journal</h1>
          <p className="mt-2 text-center text-sm text-gray-500">Vui lòng đăng nhập để tiếp tục</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label className="mb-2 block text-sm font-medium text-gray-500">Mật khẩu</label>
            <input
              type="password"
              value={password}
              onChange={(event) => { setPassword(event.target.value); setError(false); }}
              placeholder="Nhập mật khẩu..."
              className={cn('w-full rounded-xl border px-4 py-3 text-foreground transition-all focus:outline-none focus:ring-2 focus:ring-blue-500/50 bg-foreground/5', error ? 'border-rose-500/50' : 'border-foreground/10')}
              autoFocus
            />
            {error && <div className="mt-2 flex items-center gap-2 text-sm text-rose-500"><AlertCircle className="h-4 w-4" /><span>Mật khẩu không chính xác</span></div>}
          </div>

          <label className="flex items-center gap-2 text-sm text-gray-500 cursor-pointer">
            <input type="checkbox" checked={remember} onChange={(event) => setRemember(event.target.checked)} className="rounded border-foreground/10 bg-background text-blue-500 focus:ring-blue-500" />
            <span>Ghi nhớ đăng nhập</span>
          </label>

          <button type="submit" className="flex w-full items-center justify-center gap-2 rounded-xl bg-blue-600 py-3 font-medium text-white transition-colors hover:bg-blue-700">
            <LogIn className="h-5 w-5" />
            Đăng nhập
          </button>
        </form>
      </div>

      <div className="mt-8 text-[11px] font-medium uppercase tracking-widest text-gray-600">Powered by dahodo.com</div>
    </div>
  );
}
