/**
 * /trade command handler.
 *
 * Syntax:
 *   /trade [Mã] [Vị thế] [KL] [Giá vào] [SL] [TP]
 *   /trade VNI LONG 100 1250 1230 1280
 *   /trade D920568 VN30F2506 SHORT 2 1280 1285 1270
 */

import type { Env, ServiceAccount } from '../types';
import { sendMessage } from '../telegram';
import { appendRow } from '../sheets';

const DERIVATIVE_PATTERNS = [/^VN30F/i, /^VN30CW/i, /^HNX30F/i, /^VN100F/i];

function isDerivativeSymbol(symbol: string): boolean {
  return DERIVATIVE_PATTERNS.some((pattern) => pattern.test(symbol));
}

function formatVND(value: number): string {
  return new Intl.NumberFormat('vi-VN').format(value);
}

function getNow(): { date: string; time: string } {
  const now = new Date();
  const vn = new Date(now.getTime() + 7 * 60 * 60 * 1000);
  const dd = String(vn.getUTCDate()).padStart(2, '0');
  const mm = String(vn.getUTCMonth() + 1).padStart(2, '0');
  const yyyy = vn.getUTCFullYear();
  const hh = String(vn.getUTCHours()).padStart(2, '0');
  const mi = String(vn.getUTCMinutes()).padStart(2, '0');
  return { date: `${dd}/${mm}/${yyyy}`, time: `${hh}:${mi}` };
}

export async function handleTrade(args: string[], chatId: number, env: Env): Promise<void> {
  if (args.length < 4) {
    await sendMessage(env.TELEGRAM_BOT_TOKEN, chatId,
      '⚠️ <b>Thiếu thông tin</b>\n\n'
      + 'Cú pháp: <code>/trade [Mã] [Vị thế] [KL] [Giá vào] [SL] [TP]</code>\n\n'
      + '📌 Ví dụ:\n'
      + '<code>/trade VNI LONG 100 1250 1230 1280</code>\n'
      + '<code>/trade VN30F2506 SHORT 2 1280 1285 1270</code>\n'
      + '<code>/trade D920568 VNI LONG 100 1250</code> (có tài khoản)',
    );
    return;
  }

  let account = '';
  let startIdx = 0;

  if (/^[DT]\d{4,}$/i.test(args[0]) && args.length >= 5) {
    account = args[0].toUpperCase();
    startIdx = 1;
  }

  const symbol = args[startIdx]?.toUpperCase() || '';
  const positionRaw = args[startIdx + 1]?.toUpperCase() || 'LONG';
  const volume = Number.parseFloat(args[startIdx + 2] || '0');
  const entryPrice = Number.parseFloat(args[startIdx + 3] || '0');
  const stopLoss = Number.parseFloat(args[startIdx + 4] || '0');
  const takeProfit = Number.parseFloat(args[startIdx + 5] || '0');
  const position = positionRaw === 'SHORT' ? 'SHORT' : 'LONG';

  if (!symbol) {
    await sendMessage(env.TELEGRAM_BOT_TOKEN, chatId, '❌ Thiếu mã giao dịch.');
    return;
  }
  if (volume <= 0) {
    await sendMessage(env.TELEGRAM_BOT_TOKEN, chatId, '❌ Khối lượng phải > 0.');
    return;
  }
  if (entryPrice <= 0) {
    await sendMessage(env.TELEGRAM_BOT_TOKEN, chatId, '❌ Giá vào phải > 0.');
    return;
  }

  const assetType = isDerivativeSymbol(symbol) ? 'Phái sinh' : 'Cổ phiếu';
  const { date, time } = getNow();

  const rowValues: (string | number)[] = [
    '', account, '', assetType, symbol, position, 'Lệnh thường', '', date, time,
    '', '', '', volume, entryPrice, '', stopLoss || '', takeProfit || '', '', '', '', '',
    '', `Nhập từ Telegram ${date} ${time}`, '',
  ];

  try {
    const serviceAccount = JSON.parse(env.GOOGLE_SERVICE_ACCOUNT_JSON) as ServiceAccount;
    const result = await appendRow(serviceAccount, env.SHEET_ID, 'JOURNAL!A:Y', rowValues);
    const riskInfo = stopLoss > 0 ? `\n🛡 SL: <b>${formatVND(stopLoss)}</b>` : '';
    const tpInfo = takeProfit > 0 ? `\n🎯 TP: <b>${formatVND(takeProfit)}</b>` : '';
    const accountInfo = account ? `\n💼 TK: <b>${account}</b>` : '';

    await sendMessage(env.TELEGRAM_BOT_TOKEN, chatId,
      `✅ <b>Đã ghi lệnh mới!</b>\n\n`
      + `📊 ${assetType === 'Phái sinh' ? '🔮' : '📈'} <b>${symbol}</b> | ${position}\n`
      + `📦 KL: <b>${formatVND(volume)}</b>\n`
      + `💰 Giá vào: <b>${formatVND(entryPrice)}</b>`
      + riskInfo + tpInfo + accountInfo
      + `\n🕐 ${date} ${time}\n\n`
      + `📍 Dòng: <code>${result.updatedRange}</code>`,
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Lỗi không xác định';
    await sendMessage(env.TELEGRAM_BOT_TOKEN, chatId, `❌ <b>Lỗi ghi Sheet:</b> ${message}`);
  }
}
