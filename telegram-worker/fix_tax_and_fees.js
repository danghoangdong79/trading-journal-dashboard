const API_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM4MjA5OS1kYmVjLTQ3ZDctOGY1Mi04NDdmODgwYzhjZDgiLCJpc3MiOiJuOG4iLCJhdWQiOiJwdWJsaWMtYXBpIiwianRpIjoiMWNiYTUyZTItZWM0OS00MzQxLWIxZjctNDkzYWEzZDY3MWU0IiwiaWF0IjoxNzc2MTUwODcwfQ.R7JDZ62V1gQpI96WWbRF_L1DfrUv6Iz2kjKQ2MpOVOU';
const WORKFLOW_ID = 'iXKZjLQwoc5otveg';
const BASE = 'https://n8n.dahodo.com/api/v1';

async function main() {
  const res = await fetch(`${BASE}/workflows/${WORKFLOW_ID}`, { headers: { 'X-N8N-API-KEY': API_KEY } });
  const workflow = await res.json();
  
  const extractNode = workflow.nodes.find(n => n.name === 'Vision Extract Image');
  const parseNode = workflow.nodes.find(n => n.name === 'Parse + Validate Draft');
  const handleTextNode = workflow.nodes.find(n => n.name === 'Handle Text Commands');

  if (extractNode) {
    extractNode.parameters.jsonBody = `={{ {
  "contents": [
    {
      "parts": [
        { "text": "Phân tích ảnh chụp màn hình chứng khoán/phái sinh Việt Nam. Trả về MẢNG JSON chứa TẤT CẢ các lệnh. TUYỆT ĐỐI BỎ QUA lệnh 'Đã hủy'. Ưu tiên tìm cột 'Loại lệnh' -> orderType. Trạng thái 'Chờ khớp' -> action='pending', 'Đã khớp' -> 'open' hoặc 'close'. Mã CK -> symbol. Mua -> LONG, Bán -> SHORT. Giá đặt/khớp -> entryPrice (open) hoặc exitPrice (close). KL -> volume. Số hiệu lệnh -> orderId. Tài khoản -> account. Thuế, phí, Phí GD (nếu có trong ảnh) -> feesAndTaxes (chỉ lấy số, ko có thì trả về null). Schema: {action, account, orderId, assetType: 'Co phieu'|'Phai sinh', symbol, position: 'LONG'|'SHORT', orderType, strategy, openDate, openTime, closeDate, closeTime, volume, entryPrice, exitPrice, stopLoss, takeProfit, feesAndTaxes, mood, reviewNote}. KẾT QUẢ MẢNG JSON: [ {obj1}, {obj2} ]" },
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
    // Only patching the end part of Parse node
    let jsCode = parseNode.parameters.jsCode;
    // Replace the missing push section
    jsCode = jsCode.replace(
      `if (!draft.strategy && draft.action === 'open') missing.push("Chiến lược");`,
      `if (!draft.strategy && draft.action === 'open') missing.push("Chiến lược");\n  if (draft.feesAndTaxes === undefined || draft.feesAndTaxes === null || draft.feesAndTaxes === '') missing.push("Thuế phí");`
    );
    // Replace the summary lines
    jsCode = jsCode.replace(
      `draft.action === 'close' ? ('Giá đóng: ' + draft.exitPrice) : ('Giá vào: ' + draft.entryPrice),`,
      `draft.action === 'close' ? ('Giá đóng: ' + draft.exitPrice) : ('Giá vào: ' + draft.entryPrice),\n    (draft.feesAndTaxes !== undefined && draft.feesAndTaxes !== null && draft.feesAndTaxes !== '') ? ('Thuế phí: ' + draft.feesAndTaxes) : '',`
    );
    parseNode.parameters.jsCode = jsCode;
  }

  if (handleTextNode) {
    let jsCode = handleTextNode.parameters.jsCode;
    // Patch filling
    jsCode = jsCode.replace(
      `else if (firstMissing === "Mã GD") draft.symbol = text.toUpperCase();`,
      `else if (firstMissing === "Mã GD") draft.symbol = text.toUpperCase();\n        else if (firstMissing === "Thuế phí") draft.feesAndTaxes = parseFloat(text.replace(/[^0-9.-]+/g, '')) || 0;`
    );
    // Patch re-validation
    jsCode = jsCode.replace(
      `if (!draft.strategy) missing.push("Chiến lược");`,
      `if (!draft.strategy) missing.push("Chiến lược");\n        if (draft.feesAndTaxes === undefined || draft.feesAndTaxes === null || draft.feesAndTaxes === '') missing.push("Thuế phí");`
    );
    jsCode = jsCode.replace(
      `draft.entryPrice ? 'Giá vào: ' + draft.entryPrice : '',`,
      `draft.entryPrice ? 'Giá vào: ' + draft.entryPrice : '',\n          (draft.feesAndTaxes !== undefined && draft.feesAndTaxes !== null && draft.feesAndTaxes !== '') ? 'Thuế phí: ' + draft.feesAndTaxes : '',`
    );
    handleTextNode.parameters.jsCode = jsCode;
  }

  const updateRes = await fetch(`${BASE}/workflows/${WORKFLOW_ID}`, {
    method: 'PUT',
    headers: { 'X-N8N-API-KEY': API_KEY, 'Content-Type': 'application/json' },
    body: JSON.stringify({ name: workflow.name, nodes: workflow.nodes, connections: workflow.connections, settings: {} })
  });
  console.log(updateRes.ok ? '✅ SUCCESS' : '❌ FAILED');
}

main().catch(console.error);
