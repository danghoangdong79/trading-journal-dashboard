/** Telegram Bot API helpers */

const TELEGRAM_API = 'https://api.telegram.org/bot';

export async function sendMessage(
  token: string,
  chatId: number,
  text: string,
  options: { parse_mode?: string; reply_markup?: unknown } = {},
): Promise<void> {
  const url = `${TELEGRAM_API}${token}/sendMessage`;
  const body: Record<string, unknown> = {
    chat_id: chatId,
    text,
    parse_mode: options.parse_mode || 'HTML',
  };
  if (options.reply_markup) {
    body.reply_markup = options.reply_markup;
  }
  await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
}

export async function answerCallbackQuery(
  token: string,
  callbackQueryId: string,
  text?: string,
): Promise<void> {
  const url = `${TELEGRAM_API}${token}/answerCallbackQuery`;
  await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      callback_query_id: callbackQueryId,
      text: text || '',
    }),
  });
}

export async function editMessageText(
  token: string,
  chatId: number,
  messageId: number,
  text: string,
  options: { parse_mode?: string; reply_markup?: unknown } = {},
): Promise<void> {
  const url = `${TELEGRAM_API}${token}/editMessageText`;
  const body: Record<string, unknown> = {
    chat_id: chatId,
    message_id: messageId,
    text,
    parse_mode: options.parse_mode || 'HTML',
  };
  if (options.reply_markup) {
    body.reply_markup = options.reply_markup;
  }
  await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
}

/** Register webhook URL with Telegram */
export async function registerWebhook(
  token: string,
  webhookUrl: string,
  secret: string,
): Promise<string> {
  const url = `${TELEGRAM_API}${token}/setWebhook`;
  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      url: webhookUrl,
      secret_token: secret,
      allowed_updates: ['message', 'callback_query'],
    }),
  });
  const data = await response.json() as { ok: boolean; description?: string };
  if (!data.ok) throw new Error(data.description || 'Failed to set webhook');
  return `Webhook set to ${webhookUrl}`;
}

/** Delete webhook */
export async function deleteWebhook(token: string): Promise<string> {
  const url = `${TELEGRAM_API}${token}/deleteWebhook`;
  const response = await fetch(url, { method: 'POST' });
  const data = await response.json() as { ok: boolean; description?: string };
  if (!data.ok) throw new Error(data.description || 'Failed to delete webhook');
  return 'Webhook deleted';
}
