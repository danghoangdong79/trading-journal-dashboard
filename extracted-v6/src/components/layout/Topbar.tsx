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
    <header className="sticky top-0 z-30 flex h-14 items-center justify-between border-b border-white/5 bg-background/80 px-4 backdrop-blur-xl transition-colors duration-300 sm:px-8">
      <div className="flex items-center gap-2 sm:gap-4">
        <button onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)} className="-ml-2 rounded-lg p-2 text-gray-500 transition-all hover:bg-foreground/5 hover:text-foreground md:hidden">
          <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={isMobileMenuOpen ? 'M6 18L18 6M6 6l12 12' : 'M4 6h16M4 12h16M4 18h16'} />
          </svg>
        </button>
        <div className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-widest text-gray-500 sm:gap-2.5">
          <span>Journal</span>
          <div className="h-1 w-1 rounded-full bg-gray-700" />
          <span className="text-foreground">{BREADCRUMBS[location.pathname] || 'Dashboard'}</span>
        </div>
      </div>

      <div className="flex items-center gap-2 sm:gap-4 md:gap-6">
        {!isLoading && stats && (
          <div className="hidden items-center gap-4 md:flex lg:gap-6">
            <div className="flex flex-col items-end">
              <span className="text-[9px] font-black uppercase tracking-tighter text-gray-500">Current Balance</span>
              <span className="text-[13px] font-mono font-bold leading-none text-foreground">{formatCurrency(stats.currentBalance)}</span>
            </div>
            <div className="h-4 w-px bg-white/10" />
            <div className="flex flex-col items-end">
              <span className="text-[9px] font-black uppercase tracking-tighter text-gray-500">Account PnL</span>
              <span className={`text-[13px] font-mono font-bold leading-none ${stats.netPnL >= 0 ? 'text-emerald-500' : 'text-rose-500'}`}>{stats.netPnL >= 0 ? '+' : ''}{formatCurrency(stats.netPnL)}</span>
            </div>
          </div>
        )}

        <div className="flex items-center gap-1 sm:gap-2">
          <button onClick={() => void refreshData()} disabled={isLoading} className="rounded-lg p-2 text-gray-500 transition-all hover:bg-foreground/5 hover:text-foreground disabled:opacity-50" title="Tải lại dữ liệu">
            <RefreshCw size={16} className={isLoading ? 'animate-spin' : ''} />
          </button>
          <button className="rounded-lg p-2 text-gray-500 transition-all hover:bg-foreground/5 hover:text-foreground" title="Xuất dữ liệu">
            <Download size={16} />
          </button>
        </div>

        {settings.isDemoMode && <div className="hidden rounded-full bg-amber-500 px-2 py-0.5 text-[9px] font-black uppercase tracking-widest text-white shadow-lg shadow-amber-500/20 sm:block">Demo</div>}
        {authState.isAuthenticated && authState.username !== 'Guest' && <button onClick={logout} className="ml-1 text-[11px] font-bold uppercase tracking-widest text-gray-500 transition-colors hover:text-foreground sm:ml-2">Đăng xuất</button>}
      </div>
    </header>
  );
}
