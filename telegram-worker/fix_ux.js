import fs from 'fs';

const API_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM4MjA5OS1kYmVjLTQ3ZDctOGY1Mi04NDdmODgwYzhjZDgiLCJpc3MiOiJuOG4iLCJhdWQiOiJwdWJsaWMtYXBpIiwianRpIjoiMWNiYTUyZTItZWM0OS00MzQxLWIxZjctNDkzYWEzZDY3MWU0IiwiaWF0IjoxNzc2MTUwODcwfQ.R7JDZ62V1gQpI96WWbRF_L1DfrUv6Iz2kjKQ2MpOVOU';
const WORKFLOW_ID = 'iXKZjLQwoc5otveg';
const BASE = 'https://n8n.dahodo.com/api/v1';

async function main() {
  const res = await fetch(`${BASE}/workflows/${WORKFLOW_ID}`, { headers: { 'X-N8N-API-KEY': API_KEY } });
  const workflow = await res.json();

  // 1. Update Parse + Validate Draft to normalize exact dropdowns and add missing fields
  const parseNode = workflow.nodes.find(n => n.name === 'Parse + Validate Draft');
  if (parseNode) {
    parseNode.parameters.jsCode = `
const item = $('Merge Vision Text').item.json;
let text = item.text || '';
const visionText = item.visionText || '';
const isPhoto = !!item.telegramPhotoFileId;

// If we have AI extracted JSON, use it
let draft = {
  action: 'unknown',
  account: '',
  orderId: '',
  assetType: '',
  symbol: '',
  position: '',
  orderType: '',
  strategy: '',
  openDate: '',
  openTime: '',
  closeDate: '',
  closeTime: '',
  volume: '',
  entryPrice: '',
  exitPrice: '',
  stopLoss: '',
  takeProfit: '',
  feesAndTaxes: '',
  mood: '',
  reviewNote: ''
};

if (visionText && visionText.includes('{')) {
  try {
    const start = visionText.indexOf('{');
    const end = visionText.lastIndexOf('}') + 1;
    const jsonStr = visionText.substring(start, end);
    const parsed = JSON.parse(jsonStr);
    draft = { ...draft, ...parsed };
  } catch(e) {}
}

// Normalize exact matches for dropdowns
if (draft.assetType) {
  const at = draft.assetType.toLowerCase();
  if (at.includes('phái') || at.includes('phai')) draft.assetType = 'Phái sinh';
  else if (at.includes('cổ') || at.includes('co phieu') || at.includes('chứng')) draft.assetType = 'Cổ phiếu';
}

if (draft.orderStatus) {
  const os = draft.orderStatus.toLowerCase();
  if (os.includes('chờ') || os.includes('pending')) draft.orderStatus = 'Chờ khớp';
  else if (os.includes('đóng') || os.includes('close')) draft.orderStatus = 'Đã đóng';
  else draft.orderStatus = 'Đang mở';
}

if (!draft.openDate) {
  const now = new Date();
  const vn = new Date(now.getTime() + 7 * 60 * 60 * 1000);
  draft.openDate = \`\${vn.getUTCDate().toString().padStart(2, '0')}/\${(vn.getUTCMonth()+1).toString().padStart(2, '0')}/\${vn.getUTCFullYear()}\`;
}
if (!draft.openTime) {
  const now = new Date();
  const vn = new Date(now.getTime() + 7 * 60 * 60 * 1000);
  draft.openTime = \`\${vn.getUTCHours().toString().padStart(2, '0')}:\${vn.getUTCMinutes().toString().padStart(2, '0')}\`;
}

// Validation
let missing = [];
if (!draft.action || draft.action === 'unknown') missing.push("Hành động (Mở lệnh / Đóng lệnh)");
if (!draft.symbol) missing.push("Mã GD");
if (!draft.position) missing.push("Vị thế (LONG/SHORT)");
if (!draft.assetType) missing.push("Tài sản (Phái sinh/Cổ phiếu)");
if (!draft.strategy) missing.push("Chiến lược");

const summaryLines = [
  (draft.action === 'open' ? '🟢 MỞ LỆNH' : (draft.action === 'close' ? '🔴 ĐÓNG LỆNH' : (draft.action === 'pending' ? '🟡 LỆNH CHỜ' : '❓ KHÔNG XÁC ĐỊNH'))),
  draft.account ? \`Tài khoản: \${draft.account}\` : '',
  draft.orderId ? \`Số lệnh: \${draft.orderId}\` : '',
  draft.assetType ? \`Tài sản: \${draft.assetType}\` : '',
  draft.symbol ? \`Mã GD: \${draft.symbol}\` : '',
  draft.position ? \`Vị thế: \${draft.position}\` : '',
  draft.strategy ? \`Chiến lược: \${draft.strategy}\` : '',
  draft.volume ? \`Khối lượng: \${draft.volume}\` : '',
  draft.entryPrice ? \`Giá vào: \${draft.entryPrice}\` : '',
  draft.exitPrice ? \`Giá đóng: \${draft.exitPrice}\` : '',
  draft.stopLoss ? \`SL: \${draft.stopLoss}\` : '',
  draft.takeProfit ? \`TP: \${draft.takeProfit}\` : '',
  draft.feesAndTaxes ? \`Phí & Thuế: \${draft.feesAndTaxes}\` : ''
].filter(Boolean).join('\\n');

const tokenPayload = Buffer.from(JSON.stringify(draft)).toString('base64url');

return [{
  json: {
    ...item,
    draft,
    missing,
    hasMissing: missing.length > 0,
    summary: summaryLines,
    confirmToken: tokenPayload
  }
}];
`;
  }

  // 2. Hide Token completely in HTML using zero-width space hyperlink
  // Telegram supports <a href="tg://btn/TOKEN">&#8203;</a> to store hidden data without it showing as text!
  // Let's modify Telegram Notify Draft State
  const notifyNode = workflow.nodes.find(n => n.name === 'Telegram - Notify Draft State');
  if (notifyNode) {
    notifyNode.parameters.text = "={{ $json.hasMissing ? (\"⚠️ <b>Thiếu thông tin:</b>\\n\\n\" + $json.missing.map(function(f){ return \"• \" + f; }).join(\"\\n\") + \"\\n\\nVui lòng gửi lại (có thể gõ bổ sung bằng text cùng ảnh).\") : (\"✅ <b>Xác nhận lệnh:</b>\\n\\n\" + $json.summary + \"\\n\\n<a href=\\\"tg://btn/\" + $json.confirmToken + \"\\\">&#8203;</a>👇 Bấm nút bên dưới để xác nhận hoặc hủy.\") }}";
  }

  const sendDraftNode = workflow.nodes.find(n => n.name === 'Telegram - Send Draft');
  if (sendDraftNode) {
    sendDraftNode.parameters.text = "={{ '📋 <b>Xác nhận lệnh:</b>\\n\\n' + $json.summary + '\\n\\n<a href=\"tg://btn/' + $json.confirmToken + '\">&#8203;</a>👆 Bấm nút bên dưới để xác nhận hoặc hủy.' }}";
  }

  // Modify `Process Callback` to extract from the invisible link if available!
  const processCallbackNode = workflow.nodes.find(n => n.name === 'Process Callback');
  if (processCallbackNode) {
    processCallbackNode.parameters.jsCode = `
const body = $json.body || $json;
const cb = body.callback_query || body;
const message = cb.message || {};
const text = message.text || message.caption || '';
const entities = message.entities || message.caption_entities || [];

// Extract token from invisible link or explicit spoiler
let token = '';

// Try to find the invisible link tg://btn/TOKEN
const tokenEntity = entities.find(e => e.type === 'text_link' && e.url && e.url.startsWith('tg://btn/'));
if (tokenEntity) {
  token = tokenEntity.url.replace('tg://btn/', '');
} else {
  // Fallback to old regex
  const tokenMatch = text.match(/Token:\\s*([A-Za-z0-9_=-]+)/);
  if (tokenMatch) token = tokenMatch[1];
}

let draft = {};
if (token) {
  try {
    draft = JSON.parse(Buffer.from(token, 'base64url').toString('utf8'));
  } catch(e) {}
}

return [{
  json: {
    action: cb.data,
    draft,
    chatId: message.chat?.id,
    messageId: message.message_id,
    sessionId: String(message.chat?.id || ''),
    _telegram: {
      callbackQueryId: cb.id
    }
  }
}];
`;
  }

  // 3. Add Telegram - Send Success node after Append/Update JOURNAL Row
  const telegramSuccessNodeId = "Telegram - Send Success";
  if (!workflow.nodes.find(n => n.name === telegramSuccessNodeId)) {
    workflow.nodes.push({
      "parameters": {
        "chatId": "={{ $('Build JOURNAL Row').item.json.sessionId }}",
        "text": "={{ '✅ <b>Lệnh đã được ghi vào JOURNAL!</b>\\n\\n📍 Dòng: ' + ($json.updatedRange || $json.updates?.updatedRange || 'Không rõ') + '\\n\\n🔗 <a href=\"https://docs.google.com/spreadsheets/d/1PdCmBoBQsznOx6JXvOlbD-atxQnX9wHRXiM127f109I/edit\">Mở Google Sheet</a>' }}",
        "additionalFields": {
          "appendAttribution": false,
          "parse_mode": "HTML"
        }
      },
      "id": "telegram-send-success-id",
      "name": telegramSuccessNodeId,
      "type": "n8n-nodes-base.telegram",
      "typeVersion": 1.2,
      "position": [1500, 500],
      "credentials": {
        "telegramApi": { "id": "N0UMQ5nY1OcdNBZP", "name": "Dahodo Journal" }
      }
    });

    // Wire Append JOURNAL Row -> Telegram - Send Success
    workflow.connections['Append JOURNAL Row'].main[0].push({ node: telegramSuccessNodeId, type: "main", index: 0 });
    // Wire Update JOURNAL Row -> Telegram - Send Success
    workflow.connections['Update JOURNAL Row'].main[0].push({ node: telegramSuccessNodeId, type: "main", index: 0 });

    // Answer Confirm is still connected to Respond Written and Append ORDERS_PENDING Row.
    // That's fine.
  }

  const updateRes = await fetch(`${BASE}/workflows/${WORKFLOW_ID}`, {
    method: 'PUT',
    headers: { 'X-N8N-API-KEY': API_KEY, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      name: workflow.name,
      nodes: workflow.nodes,
      connections: workflow.connections,
      settings: {}
    })
  });
  console.log('Update res:', await updateRes.text());
}

main().catch(console.error);
