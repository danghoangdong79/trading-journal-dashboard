import { Download, ExternalLink, Menu, RefreshCw, X } from 'lucide-react';
import { useLocation } from 'react-router-dom';
import { useApp } from '../../context.tsx';
import { cn, formatCurrency } from '../../lib/utils.ts';

const BREADCRUMBS: Record<string, string> = {
  '/overview': 'Tổng quan',
  '/journal': 'Nhật ký giao dịch',
  '/analytics': 'Phân tích hiệu suất',
  '/calendar': 'Lịch PnL',
  '/risk': 'Quản trị rủi ro',
  '/guide': 'Hướng dẫn sử dụng',
  '/settings': 'Cài đặt kết nối',
};

const SHEET_SHORTCUTS: Record<string, string> = {
  '/overview': 'JOURNAL!A1:X2000',
  '/journal': 'JOURNAL!A1:X2000',
  '/analytics': 'JOURNAL!A1:X2000',
  '/calendar': 'JOURNAL!A1:X2000',
  '/risk': 'CONFIG!E1:G7',
  '/guide': 'JOURNAL!A1:X2000',
  '/settings': 'CONFIG!A1:K5',
};

export default function Topbar({ isMobileMenuOpen, setIsMobileMenuOpen }: { isMobileMenuOpen: boolean; setIsMobileMenuOpen: (val: boolean) => void }) {
  const location = useLocation();
  const { stats, trades, refreshData, isLoading, settings, authState, logout } = useApp();
  const sheetRange = SHEET_SHORTCUTS[location.pathname] || 'JOURNAL!A1:X2000';
  const sheetUrl = settings.sheetId ? `https://docs.google.com/spreadsheets/d/${settings.sheetId}/edit#range=${encodeURIComponent(sheetRange)}` : '/settings';

  const exportCsv = () => {
    const header = ['Trạng thái', 'Tài khoản', 'Tài sản', 'Mã', 'Vị thế', 'Ngày mở', 'Giờ mở', 'Ngày đóng', 'Giờ đóng', 'Khối lượng', 'Giá vào', 'Giá đóng', 'Lãi/Lỗ ròng', 'Chiến lược', 'Tâm lý', 'Nhóm ngành'];
    const rows = trades.map((trade) => [
      trade.status,
      trade.account,
      trade.assetType,
      trade.symbol,
      trade.position,
      trade.openDate,
      trade.openTime,
      trade.closeDate,
      trade.closeTime,
      trade.volume,
      trade.entryPrice,
      trade.exitPrice,
      trade.netPnL,
      trade.strategy,
      trade.mood,
      trade.sector,
    ]);
    const escape = (value: unknown) => `"${String(value ?? '').replace(/"/g, '""')}"`;
    const csv = [header, ...rows].map((row) => row.map(escape).join(',')).join('\n');
    const blob = new Blob([`﻿${csv}`], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `dahodo-trades-${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
  };

  return (
    <header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b border-[var(--card-border)] bg-[var(--topbar-bg)] px-4 backdrop-blur-xl transition-colors duration-300 sm:px-7">
      <div className="flex items-center gap-2 sm:gap-4">
        <button onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)} className="-ml-2 rounded-lg p-2 text-[var(--muted)] transition-all hover:bg-[var(--surface-hover)] hover:text-foreground md:hidden">
          {isMobileMenuOpen ? <X size={20} /> : <Menu size={20} />}
        </button>
        <div className="flex items-center gap-1.5 text-[11px] font-extrabold uppercase tracking-[0.14em] text-[var(--muted)] sm:gap-2.5">
          <span>Dahodo</span>
          <div className="h-1 w-1 rounded-full bg-[var(--card-border)]" />
          <span className="tracking-[0.08em] text-foreground">{BREADCRUMBS[location.pathname] || 'Bảng điều khiển'}</span>
        </div>
      </div>

      <div className="flex items-center gap-2 sm:gap-4 md:gap-6">
        {!isLoading && stats && (
          <div className="hidden items-center gap-4 rounded-full border border-[var(--card-border)] bg-[var(--card-elevated)]/60 px-4 py-2 md:flex lg:gap-5">
            <div className="flex flex-col items-end">
              <span className="text-[9px] font-extrabold uppercase tracking-[0.08em] text-[var(--muted)]">Số dư</span>
              <span className="font-mono text-[13px] font-semibold leading-none text-foreground">{formatCurrency(stats.currentBalance)}</span>
            </div>
            <div className="h-4 w-px bg-[var(--card-border)]" />
            <div className="flex flex-col items-end">
              <span className="text-[9px] font-extrabold uppercase tracking-[0.08em] text-[var(--muted)]">Lãi/Lỗ</span>
              <span className={`font-mono text-[13px] font-semibold leading-none ${stats.netPnL >= 0 ? 'text-[var(--win)]' : 'text-[var(--loss)]'}`}>{stats.netPnL >= 0 ? '+' : ''}{formatCurrency(stats.netPnL)}</span>
            </div>
          </div>
        )}

        <div className="flex items-center gap-1 sm:gap-2">
          <a
            href={sheetUrl}
            target={settings.sheetId ? '_blank' : '_self'}
            rel={settings.sheetId ? 'noreferrer' : undefined}
            className={cn(
              'inline-flex items-center gap-2 rounded-lg border px-3 py-2 text-[12px] font-bold transition-all',
              settings.sheetId
                ? 'border-[var(--card-border)] text-[var(--muted)] hover:border-[var(--accent)]/30 hover:bg-[var(--accent-soft)] hover:text-[var(--accent)]'
                : 'border-[var(--loss)]/20 bg-[var(--loss)]/5 text-[var(--loss)] hover:bg-[var(--loss)]/10',
            )}
            title={settings.sheetId ? `Mở nhanh ${sheetRange}` : 'Cần cấu hình Sheet ID trong Cài đặt'}
          >
            <ExternalLink size={14} />
            <span className="hidden lg:inline">Mở sheet</span>
          </a>
          <button onClick={() => void refreshData()} disabled={isLoading} className="rounded-lg p-2 text-[var(--muted)] transition-all hover:bg-[var(--surface-hover)] hover:text-foreground disabled:opacity-50" title="Tải lại dữ liệu">
            <RefreshCw size={16} className={isLoading ? 'animate-spin' : ''} />
          </button>
          <button onClick={exportCsv} disabled={trades.length === 0} className="rounded-lg p-2 text-[var(--muted)] transition-all hover:bg-[var(--surface-hover)] hover:text-foreground disabled:opacity-40" title="Xuất dữ liệu">
            <Download size={16} />
          </button>
        </div>

        <div className={cn('hidden rounded-full px-2.5 py-0.5 text-[9px] font-black uppercase tracking-[0.12em] sm:block', settings.isDemoMode ? 'bg-amber-500 text-white shadow-lg shadow-amber-500/20' : 'bg-[var(--accent-soft)] text-[var(--accent)]')}>
          {settings.isDemoMode ? 'Dữ liệu mẫu' : 'Sheet thật'}
        </div>
        {authState.isAuthenticated && authState.username !== 'Guest' && <button onClick={logout} className="ml-1 text-[10px] font-extrabold uppercase tracking-[0.12em] text-[var(--muted)] transition-colors hover:text-foreground sm:ml-2">{'Đăng xuất'}</button>}
      </div>
    </header>
  );
}
