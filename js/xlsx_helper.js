// ============================================================
// Church Management System — XLSX Import Helper
// Parses Excel files into the standard system data format
// ============================================================

import { 
  pastors, churches, districts, zones
} from './data.js';

/**
 * Parses an XLSX file (from a Buffer) into the standard data format.
 * Supports both multi-sheet "Full Backups" and single-sheet "Custom Exports".
 */
export async function parseDatabaseFromXLSX(buffer) {
  if (!window.ExcelJS) {
    await new Promise((resolve, reject) => {
      const s = document.createElement('script');
      s.src = 'https://cdn.jsdelivr.net/npm/exceljs@4.4.0/dist/exceljs.min.js';
      s.onload = resolve;
      s.onerror = reject;
      document.head.appendChild(s);
    });
  }

  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.load(buffer);

  const data = {
    districts: [],
    zones: [],
    churches: [],
    pastors: [],
    churchAssignments: [],
    pastorEvents: [],
    counters: {}
  };

  // 1. Check for specific sheets (Full Backup style)
  const pastorSheet = workbook.getWorksheet('Pastors');
  const churchSheet = workbook.getWorksheet('Churches');
  const districtSheet = workbook.getWorksheet('Districts');
  const assignmentSheet = workbook.getWorksheet('Assignments');

  if (pastorSheet) {
    data.pastors = parseSheet(pastorSheet, 'PASTOR');
  }
  if (churchSheet) {
    data.churches = parseSheet(churchSheet, 'CHURCH');
  }
  if (districtSheet) {
    data.districts = parseSheet(districtSheet, 'DISTRICT');
  }
  if (assignmentSheet) {
    data.churchAssignments = parseSheet(assignmentSheet, 'ASSIGN');
  }

  // Handle single-sheet custom exports if no structured sheets found
  if (data.pastors.length === 0 && data.churches.length === 0 && workbook.worksheets.length === 1) {
    const sheet = workbook.worksheets[0];
    const headers = getHeaders(sheet);
    
    if (headers.includes('pastorname')) {
      data.pastors = parseSheet(sheet, 'PASTOR');
    } else if (headers.includes('churchname')) {
      data.churches = parseSheet(sheet, 'CHURCH');
    }
  }

  return data;
}

function getHeaders(sheet) {
  const headerRow = sheet.getRow(1);
  const headers = [];
  headerRow.eachCell((cell) => {
    headers.push(cell.value ? String(cell.value).trim().toLowerCase().replace(/[\s_]/g, '') : '');
  });
  return headers;
}

function parseSheet(sheet, type) {
  const headers = getHeaders(sheet);
  const rows = [];
  
  // Extract embedded images from the sheet
  const imagesByCell = {};
  if (sheet.getImages) {
    try {
      sheet.getImages().forEach(img => {
        try {
          if (!img.range || !img.range.tl) return;
          const { row, col } = img.range.tl;
          const image = sheet.workbook.getImage(img.imageId);
          if (image && image.buffer) {
            // Convert buffer to data URL (Base64) - Robust browser-compatible way
            let base64 = '';
            const bytes = new Uint8Array(image.buffer);
            const len = bytes.byteLength;
            for (let i = 0; i < len; i++) {
              base64 += String.fromCharCode(bytes[i]);
            }
            base64 = btoa(base64);
            
            imagesByCell[`${Math.floor(row) + 1},${Math.floor(col) + 1}`] = `data:image/${image.extension};base64,${base64}`;
          }
        } catch (imgErr) {
          console.warn('Failed to extract individual image:', imgErr);
        }
      });
    } catch (err) {
      console.error('Error during image extraction:', err);
    }
  }

  sheet.eachRow((row, rowNum) => {
    if (rowNum === 1) return; // Skip headers

    const rowData = {};
    headers.forEach((h, i) => {
      const cell = row.getCell(i + 1);
      let val = cell.value;
      
      // Handle rich text
      if (val && typeof val === 'object' && val.richText) {
        val = val.richText.map(t => t.text).join('');
      }
      
      // Handle hyperlink objects
      if (val && typeof val === 'object' && val.text) {
        val = val.text;
      }

      // Check for embedded image in this specific cell
      const imgKey = `${rowNum},${i + 1}`;
      if (imagesByCell[imgKey]) {
        val = imagesByCell[imgKey];
      }

      rowData[h] = val;
    });

    if (type === 'PASTOR') {
      // Find image fields with fallback for different header names
      const pastorImg = rowData['pastorimage'] || rowData['imageurl'] || rowData['photourl'] || rowData['photo'] || rowData['image'] || null;
      const wifeImg   = rowData['wifeimage'] || rowData['wifeimageurl'] || rowData['wifephotourl'] || rowData['wifephoto'] || null;

      rows.push({
        pastor_id: rowData['pastorid'] ? Number(rowData['pastorid']) : null,
        pastor_name: rowData['pastorname'] || rowData['name'],
        wife_name: rowData['wifename'],
        contact_number: rowData['contactnumber'],
        birth_date: rowData['birthdate'],
        wife_birth_date: rowData['wifebirthdate'],
        pastoring_start_date: rowData['pastoringstartdate'] || rowData['since'],
        status_code: rowData['statuscode'] || 'undeployed',
        notes: rowData['notes'],
        image_url: pastorImg,
        wife_image_url: wifeImg,
        created_at: new Date().toISOString()
      });
    } else if (type === 'CHURCH') {
      // Map names to IDs for churches
      const dInput = (rowData['district'] || '').toLowerCase();
      const zInput = (rowData['zone'] || '').toLowerCase();
      
      const d = districts.find(x => x.district_name.toLowerCase() === dInput);
      const z = zones.find(x => x.zone_name.toLowerCase() === zInput && (!d || x.district_id === d.district_id));

      rows.push({
        church_id: rowData['churchid'] ? Number(rowData['churchid']) : null,
        church_name: rowData['churchname'] || rowData['name'],
        church_address: rowData['churchaddress'] || rowData['address'],
        district_id: d ? d.district_id : (rowData['districtid'] ? Number(rowData['districtid']) : null),
        zone_id: z ? z.zone_id : (rowData['zoneid'] ? Number(rowData['zoneid']) : null),
        is_international: (rowData['isinternational'] || '').toLowerCase() === 'yes',
        notes: rowData['notes'],
        created_at: new Date().toISOString()
      });
    }
    // Add other types as needed
  });

  return rows;
}
