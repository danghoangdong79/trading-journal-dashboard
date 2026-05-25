const API_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM4MjA5OS1kYmVjLTQ3ZDctOGY1Mi04NDdmODgwYzhjZDgiLCJpc3MiOiJuOG4iLCJhdWQiOiJwdWJsaWMtYXBpIiwianRpIjoiMWNiYTUyZTItZWM0OS00MzQxLWIxZjctNDkzYWEzZDY3MWU0IiwiaWF0IjoxNzc2MTUwODcwfQ.R7JDZ62V1gQpI96WWbRF_L1DfrUv6Iz2kjKQ2MpOVOU';
const WORKFLOW_ID = 'iXKZjLQwoc5otveg';
const BASE = 'https://n8n.dahodo.com/api/v1';

async function main() {
  const res = await fetch(`${BASE}/workflows/${WORKFLOW_ID}`, { headers: { 'X-N8N-API-KEY': API_KEY } });
  const workflow = await res.json();
  const parseNode = workflow.nodes.find(n => n.name === 'Parse + Validate Draft');

  if (parseNode) {
    parseNode.parameters.jsCode = `
// Try to get item from image path or direct text path
let item;
try {
  item = $('Merge Vision Text').item.json;
} catch(e) {
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
  // USE YYYY-MM-DD TO AVOID GOOGLE SHEETS LOCALE PARSING ERRORS
  draft.openDate = vn.getUTCFullYear() + '-' + (vn.getUTCMonth()+1).toString().padStart(2,'0') + '-' + vn.getUTCDate().toString().padStart(2,'0');
}
if (!draft.openTime) {
  const now = new Date();
  const vn = new Date(now.getTime() + 7 * 60 * 60 * 1000);
  draft.openTime = vn.getUTCHours().toString().padStart(2,'0') + ':' + vn.getUTCMinutes().toString().padStart(2,'0');
}

let missing = [];
if (!draft.action || draft.action === 'unknown') missing.push("Hành động");
if (!draft.symbol) missing.push("Mã GD");
if (!draft.position) missing.push("Vị thế");
if (!draft.assetType) missing.push("Tài sản");
if (!draft.strategy) missing.push("Chiến lược");

const formatDisplayDate = (dStr) => {
  if (!dStr) return '';
  if (dStr.includes('-')) {
    const p = dStr.split('-');
    if (p.length === 3) return p[2] + '/' + p[1] + '/' + p[0];
  }
  return dStr;
};

const summaryLines = [
  (draft.action === 'open' ? '🟢 MỞ LỆNH' : (draft.action === 'close' ? '🔴 ĐÓNG LỆNH' : (draft.action === 'pending' ? '🟡 LỆNH CHỜ' : '❓ KHÔNG RÕ'))),
  draft.account ? 'TK: ' + draft.account : '',
  draft.symbol ? 'Mã: ' + draft.symbol + ' (' + (draft.assetType||'') + ')' : '',
  draft.position ? 'Vị thế: ' + draft.position : '',
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

  // Also we must set "valueInputOption": "USER_ENTERED" on Append/Update nodes 
  // so Google Sheets correctly parses "YYYY-MM-DD" as a date!
  const appendNode = workflow.nodes.find(n => n.name === 'Append JOURNAL Row');
  if (appendNode) appendNode.parameters.options = { valueInputOption: "USER_ENTERED" };

  const updateNode = workflow.nodes.find(n => n.name === 'Update JOURNAL Row');
  if (updateNode) updateNode.parameters.options = { valueInputOption: "USER_ENTERED" };

  const appendPendingNode = workflow.nodes.find(n => n.name === 'Append ORDERS_PENDING Row');
  if (appendPendingNode) appendPendingNode.parameters.options = { valueInputOption: "USER_ENTERED" };

  const updateRes = await fetch(`${BASE}/workflows/${WORKFLOW_ID}`, {
    method: 'PUT',
    headers: { 'X-N8N-API-KEY': API_KEY, 'Content-Type': 'application/json' },
    body: JSON.stringify({ name: workflow.name, nodes: workflow.nodes, connections: workflow.connections, settings: {} })
  });
  console.log(updateRes.ok ? '✅ SUCCESS' : '❌ FAILED');
}

main().catch(console.error);
