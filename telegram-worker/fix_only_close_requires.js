const API_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM4MjA5OS1kYmVjLTQ3ZDctOGY1Mi04NDdmODgwYzhjZDgiLCJpc3MiOiJuOG4iLCJhdWQiOiJwdWJsaWMtYXBpIiwianRpIjoiMWNiYTUyZTItZWM0OS00MzQxLWIxZjctNDkzYWEzZDY3MWU0IiwiaWF0IjoxNzc2MTUwODcwfQ.R7JDZ62V1gQpI96WWbRF_L1DfrUv6Iz2kjKQ2MpOVOU';
const WORKFLOW_ID = 'iXKZjLQwoc5otveg';
const BASE = 'https://n8n.dahodo.com/api/v1';

async function main() {
  const res = await fetch(`${BASE}/workflows/${WORKFLOW_ID}`, { headers: { 'X-N8N-API-KEY': API_KEY } });
  const workflow = await res.json();
  
  const nodesToPatch = ['Parse + Validate Draft', 'Handle Text Commands', 'Process Callback'];
  
  for (const nodeName of nodesToPatch) {
    const node = workflow.nodes.find(n => n.name === nodeName);
    if (node) {
      let jsCode = node.parameters.jsCode;
      
      const oldLogic = `if (!draft.mood) missing.push("Tâm lý");\n  if (draft.feesAndTaxes === undefined || draft.feesAndTaxes === null || draft.feesAndTaxes === '') missing.push("Thuế phí");\n  if (!draft.reviewNote) missing.push("Ghi chú");`;
      const oldLogic2 = `if (!draft.mood) missing.push("Tâm lý");\n        if (draft.feesAndTaxes === undefined || draft.feesAndTaxes === null || draft.feesAndTaxes === '') missing.push("Thuế phí");\n        if (!draft.reviewNote) missing.push("Ghi chú");`;
      
      const newLogic = `if (draft.action === 'close') {
    if (!draft.mood) missing.push("Tâm lý");
    if (draft.feesAndTaxes === undefined || draft.feesAndTaxes === null || draft.feesAndTaxes === '') missing.push("Thuế phí");
    if (!draft.reviewNote) missing.push("Ghi chú");
  }`;
      const newLogic2 = `if (draft.action === 'close') {
          if (!draft.mood) missing.push("Tâm lý");
          if (draft.feesAndTaxes === undefined || draft.feesAndTaxes === null || draft.feesAndTaxes === '') missing.push("Thuế phí");
          if (!draft.reviewNote) missing.push("Ghi chú");
        }`;
      
      if (jsCode.includes(oldLogic)) {
         jsCode = jsCode.replace(oldLogic, newLogic);
      } else if (jsCode.includes(oldLogic2)) {
         jsCode = jsCode.replace(oldLogic2, newLogic2);
      }
      
      node.parameters.jsCode = jsCode;
    }
  }

  const updateRes = await fetch(`${BASE}/workflows/${WORKFLOW_ID}`, {
    method: 'PUT',
    headers: { 'X-N8N-API-KEY': API_KEY, 'Content-Type': 'application/json' },
    body: JSON.stringify({ name: workflow.name, nodes: workflow.nodes, connections: workflow.connections, settings: {} })
  });
  console.log(updateRes.ok ? '✅ SUCCESS' : '❌ FAILED');
}

main().catch(console.error);
