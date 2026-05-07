
import { useEffect, useState } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { motion } from 'motion/react';
import { BarChart3, CalendarDays, ChevronLeft, ChevronRight, Gauge, Monitor, Moon, NotebookText, Settings, ShieldAlert, Sun } from 'lucide-react';
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
  const themeLabel = theme === 'system' ? 'System' : theme === 'dark' ? 'Dark' : 'Light';

  return (
    <>
      <div className={cn('fixed inset-0 z-40 bg-black/50 transition-opacity md:hidden', isMobileMenuOpen ? 'pointer-events-auto opacity-100' : 'pointer-events-none opacity-0')} onClick={() => setIsMobileMenuOpen(false)} />
      <motion.aside
        initial={false}
        animate={{ width: isCollapsed ? 92 : 320 }}
        className={cn('fixed left-0 top-0 z-50 flex h-screen shrink-0 -translate-x-full flex-col overflow-hidden border-r border-white/5 bg-[var(--sidebar-bg)] transition-all duration-300 md:sticky md:translate-x-0', isMobileMenuOpen && 'translate-x-0')}
      >
        <div className={cn('flex w-full items-center p-6', isCollapsed ? 'justify-center' : 'justify-between')}>
          <div className={cn('flex items-center', isCollapsed ? 'justify-center' : 'gap-2.5')}>
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-foreground text-sm font-bold text-background">PT</div>
            {!isCollapsed && <span className="text-base font-bold tracking-tight">{settings.appName || 'Phương Trần'}</span>}
          </div>
        </div>

        <nav className="mt-2 w-full flex-1 space-y-1 px-3">
          {navItems.map((item) => (
            <NavLink key={item.path} to={item.path} title={isCollapsed ? item.label : undefined} className={({ isActive }) => cn('group relative flex items-center rounded-xl py-2.5 transition-all duration-300', isCollapsed ? 'justify-center px-0' : 'gap-3 px-3', isActive ? 'bg-foreground/5 font-semibold text-foreground' : 'text-gray-500 hover:bg-foreground/[0.03] hover:text-foreground')}>
              {({ isActive }) => (
                <>
                  <item.icon size={19} strokeWidth={isActive ? 2.4 : 1.7} />
                  {!isCollapsed && <span className="text-[13px] tracking-tight">{item.label}</span>}
                  {isCollapsed && <div className="pointer-events-none absolute left-16 z-50 rounded-lg bg-foreground px-2 py-1 text-[10px] font-bold uppercase whitespace-nowrap text-background opacity-0 shadow-xl transition-opacity group-hover:opacity-100">{item.label}</div>}
                </>
              )}
            </NavLink>
          ))}
        </nav>

        <div className="w-full space-y-2 p-4">
          <button onClick={cycleTheme} className={cn('flex w-full items-center rounded-xl p-2.5 text-gray-500 transition-all hover:bg-foreground/5 hover:text-foreground', isCollapsed ? 'justify-center' : 'justify-center gap-3')} title={themeLabel}>
            <ThemeIcon size={18} />
            {!isCollapsed && <span className="text-[13px] font-medium">{themeLabel}</span>}
          </button>
          <button onClick={toggleSidebar} className="hidden w-full items-center justify-center rounded-xl p-2 text-gray-500 transition-all hover:bg-foreground/5 hover:text-foreground md:flex" title={isCollapsed ? 'Mở rộng sidebar' : 'Thu nhỏ sidebar'}>
            {isCollapsed ? <ChevronRight size={18} /> : <ChevronLeft size={18} />}
          </button>
        </div>
      </motion.aside>
    </>
  );
}
