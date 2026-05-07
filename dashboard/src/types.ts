export type TradeStatus = 'Thắng' | 'Thua' | 'Hòa' | 'Đang mở';
export type AssetType = 'Cổ phiếu' | 'Phái sinh';
export type PositionType = 'LONG' | 'SHORT';
export type ThemeMode = 'light' | 'dark' | 'system';

export interface Trade {
  rowNumber: number;
  status: TradeStatus;
  account: string;
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

export interface TradingStats {
  netPnL: number;
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

export interface AuthSettings {
  enabled: boolean;
  username: string;
  passwordHash: string;
  rememberMe: boolean;
}

export interface AuthState {
  isAuthenticated: boolean;
  username: string | null;
}

export interface RiskSettings {
  stockCapital: number;
  derivativesCapital: number;
  maxRiskPerTradePct: number;
  monthlyTargetPct: number;
  minRewardRisk: number;
  maxDrawdownPct: number;
}

export interface DashboardSettings {
  sheetId: string;
  apiKey: string;
  isDemoMode: boolean;
  auth: AuthSettings;
  appName?: string;
  risk: RiskSettings;
}
