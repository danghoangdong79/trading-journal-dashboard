const API_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM4MjA5OS1kYmVjLTQ3ZDctOGY1Mi04NDdmODgwYzhjZDgiLCJpc3MiOiJuOG4iLCJhdWQiOiJwdWJsaWMtYXBpIiwianRpIjoiMWNiYTUyZTItZWM0OS00MzQxLWIxZjctNDkzYWEzZDY3MWU0IiwiaWF0IjoxNzc2MTUwODcwfQ.R7JDZ62V1gQpI96WWbRF_L1DfrUv6Iz2kjKQ2MpOVOU';
const WORKFLOW_ID = 'iXKZjLQwoc5otveg';
const BASE = 'https://n8n.dahodo.com/api/v1';

async function main() {
  const res = await fetch(`${BASE}/workflows/${WORKFLOW_ID}`, { headers: { 'X-N8N-API-KEY': API_KEY } });
  const workflow = await res.json();
  const extractNode = workflow.nodes.find(n => n.name === 'Vision Extract Image');
  const parseNode = workflow.nodes.find(n => n.name === 'Parse + Validate Draft');

  if (extractNode) {
    extractNode.parameters.jsonBody = `={{ {
  "contents": [
    {
      "parts": [
        { "text": "Phân tích ảnh chụp màn hình chứng khoán/phái sinh Việt Nam. Trả về MẢNG JSON (JSON Array) chứa TẤT CẢ các lệnh có trong ảnh (không dùng markdown). NẾU CÓ NHIỀU LỆNH, PHẢI TÁCH THÀNH NHIỀU OBJECT TRONG MẢNG. Đặc biệt lưu ý: Đối với 'orderType' (Loại lệnh), HÃY ƯU TIÊN tìm cột có tên 'Loại lệnh' (vd: 'Lệnh thường', 'Lệnh điều kiện'). CHỈ KHI KHÔNG CÓ cột này thì mới lấy theo các mã trong 'Giá đặt' (vd: 'MTL', 'ATO', 'ATC'). Nếu trạng thái là 'Chờ khớp', 'Chờ xử lý' thì action='pending'. Nếu 'Đã khớp' cho lệnh LONG/SHORT/Mua/Bán mới thì action='open'. Nếu đóng vị thế thì action='close'. Mã CK/Mã hợp đồng -> symbol. LONG/Mua -> position='LONG', SHORT/Bán -> position='SHORT'. Giá đặt/Giá khớp -> entryPrice (open/pending) hoặc exitPrice (close). KL đặt/KL khớp -> volume. Số hiệu lệnh -> orderId. Tài khoản -> account. Thời gian -> openTime. Nếu không thấy để null. Schema 1 object: {action: 'open'|'close'|'pending'|'unknown', account, orderId, assetType: 'Co phieu'|'Phai sinh', symbol, position: 'LONG'|'SHORT', orderType, strategy, openDate, openTime, closeDate, closeTime, volume, entryPrice, exitPrice, stopLoss, takeProfit, feesAndTaxes, mood, reviewNote}. KẾT QUẢ PHẢI LÀ: [ {obj1}, {obj2} ]" },
        { "inline_data": { "mime_type": ($json.imageMimeType && $json.imageMimeType.startsWith('image/')) ? $json.imageMimeType : "image/jpeg", "data": $json.imageBase64 } }
      ]
    }
  ],
  "generationConfig": {
    "response_mime_type": "application/json"
  }
} }}`;
  }

  if (parseNode) {
    parseNode.parameters.jsCode = `
let item;
try { item = $('Merge Vision Text').item.json; } catch(e) {
  try { item = $('Handle Text Commands').item.json; } catch(e2) {
    try { item = $('Normalize Telegram Input').item.json; } catch(e3) {
      try { item = $('Normalize Input').item.json; } catch(e4) { item = $json; }
    }
  }
}

const visionText = item.visionText || '';
let parsedArr = [];

if (visionText) {
  try {
    const start = visionText.indexOf('[');
    const end = visionText.lastIndexOf(']') + 1;
    if (start !== -1 && end > start) {
      parsedArr = JSON.parse(visionText.substring(start, end));
    } else {
      const startObj = visionText.indexOf('{');
      const endObj = visionText.lastIndexOf('}') + 1;
      if (startObj !== -1 && endObj > startObj) {
        parsedArr = [JSON.parse(visionText.substring(startObj, endObj))];
      }
    }
  } catch(e) {
    if (item.draft) parsedArr = [item.draft];
  }
} else if (item.draft) {
  parsedArr = [item.draft];
}

if (!Array.isArray(parsedArr) || parsedArr.length === 0) {
  parsedArr = [{}];
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

const results = [];
const staticData = $getWorkflowStaticData('global');
const chatId = String(item.chatId || item.sessionId || '');

for (let i = 0; i < parsedArr.length; i++) {
  let draft = {
    action: 'unknown', account: '', orderId: '', assetType: '', symbol: '',
    position: '', orderType: '', strategy: '', openDate: '', openTime: '',
    closeDate: '', closeTime: '', volume: '', entryPrice: '', exitPrice: '',
    stopLoss: '', takeProfit: '', feesAndTaxes: '', mood: '', reviewNote: ''
  };
  
  draft = { ...draft, ...parsedArr[i] };

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

  if (draft.strategy && validStrategies.length > 0) {
    const exact = validStrategies.find(s => s.toLowerCase() === draft.strategy.toLowerCase());
    if (exact) draft.strategy = exact; else draft.strategy = '';
  }
  if (draft.orderType && validOrderTypes.length > 0) {
    let match = validOrderTypes.find(o => o.toLowerCase() === draft.orderType.toLowerCase());
    if (!match) match = validOrderTypes.find(o => draft.orderType.toLowerCase().includes(o.toLowerCase()));
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

  if (missing.length > 0 && chatId) {
    // We suffix the pending key with the index if there are multiple, to prevent overwriting
    const key = 'pending_' + chatId + (parsedArr.length > 1 ? '_' + i : '');
    staticData[key] = JSON.stringify({ draft, missing, timestamp: Date.now() });
  }

  results.push({
    json: { ...item, draft, missing, hasMissing: missing.length > 0, summary: summaryLines, confirmToken: tokenPayload, tradeIndex: i, totalTrades: parsedArr.length }
  });
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
