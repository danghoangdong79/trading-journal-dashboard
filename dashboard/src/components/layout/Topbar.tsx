import { Download, RefreshCw } from 'lucide-react';
import { useLocation } from 'react-router-dom';
import { useApp } from '../../context.tsx';
import { formatCurrency } from '../../lib/utils.ts';

const BREADCRUMBS: Record<string, string> = {
  '/overview': 'Tổng quan',
  '/journal': 'Nhật ký giao dịch',
  '/analytics': 'Phân tích hiệu suất',
  '/calendar': 'Lịch PnL',
  '/risk': 'Quản trị rủi ro',
  '/settings': 'Cài đặt kết nối',
};

export default function Topbar({ isMobileMenuOpen, setIsMobileMenuOpen }: { isMobileMenuOpen: boolean; setIsMobileMenuOpen: (val: boolean) => void }) {
  const location = useLocation();
  const { stats, refreshData, isLoading, settings, authState, logout } = useApp();

  return (
    <header className="sticky top-0 z-30 flex h-12 items-center justify-between border-b border-[var(--card-border)] bg-[var(--card-bg)]/80 px-4 backdrop-blur-xl transition-colors duration-200 sm:px-6">
      <div className="flex items-center gap-2 sm:gap-3">
        <button onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)} className="-ml-2 rounded-lg p-2 text-[var(--muted)] transition-all hover:bg-foreground/5 hover:text-foreground md:hidden">
          <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={isMobileMenuOpen ? 'M6 18L18 6M6 6l12 12' : 'M4 6h16M4 12h16M4 18h16'} />
          </svg>
        </button>
        <div className="flex items-center gap-1.5 type-caption">
          <span>Journal</span>
          <span className="text-[var(--card-border)]">·</span>
          <span className="font-semibold text-foreground">{BREADCRUMBS[location.pathname] || 'Dashboard'}</span>
        </div>
      </div>

      <div className="flex items-center gap-2 sm:gap-3">
        {!isLoading && stats && (
          <div className="hidden items-center gap-4 md:flex">
            <div className="flex flex-col items-end">
              <span className="type-caption text-[10px]">Balance</span>
              <span className="text-[13px] font-mono font-bold leading-none text-foreground">{formatCurrency(stats.currentBalance)}</span>
            </div>
            <div className="h-4 w-px bg-[var(--card-border)]" />
            <div className="flex flex-col items-end">
              <span className="type-caption text-[10px]">PnL</span>
              <span className={`text-[13px] font-mono font-bold leading-none ${stats.netPnL >= 0 ? 'text-[var(--win)]' : 'text-[var(--loss)]'}`}>{stats.netPnL >= 0 ? '+' : ''}{formatCurrency(stats.netPnL)}</span>
            </div>
          </div>
        )}

        <div className="flex items-center gap-0.5">
          <button onClick={() => void refreshData()} disabled={isLoading} className="rounded-lg p-2 text-[var(--muted)] transition-all hover:bg-foreground/5 hover:text-foreground disabled:opacity-50" title="Tải lại dữ liệu">
            <RefreshCw size={15} className={isLoading ? 'animate-spin' : ''} />
          </button>
          <button className="rounded-lg p-2 text-[var(--muted)] transition-all hover:bg-foreground/5 hover:text-foreground" title="Xuất dữ liệu">
            <Download size={15} />
          </button>
        </div>

        {settings.isDemoMode && <div className="hidden rounded-md bg-amber-500/15 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-amber-600 dark:text-amber-400 sm:block">Demo</div>}
        {authState.isAuthenticated && authState.username !== 'Guest' && <button onClick={logout} className="ml-1 type-caption font-semibold uppercase tracking-wider transition-colors hover:text-foreground sm:ml-2">Đăng xuất</button>}
      </div>
    </header>
  );
}
