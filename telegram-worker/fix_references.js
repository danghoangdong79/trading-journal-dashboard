import fs from 'fs';

const API_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM4MjA5OS1kYmVjLTQ3ZDctOGY1Mi04NDdmODgwYzhjZDgiLCJpc3MiOiJuOG4iLCJhdWQiOiJwdWJsaWMtYXBpIiwianRpIjoiMWNiYTUyZTItZWM0OS00MzQxLWIxZjctNDkzYWEzZDY3MWU0IiwiaWF0IjoxNzc2MTUwODcwfQ.R7JDZ62V1gQpI96WWbRF_L1DfrUv6Iz2kjKQ2MpOVOU';
const WORKFLOW_ID = 'iXKZjLQwoc5otveg';
const BASE = 'https://n8n.dahodo.com/api/v1';

async function main() {
  const res = await fetch(`${BASE}/workflows/${WORKFLOW_ID}`, { headers: { 'X-N8N-API-KEY': API_KEY } });
  const workflow = await res.json();

  const telegramPendingNode = workflow.nodes.find(n => n.name === 'Telegram - Pending Saved');
  if (telegramPendingNode) {
    telegramPendingNode.parameters.chatId = "={{ $('Build Pending Row').item.json.sessionId }}";
    telegramPendingNode.parameters.text = "={{ '🕒 <b>Đã lưu lệnh chờ khớp</b>\\n\\n' + $('Build Pending Row').item.json.summary + '\\n\\nLệnh này chưa ghi JOURNAL. Gửi ảnh trạng thái Khớp để chuyển thành giao dịch.' }}";
  }

  const respondPendingNode = workflow.nodes.find(n => n.name === 'Respond Pending Saved');
  if (respondPendingNode) {
    respondPendingNode.parameters.responseBody = "={{ { ok:true, pending:true, message:\"Saved to ORDERS_PENDING\", draft:$('Build Pending Row').item.json.draft } }}";
  }

  // Double check if any other node downstream of Append JOURNAL Row or Update JOURNAL Row also suffers from this!
  // 'Respond Written' node:
  const respondWrittenNode = workflow.nodes.find(n => n.name === 'Respond Written');
  if (respondWrittenNode) {
    // If it uses $json.draft, it should use $('Parse + Validate Draft').item.json.draft
    const body = respondWrittenNode.parameters.responseBody;
    if (body && body.includes('$json.draft')) {
      respondWrittenNode.parameters.responseBody = body.replace(/\$json\.draft/g, "$('Parse + Validate Draft').item.json.draft");
    }
  }

  const telegramSuccessNode = workflow.nodes.find(n => n.name === 'Telegram - Success');
  if (telegramSuccessNode) {
    const text = telegramSuccessNode.parameters.text;
    if (text && text.includes('$json.summary')) {
       telegramSuccessNode.parameters.text = text.replace(/\$json\.summary/g, "$('Parse + Validate Draft').item.json.summary");
    }
    const chatId = telegramSuccessNode.parameters.chatId;
    if (chatId && chatId.includes('$json.sessionId')) {
       telegramSuccessNode.parameters.chatId = chatId.replace(/\$json\.sessionId/g, "$('Parse + Validate Draft').item.json.sessionId");
    }
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
