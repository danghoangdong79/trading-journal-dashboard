const API_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM4MjA5OS1kYmVjLTQ3ZDctOGY1Mi04NDdmODgwYzhjZDgiLCJpc3MiOiJuOG4iLCJhdWQiOiJwdWJsaWMtYXBpIiwianRpIjoiMWNiYTUyZTItZWM0OS00MzQxLWIxZjctNDkzYWEzZDY3MWU0IiwiaWF0IjoxNzc2MTUwODcwfQ.R7JDZ62V1gQpI96WWbRF_L1DfrUv6Iz2kjKQ2MpOVOU';
const WORKFLOW_ID = 'iXKZjLQwoc5otveg';
const BASE = 'https://n8n.dahodo.com/api/v1';

async function main() {
  const res = await fetch(`${BASE}/workflows/${WORKFLOW_ID}`, { headers: { 'X-N8N-API-KEY': API_KEY } });
  const workflow = await res.json();
  
  const extractNode = workflow.nodes.find(n => n.name === 'Vision Extract Image');
  if (extractNode) {
     extractNode.parameters.jsonBody = `={{ {
  "contents": [
    {
      "parts": [
        { "text": "Phân tích ảnh chụp màn hình chứng khoán/phái sinh Việt Nam. Trả về MẢNG JSON chứa TẤT CẢ các lệnh. TUYỆT ĐỐI BỎ QUA lệnh 'Đã hủy'. LƯU Ý ĐẶC BIỆT: Phân biệt rõ Tài khoản (account) thường bắt đầu bằng chữ (VD: Q493928, D920568) và Mã CK (symbol) thường là 3 chữ cái (VD: FPT), mã phái sinh (VD: VN30F1M), hoặc chứng quyền bắt đầu bằng số (VD: 41I1G5000). Ưu tiên tìm cột 'Loại lệnh' -> orderType. Trạng thái 'Chờ khớp' -> action='pending', 'Đã khớp' -> 'open' hoặc 'close'. Mua -> LONG, Bán -> SHORT. Giá đặt/khớp -> entryPrice (open) hoặc exitPrice (close). KL -> volume. Số hiệu lệnh -> orderId. Thuế, phí, Phí GD (nếu có trong ảnh) -> feesAndTaxes (chỉ lấy số, ko có thì trả về null). Ghi chú (nếu có) -> reviewNote. Tâm lý (nếu có) -> mood. Schema: {action, account, orderId, assetType: 'Co phieu'|'Phai sinh', symbol, position: 'LONG'|'SHORT', orderType, strategy, openDate, openTime, closeDate, closeTime, volume, entryPrice, exitPrice, stopLoss, takeProfit, feesAndTaxes, mood, reviewNote}. KẾT QUẢ MẢNG JSON: [ {obj1}, {obj2} ]" },
        { "inline_data": { "mime_type": ($json.imageMimeType && $json.imageMimeType.startsWith('image/')) ? $json.imageMimeType : "image/jpeg", "data": $json.imageBase64 } }
      ]
    }
  ],
  "generationConfig": {
    "response_mime_type": "application/json"
  }
} }}`;
  }

  const parseNode = workflow.nodes.find(n => n.name === 'Parse + Validate Draft');
  if (parseNode) {
     let jsCode = parseNode.parameters.jsCode;
     
     const swapLogic = `
  // AI Hallucination Healing: Swap if AI confused Account and Symbol
  if (draft.account || draft.symbol) {
     const acc = (draft.account || '').toUpperCase().trim();
     const sym = (draft.symbol || '').toUpperCase().trim();
     
     const isAccLooksLikeSymbol = (acc.includes('VN30') || acc.length === 3 || acc.startsWith('41'));
     const isSymLooksLikeAccount = (sym.length === 7 && /^[A-Z][0-9]{6}$/.test(sym));
     
     if (isAccLooksLikeSymbol && !sym) {
         draft.symbol = draft.account;
         draft.account = '';
     } else if (isAccLooksLikeSymbol && isSymLooksLikeAccount) {
         draft.account = sym;
         draft.symbol = acc;
     }
  }

  // AUTO-DETECT ACTION (Open vs Close) and override OrderId
  if (draft.symbol && draft.position) {`;
  
     jsCode = jsCode.replace(`// AUTO-DETECT ACTION (Open vs Close) and override OrderId\n  if (draft.symbol && draft.position) {`, swapLogic);
     parseNode.parameters.jsCode = jsCode;
  }

  const updateRes = await fetch(`${BASE}/workflows/${WORKFLOW_ID}`, {
    method: 'PUT',
    headers: { 'X-N8N-API-KEY': API_KEY, 'Content-Type': 'application/json' },
    body: JSON.stringify({ name: workflow.name, nodes: workflow.nodes, connections: workflow.connections, settings: {} })
  });
  console.log(updateRes.ok ? '✅ SUCCESS' : '❌ FAILED');
}

main().catch(console.error);
