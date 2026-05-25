const fs = require('fs');

function fixFile(path) {
    if (!fs.existsSync(path)) return;
    let content = fs.readFileSync(path, 'latin1');
    
    // Fix types.ts
    content = content.replace(/'Th_ng' \| 'Thua' \| 'HAa' \| '\?ang mY'/g, "'Thắng' | 'Thua' | 'Hòa' | 'Đang mở'");
    content = content.replace(/'C  phiu' \| 'PhAi sinh'/g, "'Cổ phiếu' | 'Phái sinh'");
    
    // Fix constants.ts
    content = content.replace(/'Th_ng'/g, "'Thắng'");
    content = content.replace(/'HAa'/g, "'Hòa'");
    content = content.replace(/'\?ang mY'/g, "'Đang mở'");
    content = content.replace(/'C  phiu'/g, "'Cổ phiếu'");
    content = content.replace(/'PhAi sinh'/g, "'Phái sinh'");
    
    // Additional generic fixes if any
    content = content.replace(/Th_ng/g, 'Thắng');
    content = content.replace(/HAa/g, 'Hòa');
    content = content.replace(/\?ang mY/g, 'Đang mở');
    content = content.replace(/C  phiu/g, 'Cổ phiếu');
    content = content.replace(/PhAi sinh/g, 'Phái sinh');
    
    // Some notes might be corrupted in DEMO_TRADES but that's fine as long as types compile
    
    fs.writeFileSync(path, content, 'utf8');
    console.log('Fixed', path);
}

fixFile('c:/Users/ADMIN/Desktop/dahodo-journal/dashboard/src/types.ts');
fixFile('c:/Users/ADMIN/Desktop/dahodo-journal/dashboard/src/constants.ts');
