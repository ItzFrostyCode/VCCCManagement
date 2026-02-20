// ============================================================
// Church Management System — CSV Import/Export Helper
// Handles multiple data types in a single CSV file
// ============================================================

import { 
  districts, zones, churches, pastors, churchAssignments, pastorEvents, counters
} from './data.js';

// ── Columns Configuration ────────────────────────────────────

const COLS = {
  DISTRICT: ['district_id', 'district_name', 'leader_pastor_id', 'assistant_leader_pastor_id', 'notes', 'created_at'],
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
    // Attempt basic type conversion
    if (val === 'true') val = true;
    if (val === 'false') val = false;
    if (val === '') val = null; 
    else if (!isNaN(Number(val)) && (k.endsWith('_id') || k.endsWith('date') === false)) {
       // Only convert to number if it looks like an ID and is not a date string (unlikely to be number but just in case)
       // Actually, be careful. Phone numbers might look like numbers. 
       // Only convert ID fields? Or just leave as strings if consistent. 
       // In JS, persistence is JSON, so types are preserved. CSV loses types.
       // Let's assume IDs are numbers if they parse as numbers. 
       const num = Number(val);
       if (Number.isInteger(num)) val = num; 
    }
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

  lines.forEach(line => {
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

  return data;
}

// ── Custom Export Generation (Spreadsheets) ──────────────────

export function exportPastorsToCSV() {
  const customCols = [
    'pastor_id', 'pastor_name', 'wife_name', 'contact_number', 'birth_date', 
    'wife_birth_date', 'pastoring_start_date', 'status_code', 'notes'
  ];
  const rows = [];
  rows.push(customCols.join(',')); // Header
  pastors.forEach(p => {
    rows.push(customCols.map(k => escapeCSV(p[k])).join(','));
  });
  return rows.join('\n');
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
  const header = ['assignment_id', 'pastor_name', 'church_name', 'district_name', 'zone_name', 'assignment_type', 'start_date', 'end_date', 'notes'];
  const rows = [];
  rows.push(header.join(',')); // Header
  churchAssignments.forEach(a => {
    const p = pastors.find(x => x.pastor_id === a.pastor_id);
    const c = churches.find(x => x.church_id === a.church_id);
    const d = c ? districts.find(x => x.district_id === c.district_id) : null;
    const z = c ? zones.find(x => x.zone_id === c.zone_id) : null;
    
    const values = [
      a.assignment_id,
      p ? p.pastor_name : 'Unknown Pastor',
      c ? c.church_name : 'No Church',
      d ? d.district_name : 'No District',
      z ? z.zone_name : 'No Zone',
      a.assignment_type_code,
      a.start_date || '',
      a.end_date || '',
      a.notes || ''
    ];
    rows.push(values.map(v => escapeCSV(v)).join(','));
  });
  return rows.join('\n');
}
