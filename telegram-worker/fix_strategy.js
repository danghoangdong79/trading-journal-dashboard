/**
 * FIX: Strategy selection + text reply support + Parse crash
 * 
 * Problems:
 * 1. Parse + Validate Draft crashes on text-only input (references Merge Vision Text which hasn't run)
 * 2. User can't reply with text to fill missing fields (no session memory)
 * 3. No strategy quick-select buttons
 * 
 * Solutions:
 * 1. Fix Parse + Validate Draft to gracefully handle text-only
 * 2. Use n8n static data ($getWorkflowStaticData) to store pending drafts per chatId
 * 3. Handle Text Commands: check static data for pending draft, merge text reply
 * 4. Telegram - Notify Draft State: when missing strategy, show inline buttons
 * 5. Process Callback: handle fill_strategy:xxx callbacks
 */

const API_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM4MjA5OS1kYmVjLTQ3ZDctOGY1Mi04NDdmODgwYzhjZDgiLCJpc3MiOiJuOG4iLCJhdWQiOiJwdWJsaWMtYXBpIiwianRpIjoiMWNiYTUyZTItZWM0OS00MzQxLWIxZjctNDkzYWEzZDY3MWU0IiwiaWF0IjoxNzc2MTUwODcwfQ.R7JDZ62V1gQpI96WWbRF_L1DfrUv6Iz2kjKQ2MpOVOU';
const WORKFLOW_ID = 'iXKZjLQwoc5otveg';
const BASE = 'https://n8n.dahodo.com/api/v1';

