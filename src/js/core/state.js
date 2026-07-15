// ============================================================
// Church Management System — Persistent Data Store
// ============================================================

const STORAGE_KEY = 'churchms_data_v1';

// ── Lookup Tables ────────────────────────────────────────────

export const statusTypes = [
  { status_code: 'active',      description: 'Currently assigned to a church' },
  { status_code: 'transferred', description: 'Moved from one church to another' },
  { status_code: 'redirection', description: 'Reassigned' },
  { status_code: 'pullout',     description: 'Removed from assignment' },
  { status_code: 'undeployed',  description: 'No current assignment' },
  { status_code: 'deceased',    description: 'Passed away' },
];

export const assignmentTypes = [
  { assignment_code: 'regular',       description: 'Default local church assignment' },
  { assignment_code: 'pioneering',    description: 'Starting or helping grow a new local church' },
  { assignment_code: 'training',      description: 'Training other pastors or leaders' },
  { assignment_code: 'swap',          description: 'Temporary cover' },
  { assignment_code: 'suspended',     description: 'Disciplinary removal' },
  { assignment_code: 'international', description: 'Assigned outside' },
  { assignment_code: 'interim',       description: 'Temporary fill-in' },
];

// ── Load from localStorage ───────────────────────────────────

function loadFromStorage() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);

    const coerceIds = (arr, fields) => {
      if (!arr) return;
      arr.forEach(item => {
        fields.forEach(f => {
          if (item[f] != null) item[f] = Number(item[f]);
        });
      });
    };

    coerceIds(parsed.districts, ['district_id', 'leader_pastor_id', 'assistant_leader_pastor_id']);
    coerceIds(parsed.zones, ['zone_id', 'district_id']);
    coerceIds(parsed.churches, ['church_id', 'district_id', 'zone_id']);
    coerceIds(parsed.pastors, ['pastor_id', 'parent_pastor_id']);
    coerceIds(parsed.churchAssignments, ['assignment_id', 'pastor_id', 'district_id', 'church_id']);
    coerceIds(parsed.pastorEvents, ['event_id', 'pastor_id']);
    coerceIds(parsed.disciples, ['disciple_id', 'pastor_id']);

    if (parsed.pastors) {
      parsed.pastors.forEach(p => {
        if (p.status_code === 'suspended') p.status_code = 'pullout';
        if (p.status_code === 'interim') p.status_code = 'redirection';
        if (p.status_code === 'redirect') p.status_code = 'redirection';
      });
    }

    parsed.isDataLoaded = true;
    return parsed;
  } catch (e) {
    console.warn('[VCCC-PDRS] Load failed:', e);
    return null;
  }
}

const _saved = loadFromStorage();
let _isDataLoaded = !!_saved;
export function isDataLoaded() { return _isDataLoaded; }

// ── Data Arrays ──────────────────────────────────────────────

export const districts = _saved?.districts || [];
export const zones = _saved?.zones || [];
export const churches = _saved?.churches || [];
export const pastors = _saved?.pastors || [];
export const churchAssignments = _saved?.churchAssignments || [];
export const pastorEvents = _saved?.pastorEvents || [];
export const disciples = _saved?.disciples || [];
export const conferences = _saved?.conferences || [];
export const meals = _saved?.meals || [];
export const mealAttendance = _saved?.mealAttendance || [];

// Scan-window cutoff times per meal slot, in 24h "HH:MM" format (or null = no cutoff, open all day).
// Configurable from the Meal Scanning screen so staff aren't locked to a fixed schedule.
export const mealCutoffSettings = _saved?.mealCutoffSettings || {
  morning: '11:30',
  afternoon: '16:30',
  evening: null,
};

export function updateMealCutoffSettings(newSettings) {
  Object.assign(mealCutoffSettings, newSettings);
  saveAll();
}

// ── Counters ─────────────────────────────────────────────────

