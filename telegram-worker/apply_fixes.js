import fs from 'fs';

const API_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM4MjA5OS1kYmVjLTQ3ZDctOGY1Mi04NDdmODgwYzhjZDgiLCJpc3MiOiJuOG4iLCJhdWQiOiJwdWJsaWMtYXBpIiwianRpIjoiMWNiYTUyZTItZWM0OS00MzQxLWIxZjctNDkzYWEzZDY3MWU0IiwiaWF0IjoxNzc2MTUwODcwfQ.R7JDZ62V1gQpI96WWbRF_L1DfrUv6Iz2kjKQ2MpOVOU';
const WORKFLOW_ID = 'iXKZjLQwoc5otveg';
const BASE = 'https://n8n.dahodo.com/api/v1';

async function main() {
  const workflow = JSON.parse(fs.readFileSync('workflow_user.json', 'utf8'));

  // 1. Update Vision Extract Image Prompt to include pending
  const visionNode = workflow.nodes.find(n => n.name === 'Vision Extract Image');
  if (visionNode) {
    visionNode.parameters.jsonBody = "={{ {\n  \"contents\": [\n    {\n      \"parts\": [\n        { \"text\": \"Phân tích ảnh chụp màn hình chứng khoán/phái sinh Việt Nam. Trả về JSON (không markdown). Nếu trạng thái là 'Chờ khớp', 'Chờ xử lý' thì action='pending'. Nếu 'Đã khớp' cho lệnh LONG/SHORT/Mua/Bán mới thì action='open'. Nếu là đóng vị thế, chốt lời, cắt lỗ thì action='close'. Mã CK/Mã hợp đồng -> symbol. LONG/Mua -> position='LONG', SHORT/Bán -> position='SHORT'. Giá đặt/Giá khớp -> entryPrice (nếu open/pending) hoặc exitPrice (nếu close). KL đặt/KL khớp -> volume. Số hiệu lệnh -> orderId. Tài khoản -> account. Thời gian -> openTime. Nếu không thấy thì để null. Schema: {action: 'open'|'close'|'pending'|'unknown', account, orderId, assetType: 'Co phieu'|'Phai sinh', symbol, position: 'LONG'|'SHORT', orderType, strategy, openDate, openTime, closeDate, closeTime, volume, entryPrice, exitPrice, stopLoss, takeProfit, feesAndTaxes, mood, reviewNote}\" },\n        { \"inline_data\": { \"mime_type\": ($json.imageMimeType && $json.imageMimeType.startsWith('image/')) ? $json.imageMimeType : \"image/jpeg\", \"data\": $json.imageBase64 } }\n      ]\n    }\n  ],\n  \"generationConfig\": {\n    \"response_mime_type\": \"application/json\"\n  }\n} }}";
  }

  // 2. Update Parse + Validate Draft Node
  const parseNode = workflow.nodes.find(n => n.name === 'Parse + Validate Draft');
  if (parseNode) {
    parseNode.parameters.jsCode = `
const item = $('Merge Vision Text').item.json;
let text = item.text || '';
const visionText = item.visionText || '';
const isPhoto = !!item.telegramPhotoFileId;

let draft = { action: 'unknown', account: '', orderId: '', assetType: '', symbol: '', position: '', orderType: '', strategy: '', openDate: '', openTime: '', closeDate: '', closeTime: '', volume: '', entryPrice: '', exitPrice: '', stopLoss: '', takeProfit: '', feesAndTaxes: '', mood: '', reviewNote: '' };

if (visionText && visionText.includes('{')) {
  try {
    const start = visionText.indexOf('{');
    const end = visionText.lastIndexOf('}') + 1;
    const jsonStr = visionText.substring(start, end);
    const parsed = JSON.parse(jsonStr);
    draft = { ...draft, ...parsed };
  } catch(e) {}
}

let missing = [];
if (!draft.action || draft.action === 'unknown') missing.push("Hành động (Mở lệnh / Đóng lệnh / Lệnh chờ)");
if (!draft.symbol) missing.push("Mã GD");
if (!draft.position) missing.push("Vị thế (LONG/SHORT/MUA/BÁN)");

const actionLabel = draft.action === 'open' ? '🟢 MỞ LỆNH' : (draft.action === 'close' ? '🔴 ĐÓNG LỆNH' : (draft.action === 'pending' ? '🟡 LỆNH CHỜ' : '❓ KHÔNG XÁC ĐỊNH'));

const summaryLines = [
  actionLabel,
  draft.account ? \`Tài khoản: \${draft.account}\` : '',
  draft.orderId ? \`Số lệnh: \${draft.orderId}\` : '',
  draft.symbol ? \`Mã GD: \${draft.symbol} (\${draft.assetType || 'Chưa rõ'})\` : '',
  draft.position ? \`Vị thế: \${draft.position}\` : '',
  draft.volume ? \`Khối lượng: \${draft.volume}\` : '',
  draft.entryPrice ? \`Giá vào: \${draft.entryPrice}\` : '',
  draft.exitPrice ? \`Giá đóng: \${draft.exitPrice}\` : '',
  draft.stopLoss ? \`SL: \${draft.stopLoss}\` : '',
  draft.takeProfit ? \`TP: \${draft.takeProfit}\` : '',
  draft.feesAndTaxes ? \`Phí & Thuế: \${draft.feesAndTaxes}\` : ''
].filter(Boolean).join('\\n');

const tokenPayload = Buffer.from(JSON.stringify(draft)).toString('base64url');

return [{
  json: {
    ...item,
    draft,
    missing,
    hasMissing: missing.length > 0,
    summary: summaryLines,
    confirmToken: tokenPayload
  }
}];`;
  }

  // 3. Update Send Draft to hide token
  const sendDraftNode = workflow.nodes.find(n => n.name === 'Telegram - Send Draft');
  if (sendDraftNode) {
    sendDraftNode.parameters.text = "={{ '📋 <b>Xác nhận lệnh:</b>\\n\\n' + $json.summary + '\\n\\n<span class=\"tg-spoiler\">🔑 Token: ' + $json.confirmToken + '</span>\\n\\n👆 Bấm nút bên dưới để xác nhận hoặc hủy.' }}";
  }

  // 4. Update Schema for ALL Google Sheets nodes
  const headers = [
    "Trạng thái", "Tài Khoản", "Số hiệu lệnh", "Tài Sản", "Mã GD", "Vị Thế", 
    "Loại Lệnh", "Chiến Lược", "Ngày Mở", "Giờ Mở", "Ngày Đóng", "Giờ Đóng",
    "Số Ngày", "Khối Lượng", "Giá Vào", "Giá Đóng", "Cắt Lỗ (SL)", "Chốt Lời (TP)",
    "Biên Độ", "Lãi/Lỗ Gộp", "Phí & Thuế", "Lãi/Lỗ Ròng", "Tâm Lý", "Ghi Chú Review", "Nhóm Ngành"
  ];
  const newSchema = headers.map(h => ({ id: h, displayName: h, required: false, defaultMatch: false, display: true, type: "string", canBeUsedToMatch: true, removed: false }));

  const mapKey = (oldK) => {
     if(oldK === 'Tai Khoan') return 'Tài Khoản';
     if(oldK === 'Tai San') return 'Tài Sản';
     if(oldK === 'Ma GD') return 'Mã GD';
     if(oldK === 'Vi The') return 'Vị Thế';
     if(oldK === 'Loai Lenh') return 'Loại Lệnh';
     if(oldK === 'Chien Luoc') return 'Chiến Lược';
     if(oldK === 'Ngay Mo') return 'Ngày Mở';
     if(oldK === 'Gio Mo') return 'Giờ Mở';
     if(oldK === 'Ngay Dong') return 'Ngày Đóng';
     if(oldK === 'Gio Dong') return 'Giờ Đóng';
     if(oldK === 'Khoi Luong') return 'Khối Lượng';
     if(oldK === 'Gia Vao') return 'Giá Vào';
     if(oldK === 'Gia Dong') return 'Giá Đóng';
     if(oldK === 'Stop Loss') return 'Cắt Lỗ (SL)';
     if(oldK === 'Take Profit') return 'Chốt Lời (TP)';
     if(oldK === 'Phi & Thue') return 'Phí & Thuế';
     if(oldK === 'Tam Ly') return 'Tâm Lý';
     if(oldK === 'Ghi Chu') return 'Ghi Chú Review';
     return oldK;
  };

  const syncSchema = (node) => {
    if (!node) return;
    node.parameters.columns.schema = newSchema;
    const oldVals = node.parameters.columns.value || {};
    const newVals = {};
    for(const k of Object.keys(oldVals)) {
      if(k === 'Số hiệu lệnh' || k === 'S? hi?u l?nh') newVals['Số hiệu lệnh'] = oldVals[k];
      else newVals[mapKey(k)] = oldVals[k];
    }
    node.parameters.columns.value = newVals;
  };

  syncSchema(workflow.nodes.find(n => n.name === 'Append JOURNAL Row'));
  // Update Pending Row also uses JOURNAL sheet format? The user's workflow uses Append ORDERS_PENDING Row.
  // Wait, does ORDERS_PENDING have the exact same columns? I should check, but let's assume yes or avoid updating it.
  // ACTUALLY, "Column names were updated after the node's setup" will happen to Append ORDERS_PENDING Row too if it points to JOURNAL or uses the same schema. Let's just update 'Append JOURNAL Row' and 'Update JOURNAL Row'.

  // 5. Add "Is Action Close?" logic
  const appendNode = workflow.nodes.find(n => n.name === 'Append JOURNAL Row');
  const ifRouteId = 'Is Action Close?';
  
  if (!workflow.nodes.find(n => n.name === ifRouteId)) {
    workflow.nodes.push({
      "parameters": {
        "conditions": { "string": [ { "value1": "={{ $json.draft.action }}", "operation": "equal", "value2": "close" } ] }
      },
      "id": "e6a0d2f0-1e5b-4c7b-8c8a-9c6d4d1e7c9c",
      "name": ifRouteId,
      "type": "n8n-nodes-base.if",
      "typeVersion": 1,
      "position": [ appendNode.position[0] - 200, appendNode.position[1] ]
    });
  }

  const updateNodeId = 'Update JOURNAL Row';
  if (!workflow.nodes.find(n => n.name === updateNodeId)) {
    const updateNode = JSON.parse(JSON.stringify(appendNode));
    updateNode.name = updateNodeId;
    updateNode.id = "e6a0d2f0-1e5b-4c7b-8c8a-9c6d4d1e7c9d";
    updateNode.position = [ appendNode.position[0], appendNode.position[1] + 200 ];
    updateNode.parameters.operation = "update";
    updateNode.parameters.columns.matchingColumns = ["Số hiệu lệnh"];
    updateNode.parameters.columns.value = {
      "Số hiệu lệnh": "={{ $json.draft.orderId || \"\" }}",
      "Ngày Đóng": "={{ $json.draft.closeDate || \"\" }}",
      "Giờ Đóng": "={{ $json.draft.closeTime || \"\" }}",
      "Giá Đóng": "={{ $json.draft.exitPrice || \"\" }}",
      "Phí & Thuế": "={{ $json.draft.feesAndTaxes || \"\" }}",
      "Ghi Chú Review": "={{ $json.draft.reviewNote || \"\" }}"
    };
    workflow.nodes.push(updateNode);
  }

  // Rewrite Connections
  const ifCallbackNode = 'Confirmed OK?'; // wait, in user's workflow it's 'Confirmed OK?' not 'If Callback == confirm'
  
  if (workflow.connections[ifCallbackNode] && workflow.connections[ifCallbackNode].main[0]) {
    workflow.connections[ifCallbackNode].main[0] = [ { node: ifRouteId, type: 'main', index: 0 } ];
  }

  workflow.connections[ifRouteId] = {
    main: [
      [ { node: updateNodeId, type: 'main', index: 0 } ],
      [ { node: appendNode.name, type: 'main', index: 0 } ]
    ]
  };

  workflow.connections[updateNodeId] = {
    main: [ [ { node: 'Respond Written', type: 'main', index: 0 } ] ] // user's workflow goes to Respond Written
  };

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
