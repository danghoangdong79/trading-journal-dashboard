/**
 * COMPREHENSIVE n8n WORKFLOW FIX
 * Fixes ALL known issues in one shot:
 *
 * 1. Append JOURNAL Row: fix single-bracket expression on "Loại Lệnh", add missing "Trạng Thái" column
 * 2. Update JOURNAL Row: restore empty value{} and schema[] with proper close-trade mapping
 * 3. Respond Written: fix broken $('Parse + Validate Draft') reference → use $json.draft directly
 * 4. Update JOURNAL Row connections: remove dangling "Telegram - Success" (doesn't exist), keep "Telegram - Send Success"
 * 5. Remove orphan nodes: "Telegram - Missing Info", "Telegram - Send Draft", "Pending Order?", "Webhook Dump Headers", "Read JOURNAL Headers"
 * 6. Build JOURNAL Row: stop rejecting action=pending (it now goes through confirmation)
 * 7. Answer Confirm: fix _telegram reference path for callback flow
 * 8. Telegram - Send Success: fix to pull chatId/sessionId properly from the callback flow
 * 9. Add /help + /tracuu (lookup) handling via Telegram text commands
 */

const API_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM4MjA5OS1kYmVjLTQ3ZDctOGY1Mi04NDdmODgwYzhjZDgiLCJpc3MiOiJuOG4iLCJhdWQiOiJwdWJsaWMtYXBpIiwianRpIjoiMWNiYTUyZTItZWM0OS00MzQxLWIxZjctNDkzYWEzZDY3MWU0IiwiaWF0IjoxNzc2MTUwODcwfQ.R7JDZ62V1gQpI96WWbRF_L1DfrUv6Iz2kjKQ2MpOVOU';
const WORKFLOW_ID = 'iXKZjLQwoc5otveg';
const BASE = 'https://n8n.dahodo.com/api/v1';

const ACTUAL_JOURNAL_HEADERS = [
  "Trạng Thái","Tài Khoản","Số hiệu lệnh","Tài Sản","Mã GD","Vị Thế","Loại Lệnh","Chiến Lược",
  "Ngày Mở","Giờ Mở","Ngày Đóng","Giờ Đóng","Số Ngày","Khối Lượng","Giá Vào","Giá Đóng",
  "Cắt Lỗ (SL)","Chốt Lời (TP)","Phí & Thuế","Biên Độ","Lãi/Lỗ Gộp","Lãi/Lỗ Ròng","Tâm Lý","Ghi Chú Review","Nhóm Ngành"
];

const JOURNAL_SCHEMA = ACTUAL_JOURNAL_HEADERS.map(h => ({
  id: h, displayName: h, required: false, defaultMatch: false, display: true, type: "string", canBeUsedToMatch: true, removed: false
}));