export const counters = _saved?.counters || {
  district: 0, zone: 0, church: 0, pastor: 0,
  assignment: 0, event: 0, disciple: 0,
  conference: 0, meal: 0, attendance: 0,
};

export function nextId(key) {
  if (counters[key] == null || isNaN(counters[key])) recalculateCounters();
  if (counters[key] < 0) counters[key] = 0;
  const id = ++counters[key];
  _persist();
  return id;
}

export function recalculateCounters() {
  const findMax = (arr, pk) => {
    if (!arr || arr.length === 0) return 0;
    return Math.max(...arr.map(x => Number(x[pk]) || 0));
  };
  counters.district = findMax(districts, 'district_id');
  counters.zone = findMax(zones, 'zone_id');
  counters.church = findMax(churches, 'church_id');
  counters.pastor = findMax(pastors, 'pastor_id');
  counters.assignment = findMax(churchAssignments, 'assignment_id');
  counters.event = findMax(pastorEvents, 'event_id');
  counters.disciple = findMax(disciples, 'disciple_id');
  counters.conference = findMax(conferences, 'conference_id');
  counters.meal = findMax(meals, 'meal_id');
  counters.attendance = findMax(mealAttendance, 'attendance_id');
}

// ── Local Persistence ────────────────────────────────────────

function _persist() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({
      districts, zones, churches, pastors,
      churchAssignments, pastorEvents, disciples,
      conferences, meals, mealAttendance, counters,
      mealCutoffSettings,
    }));
  } catch (e) {
    console.error('[VCCC-PDRS] Storage error:', e);
  }
}

export function setDataLoaded(val) {
  _isDataLoaded = val;
}

// ── SAVE Logic ───────────────────────────────────────────────

let _saveDebounceTimer = null;
let _isSyncing = false;

function updateSyncIndicator(show) {
  const el = document.getElementById('sync-indicator');
  if (el) el.style.display = show ? 'flex' : 'none';
  _isSyncing = show;
}

// ── Supabase Helpers ──

export function getActiveAssignment(pastorId) {
  return churchAssignments.find(a => a.pastor_id === pastorId && !a.end_date) || null;
}

export function saveAll() {
  _persist();
  recalculateCounters();
}

export async function updatePastorStatus(pastorId, status, notes = null, immediate = false) {
  const p = pastors.find(x => x.pastor_id === pastorId);
  if (!p) return;

  p.status_code = status;
  if (notes !== null) p.notes = notes;

  if (status === 'undeployed' || status === 'pullout' || status === 'deceased') {
    const active = getActiveAssignment(pastorId);
    if (active) {
      active.end_date = new Date().toISOString().split('T')[0];
    }
  }

  // Pastor is no longer actively serving at their old post: release district
  // leadership and disciples so they don't silently keep pointing at someone
  // who's gone. Disciples stay tied to their church_id; only their mentor
  // link is cleared. ('undeployed' covers being displaced by a replacement
  // pastor - safe to include since it's a no-op for pastors with none.)
  if (status === 'pullout' || status === 'deceased' || status === 'undeployed') {
    clearPastorDistrictRoles(pastorId);
    releaseDisciplesFromPastor(pastorId);
  }

  saveAll();
}

export function releaseDisciplesFromPastor(pastorId) {
  disciples.forEach(d => {
    if (d.pastor_id === pastorId) d.pastor_id = null;
  });
}


