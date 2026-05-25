const API_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM4MjA5OS1kYmVjLTQ3ZDctOGY1Mi04NDdmODgwYzhjZDgiLCJpc3MiOiJuOG4iLCJhdWQiOiJwdWJsaWMtYXBpIiwianRpIjoiMWNiYTUyZTItZWM0OS00MzQxLWIxZjctNDkzYWEzZDY3MWU0IiwiaWF0IjoxNzc2MTUwODcwfQ.R7JDZ62V1gQpI96WWbRF_L1DfrUv6Iz2kjKQ2MpOVOU';
const WORKFLOW_ID = 'iXKZjLQwoc5otveg';
const BASE = 'https://n8n.dahodo.com/api/v1';

async function main() {
  const res = await fetch(`${BASE}/workflows/${WORKFLOW_ID}`, { headers: { 'X-N8N-API-KEY': API_KEY } });
  const workflow = await res.json();
  const handleTextNode = workflow.nodes.find(n => n.name === 'Handle Text Commands');

  if (handleTextNode) {
    let jsCode = handleTextNode.parameters.jsCode;
    
    // Inject the re-detect logic right before "// Re-validate"
    const detectLogic = `
        // --- AUTO-DETECT AFTER FILLING ---
        if (draft.symbol && draft.position && (firstMissing === "Mã GD" || firstMissing === "Vị thế" || firstMissing === "Tài khoản")) {
          try {
             const sheetId = $('Global Config').first().json.SHEET_ID;
             const apiRes = await this.helpers.httpRequest({
                method: 'GET', url: 'https://journal-api.dahodo.com/api/trades?sheetId=' + sheetId
             });
             if (apiRes && apiRes.trades) {
                const activeTrades = apiRes.trades.filter(t => t.status === 'Đang mở');
                const sym = draft.symbol.trim().toUpperCase();
                const pos = draft.position.trim().toUpperCase();
                const existingTrade = activeTrades.find(t => 
                  t.symbol.trim().toUpperCase() === sym && 
                  (!draft.account || t.account === draft.account)
                );
                
                if (existingTrade) {
                  const isOpposite = (existingTrade.position === 'LONG' && pos === 'SHORT') || 
                                     (existingTrade.position === 'SHORT' && pos === 'LONG');
                  if (isOpposite) {
                     draft.action = 'close';
                     // Inherit existing values for close
                     draft.entryPrice = existingTrade.entryPrice; 
                     draft.orderId = existingTrade.orderId;
                     draft.strategy = existingTrade.strategy || draft.strategy;
                  } else {
                     draft.action = 'open';
                  }
                }
             }
          } catch(e) {}
        }
        
        // Re-validate`;
        
    jsCode = jsCode.replace('// Re-validate', detectLogic);
    
    // Also, if the action switches to 'close', we don't need 'Chiến lược' to be asked again if it's already inherited.
    // The validation logic already says `if (!draft.strategy && draft.action === 'open') missing.push("Chiến lược");`
    // Oh wait! In Handle Text Commands, the re-validation was:
    // `if (!draft.strategy) missing.push("Chiến lược");` -> which forces strategy EVEN FOR CLOSE TRADES.
    // Let's fix that!
    jsCode = jsCode.replace(
      `if (!draft.strategy) missing.push("Chiến lược");`,
      `if (!draft.strategy && draft.action === 'open') missing.push("Chiến lược");`
    );

    handleTextNode.parameters.jsCode = jsCode;

    const updateRes = await fetch(`${BASE}/workflows/${WORKFLOW_ID}`, {
      method: 'PUT',
      headers: { 'X-N8N-API-KEY': API_KEY, 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: workflow.name, nodes: workflow.nodes, connections: workflow.connections, settings: {} })
    });
    console.log(updateRes.ok ? '✅ SUCCESS' : '❌ FAILED');
  }
}

main().catch(console.error);
