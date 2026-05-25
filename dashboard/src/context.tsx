import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import type {
  Trade,
  TradingStats,
  DashboardSettings,
  AuthState,
  AuthSettings,
  RiskSettings,
  ThemeMode,
  MetricSettings,
  SheetUser,
  SheetRuntimeConfig,
} from './types.ts';
import { AnalyticsService } from './services/analyticsService.ts';
import { GoogleSheetsService } from './services/googleSheetsService.ts';
import { DEMO_TRADES } from './constants.ts';

interface AppContextType {
  trades: Trade[];
  availableAccounts: string[];
  sheetUsers: SheetUser[];
  sheetConfig: SheetRuntimeConfig | null;
  effectiveRisk: RiskSettings;
  stats: TradingStats | null;
  settings: DashboardSettings;
  isLoading: boolean;
  isAuthLoading: boolean;
  error: string | null;
  authError: string | null;
  updateSettings: (newSettings: Partial<DashboardSettings>) => void;
  refreshData: (forceRefresh?: boolean) => Promise<void>;
  refreshAuthUsers: (forceRefresh?: boolean) => Promise<void>;
  authState: AuthState;
  login: (username: string, password: string, rememberMe?: boolean) => Promise<boolean>;
  logout: () => void;
  theme: ThemeMode;
  setTheme: (mode: ThemeMode) => void;
}

interface StoredAuthSession {
  username: string | null;
  rememberMe: boolean;
}

const DEFAULT_SHEET_ID = '1PdCmBoBQsznOx6JXvOlbD-atxQnX9wHRXiM127f109I';
const BRAND_NAME = 'Dahodo.Journal';
const DEFAULT_CUSTOMER_NAME = 'Phương Trần';
const VALID_THEMES: ThemeMode[] = ['light', 'dark', 'system'];
const AUTH_STORAGE_KEY = 'kh1_auth';