export async function replaceData(newData) {
  if (!newData) return;

  districts.length = 0;
  zones.length = 0;
  churches.length = 0;
  pastors.length = 0;
  churchAssignments.length = 0;
  pastorEvents.length = 0;
  disciples.length = 0;
  conferences.length = 0;
  meals.length = 0;
  mealAttendance.length = 0;

  if (newData.districts) districts.push(...newData.districts);
  if (newData.zones) zones.push(...newData.zones);
  if (newData.churches) churches.push(...newData.churches);
  if (newData.pastors) pastors.push(...newData.pastors);
  if (newData.churchAssignments) churchAssignments.push(...newData.churchAssignments);
  if (newData.pastorEvents) pastorEvents.push(...newData.pastorEvents);
  if (newData.disciples) disciples.push(...newData.disciples);
  if (newData.conferences) conferences.push(...newData.conferences);
  if (newData.meals) meals.push(...newData.meals);
  if (newData.mealAttendance) mealAttendance.push(...newData.mealAttendance);
  if (newData.mealCutoffSettings) Object.assign(mealCutoffSettings, newData.mealCutoffSettings);

  recalculateCounters();
  _persist();
  _isDataLoaded = true;
}

export function churchHasActivePastor(churchId) {
  return churchAssignments.some(a => a.church_id === churchId && !a.end_date);
}


export async function mergeData(newData) {
  if (!newData) return { added: 0, replaced: 0, skipped: 0 };

  let added = 0, replaced = 0;

  const mergeEntity = (targetArray, incomingArray, pk, counterKey) => {
    if (!Array.isArray(incomingArray)) return;
    incomingArray.forEach(record => {
      if (!record) return;
      const incomingId = record[pk] != null && record[pk] !== '' ? Number(record[pk]) : null;
      const existingIdx = incomingId != null ? targetArray.findIndex(x => Number(x[pk]) === incomingId) : -1;

      if (existingIdx > -1) {
        Object.assign(targetArray[existingIdx], record);
        replaced++;
      } else {
        const newRecord = { ...record };
        newRecord[pk] = incomingId != null ? incomingId : nextId(counterKey);
        targetArray.push(newRecord);
        added++;
      }
    });
  };

  mergeEntity(districts, newData.districts, 'district_id', 'district');
  mergeEntity(zones, newData.zones, 'zone_id', 'zone');
  mergeEntity(churches, newData.churches, 'church_id', 'church');
  mergeEntity(pastors, newData.pastors, 'pastor_id', 'pastor');
  mergeEntity(churchAssignments, newData.churchAssignments, 'assignment_id', 'assignment');
  mergeEntity(pastorEvents, newData.pastorEvents, 'event_id', 'event');
  mergeEntity(disciples, newData.disciples, 'disciple_id', 'disciple');
  mergeEntity(conferences, newData.conferences, 'conference_id', 'conference');
  mergeEntity(meals, newData.meals, 'meal_id', 'meal');
  mergeEntity(mealAttendance, newData.mealAttendance, 'attendance_id', 'attendance');

  recalculateCounters();
  _persist();
  _isDataLoaded = true;

  return { added, replaced, skipped: 0 };
}

export function clearPastorDistrictRoles(pastorId) {
  districts.forEach(d => {
    if (d.leader_pastor_id === pastorId) d.leader_pastor_id = null;
    if (d.assistant_leader_pastor_id === pastorId) d.assistant_leader_pastor_id = null;
  });
}

export function getZonesForDistrict(distId) {
  return zones.filter(z => z.district_id === distId);
}

export function getChurchesForZone(zoneId) {
  return churches.filter(c => c.zone_id === zoneId);
}

export function getUnzonedChurchesForDistrict(distId) {
  return churches.filter(c => c.district_id === distId && !c.zone_id);
}

// ── Data Management Extras ──────────────────────────────────
export function getFullBackupState() {
  return {
    districts, zones, churches, pastors,
    churchAssignments, pastorEvents, disciples,
    conferences, meals, mealAttendance, counters,
    mealCutoffSettings,
  };
}

export async function restoreFullBackupState(parsedData) {
  await replaceData(parsedData);
}

export async function clearAllData() {
  await replaceData({
    districts: [], zones: [], churches: [], pastors: [],
    churchAssignments: [], pastorEvents: [], disciples: [],
    conferences: [], meals: [], mealAttendance: []
  });
}
