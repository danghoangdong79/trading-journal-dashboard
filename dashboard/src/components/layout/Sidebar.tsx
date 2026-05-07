import { useEffect, useState } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { motion } from 'motion/react';
import { BarChart3, CalendarDays, Gauge, Monitor, Moon, NotebookText, PanelLeftClose, PanelLeftOpen, Settings, ShieldAlert, Sun } from 'lucide-react';
import { cn } from '../../lib/utils.ts';
import { useApp } from '../../context.tsx';

const navItems = [
  { path: '/overview', label: 'Tổng quan', icon: Gauge },
  { path: '/journal', label: 'Nhật ký', icon: NotebookText },
  { path: '/analytics', label: 'Phân tích', icon: BarChart3 },
  { path: '/calendar', label: 'Lịch PnL', icon: CalendarDays },
  { path: '/risk', label: 'Rủi ro', icon: ShieldAlert },
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
  const themeLabel = theme === 'system' ? 'Hệ thống' : theme === 'dark' ? 'Tối' : 'Sáng';
  const initials = (settings.appName || 'PT').split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase();

  return (
    <>
      {/* Mobile overlay */}
      <div
        className={cn(
          'fixed inset-0 z-40 bg-black/40 backdrop-blur-sm transition-opacity md:hidden',
          isMobileMenuOpen ? 'pointer-events-auto opacity-100' : 'pointer-events-none opacity-0'
        )}
        onClick={() => setIsMobileMenuOpen(false)}
      />

      <motion.aside
        initial={false}
        animate={{ width: isCollapsed ? 60 : 220 }}
        transition={{ duration: 0.15, ease: 'easeOut' }}
        className={cn(
          'fixed left-0 top-0 z-50 flex h-screen shrink-0 -translate-x-full flex-col overflow-hidden',
          'border-r border-[var(--card-border)] bg-[var(--sidebar-bg)] transition-colors duration-200',
          'md:sticky md:translate-x-0',
          isMobileMenuOpen && 'translate-x-0'
        )}
      >
        {/* Logo + Collapse toggle */}
        <div className={cn('flex w-full items-center border-b border-[var(--card-border)]', isCollapsed ? 'justify-center px-2 py-3' : 'justify-between px-3 py-3')}>
          <div className={cn('flex items-center', isCollapsed ? 'justify-center' : 'gap-2')}>
            <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-[var(--accent)] text-[10px] font-bold text-white">
              {initials}
            </div>
            {!isCollapsed && (
              <span className="text-[13px] font-semibold tracking-tight text-foreground truncate">
                {settings.appName || 'Phương Trần'}
              </span>
            )}
          </div>
          {!isCollapsed && (
            <button
              onClick={toggleSidebar}
              className="hidden rounded-md p-1 text-[var(--muted)] transition-colors hover:bg-foreground/5 hover:text-foreground md:flex"
              title="Thu nhỏ sidebar"
            >
              <PanelLeftClose size={15} />
            </button>
          )}
        </div>

        {/* Navigation */}
        <nav className="mt-1 w-full flex-1 space-y-px px-2">
          {navItems.map((item) => (
            <NavLink
              key={item.path}
              to={item.path}
              title={isCollapsed ? item.label : undefined}
              className={({ isActive }) =>
                cn(
                  'group relative flex items-center rounded-md py-[7px] transition-all duration-150',
                  isCollapsed ? 'justify-center px-0' : 'gap-2 px-2.5',
                  isActive
                    ? 'bg-[var(--accent-soft)] font-semibold text-[var(--accent)]'
                    : 'text-[var(--muted)] hover:bg-foreground/[0.03] hover:text-foreground'
                )
              }
            >
              {({ isActive }) => (
                <>
                  <item.icon size={17} strokeWidth={isActive ? 2 : 1.5} />
                  {!isCollapsed && (
                    <span className="text-[12.5px] tracking-tight">{item.label}</span>
                  )}
                  {isCollapsed && (
                    <div className="pointer-events-none absolute left-[52px] z-50 rounded-md bg-foreground px-2 py-1 text-[10px] font-semibold whitespace-nowrap text-background opacity-0 shadow-lg transition-opacity group-hover:opacity-100">
                      {item.label}
                    </div>
                  )}
                </>
              )}
            </NavLink>
          ))}
        </nav>

        {/* Bottom: Theme toggle + Expand */}
        <div className={cn('w-full border-t border-[var(--card-border)] p-1.5', isCollapsed ? 'space-y-px' : 'space-y-px')}>
          {/* Theme toggle */}
          <button
            onClick={cycleTheme}
            className={cn(
              'flex w-full items-center rounded-md p-2 text-[var(--muted)] transition-all hover:bg-foreground/[0.04] hover:text-foreground',
              isCollapsed ? 'justify-center' : 'gap-2 px-2.5'
            )}
            title={`Giao diện: ${themeLabel}`}
          >
            <ThemeIcon size={15} />
            {!isCollapsed && (
              <span className="text-[12px] font-medium">{themeLabel}</span>
            )}
          </button>

          {/* Expand button (when collapsed) */}
          {isCollapsed && (
            <button
              onClick={toggleSidebar}
              className="flex w-full items-center justify-center rounded-md p-2 text-[var(--muted)] transition-all hover:bg-foreground/[0.04] hover:text-foreground"
              title="Mở rộng sidebar"
            >
              <PanelLeftOpen size={15} />
            </button>
          )}
        </div>
      </motion.aside>
    </>
  );
}
