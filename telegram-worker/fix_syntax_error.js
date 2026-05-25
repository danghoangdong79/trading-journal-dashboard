const API_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM4MjA5OS1kYmVjLTQ3ZDctOGY1Mi04NDdmODgwYzhjZDgiLCJpc3MiOiJuOG4iLCJhdWQiOiJwdWJsaWMtYXBpIiwianRpIjoiMWNiYTUyZTItZWM0OS00MzQxLWIxZjctNDkzYWEzZDY3MWU0IiwiaWF0IjoxNzc2MTUwODcwfQ.R7JDZ62V1gQpI96WWbRF_L1DfrUv6Iz2kjKQ2MpOVOU';
const WORKFLOW_ID = 'iXKZjLQwoc5otveg';
const BASE = 'https://n8n.dahodo.com/api/v1';

async function main() {
  const res = await fetch(`${BASE}/workflows/${WORKFLOW_ID}`, { headers: { 'X-N8N-API-KEY': API_KEY } });
  const workflow = await res.json();
  const handleTextCmds = workflow.nodes.find(n => n.name === 'Handle Text Commands');

  if (handleTextCmds) {
    const jsCode = handleTextCmds.parameters.jsCode;
    
    // Fix the syntax error: remove the first `const pendingKey = 'pending_' + chatId;` 
    // inside the `// ── Check if this is a text reply to fill missing fields ──` block.
    
    // We will just do a string replace
    const badStr = `  const staticData = $getWorkflowStaticData('global');
  const pendingKey = 'pending_' + chatId;
  
  let pendingRaw = null;
  let foundPendingKey = null;
  for(let i=0; i<10; i++){
     const k = 'pending_' + chatId + (i===0?'':'_'+i);
     if(staticData[k]) { pendingRaw = staticData[k]; foundPendingKey = k; break; }
  }
  const pendingKey = foundPendingKey || 'pending_' + chatId;`;
  
    const goodStr = `  const staticData = $getWorkflowStaticData('global');
  
  let pendingRaw = null;
  let foundPendingKey = null;
  for(let i=0; i<10; i++){
     const k = 'pending_' + chatId + (i===0?'':'_'+i);
     if(staticData[k]) { pendingRaw = staticData[k]; foundPendingKey = k; break; }
  }
  const pendingKey = foundPendingKey || 'pending_' + chatId;`;

    handleTextCmds.parameters.jsCode = jsCode.replace(badStr, goodStr);
  }

  const updateRes = await fetch(`${BASE}/workflows/${WORKFLOW_ID}`, {
    method: 'PUT',
    headers: { 'X-N8N-API-KEY': API_KEY, 'Content-Type': 'application/json' },
    body: JSON.stringify({ name: workflow.name, nodes: workflow.nodes, connections: workflow.connections, settings: {} })
  });
  console.log(updateRes.ok ? '✅ SUCCESS' : '❌ FAILED');
}

main().catch(console.error);
