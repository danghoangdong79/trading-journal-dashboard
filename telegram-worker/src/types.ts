/** Shared types for Telegram Worker */

export interface Env {
  TELEGRAM_BOT_TOKEN: string;
  TELEGRAM_SECRET: string;
  GOOGLE_SERVICE_ACCOUNT_JSON: string;
  SHEET_ID: string;
  ALLOWED_CHAT_IDS: string;
}

/** Telegram Update (simplified) */
export interface TelegramUpdate {
  update_id: number;
  message?: TelegramMessage;
  callback_query?: TelegramCallbackQuery;
}

export interface TelegramMessage {
  message_id: number;
  from?: TelegramUser;
  chat: TelegramChat;
  date: number;
  text?: string;
  entities?: TelegramMessageEntity[];
}

export interface TelegramUser {
  id: number;
  first_name: string;
  last_name?: string;
  username?: string;
}

export interface TelegramChat {
  id: number;
  type: 'private' | 'group' | 'supergroup' | 'channel';
  title?: string;
}

export interface TelegramMessageEntity {
  type: string;
  offset: number;
  length: number;
}

export interface TelegramCallbackQuery {
  id: string;
  from: TelegramUser;
  message?: TelegramMessage;
  data?: string;
}

/** Google Sheets Service Account */
export interface ServiceAccount {
  client_email: string;
  private_key: string;
}

/** Trade input from Telegram command */
export interface TradeInput {
  account: string;
  assetType: 'Cổ phiếu' | 'Phái sinh';
  symbol: string;
  position: 'LONG' | 'SHORT';
  orderType: string;
  strategy: string;
  openDate: string;
  openTime: string;
  volume: number;
  entryPrice: number;
  stopLoss: number;
  takeProfit: number;
  mood: string;
  reviewNote: string;
}

/** Parsed command result */
export interface ParsedCommand {
  command: string;
  args: string[];
  rawText: string;
}

/** JOURNAL row for appending (columns B through W, skipping AUTO columns) */
export type JournalRowValues = (string | number)[];
