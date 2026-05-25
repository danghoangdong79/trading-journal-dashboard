import fs from 'fs';

const API_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM4MjA5OS1kYmVjLTQ3ZDctOGY1Mi04NDdmODgwYzhjZDgiLCJpc3MiOiJuOG4iLCJhdWQiOiJwdWJsaWMtYXBpIiwianRpIjoiMWNiYTUyZTItZWM0OS00MzQxLWIxZjctNDkzYWEzZDY3MWU0IiwiaWF0IjoxNzc2MTUwODcwfQ.R7JDZ62V1gQpI96WWbRF_L1DfrUv6Iz2kjKQ2MpOVOU';
const WORKFLOW_ID = 'iXKZjLQwoc5otveg';
const BASE = 'https://n8n.dahodo.com/api/v1';

const ACTUAL_HEADERS = [
  "Trạng Thái", "Tài Khoản", "Số hiệu lệnh", "Tài Sản", "Mã GD", "Vị Thế", "Loại Lệnh", "Chiến Lược",
  "Ngày Mở", "Giờ Mở", "Ngày Đóng", "Giờ Đóng", "Số Ngày", "Khối Lượng", "Giá Vào", "Giá Đóng",
  "Cắt Lỗ (SL)", "Chốt Lời (TP)", "Phí & Thuế", "Biên Độ", "Lãi/Lỗ Gộp", "Lãi/Lỗ Ròng", "Tâm Lý", "Ghi Chú Review", "Nhóm Ngành"
];

const SCHEMA = ACTUAL_HEADERS.map(h => ({
  "id": h, "displayName": h, "required": false, "defaultMatch": false, "display": true, "type": "string", "canBeUsedToMatch": true, "removed": false
}));

async function main() {
  const res = await fetch(`${BASE}/workflows/${WORKFLOW_ID}`, { headers: { 'X-N8N-API-KEY': API_KEY } });
  const workflow = await res.json();

  // 1. Restore Append JOURNAL Row
  const appendNode = workflow.nodes.find(n => n.name === 'Append JOURNAL Row');
  if (appendNode) {
    appendNode.parameters.columns = {
      mappingMode: "defineBelow",
      value: {
        "Trạng Thái": "={{ $json.draft.orderStatus || \"Đang mở\" }}",
        "Tài Khoản": "={{ $json.draft.account || \"\" }}",
        "Số hiệu lệnh": "={{ $json.draft.orderId || \"\" }}",
        "Tài Sản": "={{ $json.draft.assetType || \"\" }}",
        "Mã GD": "={{ $json.draft.symbol || \"\" }}",
        "Vị Thế": "={{ $json.draft.position || \"\" }}",
        "Loại Lệnh": "={{ $json.draft.orderType || \"Lệnh thường\" }}",
        "Chiến Lược": "={{ $json.draft.strategy || \"\" }}",
        "Ngày Mở": "={{ $json.draft.openDate || \"\" }}",
        "Giờ Mở": "={{ $json.draft.openTime || \"\" }}",
        "Khối Lượng": "={{ $json.draft.volume || \"\" }}",
        "Giá Vào": "={{ $json.draft.entryPrice || \"\" }}",
        "Cắt Lỗ (SL)": "={{ $json.draft.stopLoss || \"\" }}",
        "Chốt Lời (TP)": "={{ $json.draft.takeProfit || \"\" }}",
        "Tâm Lý": "={{ $json.draft.mood || \"\" }}",
        "Ghi Chú Review": "={{ $json.draft.reviewNote || \"\" }}",
        "Ngày Đóng": "={{ $json.draft.closeDate || \"\" }}",
        "Giờ Đóng": "={{ $json.draft.closeTime || \"\" }}",
        "Giá Đóng": "={{ $json.draft.exitPrice || \"\" }}",
        "Phí & Thuế": "={{ $json.draft.feesAndTaxes || \"\" }}"
      },
      matchingColumns: [],
      schema: SCHEMA
    };
  }

  // 2. Restore Update JOURNAL Row
  const updateNode = workflow.nodes.find(n => n.name === 'Update JOURNAL Row');
  if (updateNode) {
    updateNode.parameters.columns = {
      mappingMode: "defineBelow",
      value: {
        "Số hiệu lệnh": "={{ $json.draft.orderId || \"\" }}",
        "Ngày Đóng": "={{ $json.draft.closeDate || \"\" }}",
        "Giờ Đóng": "={{ $json.draft.closeTime || \"\" }}",
        "Giá Đóng": "={{ $json.draft.exitPrice || \"\" }}",
        "Phí & Thuế": "={{ $json.draft.feesAndTaxes || \"\" }}",
        "Ghi Chú Review": "={{ $json.draft.reviewNote || \"\" }}"
      },
      matchingColumns: ["Số hiệu lệnh"],
      schema: SCHEMA
    };
  }

  // 3. Fix Respond Written node
  const respondWrittenNode = workflow.nodes.find(n => n.name === 'Respond Written');
  if (respondWrittenNode) {
    respondWrittenNode.parameters.responseBody = "={{ { ok: true, status: 'written', draft: $('Build JOURNAL Row').item.json.draft } }}";
  }
  
  // 4. Double check Telegram Notify Draft State
  const notifyNode = workflow.nodes.find(n => n.name === 'Telegram - Notify Draft State');
  if (notifyNode && notifyNode.parameters.text.includes('<code>')) {
      notifyNode.parameters.text = "={{ $json.hasMissing ? (\"⚠️ <b>Thiếu thông tin:</b>\\n\\n\" + $json.missing.map(function(f){ return \"• \" + f; }).join(\"\\n\") + \"\\n\\nVui lòng gửi lại đầy đủ thông tin.\") : (\"✅ <b>Xác nhận lệnh:</b>\\n\\n\" + $json.summary + \"\\n\\n<span class=\\\"tg-spoiler\\\">🔑 Token: \" + $json.confirmToken + \"</span>\\n\\n👇 Bấm nút bên dưới để xác nhận hoặc hủy.\") }}";
  }

  // Double check Telegram Send Draft
  const sendDraftNode = workflow.nodes.find(n => n.name === 'Telegram - Send Draft');
  if (sendDraftNode && !sendDraftNode.parameters.text.includes('tg-spoiler')) {
      sendDraftNode.parameters.text = "={{ '📋 <b>Xác nhận lệnh:</b>\\n\\n' + $json.summary + '\\n\\n<span class=\"tg-spoiler\">🔑 Token: ' + $json.confirmToken + '</span>\\n\\n👆 Bấm nút bên dưới để xác nhận hoặc hủy.' }}";
  }

  const updateRes = await fetch(`${BASE}/workflows/${WORKFLOW_ID}`, {
    method: 'PUT',
    headers: { 'X-N8N-API-KEY': API_KEY, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      name: workflow.name,
      nodes: workflow.nodes,
      connections: workflow.connections,
      settings: {}
    })
  });
  console.log('Update res:', await updateRes.text());
}

main().catch(console.error);
