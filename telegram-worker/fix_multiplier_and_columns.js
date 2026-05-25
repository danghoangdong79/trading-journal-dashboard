const API_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM4MjA5OS1kYmVjLTQ3ZDctOGY1Mi04NDdmODgwYzhjZDgiLCJpc3MiOiJuOG4iLCJhdWQiOiJwdWJsaWMtYXBpIiwianRpIjoiMWNiYTUyZTItZWM0OS00MzQxLWIxZjctNDkzYWEzZDY3MWU0IiwiaWF0IjoxNzc2MTUwODcwfQ.R7JDZ62V1gQpI96WWbRF_L1DfrUv6Iz2kjKQ2MpOVOU';
const WORKFLOW_ID = 'iXKZjLQwoc5otveg';
const BASE = 'https://n8n.dahodo.com/api/v1';

async function main() {
  const res = await fetch(`${BASE}/workflows/${WORKFLOW_ID}`, { headers: { 'X-N8N-API-KEY': API_KEY } });
  const workflow = await res.json();
  
  // Fix 1: Add assetType auto-correction in Parse node
  const parseNode = workflow.nodes.find(n => n.name === 'Parse + Validate Draft');
  if (parseNode) {
     let jsCode = parseNode.parameters.jsCode;
     const newLogic = `
  // Auto-correct Asset Type based on Symbol
  if (draft.symbol) {
    const sym = draft.symbol.toUpperCase();
    if (/^[0-9]{2}[A-Z]/.test(sym) || sym.startsWith('41') || sym.length > 5 || sym.length === 3) {
       draft.assetType = 'Cổ phiếu';
    } else if (sym.includes('VN30F')) {
       draft.assetType = 'Phái sinh';
    }
  }
  
  // Position normalization
`;
     if (!jsCode.includes('Auto-correct Asset Type')) {
        jsCode = jsCode.replace('// Position normalization', newLogic);
        parseNode.parameters.jsCode = jsCode;
     }
  }

  // Fix 2: Rewrite Build JOURNAL Row to output exact Google Sheets object
  const buildNode = workflow.nodes.find(n => n.name === 'Build JOURNAL Row');
  if (buildNode) {
     buildNode.parameters.jsCode = `
const input = $json.body || $json;
const _telegram = input._telegram || null;

if (input.ok !== true && input.ok !== 'true' && String(input.confirm || '').toLowerCase() !== 'ok' && input.action !== 'confirm') {
  return [{ json: { accepted:false, reason:'Confirmation not OK', _telegram } }];
}
const d = input.draft || {};

const mappedRow = {
  "Trạng Thái": d.action === 'close' ? 'Đóng' : (d.action === 'open' ? 'Đang mở' : ''),
  "Tài Khoản": d.account || '',
  "Số hiệu lệnh": d.orderId || '',
  "Tài Sản": d.assetType || '',
  "Mã GD": d.symbol || '',
  "Vị Thế": d.position || 'LONG',
  "Loại Lệnh": d.orderType || 'Lệnh thường',
  "Chiến Lược": d.strategy || '',
  "Ngày Mở": d.openDate || '',
  "Giờ Mở": d.openTime || '',
  "Ngày Đóng": d.closeDate || '',
  "Giờ Đóng": d.closeTime || '',
  "Số Ngày": '',
  "Khối Lượng": d.volume || '',
  "Giá Vào": d.entryPrice || '',
  "Giá Đóng": d.exitPrice || '',
  "Cắt Lỗ (SL)": d.stopLoss || '',
  "Chốt Lời (TP)": d.takeProfit || '',
  "Phí & Thuế": d.feesAndTaxes || '',
  "Biên Độ": '',
  "Lãi/Lỗ Gộp": '',
  "Lãi/Lỗ Ròng": '',
  "Tâm Lý": d.mood || '',
  "Ghi Chú Review": d.reviewNote || '',
  "Nhóm Ngành": ''
};

const chatId = input.chatId || input._telegram?.chatId || input.draft?._telegram?.chatId || input.sessionId || '';
return [{ json: { accepted:true, mappedRow, draft:d, chatId, sessionId: String(chatId || input.sessionId || ''), _telegram } }];
`;
  }

  // Fix 3: Change Append JOURNAL Row to autoMapInputData
  const appendNode = workflow.nodes.find(n => n.name === 'Append JOURNAL Row');
  if (appendNode) {
     appendNode.parameters.columns = {
        mappingMode: 'autoMapInputData',
        value: {},
        matchingColumns: [],
        schema: []
     };
     // Make sure we pass mappedRow down
     appendNode.parameters.options = { dataProperty: 'mappedRow' };
  }

  const updateRes = await fetch(`${BASE}/workflows/${WORKFLOW_ID}`, {
    method: 'PUT',
    headers: { 'X-N8N-API-KEY': API_KEY, 'Content-Type': 'application/json' },
    body: JSON.stringify({ name: workflow.name, nodes: workflow.nodes, connections: workflow.connections, settings: {} })
  });
  console.log(updateRes.ok ? '✅ SUCCESS' : '❌ FAILED');
}

main().catch(console.error);
