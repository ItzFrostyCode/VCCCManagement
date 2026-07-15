// ============================================================
// Church Management System - XLSX Import Helper
// Parses Excel files into the standard system data format
// ============================================================

/**
 * Parses an XLSX file (from a Buffer) into the standard data format.
 * Supports both multi-sheet "Full Backups" and single-sheet "Custom Exports".
 * allData parameter avoids circular module dependencies.
 */
export async function parseDatabaseFromXLSX(buffer, allData = {}) {
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

  // 1. Check for specific sheets (Full Backup style) or search for any sheet with relevant headers
  const sheets = {
    pastors: workbook.getWorksheet('Pastors'),
    churches: workbook.getWorksheet('Churches'),
    districts: workbook.getWorksheet('Districts'),
    assignments: workbook.getWorksheet('Assignments')
  };

  // If specific sheets not found, search all sheets for headers
  if (!sheets.pastors || !sheets.churches) {
    workbook.worksheets.forEach(sheet => {
      const headers = getHeaders(sheet);
      if (headers.includes('pastorname') && !sheets.pastors) sheets.pastors = sheet;
      if (headers.includes('churchname') && !sheets.churches) sheets.churches = sheet;
      if (headers.includes('districtname') && !sheets.districts) sheets.districts = sheet;
      if (headers.includes('pastor') && headers.includes('church') && !sheets.assignments) sheets.assignments = sheet;
    });
  }

  if (sheets.pastors) data.pastors = parseSheet(sheets.pastors, 'PASTOR', allData);
  if (sheets.churches) data.churches = parseSheet(sheets.churches, 'CHURCH', allData);
  if (sheets.districts) data.districts = parseSheet(sheets.districts, 'DISTRICT', allData);
  if (sheets.assignments) data.churchAssignments = parseSheet(sheets.assignments, 'ASSIGN', allData);

  return data;
}

function getHeaders(sheet) {
  const headerRow = sheet.getRow(1);
  const headers = [];
  headerRow.eachCell((cell) => {
    let val = cell.value;
    if (val && typeof val === 'object' && val.richText) {
      val = val.richText.map(t => t.text).join('');
    }
    headers.push(val ? String(val).trim().toLowerCase().replace(/[\s_]/g, '') : '');
  });
  return headers;
}

function parseSheet(sheet, type, allData = {}) {
  const headers = getHeaders(sheet);
  const rows = [];
  const { pastors = [], churches = [], districts = [], zones = [] } = allData;
  
  const imagesByCell = {};
  if (sheet.getImages) {
    try {
      sheet.getImages().forEach(img => {
        try {
          if (!img.range || !img.range.tl) return;
          const { row, col } = img.range.tl;
          const image = sheet.workbook.getImage(img.imageId);
          if (image && image.buffer) {
            const uint8 = new Uint8Array(image.buffer);
            let binary = '';
            for (let i = 0; i < uint8.length; i++) binary += String.fromCharCode(uint8[i]);
            const base64 = btoa(binary);
            const ext = image.extension || 'jpeg';
            imagesByCell[`${Math.floor(row) + 1},${Math.floor(col) + 1}`] = `data:image/${ext};base64,${base64}`;
          }
        } catch (imgErr) {}
      });
    } catch (err) {}
  }

  sheet.eachRow((row, rowNum) => {
    if (rowNum === 1) return;
    const rowData = {};
    headers.forEach((h, i) => {
      const cell = row.getCell(i + 1);
      let val = cell.value;
      if (val && typeof val === 'object' && val.richText) val = val.richText.map(t => t.text).join('');
      if (val && typeof val === 'object' && val.text) val = val.text;
      const imgKey = `${rowNum},${i + 1}`;
      if (imagesByCell[imgKey]) val = imagesByCell[imgKey];
      rowData[h] = val;
    });

    if (type === 'PASTOR') {
      const pId = rowData['pastorid'] ? Number(rowData['pastorid']) : null;
      let parentId = rowData['parentpastorid'] ? Number(rowData['parentpastorid']) : null;
      const discipledBy = rowData['discipledby'] || rowData['discipledbyname'];
      
      if (!parentId && discipledBy) {
        const parentP = pastors.find(x => x.pastor_name && x.pastor_name.toLowerCase() === String(discipledBy).toLowerCase());
        if (parentP) parentId = parentP.pastor_id;
      }

      const pastorRow = {
        pastor_id: (pId != null && !isNaN(pId)) ? pId : null,
        pastor_name: rowData['pastorname'] || rowData['name'] || 'Unknown Pastor',
        wife_name: rowData['wifename'] || null,
        contact_number: rowData['contactnumber'] ? String(rowData['contactnumber']) : null,
        birth_date: formatDate(rowData['birthdate']),
        wife_birth_date: formatDate(rowData['wifebirthdate']),
        pastoring_start_date: formatDate(rowData['pastoringstartdate'] || rowData['startofpastoring'] || rowData['since']),
        notes: rowData['notes'] || null,
        parent_pastor_id: parentId,
        image_url: rowData['pastorimage'] || rowData['imageurl'] || rowData['photo'] || null,
        wife_image_url: rowData['wifeimage'] || rowData['wifeimageurl'] || rowData['wifephoto'] || null,
        created_at: new Date().toISOString()
      };
      if (rowData['statuscode'] || rowData['status']) pastorRow.status_code = rowData['statuscode'] || rowData['status'];
      rows.push(pastorRow);
    } else if (type === 'CHURCH') {
      const cId = rowData['churchid'] ? Number(rowData['churchid']) : null;
      const dInput = (rowData['district'] || '').toLowerCase();
      const zInput = (rowData['zone'] || '').toLowerCase();
      const d = districts.find(x => x.district_name && x.district_name.toLowerCase() === dInput);
      const z = zones.find(x => x.zone_name && x.zone_name.toLowerCase() === zInput && (!d || x.district_id === d.district_id));
      rows.push({
        church_id: (cId != null && !isNaN(cId)) ? cId : null,
        church_name: rowData['churchname'] || rowData['name'] || 'Unknown Church',
        church_address: rowData['churchaddress'] || rowData['address'] || rowData['location'] || '',
        district_id: d ? d.district_id : (rowData['districtid'] ? Number(rowData['districtid']) : null),
        zone_id: z ? z.zone_id : (rowData['zoneid'] ? Number(rowData['zoneid']) : null),
        is_international: (rowData['isinternational'] || '').toLowerCase() === 'yes',
        notes: rowData['notes'] || '',
        created_at: new Date().toISOString()
      });
    }
  });
  return rows;
}

function formatDate(val) {
  if (!val) return null;
  if (val instanceof Date) return val.toISOString().split('T')[0];
  if (typeof val === 'string') {
    const d = new Date(val);
    return isNaN(d.getTime()) ? val : d.toISOString().split('T')[0];
  }
  return val;
}
