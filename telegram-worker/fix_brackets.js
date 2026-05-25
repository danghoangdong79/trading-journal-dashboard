import fs from 'fs';

const API_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM4MjA5OS1kYmVjLTQ3ZDctOGY1Mi04NDdmODgwYzhjZDgiLCJpc3MiOiJuOG4iLCJhdWQiOiJwdWJsaWMtYXBpIiwianRpIjoiMWNiYTUyZTItZWM0OS00MzQxLWIxZjctNDkzYWEzZDY3MWU0IiwiaWF0IjoxNzc2MTUwODcwfQ.R7JDZ62V1gQpI96WWbRF_L1DfrUv6Iz2kjKQ2MpOVOU';
const WORKFLOW_ID = 'iXKZjLQwoc5otveg';
const BASE = 'https://n8n.dahodo.com/api/v1';

async function main() {
  const res = await fetch(`${BASE}/workflows/${WORKFLOW_ID}`, { headers: { 'X-N8N-API-KEY': API_KEY } });
  const workflow = await res.json();

  const node = workflow.nodes.find(n => n.name === 'Append ORDERS_PENDING Row');
  if (node) {
    const vals = node.parameters.columns.value;
    // Fix single bracket issues
    if (vals['Trạng thái'] && vals['Trạng thái'].startsWith('={ ')) {
        vals['Trạng thái'] = vals['Trạng thái'].replace('={ ', '={{ ').replace(' }', ' }}');
    }
    if (vals['Loại lệnh'] && vals['Loại lệnh'].startsWith('={ ')) {
        vals['Loại lệnh'] = vals['Loại lệnh'].replace('={ ', '={{ ').replace(' }', ' }}');
    }
    if (vals['Ghi chú'] && vals['Ghi chú'].startsWith('={ ')) {
        vals['Ghi chú'] = vals['Ghi chú'].replace('={ ', '={{ ').replace(' }', ' }}');
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
