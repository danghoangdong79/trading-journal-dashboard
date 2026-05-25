const API_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM4MjA5OS1kYmVjLTQ3ZDctOGY1Mi04NDdmODgwYzhjZDgiLCJpc3MiOiJuOG4iLCJhdWQiOiJwdWJsaWMtYXBpIiwianRpIjoiMWNiYTUyZTItZWM0OS00MzQxLWIxZjctNDkzYWEzZDY3MWU0IiwiaWF0IjoxNzc2MTUwODcwfQ.R7JDZ62V1gQpI96WWbRF_L1DfrUv6Iz2kjKQ2MpOVOU';
const WORKFLOW_ID = 'iXKZjLQwoc5otveg';
const BASE = 'https://n8n.dahodo.com/api/v1';

async function main() {
  const res = await fetch(`${BASE}/workflows/${WORKFLOW_ID}`, { headers: { 'X-N8N-API-KEY': API_KEY } });
  const workflow = await res.json();
  const handleTextCmds = workflow.nodes.find(n => n.name === 'Handle Text Commands');

  if (handleTextCmds) {
    const code = handleTextCmds.parameters.jsCode;
    
    // We will replace the `/tracuu` block.
    // Let's find the start of // ── /tracuu ── and the end which is before // ── Check if this is a text reply
    const startStr = "// ── /tracuu ──";
    const endStr = "// ── Check if this is a text reply to fill missing fields ──";
    const startIdx = code.indexOf(startStr);
    const endIdx = code.indexOf(endStr);
    
    if (startIdx !== -1 && endIdx !== -1) {
      const newLogic = `// ── /tracuu ──
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
    const sheetId = $node["Global Config"].json.SHEET_ID;
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

`;
      handleTextCmds.parameters.jsCode = code.substring(0, startIdx) + newLogic + code.substring(endIdx);
    }
  }

  const updateRes = await fetch(`${BASE}/workflows/${WORKFLOW_ID}`, {
    method: 'PUT',
    headers: { 'X-N8N-API-KEY': API_KEY, 'Content-Type': 'application/json' },
    body: JSON.stringify({ name: workflow.name, nodes: workflow.nodes, connections: workflow.connections, settings: {} })
  });
  console.log(updateRes.ok ? '✅ SUCCESS' : '❌ FAILED');
}

main().catch(console.error);
