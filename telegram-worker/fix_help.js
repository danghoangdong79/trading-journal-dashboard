const API_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM4MjA5OS1kYmVjLTQ3ZDctOGY1Mi04NDdmODgwYzhjZDgiLCJpc3MiOiJuOG4iLCJhdWQiOiJwdWJsaWMtYXBpIiwianRpIjoiMWNiYTUyZTItZWM0OS00MzQxLWIxZjctNDkzYWEzZDY3MWU0IiwiaWF0IjoxNzc2MTUwODcwfQ.R7JDZ62V1gQpI96WWbRF_L1DfrUv6Iz2kjKQ2MpOVOU';
const WORKFLOW_ID = 'iXKZjLQwoc5otveg';
const BASE = 'https://n8n.dahodo.com/api/v1';

async function main() {
  const res = await fetch(`${BASE}/workflows/${WORKFLOW_ID}`, { headers: { 'X-N8N-API-KEY': API_KEY } });
  const workflow = await res.json();
  const handleTextCmds = workflow.nodes.find(n => n.name === 'Handle Text Commands');

  if (handleTextCmds) {
    const jsCode = handleTextCmds.parameters.jsCode;
    // Replace the old help message array logic
    const startIdx = jsCode.indexOf("const helpMsg = [");
    const endIdx = jsCode.indexOf("].join('\\n');") + "].join('\\n');".length;
    
    if (startIdx !== -1 && endIdx !== -1) {
      const newHelp = `const helpMsg = [
    '📖 <b>Hướng Dẫn Dahodo Journal Bot</b>',
    '',
    '📸 <b>1. Ghi lệnh tự động bằng ảnh:</b>',
    '• Chụp ảnh màn hình lệnh từ app/web của sàn.',
    '• Gửi thẳng vào đây, AI sẽ tự đọc Mã, Giá, Khối lượng, v.v.',
    '• Nếu thiếu thông tin (Chiến lược, Loại lệnh...), bot sẽ hiện <b>nút bấm tương tác</b> để bạn chọn nhanh.',
    '• <i>Lưu ý: Các lựa chọn (Chiến lược, Loại lệnh) được tự động đồng bộ từ tab FORMULAS trên Google Sheet!</i>',
    '',
    '🔍 <b>2. Tra cứu nhanh lệnh cũ:</b>',
    'Gõ: <code>/tracuu [mã CK]</code>',
    '→ VD: <code>/tracuu VN30F1M</code>',
    'Bot sẽ trả về 5 lệnh gần nhất của mã này.',
    '',
    '📝 <b>3. Cập nhật thông tin nhanh:</b>',
    'Khi bot báo thiếu thông tin, ngoài việc bấm nút, bạn cũng có thể <b>trực tiếp gõ nội dung</b> gửi lên, bot sẽ hiểu và tự điền vào form đang chờ.',
    '',
    '⚙️ <b>Phân luồng dữ liệu (Tự động):</b>',
    '• 🟡 <b>Lệnh Chờ:</b> Ghi vào tab <code>ORDERS_PENDING</code>.',
    '• 🟢 <b>Mở Lệnh:</b> Ghi dòng mới vào tab <code>JOURNAL</code>.',
    '• 🔴 <b>Đóng Lệnh:</b> Tìm và cập nhật giá đóng/thời gian đóng vào dòng cũ trong <code>JOURNAL</code>.',
  ].join('\\n');`;
      
      handleTextCmds.parameters.jsCode = jsCode.substring(0, startIdx) + newHelp + jsCode.substring(endIdx);
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
