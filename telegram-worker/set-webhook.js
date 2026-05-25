const token = process.env.TELEGRAM_BOT_TOKEN;
const webhookUrl = process.env.TELEGRAM_WEBHOOK_URL;
const secret = process.env.TELEGRAM_SECRET;

if (!token || !webhookUrl) {
  console.error('Usage: set TELEGRAM_BOT_TOKEN and TELEGRAM_WEBHOOK_URL before running this script.');
  process.exit(1);
}

const body = {
  url: webhookUrl,
  allowed_updates: ['message', 'callback_query'],
};

if (secret) body.secret_token = secret;

fetch(`https://api.telegram.org/bot${token}/setWebhook`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify(body),
})
  .then((response) => response.json())
  .then((data) => {
    console.log(JSON.stringify(data, null, 2));
    if (!data.ok) process.exit(1);
  })
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
