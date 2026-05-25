const API_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM4MjA5OS1kYmVjLTQ3ZDctOGY1Mi04NDdmODgwYzhjZDgiLCJpc3MiOiJuOG4iLCJhdWQiOiJwdWJsaWMtYXBpIiwianRpIjoiMWNiYTUyZTItZWM0OS00MzQxLWIxZjctNDkzYWEzZDY3MWU0IiwiaWF0IjoxNzc2MTUwODcwfQ.R7JDZ62V1gQpI96WWbRF_L1DfrUv6Iz2kjKQ2MpOVOU';
const WORKFLOW_ID = 'iXKZjLQwoc5otveg';
const BASE = 'https://n8n.dahodo.com/api/v1';

async function main() {
  const res = await fetch(`${BASE}/workflows/${WORKFLOW_ID}`, { headers: { 'X-N8N-API-KEY': API_KEY } });
  const workflow = await res.json();
  
  const notifyNode = workflow.nodes.find(n => n.name === 'Telegram - Notify Draft State');
  const parseNode = workflow.nodes.find(n => n.name === 'Parse + Validate Draft');
  const handleTextNode = workflow.nodes.find(n => n.name === 'Handle Text Commands');

  if (notifyNode) {
    let jsCode = notifyNode.parameters.jsCode;
    // Fix the duplicate options bug
    jsCode = jsCode.replace(`prefix = "mood";\n      options = validOrderTypes;\n      prefix = "type";`, `prefix = "mood";`);
    
    // Improve the text prompt
    const newTextLogic = `} else if (firstMissing === "Thuế phí") {
      text += "\\n\\n👇 Vui lòng <b>gõ một con số</b> để nhập <b>Thuế phí</b> (ví dụ: 50000). Nếu không có phí, hãy gõ số <b>0</b>.";
    } else {
      text += "\\n\\n👇 Gõ chữ để nhập <b>" + firstMissing.toLowerCase() + "</b>.";
    }`;
    jsCode = jsCode.replace(`} else {\n      text += "\\n\\n👇 Gõ text để nhập " + firstMissing.toLowerCase() + ".";\n    }`, newTextLogic);
    
    notifyNode.parameters.jsCode = jsCode;
  }

  // Swap Tâm lý and Thuế phí order so buttons appear before text input!
  if (parseNode) {
    let jsCode = parseNode.parameters.jsCode;
    jsCode = jsCode.replace(
      `if (draft.feesAndTaxes === undefined || draft.feesAndTaxes === null || draft.feesAndTaxes === '') missing.push("Thuế phí");\n  if (!draft.mood) missing.push("Tâm lý");`,
      `if (!draft.mood) missing.push("Tâm lý");\n  if (draft.feesAndTaxes === undefined || draft.feesAndTaxes === null || draft.feesAndTaxes === '') missing.push("Thuế phí");`
    );
    parseNode.parameters.jsCode = jsCode;
  }

  if (handleTextNode) {
    let jsCode = handleTextNode.parameters.jsCode;
    jsCode = jsCode.replace(
      `if (draft.feesAndTaxes === undefined || draft.feesAndTaxes === null || draft.feesAndTaxes === '') missing.push("Thuế phí");\n        if (!draft.mood) missing.push("Tâm lý");`,
      `if (!draft.mood) missing.push("Tâm lý");\n        if (draft.feesAndTaxes === undefined || draft.feesAndTaxes === null || draft.feesAndTaxes === '') missing.push("Thuế phí");`
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
