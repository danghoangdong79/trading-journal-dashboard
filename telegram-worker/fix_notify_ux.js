const API_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM4MjA5OS1kYmVjLTQ3ZDctOGY1Mi04NDdmODgwYzhjZDgiLCJpc3MiOiJuOG4iLCJhdWQiOiJwdWJsaWMtYXBpIiwianRpIjoiMWNiYTUyZTItZWM0OS00MzQxLWIxZjctNDkzYWEzZDY3MWU0IiwiaWF0IjoxNzc2MTUwODcwfQ.R7JDZ62V1gQpI96WWbRF_L1DfrUv6Iz2kjKQ2MpOVOU';
const WORKFLOW_ID = 'iXKZjLQwoc5otveg';
const BASE = 'https://n8n.dahodo.com/api/v1';

async function main() {
  const res = await fetch(`${BASE}/workflows/${WORKFLOW_ID}`, { headers: { 'X-N8N-API-KEY': API_KEY } });
  const workflow = await res.json();
  const notifyNode = workflow.nodes.find(n => n.name === 'Telegram - Notify Draft State');

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
  const strategyMissing = missing.includes("Chiến lược");
  
  // Hiển thị thông tin đã nhận diện được ở trên cùng
  let text = "📋 <b>Thông tin đã nhận:</b>\\n\\n" + summary + "\\n\\n⚠️ <b>Cần bổ sung:</b>\\n" + missing.map(f => "• " + f).join("\\n");
  let reply_markup = undefined;
  
  if (strategyMissing) {
    text += "\\n\\n👇 Chọn chiến lược hoặc gõ phím để nhập mới:";
    
    // Dynamically fetch strategies from FORMULAS sheet
    let strategies = ["Statergy 1", "Statergy 2", "Statergy 3", "Statergy 4"]; // fallback
    try {
      const csvUrl = 'https://docs.google.com/spreadsheets/d/' + sheetId + '/gviz/tq?tqx=out:csv&sheet=FORMULAS';
      const csvRes = await this.helpers.httpRequest({ method: 'GET', url: csvUrl });
      if (csvRes && typeof csvRes === 'string') {
        const lines = csvRes.split('\\n');
        if (lines.length > 0) {
          const headers = lines[0].split('","').map(h => h.replace(/"/g, '').trim().toUpperCase());
          let stratIdx = headers.indexOf('CHIẾN LƯỢC');
          if (stratIdx === -1) stratIdx = 2; // fallback to C
          
          const fetchedStrats = [];
          for (let i = 1; i < lines.length; i++) {
            const cols = lines[i].split('","');
            if (cols.length > stratIdx) {
              const val = cols[stratIdx].replace(/"/g, '').trim();
              if (val && val !== '#N/A' && !fetchedStrats.includes(val)) {
                fetchedStrats.push(val);
              }
            }
          }
          if (fetchedStrats.length > 0) {
            strategies = fetchedStrats;
          }
        }
      }
    } catch(e) {
      console.log("Failed to fetch strategies:", e);
    }
    
    // Build inline keyboard layout (2 columns max) WITHOUT emojis
    const keyboard = [];
    for (let i = 0; i < strategies.length; i += 2) {
      const row = [];
      row.push({ text: strategies[i], callback_data: "fill_strategy:" + strategies[i] });
      if (i + 1 < strategies.length) {
        row.push({ text: strategies[i + 1], callback_data: "fill_strategy:" + strategies[i + 1] });
      }
      keyboard.push(row);
    }
    reply_markup = { inline_keyboard: keyboard };
  } else {
    text += "\\n\\nVui lòng gửi lại đầy đủ thông tin (gõ text).";
  }
  
  await this.helpers.httpRequest({
    method: 'POST',
    url: 'https://api.telegram.org/bot' + botToken + '/sendMessage',
    body: { chat_id: chatId, text, parse_mode: 'HTML', reply_markup },
    headers: { 'Content-Type': 'application/json' }
  });
} else {
  const text = "✅ <b>Xác nhận lệnh:</b>\\n\\n" + summary + '\\n\\n<a href="tg://btn/' + tokenPayload + '">\\u200b</a>👇 Bấm nút bên dưới để xác nhận hoặc hủy.';
  await this.helpers.httpRequest({
    method: 'POST',
    url: 'https://api.telegram.org/bot' + botToken + '/sendMessage',
    body: {
      chat_id: chatId, text, parse_mode: 'HTML',
      reply_markup: {
        inline_keyboard: [[{ text: '✅ Xác nhận', callback_data: 'confirm' }, { text: '❌ Hủy', callback_data: 'cancel' }]]
      }
    },
    headers: { 'Content-Type': 'application/json' }
  });
}

return [{ json: item }];
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
