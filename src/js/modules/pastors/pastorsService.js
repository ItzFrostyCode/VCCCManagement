import { dbService } from '../../core/dbService.js';
import { pastors, churchAssignments, updatePastorStatus } from '../../core/state.js';
import { uploadImage } from '../../core/storageService.js';

const CASCADING_STATUSES = ['deceased', 'pullout', 'undeployed'];

export const PastorService = {
  /**
   * Validates and saves a pastor to the database, handling image uploads and local state synchronization.
   * @param {number|null} id The Pastor ID (null if creating newly)
   * @param {Object} payload The database payload
   * @param {File|null} pastorFile The pastor image file
   * @param {File|null} wifeFile The wife image file
   */
  async save(id, payload, pastorFile, wifeFile) {
    // Prevent UI Duplicates
    const duplicate = pastors.find(p => 
      p.pastor_name.toLowerCase() === payload.pastor_name.toLowerCase() && 
      p.pastor_id !== id
    );
    if (duplicate) {
      throw new Error('A pastor with this exact name already exists.');
    }

    const pastorImgUrl = pastorFile ? await uploadImage(pastorFile, 'pastors') : null;
    const wifeImgUrl   = wifeFile   ? await uploadImage(wifeFile,   'wives')   : null;

    if (pastorImgUrl) payload.image_url = pastorImgUrl;
    if (wifeImgUrl) payload.wife_image_url = wifeImgUrl;

    if (id !== null) {
      const existing = pastors.find(x => x.pastor_id === id);
      const statusChanged = existing && existing.status_code !== payload.status_code;

      const updated = await dbService.update('pastors', 'pastor_id', id, payload);

      // Update local state arrays safely
      const p = pastors.find(x => x.pastor_id === id);
      if (p) Object.assign(p, updated);

      // Ending an active post (deceased/pullout/undeployed) via the regular
      // edit form: end the assignment, clear district leadership, and
      // release disciples - same cascade the dedicated Pull Out flow uses.
      if (statusChanged && CASCADING_STATUSES.includes(payload.status_code)) {
        await updatePastorStatus(id, payload.status_code, payload.notes ?? null);
      }

      return { action: 'updated', pastor: updated };
    } else {
      const inserted = await dbService.create('pastors', payload);
      return { action: 'created', pastor: inserted };
    }
  },

  /**
   * Deletes a pastor and all relational church assignments safely.
   */
  async delete(id) {
    // 1. Identify assignments to remove
    const toRemove = (Array.isArray(churchAssignments) ? churchAssignments : [])
      .filter(a => a.pastor_id === id)
      .map(a => a.assignment_id);

    // 2. Delete from Supabase (Assignments first, then Pastor)
    for (const aid of toRemove) {
      await dbService.delete('church_assignments', 'assignment_id', aid);
    }
    await dbService.delete('pastors', 'pastor_id', id);

    // 3. Remove from local state
    const idx = pastors.findIndex(x => x.pastor_id === id);
    if (idx > -1) pastors.splice(idx, 1);

    toRemove.forEach(aid => {
      const i = churchAssignments.findIndex(a => a.assignment_id === aid);
      if (i > -1) churchAssignments.splice(i, 1);
    });
  }
};
