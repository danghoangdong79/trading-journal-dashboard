const API_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM4MjA5OS1kYmVjLTQ3ZDctOGY1Mi04NDdmODgwYzhjZDgiLCJpc3MiOiJuOG4iLCJhdWQiOiJwdWJsaWMtYXBpIiwianRpIjoiMWNiYTUyZTItZWM0OS00MzQxLWIxZjctNDkzYWEzZDY3MWU0IiwiaWF0IjoxNzc2MTUwODcwfQ.R7JDZ62V1gQpI96WWbRF_L1DfrUv6Iz2kjKQ2MpOVOU';
const BASE = 'https://n8n.dahodo.com/api/v1';

async function main() {
  const workflow = {
    name: 'Temp Reader 2',
    nodes: [
      {
        parameters: { rule: { interval: [{ field: "minutes", minutesInterval: 1 }] } },
        id: "trigger", name: "Schedule", type: "n8n-nodes-base.scheduleTrigger", typeVersion: 1.1, position: [0, 0]
      },
      {
        parameters: {
          documentId: { __rl: true, value: "1PdCmBoBQsznOx6JXvOlbD-atxQnX9wHRXiM127f109I", mode: "id" },
          sheetName: { __rl: true, value: "FORMULAS", mode: "name" },
          options: {}
        },
        id: "read-sheet", name: "Read FORMULAS", type: "n8n-nodes-base.googleSheets", typeVersion: 4.5, position: [200, 0],
        credentials: { googleSheetsOAuth2Api: { id: "uMPyR1KsuBFlgvwN", name: "danghoangdong79" } }
      },
      {
        parameters: {
          jsCode: `
const fs = require('fs');
fs.writeFileSync('/tmp/formulas.json', JSON.stringify($input.all().map(i => i.json), null, 2));
return $input.all();
`
        },
        id: "save-json", name: "Save", type: "n8n-nodes-base.code", typeVersion: 2, position: [400, 0]
      }
    ],
    connections: { Schedule: { main: [[{ node: "Read FORMULAS", type: "main", index: 0 }]] }, "Read FORMULAS": { main: [[{ node: "Save", type: "main", index: 0 }]] } },
    active: false
  };

  const createRes = await fetch(`${BASE}/workflows`, {
    method: 'POST', headers: { 'X-N8N-API-KEY': API_KEY, 'Content-Type': 'application/json' },
    body: JSON.stringify(workflow)
  });
  const data = await createRes.json();
  console.log('Created:', data.id);
  
  // Now run it once via API
  if (data.id) {
    const runRes = await fetch(`${BASE}/workflows/${data.id}/run`, {
      method: 'POST', headers: { 'X-N8N-API-KEY': API_KEY, 'Content-Type': 'application/json' },
      body: JSON.stringify({})
    });
    console.log('Run:', await runRes.text());
  }
}

main().catch(console.error);
