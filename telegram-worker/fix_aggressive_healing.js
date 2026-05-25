const API_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM4MjA5OS1kYmVjLTQ3ZDctOGY1Mi04NDdmODgwYzhjZDgiLCJpc3MiOiJuOG4iLCJhdWQiOiJwdWJsaWMtYXBpIiwianRpIjoiMWNiYTUyZTItZWM0OS00MzQxLWIxZjctNDkzYWEzZDY3MWU0IiwiaWF0IjoxNzc2MTUwODcwfQ.R7JDZ62V1gQpI96WWbRF_L1DfrUv6Iz2kjKQ2MpOVOU';
const WORKFLOW_ID = 'iXKZjLQwoc5otveg';
const BASE = 'https://n8n.dahodo.com/api/v1';

async function main() {
  const res = await fetch(`${BASE}/workflows/${WORKFLOW_ID}`, { headers: { 'X-N8N-API-KEY': API_KEY } });
  const workflow = await res.json();
  
  const parseNode = workflow.nodes.find(n => n.name === 'Parse + Validate Draft');
  if (parseNode) {
     let jsCode = parseNode.parameters.jsCode;
     
     // Remove aggressive symbol healing that causes order IDs to be treated as stocks
     const badLogic = `if (/^[0-9]{2}[A-Z]/.test(sym) || sym.startsWith('41') || sym.length > 5 || sym.length === 3) {`;
     const goodLogic = `if (/^[0-9]{2}[A-Z]/.test(sym) && sym.length === 8) { // Covered warrants usually 8 chars e.g. CFPT2201
       draft.assetType = 'Cổ phiếu';
    } else if (sym.length === 3) {
       draft.assetType = 'Cổ phiếu';`;
       
     if (jsCode.includes(badLogic)) {
        jsCode = jsCode.replace(badLogic, goodLogic);
        parseNode.parameters.jsCode = jsCode;
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
