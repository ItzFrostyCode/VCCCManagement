import { supabase } from './supabase.js';
import { dbService } from './dbService.js';
import { 
  churches, pastors, districts, zones, churchAssignments, pastorEvents, 
  disciples, conferences, meals, mealAttendance,
  counters, saveAll 
} from '../core/state.js';

/**
 * Maps Supabase table names to local Javascript state arrays and primary keys.
 */
const TABLE_MAP = {
  'churches': { array: churches, pk: 'church_id' },
  'pastors': { array: pastors, pk: 'pastor_id' },
  'districts': { array: districts, pk: 'district_id' },
  'zones': { array: zones, pk: 'zone_id' },
  'church_assignments': { array: churchAssignments, pk: 'assignment_id' },
  'pastor_events': { array: pastorEvents, pk: 'event_id' },
  'disciples': { array: disciples, pk: 'disciple_id' },
  'conferences': { array: conferences, pk: 'conference_id' },
  'meals': { array: meals, pk: 'meal_id' },
  'meal_attendance': { array: mealAttendance, pk: 'attendance_id' }
};

export const syncService = {
  
  /**
   * Initializes state by fetching all data from Supabase and overwriting local arrays.
   * Called on application boot in the new architecture.
   */
  async initializeState() {
    try {
      console.log('[SyncService] Fetching initial state from Supabase...');
      
      const [
        dbChurches, dbPastors, dbDistricts, dbZones, dbAssignments, dbEvents,
        dbDisciples, dbConferences, dbMeals, dbMealAtt
      ] = await Promise.all([
        dbService.getAll('churches'),
        dbService.getAll('pastors'),
        dbService.getAll('districts'),
        dbService.getAll('zones'),
        dbService.getAll('church_assignments'),
        dbService.getAll('pastor_events'),
        dbService.getAll('disciples'),
        dbService.getAll('conferences'),
        dbService.getAll('meals'),
        dbService.getAll('meal_attendance')
      ]);

      // Replace local arrays
      churches.length = 0; churches.push(...(dbChurches || []));
      pastors.length = 0; pastors.push(...(dbPastors || []));
      districts.length = 0; districts.push(...(dbDistricts || []));
      zones.length = 0; zones.push(...(dbZones || []));
      churchAssignments.length = 0; churchAssignments.push(...(dbAssignments || []));
      pastorEvents.length = 0; pastorEvents.push(...(dbEvents || []));
      disciples.length = 0; disciples.push(...(dbDisciples || []));
      conferences.length = 0; conferences.push(...(dbConferences || []));
      meals.length = 0; meals.push(...(dbMeals || []));
      mealAttendance.length = 0; mealAttendance.push(...(dbMealAtt || []));

      // Reset counters to max ID
      counters.church = Math.max(0, ...churches.map(c => c.church_id || 0));
      counters.pastor = Math.max(0, ...pastors.map(p => p.pastor_id || 0));
      counters.district = Math.max(0, ...districts.map(d => d.district_id || 0));
      counters.zone = Math.max(0, ...zones.map(z => z.zone_id || 0));
      counters.assignment = Math.max(0, ...churchAssignments.map(a => a.assignment_id || 0));
      counters.event = Math.max(0, ...pastorEvents.map(e => e.event_id || 0));
      counters.disciple = Math.max(0, ...disciples.map(d => d.disciple_id || 0));
      counters.conference = Math.max(0, ...conferences.map(c => c.conference_id || 0));
      counters.meal = Math.max(0, ...meals.map(m => m.meal_id || 0));
      counters.mealAttendance = Math.max(0, ...mealAttendance.map(m => m.attendance_id || 0));

      saveAll();
      console.log('[SyncService] Initial state loaded successfully.');
      
      this.setupRealtimeSubscriptions();
      return true;
    } catch (error) {
      console.error('[SyncService] Failed to initialize state:', error);
      return false;
    }
  },

  /**
   * Subscribes to realtime changes for all relevant tables
   */
  setupRealtimeSubscriptions() {
    console.log('[SyncService] Setting up realtime subscriptions...');
    
    const channel = supabase.channel('public-tables');
    
    Object.keys(TABLE_MAP).forEach(table => {
      channel.on(
        'postgres_changes',
        { event: '*', schema: 'public', table: table },
        (payload) => this.handleRemoteChange(table, payload)
      );
    });

    channel.subscribe((status) => {
      if (status === 'SUBSCRIBED') {
        console.log('[SyncService] Realtime subscriptions active.');
      }
    });
  },

  /**
   * Handles incoming realtime payloads and patches the local state arrays
   */
  handleRemoteChange(table, payload) {
    const config = TABLE_MAP[table];
    if (!config) return;

    const { array, pk } = config;
    const { eventType, new: newRec, old: oldRec } = payload;
    
    if (eventType === 'INSERT') {
      // Deduplicate before inserting to avoid UI glitches if we sent the insert
      const exists = array.find(item => String(item[pk]) === String(newRec[pk]));
      if (!exists) {
        array.push(newRec);
      }
    } 
    else if (eventType === 'UPDATE') {
      const idx = array.findIndex(item => String(item[pk]) === String(newRec[pk]));
      if (idx > -1) {
        array[idx] = { ...array[idx], ...newRec };
      } else {
        // We didn't have it, let's treat it as an insert
        array.push(newRec);
      }
    } 
    else if (eventType === 'DELETE') {
      const idx = array.findIndex(item => String(item[pk]) === String(oldRec[pk]));
      if (idx > -1) {
        array.splice(idx, 1);
      }
    }
    
    // Automatically persist local copy and re-render if necessary (simplified for recovery)
    saveAll();
    
    // Attempt re-render if window route methods are available
    if (window.renderAssignments && typeof window.renderAssignments === 'function') {
      try {
        const page = localStorage.getItem('churchms_current_page');
        if (page) window.navigate(page);
      } catch (e) {
        // ignore
      }
    }
  },

  /**
   * One-time migration tool to push all current local data to Supabase.
   */
  async migrateLocalToSupabase() {
    console.log('[SyncService] Starting local to Supabase migration...');
    const tables = [
      { name: 'districts', data: districts },
      { name: 'zones', data: zones },
      { name: 'churches', data: churches },
      { name: 'pastors', data: pastors },
      { name: 'assignments', data: churchAssignments },
      { name: 'pastor_events', data: pastorEvents }
    ];

    for (const table of tables) {
      if (table.data && table.data.length > 0) {
        console.log(`[SyncService] Migrating ${table.data.length} records to ${table.name}...`);
        
        // Push in chunks to avoid payload limits
        const chunkSize = 50;
        for (let i = 0; i < table.data.length; i += chunkSize) {
          const chunk = table.data.slice(i, i + chunkSize);
          const { error } = await supabase.from(table.name).upsert(chunk);
          if (error) {
            console.error(`[SyncService] Error migrating chunk to ${table.name}:`, error);
          }
        }
      }
    }
    console.log('[SyncService] Migration complete.');
  }
};
