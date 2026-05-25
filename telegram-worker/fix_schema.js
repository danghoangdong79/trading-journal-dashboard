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

  // 1. Fix Append JOURNAL Row schema
  const appendNode = workflow.nodes.find(n => n.name === 'Append JOURNAL Row');
  if (appendNode) {
    appendNode.parameters.columns.schema = SCHEMA;
    const vals = appendNode.parameters.columns.value;
    if (vals['Trạng thái']) { vals['Trạng Thái'] = vals['Trạng thái']; delete vals['Trạng thái']; }
  }

  // 2. Fix Update JOURNAL Row schema
  const updateNode = workflow.nodes.find(n => n.name === 'Update JOURNAL Row');
  if (updateNode) {
    updateNode.parameters.columns.schema = SCHEMA;
    const vals = updateNode.parameters.columns.value;
    if (vals['Trạng thái']) { vals['Trạng Thái'] = vals['Trạng thái']; delete vals['Trạng thái']; }
  }

  // 3. Fix Telegram Notify Draft Token bug
  const notifyNode = workflow.nodes.find(n => n.name === 'Telegram - Notify Draft State');
  if (notifyNode) {
    let text = notifyNode.parameters.text;
    text = text.replace('🔐 Token: <code>" + $json.confirmToken + "</code>', '<span class=\\"tg-spoiler\\">🔑 Token: " + $json.confirmToken + "</span>');
    notifyNode.parameters.text = text;
  }
  const sendDraftNode = workflow.nodes.find(n => n.name === 'Telegram - Send Draft');
  if (sendDraftNode && !sendDraftNode.parameters.text.includes('tg-spoiler')) {
    sendDraftNode.parameters.text = "={{ '📋 <b>Xác nhận lệnh:</b>\\n\\n' + $json.summary + '\\n\\n<span class=\"tg-spoiler\">🔑 Token: ' + $json.confirmToken + '</span>\\n\\n👆 Bấm nút bên dưới để xác nhận hoặc hủy.' }}";
  }

  // 4. Rewire for Pending Confirmation
  // Currently: Parse + Validate Draft -> Pending Order? -> (if false) Missing Info?
  // We want ALL to go to Missing Info? for confirmation!
  // So we bypass Pending Order? node.
  workflow.connections['Parse + Validate Draft'] = {
    main: [ [ { node: 'Missing Info?', type: 'main', index: 0 } ] ]
  };

  // Now, when the user confirms, it goes to `Process Callback` -> `Build JOURNAL Row` -> `Confirmed OK?`
  // Wait, `Build JOURNAL Row` builds the payload for JOURNAL. We don't need to change it, it's just a Set node.
  // After `Confirmed OK?`, it goes to `Is Action Close?`.
  // We should create `Is Action Pending?` AFTER `Confirmed OK?`.
  
  const isActionPendingNode = {
    "parameters": {
      "conditions": {
        "string": [
          { "value1": "={{ $json.draft.action }}", "value2": "pending" }
        ]
      }
    },
    "id": "is-action-pending",
    "name": "Is Action Pending?",
    "type": "n8n-nodes-base.if",
    "typeVersion": 1,
    "position": [400, 300] // between Confirmed OK? and Is Action Close?
  };
  
  if (!workflow.nodes.find(n => n.name === 'Is Action Pending?')) {
    workflow.nodes.push(isActionPendingNode);
  }

  // Rewire: Confirmed OK? (true) -> Is Action Pending?
  workflow.connections['Confirmed OK?'].main[0] = [ { node: 'Is Action Pending?', type: 'main', index: 0 } ];

  // Is Action Pending? (true) -> Build Pending Row
  // Is Action Pending? (false) -> Is Action Close?
  workflow.connections['Is Action Pending?'] = {
    main: [
      [ { node: 'Build Pending Row', type: 'main', index: 0 } ],
      [ { node: 'Is Action Close?', type: 'main', index: 0 } ]
    ]
  };

  // 5. Update Build Pending Row to pull from the correct Confirm path scope!
  // In `Build Pending Row`, it previously pulled `summary:$json.summary`, `_telegram:$json._telegram`.
  // Wait, the input to `Build Pending Row` now comes from `Is Action Pending?` which comes from `Confirmed OK?` -> `Build JOURNAL Row`.
  // `Build JOURNAL Row` outputs `{ ..., summary, draft, missing, confirmToken }` because it just copies `$json` and adds `row`.
  // So `Build Pending Row` doesn't need to change much, BUT we should make sure `sessionId` is preserved!
  // `Process Callback` sets `$json.sessionId`!
  // So `$json.sessionId` is available in `Build JOURNAL Row` and flows down!
  // Let's check `Build Pending Row` code:
  const buildPendingNode = workflow.nodes.find(n => n.name === 'Build Pending Row');
  if (buildPendingNode) {
    buildPendingNode.parameters.jsCode = `
const d = $json.draft || {};
const row = {
  "Trạng thái": d.orderStatus || "Chờ khớp",
  "Số hiệu lệnh": d.orderId || "",
  "Thời gian": d.openTime || "",
  "Tài khoản": d.account || "",
  "Tài sản": d.assetType || "",
  "Mã CK": d.symbol || "",
  "Vị thế": d.position || "",
  "Loại lệnh": d.orderType || "Lệnh thường",
  "KL đặt": d.volume || "",
  "KL khớp": d.matchedVolume || "",
  "Giá đặt": d.entryPrice || "",
  "Giá khớp TB": d.matchedPrice || "",
  "Thời gian huỷ": d.cancelTime || "",
  "Ghi chú": d.reviewNote || "Lệnh chờ khớp - chưa ghi JOURNAL",
  "Nguồn": "telegram",
  "Ngày ghi nhận": new Date().toISOString(),
  "Raw JSON": JSON.stringify(d)
};
return [{ json: { pending:true, row, draft:d, sessionId:$json.sessionId, summary:$json.summary } }];
`;
  }

  // Telegram - Pending Saved needs to reply to the callback query to remove the "loading" spinner!
  // Wait, `Process Callback` -> `Telegram - Pending Saved`.
  // `Answer Confirm` node is currently attached to `Respond Written`.
  // If it's a pending order, it goes to `Build Pending Row` -> `Append ORDERS_PENDING Row` -> `Telegram - Pending Saved`.
  // It should ALSO trigger `Answer Confirm` so the loading spinner on the button stops!
  workflow.connections['Append ORDERS_PENDING Row'].main[0].push({ node: 'Answer Confirm', type: 'main', index: 0 });

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
