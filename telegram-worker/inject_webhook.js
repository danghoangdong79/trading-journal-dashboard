import fs from 'fs';

const API_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM4MjA5OS1kYmVjLTQ3ZDctOGY1Mi04NDdmODgwYzhjZDgiLCJpc3MiOiJuOG4iLCJhdWQiOiJwdWJsaWMtYXBpIiwianRpIjoiMWNiYTUyZTItZWM0OS00MzQxLWIxZjctNDkzYWEzZDY3MWU0IiwiaWF0IjoxNzc2MTUwODcwfQ.R7JDZ62V1gQpI96WWbRF_L1DfrUv6Iz2kjKQ2MpOVOU';
const WORKFLOW_ID = 'iXKZjLQwoc5otveg';
const BASE = 'https://n8n.dahodo.com/api/v1';

async function main() {
  const res = await fetch(`${BASE}/workflows/${WORKFLOW_ID}`, { headers: { 'X-N8N-API-KEY': API_KEY } });
  const workflow = await res.json();

  // Add a webhook node to dump headers
  const webhookNodeId = 'Webhook Dump Headers';
  if (!workflow.nodes.find(n => n.name === webhookNodeId)) {
    workflow.nodes.push({
      "parameters": {
        "path": "dump-headers",
        "responseMode": "lastNode",
        "options": {}
      },
      "id": "dump-headers-id",
      "name": webhookNodeId,
      "type": "n8n-nodes-base.webhook",
      "typeVersion": 1.1,
      "position": [0, -1000]
    });
    
    workflow.nodes.push({
      "parameters": {
        "operation": "read",
        "documentId": { "__rl": true, "value": "1PdCmBoBQsznOx6JXvOlbD-atxQnX9wHRXiM127f109I", "mode": "id" },
        "sheetName": { "__rl": true, "value": "913303097", "mode": "id" },
        "options": {
            "range": "A1:Z1"
        }
      },
      "id": "read-headers-id",
      "name": "Read JOURNAL Headers",
      "type": "n8n-nodes-base.googleSheets",
      "typeVersion": 4.5,
      "position": [200, -1000],
      "credentials": {
        "googleSheetsOAuth2Api": { "id": "uMPyR1KsuBFlgvwN", "name": "danghoangdong79" }
      }
    });

    workflow.connections[webhookNodeId] = {
      main: [ [ { node: "Read JOURNAL Headers", type: "main", index: 0 } ] ]
    };
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
