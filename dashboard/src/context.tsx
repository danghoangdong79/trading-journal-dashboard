import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import type { Trade, TradingStats, DashboardSettings, AuthState, AuthSettings, RiskSettings, ThemeMode, FeeCharge, MetricSettings } from './types.ts';
import type { SheetRuntimeConfig } from './types.ts';
import { useMemo } from 'react';
import { AnalyticsService } from './services/analyticsService.ts';
import { GoogleSheetsService } from './services/googleSheetsService.ts';
import { DEMO_TRADES } from './constants.ts';

interface AppContextType {
  trades: Trade[];
  feeCharges: FeeCharge[];
  availableAccounts: string[];
  sheetConfig: SheetRuntimeConfig | null;
  effectiveRisk: RiskSettings;
  stats: TradingStats | null;
  settings: DashboardSettings;
  isLoading: boolean;
  error: string | null;
  updateSettings: (newSettings: Partial<DashboardSettings>) => void;
  refreshData: () => Promise<void>;
  authState: AuthState;
  login: (username: string, password: string) => boolean;
  logout: () => void;
  theme: ThemeMode;
  setTheme: (mode: ThemeMode) => void;
}

const DEFAULT_SHEET_ID = '1PdCmBoBQsznOx6JXvOlbD-atxQnX9wHRXiM127f109I';
const BRAND_NAME = 'Dahodo.Journal';
const DEFAULT_CUSTOMER_NAME = 'Phương Trần';
const VALID_THEMES: ThemeMode[] = ['light', 'dark', 'system'];

