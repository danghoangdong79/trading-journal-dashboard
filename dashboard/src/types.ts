export type TradeStatus = 'Tháº¯ng' | 'Thua' | 'HÃ²a' | 'Äang má»';
export type AssetType = 'Cá» phiáº¿u' | 'PhÃ¡i sinh';
export type PositionType = 'LONG' | 'SHORT';
export type ThemeMode = 'light' | 'dark' | 'system';

export interface Trade {
  rowNumber: number;
  status: TradeStatus;
  account: string;
  orderId: string;
  assetType: AssetType;
  symbol: string;
  position: PositionType;
  orderType: string;
  strategy: string;
  openDate: string;
  openTime: string;
  closeDate: string;
  closeTime: string;
  holdingDays: number;
  volume: number;
  entryPrice: number;
  exitPrice: number;
  stopLoss: number;
  takeProfit: number;
  amplitude: number;
  grossPnL: number;
  feesAndTaxes: number;
  netPnL: number;
  mood: string;
  reviewNote: string;
  sector: string;
  entryDateTime: Date | null;
  exitDateTime: Date | null;
  cashFlow: number;
  equity: number;
}

export interface FeeCharge {
  rowNumber: number;
  date: string;
  account: string;
  category: string;
  amount: number;
  note: string;
}

export interface TradingStats {
  initialCapital: number;
  netPnL: number;
  cashFlowNet: number;
  currentBalance: number;
  totalTrades: number;
  winRate: number;
  profitFactor: number;
  maxDrawdown: number;
  expectancy: number;
  avgRR: number;
  winningTrades: number;
  losingTrades: number;
  breakEvenTrades: number;
  openTrades: number;
}

export interface SheetUser {
  rowNumber: number;
  username: string;
  passwordHash: string;
  role: string;
  displayName: string;
  status: string;
  lastLoginAt: string;
}

export interface AuthSettings {
  enabled: boolean;
  username: string;
  rememberMe: boolean;
}

export interface AuthState {
  isAuthenticated: boolean;
  username: string | null;
  displayName?: string | null;
  role?: string | null;
}

export interface RiskSettings {
  stockCapital: number;
  derivativesCapital: number;
  maxRiskPerTradePct: number;
  monthlyTargetPct: number;
  minRewardRisk: number;
  maxDrawdownPct: number;
}

export interface SheetRuntimeConfig {
  initialCapital: number;
  stockCapital: number;
  derivativesCapital: number;
  maxRiskPerTradePct: number;
  monthlyTargetPct: number;
  minRewardRisk: number;
}

export type MetricKey = 'netPnL' | 'cashFlowNet' | 'currentBalance' | 'totalTrades' | 'expectancy';

export interface MetricSettings {
  visible: Record<MetricKey, boolean>;
  primary: MetricKey;
}

export interface DashboardSettings {
  sheetId: string;
  apiKey: string;
  isDemoMode: boolean;
  auth: AuthSettings;
  siteName?: string;
  appName?: string;
  risk: RiskSettings;
  metrics: MetricSettings;
  /** Google Sheets tab gid for JOURNAL (default: 913303097) */
  journalGid?: string;
  /** Google Sheets tab gid for CONFIG (default: 0) */
  configGid?: string;
}
