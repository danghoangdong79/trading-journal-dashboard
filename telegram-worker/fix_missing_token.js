const API_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM4MjA5OS1kYmVjLTQ3ZDctOGY1Mi04NDdmODgwYzhjZDgiLCJpc3MiOiJuOG4iLCJhdWQiOiJwdWJsaWMtYXBpIiwianRpIjoiMWNiYTUyZTItZWM0OS00MzQxLWIxZjctNDkzYWEzZDY3MWU0IiwiaWF0IjoxNzc2MTUwODcwfQ.R7JDZ62V1gQpI96WWbRF_L1DfrUv6Iz2kjKQ2MpOVOU';
const WORKFLOW_ID = 'iXKZjLQwoc5otveg';
const BASE = 'https://n8n.dahodo.com/api/v1';

async function main() {
  const res = await fetch(`${BASE}/workflows/${WORKFLOW_ID}`, { headers: { 'X-N8N-API-KEY': API_KEY } });
  const workflow = await res.json();
  const notifyNode = workflow.nodes.find(n => n.name === 'Telegram - Notify Draft State');

  if (notifyNode) {
    const jsCode = notifyNode.parameters.jsCode;
    
    // Add tokenPayload to the missing info text
    const searchStr = `  } else {
    text += "\\n\\n👇 Gõ text để nhập " + firstMissing.toLowerCase() + ".";
  }`;
    
    const replaceStr = `  } else {
    text += "\\n\\n👇 Gõ text để nhập " + firstMissing.toLowerCase() + ".";
  }
  
  // Attach token payload as an invisible link so Process Callback can identify the trade
  if (tokenPayload) {
    text += '\\n<a href="tg://btn/' + tokenPayload + '">\\u200b</a>';
  }`;

    notifyNode.parameters.jsCode = jsCode.replace(searchStr, replaceStr);
  }

  const updateRes = await fetch(`${BASE}/workflows/${WORKFLOW_ID}`, {
    method: 'PUT',
    headers: { 'X-N8N-API-KEY': API_KEY, 'Content-Type': 'application/json' },
    body: JSON.stringify({ name: workflow.name, nodes: workflow.nodes, connections: workflow.connections, settings: {} })
  });
  console.log(updateRes.ok ? '✅ SUCCESS' : '❌ FAILED');
}

main().catch(console.error);
