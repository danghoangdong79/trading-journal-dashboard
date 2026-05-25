const API_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM4MjA5OS1kYmVjLTQ3ZDctOGY1Mi04NDdmODgwYzhjZDgiLCJpc3MiOiJuOG4iLCJhdWQiOiJwdWJsaWMtYXBpIiwianRpIjoiMWNiYTUyZTItZWM0OS00MzQxLWIxZjctNDkzYWEzZDY3MWU0IiwiaWF0IjoxNzc2MTUwODcwfQ.R7JDZ62V1gQpI96WWbRF_L1DfrUv6Iz2kjKQ2MpOVOU';
const WORKFLOW_ID = 'iXKZjLQwoc5otveg';
const BASE = 'https://n8n.dahodo.com/api/v1';

async function main() {
  const res = await fetch(`${BASE}/workflows/${WORKFLOW_ID}`, { headers: { 'X-N8N-API-KEY': API_KEY } });
  const workflow = await res.json();
  const appendNode = workflow.nodes.find(n => n.name === 'Append JOURNAL Row');

  if (appendNode) {
    appendNode.parameters.columns.value = {
      "Trạng Thái": "",
      "Tài Khoản": "={{ $json.draft.account || \"\" }}",
      "Số hiệu lệnh": "={{ $json.draft.orderId || \"\" }}",
      "Tài Sản": "={{ $json.draft.assetType || \"\" }}",
      "Mã GD": "={{ $json.draft.symbol || \"\" }}",
      "Vị Thế": "={{ $json.draft.position || \"LONG\" }}",
      "Loại Lệnh": "={{ $json.draft.orderType || \"Lệnh thường\" }}",
      "Chiến Lược": "={{ $json.draft.strategy || \"\" }}",
      "Ngày Mở": "={{ $json.draft.openDate || \"\" }}",
      "Giờ Mở": "={{ $json.draft.openTime || \"\" }}",
      "Ngày Đóng": "={{ $json.draft.closeDate || \"\" }}",
      "Giờ Đóng": "={{ $json.draft.closeTime || \"\" }}",
      "Số Ngày": "",
      "Khối Lượng": "={{ $json.draft.volume || \"\" }}",
      "Giá Vào": "={{ $json.draft.entryPrice || \"\" }}",
      "Giá Đóng": "={{ $json.draft.exitPrice || \"\" }}",
      "Cắt Lỗ (SL)": "={{ $json.draft.stopLoss || \"\" }}",
      "Chốt Lời (TP)": "={{ $json.draft.takeProfit || \"\" }}",
      "Phí & Thuế": "={{ $json.draft.feesAndTaxes || \"\" }}",
      "Biên Độ": "",
      "Lãi/Lỗ Gộp": "",
      "Lãi/Lỗ Ròng": "",
      "Tâm Lý": "={{ $json.draft.mood || \"\" }}",
      "Ghi Chú Review": "={{ $json.draft.reviewNote || \"\" }}",
      "Nhóm Ngành": ""
    };
  }

  const updateRes = await fetch(`${BASE}/workflows/${WORKFLOW_ID}`, {
    method: 'PUT',
    headers: { 'X-N8N-API-KEY': API_KEY, 'Content-Type': 'application/json' },
    body: JSON.stringify({ name: workflow.name, nodes: workflow.nodes, connections: workflow.connections, settings: {} })
  });
  console.log(updateRes.ok ? '✅ SUCCESS' : '❌ FAILED');
}

main().catch(console.error);
