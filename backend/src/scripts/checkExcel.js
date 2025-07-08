const XLSX = require('xlsx');
const path = require('path');

const filePath = path.join(__dirname, '../../../docs/ナンバーズ4抽せん数字一覧表.xlsx');

// Excelファイルを読み込む
const workbook = XLSX.readFile(filePath);

console.log('シート名:', workbook.SheetNames);

workbook.SheetNames.forEach(sheetName => {
  console.log(`\n=== シート: ${sheetName} ===`);
  const worksheet = workbook.Sheets[sheetName];
  const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 });
  
  console.log(`行数: ${jsonData.length}`);
  console.log('\n最初の20行:');
  for (let i = 0; i < Math.min(20, jsonData.length); i++) {
    const row = jsonData[i];
    if (row && row.length > 0) {
      console.log(`行${i}: `, row.slice(0, 5));
    }
  }
});