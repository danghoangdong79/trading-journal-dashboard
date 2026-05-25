/**
 * /summary command handler - shows daily trading summary.
 */

import type { Env, ServiceAccount } from '../types';
import { sendMessage } from '../telegram';
import { readRange } from '../sheets';

const EPOCH_MS = Date.UTC(1899, 11, 30);
const MS_DAY = 86400000;

function fmtDate(v: unknown): string {
  if (typeof v === 'number' && Number.isFinite(v)) {
    const d = new Date(EPOCH_MS + Math.floor(v) * MS_DAY);
    return `${String(d.getUTCDate()).padStart(2, '0')}/${String(d.getUTCMonth() + 1).padStart(2, '0')}/${d.getUTCFullYear()}`;
  }
  return String(v || '').trim();
}

function norm(v: unknown): string {
  return String(v ?? '').trim().toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
}

function fmtVND(n: number): string {
  return new Intl.NumberFormat('vi-VN').format(n);
}

function num(v: unknown): number {
  return typeof v === 'number' ? v : Number.parseFloat(String(v || '0')) || 0;
}

function todayStr(): string {
  const now = new Date(Date.now() + 7 * 3600000);
  return `${String(now.getUTCDate()).padStart(2, '0')}/${String(now.getUTCMonth() + 1).padStart(2, '0')}/${now.getUTCFullYear()}`;
}

export async function handleSummary(chatId: number, env: Env): Promise<void> {
  try {
    const sa = JSON.parse(env.GOOGLE_SERVICE_ACCOUNT_JSON) as ServiceAccount;
    const vals = await readRange(sa, env.SHEET_ID, 'JOURNAL!A1:Y2000');
    const today = todayStr();
    let wins = 0;
    let losses = 0;
    let draws = 0;
    let openCount = 0;
    let totalPnL = 0;
    let totalFees = 0;
    const todayTrades: string[] = [];

    for (let i = 1; i < vals.length; i++) {
      const row = vals[i];
      if (!Array.isArray(row)) continue;
      const symbol = String(row[4] || '').trim();
      if (!symbol) continue;
      const closeDate = fmtDate(row[10]);
      const openDate = fmtDate(row[8]);
      const status = norm(row[0]);

      if (closeDate === today) {
        const pnl = num(row[21]);
        const fees = num(row[18]);
        totalPnL += pnl;
        totalFees += fees;
        if (status === 'thang') wins++;
        else if (status === 'thua') losses++;
        else if (status === 'hoa') draws++;
        const emoji = pnl > 0 ? '🟢' : pnl < 0 ? '🔴' : '🟡';
        todayTrades.push(`${emoji} ${symbol} | ${fmtVND(pnl)}`);
      }

      if (openDate === today && (status === 'dang mo' || status === '')) {
        openCount++;
      }
    }

    const closedCount = wins + losses + draws;
    if (closedCount === 0 && openCount === 0) {
      await sendMessage(env.TELEGRAM_BOT_TOKEN, chatId, `📊 <b>Tổng hợp ${today}</b>\n\nKhông có giao dịch nào hôm nay.`);
      return;
    }

    const winRate = closedCount > 0 ? Math.round((wins / closedCount) * 100) : 0;
    const pnlEmoji = totalPnL > 0 ? '🟢' : totalPnL < 0 ? '🔴' : '🟡';
    let msg = `📊 <b>Tổng hợp ${today}</b>\n\n`;
    msg += `${pnlEmoji} Lãi/Lỗ ròng: <b>${totalPnL > 0 ? '+' : ''}${fmtVND(totalPnL)}</b>\n`;
    msg += `💸 Phí & Thuế: <b>${fmtVND(totalFees)}</b>\n\n`;
    msg += `📈 Đã đóng: <b>${closedCount}</b> (🟢${wins} 🔴${losses} 🟡${draws})\n`;
    msg += `🎯 Winrate: <b>${winRate}%</b>\n`;
    if (openCount > 0) msg += `📋 Mở mới hôm nay: <b>${openCount}</b>\n`;
    if (todayTrades.length > 0) msg += `\n<b>Chi tiết:</b>\n${todayTrades.join('\n')}`;
    await sendMessage(env.TELEGRAM_BOT_TOKEN, chatId, msg);
  } catch (error) {
    await sendMessage(env.TELEGRAM_BOT_TOKEN, chatId, `❌ <b>Lỗi:</b> ${error instanceof Error ? error.message : 'Unknown'}`);
  }
}
