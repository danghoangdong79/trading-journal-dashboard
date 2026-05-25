const API_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM4MjA5OS1kYmVjLTQ3ZDctOGY1Mi04NDdmODgwYzhjZDgiLCJpc3MiOiJuOG4iLCJhdWQiOiJwdWJsaWMtYXBpIiwianRpIjoiMWNiYTUyZTItZWM0OS00MzQxLWIxZjctNDkzYWEzZDY3MWU0IiwiaWF0IjoxNzc2MTUwODcwfQ.R7JDZ62V1gQpI96WWbRF_L1DfrUv6Iz2kjKQ2MpOVOU';
const WORKFLOW_ID = 'iXKZjLQwoc5otveg';
const BASE = 'https://n8n.dahodo.com/api/v1';

async function main() {
  const res = await fetch(`${BASE}/workflows/${WORKFLOW_ID}`, { headers: { 'X-N8N-API-KEY': API_KEY } });
  const workflow = await res.json();
  
  const handleTextNode = workflow.nodes.find(n => n.name === 'Handle Text Commands');
  if (handleTextNode) {
     let jsCode = handleTextNode.parameters.jsCode;
     // Fix the loop that searches for pendingKey
     jsCode = jsCode.replace(
       `const k = 'pending_' + chatId + (i===0?'':'_'+i);`,
       `const k = 'pending_' + chatId + '_' + i;`
     );
     // For backwards compatibility during transition, also check without _0
     const robustSearch = `
  let pendingRaw = null;
  let foundPendingKey = null;
  for(let i=0; i<10; i++){
     let k = 'pending_' + chatId + '_' + i;
     if(staticData[k]) { pendingRaw = staticData[k]; foundPendingKey = k; break; }
     k = 'pending_' + chatId + (i===0?'':'_'+i);
     if(staticData[k]) { pendingRaw = staticData[k]; foundPendingKey = k; break; }
  }`;
     jsCode = jsCode.replace(/let pendingRaw = null;[\s\S]*?const pendingKey = foundPendingKey \|\| 'pending_' \+ chatId;/m, robustSearch + "\n  const pendingKey = foundPendingKey || 'pending_' + chatId + '_0';");
     
     handleTextNode.parameters.jsCode = jsCode;
  }

  const processCallbackNode = workflow.nodes.find(n => n.name === 'Process Callback');
  if (processCallbackNode) {
     let jsCode = processCallbackNode.parameters.jsCode;
     const robustSearch = `
  let foundPendingKey = null;
  for (let i = 0; i < 10; i++) {
    let key = 'pending_' + chatId + '_' + i;
    let raw = staticData[key];
    if (!raw) {
       key = 'pending_' + chatId + (i === 0 ? '' : '_' + i);
       raw = staticData[key];
    }`;
     jsCode = jsCode.replace(/let foundPendingKey = null;\n  for \(let i = 0; i < 10; i\+\+\) {\n    const key = 'pending_' \+ chatId \+ \(i === 0 \? '' : '_' \+ i\);\n    const raw = staticData\[key\];/m, robustSearch);
     
     processCallbackNode.parameters.jsCode = jsCode;
  }

  const updateRes = await fetch(`${BASE}/workflows/${WORKFLOW_ID}`, {
    method: 'PUT',
    headers: { 'X-N8N-API-KEY': API_KEY, 'Content-Type': 'application/json' },
    body: JSON.stringify({ name: workflow.name, nodes: workflow.nodes, connections: workflow.connections, settings: {} })
  });
  console.log(updateRes.ok ? '✅ SUCCESS' : '❌ FAILED');
}

main().catch(console.error);