async function main() {
  const res = await fetch(`${BASE}/workflows/${WORKFLOW_ID}`, { headers: { 'X-N8N-API-KEY': API_KEY } });
  const workflow = await res.json();
  const findNode = name => workflow.nodes.find(n => n.name === name);

  // ─────────────────────────────────────────
  // FIX 1: Parse + Validate Draft — handle text-only input (no Merge Vision Text)
  // ─────────────────────────────────────────
  const parseNode = findNode('Parse + Validate Draft');
  if (parseNode) {
    parseNode.parameters.jsCode = `
// Try to get item from image path or direct text path
let item;
try {
  item = $('Merge Vision Text').item.json;
} catch(e) {
  // No image was sent — get from text path
  try { item = $('Handle Text Commands').item.json; } catch(e2) {
    try { item = $('Normalize Telegram Input').item.json; } catch(e3) {
      try { item = $('Normalize Input').item.json; } catch(e4) {
        item = $json;
      }
    }
  }
}

let text = item.text || '';
const visionText = item.visionText || '';

let draft = {
  action: 'unknown', account: '', orderId: '', assetType: '', symbol: '',
  position: '', orderType: '', strategy: '', openDate: '', openTime: '',
  closeDate: '', closeTime: '', volume: '', entryPrice: '', exitPrice: '',
  stopLoss: '', takeProfit: '', feesAndTaxes: '', mood: '', reviewNote: ''
};

if (visionText && visionText.includes('{')) {
  try {
    const start = visionText.indexOf('{');
    const end = visionText.lastIndexOf('}') + 1;
    const parsed = JSON.parse(visionText.substring(start, end));
    draft = { ...draft, ...parsed };
  } catch(e) {}
}

// Normalize dropdowns
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
  draft.openDate = vn.getUTCDate().toString().padStart(2,'0') + '/' + (vn.getUTCMonth()+1).toString().padStart(2,'0') + '/' + vn.getUTCFullYear();
}
if (!draft.openTime) {
  const now = new Date();
  const vn = new Date(now.getTime() + 7 * 60 * 60 * 1000);
  draft.openTime = vn.getUTCHours().toString().padStart(2,'0') + ':' + vn.getUTCMinutes().toString().padStart(2,'0');
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
  draft.account ? 'Tài khoản: ' + draft.account : '',
  draft.orderId ? 'Số lệnh: ' + draft.orderId : '',
  draft.assetType ? 'Tài sản: ' + draft.assetType : '',
  draft.symbol ? 'Mã GD: ' + draft.symbol : '',
  draft.position ? 'Vị thế: ' + draft.position : '',
  draft.strategy ? 'Chiến lược: ' + draft.strategy : '',
  draft.volume ? 'Khối lượng: ' + draft.volume : '',
  draft.entryPrice ? 'Giá vào: ' + draft.entryPrice : '',
  draft.exitPrice ? 'Giá đóng: ' + draft.exitPrice : '',
  draft.stopLoss ? 'SL: ' + draft.stopLoss : '',
  draft.takeProfit ? 'TP: ' + draft.takeProfit : '',
  draft.feesAndTaxes ? 'Phí & Thuế: ' + draft.feesAndTaxes : ''
].filter(Boolean).join('\\n');

const tokenPayload = Buffer.from(JSON.stringify(draft)).toString('base64url');

// Store draft in static data if missing fields, so user can reply with text later
if (missing.length > 0) {
  const staticData = $getWorkflowStaticData('global');
  const chatId = String(item.chatId || item.sessionId || '');
  if (chatId) {
    staticData['pending_' + chatId] = JSON.stringify({ draft, missing, timestamp: Date.now() });
  }
}

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

  // ─────────────────────────────────────────
  // FIX 2: Handle Text Commands — check for pending draft when user replies with text
  // ─────────────────────────────────────────
  const handleTextCmds = findNode('Handle Text Commands');
  if (handleTextCmds) {
    handleTextCmds.parameters.jsCode = `
const item = $json;
const text = (item.text || '').trim();
const textLower = text.toLowerCase();
const chatId = String(item.chatId || item.sessionId || '');
const botToken = $node["Global Config"].json.TELEGRAM_BOT_TOKEN;

// ── /help or /start ──
if (textLower === '/help' || textLower === '/start') {
  const helpMsg = [
    '📖 <b>Dahodo Journal Bot</b>',
    '',
    '📸 <b>Ghi lệnh bằng ảnh:</b>',
    'Gửi ảnh chụp màn hình lệnh từ sàn.',
    'Bot dùng AI phân tích tự động.',
    '',
    '🔍 <b>Tra cứu:</b>',
    '<code>/tracuu [mã CK]</code>',
    '→ VD: <code>/tracuu VN30F2506</code>',
    '',
    '⚙️ <b>Quy trình:</b>',
    '1. Gửi ảnh → Bot phân tích',
    '2. Chọn chiến lược (nếu thiếu)',
    '3. Bấm ✅ Xác nhận → Ghi vào Sheet',
    '',
    '📌 Lệnh Chờ khớp → ORDERS_PENDING',
    '📌 Lệnh Đã khớp → JOURNAL',
    '📌 Đóng vị thế → cập nhật JOURNAL',
  ].join('\\n');
  await this.helpers.httpRequest({
    method: 'POST', url: 'https://api.telegram.org/bot' + botToken + '/sendMessage',
    body: { chat_id: chatId, text: helpMsg, parse_mode: 'HTML' },
    headers: { 'Content-Type': 'application/json' }
  });
  return [];
}

// ── /tracuu ──
if (textLower.startsWith('/tracuu') || textLower.startsWith('/lookup')) {
  const keyword = text.replace(/^\\/\\w+\\s*/, '').trim().toUpperCase();
  if (!keyword) {
    await this.helpers.httpRequest({
      method: 'POST', url: 'https://api.telegram.org/bot' + botToken + '/sendMessage',
      body: { chat_id: chatId, text: '⚠️ Nhập mã CK. VD: <code>/tracuu VN30F2506</code>', parse_mode: 'HTML' },
      headers: { 'Content-Type': 'application/json' }
    });
    return [];
  }
  try {
    const sheetId = $node["Global Config"].json.SHEET_ID;
    const apiRes = await this.helpers.httpRequest({
      method: 'GET', url: 'https://journal-api.dahodo.com/api/trades?sheetId=' + sheetId
    });
    const matches = (apiRes.trades || []).filter(t => {
      const sym = (t.symbol || '').toUpperCase();
      const oid = (t.orderId || '').toUpperCase();
      return sym.includes(keyword) || oid.includes(keyword);
    }).slice(-5);
    let msg;
    if (!matches.length) {
      msg = '❌ Không tìm thấy lệnh <b>' + keyword + '</b>.';
    } else {
      const lines = matches.map(t => {
        const e = t.status === 'Thắng' ? '🟢' : t.status === 'Thua' ? '🔴' : t.status === 'Hòa' ? '🟡' : '⚪';
        return e + ' <b>' + (t.symbol||'') + '</b> ' + (t.position||'') +
          '\\n   KL: ' + (t.volume||'') + ' | Vào: ' + (t.entryPrice||'') + (t.exitPrice ? ' → Ra: '+t.exitPrice : '') +
          '\\n   ' + (t.openDate||'') + (t.closeDate ? ' → '+t.closeDate : ' (đang mở)');
      });
      msg = '📋 <b>' + keyword + '</b> (' + matches.length + ' lệnh)\\n\\n' + lines.join('\\n\\n');
    }
    await this.helpers.httpRequest({
      method: 'POST', url: 'https://api.telegram.org/bot' + botToken + '/sendMessage',
      body: { chat_id: chatId, text: msg, parse_mode: 'HTML' },
      headers: { 'Content-Type': 'application/json' }
    });
  } catch(e) {
    await this.helpers.httpRequest({
      method: 'POST', url: 'https://api.telegram.org/bot' + botToken + '/sendMessage',
      body: { chat_id: chatId, text: '❌ Lỗi: ' + e.message, parse_mode: 'HTML' },
      headers: { 'Content-Type': 'application/json' }
    });
  }
  return [];
}

// ── Check if this is a text reply to fill missing fields ──
if (chatId && text && !text.startsWith('/')) {
  const staticData = $getWorkflowStaticData('global');
  const pendingKey = 'pending_' + chatId;
  const pendingRaw = staticData[pendingKey];
  
  if (pendingRaw) {
    try {
      const pending = JSON.parse(pendingRaw);
      const draft = pending.draft;
      const age = Date.now() - (pending.timestamp || 0);
      
      // Only use if less than 10 minutes old
      if (age < 600000) {
        // Fill in the first missing field with the user's text
        if (pending.missing.includes("Chiến lược") && !draft.strategy) {
          draft.strategy = text;
        } else if (pending.missing.includes("Mã GD") && !draft.symbol) {
          draft.symbol = text.toUpperCase();
        } else if (pending.missing.includes("Vị thế (LONG/SHORT)") && !draft.position) {
          draft.position = text.toUpperCase();
        } else if (pending.missing.includes("Tài sản (Phái sinh/Cổ phiếu)") && !draft.assetType) {
          const at = text.toLowerCase();
          if (at.includes('phái') || at.includes('phai')) draft.assetType = 'Phái sinh';
          else draft.assetType = 'Cổ phiếu';
        }
        
        // Clear pending data
        delete staticData[pendingKey];
        
        // Re-validate
        let missing = [];
        if (!draft.action || draft.action === 'unknown') missing.push("Hành động (Mở lệnh / Đóng lệnh)");
        if (!draft.symbol) missing.push("Mã GD");
        if (!draft.position) missing.push("Vị thế (LONG/SHORT)");
        if (!draft.assetType) missing.push("Tài sản (Phái sinh/Cổ phiếu)");
        if (!draft.strategy) missing.push("Chiến lược");
        
        const summaryLines = [
          (draft.action === 'open' ? '🟢 MỞ LỆNH' : (draft.action === 'close' ? '🔴 ĐÓNG LỆNH' : (draft.action === 'pending' ? '🟡 LỆNH CHỜ' : '❓ CHƯA RÕ'))),
          draft.account ? 'Tài khoản: ' + draft.account : '',
          draft.orderId ? 'Số lệnh: ' + draft.orderId : '',
          draft.assetType ? 'Tài sản: ' + draft.assetType : '',
          draft.symbol ? 'Mã GD: ' + draft.symbol : '',
          draft.position ? 'Vị thế: ' + draft.position : '',
          draft.strategy ? 'Chiến lược: ' + draft.strategy : '',
          draft.volume ? 'Khối lượng: ' + draft.volume : '',
          draft.entryPrice ? 'Giá vào: ' + draft.entryPrice : '',
        ].filter(Boolean).join('\\n');
        
        const tokenPayload = Buffer.from(JSON.stringify(draft)).toString('base64url');
        
        if (missing.length > 0) {
          // Still missing → save again and notify
          staticData[pendingKey] = JSON.stringify({ draft, missing, timestamp: Date.now() });
          await this.helpers.httpRequest({
            method: 'POST', url: 'https://api.telegram.org/bot' + botToken + '/sendMessage',
            body: { chat_id: chatId, text: '⚠️ <b>Vẫn thiếu:</b>\\n' + missing.map(f => '• ' + f).join('\\n'), parse_mode: 'HTML' },
            headers: { 'Content-Type': 'application/json' }
          });
          return [];
        }
        
        // All fields complete! Send confirmation with buttons
        const confirmMsg = '✅ <b>Xác nhận lệnh:</b>\\n\\n' + summaryLines + '\\n\\n<a href="tg://btn/' + tokenPayload + '">\\u200b</a>👇 Bấm nút bên dưới để xác nhận hoặc hủy.';
        await this.helpers.httpRequest({
          method: 'POST', url: 'https://api.telegram.org/bot' + botToken + '/sendMessage',
          body: {
            chat_id: chatId,
            text: confirmMsg,
            parse_mode: 'HTML',
            reply_markup: {
              inline_keyboard: [
                [{ text: '✅ Xác nhận', callback_data: 'confirm' }, { text: '❌ Hủy', callback_data: 'cancel' }]
              ]
            }
          },
          headers: { 'Content-Type': 'application/json' }
        });
        return [];
      } else {
        // Expired, clean up
        delete staticData[pendingKey];
      }
    } catch(e) {
      // Bad data, clean up
      const staticData2 = $getWorkflowStaticData('global');
      delete staticData2['pending_' + chatId];
    }
  }
}

// Not a command and no pending draft — pass through
return [{ json: item }];
`;
  }

  // ─────────────────────────────────────────
  // FIX 3: Telegram - Notify Draft State — show strategy buttons when strategy is missing
  // Replace the fixed node with a Code node that sends Telegram API directly
  // ─────────────────────────────────────────
  const notifyNode = findNode('Telegram - Notify Draft State');
  if (notifyNode) {
    // Convert to Code node for dynamic inline keyboard
    notifyNode.type = "n8n-nodes-base.code";
    notifyNode.typeVersion = 2;
    delete notifyNode.credentials;
    delete notifyNode.webhookId;
    notifyNode.parameters = {
      jsCode: `
const item = $json;
const chatId = item.chatId || item.sessionId;
const botToken = $node["Global Config"].json.TELEGRAM_BOT_TOKEN;
const hasMissing = item.hasMissing;
const missing = item.missing || [];
const summary = item.summary || '';
const tokenPayload = item.confirmToken || '';

if (hasMissing) {
  // Check if only strategy is missing
  const onlyStrategyMissing = missing.length === 1 && missing[0] === "Chiến lược";
  const strategyMissing = missing.includes("Chiến lược");
  
  let text = "⚠️ <b>Thiếu thông tin:</b>\\n\\n" + missing.map(f => "• " + f).join("\\n");
  
  let reply_markup = undefined;
  
  if (strategyMissing) {
    // Show strategy quick-select buttons
    text += "\\n\\n📋 Chọn chiến lược hoặc gõ text để nhập mới:";
    reply_markup = {
      inline_keyboard: [
        [
          { text: "📊 Statergy 1", callback_data: "fill_strategy:Statergy 1" },
          { text: "📊 Statergy 2", callback_data: "fill_strategy:Statergy 2" }
        ],
        [
          { text: "📊 Statergy 3", callback_data: "fill_strategy:Statergy 3" },
          { text: "📊 Statergy 4", callback_data: "fill_strategy:Statergy 4" }
        ]
      ]
    };
  } else {
    text += "\\n\\nVui lòng gửi lại đầy đủ thông tin.";
  }
  
  await this.helpers.httpRequest({
    method: 'POST',
    url: 'https://api.telegram.org/bot' + botToken + '/sendMessage',
    body: { chat_id: chatId, text, parse_mode: 'HTML', reply_markup },
    headers: { 'Content-Type': 'application/json' }
  });
} else {
  // Complete — show confirmation
  const text = "✅ <b>Xác nhận lệnh:</b>\\n\\n" + summary + '\\n\\n<a href="tg://btn/' + tokenPayload + '">\\u200b</a>👇 Bấm nút bên dưới để xác nhận hoặc hủy.';
  
  await this.helpers.httpRequest({
    method: 'POST',
    url: 'https://api.telegram.org/bot' + botToken + '/sendMessage',
    body: {
      chat_id: chatId,
      text,
      parse_mode: 'HTML',
      reply_markup: {
        inline_keyboard: [
          [{ text: '✅ Xác nhận', callback_data: 'confirm' }, { text: '❌ Hủy', callback_data: 'cancel' }]
        ]
      }
    },
    headers: { 'Content-Type': 'application/json' }
  });
}

return [{ json: item }];
`
    };
  }

  // ─────────────────────────────────────────
  // FIX 4: Process Callback — handle fill_strategy: callbacks
  // ─────────────────────────────────────────
  const processCallback = findNode('Process Callback');
  if (processCallback) {
    processCallback.parameters.jsCode = `
const body = $json.body || $json;
const cb = body.callback_query || body;
const message = cb.message || {};
const callbackData = cb.data || '';
const text = message.text || message.caption || '';
const entities = message.entities || message.caption_entities || [];
const chatId = message.chat?.id;
const botToken = $node["Global Config"].json.TELEGRAM_BOT_TOKEN;

// Extract token from invisible link
let token = '';
const tokenEntity = entities.find(e => e.type === 'text_link' && e.url && e.url.startsWith('tg://btn/'));
if (tokenEntity) {
  token = tokenEntity.url.replace('tg://btn/', '');
} else {
  const tokenMatch = text.match(/Token:\\s*([A-Za-z0-9_=-]+)/);
  if (tokenMatch) token = tokenMatch[1];
}

let draft = {};
if (token) {
  try { draft = JSON.parse(Buffer.from(token, 'base64url').toString('utf8')); } catch(e) {}
}

// ── Handle fill_strategy: callback ──
if (callbackData.startsWith('fill_strategy:')) {
  const strategy = callbackData.replace('fill_strategy:', '');
  
  // Also try to recover draft from static data
  const staticData = $getWorkflowStaticData('global');
  const pendingKey = 'pending_' + chatId;
  const pendingRaw = staticData[pendingKey];
  if (pendingRaw && Object.keys(draft).length === 0) {
    try { draft = JSON.parse(pendingRaw).draft; } catch(e) {}
  }
  
  draft.strategy = strategy;
  delete staticData[pendingKey]; // Clear pending
  
  // Re-validate
  let missing = [];
  if (!draft.action || draft.action === 'unknown') missing.push("Hành động");
  if (!draft.symbol) missing.push("Mã GD");
  if (!draft.position) missing.push("Vị thế");
  if (!draft.assetType) missing.push("Tài sản");
  
  if (missing.length > 0) {
    // Still missing other fields
    await this.helpers.httpRequest({
      method: 'POST', url: 'https://api.telegram.org/bot' + botToken + '/sendMessage',
      body: { chat_id: chatId, text: '⚠️ Vẫn thiếu: ' + missing.join(', '), parse_mode: 'HTML' },
      headers: { 'Content-Type': 'application/json' }
    });
    // Answer callback
    await this.helpers.httpRequest({
      method: 'POST', url: 'https://api.telegram.org/bot' + botToken + '/answerCallbackQuery',
      body: { callback_query_id: cb.id, text: 'Đã chọn: ' + strategy },
      headers: { 'Content-Type': 'application/json' }
    });
    return [];
  }
  
  // All complete! Send confirmation
  const summaryLines = [
    (draft.action === 'open' ? '🟢 MỞ LỆNH' : (draft.action === 'close' ? '🔴 ĐÓNG LỆNH' : (draft.action === 'pending' ? '🟡 LỆNH CHỜ' : '❓'))),
    draft.account ? 'TK: ' + draft.account : '',
    draft.symbol ? 'Mã: ' + draft.symbol + ' (' + (draft.assetType||'') + ')' : '',
    draft.position ? 'Vị thế: ' + draft.position : '',
    'Chiến lược: ' + draft.strategy,
    draft.volume ? 'KL: ' + draft.volume : '',
    draft.entryPrice ? 'Giá vào: ' + draft.entryPrice : '',
  ].filter(Boolean).join('\\n');
  
  const newToken = Buffer.from(JSON.stringify(draft)).toString('base64url');
  const confirmMsg = '✅ <b>Xác nhận lệnh:</b>\\n\\n' + summaryLines + '\\n\\n<a href="tg://btn/' + newToken + '">\\u200b</a>👇 Bấm xác nhận hoặc hủy.';
  
  await this.helpers.httpRequest({
    method: 'POST', url: 'https://api.telegram.org/bot' + botToken + '/sendMessage',
    body: {
      chat_id: chatId, text: confirmMsg, parse_mode: 'HTML',
      reply_markup: { inline_keyboard: [[{ text: '✅ Xác nhận', callback_data: 'confirm' }, { text: '❌ Hủy', callback_data: 'cancel' }]] }
    },
    headers: { 'Content-Type': 'application/json' }
  });
  
  // Answer callback button
  await this.helpers.httpRequest({
    method: 'POST', url: 'https://api.telegram.org/bot' + botToken + '/answerCallbackQuery',
    body: { callback_query_id: cb.id, text: '✅ Chiến lược: ' + strategy },
    headers: { 'Content-Type': 'application/json' }
  });
  
  return []; // Stop — new confirmation message was sent with updated token
}

// ── Normal confirm/cancel callback ──
return [{
  json: {
    action: callbackData,
    draft,
    chatId,
    messageId: message.message_id,
    sessionId: String(chatId || ''),
    _telegram: { callbackQueryId: cb.id }
  }
}];
`;
  }

  // ─────────────────────────────────────────
  // PUSH
  // ─────────────────────────────────────────
  const updateRes = await fetch(`${BASE}/workflows/${WORKFLOW_ID}`, {
    method: 'PUT',
    headers: { 'X-N8N-API-KEY': API_KEY, 'Content-Type': 'application/json' },
    body: JSON.stringify({ name: workflow.name, nodes: workflow.nodes, connections: workflow.connections, settings: {} })
  });
  const result = await updateRes.json();
  console.log(updateRes.ok ? '✅ SUCCESS — ' + result.nodes?.length + ' nodes' : '❌ FAILED: ' + JSON.stringify(result));
}

main().catch(e => console.error('FATAL:', e));