async function main() {
  const res = await fetch(`${BASE}/workflows/${WORKFLOW_ID}`, { headers: { 'X-N8N-API-KEY': API_KEY } });
  const workflow = await res.json();

  const findNode = name => workflow.nodes.find(n => n.name === name);
  const removeNode = name => { workflow.nodes = workflow.nodes.filter(n => n.name !== name); delete workflow.connections[name]; };

  // ─────────────────────────────────────────
  // FIX 1: Append JOURNAL Row — full column map with correct expressions
  // ─────────────────────────────────────────
  const appendNode = findNode('Append JOURNAL Row');
  if (appendNode) {
    appendNode.parameters.columns = {
      mappingMode: "defineBelow",
      value: {
        "Tài Khoản": "={{ $json.draft.account || \"\" }}",
        "Số hiệu lệnh": "={{ $json.draft.orderId || \"\" }}",
        "Tài Sản": "={{ $json.draft.assetType || \"\" }}",
        "Mã GD": "={{ $json.draft.symbol || \"\" }}",
        "Vị Thế": "={{ $json.draft.position || \"LONG\" }}",
        "Loại Lệnh": "={{ $json.draft.orderType || \"Lệnh thường\" }}",
        "Chiến Lược": "={{ $json.draft.strategy || \"\" }}",
        "Ngày Mở": "={{ $json.draft.openDate || \"\" }}",
        "Giờ Mở": "={{ $json.draft.openTime || \"\" }}",
        "Ngày Đóng": "={{ $json.draft.closeDate || \"\" }}",
        "Giờ Đóng": "={{ $json.draft.closeTime || \"\" }}",
        "Khối Lượng": "={{ $json.draft.volume || \"\" }}",
        "Giá Vào": "={{ $json.draft.entryPrice || \"\" }}",
        "Giá Đóng": "={{ $json.draft.exitPrice || \"\" }}",
        "Cắt Lỗ (SL)": "={{ $json.draft.stopLoss || \"\" }}",
        "Chốt Lời (TP)": "={{ $json.draft.takeProfit || \"\" }}",
        "Phí & Thuế": "={{ $json.draft.feesAndTaxes || \"\" }}",
        "Tâm Lý": "={{ $json.draft.mood || \"\" }}",
        "Ghi Chú Review": "={{ $json.draft.reviewNote || \"\" }}"
      },
      matchingColumns: [],
      schema: JOURNAL_SCHEMA
    };
  }

  // ─────────────────────────────────────────
  // FIX 2: Update JOURNAL Row — restore proper close-trade mapping + schema
  // ─────────────────────────────────────────
  const updateNode = findNode('Update JOURNAL Row');
  if (updateNode) {
    updateNode.parameters.columns = {
      mappingMode: "defineBelow",
      value: {
        "Số hiệu lệnh": "={{ $json.draft.orderId || \"\" }}",
        "Ngày Đóng": "={{ $json.draft.closeDate || \"\" }}",
        "Giờ Đóng": "={{ $json.draft.closeTime || \"\" }}",
        "Giá Đóng": "={{ $json.draft.exitPrice || \"\" }}",
        "Phí & Thuế": "={{ $json.draft.feesAndTaxes || \"\" }}",
        "Ghi Chú Review": "={{ $json.draft.reviewNote || \"\" }}"
      },
      matchingColumns: ["Số hiệu lệnh"],
      schema: JOURNAL_SCHEMA
    };
  }

  // ─────────────────────────────────────────
  // FIX 3: Respond Written — use $json.draft directly (it's available from the previous node in the chain)
  // ─────────────────────────────────────────
  const respondWritten = findNode('Respond Written');
  if (respondWritten) {
    respondWritten.parameters.responseBody = "={{ { ok: true, status: 'written', draft: $json.draft || {} } }}";
  }

  // ─────────────────────────────────────────
  // FIX 4: Update JOURNAL Row connections — remove "Telegram - Success" (nonexistent), only keep "Telegram - Send Success"
  // ─────────────────────────────────────────
  if (workflow.connections['Update JOURNAL Row']) {
    workflow.connections['Update JOURNAL Row'] = {
      main: [[ { node: 'Respond Written', type: 'main', index: 0 }, { node: 'Telegram - Send Success', type: 'main', index: 0 } ]]
    };
  }

  // ─────────────────────────────────────────
  // FIX 5: Remove orphan/debug nodes
  // ─────────────────────────────────────────
  removeNode('Telegram - Missing Info');
  removeNode('Telegram - Send Draft');
  removeNode('Pending Order?');
  removeNode('Webhook Dump Headers');
  removeNode('Read JOURNAL Headers');
  // Clean dangling connection targets
  Object.keys(workflow.connections).forEach(k => {
    if (workflow.connections[k]?.main) {
      workflow.connections[k].main = workflow.connections[k].main.map(outputs =>
        outputs.filter(o => workflow.nodes.some(n => n.name === o.node))
      );
    }
  });

  // ─────────────────────────────────────────
  // FIX 6: Build JOURNAL Row — allow pending action to pass through (it will be routed by Is Action Pending?)
  // ─────────────────────────────────────────
  const buildJournalRow = findNode('Build JOURNAL Row');
  if (buildJournalRow) {
    buildJournalRow.parameters.jsCode = `
const input = $json.body || $json;
const _telegram = input._telegram || null;

if (input.ok !== true && input.ok !== 'true' && String(input.confirm || '').toLowerCase() !== 'ok' && input.action !== 'confirm') {
  return [{ json: { accepted:false, reason:'Confirmation not OK', _telegram } }];
}
const d = input.draft || {};

const row = [
  '', d.account || '', d.orderId || '', d.assetType || '', d.symbol || '', d.position || 'LONG', d.orderType || 'Lệnh thường', d.strategy || '',
  d.openDate || '', d.openTime || '', d.closeDate || '', d.closeTime || '', '', d.volume || '', d.entryPrice || '', d.exitPrice || '',
  d.stopLoss || '', d.takeProfit || '', d.feesAndTaxes || '', '', '', '', d.mood || '', d.reviewNote || '', ''
];
return [{ json: { accepted:true, row, draft:d, sessionId: input.sessionId || String(input.chatId || ''), _telegram } }];
`;
  }

  // ─────────────────────────────────────────
  // FIX 7: Answer Confirm — fix callbackQueryId extraction
  // ─────────────────────────────────────────
  const answerConfirm = findNode('Answer Confirm');
  if (answerConfirm) {
    answerConfirm.parameters.queryId = "={{ $json._telegram?.callbackQueryId || $('Process Callback').item.json._telegram?.callbackQueryId || '' }}";
  }

  // ─────────────────────────────────────────
  // FIX 8: Telegram - Send Success — use sessionId from Build JOURNAL Row
  // ─────────────────────────────────────────
  const sendSuccess = findNode('Telegram - Send Success');
  if (sendSuccess) {
    sendSuccess.parameters.chatId = "={{ $('Build JOURNAL Row').item.json.sessionId }}";
    sendSuccess.parameters.text = "={{ '✅ <b>Đã ghi lệnh thành công!</b>\\n\\n' + ($('Build JOURNAL Row').item.json.draft.action === 'close' ? '🔴 ĐÓNG LỆNH' : '🟢 MỞ LỆNH') + '\\n📊 ' + ($('Build JOURNAL Row').item.json.draft.symbol || '') + ' | ' + ($('Build JOURNAL Row').item.json.draft.position || '') + '\\n\\n🔗 <a href=\"https://docs.google.com/spreadsheets/d/1PdCmBoBQsznOx6JXvOlbD-atxQnX9wHRXiM127f109I/edit#gid=913303097\">Mở Google Sheet</a>' }}";
  }

  // ─────────────────────────────────────────
  // FIX 9: Add /help + /tracuu (lookup) handling via Telegram
  // Inject into "Message or Callback?" logic
  // ─────────────────────────────────────────
  // We add a Code node "Handle Text Commands" between "Normalize Telegram Input" and "Has Image?"
  // It intercepts /help, /tracuu, /start and responds directly, passing everything else through

  const handleTextCmdsNode = findNode('Handle Text Commands');
  if (!handleTextCmdsNode) {
    workflow.nodes.push({
      parameters: {
        jsCode: `
const item = $json;
const text = (item.text || '').trim().toLowerCase();
const chatId = item.chatId || item.sessionId;
const botToken = $node["Global Config"].json.TELEGRAM_BOT_TOKEN;

// Check if this is a known command
if (text === '/help' || text === '/start') {
  const helpMsg = [
    '📖 <b>Dahodo Journal Bot – Hướng dẫn sử dụng</b>',
    '',
    '📸 <b>Ghi lệnh bằng ảnh:</b>',
    'Gửi trực tiếp ảnh chụp màn hình lệnh từ sàn giao dịch.',
    'Bot sẽ dùng AI để đọc và phân tích tự động.',
    '',
    '🔍 <b>Tra cứu lệnh:</b>',
    '<code>/tracuu [mã CK]</code> – Tra cứu lệnh đang mở',
    '→ Ví dụ: <code>/tracuu VN30F2506</code>',
    '',
    '📋 <b>Các lệnh khác:</b>',
    '<code>/help</code> – Hiển thị hướng dẫn này',
    '',
    '⚙️ <b>Quy trình:</b>',
    '1. Gửi ảnh chụp lệnh → Bot phân tích',
    '2. Kiểm tra thông tin → Bấm ✅ Xác nhận',
    '3. Dữ liệu được ghi vào Google Sheet',
    '',
    '📌 <b>Lưu ý:</b>',
    '• Lệnh <b>Chờ khớp</b> → ghi vào tab ORDERS_PENDING',
    '• Lệnh <b>Đã khớp</b> → ghi vào tab JOURNAL',
    '• Lệnh <b>Đóng vị thế</b> → cập nhật dòng có sẵn trong JOURNAL',
  ].join('\\n');
  
  await this.helpers.httpRequest({
    method: 'POST',
    url: 'https://api.telegram.org/bot' + botToken + '/sendMessage',
    body: { chat_id: chatId, text: helpMsg, parse_mode: 'HTML' },
    headers: { 'Content-Type': 'application/json' }
  });
  return []; // Stop pipeline
}

if (text.startsWith('/tracuu') || text.startsWith('/lookup') || text.startsWith('/search')) {
  const keyword = text.replace(/^\\/\\w+\\s*/, '').trim().toUpperCase();
  
  if (!keyword) {
    await this.helpers.httpRequest({
      method: 'POST',
      url: 'https://api.telegram.org/bot' + botToken + '/sendMessage',
      body: { chat_id: chatId, text: '⚠️ Vui lòng nhập mã CK.\\nVí dụ: <code>/tracuu VN30F2506</code>', parse_mode: 'HTML' },
      headers: { 'Content-Type': 'application/json' }
    });
    return [];
  }
  
  // Read JOURNAL to find matching rows
  const sheetId = $node["Global Config"].json.SHEET_ID;
  const tabId = $node["Global Config"].json.SHEET_TAB_ID;
  
  try {
    const creds = $credentials.googleSheetsOAuth2Api;
    // Use Google Sheets API via n8n helper — we'll read the sheet inline
    // Actually, let's use a simpler approach: query via the API proxy
    // For now, send a "searching..." message
    const searchMsg = '🔍 Đang tìm kiếm lệnh <b>' + keyword + '</b>...';
    await this.helpers.httpRequest({
      method: 'POST',
      url: 'https://api.telegram.org/bot' + botToken + '/sendMessage',
      body: { chat_id: chatId, text: searchMsg, parse_mode: 'HTML' },
      headers: { 'Content-Type': 'application/json' }
    });
    
    // Read sheet data via the journal API
    const apiRes = await this.helpers.httpRequest({
      method: 'GET',
      url: 'https://journal-api.dahodo.com/api/trades?sheetId=' + sheetId,
      headers: { 'Content-Type': 'application/json' }
    });
    
    const trades = apiRes.trades || [];
    const matches = trades.filter(t => {
      const sym = (t.symbol || '').toUpperCase();
      const orderId = (t.orderId || '').toUpperCase();
      return sym.includes(keyword) || orderId.includes(keyword);
    }).slice(-5); // last 5 matches
    
    let resultMsg;
    if (matches.length === 0) {
      resultMsg = '❌ Không tìm thấy lệnh nào cho <b>' + keyword + '</b>.';
    } else {
      const lines = matches.map((t, i) => {
        const status = t.status || 'Đang mở';
        const emoji = status === 'Thắng' ? '🟢' : status === 'Thua' ? '🔴' : status === 'Hòa' ? '🟡' : '⚪';
        return emoji + ' <b>' + (t.symbol||'') + '</b> ' + (t.position||'') + 
          '\\n   KL: ' + (t.volume||'') + ' | Vào: ' + (t.entryPrice||'') + (t.exitPrice ? ' → Ra: ' + t.exitPrice : '') +
          '\\n   ' + (t.openDate||'') + (t.closeDate ? ' → ' + t.closeDate : ' (đang mở)');
      });
      resultMsg = '📋 <b>Kết quả tra cứu: ' + keyword + '</b> (' + matches.length + ' lệnh)\\n\\n' + lines.join('\\n\\n');
    }
    
    await this.helpers.httpRequest({
      method: 'POST',
      url: 'https://api.telegram.org/bot' + botToken + '/sendMessage',
      body: { chat_id: chatId, text: resultMsg, parse_mode: 'HTML' },
      headers: { 'Content-Type': 'application/json' }
    });
    return [];
  } catch(e) {
    await this.helpers.httpRequest({
      method: 'POST',
      url: 'https://api.telegram.org/bot' + botToken + '/sendMessage',
      body: { chat_id: chatId, text: '❌ Lỗi tra cứu: ' + e.message, parse_mode: 'HTML' },
      headers: { 'Content-Type': 'application/json' }
    });
    return [];
  }
}

// Not a command — pass through
return [{ json: item }];
`
      },
      id: "handle-text-cmds",
      name: "Handle Text Commands",
      type: "n8n-nodes-base.code",
      typeVersion: 2,
      position: [-200, -448]
    });
  }

  // Rewire: Normalize Telegram Input -> Handle Text Commands -> Has Image?
  workflow.connections['Normalize Telegram Input'] = { main: [[ { node: 'Handle Text Commands', type: 'main', index: 0 } ]] };
  workflow.connections['Handle Text Commands'] = { main: [[ { node: 'Has Image?', type: 'main', index: 0 } ]] };

  // ─────────────────────────────────────────
  // PUSH UPDATE
  // ─────────────────────────────────────────
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
  
  const result = await updateRes.json();
  if (updateRes.ok) {
    console.log('✅ SUCCESS — Updated workflow with', result.nodes?.length, 'nodes');
  } else {
    console.log('❌ FAILED:', JSON.stringify(result));
  }
}

main().catch(e => console.error('FATAL:', e));