const defaultAuthSettings: AuthSettings = {
  enabled: true,
  username: 'admin',
  passwordHash: 'admin',
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

const defaultMetricSettings: MetricSettings = {
  visible: {
    netPnL: true,
    currentBalance: true,
    totalTrades: true,
    expectancy: true,
    feeCharges: true,
  },
  primary: 'netPnL',
};

const defaultSettings: DashboardSettings = {
  sheetId: DEFAULT_SHEET_ID,
  apiKey: '',
  isDemoMode: false,
  auth: defaultAuthSettings,
  siteName: BRAND_NAME,
  appName: DEFAULT_CUSTOMER_NAME,
  risk: defaultRiskSettings,
  metrics: defaultMetricSettings,
};

const AppContext = createContext<AppContextType | undefined>(undefined);

function uniqueSortedStrings(values: string[]) {
  const seen = new Set<string>();
  values.forEach((value) => {
    const normalized = String(value || '').trim();
    if (!normalized) return;
    seen.add(normalized);
  });
  return Array.from(seen).sort((left, right) => left.localeCompare(right, 'vi'));
}

function getTradeAccounts(trades: Trade[]) {
  return uniqueSortedStrings(trades.map((trade) => trade.account));
}

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
        metrics: { ...defaultMetricSettings, ...(parsed.metrics || {}), visible: { ...defaultMetricSettings.visible, ...(parsed.metrics?.visible || {}) } },
      };

      if (!merged.sheetId) merged.sheetId = DEFAULT_SHEET_ID;
      if (!merged.siteName || merged.siteName === 'KhangHang1') merged.siteName = BRAND_NAME;
      if (!merged.appName || merged.appName === 'KhangHang1') merged.appName = DEFAULT_CUSTOMER_NAME;
      if (merged.auth.username === 'KhangHang1' || !merged.auth.username) merged.auth.username = defaultAuthSettings.username;
      if (merged.auth.passwordHash === 'admin123' || !merged.auth.passwordHash) merged.auth.passwordHash = defaultAuthSettings.passwordHash;
      if (!merged.apiKey && merged.sheetId === DEFAULT_SHEET_ID) merged.isDemoMode = false;

      return merged;
    } catch {
      return defaultSettings;
    }
  });

  const [trades, setTrades] = useState<Trade[]>([]);
  const [feeCharges, setFeeCharges] = useState<FeeCharge[]>([]);
  const [availableAccounts, setAvailableAccounts] = useState<string[]>([]);
  const [sheetConfig, setSheetConfig] = useState<SheetRuntimeConfig | null>(null);
  const [stats, setStats] = useState<TradingStats | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [theme, setThemeState] = useState<ThemeMode>(() => {
    const savedTheme = localStorage.getItem('kh1_theme') as ThemeMode | null;
    return savedTheme && VALID_THEMES.includes(savedTheme) ? savedTheme : 'system';
  });
  const [authState, setAuthState] = useState<AuthState>(() => {
    if (!defaultSettings.auth.enabled) return { isAuthenticated: true, username: 'Guest' };
    const localAuth = localStorage.getItem('kh1_auth');
    const sessionAuth = sessionStorage.getItem('kh1_auth');
    if (localAuth === 'true' || sessionAuth === 'true') {
      return { isAuthenticated: true, username: defaultAuthSettings.username };
    }
    return { isAuthenticated: false, username: null };
  });

  const effectiveRisk = useMemo<RiskSettings>(() => {
    if (!sheetConfig) return settings.risk;

    return {
      ...settings.risk,
      stockCapital: sheetConfig.stockCapital,
      derivativesCapital: sheetConfig.derivativesCapital,
      maxRiskPerTradePct: sheetConfig.maxRiskPerTradePct,
      monthlyTargetPct: sheetConfig.monthlyTargetPct,
      minRewardRisk: sheetConfig.minRewardRisk,
    };
  }, [settings.risk, sheetConfig]);

  const setTheme = (mode: ThemeMode) => {
    if (!VALID_THEMES.includes(mode)) mode = 'system';
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

  const login = (username: string, password: string) => {
    const normalizedUsername = username.trim();
    if (normalizedUsername !== settings.auth.username || password !== settings.auth.passwordHash) return false;
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
      metrics: {
        ...settings.metrics,
        ...(newSettings.metrics || {}),
        visible: {
          ...settings.metrics.visible,
          ...(newSettings.metrics?.visible || {}),
        },
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
      let nextTrades: Trade[];
      let nextFeeCharges: FeeCharge[];
      let nextAvailableAccounts: string[];
      let nextSheetConfig: SheetRuntimeConfig | null;

      if (settings.isDemoMode) {
        nextTrades = DEMO_TRADES;
        nextFeeCharges = [];
        nextAvailableAccounts = getTradeAccounts(DEMO_TRADES);
        nextSheetConfig = null;
      } else {
        [nextTrades, nextFeeCharges, nextAvailableAccounts, nextSheetConfig] = await Promise.all([
          GoogleSheetsService.fetchTrades(settings.sheetId, settings.apiKey),
          GoogleSheetsService.fetchFeeCharges(settings.sheetId, settings.apiKey).catch(() => []),
          GoogleSheetsService.fetchAvailableAccounts(settings.sheetId, settings.apiKey).catch(() => []),
          GoogleSheetsService.fetchSheetConfig(settings.sheetId, settings.apiKey).catch(() => null),
        ]);
      }

      const mergedAccounts = uniqueSortedStrings([...nextAvailableAccounts, ...getTradeAccounts(nextTrades)]);

      setTrades(nextTrades);
      setFeeCharges(nextFeeCharges);
      setAvailableAccounts(mergedAccounts);
      setSheetConfig(nextSheetConfig);
      setStats(AnalyticsService.calculateStats(nextTrades));
    } catch (caughtError) {
      const message = caughtError instanceof Error ? caughtError.message : 'Không thể tải dữ liệu giao dịch.';
      setError(`${message} Bảng điều khiển đang hiển thị dữ liệu mẫu để bạn vẫn xem được giao diện.`);
      setTrades(DEMO_TRADES);
      setFeeCharges([]);
      setAvailableAccounts(getTradeAccounts(DEMO_TRADES));
      setSheetConfig(null);
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
    document.title = `${settings.appName || DEFAULT_CUSTOMER_NAME} | ${settings.siteName || BRAND_NAME}`;
  }, [settings.appName, settings.siteName]);

  return (
    <AppContext.Provider
      value={{
        trades,
        feeCharges,
        availableAccounts,
        sheetConfig,
        effectiveRisk,
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







