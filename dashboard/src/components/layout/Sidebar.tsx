import { useEffect, useState } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { motion } from 'motion/react';
import { BarChart3, BookOpenText, CalendarDays, ChevronLeft, ChevronRight, Gauge, Monitor, Moon, NotebookText, Settings, ShieldAlert, Sun } from 'lucide-react';
import { cn } from '../../lib/utils.ts';
import { useApp } from '../../context.tsx';

const DEFAULT_CUSTOMER_NAME = 'Phương Trần';

const navItems = [
  { path: '/overview', label: 'Tổng quan', icon: Gauge },
  { path: '/journal', label: 'Nhật ký', icon: NotebookText },
  { path: '/analytics', label: 'Phân tích', icon: BarChart3 },
  { path: '/calendar', label: 'Lịch PnL', icon: CalendarDays },
  { path: '/risk', label: 'Rủi ro', icon: ShieldAlert },
  { path: '/guide', label: 'Hướng dẫn', icon: BookOpenText },
  { path: '/settings', label: 'Cài đặt', icon: Settings },
];

export default function Sidebar({ isMobileMenuOpen, setIsMobileMenuOpen }: { isMobileMenuOpen: boolean; setIsMobileMenuOpen: (val: boolean) => void }) {
  const [isCollapsed, setIsCollapsed] = useState(() => localStorage.getItem('kh1_sidebar') === 'collapsed');
  const { settings, theme, setTheme } = useApp();
  const location = useLocation();

  useEffect(() => {
    setIsMobileMenuOpen(false);
  }, [location.pathname, setIsMobileMenuOpen]);

  const cycleTheme = () => {
    if (theme === 'system') setTheme('dark');
    else if (theme === 'dark') setTheme('light');
    else setTheme('system');
  };

  const toggleSidebar = () => {
    const next = !isCollapsed;
    setIsCollapsed(next);
    localStorage.setItem('kh1_sidebar', next ? 'collapsed' : 'expanded');
  };

  const ThemeIcon = theme === 'system' ? Monitor : theme === 'dark' ? Moon : Sun;
  const themeLabel = theme === 'system' ? 'Theo hệ thống' : theme === 'dark' ? 'Tối' : 'Sáng';
  const siteName = settings.siteName || 'Dahodo.Journal';
  const customerName = settings.appName || DEFAULT_CUSTOMER_NAME;

  return (
    <>
      <div
        className={cn(
          'fixed inset-0 z-40 bg-black/50 backdrop-blur-sm transition-opacity md:hidden',
          isMobileMenuOpen ? 'pointer-events-auto opacity-100' : 'pointer-events-none opacity-0',
        )}
        onClick={() => setIsMobileMenuOpen(false)}
      />

      <motion.aside
        initial={false}
        animate={{ width: isCollapsed ? 86 : 260 }}
        transition={{ duration: 0.22, ease: 'easeOut' }}
        className={cn(
          'fixed left-0 top-0 z-50 flex h-screen shrink-0 -translate-x-full flex-col overflow-hidden',
          'border-r border-[var(--sidebar-border)] bg-[var(--sidebar-bg)] text-[var(--sidebar-fg)] transition-colors duration-300',
          'md:sticky md:translate-x-0',
          isMobileMenuOpen && 'translate-x-0',
        )}
      >
        <div className={cn('flex w-full items-center px-5 py-6', isCollapsed ? 'justify-center' : 'justify-between')}>
          <div className={cn('flex min-w-0 items-center', isCollapsed ? 'justify-center' : 'gap-3')}>
            <div className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-white shadow-[0_10px_30px_-18px_rgba(255,255,255,0.65)] ring-1 ring-black/5 dark:ring-white/10">
              <img src="/logo.svg" alt="Dahodo" className="h-7 w-7 object-contain" />
            </div>
            {!isCollapsed && (
              <div className="min-w-0">
                <div className="truncate text-[15px] font-extrabold leading-tight tracking-[-0.03em] text-[var(--sidebar-fg)]">{siteName}</div>
                <div className="mt-1 truncate text-[9.5px] font-extrabold uppercase tracking-[0.1em] text-[var(--accent)]">{customerName}</div>
              </div>
            )}
          </div>
        </div>

        <nav className="mt-1 w-full flex-1 space-y-1 px-3">
          {navItems.map((item) => (
            <NavLink
              key={item.path}
              to={item.path}
              title={isCollapsed ? item.label : undefined}
              className={({ isActive }) =>
                cn(
                  'group relative flex items-center rounded-xl py-2.5 transition-all duration-200',
                  isCollapsed ? 'justify-center px-0' : 'gap-3 px-3',
                  isActive
                    ? 'bg-[var(--sidebar-active)] font-semibold text-[var(--sidebar-active-fg)] shadow-[inset_3px_0_0_var(--accent)]'
                    : 'text-[var(--sidebar-muted)] hover:bg-[var(--surface-hover)] hover:text-[var(--sidebar-fg)]',
                )
              }
            >
              {({ isActive }) => (
                <>
                  <item.icon size={19} strokeWidth={isActive ? 2.35 : 1.7} />
                  {!isCollapsed && <span className="text-[13.5px] font-bold tracking-[-0.01em]">{item.label}</span>}
                  {isCollapsed && (
                    <div className="pointer-events-none absolute left-[calc(100%+10px)] top-1/2 z-[70] -translate-y-1/2 whitespace-nowrap rounded-lg border border-[var(--card-border)] bg-[var(--card-elevated)] px-2.5 py-1.5 text-[11px] font-semibold text-foreground opacity-0 shadow-xl transition-all duration-150 group-hover:translate-x-0 group-hover:opacity-100">
                      {item.label}
                    </div>
                  )}
                </>
              )}
            </NavLink>
          ))}
        </nav>

        <div className="w-full space-y-2 p-4">
          <button
            onClick={cycleTheme}
            className={cn(
              'flex w-full items-center rounded-xl p-2.5 text-[var(--sidebar-muted)] transition-all hover:bg-[var(--surface-hover)] hover:text-[var(--sidebar-fg)]',
              isCollapsed ? 'justify-center' : 'justify-center gap-3',
            )}
            title={themeLabel}
          >
            <ThemeIcon size={18} />
            {!isCollapsed && <span className="text-[13px] font-semibold">{themeLabel}</span>}
          </button>
          <button
            onClick={toggleSidebar}
            className="hidden w-full items-center justify-center rounded-xl p-2 text-[var(--sidebar-muted)] transition-all hover:bg-[var(--surface-hover)] hover:text-[var(--sidebar-fg)] md:flex"
            title={isCollapsed ? 'Mở rộng sidebar' : 'Thu nhỏ sidebar'}
          >
            {isCollapsed ? <ChevronRight size={18} /> : <ChevronLeft size={18} />}
          </button>
        </div>
      </motion.aside>
    </>
  );
}
