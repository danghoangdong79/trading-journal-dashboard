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
        { "text": "Phân tích ảnh chụp màn hình chứng khoán/phái sinh Việt Nam. Trả về JSON (không markdown). Đặc biệt lưu ý: Đối với 'orderType' (Loại lệnh), HÃY ƯU TIÊN tìm cột có tên 'Loại lệnh' (vd: 'Lệnh thường', 'Lệnh điều kiện'). CHỈ KHI KHÔNG CÓ cột này thì mới lấy theo các mã trong 'Giá đặt' (vd: 'MTL', 'ATO', 'ATC'). Tuyệt đối không gộp chung kiểu 'Lệnh thường / MTL'. Nếu trạng thái là 'Chờ khớp', 'Chờ xử lý' thì action='pending'. Nếu 'Đã khớp' cho lệnh LONG/SHORT/Mua/Bán mới thì action='open'. Nếu là đóng vị thế, chốt lời, cắt lỗ thì action='close'. Mã CK/Mã hợp đồng -> symbol. LONG/Mua -> position='LONG', SHORT/Bán -> position='SHORT'. Giá đặt/Giá khớp -> entryPrice (nếu open/pending) hoặc exitPrice (nếu close). KL đặt/KL khớp -> volume. Số hiệu lệnh -> orderId. Tài khoản -> account. Thời gian -> openTime. Nếu không thấy thì để null. Schema: {action: 'open'|'close'|'pending'|'unknown', account, orderId, assetType: 'Co phieu'|'Phai sinh', symbol, position: 'LONG'|'SHORT', orderType, strategy, openDate, openTime, closeDate, closeTime, volume, entryPrice, exitPrice, stopLoss, takeProfit, feesAndTaxes, mood, reviewNote}" },
        { "inline_data": { "mime_type": ($json.imageMimeType && $json.imageMimeType.startsWith('image/')) ? $json.imageMimeType : "image/jpeg", "data": $json.imageBase64 } }
      ]
    }
  ],
  "generationConfig": {
    "response_mime_type": "application/json"
  }
} }}`;
  }

  const updateRes = await fetch(`${BASE}/workflows/${WORKFLOW_ID}`, {
    method: 'PUT',
    headers: { 'X-N8N-API-KEY': API_KEY, 'Content-Type': 'application/json' },
    body: JSON.stringify({ name: workflow.name, nodes: workflow.nodes, connections: workflow.connections, settings: {} })
  });
  console.log(updateRes.ok ? '✅ SUCCESS' : '❌ FAILED');
}

main().catch(console.error);