const defaultAuthSettings: AuthSettings = {
  enabled: true,
  username: 'admin',
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
    cashFlowNet: true,
    currentBalance: true,
    totalTrades: true,
    expectancy: true,
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

function normalizeText(value: unknown) {
  return String(value ?? '')
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
}

function isEnabledUserStatus(status: string) {
  const normalized = normalizeText(status);
  return normalized === 'bat' || normalized === 'enabled' || normalized === 'active' || normalized === 'true' || normalized === '1' || normalized === 'on';
}

function getTradeAccounts(trades: Trade[]) {
  return uniqueSortedStrings(trades.map((trade) => trade.account));
}

function buildAuthenticatedState(user: SheetUser): AuthState {
  return {
    isAuthenticated: true,
    username: user.username,
    displayName: user.displayName || user.username,
    role: user.role || null,
  };
}

function clearStoredAuthSession() {
  localStorage.removeItem(AUTH_STORAGE_KEY);
  sessionStorage.removeItem(AUTH_STORAGE_KEY);
}

function parseStoredAuthValue(raw: string | null, rememberMe: boolean): StoredAuthSession | null {
  if (!raw) return null;
  if (raw === 'true') return { username: null, rememberMe };

  try {
    const parsed = JSON.parse(raw) as { username?: unknown } | string;
    if (typeof parsed === 'string') {
      const username = parsed.trim();
      return { username: username || null, rememberMe };
    }
    const username = typeof parsed?.username === 'string' ? parsed.username.trim() : '';
    return { username: username || null, rememberMe };
  } catch {
    return null;
  }
}

function readStoredAuthSession(): StoredAuthSession | null {
  return parseStoredAuthValue(localStorage.getItem(AUTH_STORAGE_KEY), true)
    || parseStoredAuthValue(sessionStorage.getItem(AUTH_STORAGE_KEY), false);
}

function persistStoredAuthSession(username: string, rememberMe: boolean) {
  const payload = JSON.stringify({ username });
  if (rememberMe) {
    localStorage.setItem(AUTH_STORAGE_KEY, payload);
    sessionStorage.removeItem(AUTH_STORAGE_KEY);
    return;
  }

  sessionStorage.setItem(AUTH_STORAGE_KEY, payload);
  localStorage.removeItem(AUTH_STORAGE_KEY);
}

function findEnabledUser(users: SheetUser[], username: string) {
  const normalizedUsername = normalizeText(username);
  if (!normalizedUsername) return null;
  return users.find((user) => normalizeText(user.username) === normalizedUsername && isEnabledUserStatus(user.status)) || null;
}

async function sha256Hex(value: string) {
  const encoded = new TextEncoder().encode(value);
  const digest = await crypto.subtle.digest('SHA-256', encoded);
  return Array.from(new Uint8Array(digest))
    .map((item) => item.toString(16).padStart(2, '0'))
    .join('');
}

async function passwordMatches(plainText: string, storedHash: string) {
  const normalizedStoredHash = storedHash.trim().toLowerCase();
  if (/^[a-f0-9]{64}$/.test(normalizedStoredHash)) {
    return (await sha256Hex(plainText)).toLowerCase() === normalizedStoredHash;
  }
  return plainText === storedHash;
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
        metrics: {
          ...defaultMetricSettings,
          ...(parsed.metrics || {}),
          visible: { ...defaultMetricSettings.visible, ...(parsed.metrics?.visible || {}) },
        },
      };

      if (!merged.sheetId) merged.sheetId = DEFAULT_SHEET_ID;
      if (!merged.siteName || merged.siteName === 'KhangHang1') merged.siteName = BRAND_NAME;
      if (!merged.appName || merged.appName === 'KhangHang1') merged.appName = DEFAULT_CUSTOMER_NAME;
      if (merged.auth.username === 'KhangHang1' || !merged.auth.username) merged.auth.username = defaultAuthSettings.username;
      if (!merged.apiKey && merged.sheetId === DEFAULT_SHEET_ID) merged.isDemoMode = false;

      return merged;
    } catch {
      return defaultSettings;
    }
  });

  const [trades, setTrades] = useState<Trade[]>([]);
  const [availableAccounts, setAvailableAccounts] = useState<string[]>([]);
  const [sheetUsers, setSheetUsers] = useState<SheetUser[]>([]);
  const [sheetConfig, setSheetConfig] = useState<SheetRuntimeConfig | null>(null);
  const [stats, setStats] = useState<TradingStats | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isAuthLoading, setIsAuthLoading] = useState(false);
  const [hasLoadedAuthUsers, setHasLoadedAuthUsers] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [authError, setAuthError] = useState<string | null>(null);
  const [theme, setThemeState] = useState<ThemeMode>(() => {
    const savedTheme = localStorage.getItem('kh1_theme') as ThemeMode | null;
    return savedTheme && VALID_THEMES.includes(savedTheme) ? savedTheme : 'system';
  });
  const [authState, setAuthState] = useState<AuthState>(() => {
    if (!defaultSettings.auth.enabled) {
      return { isAuthenticated: true, username: 'Guest', displayName: 'Guest', role: null };
    }
    return { isAuthenticated: false, username: null, displayName: null, role: null };
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

  const login = async (username: string, password: string, rememberMe = settings.auth.rememberMe) => {
    const user = findEnabledUser(sheetUsers, username);
    if (!user || !(await passwordMatches(password, user.passwordHash))) return false;

    persistStoredAuthSession(user.username, rememberMe);
    setAuthState(buildAuthenticatedState(user));
    updateSettings({ auth: { ...settings.auth, username: user.username, rememberMe } });
    return true;
  };

  const logout = () => {
    setAuthState({ isAuthenticated: false, username: null, displayName: null, role: null });
    clearStoredAuthSession();
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
      clearStoredAuthSession();
      setAuthState({ isAuthenticated: true, username: 'Guest', displayName: 'Guest', role: null });
    } else if (!readStoredAuthSession()) {
      setAuthState({ isAuthenticated: false, username: null, displayName: null, role: null });
    }
  };

  const refreshData = async (forceRefresh = false) => {
    setIsLoading(true);
    setError(null);

    try {
      let nextTrades: Trade[];
      let nextAvailableAccounts: string[];
      let nextSheetConfig: SheetRuntimeConfig | null;

      if (settings.isDemoMode) {
        nextTrades = DEMO_TRADES;
        nextAvailableAccounts = getTradeAccounts(DEMO_TRADES);
        nextSheetConfig = null;
      } else {
        [nextTrades, nextAvailableAccounts, nextSheetConfig] = await Promise.all([
          GoogleSheetsService.fetchTrades(settings.sheetId, settings.apiKey, { forceRefresh }),
          GoogleSheetsService.fetchAvailableAccounts(settings.sheetId, settings.apiKey, { forceRefresh }).catch(() => []),
          GoogleSheetsService.fetchSheetConfig(settings.sheetId, settings.apiKey, { forceRefresh }).catch(() => null),
        ]);
      }

      const mergedAccounts = uniqueSortedStrings([...nextAvailableAccounts, ...getTradeAccounts(nextTrades)]);

      setTrades(nextTrades);
      setAvailableAccounts(mergedAccounts);
      setSheetConfig(nextSheetConfig);
      setStats(AnalyticsService.calculateStats(nextTrades));
    } catch (caughtError) {
      const message = caughtError instanceof Error ? caughtError.message : 'Không thể tải dữ liệu giao dịch.';
      setError(`${message} Bảng điều khiển đang hiển thị dữ liệu mẫu để bạn vẫn xem được giao diện.`);
      setTrades(DEMO_TRADES);
      setAvailableAccounts(getTradeAccounts(DEMO_TRADES));
      setSheetConfig(null);
      setStats(AnalyticsService.calculateStats(DEMO_TRADES));
    } finally {
      setIsLoading(false);
    }
  };

  const refreshAuthUsers = async (forceRefresh = false) => {
    if (!settings.sheetId.trim()) {
      setSheetUsers([]);
      setAuthError('Cần Sheet ID để đọc tab USERS.');
      setHasLoadedAuthUsers(true);
      setIsAuthLoading(false);
      return;
    }

    setIsAuthLoading(true);
    setAuthError(null);

    try {
      const nextUsers = await GoogleSheetsService.fetchUsers(settings.sheetId, settings.apiKey, { forceRefresh });
      setSheetUsers(nextUsers);
      setAuthError(nextUsers.length > 0 ? null : 'Tab USERS chưa có dòng người dùng hợp lệ.');
    } catch (caughtError) {
      const message = caughtError instanceof Error ? caughtError.message : 'Không thể đọc tab USERS.';
      setSheetUsers([]);
      setAuthError(message);
    } finally {
      setHasLoadedAuthUsers(true);
      setIsAuthLoading(false);
    }
  };

  useEffect(() => {
    void refreshAuthUsers();
  }, [settings.sheetId, settings.apiKey]);

  useEffect(() => {
    if (!settings.auth.enabled) {
      setAuthState({ isAuthenticated: true, username: 'Guest', displayName: 'Guest', role: null });
      return;
    }

    if (!hasLoadedAuthUsers) return;

    const storedSession = readStoredAuthSession();
    if (!storedSession) {
      setAuthState({ isAuthenticated: false, username: null, displayName: null, role: null });
      return;
    }

    const fallbackUsername = storedSession.username || settings.auth.username;
    const matchedUser = findEnabledUser(sheetUsers, fallbackUsername);

    if (!matchedUser) {
      clearStoredAuthSession();
      setAuthState({ isAuthenticated: false, username: null, displayName: null, role: null });
      return;
    }

    persistStoredAuthSession(matchedUser.username, storedSession.rememberMe);
    setAuthState(buildAuthenticatedState(matchedUser));
  }, [hasLoadedAuthUsers, settings.auth.enabled, settings.auth.username, sheetUsers]);

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
        availableAccounts,
        sheetUsers,
        sheetConfig,
        effectiveRisk,
        stats,
        settings,
        isLoading,
        isAuthLoading,
        error,
        authError,
        updateSettings,
        refreshData,
        refreshAuthUsers,
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
