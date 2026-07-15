const ExcelJS = require('exceljs');
const path = require('path');

async function checkHeaders() {
  const files = [
    'pastors_sheet_2026-03-20 (1).xlsx',
    'pastors_sheet_2026-03-20 (2).xlsx',
    'pastors_sheet_2026-03-20 (3).xlsx'
  ];
  
  for (const fileName of files) {
    const workbook = new ExcelJS.Workbook();
    const filePath = path.join('/Users/joshuawaymanarabejo/Documents/Projects/Websites/VCCCManagement', fileName);
    
    console.log(`\n--- File: ${fileName} ---`);
    try {
      await workbook.xlsx.readFile(filePath);
      workbook.worksheets.forEach(sheet => {
        console.log(`Sheet: "${sheet.name}"`);
        const row = sheet.getRow(1);
        const headers = [];
        row.eachCell({ includeEmpty: true }, (cell, colNumber) => {
          headers.push(cell.value);
        });
        console.log(`Headers: [${headers.join(', ')}]`);
      });
    } catch (err) {
      console.error(`Error reading ${fileName}:`, err.message);
    }
  }
}

checkHeaders();
