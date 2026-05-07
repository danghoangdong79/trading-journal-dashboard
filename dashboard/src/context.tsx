import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import type { Trade, TradingStats, DashboardSettings, AuthState, AuthSettings, RiskSettings, ThemeMode } from './types.ts';
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
const BRAND_NAME = 'Dahodo.Journal';
const DEFAULT_CUSTOMER_NAME = 'Phương Trần';

const defaultAuthSettings: AuthSettings = {
  enabled: true,
  username: DEFAULT_CUSTOMER_NAME,
  passwordHash: 'admin123',
  rememberMe: false,
};

const defaultRiskSettings: RiskSettings = {
  stockCapital: 500_000_000,
  derivativesCapital: 100_000_000,
  maxRiskPerTradePct: 0.02,
  monthlyTargetPct: 0.05,
  minRewardRisk: 2,
  maxDrawdownPct: 0.15,
};

const defaultSettings: DashboardSettings = {
  sheetId: DEFAULT_SHEET_ID,
  apiKey: '',
  isDemoMode: false,
  auth: defaultAuthSettings,
  appName: DEFAULT_CUSTOMER_NAME,
  risk: defaultRiskSettings,
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
        risk: { ...defaultRiskSettings, ...(parsed.risk || {}) },
      };

      if (!merged.sheetId) merged.sheetId = DEFAULT_SHEET_ID;
      if (!merged.appName || merged.appName === 'KhangHang1') merged.appName = DEFAULT_CUSTOMER_NAME;
      if (merged.auth.username === 'admin' || merged.auth.username === 'KhangHang1' || !merged.auth.username) merged.auth.username = merged.appName || DEFAULT_CUSTOMER_NAME;
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
      risk: {
        ...settings.risk,
        ...(newSettings.risk || {}),
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
      setError(`${message} Bảng điều khiển đang hiển thị dữ liệu mẫu để bạn vẫn xem được giao diện.`);
      setTrades(DEMO_TRADES);
      setStats(AnalyticsService.calculateStats(DEMO_TRADES));
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

  useEffect(() => {
    document.title = `${settings.appName || DEFAULT_CUSTOMER_NAME} | ${BRAND_NAME}`;
  }, [settings.appName]);

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



