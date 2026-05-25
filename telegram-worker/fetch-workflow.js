import fs from 'fs';

const API_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM4MjA5OS1kYmVjLTQ3ZDctOGY1Mi04NDdmODgwYzhjZDgiLCJpc3MiOiJuOG4iLCJhdWQiOiJwdWJsaWMtYXBpIiwianRpIjoiMWNiYTUyZTItZWM0OS00MzQxLWIxZjctNDkzYWEzZDY3MWU0IiwiaWF0IjoxNzc2MTUwODcwfQ.R7JDZ62V1gQpI96WWbRF_L1DfrUv6Iz2kjKQ2MpOVOU';
const WORKFLOW_ID = 'iXKZjLQwoc5otveg';
const BASE = 'https://n8n.dahodo.com/api/v1';

async function main() {
  const res = await fetch(`${BASE}/workflows/${WORKFLOW_ID}`, {
    headers: { 'X-N8N-API-KEY': API_KEY }
  });
  const workflow = await res.json();
  
  // 1. Add IF Node for Routing
  const appendNode = workflow.nodes.find(n => n.name === 'Append JOURNAL Row');
  const ifRouteId = 'Is Action Close?';
  const ifNode = {
    "parameters": {
      "conditions": {
        "string": [
          {
            "value1": "={{ $json.draft.action }}",
            "operation": "equal",
            "value2": "close"
          }
        ]
      }
    },
    "id": "e6a0d2f0-1e5b-4c7b-8c8a-9c6d4d1e7c9c",
    "name": ifRouteId,
    "type": "n8n-nodes-base.if",
    "typeVersion": 1,
    "position": [ appendNode.position[0] - 200, appendNode.position[1] ]
  };

  if (!workflow.nodes.find(n => n.name === ifRouteId)) workflow.nodes.push(ifNode);

  // 2. Add Update Node
  const updateNodeId = 'Update JOURNAL Row';
  const updateNode = JSON.parse(JSON.stringify(appendNode));
  updateNode.name = updateNodeId;
  updateNode.id = "e6a0d2f0-1e5b-4c7b-8c8a-9c6d4d1e7c9d";
  updateNode.position = [ appendNode.position[0], appendNode.position[1] + 200 ];
  updateNode.parameters.operation = "update";
  updateNode.parameters.columns.matchingColumns = ["Số hiệu lệnh"];
  updateNode.parameters.columns.value = {
    "Số hiệu lệnh": "={{ $json.draft.orderId || \"\" }}",
    "Ngay Dong": "={{ $json.draft.closeDate || \"\" }}",
    "Gio Dong": "={{ $json.draft.closeTime || \"\" }}",
    "Gia Dong": "={{ $json.draft.exitPrice || \"\" }}",
    "Phi & Thue": "={{ $json.draft.feesAndTaxes || \"\" }}",
    "Ghi Chu": "={{ $json.draft.reviewNote || \"\" }}"
  };

  if (!workflow.nodes.find(n => n.name === updateNodeId)) workflow.nodes.push(updateNode);

  // 3. Update connections
  const ifCallbackNode = 'If Callback == confirm';
  
  // Remove connection from If Callback to Append, add to If Route
  if (workflow.connections[ifCallbackNode] && workflow.connections[ifCallbackNode].main[0]) {
    workflow.connections[ifCallbackNode].main[0] = [ { node: ifRouteId, type: 'main', index: 0 } ];
  }

  // If Route [0] (true) -> Update
  // If Route [1] (false) -> Append
  workflow.connections[ifRouteId] = {
    main: [
      [ { node: updateNode.name, type: 'main', index: 0 } ],
      [ { node: appendNode.name, type: 'main', index: 0 } ]
    ]
  };

  // Connect Update to Telegram Success
  workflow.connections[updateNode.name] = {
    main: [ [ { node: 'Telegram - Success', type: 'main', index: 0 } ] ]
  };

  // Remove switch node if exists
  workflow.nodes = workflow.nodes.filter(n => n.name !== 'Action Route');
  delete workflow.connections['Action Route'];

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
  
  if (updateRes.ok) {
     console.log('Update Success!');
  } else {
     console.log('Update res:', await updateRes.text());
  }
}

main().catch(console.error);
