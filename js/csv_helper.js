// ============================================================
// Church Management System — CSV Import/Export Helper
// Handles multiple data types in a single CSV file
// ============================================================

import { 
  districts, zones, churches, pastors, churchAssignments, pastorEvents, counters
} from './data.js';

// ── Columns Configuration ────────────────────────────────────

const COLS = {
  DISTRICT: ['district_id', 'district_name', 'leader_pastor_id', 'assistant_leader_pastor_id', 'color', 'notes', 'created_at'],
  ZONE:     ['zone_id', 'district_id', 'zone_name', 'notes', 'created_at'],
  CHURCH:   ['church_id', 'church_name', 'church_address', 'district_id', 'zone_id', 'is_international', 'notes', 'created_at'],
  PASTOR:   ['pastor_id', 'pastor_name', 'wife_name', 'contact_number', 'image_url', 'wife_image_url', 'birth_date', 'wife_birth_date', 'pastoring_start_date', 'status_code', 'notes', 'created_at'],
  ASSIGN:   ['assignment_id', 'pastor_id', 'district_id', 'church_id', 'assignment_type_code', 'start_date', 'end_date', 'notes', 'created_at'],
  EVENT:    ['event_id', 'pastor_id', 'event_type', 'event_date', 'details', 'created_at'],
};

// ── CSV Generation ───────────────────────────────────────────

function escapeCSV(val) {
  if (val === null || val === undefined) return '';
  const str = String(val);
  if (str.includes(',') || str.includes('\n') || str.includes('"')) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

function toCSV(type, obj, keys) {
  const values = keys.map(k => escapeCSV(obj[k]));
  return `${type},${values.join(',')}`;
}

export function exportDatabaseToCSV() {
  const rows = [];
  rows.push('RecordType,Data...'); // Header

  // 1. Districts
  districts.forEach(d => rows.push(toCSV('DISTRICT', d, COLS.DISTRICT)));
  // 2. Zones
  zones.forEach(z => rows.push(toCSV('ZONE', z, COLS.ZONE)));
  // 3. Churches
  churches.forEach(c => rows.push(toCSV('CHURCH', c, COLS.CHURCH)));
  // 4. Pastors
  pastors.forEach(p => rows.push(toCSV('PASTOR', p, COLS.PASTOR)));
  // 5. Assignments
  churchAssignments.forEach(a => rows.push(toCSV('ASSIGN', a, COLS.ASSIGN)));
  // 6. Events
  pastorEvents.forEach(e => rows.push(toCSV('EVENT', e, COLS.EVENT)));
  // 7. Counters (special format)
  Object.keys(counters).forEach(k => {
    rows.push(`COUNTER,${k},${counters[k]}`);
  });

  return rows.join('\n');
}

// ── CSV Parsing ──────────────────────────────────────────────

function parseCSVLine(text) {
  const result = [];
  let cur = '';
  let inQuote = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (inQuote) {
      if (c === '"') {
        if (text[i + 1] === '"') {
          cur += '"';
          i++; 
        } else {
          inQuote = false;
        }
      } else {
        cur += c;
      }
    } else {
      if (c === '"') {
        inQuote = true;
      } else if (c === ',') {
        result.push(cur);
        cur = '';
      } else {
        cur += c;
      }
    }
  }
  result.push(cur);
  return result;
}

function fromCSV(values, keys) {
  const obj = {};
  keys.forEach((k, i) => {
    let val = values[i];
    
    // Normalize empty strings to null
    if (val === '') {
      obj[k] = null;
      return;
    }

    // Attempt basic type conversion
    const lowVal = String(val).toLowerCase();
    
    // Boolean mapping
    if (lowVal === 'true' || lowVal === 'yes') {
      obj[k] = true;
      return;
    }
    if (lowVal === 'false' || lowVal === 'no') {
      obj[k] = false;
      return;
    }

    // Number conversion (targeting IDs, excluding contact numbers and dates)
    if (k.endsWith('_id') || k === 'assignment_id') {
      const num = Number(val);
      if (!isNaN(num)) {
        obj[k] = num;
        return;
      }
    }

    // Default: Keep as string
    obj[k] = val;
  });
  return obj;
}

