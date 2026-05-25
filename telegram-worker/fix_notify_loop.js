const API_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM4MjA5OS1kYmVjLTQ3ZDctOGY1Mi04NDdmODgwYzhjZDgiLCJpc3MiOiJuOG4iLCJhdWQiOiJwdWJsaWMtYXBpIiwianRpIjoiMWNiYTUyZTItZWM0OS00MzQxLWIxZjctNDkzYWEzZDY3MWU0IiwiaWF0IjoxNzc2MTUwODcwfQ.R7JDZ62V1gQpI96WWbRF_L1DfrUv6Iz2kjKQ2MpOVOU';
const WORKFLOW_ID = 'iXKZjLQwoc5otveg';
const BASE = 'https://n8n.dahodo.com/api/v1';

async function main() {
  const res = await fetch(`${BASE}/workflows/${WORKFLOW_ID}`, { headers: { 'X-N8N-API-KEY': API_KEY } });
  const workflow = await res.json();
  const notifyNode = workflow.nodes.find(n => n.name === 'Telegram - Notify Draft State');

  if (notifyNode) {
    notifyNode.parameters.jsCode = `
const items = $input.all();
const botToken = $node["Global Config"].json.TELEGRAM_BOT_TOKEN;
const sheetId = $node["Global Config"].json.SHEET_ID;

// Pre-fetch FORMULAS so we don't fetch it multiple times
let validStrategies = [];
let validOrderTypes = [];
try {
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

const results = [];

for (let j = 0; j < items.length; j++) {
  const item = items[j].json;
  const chatId = item.chatId || item.sessionId;
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
    } else if (firstMissing === "Chiến lược") {
      options = validStrategies;
      prefix = "strat";
    } else if (firstMissing === "Loại lệnh") {
      options = validOrderTypes;
      prefix = "type";
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
    
    if (tokenPayload) {
      text += '\\n<a href="tg://btn/' + tokenPayload + '">\\u200b</a>';
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
  
  results.push(items[j]);
}

return results;
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
