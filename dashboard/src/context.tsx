import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import type { Trade, TradingStats, DashboardSettings, AuthState, AuthSettings, ThemeMode } from './types.ts';
import { AnalyticsService } from './services/analyticsService.ts';
import { GoogleSheetsService } from './services/googleSheetsService.ts';
import { DEMO_TRADES } from './constants.ts';

interface AppContextType {
  trades: Trade[];
  stats: TradingStats | null;
  settings: DashboardSettings;
  isLoading: boolean;
  error: string | null;
  updateSettings: (newSettings: Partial<DashboardSettings>) => void;
  refreshData: () => Promise<void>;
  authState: AuthState;
  login: (password: string) => boolean;
  logout: () => void;
  theme: ThemeMode;
  setTheme: (mode: ThemeMode) => void;
}

const DEFAULT_SHEET_ID = '1PdCmBoBQsznOx6JXvOlbD-atxQnX9wHRXiM127f109I';
const DEFAULT_APP_NAME = 'Phương Trần';

const defaultAuthSettings: AuthSettings = {
  enabled: true,
  username: 'Phương Trần',
  passwordHash: 'admin123',
  rememberMe: false,
};

const defaultSettings: DashboardSettings = {
  sheetId: DEFAULT_SHEET_ID,
  apiKey: '',
  isDemoMode: false,
  auth: defaultAuthSettings,
  appName: DEFAULT_APP_NAME,
};

const AppContext = createContext<AppContextType | undefined>(undefined);

export function AppProvider({ children }: { children: ReactNode }) {
  const [settings, setSettings] = useState<DashboardSettings>(() => {
    const saved = localStorage.getItem('kh1_settings');
    if (!saved) return defaultSettings;

    try {
      const parsed = JSON.parse(saved) as Partial<DashboardSettings>;
      const merged = {
        ...defaultSettings,
        ...parsed,
        auth: { ...defaultAuthSettings, ...(parsed.auth || {}) },
      };

      if (!merged.sheetId) merged.sheetId = DEFAULT_SHEET_ID;
      if (merged.appName === 'Phương Trần' || !merged.appName) merged.appName = DEFAULT_APP_NAME;
      if (merged.auth.username === 'admin' || merged.auth.username === 'KhangHang1' || !merged.auth.username) merged.auth.username = DEFAULT_APP_NAME;
      if (!merged.apiKey && merged.sheetId === DEFAULT_SHEET_ID) merged.isDemoMode = false;

      return merged;
    } catch {
      return defaultSettings;
    }
  });

  const [trades, setTrades] = useState<Trade[]>([]);
  const [stats, setStats] = useState<TradingStats | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [theme, setThemeState] = useState<ThemeMode>(() => (localStorage.getItem('kh1_theme') as ThemeMode) || 'system');
  const [authState, setAuthState] = useState<AuthState>(() => {
    if (!defaultSettings.auth.enabled) return { isAuthenticated: true, username: 'Guest' };
    const localAuth = localStorage.getItem('kh1_auth');
    const sessionAuth = sessionStorage.getItem('kh1_auth');
    if (localAuth === 'true' || sessionAuth === 'true') {
      return { isAuthenticated: true, username: defaultAuthSettings.username };
    }
    return { isAuthenticated: false, username: null };
  });

  const setTheme = (mode: ThemeMode) => {
    setThemeState(mode);
    localStorage.setItem('kh1_theme', mode);
  };

  useEffect(() => {
    const applyTheme = () => {
      const darkPreferred = window.matchMedia('(prefers-color-scheme: dark)').matches;
      const isDark = theme === 'dark' || (theme === 'system' && darkPreferred);
      document.documentElement.classList.toggle('dark', isDark);
      document.documentElement.style.colorScheme = isDark ? 'dark' : 'light';
    };

    applyTheme();

    if (theme === 'system') {
      const media = window.matchMedia('(prefers-color-scheme: dark)');
      const handler = () => applyTheme();
      media.addEventListener('change', handler);
      return () => media.removeEventListener('change', handler);
    }
  }, [theme]);

  const login = (password: string) => {
    if (password !== settings.auth.passwordHash) return false;
    setAuthState({ isAuthenticated: true, username: settings.auth.username });
    if (settings.auth.rememberMe) {
      localStorage.setItem('kh1_auth', 'true');
      sessionStorage.removeItem('kh1_auth');
    } else {
      sessionStorage.setItem('kh1_auth', 'true');
      localStorage.removeItem('kh1_auth');
    }
    return true;
  };

  const logout = () => {
    setAuthState({ isAuthenticated: false, username: null });
    localStorage.removeItem('kh1_auth');
    sessionStorage.removeItem('kh1_auth');
  };

  const updateSettings = (newSettings: Partial<DashboardSettings>) => {
    const updated: DashboardSettings = {
      ...settings,
      ...newSettings,
      auth: {
        ...settings.auth,
        ...(newSettings.auth || {}),
      },
    };

    setSettings(updated);
    localStorage.setItem('kh1_settings', JSON.stringify(updated));

    if (!updated.auth.enabled) {
      setAuthState({ isAuthenticated: true, username: 'Guest' });
      localStorage.removeItem('kh1_auth');
      sessionStorage.removeItem('kh1_auth');
    } else if (!localStorage.getItem('kh1_auth') && !sessionStorage.getItem('kh1_auth')) {
      setAuthState({ isAuthenticated: false, username: null });
    }
  };

  const refreshData = async () => {
    setIsLoading(true);
    setError(null);

    try {
      const nextTrades = settings.isDemoMode
        ? DEMO_TRADES
        : await GoogleSheetsService.fetchTrades(settings.sheetId, settings.apiKey);

      setTrades(nextTrades);
      setStats(AnalyticsService.calculateStats(nextTrades));
    } catch (caughtError) {
      const message = caughtError instanceof Error ? caughtError.message : 'Không thể tải dữ liệu giao dịch.';
      setError(message);
      setTrades([]);
      setStats(AnalyticsService.calculateStats([]));
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (settings.auth.enabled) {
      const localAuth = localStorage.getItem('kh1_auth');
      const sessionAuth = sessionStorage.getItem('kh1_auth');
      if (localAuth === 'true' || sessionAuth === 'true') {
        setAuthState({ isAuthenticated: true, username: settings.auth.username });
      }
    }
  }, [settings.auth.enabled, settings.auth.username]);

  useEffect(() => {
    if (settings.isDemoMode || authState.isAuthenticated) {
      void refreshData();
    }
  }, [settings.sheetId, settings.apiKey, settings.isDemoMode, authState.isAuthenticated]);

  return (
    <AppContext.Provider
      value={{
        trades,
        stats,
        settings,
        isLoading,
        error,
        updateSettings,
        refreshData,
        authState,
        login,
        logout,
        theme,
        setTheme,
      }}
    >
      {children}
    </AppContext.Provider>
  );
}

export function useApp() {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useApp must be used within an AppProvider');
  }
  return context;
}