export function parseDatabaseFromCSV(csvText) {
  const lines = csvText.split(/\r?\n/);
  const data = {
    districts: [],
    zones: [],
    churches: [],
    pastors: [],
    churchAssignments: [],
    pastorEvents: [],
    counters: {}
  };

  if (lines.length === 0) return data;

  // Check if first line is our Backup header or a Custom Sheet header
  const firstLine = lines[0];
  const isBackup = firstLine.startsWith('RecordType,Data...');

  if (isBackup) {
    lines.slice(1).forEach(line => {
      if (!line.trim()) return;
      const parts = parseCSVLine(line);
      const type = parts[0];
      const vals = parts.slice(1);

      switch (type) {
        case 'DISTRICT': data.districts.push(fromCSV(vals, COLS.DISTRICT)); break;
        case 'ZONE':     data.zones.push(fromCSV(vals, COLS.ZONE)); break;
        case 'CHURCH':   data.churches.push(fromCSV(vals, COLS.CHURCH)); break;
        case 'PASTOR':   data.pastors.push(fromCSV(vals, COLS.PASTOR)); break;
        case 'ASSIGN':   data.churchAssignments.push(fromCSV(vals, COLS.ASSIGN)); break;
        case 'EVENT':    data.pastorEvents.push(fromCSV(vals, COLS.EVENT)); break;
        case 'COUNTER':  
          if (vals[0] && vals[1]) data.counters[vals[0]] = Number(vals[1]); 
          break;
      }
    });
  } else {
    // Attempt to handle custom sheets (Assignments, Churches, etc.)
    const headers = parseCSVLine(firstLine).map(h => h.trim());
    
    // 1. Assignments Sheet: Pastor, Church, District, Type, Since
    if (headers.includes('Pastor') && headers.includes('Church') && headers.includes('Type')) {
      lines.slice(1).forEach(line => {
        if (!line.trim()) return;
        const vals = parseCSVLine(line);
        const row = {};
        headers.forEach((h, i) => row[h] = vals[i]);

        // Map names back to IDs
        const p = pastors.find(x => x.pastor_name.toLowerCase() === (row['Pastor']||'').toLowerCase());
        const c = churches.find(x => x.church_name.toLowerCase() === (row['Church']||'').toLowerCase());
        const d = districts.find(x => x.district_name.toLowerCase() === (row['District']||'').toLowerCase());

        if (p && c) {
          data.churchAssignments.push({
            pastor_id: p.pastor_id,
            church_id: c.church_id,
            district_id: d ? d.district_id : c.district_id,
            assignment_type_code: (row['Type'] || 'regular').toLowerCase(),
            start_date: row['Since'] || new Date().toISOString().split('T')[0],
            notes: 'Imported from Assignments Sheet',
            created_at: new Date().toISOString()
          });
        }
      });
    }
    // 2. Churches Sheet: church_id, church_name, church_address, district, zone, is_international, notes
    else if (headers.includes('church_name') && headers.includes('district')) {
      lines.slice(1).forEach(line => {
        if (!line.trim()) return;
        const vals = parseCSVLine(line);
        const row = {};
        headers.forEach((h, i) => row[h] = vals[i]);

        const d = districts.find(x => x.district_name.toLowerCase() === (row['district']||'').toLowerCase());
        const z = zones.find(x => x.zone_name.toLowerCase() === (row['zone']||'').toLowerCase() && (!d || x.district_id === d.district_id));

        data.churches.push({
          church_id: row['church_id'] ? Number(row['church_id']) : null,
          church_name: row['church_name'],
          church_address: row['church_address'] || '',
          district_id: d ? d.district_id : null,
          zone_id: z ? z.zone_id : null,
          is_international: (row['is_international'] || '').toLowerCase() === 'yes',
          notes: row['notes'] || '',
          created_at: new Date().toISOString()
        });
      });
    }
  }

  return data;
}

// ── Custom Export Generation (Spreadsheets) ──────────────────

