// ============================================================
// Church Management System — Persistent Data Store
// Hierarchy: District → Zone → Church
// Data is saved to localStorage so it survives page refreshes.
// ============================================================

const STORAGE_KEY = 'churchms_data_v1';

// ── Lookup Tables (static, not persisted) ────────────────────

export const statusTypes = [
  { status_code: 'active',     description: 'Actively serving in any assignment' },
  { status_code: 'undeployed', description: 'Ready to be assigned; not yet placed' },
  { status_code: 'suspended',  description: 'Temporarily removed due to disciplinary action' },
  { status_code: 'interim',    description: 'Temporary fill-in until permanent pastor assigned' },
];

export const assignmentTypes = [
  { assignment_code: 'regular',       description: 'Default local church assignment' },
  { assignment_code: 'pioneering',    description: 'Starting or helping grow a new local church' },
  { assignment_code: 'training',      description: 'Training other pastors or leaders' },
  { assignment_code: 'swap',          description: 'Temporary cover when another pastor is moved' },
  { assignment_code: 'suspended',     description: 'Disciplinary removal; church needs replacement' },
  { assignment_code: 'international', description: 'Assigned outside district/country' },
  { assignment_code: 'interim',       description: 'Temporary fill-in until permanent pastor assigned' },
];

// ── Load from localStorage (or start empty) ──────────────────

function loadFromStorage() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    
    // Auto-coerce IDs to Numbers on load to prevent === bugs
    const coerceIds = (arr, idFields) => {
      if (!arr) return;
      arr.forEach(item => {
        idFields.forEach(field => {
          if (item[field] !== null && item[field] !== undefined) {
            item[field] = Number(item[field]);
          }
        });
      });
    };

    coerceIds(parsed.districts, ['district_id', 'leader_pastor_id', 'assistant_leader_pastor_id']);
    coerceIds(parsed.zones, ['zone_id', 'district_id']);
    coerceIds(parsed.churches, ['church_id', 'district_id', 'zone_id']);
    coerceIds(parsed.pastors, ['pastor_id']);
    coerceIds(parsed.churchAssignments, ['assignment_id', 'pastor_id', 'district_id', 'church_id']);
    coerceIds(parsed.pastorEvents, ['event_id', 'pastor_id']);

    if (parsed.counters) {
      Object.keys(parsed.counters).forEach(k => {
        parsed.counters[k] = Number(parsed.counters[k]);
      });
    }

    return parsed;
  } catch (e) {
    console.warn('[ChurchMS] Failed to load saved data:', e);
    return null;
  }
}

const _saved = loadFromStorage();

// ── Main Data Arrays ─────────────────────────────────────────
// These are exported as mutable arrays. Other modules push/splice
// directly into them, then call saveAll() to persist.

export const districts        = _saved?.districts        || [];
// { district_id, district_name, leader_pastor_id, assistant_leader_pastor_id, notes, created_at }

export const zones            = _saved?.zones            || [];
// { zone_id, district_id, zone_name, notes, created_at }

export const churches         = _saved?.churches         || [];
// { church_id, church_name, church_address, district_id, zone_id, is_international, notes, created_at }

export const pastors          = _saved?.pastors          || [];
// { pastor_id, pastor_name, wife_name, contact_number,
//   image_url, wife_image_url, birth_date, wife_birth_date,
//   pastoring_start_date, status_code, notes, created_at }

export const churchAssignments = _saved?.churchAssignments || [];
// { assignment_id, pastor_id, district_id, church_id,
//   assignment_type_code, start_date, end_date, notes, created_at }

export const pastorEvents     = _saved?.pastorEvents     || [];
// { event_id, pastor_id, event_type, event_date, details, created_at }

// ── Auto-increment Counters ──────────────────────────────────

export const counters = _saved?.counters || {
  district:   0,
  zone:       0,
  church:     0,
  pastor:     0,
  assignment: 0,
  event:      0,
};

export function nextId(key) {
  const id = counters[key]++;
  saveAll();
  return id;
}

// ── Persistence ──────────────────────────────────────────────

/**
 * Call this after any mutation to persist all data to localStorage.
 * Every module that modifies data should call saveAll() after changes.
 */
export function saveAll() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({
      districts,
      zones,
      churches,
      pastors,
      churchAssignments,
      pastorEvents,
      counters,
    }));
  } catch (e) {
    console.warn('[ChurchMS] Failed to save data:', e);
  }
}

/**
 * Wipe all data from localStorage and reset arrays in-place.
 * Useful for a "Reset / Clear All Data" feature.
 */
export function clearAllData() {
  localStorage.removeItem(STORAGE_KEY);
  districts.length        = 0;
  zones.length            = 0;
  churches.length         = 0;
  pastors.length          = 0;
  churchAssignments.length = 0;
  pastorEvents.length     = 0;
  counters.district   = 0;
  counters.zone       = 0;
  counters.church     = 0;
  counters.pastor     = 0;
  counters.assignment = 0;
  counters.event      = 0;
}


/**
 * Replace all data with new data (e.g. from import).
 * Persists immediately.
 */
