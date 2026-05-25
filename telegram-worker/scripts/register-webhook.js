/**
 * Register Telegram webhook.
 *
 * Usage:
 *   node scripts/register-webhook.js <WORKER_URL> <BOT_TOKEN> <SECRET>
 *
 * Example:
 *   node scripts/register-webhook.js https://dahodo-journal-telegram.workers.dev YOUR_BOT_TOKEN YOUR_SECRET
 */

const [,, workerUrl, botToken, secret] = process.argv;

if (!workerUrl || !botToken) {
  console.error('Usage: node register-webhook.js <WORKER_URL> <BOT_TOKEN> [SECRET]');
  process.exit(1);
}

const webhookUrl = `${workerUrl.replace(/\/$/, '')}/webhook`;

async function main() {
  const body = {
    url: webhookUrl,
    allowed_updates: ['message', 'callback_query'],
  };

  if (secret) {
    body.secret_token = secret;
  }

  const response = await fetch(`https://api.telegram.org/bot${botToken}/setWebhook`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });

  const data = await response.json();
  console.log('Result:', JSON.stringify(data, null, 2));

  if (data.ok) {
    console.log(`\n✅ Webhook set to: ${webhookUrl}`);
  } else {
    console.error(`\n❌ Failed: ${data.description}`);
    process.exit(1);
  }
}

main().catch(console.error);
