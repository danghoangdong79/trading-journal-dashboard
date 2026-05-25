const API_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM4MjA5OS1kYmVjLTQ3ZDctOGY1Mi04NDdmODgwYzhjZDgiLCJpc3MiOiJuOG4iLCJhdWQiOiJwdWJsaWMtYXBpIiwianRpIjoiMWNiYTUyZTItZWM0OS00MzQxLWIxZjctNDkzYWEzZDY3MWU0IiwiaWF0IjoxNzc2MTUwODcwfQ.R7JDZ62V1gQpI96WWbRF_L1DfrUv6Iz2kjKQ2MpOVOU';
const WORKFLOW_ID = 'iXKZjLQwoc5otveg';
const BASE = 'https://n8n.dahodo.com/api/v1';

async function main() {
  const res = await fetch(`${BASE}/workflows/${WORKFLOW_ID}`, { headers: { 'X-N8N-API-KEY': API_KEY } });
  const workflow = await res.json();
  
  const parseNode = workflow.nodes.find(n => n.name === 'Parse + Validate Draft');
  const notifyNode = workflow.nodes.find(n => n.name === 'Telegram - Notify Draft State');
  const handleTextNode = workflow.nodes.find(n => n.name === 'Handle Text Commands');
  const extractNode = workflow.nodes.find(n => n.name === 'Vision Extract Image');

  // Update prompt
  if (extractNode) {
     extractNode.parameters.jsonBody = `={{ {
  "contents": [
    {
      "parts": [
        { "text": "Phân tích ảnh chụp màn hình chứng khoán/phái sinh Việt Nam. Trả về MẢNG JSON chứa TẤT CẢ các lệnh. TUYỆT ĐỐI BỎ QUA lệnh 'Đã hủy'. Ưu tiên tìm cột 'Loại lệnh' -> orderType. Trạng thái 'Chờ khớp' -> action='pending', 'Đã khớp' -> 'open' hoặc 'close'. Mã CK -> symbol. Mua -> LONG, Bán -> SHORT. Giá đặt/khớp -> entryPrice (open) hoặc exitPrice (close). KL -> volume. Số hiệu lệnh -> orderId. Tài khoản -> account. Thuế, phí, Phí GD (nếu có trong ảnh) -> feesAndTaxes (chỉ lấy số, ko có thì trả về null). Ghi chú (nếu có) -> reviewNote. Tâm lý (nếu có) -> mood. Schema: {action, account, orderId, assetType: 'Co phieu'|'Phai sinh', symbol, position: 'LONG'|'SHORT', orderType, strategy, openDate, openTime, closeDate, closeTime, volume, entryPrice, exitPrice, stopLoss, takeProfit, feesAndTaxes, mood, reviewNote}. KẾT QUẢ MẢNG JSON: [ {obj1}, {obj2} ]" },
        { "inline_data": { "mime_type": ($json.imageMimeType && $json.imageMimeType.startsWith('image/')) ? $json.imageMimeType : "image/jpeg", "data": $json.imageBase64 } }
      ]
    }
  ],
  "generationConfig": {
    "response_mime_type": "application/json"
  }
} }}`;
  }

  if (parseNode) {
    let jsCode = parseNode.parameters.jsCode;
    
    // Add validMoods array and fetch logic
    if (!jsCode.includes('let validMoods = [];')) {
      jsCode = jsCode.replace('let validOrderTypes = [];', 'let validOrderTypes = [];\nlet validMoods = [];');
      jsCode = jsCode.replace(`let stratIdx = headers.indexOf('CHIẾN LƯỢC'); if (stratIdx === -1) stratIdx = 2;`, `let stratIdx = headers.indexOf('CHIẾN LƯỢC'); if (stratIdx === -1) stratIdx = 2;\n      let moodIdx = headers.indexOf('TÂM LÝ'); if (moodIdx === -1) moodIdx = 3;`);
      jsCode = jsCode.replace(`if (cols.length > typeIdx) {`, `if (cols.length > moodIdx) {\n          const v = cols[moodIdx].replace(/"/g, '').trim();\n          if (v && v !== '#N/A' && !validMoods.includes(v)) validMoods.push(v);\n        }\n        if (cols.length > typeIdx) {`);
    }

    // Add strict validation for mood
    if (!jsCode.includes('draft.mood && validMoods.length > 0')) {
      jsCode = jsCode.replace(`if (draft.orderType && validOrderTypes.length > 0) {`, `if (draft.mood && validMoods.length > 0) {\n    const exact = validMoods.find(m => m.toLowerCase() === draft.mood.toLowerCase());\n    if (exact) draft.mood = exact; else draft.mood = '';\n  }\n  if (draft.orderType && validOrderTypes.length > 0) {`);
    }

    // Add missing checks
    if (!jsCode.includes('missing.push("Tâm lý");')) {
      jsCode = jsCode.replace(`if (draft.feesAndTaxes === undefined || draft.feesAndTaxes === null || draft.feesAndTaxes === '') missing.push("Thuế phí");`, `if (draft.feesAndTaxes === undefined || draft.feesAndTaxes === null || draft.feesAndTaxes === '') missing.push("Thuế phí");\n  if (!draft.mood) missing.push("Tâm lý");\n  if (!draft.reviewNote) missing.push("Ghi chú");`);
    }

    // Add to summary
    if (!jsCode.includes(`draft.mood ? 'Tâm lý: ' + draft.mood : ''`)) {
      jsCode = jsCode.replace(`(draft.feesAndTaxes !== undefined && draft.feesAndTaxes !== null && draft.feesAndTaxes !== '') ? ('Thuế phí: ' + draft.feesAndTaxes) : '',`, `(draft.feesAndTaxes !== undefined && draft.feesAndTaxes !== null && draft.feesAndTaxes !== '') ? ('Thuế phí: ' + draft.feesAndTaxes) : '',\n    draft.mood ? 'Tâm lý: ' + draft.mood : '',\n    draft.reviewNote ? 'Ghi chú: ' + draft.reviewNote : '',`);
    }
    parseNode.parameters.jsCode = jsCode;
  }

  if (notifyNode) {
    let jsCode = notifyNode.parameters.jsCode;
    // Add validMoods array and fetch logic
    if (!jsCode.includes('let validMoods = [];')) {
      jsCode = jsCode.replace('let validOrderTypes = [];', 'let validOrderTypes = [];\nlet validMoods = [];');
      jsCode = jsCode.replace(`let stratIdx = headers.indexOf('CHIẾN LƯỢC'); if (stratIdx === -1) stratIdx = 2;`, `let stratIdx = headers.indexOf('CHIẾN LƯỢC'); if (stratIdx === -1) stratIdx = 2;\n      let moodIdx = headers.indexOf('TÂM LÝ'); if (moodIdx === -1) moodIdx = 3;`);
      jsCode = jsCode.replace(`if (cols.length > typeIdx) {`, `if (cols.length > moodIdx) {\n          const v = cols[moodIdx].replace(/"/g, '').trim();\n          if (v && v !== '#N/A' && !validMoods.includes(v)) validMoods.push(v);\n        }\n        if (cols.length > typeIdx) {`);
    }

    // Add UI options for mood
    if (!jsCode.includes(`firstMissing === "Tâm lý"`)) {
      jsCode = jsCode.replace(`} else if (firstMissing === "Loại lệnh") {`, `} else if (firstMissing === "Loại lệnh") {\n      options = validOrderTypes;\n      prefix = "type";\n    } else if (firstMissing === "Tâm lý") {\n      options = validMoods;\n      prefix = "mood";`);
    }
    notifyNode.parameters.jsCode = jsCode;
  }

  if (handleTextNode) {
    let jsCode = handleTextNode.parameters.jsCode;
    
    // Add filling logic
    if (!jsCode.includes(`firstMissing === "Tâm lý"`)) {
      jsCode = jsCode.replace(`else if (firstMissing === "Thuế phí") draft.feesAndTaxes = parseFloat(text.replace(/[^0-9.-]+/g, '')) || 0;`, `else if (firstMissing === "Thuế phí") draft.feesAndTaxes = parseFloat(text.replace(/[^0-9.-]+/g, '')) || 0;\n        else if (firstMissing === "Tâm lý") draft.mood = text;\n        else if (firstMissing === "Ghi chú") draft.reviewNote = text;`);
    }

    // Add re-validation checks
    if (!jsCode.includes(`missing.push("Tâm lý");`)) {
      jsCode = jsCode.replace(`if (draft.feesAndTaxes === undefined || draft.feesAndTaxes === null || draft.feesAndTaxes === '') missing.push("Thuế phí");`, `if (draft.feesAndTaxes === undefined || draft.feesAndTaxes === null || draft.feesAndTaxes === '') missing.push("Thuế phí");\n        if (!draft.mood) missing.push("Tâm lý");\n        if (!draft.reviewNote) missing.push("Ghi chú");`);
    }

    // Add to summary
    if (!jsCode.includes(`draft.mood ? 'Tâm lý: ' + draft.mood : ''`)) {
      jsCode = jsCode.replace(`(draft.feesAndTaxes !== undefined && draft.feesAndTaxes !== null && draft.feesAndTaxes !== '') ? 'Thuế phí: ' + draft.feesAndTaxes : '',`, `(draft.feesAndTaxes !== undefined && draft.feesAndTaxes !== null && draft.feesAndTaxes !== '') ? 'Thuế phí: ' + draft.feesAndTaxes : '',\n          draft.mood ? 'Tâm lý: ' + draft.mood : '',\n          draft.reviewNote ? 'Ghi chú: ' + draft.reviewNote : '',`);
    }
    
    // UPDATE HELP TEXT
    const newHelpText = `<b>🤖 Hướng dẫn sử dụng Bot Ghi Nhật Ký Giao Dịch</b>

1️⃣ <b>Cách ghi lệnh (Nhận diện tự động)</b>
• Gửi <b>một tấm ảnh</b> chụp màn hình lệnh từ app giao dịch (SSI, TCBS, VPS...).
• Bot sẽ tự phân tích và nhận diện. 
• Nếu lệnh thiếu thông tin (Thuế phí, Tâm lý, Ghi chú...), bot sẽ <b>hỏi bạn bổ sung</b> bằng cách hiện nút bấm hoặc yêu cầu bạn gõ văn bản.
• Gõ xong, bấm <b>✅ Xác nhận</b> để ghi vào Google Sheet.

💡 <i>Mẹo: Bot có khả năng tự phát hiện nếu bạn gửi ảnh đóng lệnh (ngược chiều vị thế đang mở) và tự tính toán Lãi/Lỗ.</i>

2️⃣ <b>Cách tra cứu dữ liệu</b>
• Gõ: <code>/tracuu [Từ khóa]</code> (Ví dụ: <code>/tracuu VN30F</code>, <code>/tracuu 05/2026</code>)
• Bot sẽ thống kê TỔNG QUAN tỷ lệ Thắng/Thua, Tổng PnL của từ khóa đó.
• Liệt kê nhanh 10 lệnh gần nhất.

3️⃣ <b>Các lệnh hệ thống</b>
• <code>/start</code> - Khởi động lại bot.
• <code>/help</code> - Xem lại hướng dẫn này.
`;

    jsCode = jsCode.replace(/if \(textLower === '\/help'[\s\S]*?\}\)/, `if (textLower === '/help' || textLower === '/start') {
  await this.helpers.httpRequest({
    method: 'POST', url: 'https://api.telegram.org/bot' + botToken + '/sendMessage',
    body: { chat_id: chatId, text: \`${newHelpText}\`, parse_mode: 'HTML' },
    headers: { 'Content-Type': 'application/json' }
  });
  return [];
}`);

    handleTextNode.parameters.jsCode = jsCode;
  }

  const updateRes = await fetch(`${BASE}/workflows/${WORKFLOW_ID}`, {
    method: 'PUT',
    headers: { 'X-N8N-API-KEY': API_KEY, 'Content-Type': 'application/json' },
    body: JSON.stringify({ name: workflow.name, nodes: workflow.nodes, connections: workflow.connections, settings: {} })
  });
  console.log(updateRes.ok ? '✅ SUCCESS' : '❌ FAILED');
}

main().catch(console.error);
