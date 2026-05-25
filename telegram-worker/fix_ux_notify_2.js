const API_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM4MjA5OS1kYmVjLTQ3ZDctOGY1Mi04NDdmODgwYzhjZDgiLCJpc3MiOiJuOG4iLCJhdWQiOiJwdWJsaWMtYXBpIiwianRpIjoiMWNiYTUyZTItZWM0OS00MzQxLWIxZjctNDkzYWEzZDY3MWU0IiwiaWF0IjoxNzc2MTUwODcwfQ.R7JDZ62V1gQpI96WWbRF_L1DfrUv6Iz2kjKQ2MpOVOU';
const WORKFLOW_ID = 'iXKZjLQwoc5otveg';
const BASE = 'https://n8n.dahodo.com/api/v1';

async function main() {
  const res = await fetch(`${BASE}/workflows/${WORKFLOW_ID}`, { headers: { 'X-N8N-API-KEY': API_KEY } });
  const workflow = await res.json();
  const notifyNode = workflow.nodes.find(n => n.name === 'Telegram - Notify Draft State');

  if (notifyNode) {
    let jsCode = notifyNode.parameters.jsCode;
    
    // Replace the missing list generation
    jsCode = jsCode.replace(
      `let text = "📋 <b>Thông tin đã nhận:</b>\\n\\n" + summary + "\\n\\n⚠️ <b>Cần bổ sung:</b>\\n" + missing.map(f => "• " + f).join("\\n");`,
      `let text = "📋 <b>Thông tin đã nhận:</b>\\n\\n" + summary;`
    );
    
    const newMissingLogic = `
    const firstMissing = missing[0];
    text += "\\n\\n⚠️ <b>Cần bổ sung (Còn " + missing.length + " mục):</b>\\n" + missing.map(f => (f === firstMissing ? "👉 <b>" + f + "</b> (Đang chờ nhập)" : "• " + f)).join("\\n");
    let options = [];
    `;
    
    jsCode = jsCode.replace(`const firstMissing = missing[0];\n    let options = [];`, newMissingLogic);

    // Replace the prompts to be friendlier
    jsCode = jsCode.replace(`text += "\\n\\n👇 Chọn " + firstMissing.toLowerCase() + " hoặc gõ phím để nhập mới:";`, `text += "\\n\\n👇 Mời anh chọn <b>" + firstMissing + "</b> ở các nút bên dưới, hoặc gõ chữ để nhập tay:";`);
    jsCode = jsCode.replace(`text += "\\n\\n👇 Vui lòng <b>gõ một con số</b> để nhập <b>Thuế phí</b> (ví dụ: 50000). Nếu không có phí, hãy gõ số <b>0</b>.";`, `text += "\\n\\n👇 Mục <b>Thuế phí</b>: Mời anh gõ một con số (Ví dụ: 50000). Nếu không có phí, hãy gõ số <b>0</b>.";`);
    jsCode = jsCode.replace(`text += "\\n\\n👇 Gõ chữ để nhập <b>" + firstMissing.toLowerCase() + "</b>.";`, `text += "\\n\\n👇 Mục <b>" + firstMissing + "</b>: Mời anh gõ chữ để trả lời.";`);

    notifyNode.parameters.jsCode = jsCode;
  }
  
  const handleTextNode = workflow.nodes.find(n => n.name === 'Handle Text Commands');
  if (handleTextNode) {
     let jsCode = handleTextNode.parameters.jsCode;
     // Update the error text there too
     jsCode = jsCode.replace(
        `body: { chat_id: chatId, text: '⚠️ <b>Vẫn thiếu:</b>\\n' + missing.map(f => '• ' + f).join('\\n'), parse_mode: 'HTML' },`,
        `body: { chat_id: chatId, text: '⚠️ <b>Còn thiếu ' + missing.length + ' mục:</b>\\n' + missing.map(f => (f === missing[0] ? '👉 <b>' + f + '</b> (Đang chờ nhập)' : '• ' + f)).join('\\n'), parse_mode: 'HTML' },`
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
