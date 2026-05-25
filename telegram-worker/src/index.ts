/**
 * Cloudflare Worker entry point for Dahodo Journal Telegram Bot.
 *
 * Webhook receives Telegram updates, routes commands, and writes to Google Sheets.
 */

import type { Env, TelegramUpdate, ParsedCommand } from './types';
import { sendMessage, registerWebhook, deleteWebhook } from './telegram';
import { handleTrade } from './commands/trade';
import { handleClose } from './commands/close';
import { handleStatus } from './commands/status';
import { handleSummary } from './commands/summary';

function parseCommand(text: string): ParsedCommand | null {
  const trimmed = text.trim();
  if (!trimmed.startsWith('/')) return null;
  const parts = trimmed.split(/\s+/);
  const command = parts[0].replace(/@\w+$/, '').toLowerCase();
  return { command, args: parts.slice(1), rawText: trimmed };
}

function isChatAllowed(chatId: number, allowedStr: string): boolean {
  if (!allowedStr.trim()) return true;
  const allowed = allowedStr.split(',').map((value) => value.trim()).filter(Boolean);
  return allowed.includes(String(chatId));
}

function helpMessage(): string {
  return (
    '📖 <b>Dahodo Journal Bot</b>\n\n'
    + '<b>Nhập lệnh mới:</b>\n'
    + '<code>/trade [Mã] [Vị thế] [KL] [Giá vào] [SL] [TP]</code>\n'
    + '→ <code>/trade VNI LONG 100 1250 1230 1280</code>\n'
    + '→ <code>/trade D920568 VN30F2506 SHORT 2 1280 1285 1270</code>\n\n'
    + '<b>Đóng lệnh:</b>\n'
    + '<code>/close [Mã] [Giá đóng]</code>\n'
    + '→ <code>/close VNI 1265</code>\n\n'
    + '<b>Lệnh đang mở:</b>\n'
    + '<code>/status</code>\n\n'
    + '<b>Tổng hợp ngày:</b>\n'
    + '<code>/summary</code>\n\n'
    + '<b>Trợ giúp:</b>\n'
    + '<code>/help</code>'
  );
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);

    if (url.pathname === '/register' && request.method === 'GET') {
      const webhookUrl = `${url.origin}/webhook`;
      const result = await registerWebhook(env.TELEGRAM_BOT_TOKEN, webhookUrl, env.TELEGRAM_SECRET);
      return new Response(result, { status: 200 });
    }

    if (url.pathname === '/unregister' && request.method === 'GET') {
      const result = await deleteWebhook(env.TELEGRAM_BOT_TOKEN);
      return new Response(result, { status: 200 });
    }

    if (url.pathname === '/health') {
      return Response.json({ ok: true, service: 'dahodo-journal-telegram-bot' });
    }

    if (url.pathname === '/webhook' && request.method === 'POST') {
      const secretHeader = request.headers.get('x-telegram-bot-api-secret-token');
      if (env.TELEGRAM_SECRET && secretHeader !== env.TELEGRAM_SECRET) {
        return new Response('Unauthorized', { status: 401 });
      }

      const update = await request.json() as TelegramUpdate;
      const message = update.message;
      if (!message?.text) return new Response('OK', { status: 200 });

      const chatId = message.chat.id;
      if (!isChatAllowed(chatId, env.ALLOWED_CHAT_IDS || '')) {
        await sendMessage(env.TELEGRAM_BOT_TOKEN, chatId, '🔒 Chat này chưa được cấp quyền sử dụng bot.');
        return new Response('OK', { status: 200 });
      }

      const parsed = parseCommand(message.text);
      if (!parsed) return new Response('OK', { status: 200 });

      switch (parsed.command) {
        case '/trade':
          await handleTrade(parsed.args, chatId, env);
          break;
        case '/close':
        case '/dong':
          await handleClose(parsed.args, chatId, env);
          break;
        case '/status':
        case '/open':
        case '/mo':
          await handleStatus(chatId, env);
          break;
        case '/summary':
        case '/tonghop':
          await handleSummary(chatId, env);
          break;
        case '/start':
        case '/help':
          await sendMessage(env.TELEGRAM_BOT_TOKEN, chatId, helpMessage());
          break;
        default:
          await sendMessage(env.TELEGRAM_BOT_TOKEN, chatId, `⚠️ Lệnh <code>${parsed.command}</code> không hợp lệ.\nGõ /help để xem hướng dẫn.`);
      }

      return new Response('OK', { status: 200 });
    }

    return new Response('Dahodo Journal Telegram Bot', { status: 200 });
  },
};
