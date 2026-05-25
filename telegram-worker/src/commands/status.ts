/**
 * /status command handler - shows all currently open trades from JOURNAL.
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

export async function handleStatus(chatId: number, env: Env): Promise<void> {
  try {
    const sa = JSON.parse(env.GOOGLE_SERVICE_ACCOUNT_JSON) as ServiceAccount;
    const vals = await readRange(sa, env.SHEET_ID, 'JOURNAL!A1:Y2000');
    const open: { row: number; sym: string; pos: string; vol: number; price: number; sl: number; tp: number; dt: string; icon: string }[] = [];

    for (let i = 1; i < vals.length; i++) {
      const r = vals[i];
      if (!Array.isArray(r)) continue;
      const st = norm(r[0]);
      const sym = String(r[4] || '').trim();
      if (!sym || (st !== 'dang mo' && st !== '')) continue;
      if (r[10] && String(r[10]).trim()) continue;
      open.push({
        row: i + 1,
        sym: sym.toUpperCase(),
        pos: String(r[5] || 'LONG').trim().toUpperCase(),
        vol: num(r[13]),
        price: num(r[14]),
        sl: num(r[16]),
        tp: num(r[17]),
        dt: fmtDate(r[8]),
        icon: norm(r[3]) === 'phai sinh' ? '🔮' : '📈',
      });
    }

    if (!open.length) {
      await sendMessage(env.TELEGRAM_BOT_TOKEN, chatId, '📋 <b>Không có lệnh đang mở.</b>');
      return;
    }

    const lines = open.map((trade, index) => {
      let line = `${index + 1}. ${trade.icon} <b>${trade.sym}</b> | ${trade.pos}\n   📦 ${fmtVND(trade.vol)} @ ${fmtVND(trade.price)}`;
      if (trade.sl > 0) line += ` | SL: ${fmtVND(trade.sl)}`;
      if (trade.tp > 0) line += ` | TP: ${fmtVND(trade.tp)}`;
      return `${line}\n   📅 Mở: ${trade.dt} | Dòng ${trade.row}`;
    });

    await sendMessage(env.TELEGRAM_BOT_TOKEN, chatId, `📋 <b>Lệnh đang mở: ${open.length}</b>\n\n${lines.join('\n\n')}`);
  } catch (error) {
    await sendMessage(env.TELEGRAM_BOT_TOKEN, chatId, `❌ <b>Lỗi:</b> ${error instanceof Error ? error.message : 'Unknown'}`);
  }
}
