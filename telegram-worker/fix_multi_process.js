const API_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM4MjA5OS1kYmVjLTQ3ZDctOGY1Mi04NDdmODgwYzhjZDgiLCJpc3MiOiJuOG4iLCJhdWQiOiJwdWJsaWMtYXBpIiwianRpIjoiMWNiYTUyZTItZWM0OS00MzQxLWIxZjctNDkzYWEzZDY3MWU0IiwiaWF0IjoxNzc2MTUwODcwfQ.R7JDZ62V1gQpI96WWbRF_L1DfrUv6Iz2kjKQ2MpOVOU';
const WORKFLOW_ID = 'iXKZjLQwoc5otveg';
const BASE = 'https://n8n.dahodo.com/api/v1';

async function main() {
  const res = await fetch(`${BASE}/workflows/${WORKFLOW_ID}`, { headers: { 'X-N8N-API-KEY': API_KEY } });
  const workflow = await res.json();
  const processNode = workflow.nodes.find(n => n.name === 'Process Callback');
  const notifyNode = workflow.nodes.find(n => n.name === 'Telegram - Notify Draft State');
  const handleTextCmds = workflow.nodes.find(n => n.name === 'Handle Text Commands');

  if (processNode) {
    const jsCode = processNode.parameters.jsCode;
    // Update to find ANY pending key for this chatId and use it, but how do we associate the message?
    // The message_id can be used as the pending key!! That's brilliant!
    // But in Parse + Validate Draft, we haven't sent the message yet, so we don't have message_id.
    // Instead of message_id, we can just encode the index in the callback data!
    // NO, callback data limit is 64 chars!
    // Let's use a unique ID for each pending draft and put it in callback_data: `fill_strat:U1234:Statergy 1`
  }

  // A simpler way: since we only have a few users, just find the FIRST pending key that exists for this chatId
  if (processNode) {
    processNode.parameters.jsCode = `
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
  
  if (foundPendingKey) delete staticData[foundPendingKey];
  
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
    if (foundPendingKey) staticData[foundPendingKey] = JSON.stringify({ draft, missing, timestamp: Date.now() });
    
    // Replace current message with updated text so the user knows they selected it
    const msg = "📋 <b>Thông tin đã nhận:</b>\\n\\n" + summaryLines + "\\n\\n⚠️ <b>Vẫn thiếu:</b>\\n" + missing.map(f => "• " + f).join("\\n") + "\\n\\n👇 Vui lòng gõ text để bổ sung " + missing[0].toLowerCase() + ".\\n<a href=\\"tg://btn/" + newToken + "\\\">\\u200b</a>";
    await this.helpers.httpRequest({
      method: 'POST', url: 'https://api.telegram.org/bot' + botToken + '/editMessageText',
      body: { chat_id: chatId, message_id: message.message_id, text: msg, parse_mode: 'HTML' },
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
  }

  // Modify Handle Text Commands similarly
  if (handleTextCmds) {
    handleTextCmds.parameters.jsCode = handleTextCmds.parameters.jsCode.replace(
      /const pendingRaw = staticData\[pendingKey\];/,
      `
  let pendingRaw = null;
  let foundPendingKey = null;
  for(let i=0; i<10; i++){
     const k = 'pending_' + chatId + (i===0?'':'_'+i);
     if(staticData[k]) { pendingRaw = staticData[k]; foundPendingKey = k; break; }
  }
  const pendingKey = foundPendingKey || 'pending_' + chatId;
      `
    );
  }
  
  const updateRes = await fetch(`${BASE}/workflows/${WORKFLOW_ID}`, {
    method: 'PUT',
    headers: { 'X-N8N-API-KEY': API_KEY, 'Content-Type': 'application/json' },
    body: JSON.stringify({ name: workflow.name, nodes: workflow.nodes, connections: workflow.connections, settings: {} })
  });
  console.log(updateRes.ok ? '✅ SUCCESS' : '❌ FAILED');
}

main().catch(console.error);