export function replaceData(newData) {
  // Clear existing
  districts.length = 0;
  zones.length = 0;
  churches.length = 0;
  pastors.length = 0;
  churchAssignments.length = 0;
  pastorEvents.length = 0;

  // Push new
  if (newData.districts) districts.push(...newData.districts);
  if (newData.zones) zones.push(...newData.zones);
  if (newData.churches) churches.push(...newData.churches);
  if (newData.pastors) pastors.push(...newData.pastors);
  if (newData.churchAssignments) churchAssignments.push(...newData.churchAssignments);
  if (newData.pastorEvents) pastorEvents.push(...newData.pastorEvents);

  // Reset counters
  if (newData.counters) {
    // Reset existing counters first
    Object.keys(counters).forEach(key => counters[key] = 0);
    Object.assign(counters, newData.counters);
  }

  saveAll();
}

/**
 * Merge new data with existing data, avoiding duplicates.
 * Persists immediately.
 */
export function mergeData(newData) {
  const coerceIds = (arr, idFields) => {
    if (!arr) return;
    arr.forEach(item => {
      idFields.forEach(field => {
        if (item[field] !== null && item[field] !== undefined) {
          item[field] = Number(item[field]);
        }
      });
    });
  };

  coerceIds(newData.districts, ['district_id', 'leader_pastor_id', 'assistant_leader_pastor_id']);
  coerceIds(newData.zones, ['zone_id', 'district_id']);
  coerceIds(newData.churches, ['church_id', 'district_id', 'zone_id']);
  coerceIds(newData.pastors, ['pastor_id']);
  coerceIds(newData.churchAssignments, ['assignment_id', 'pastor_id', 'district_id', 'church_id']);
  coerceIds(newData.pastorEvents, ['event_id', 'pastor_id']);

  if (newData.districts) {
    newData.districts.forEach(nd => {
      if (!districts.some(ed => ed.district_id === nd.district_id || ed.district_name.toLowerCase() === nd.district_name.toLowerCase())) {
        districts.push(nd);
      }
    });
  }

  if (newData.zones) {
    newData.zones.forEach(nz => {
      if (!zones.some(ez => ez.zone_id === nz.zone_id || ez.zone_name.toLowerCase() === nz.zone_name.toLowerCase())) {
        zones.push(nz);
      }
    });
  }

  if (newData.churches) {
    newData.churches.forEach(nc => {
      if (!churches.some(ec => ec.church_id === nc.church_id || ec.church_name.toLowerCase() === nc.church_name.toLowerCase())) {
        churches.push(nc);
      }
    });
  }

  if (newData.pastors) {
    newData.pastors.forEach(np => {
      if (!pastors.some(ep => ep.pastor_id === np.pastor_id || ep.pastor_name.toLowerCase() === np.pastor_name.toLowerCase())) {
        pastors.push(np);
      }
    });
  }

  if (newData.churchAssignments) {
    newData.churchAssignments.forEach(na => {
      if (!churchAssignments.some(ea => ea.assignment_id === na.assignment_id || (ea.pastor_id === na.pastor_id && ea.start_date === na.start_date && ea.assignment_type_code === na.assignment_type_code))) {
        churchAssignments.push(na);
      }
    });
  }

  if (newData.pastorEvents) {
    newData.pastorEvents.forEach(ne => {
      if (!pastorEvents.some(ee => ee.event_id === ne.event_id || (ee.pastor_id === ne.pastor_id && ee.event_date === ne.event_date && ee.event_type === ne.event_type))) {
        pastorEvents.push(ne);
      }
    });
  }
  
  // Recalculate counters based on max IDs
  counters.district = districts.reduce((max, d) => Math.max(max, d.district_id || 0), 0) + 1;
  counters.zone = zones.reduce((max, z) => Math.max(max, z.zone_id || 0), 0) + 1;
  counters.church = churches.reduce((max, c) => Math.max(max, c.church_id || 0), 0) + 1;
  counters.pastor = pastors.reduce((max, p) => Math.max(max, p.pastor_id || 0), 0) + 1;
  counters.assignment = churchAssignments.reduce((max, a) => Math.max(max, a.assignment_id || 0), 0) + 1;
  counters.event = pastorEvents.reduce((max, e) => Math.max(max, e.event_id || 0), 0) + 1;

  saveAll();
}

// ── Derived Helpers ──────────────────────────────────────────

/** Get the active assignment for a pastor (or null) */
export function getActiveAssignment(pastorId) {
  return churchAssignments.find(a => a.pastor_id === pastorId && !a.end_date) || null;
}

/** Check if a church has an active pastor assignment */
export function churchHasActivePastor(churchId) {
  return churchAssignments.some(a => a.church_id === churchId && !a.end_date);
}

/** Get zones for a district */
export function getZonesForDistrict(districtId) {
  return zones.filter(z => z.district_id === districtId);
}

/** Get churches for a zone */
export function getChurchesForZone(zoneId) {
  return churches.filter(c => c.zone_id === zoneId);
}

/** Get unzoned churches for a district */
export function getUnzonedChurchesForDistrict(districtId) {
  return churches.filter(c => c.district_id === districtId && !c.zone_id);
}

/** Cascade delete a church and its assignments */
export function cascadeDeleteChurch(churchId) {
  // Delete assignments
  for (let k = churchAssignments.length - 1; k >= 0; k--) {
    if (churchAssignments[k].church_id === churchId) {
      if (!churchAssignments[k].end_date) {
        const p = pastors.find(x => x.pastor_id === churchAssignments[k].pastor_id);
        if (p) p.status_code = 'undeployed';
      }
      churchAssignments.splice(k, 1);
    }
  }
  // Delete church
  const idx = churches.findIndex(x => x.church_id === churchId);
  if (idx > -1) churches.splice(idx, 1);
}
