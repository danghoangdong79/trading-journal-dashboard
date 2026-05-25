/**
 * /close command handler.
 *
 * Syntax:
 *   /close [Mã] [Giá đóng]
 *   /close VNI 1265
 *   /close VN30F2506 1275
 */

import type { Env, ServiceAccount } from '../types';
import { sendMessage } from '../telegram';
import { readRange, updateRange } from '../sheets';

const GOOGLE_SHEETS_EPOCH_MS = Date.UTC(1899, 11, 30);
const MS_PER_DAY = 24 * 60 * 60 * 1000;

function googleSerialDate(value: number): Date | null {
  if (!Number.isFinite(value)) return null;
  return new Date(GOOGLE_SHEETS_EPOCH_MS + Math.floor(value) * MS_PER_DAY);
}

function formatDateCell(value: unknown): string {
  if (typeof value === 'number') {
    const date = googleSerialDate(value);
    if (date) {
      const day = String(date.getUTCDate()).padStart(2, '0');
      const month = String(date.getUTCMonth() + 1).padStart(2, '0');
      return `${day}/${month}/${date.getUTCFullYear()}`;
    }
  }
  return String(value || '').trim();
}

function normalizeText(value: unknown): string {
  return String(value ?? '').trim().toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
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

function formatVND(value: number): string {
  return new Intl.NumberFormat('vi-VN').format(value);
}

function parseNumber(value: unknown): number {
  return typeof value === 'number' ? value : Number.parseFloat(String(value || '0')) || 0;
}

export async function handleClose(args: string[], chatId: number, env: Env): Promise<void> {
  if (args.length < 2) {
    await sendMessage(env.TELEGRAM_BOT_TOKEN, chatId,
      '⚠️ <b>Thiếu thông tin</b>\n\n'
      + 'Cú pháp: <code>/close [Mã] [Giá đóng]</code>\n\n'
      + '📌 Ví dụ:\n'
      + '<code>/close VNI 1265</code>\n'
      + '<code>/close VN30F2506 1275</code>',
    );
    return;
  }

  const symbol = args[0].toUpperCase();
  const exitPrice = Number.parseFloat(args[1] || '0');

  if (exitPrice <= 0) {
    await sendMessage(env.TELEGRAM_BOT_TOKEN, chatId, '❌ Giá đóng phải > 0.');
    return;
  }

  try {
    const serviceAccount = JSON.parse(env.GOOGLE_SERVICE_ACCOUNT_JSON) as ServiceAccount;
    const values = await readRange(serviceAccount, env.SHEET_ID, 'JOURNAL!A1:Y2000');
    let targetRow = -1;
    let targetRowData: unknown[] = [];

    for (let i = values.length - 1; i >= 1; i--) {
      const row = values[i];
      if (!Array.isArray(row)) continue;
      const status = normalizeText(row[0]);
      const rowSymbol = String(row[4] || '').trim().toUpperCase();
      const closeDate = String(row[10] || '').trim();
      if (rowSymbol === symbol && !closeDate && (status === 'dang mo' || status === '')) {
        targetRow = i + 1;
        targetRowData = row;
        break;
      }
    }

    if (targetRow === -1) {
      await sendMessage(env.TELEGRAM_BOT_TOKEN, chatId, `⚠️ Không tìm thấy lệnh <b>${symbol}</b> đang mở.`);
      return;
    }

    const { date, time } = getNow();
    const entryPrice = parseNumber(targetRowData[14]);
    const volume = parseNumber(targetRowData[13]);
    const position = String(targetRowData[5] || '').trim().toUpperCase();
    const openDate = formatDateCell(targetRowData[8]);

    await updateRange(serviceAccount, env.SHEET_ID, `JOURNAL!K${targetRow}:L${targetRow}`, [[date, time]]);
    await updateRange(serviceAccount, env.SHEET_ID, `JOURNAL!P${targetRow}`, [[exitPrice]]);

    const direction = position === 'SHORT' ? -1 : 1;
    const pnlPerUnit = (exitPrice - entryPrice) * direction;
    const emoji = pnlPerUnit > 0 ? '🟢' : pnlPerUnit < 0 ? '🔴' : '🟡';

    await sendMessage(env.TELEGRAM_BOT_TOKEN, chatId,
      `✅ <b>Đã đóng lệnh!</b>\n\n`
      + `${emoji} <b>${symbol}</b> | ${position}\n`
      + `📦 KL: <b>${formatVND(volume)}</b>\n`
      + `💰 Vào: <b>${formatVND(entryPrice)}</b> → Ra: <b>${formatVND(exitPrice)}</b>\n`
      + `📅 ${openDate} → ${date} ${time}\n`
      + `📈 Biên độ: <b>${pnlPerUnit > 0 ? '+' : ''}${formatVND(pnlPerUnit)}</b>/đơn vị\n\n`
      + `📍 Dòng JOURNAL: <code>${targetRow}</code>\n`
      + '<i>Lãi/lỗ ròng sẽ được công thức Sheet tự tính.</i>',
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Lỗi không xác định';
    await sendMessage(env.TELEGRAM_BOT_TOKEN, chatId, `❌ <b>Lỗi đóng lệnh:</b> ${message}`);
  }
}
