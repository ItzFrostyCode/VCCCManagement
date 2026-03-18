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

    parsed.isDataLoaded = true; // Mark as successfully loaded
    return parsed;
  } catch (e) {
    console.warn('[ChurchMS] Failed to load saved data:', e);
    return null;
  }
}

const _saved = loadFromStorage();
export const isDataLoaded = !!_saved;

// ── Main Data Arrays ─────────────────────────────────────────
// These are exported as mutable arrays. Other modules push/splice
// directly into them, then call saveAll() to persist.

export const districts        = _saved?.districts        || [];
// { district_id, district_name, leader_pastor_id, assistant_leader_pastor_id, color, notes, created_at }

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
  const id = ++counters[key]; // pre-increment: counter 0→1, so first ID = 1
  saveAll();
  return id;
}

// ── Persistence ──────────────────────────────────────────────

/**
 * Call this after any mutation to persist all data to localStorage.
 * Every module that modifies data should call saveAll() after changes.
 */
export function saveAll() {
  // Defensive check: Don't save if we haven't loaded anything yet and arrays are empty.
  // This prevents overwriting a valid database with empty arrays if a script error occurs during boot.
  if (!isDataLoaded && pastors.length === 0 && districts.length === 0) {
    console.warn('[ChurchMS] saveAll blocked: Data not yet loaded and arrays are empty.');
    return;
  }

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
  // Persist the reset so IDs start from 0 after a page reload
  saveAll();
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
  const stats = { added: 0, skipped: 0, replaced: 0 };
  
  const coerceIds = (arr, idFields) => {
    if (!arr) return;
    arr.forEach(item => {
      idFields.forEach(field => {
        if (item[field] !== null && item[field] !== undefined) {
          const num = Number(item[field]);
          if (!isNaN(num)) item[field] = num;
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
      const idx = districts.findIndex(ed => (nd.district_id && ed.district_id === nd.district_id));
      const nameExistsIdx = districts.findIndex(ed => ed.district_name.toLowerCase() === nd.district_name.toLowerCase());

      if (idx > -1) {
        districts[idx] = { ...districts[idx], ...nd };
        stats.replaced++;
      } else if (nameExistsIdx > -1) {
        districts[nameExistsIdx] = { ...districts[nameExistsIdx], ...nd };
        stats.replaced++;
      } else {
        if (!nd.district_id) nd.district_id = ++counters.district;
        districts.push(nd);
        stats.added++;
      }
    });
  }

  if (newData.zones) {
    newData.zones.forEach(nz => {
      const idx = zones.findIndex(ez => (nz.zone_id && ez.zone_id === nz.zone_id));
      const nameExistsIdx = zones.findIndex(ez => ez.zone_name.toLowerCase() === nz.zone_name.toLowerCase() && ez.district_id === nz.district_id);

      if (idx > -1) {
        zones[idx] = { ...zones[idx], ...nz };
        stats.replaced++;
      } else if (nameExistsIdx > -1) {
        zones[nameExistsIdx] = { ...zones[nameExistsIdx], ...nz };
        stats.replaced++;
      } else {
        if (!nz.zone_id) nz.zone_id = ++counters.zone;
        zones.push(nz);
        stats.added++;
      }
    });
  }

  if (newData.churches) {
    newData.churches.forEach(nc => {
      const idx = churches.findIndex(ec => (nc.church_id && ec.church_id === nc.church_id));
      const nameExistsIdx = churches.findIndex(ec => ec.church_name.toLowerCase() === nc.church_name.toLowerCase());

      if (idx > -1) {
        churches[idx] = { ...churches[idx], ...nc };
        stats.replaced++;
      } else if (nameExistsIdx > -1) {
        churches[nameExistsIdx] = { ...churches[nameExistsIdx], ...nc };
        stats.replaced++;
      } else {
        if (!nc.church_id) nc.church_id = ++counters.church;
        churches.push(nc);
        stats.added++;
      }
    });
  }

  if (newData.pastors) {
    newData.pastors.forEach(np => {
      const idx = pastors.findIndex(ep => (np.pastor_id && ep.pastor_id === np.pastor_id));
      const nameExistsIdx = pastors.findIndex(ep => ep.pastor_name.toLowerCase() === np.pastor_name.toLowerCase());

      if (idx > -1) {
        pastors[idx] = { ...pastors[idx], ...np };
        stats.replaced++;
      } else if (nameExistsIdx > -1) {
        pastors[nameExistsIdx] = { ...pastors[nameExistsIdx], ...np };
        stats.replaced++;
      } else {
        if (!np.pastor_id) np.pastor_id = ++counters.pastor;
        pastors.push(np);
        stats.added++;
      }
    });
  }

  if (newData.churchAssignments) {
    newData.churchAssignments.forEach(na => {
      const idx = churchAssignments.findIndex(ea => (na.assignment_id && ea.assignment_id === na.assignment_id));
      const existsIdx = churchAssignments.findIndex(ea => 
        (ea.pastor_id === na.pastor_id && ea.church_id === na.church_id && ea.start_date === na.start_date)
      );

      if (idx > -1) {
        churchAssignments[idx] = { ...churchAssignments[idx], ...na };
        stats.replaced++;
      } else if (existsIdx > -1) {
        churchAssignments[existsIdx] = { ...churchAssignments[existsIdx], ...na };
        stats.replaced++;
      } else {
        if (!na.assignment_id) na.assignment_id = ++counters.assignment;
        churchAssignments.push(na);
        stats.added++;
      }
    });
  }

  if (newData.pastorEvents) {
    newData.pastorEvents.forEach(ne => {
      const idx = pastorEvents.findIndex(ee => (ne.event_id && ee.event_id === ne.event_id));
      const exists = pastorEvents.some(ee => 
        (ee.pastor_id === ne.pastor_id && ee.event_date === ne.event_date && ee.event_type === ne.event_type)
      );

      if (idx > -1) {
        pastorEvents[idx] = { ...pastorEvents[idx], ...ne };
        stats.replaced++;
      } else if (!exists) {
        if (!ne.event_id) ne.event_id = ++counters.event;
        pastorEvents.push(ne);
        stats.added++;
      } else {
        stats.skipped++;
      }
    });
  }
  
  // Recalculate counters
  counters.district   = Math.max(counters.district,   districts.reduce((max, d) => Math.max(max, d.district_id || 0), 0));
  counters.zone       = Math.max(counters.zone,       zones.reduce((max, z) => Math.max(max, z.zone_id || 0), 0));
  counters.church     = Math.max(counters.church,     churches.reduce((max, c) => Math.max(max, c.church_id || 0), 0));
  counters.pastor     = Math.max(counters.pastor,     pastors.reduce((max, p) => Math.max(max, p.pastor_id || 0), 0));
  counters.assignment = Math.max(counters.assignment, churchAssignments.reduce((max, a) => Math.max(max, a.assignment_id || 0), 0));
  counters.event      = Math.max(counters.event,      pastorEvents.reduce((max, e) => Math.max(max, e.event_id || 0), 0));

  saveAll();
  return stats;
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
  if (idx > -1) churches.splice(idx, 1);
}

/**
 * Collects all relevant churchms_* keys from localStorage for a full backup.
 */
export function getFullBackupState() {
  const data = {};
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (key && key.startsWith('churchms_')) {
      try {
        const val = localStorage.getItem(key);
        data[key] = JSON.parse(val);
      } catch (e) {
        data[key] = localStorage.getItem(key);
      }
    }
  }
  return data;
}

/**
 * Validates and restores the entire state from a backup object.
 * Overwrites all existing churchms_* keys in localStorage.
 */
export function restoreFullBackupState(backupData) {
  if (!backupData || typeof backupData !== 'object') {
    throw new Error('Invalid backup data format.');
  }

  // Basic validation: ensure the main data key exists or at least some churchms_ keys
  const keys = Object.keys(backupData);
  if (!keys.some(k => k.startsWith('churchms_'))) {
    throw new Error('Backup does not contain valid ChurchMS data.');
  }

  // Clear existing churchms_ keys
  const keysToRemove = [];
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (key && key.startsWith('churchms_')) keysToRemove.push(key);
  }
  keysToRemove.forEach(k => localStorage.removeItem(k));

  // Restore from backup
  Object.keys(backupData).forEach(key => {
    if (key.startsWith('churchms_')) {
      const val = backupData[key];
      localStorage.setItem(key, typeof val === 'string' ? val : JSON.stringify(val));
    }
  });

  return true;
}
