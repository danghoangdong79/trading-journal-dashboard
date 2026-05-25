const fs = require('fs');

function fixFile(path) {
    if (!fs.existsSync(path)) return;
    let content = fs.readFileSync(path, 'latin1');
    content = content.replace(/if \(normalized === 'thang'\) return '[^']+';/g, "if (normalized === 'thang') return 'Thắng';");
    content = content.replace(/if \(normalized === 'thua'\) return '[^']+';/g, "if (normalized === 'thua') return 'Thua';");
    content = content.replace(/if \(normalized === 'hoa'\) return '[^']+';/g, "if (normalized === 'hoa') return 'Hòa';");
    content = content.replace(/if \(normalized === 'dang mo'\) return '[^']+';\s*return '[^']+';/g, "if (normalized === 'dang mo') return 'Đang mở';\r\n    return 'Đang mở';");
    content = content.replace(/return normalizeText\(value\) === 'phai sinh' \? '[^']+' : '[^']+';/g, "return normalizeText(value) === 'phai sinh' ? 'Phái sinh' : 'Cổ phiếu';");
    
    // Additional generic fixes if any other strings were corrupted
    content = content.replace(/ang/g, 'Đang');
    
    fs.writeFileSync(path, content, 'utf8');
    console.log('Fixed', path);
}

fixFile('c:/Users/ADMIN/Desktop/dahodo-journal/api/src/server.js');
fixFile('c:/Users/ADMIN/Desktop/dahodo-journal/apps-script-dashboard/Code.gs');
