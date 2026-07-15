import {
  districts, zones, churches, pastors, churchAssignments, pastorEvents,
  disciples, conferences, meals, mealAttendance,
  nextId, saveAll
} from './state.js';

const TABLE_MAP = {
  districts:           { array: districts,          pk: 'district_id',   counterKey: 'district' },
  zones:                { array: zones,               pk: 'zone_id',       counterKey: 'zone' },
  churches:             { array: churches,             pk: 'church_id',     counterKey: 'church' },
  pastors:              { array: pastors,               pk: 'pastor_id',     counterKey: 'pastor' },
  church_assignments:  { array: churchAssignments,     pk: 'assignment_id', counterKey: 'assignment' },
  pastor_events:       { array: pastorEvents,          pk: 'event_id',      counterKey: 'event' },
  disciples:            { array: disciples,              pk: 'disciple_id',   counterKey: 'disciple' },
  conferences:          { array: conferences,            pk: 'conference_id', counterKey: 'conference' },
  meals:                 { array: meals,                  pk: 'meal_id',       counterKey: 'meal' },
  meal_attendance:     { array: mealAttendance,          pk: 'attendance_id', counterKey: 'attendance' },
};

function getTable(table) {
  const cfg = TABLE_MAP[table];
  if (!cfg) throw new Error(`Unknown table: ${table}`);
  return cfg;
}

export const dbService = {
  /**
   * Fetch all rows from a local table
   */
  async getAll(table) {
    return [...getTable(table).array];
  },

  /**
   * Insert a new record
   */
  async create(table, payload) {
    const cfg = getTable(table);
    const record = { ...payload, [cfg.pk]: nextId(cfg.counterKey), created_at: new Date().toISOString() };
    cfg.array.push(record);
    saveAll();
    return record;
  },

  /**
   * Update an existing record
   */
  async update(table, idCol, idVal, delta) {
    const cfg = getTable(table);
    const item = cfg.array.find(x => x[idCol] === idVal);
    if (!item) throw new Error(`Record not found in ${table} (${idCol}=${idVal})`);
    Object.assign(item, delta);
    saveAll();
    return item;
  },

  /**
   * Delete a record
   */
  async delete(table, idCol, idVal) {
    const cfg = getTable(table);
    const idx = cfg.array.findIndex(x => x[idCol] === idVal);
    if (idx > -1) cfg.array.splice(idx, 1);
    saveAll();
    return true;
  }
};