export function exportPastorsToHTML() {
  function imgCell(dataUrl) {
    if (dataUrl && dataUrl.startsWith('data:')) {
      return `<img src="${dataUrl}" style="width:90px;height:90px;object-fit:cover;border-radius:6px;display:block;margin:auto;">`;
    }
    return `<span style="color:#aaa;font-size:12px;">No image</span>`;
  }

  const rows = pastors.map((p, i) => `
    <tr style="background:${i % 2 === 0 ? '#ffffff' : '#f8f9fa'}">
      <td style="text-align:center;color:#888;font-size:12px;">${p.pastor_id}</td>
      <td style="font-weight:600;font-size:14px;">${p.pastor_name || '—'}</td>
      <td>${p.birth_date || '—'}</td>
      <td>${p.pastoring_start_date || '—'}</td>
      <td>${p.wife_name || '—'}</td>
      <td>${p.wife_birth_date || '—'}</td>
      <td>${p.contact_number || '—'}</td>
      <td style="text-align:center;padding:6px;">${imgCell(p.image_url)}</td>
      <td style="text-align:center;padding:6px;">${imgCell(p.wife_image_url)}</td>
    </tr>`).join('');

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<title>Pastors Directory — VCCC</title>
<style>
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { font-family: Arial, sans-serif; font-size: 13px; color: #222; background: #f0f2f5; padding: 24px; }
  h1 { font-size: 22px; font-weight: 700; margin-bottom: 4px; color: #1a1a2e; }
  .subtitle { font-size: 13px; color: #666; margin-bottom: 20px; }
  .count { display:inline-block; background:#1a1a2e; color:#fff; font-size:12px; padding:2px 8px; border-radius:12px; margin-left:8px; }
  table { width: 100%; border-collapse: collapse; background: #fff; border-radius: 10px; overflow: hidden; box-shadow: 0 2px 8px rgba(0,0,0,0.08); }
  thead tr { background: #1a1a2e; color: #fff; }
  th { padding: 12px 10px; text-align: left; font-size: 12px; font-weight: 600; letter-spacing: 0.5px; white-space: nowrap; }
  td { padding: 8px 10px; border-bottom: 1px solid #eee; vertical-align: middle; }
  tr:last-child td { border-bottom: none; }
  .footer { margin-top: 20px; text-align: center; font-size: 12px; color: #aaa; }
  @media print { body { background: #fff; padding: 0; } table { box-shadow: none; } }
</style>
</head>
<body>
  <h1>Pastors Directory <span class="count">${pastors.length} Pastors</span></h1>
  <div class="subtitle">Generated on ${new Date().toLocaleDateString('en-PH', { year:'numeric', month:'long', day:'numeric' })}</div>
  <table>
    <thead>
      <tr>
        <th>ID</th>
        <th>Pastor Name</th>
        <th>Birthdate</th>
        <th>Start of Pastoring</th>
        <th>Wife Name</th>
        <th>Wife Birthdate</th>
        <th>Contact Number</th>
        <th style="width:110px;text-align:center;">Pastor Photo</th>
        <th style="width:110px;text-align:center;">Wife Photo</th>
      </tr>
    </thead>
    <tbody>${rows}</tbody>
  </table>
  <div class="footer">VCCC Church Management System &copy; 2025–2026 · Created by Joshua Wayman A. Arabejo</div>
</body>
</html>`;
}





export function exportChurchesToCSV() {
  const header = ['church_id', 'church_name', 'church_address', 'district', 'zone', 'is_international', 'notes'];
  const rows = [];
  rows.push(header.join(',')); // Header
  churches.forEach(c => {
    const d = districts.find(x => x.district_id === c.district_id);
    const z = zones.find(x => x.zone_id === c.zone_id);
    const values = [
      c.church_id,
      c.church_name,
      c.church_address,
      d ? d.district_name : '',
      z ? z.zone_name : '',
      c.is_international ? 'Yes' : 'No',
      c.notes
    ];
    rows.push(values.map(v => escapeCSV(v)).join(','));
  });
  return rows.join('\n');
}

export function exportDistrictsToCSV() {
  const header = ['district_name', 'leader_pastor', 'assistant_leader_pastor', 'zone_name', 'zone_leader', 'assistant_zone_leader', 'church_name'];
  const rows = [];
  rows.push(header.join(',')); // Header
  districts.forEach(d => {
    const leader = pastors.find(p => p.pastor_id === d.leader_pastor_id);
    const assistant = pastors.find(p => p.pastor_id === d.assistant_leader_pastor_id);
    const dLeaderName = leader ? leader.pastor_name : 'Not assigned';
    const dAssistantName = assistant ? assistant.pastor_name : 'Not assigned';
    
    const dZones = zones.filter(z => z.district_id === d.district_id);
    if (dZones.length === 0) {
      // District has no zones
      const values = [d.district_name, dLeaderName, dAssistantName, 'No Zones', '', '', ''];
      rows.push(values.map(v => escapeCSV(v)).join(','));
    } else {
      dZones.forEach(z => {
        const zChurches = churches.filter(c => c.zone_id === z.zone_id);
        if (zChurches.length === 0) {
          // Zone has no churches
          const values = [d.district_name, dLeaderName, dAssistantName, z.zone_name, 'Not assigned', 'Not assigned', 'No Churches'];
          rows.push(values.map(v => escapeCSV(v)).join(','));
        } else {
          zChurches.forEach(c => {
            const values = [d.district_name, dLeaderName, dAssistantName, z.zone_name, 'Not assigned', 'Not assigned', c.church_name];
            rows.push(values.map(v => escapeCSV(v)).join(','));
          });
        }
      });
    }
  });
  return rows.join('\n');
}

export function exportAssignmentsToCSV() {
  const header = ['Pastor', 'Church', 'District', 'Type', 'Since'];
  const rows = [];
  rows.push(header.join(',')); // Header
  churchAssignments.forEach(a => {
    const p = pastors.find(x => x.pastor_id === a.pastor_id);
    const c = churches.find(x => x.church_id === a.church_id);
    const d = c && c.district_id ? districts.find(x => x.district_id === c.district_id) : null;
    
    const values = [
      p ? p.pastor_name : 'Unknown Pastor',
      c ? c.church_name : 'No Church',
      d ? d.district_name : 'No District',
      a.assignment_type_code,
      a.start_date || ''
    ];
    rows.push(values.map(v => escapeCSV(v)).join(','));
  });
  return rows.join('\n');
}
