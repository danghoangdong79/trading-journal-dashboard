const API_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM4MjA5OS1kYmVjLTQ3ZDctOGY1Mi04NDdmODgwYzhjZDgiLCJpc3MiOiJuOG4iLCJhdWQiOiJwdWJsaWMtYXBpIiwianRpIjoiMWNiYTUyZTItZWM0OS00MzQxLWIxZjctNDkzYWEzZDY3MWU0IiwiaWF0IjoxNzc2MTUwODcwfQ.R7JDZ62V1gQpI96WWbRF_L1DfrUv6Iz2kjKQ2MpOVOU';
const WORKFLOW_ID = 'iXKZjLQwoc5otveg';
const BASE = 'https://n8n.dahodo.com/api/v1';

async function main() {
  const res = await fetch(`${BASE}/workflows/${WORKFLOW_ID}`, { headers: { 'X-N8N-API-KEY': API_KEY } });
  const workflow = await res.json();
  const processCallbackNode = workflow.nodes.find(n => n.name === 'Process Callback');

  if (processCallbackNode) {
    processCallbackNode.parameters.jsCode = `
const body = $json.body || $json;
const cb = body.callback_query || body;
const message = cb.message || {};
const callbackData = cb.data || '';
const text = message.text || message.caption || '';
const entities = message.entities || message.caption_entities || [];
const chatId = message.chat?.id;
const botToken = $('Global Config').first().json.TELEGRAM_BOT_TOKEN;

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
  
  // Try to find the matching pending draft by checking if it matches our token
  let foundPendingKey = null;
  for (let i = 0; i < 10; i++) {
    const key = 'pending_' + chatId + (i === 0 ? '' : '_' + i);
    const raw = staticData[key];
    if (raw) {
       try {
         const pendingObj = JSON.parse(raw);
         // if we have an empty draft, just use the first pending we find
         if (Object.keys(draft).length === 0) {
            draft = pendingObj.draft;
            foundPendingKey = key;
            break;
         } else if (pendingObj.draft.orderId === draft.orderId && pendingObj.draft.symbol === draft.symbol) {
            draft = pendingObj.draft;
            foundPendingKey = key;
            break;
         }
       } catch(e) {}
    }
  }

  if (foundPendingKey && Object.keys(draft).length === 0) {
    try { draft = JSON.parse(staticData[foundPendingKey]).draft; } catch(e) {}
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
  else if (prefix === 'fill_mood') draft.mood = value;
  
  if (foundPendingKey) delete staticData[foundPendingKey];
  
  // Re-validate exactly matching Parse node
  let missing = [];
  if (!draft.action || draft.action === 'unknown') missing.push("Hành động (Mở lệnh / Đóng lệnh)");
  if (!draft.symbol) missing.push("Mã GD");
  if (!draft.position) missing.push("Vị thế (LONG/SHORT)");
  if (!draft.assetType) missing.push("Tài sản (Phái sinh/Cổ phiếu)");
  if (!draft.strategy && draft.action === 'open') missing.push("Chiến lược");
  if (!draft.mood) missing.push("Tâm lý");
  if (draft.feesAndTaxes === undefined || draft.feesAndTaxes === null || draft.feesAndTaxes === '') missing.push("Thuế phí");
  if (!draft.reviewNote) missing.push("Ghi chú");
  
  // Rebuild Summary
  const summaryLines = [
    (draft.action === 'open' ? '🟢 MỞ LỆNH' : (draft.action === 'close' ? '🔴 ĐÓNG LỆNH' : (draft.action === 'pending' ? '🟡 LỆNH CHỜ' : '❓ CHƯA RÕ'))),
    draft.account ? 'TK: ' + draft.account : '',
    draft.symbol ? 'Mã: ' + draft.symbol + ' (' + (draft.assetType||'') + ')' : '',
    draft.position ? 'Vị thế: ' + draft.position : '',
    draft.orderType ? 'Loại lệnh: ' + draft.orderType : '',
    draft.strategy ? 'Chiến lược: ' + draft.strategy : '',
    draft.volume ? 'KL: ' + draft.volume : '',
    draft.entryPrice ? 'Giá vào: ' + draft.entryPrice : '',
    (draft.feesAndTaxes !== undefined && draft.feesAndTaxes !== null && draft.feesAndTaxes !== '') ? 'Thuế phí: ' + draft.feesAndTaxes : '',
    draft.mood ? 'Tâm lý: ' + draft.mood : '',
    draft.reviewNote ? 'Ghi chú: ' + draft.reviewNote : '',
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
    if (foundPendingKey) staticData[foundPendingKey] = JSON.stringify({ draft, missing, timestamp: Date.now() });
    
    // We must pass this to "Telegram - Notify Draft State" instead of trying to render it here,
    // so it shows buttons or proper UX. But Process Callback returns directly to Telegram response sometimes.
    // Wait, the workflow structure in n8n routes Process Callback directly into "Answer Confirm" or "Answer Cancel" for confirm/cancel,
    // BUT for fill_ it edits the message inline.
    // I will edit the message inline mimicking Notify Draft State.
    
    let msgText = "📋 <b>Thông tin đã nhận:</b>\\n\\n" + summaryLines;
    const firstMissing = missing[0];
    msgText += "\\n\\n⚠️ <b>Cần bổ sung (Còn " + missing.length + " mục):</b>\\n" + missing.map(f => (f === firstMissing ? "👉 <b>" + f + "</b> (Đang chờ nhập)" : "• " + f)).join("\\n");
    
    if (firstMissing === "Thuế phí") {
       msgText += "\\n\\n👇 Mục <b>Thuế phí</b>: Mời anh gõ một con số (Ví dụ: 50000). Nếu không có phí, hãy gõ số <b>0</b>.\\n<a href=\\"tg://btn/" + newToken + "\\">\\u200b</a>";
    } else if (firstMissing === "Ghi chú") {
       msgText += "\\n\\n👇 Mục <b>Ghi chú</b>: Mời anh gõ chữ để trả lời.\\n<a href=\\"tg://btn/" + newToken + "\\">\\u200b</a>";
    } else {
       // Ideally we shouldn't hit this inside Process Callback unless it's another button field. 
       // If it is another button field, the user can't click because Process Callback doesn't redraw buttons! 
       // Wait! If Process Callback doesn't redraw the buttons, how did it work for Strategy -> OrderType?
       // Ah! Process Callback doesn't send reply_markup! It only says "Vui lòng gõ text để bổ sung...".
       msgText += "\\n\\n👇 Mời anh gõ chữ để nhập <b>" + firstMissing + "</b>.\\n<a href=\\"tg://btn/" + newToken + "\\">\\u200b</a>";
    }

    await this.helpers.httpRequest({
      method: 'POST', url: 'https://api.telegram.org/bot' + botToken + '/editMessageText',
      body: { chat_id: chatId, message_id: message.message_id, text: msgText, parse_mode: 'HTML' },
      headers: { 'Content-Type': 'application/json' }
    });
    return [];
  }
  
  // All complete! Send confirmation
  const confirmMsg = '✅ <b>Xác nhận lệnh:</b>\\n\\n' + summaryLines + '\\n\\n<a href="tg://btn/' + newToken + '">\\u200b</a>👇 Bấm xác nhận hoặc hủy.';
  await this.helpers.httpRequest({
    method: 'POST', url: 'https://api.telegram.org/bot' + botToken + '/editMessageText',
    body: {
      chat_id: chatId, message_id: message.message_id, text: confirmMsg, parse_mode: 'HTML',
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
    const updateRes = await fetch(`${BASE}/workflows/${WORKFLOW_ID}`, {
      method: 'PUT',
      headers: { 'X-N8N-API-KEY': API_KEY, 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: workflow.name, nodes: workflow.nodes, connections: workflow.connections, settings: {} })
    });
    console.log(updateRes.ok ? '✅ SUCCESS' : '❌ FAILED');
  }
}

main().catch(console.error);
