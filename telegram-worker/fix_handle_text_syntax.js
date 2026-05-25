const API_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM4MjA5OS1kYmVjLTQ3ZDctOGY1Mi04NDdmODgwYzhjZDgiLCJpc3MiOiJuOG4iLCJhdWQiOiJwdWJsaWMtYXBpIiwianRpIjoiMWNiYTUyZTItZWM0OS00MzQxLWIxZjctNDkzYWEzZDY3MWU0IiwiaWF0IjoxNzc2MTUwODcwfQ.R7JDZ62V1gQpI96WWbRF_L1DfrUv6Iz2kjKQ2MpOVOU';
const WORKFLOW_ID = 'iXKZjLQwoc5otveg';
const BASE = 'https://n8n.dahodo.com/api/v1';

async function main() {
  const res = await fetch(`${BASE}/workflows/${WORKFLOW_ID}`, { headers: { 'X-N8N-API-KEY': API_KEY } });
  const workflow = await res.json();
  const handleTextNode = workflow.nodes.find(n => n.name === 'Handle Text Commands');

  if (handleTextNode) {
    handleTextNode.parameters.jsCode = `
const item = $json;
const text = (item.text || '').trim();
const textLower = text.toLowerCase();
const chatId = String(item.chatId || item.sessionId || '');
const botToken = $node["Global Config"].json.TELEGRAM_BOT_TOKEN;

// ── /help or /start ──
if (textLower === '/help' || textLower === '/start') {
  await this.helpers.httpRequest({
    method: 'POST', url: 'https://api.telegram.org/bot' + botToken + '/sendMessage',
    body: { chat_id: chatId, text: \`<b>🤖 Hướng dẫn sử dụng Bot Ghi Nhật Ký Giao Dịch</b>

1️⃣ <b>Cách ghi lệnh (Nhận diện tự động)</b>
• Gửi <b>một tấm ảnh</b> chụp màn hình lệnh từ app giao dịch (SSI, TCBS, VPS...).
• Bot sẽ tự phân tích và nhận diện. 
• Nếu lệnh thiếu thông tin (Thuế phí, Tâm lý, Ghi chú...), bot sẽ <b>hỏi bạn bổ sung</b> bằng cách hiện nút bấm hoặc yêu cầu bạn gõ văn bản.
• Gõ xong, bấm <b>✅ Xác nhận</b> để ghi vào Google Sheet.

💡 <i>Mẹo: Bot có khả năng tự phát hiện nếu bạn gửi ảnh đóng lệnh (ngược chiều vị thế đang mở) và tự tính toán Lãi/Lỗ.</i>

2️⃣ <b>Cách tra cứu dữ liệu</b>
• Gõ: <code>/tracuu [Từ khóa]</code> (Ví dụ: <code>/tracuu VN30F</code>, <code>/tracuu 05/2026</code>)
• Bot sẽ thống kê TỔNG QUAN tỷ lệ Thắng/Thua, Tổng PnL của từ khóa đó.
• Liệt kê nhanh 10 lệnh gần nhất.

3️⃣ <b>Các lệnh hệ thống</b>
• <code>/start</code> - Khởi động lại bot.
• <code>/help</code> - Xem lại hướng dẫn này.\`, parse_mode: 'HTML' },
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
      body: { chat_id: chatId, text: '⚠️ Nhập mã CK hoặc Ngày/Tháng.\\nVD: <code>/tracuu VN30F</code> hoặc <code>/tracuu 05/2026</code>', parse_mode: 'HTML' },
      headers: { 'Content-Type': 'application/json' }
    });
    return [];
  }
  try {
    const sheetId = $('Global Config').first().json.SHEET_ID;
    const apiRes = await this.helpers.httpRequest({
      method: 'GET', url: 'https://journal-api.dahodo.com/api/trades?sheetId=' + sheetId
    });
    
    const allMatches = (apiRes.trades || []).filter(t => {
      const sym = (t.symbol || '').toUpperCase();
      const oid = (t.orderId || '').toUpperCase();
      const openD = (t.openDate || '').toUpperCase();
      const closeD = (t.closeDate || '').toUpperCase();
      return sym.includes(keyword) || oid.includes(keyword) || openD.includes(keyword) || closeD.includes(keyword);
    });
    
    let msg;
    if (!allMatches.length) {
      msg = '❌ Không tìm thấy dữ liệu cho <b>' + keyword + '</b>.';
    } else {
      let winCount = 0;
      let loseCount = 0;
      let drawCount = 0;
      let totalPnL = 0;
      
      allMatches.forEach(t => {
        if (t.status === 'Thắng') winCount++;
        else if (t.status === 'Thua') loseCount++;
        else if (t.status === 'Hòa') drawCount++;
        totalPnL += (t.netPnL || 0);
      });
      
      const formatCurrency = (val) => new Intl.NumberFormat('vi-VN').format(Math.round(val));
      
      const summaryHeader = '📊 <b>TỔNG QUAN: ' + keyword + '</b>\\n' +
        '• Số lệnh: ' + allMatches.length + '\\n' +
        '• Thắng/Thua/Hòa: ' + winCount + '/' + loseCount + '/' + drawCount + '\\n' +
        '• Tổng PnL: <b>' + (totalPnL >= 0 ? '+' : '') + formatCurrency(totalPnL) + '</b>\\n\\n' +
        '📝 <b>10 LỆNH GẦN NHẤT:</b>\\n';

      const recentMatches = allMatches.slice(-10);
      const lines = recentMatches.map(t => {
        const e = t.status === 'Thắng' ? '🟢' : t.status === 'Thua' ? '🔴' : t.status === 'Hòa' ? '🟡' : '⚪';
        let pnlStr = '';
        if (t.netPnL) pnlStr = ' | Lãi/Lỗ: ' + formatCurrency(t.netPnL);
        return e + ' <b>' + (t.symbol||'') + '</b> ' + (t.position||'') +
          '\\n   KL: ' + (t.volume||'') + ' | Vào: ' + (t.entryPrice||'') + (t.exitPrice ? ' → Ra: '+t.exitPrice : '') + pnlStr +
          '\\n   ' + (t.openDate||'') + (t.closeDate ? ' → '+t.closeDate : ' (đang mở)');
      });
      
      msg = summaryHeader + lines.join('\\n\\n');
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
  
  let pendingRaw = null;
  let foundPendingKey = null;
  for(let i=0; i<10; i++){
     const k = 'pending_' + chatId + (i===0?'':'_'+i);
     if(staticData[k]) { pendingRaw = staticData[k]; foundPendingKey = k; break; }
  }
  const pendingKey = foundPendingKey || 'pending_' + chatId;
      
  
  if (pendingRaw) {
    try {
      const pending = JSON.parse(pendingRaw);
      const draft = pending.draft;
      const age = Date.now() - (pending.timestamp || 0);
      
      // Only use if less than 10 minutes old
      if (age < 600000) {
        // Fill in the first missing field with the user's text
        
        const firstMissing = pending.missing[0];
        if (firstMissing === "Chiến lược") draft.strategy = text;
        else if (firstMissing === "Loại lệnh") draft.orderType = text;
        else if (firstMissing === "Mã GD") draft.symbol = text.toUpperCase();
        else if (firstMissing === "Thuế phí") draft.feesAndTaxes = parseFloat(text.replace(/[^0-9.-]+/g, '')) || 0;
        else if (firstMissing === "Tâm lý") draft.mood = text;
        else if (firstMissing === "Ghi chú") draft.reviewNote = text;
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
        
        
        // Re-validate
        let missing = [];
        if (!draft.action || draft.action === 'unknown') missing.push("Hành động (Mở lệnh / Đóng lệnh)");
        if (!draft.symbol) missing.push("Mã GD");
        if (!draft.position) missing.push("Vị thế (LONG/SHORT)");
        if (!draft.assetType) missing.push("Tài sản (Phái sinh/Cổ phiếu)");
        if (!draft.strategy) missing.push("Chiến lược");
        if (draft.feesAndTaxes === undefined || draft.feesAndTaxes === null || draft.feesAndTaxes === '') missing.push("Thuế phí");
        if (!draft.mood) missing.push("Tâm lý");
        if (!draft.reviewNote) missing.push("Ghi chú");
        
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
          (draft.feesAndTaxes !== undefined && draft.feesAndTaxes !== null && draft.feesAndTaxes !== '') ? 'Thuế phí: ' + draft.feesAndTaxes : '',
          draft.mood ? 'Tâm lý: ' + draft.mood : '',
          draft.reviewNote ? 'Ghi chú: ' + draft.reviewNote : '',
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

  const updateRes = await fetch(`${BASE}/workflows/${WORKFLOW_ID}`, {
    method: 'PUT',
    headers: { 'X-N8N-API-KEY': API_KEY, 'Content-Type': 'application/json' },
    body: JSON.stringify({ name: workflow.name, nodes: workflow.nodes, connections: workflow.connections, settings: {} })
  });
  console.log(updateRes.ok ? '✅ SUCCESS' : '❌ FAILED');
}

main().catch(console.error);
