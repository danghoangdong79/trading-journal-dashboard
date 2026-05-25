const API_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM4MjA5OS1kYmVjLTQ3ZDctOGY1Mi04NDdmODgwYzhjZDgiLCJpc3MiOiJuOG4iLCJhdWQiOiJwdWJsaWMtYXBpIiwianRpIjoiMWNiYTUyZTItZWM0OS00MzQxLWIxZjctNDkzYWEzZDY3MWU0IiwiaWF0IjoxNzc2MTUwODcwfQ.R7JDZ62V1gQpI96WWbRF_L1DfrUv6Iz2kjKQ2MpOVOU';
const WORKFLOW_ID = 'iXKZjLQwoc5otveg';
const BASE = 'https://n8n.dahodo.com/api/v1';

async function main() {
  const res = await fetch(`${BASE}/workflows/${WORKFLOW_ID}`, { headers: { 'X-N8N-API-KEY': API_KEY } });
  const workflow = await res.json();
  const normalizeNode = workflow.nodes.find(n => n.name === 'Normalize Telegram Input');

  if (normalizeNode) {
    normalizeNode.parameters.jsCode = `
const message = $json.message || $json.edited_message || {};
const chatId = message.chat?.id;
const text = String(message.text || message.caption || '').trim();

let fileId = '';
if (Array.isArray(message.photo) && message.photo.length > 0) {
  fileId = message.photo[message.photo.length - 1].file_id;
} else if (message.document && message.document.mime_type && message.document.mime_type.startsWith('image/')) {
  fileId = message.document.file_id;
}

return [{
  json: {
    source: 'telegram',
    sessionId: String(chatId || message.message_id || Date.now()),
    chatId,
    text,
    imageUrl: '',
    telegramPhotoFileId: fileId,
    raw: {
      text,
      messageId: message.message_id,
      chatId,
      from: message.from,
      caption: message.caption || ''
    },
    receivedAt: new Date().toISOString()
  }
}];
`;
  }

  const updateRes = await fetch(`${BASE}/workflows/${WORKFLOW_ID}`, {
    method: 'PUT',
    headers: { 'X-N8N-API-KEY': API_KEY, 'Content-Type': 'application/json' },
    body: JSON.stringify({ name: workflow.name, nodes: workflow.nodes, connections: workflow.connections, settings: {} })
  });
  console.log(updateRes.ok ? '✅ SUCCESS' : '❌ FAILED');
}

main().catch(console.error);
