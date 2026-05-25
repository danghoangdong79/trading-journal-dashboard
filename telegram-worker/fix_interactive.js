const API_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM4MjA5OS1kYmVjLTQ3ZDctOGY1Mi04NDdmODgwYzhjZDgiLCJpc3MiOiJuOG4iLCJhdWQiOiJwdWJsaWMtYXBpIiwianRpIjoiMWNiYTUyZTItZWM0OS00MzQxLWIxZjctNDkzYWEzZDY3MWU0IiwiaWF0IjoxNzc2MTUwODcwfQ.R7JDZ62V1gQpI96WWbRF_L1DfrUv6Iz2kjKQ2MpOVOU';
const WORKFLOW_ID = 'iXKZjLQwoc5otveg';
const BASE = 'https://n8n.dahodo.com/api/v1';

async function main() {
  const res = await fetch(`${BASE}/workflows/${WORKFLOW_ID}`, { headers: { 'X-N8N-API-KEY': API_KEY } });
  const workflow = await res.json();
  const parseNode = workflow.nodes.find(n => n.name === 'Parse + Validate Draft');
  const notifyNode = workflow.nodes.find(n => n.name === 'Telegram - Notify Draft State');
  const handleTextCmds = workflow.nodes.find(n => n.name === 'Handle Text Commands');
  const processCallback = workflow.nodes.find(n => n.name === 'Process Callback');

  // 1. UPDATE PARSE NODE
  if (parseNode) {
    parseNode.parameters.jsCode = `
// Try to get item from image path or direct text path
let item;
try { item = $('Merge Vision Text').item.json; } catch(e) {
  try { item = $('Handle Text Commands').item.json; } catch(e2) {
    try { item = $('Normalize Telegram Input').item.json; } catch(e3) {
      try { item = $('Normalize Input').item.json; } catch(e4) { item = $json; }
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
    draft = { ...draft, ...JSON.parse(visionText.substring(start, end)) };
  } catch(e) {}
}

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
  const vn = new Date(Date.now() + 7 * 3600000);
  draft.openDate = vn.getUTCFullYear() + '-' + (vn.getUTCMonth()+1).toString().padStart(2,'0') + '-' + vn.getUTCDate().toString().padStart(2,'0');
}
if (!draft.openTime) {
  const vn = new Date(Date.now() + 7 * 3600000);
  draft.openTime = vn.getUTCHours().toString().padStart(2,'0') + ':' + vn.getUTCMinutes().toString().padStart(2,'0');
}

// Fetch FORMULAS to validate Strategy and OrderType perfectly!
let validStrategies = [];
let validOrderTypes = [];
try {
  const sheetId = $node["Global Config"].json.SHEET_ID;
  const csvUrl = 'https://docs.google.com/spreadsheets/d/' + sheetId + '/gviz/tq?tqx=out:csv&sheet=FORMULAS';
  const csvRes = await this.helpers.httpRequest({ method: 'GET', url: csvUrl });
  if (csvRes && typeof csvRes === 'string') {
    const lines = csvRes.split('\\n');
    if (lines.length > 0) {
      const headers = lines[0].split('","').map(h => h.replace(/"/g, '').trim().toUpperCase());
      let stratIdx = headers.indexOf('CHIẾN LƯỢC'); if (stratIdx === -1) stratIdx = 2;
      let typeIdx = headers.indexOf('LOẠI LỆNH'); if (typeIdx === -1) typeIdx = 4;
      
      for (let i = 1; i < lines.length; i++) {
        const cols = lines[i].split('","');
        if (cols.length > stratIdx) {
          const v = cols[stratIdx].replace(/"/g, '').trim();
          if (v && v !== '#N/A' && !validStrategies.includes(v)) validStrategies.push(v);
        }
        if (cols.length > typeIdx) {
          const v = cols[typeIdx].replace(/"/g, '').trim();
          if (v && v !== '#N/A' && !validOrderTypes.includes(v)) validOrderTypes.push(v);
        }
      }
    }
  }
} catch(e) {}

// Strict validation: if AI extracted something weird like "Lệnh thường / MTL", clear it!
if (draft.strategy && validStrategies.length > 0) {
  const exact = validStrategies.find(s => s.toLowerCase() === draft.strategy.toLowerCase());
  if (exact) draft.strategy = exact; else draft.strategy = '';
}
if (draft.orderType && validOrderTypes.length > 0) {
  // If it's something like "Lệnh thường / MTL", it won't match exactly.
  // We can try a partial match:
  let match = validOrderTypes.find(o => o.toLowerCase() === draft.orderType.toLowerCase());
  if (!match) {
    // Try to see if any valid type is contained inside the raw string
    match = validOrderTypes.find(o => draft.orderType.toLowerCase().includes(o.toLowerCase()));
  }
  if (match) draft.orderType = match; else draft.orderType = '';
}

let missing = [];
if (!draft.action || draft.action === 'unknown') missing.push("Hành động");
if (!draft.symbol) missing.push("Mã GD");
if (!draft.position) missing.push("Vị thế");
if (!draft.assetType) missing.push("Tài sản");
if (!draft.orderType) missing.push("Loại lệnh");
if (!draft.strategy) missing.push("Chiến lược");

const summaryLines = [
  (draft.action === 'open' ? '🟢 MỞ LỆNH' : (draft.action === 'close' ? '🔴 ĐÓNG LỆNH' : (draft.action === 'pending' ? '🟡 LỆNH CHỜ' : '❓ KHÔNG RÕ'))),
  draft.account ? 'TK: ' + draft.account : '',
  draft.symbol ? 'Mã: ' + draft.symbol + ' (' + (draft.assetType||'') + ')' : '',
  draft.position ? 'Vị thế: ' + draft.position : '',
  draft.orderType ? 'Loại lệnh: ' + draft.orderType : '',
  draft.strategy ? 'Chiến lược: ' + draft.strategy : '',
  draft.volume ? 'KL: ' + draft.volume : '',
  draft.entryPrice ? 'Giá vào: ' + draft.entryPrice : '',
  draft.exitPrice ? 'Giá đóng: ' + draft.exitPrice : '',
].filter(Boolean).join('\\n');

const tokenPayload = Buffer.from(JSON.stringify(draft)).toString('base64url');

if (missing.length > 0) {
  const staticData = $getWorkflowStaticData('global');
  const chatId = String(item.chatId || item.sessionId || '');
  if (chatId) {
    staticData['pending_' + chatId] = JSON.stringify({ draft, missing, timestamp: Date.now() });
  }
}

return [{
  json: { ...item, draft, missing, hasMissing: missing.length > 0, summary: summaryLines, confirmToken: tokenPayload }
}];
`;
  }

  // 2. UPDATE NOTIFY NODE (to show buttons for ANY missing field)
  if (notifyNode) {
    notifyNode.parameters.jsCode = `
const item = $json;
const chatId = item.chatId || item.sessionId;
const botToken = $node["Global Config"].json.TELEGRAM_BOT_TOKEN;
const sheetId = $node["Global Config"].json.SHEET_ID;
const hasMissing = item.hasMissing;
const missing = item.missing || [];
const summary = item.summary || '';
const tokenPayload = item.confirmToken || '';

if (hasMissing) {
  let text = "📋 <b>Thông tin đã nhận:</b>\\n\\n" + summary + "\\n\\n⚠️ <b>Cần bổ sung:</b>\\n" + missing.map(f => "• " + f).join("\\n");
  let reply_markup = undefined;
  
  // Xử lý field ĐẦU TIÊN bị thiếu để hiển thị nút
  const firstMissing = missing[0];
  let options = [];
  let prefix = "";
  
  if (firstMissing === "Hành động") {
    options = ["Mở lệnh", "Đóng lệnh", "Lệnh chờ"];
    prefix = "action";
  } else if (firstMissing === "Tài sản") {
    options = ["Cổ phiếu", "Phái sinh"];
    prefix = "asset";
  } else if (firstMissing === "Vị thế") {
    options = ["LONG", "SHORT", "MUA", "BÁN"];
    prefix = "pos";
  } else if (firstMissing === "Chiến lược" || firstMissing === "Loại lệnh") {
    // Tải từ FORMULAS
    try {
      const csvUrl = 'https://docs.google.com/spreadsheets/d/' + sheetId + '/gviz/tq?tqx=out:csv&sheet=FORMULAS';
      const csvRes = await this.helpers.httpRequest({ method: 'GET', url: csvUrl });
      if (csvRes && typeof csvRes === 'string') {
        const lines = csvRes.split('\\n');
        if (lines.length > 0) {
          const headers = lines[0].split('","').map(h => h.replace(/"/g, '').trim().toUpperCase());
          let idx = headers.indexOf(firstMissing === "Chiến lược" ? 'CHIẾN LƯỢC' : 'LOẠI LỆNH');
          if (idx === -1) idx = (firstMissing === "Chiến lược") ? 2 : 4;
          
          for (let i = 1; i < lines.length; i++) {
            const cols = lines[i].split('","');
            if (cols.length > idx) {
              const val = cols[idx].replace(/"/g, '').trim();
              if (val && val !== '#N/A' && !options.includes(val)) options.push(val);
            }
          }
        }
      }
    } catch(e) {}
    prefix = firstMissing === "Chiến lược" ? "strat" : "type";
  }

  if (options.length > 0) {
    text += "\\n\\n👇 Chọn " + firstMissing.toLowerCase() + " hoặc gõ phím để nhập mới:";
    const keyboard = [];
    for (let i = 0; i < options.length; i += 2) {
      const row = [];
      row.push({ text: options[i], callback_data: "fill_" + prefix + ":" + options[i] });
      if (i + 1 < options.length) {
        row.push({ text: options[i + 1], callback_data: "fill_" + prefix + ":" + options[i + 1] });
      }
      keyboard.push(row);
    }
    reply_markup = { inline_keyboard: keyboard };
  } else {
    text += "\\n\\n👇 Gõ text để nhập " + firstMissing.toLowerCase() + ".";
  }
  
  await this.helpers.httpRequest({
    method: 'POST', url: 'https://api.telegram.org/bot' + botToken + '/sendMessage',
    body: { chat_id: chatId, text, parse_mode: 'HTML', reply_markup },
    headers: { 'Content-Type': 'application/json' }
  });
} else {
  const text = "✅ <b>Xác nhận lệnh:</b>\\n\\n" + summary + '\\n\\n<a href="tg://btn/' + tokenPayload + '">\\u200b</a>👇 Bấm nút bên dưới để xác nhận hoặc hủy.';
  await this.helpers.httpRequest({
    method: 'POST', url: 'https://api.telegram.org/bot' + botToken + '/sendMessage',
    body: {
      chat_id: chatId, text, parse_mode: 'HTML',
      reply_markup: { inline_keyboard: [[{ text: '✅ Xác nhận', callback_data: 'confirm' }, { text: '❌ Hủy', callback_data: 'cancel' }]] }
    },
    headers: { 'Content-Type': 'application/json' }
  });
}
return [{ json: item }];
`;
  }

  // 3. UPDATE HANDLE TEXT COMMANDS (to handle sequentially missing fields via text)
  if (handleTextCmds) {
    handleTextCmds.parameters.jsCode = handleTextCmds.parameters.jsCode.replace(
        /if \(pending\.missing\.includes\("Chiến lược"\)[\s\S]+?delete staticData\[pendingKey\];/m,
        `
        const firstMissing = pending.missing[0];
        if (firstMissing === "Chiến lược") draft.strategy = text;
        else if (firstMissing === "Loại lệnh") draft.orderType = text;
        else if (firstMissing === "Mã GD") draft.symbol = text.toUpperCase();
        else if (firstMissing === "Vị thế") draft.position = text.toUpperCase();
        else if (firstMissing === "Tài sản") {
          const at = text.toLowerCase();
          if (at.includes('phái') || at.includes('phai')) draft.assetType = 'Phái sinh';
          else draft.assetType = 'Cổ phiếu';
        }
        else if (firstMissing === "Hành động") {
          const ac = text.toLowerCase();
          if (ac.includes('đóng') || ac.includes('close')) draft.action = 'close';
          else if (ac.includes('chờ') || ac.includes('pending')) draft.action = 'pending';
          else draft.action = 'open';
        }
        delete staticData[pendingKey];
        `
    );
  }

  // 4. UPDATE PROCESS CALLBACK (to handle multiple fill_ prefixes and routing back to Parse + Validate Draft logic!)
  // Wait! If Process Callback returns the filled data, we need it to go through "Parse + Validate Draft" again 
  // so it correctly generates the `summary` and `token` and re-checks missing.
  // BUT Process Callback goes to `Build JOURNAL Row`. 
  // Oh! If the user clicks a `fill_` button, it should trigger the same logic as if they typed text!
  // Instead of duplicating `missing` checks in Process Callback, we should wire Process Callback to go back to Parse + Validate Draft!
  // Wait, if we wire it back, we'd have a loop.
  // Actually, let's just duplicate the missing check inside Process Callback to keep it simple and safe.
  
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

let token = '';
const tokenEntity = entities.find(e => e.type === 'text_link' && e.url && e.url.startsWith('tg://btn/'));
if (tokenEntity) token = tokenEntity.url.replace('tg://btn/', '');

let draft = {};
if (token) {
  try { draft = JSON.parse(Buffer.from(token, 'base64url').toString('utf8')); } catch(e) {}
}

if (callbackData.startsWith('fill_')) {
  const parts = callbackData.split(':');
  const prefix = parts[0];
  const value = parts.slice(1).join(':');
  
  const staticData = $getWorkflowStaticData('global');
  const pendingKey = 'pending_' + chatId;
  const pendingRaw = staticData[pendingKey];
  if (pendingRaw && Object.keys(draft).length === 0) {
    try { draft = JSON.parse(pendingRaw).draft; } catch(e) {}
  }
  
  if (prefix === 'fill_strat') draft.strategy = value;
  else if (prefix === 'fill_type') draft.orderType = value;
  else if (prefix === 'fill_pos') draft.position = value;
  else if (prefix === 'fill_asset') draft.assetType = value;
  else if (prefix === 'fill_action') {
    if (value === 'Mở lệnh') draft.action = 'open';
    else if (value === 'Đóng lệnh') draft.action = 'close';
    else if (value === 'Lệnh chờ') draft.action = 'pending';
  }
  
  delete staticData[pendingKey];
  
  // Re-validate
  let missing = [];
  if (!draft.action || draft.action === 'unknown') missing.push("Hành động");
  if (!draft.symbol) missing.push("Mã GD");
  if (!draft.position) missing.push("Vị thế");
  if (!draft.assetType) missing.push("Tài sản");
  if (!draft.orderType) missing.push("Loại lệnh");
  if (!draft.strategy) missing.push("Chiến lược");
  
  // Rebuild Summary
  const summaryLines = [
    (draft.action === 'open' ? '🟢 MỞ LỆNH' : (draft.action === 'close' ? '🔴 ĐÓNG LỆNH' : (draft.action === 'pending' ? '🟡 LỆNH CHỜ' : '❓ KHÔNG RÕ'))),
    draft.account ? 'TK: ' + draft.account : '',
    draft.symbol ? 'Mã: ' + draft.symbol + ' (' + (draft.assetType||'') + ')' : '',
    draft.position ? 'Vị thế: ' + draft.position : '',
    draft.orderType ? 'Loại lệnh: ' + draft.orderType : '',
    draft.strategy ? 'Chiến lược: ' + draft.strategy : '',
    draft.volume ? 'KL: ' + draft.volume : '',
    draft.entryPrice ? 'Giá vào: ' + draft.entryPrice : '',
  ].filter(Boolean).join('\\n');
  
  const newToken = Buffer.from(JSON.stringify(draft)).toString('base64url');
  
  // Answer callback instantly
  await this.helpers.httpRequest({
    method: 'POST', url: 'https://api.telegram.org/bot' + botToken + '/answerCallbackQuery',
    body: { callback_query_id: cb.id, text: '✅ Đã chọn: ' + value },
    headers: { 'Content-Type': 'application/json' }
  });
  
  // Check if still missing
  if (missing.length > 0) {
    // Put back to pending
    staticData[pendingKey] = JSON.stringify({ draft, missing, timestamp: Date.now() });
    
    // We can't generate dynamic buttons here easily without fetching FORMULAS again.
    // Let's just ask them to type it, or they can trigger the full flow.
    // Actually, we can just send the text prompt:
    const msg = "📋 <b>Thông tin đã nhận:</b>\\n\\n" + summaryLines + "\\n\\n⚠️ <b>Vẫn thiếu:</b>\\n" + missing.map(f => "• " + f).join("\\n") + "\\n\\n👇 Vui lòng gõ text để bổ sung " + missing[0].toLowerCase() + ".";
    await this.helpers.httpRequest({
      method: 'POST', url: 'https://api.telegram.org/bot' + botToken + '/sendMessage',
      body: { chat_id: chatId, text: msg, parse_mode: 'HTML' },
      headers: { 'Content-Type': 'application/json' }
    });
    return [];
  }
  
  // All complete! Send confirmation
  const confirmMsg = '✅ <b>Xác nhận lệnh:</b>\\n\\n' + summaryLines + '\\n\\n<a href="tg://btn/' + newToken + '">\\u200b</a>👇 Bấm xác nhận hoặc hủy.';
  await this.helpers.httpRequest({
    method: 'POST', url: 'https://api.telegram.org/bot' + botToken + '/sendMessage',
    body: {
      chat_id: chatId, text: confirmMsg, parse_mode: 'HTML',
      reply_markup: { inline_keyboard: [[{ text: '✅ Xác nhận', callback_data: 'confirm' }, { text: '❌ Hủy', callback_data: 'cancel' }]] }
    },
    headers: { 'Content-Type': 'application/json' }
  });
  
  return [];
}

return [{
  json: {
    action: callbackData, draft, chatId, messageId: message.message_id,
    sessionId: String(chatId || ''), _telegram: { callbackQueryId: cb.id }
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
