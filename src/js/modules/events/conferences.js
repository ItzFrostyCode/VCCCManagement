import { showToast } from '../../shared/components/toast.js';
import { conferences, meals, mealAttendance } from '../../core/state.js';
import { dbService } from '../../core/dbService.js';
import { icon, esc, formatDate, emptyState } from '../../shared/utils/helpers.js';
import { openModal, closeModal } from '../../shared/components/modal.js';

export function renderConferences() {
  const content = document.getElementById('page-content');
  const actions = document.getElementById('topbar-actions');
  
  actions.innerHTML = `
    <button class="btn btn-primary" onclick="openAddConferenceModal()">
      ${icon('plus')} <span>Add New Conference</span>
    </button>
  `;
  
  content.innerHTML = `
    <div class="fade-in">
      <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 24px;">
        <h1 style="margin: 0; font-size: 20px; font-weight: 800; display: flex; align-items: center; gap: 8px;">
          Conferences
          <span style="font-size: 11px; font-weight: 700; color: var(--text-muted); padding: 2px 10px; background: var(--bg-elevated); border-radius: 20px; border: 1px solid var(--border);">
            Total Conferences: ${conferences.length}
          </span>
        </h1>
      </div>
      <div id="conferences-list" style="display: grid; grid-template-columns: repeat(auto-fill, minmax(360px, 1fr)); gap: 24px;">
        ${renderConferenceCards()}
      </div>
    </div>
  `;
  
  if (window.lucide) lucide.createIcons(); 
}

function renderConferenceCards() {
  if (conferences.length === 0) {
    return `<div style="grid-column: 1 / -1;">${emptyState('No Conferences Scheduled', 'Create your first conference to start managing delegates and meals.', 'calendar', 'Add Conference', 'openAddConferenceModal()')}</div>`;
  }
  
  const now = new Date();
  
  return conferences.map(c => {
    const start = new Date(c.start_date);
    const end = new Date(c.end_date);
    const isOngoing = now >= start && now <= end;
    const isPast = now > end;
    
    let statusBadge = `<span class="badge" style="background: var(--bg-hover); color: var(--text-muted); border-color: var(--border);">Upcoming</span>`;
    if (isOngoing) statusBadge = `<span class="badge" style="background: var(--success-dim); color: var(--success); border-color: var(--success); font-weight: 800;">ONGOING</span>`;
    if (isPast) statusBadge = `<span class="badge" style="background: var(--bg-elevated); color: var(--text-muted); border-color: var(--border); opacity: 0.6;">Past Event</span>`;

    return `
      <div class="card conference-card" style="padding: 24px; position: relative; overflow: hidden; border: 1px solid var(--border); transition: all 0.3s ease;">
        <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 20px;">
          <div style="font-weight: 800; font-size: 18px; color: var(--text-primary); line-height: 1.3; flex: 1;">${esc(c.theme)}</div>
          <div style="margin-left: 12px;">${statusBadge}</div>
        </div>
        
        <div style="display: flex; flex-direction: column; gap: 12px; margin-bottom: 24px;">
          <div style="display: flex; align-items: center; gap: 10px; color: var(--text-secondary); font-size: 13px; font-weight: 600;">
            <div style="width: 28px; height: 28px; border-radius: 8px; background: var(--bg-elevated); display: flex; align-items: center; justify-content: center; color: var(--accent);">
              ${icon('map-pin', 'icon-xs')}
            </div>
            ${esc(c.location)}
          </div>
          <div style="display: flex; align-items: center; gap: 10px; color: var(--text-secondary); font-size: 13px; font-weight: 600;">
            <div style="width: 28px; height: 28px; border-radius: 8px; background: var(--bg-elevated); display: flex; align-items: center; justify-content: center; color: var(--accent);">
              ${icon('calendar', 'icon-xs')}
            </div>
            ${formatDate(c.start_date)} — ${formatDate(c.end_date)}
          </div>
        </div>
        
        <div style="padding-top: 20px; border-top: 1px solid var(--border); display: flex; gap: 8px;">
          <button class="btn btn-secondary" style="flex: 1; font-weight: 700; height: 38px; font-size: 13px;" onclick="viewConferenceMeals(${c.conference_id})">
            ${icon('utensils', 'icon-xs')} Meals
          </button>
          <div style="display: flex; gap: 4px;">
            <button class="btn btn-icon" style="background: var(--bg-elevated); border: 1px solid var(--border);" onclick="downloadReportSheet('conference-meals-detailed', ${c.conference_id})" title="Export Detailed Excel">
              ${icon('file-spreadsheet', 'icon-sm')}
            </button>
            <button class="btn btn-icon" style="background: var(--bg-elevated); border: 1px solid var(--border);" onclick="editConference(${c.conference_id})">
              ${icon('edit-2', 'icon-sm')}
            </button>
            <button class="btn btn-icon hover:text-danger" style="background: var(--bg-elevated); border: 1px solid var(--border);" onclick="deleteConference(${c.conference_id})">
              ${icon('trash-2', 'icon-sm')}
            </button>
          </div>
        </div>
      </div>
    `;
  }).join('');
}

window.openAddConferenceModal = function() {
  renderConferenceModal(null);
};

window.editConference = function(id) {
  const conf = conferences.find(x => x.conference_id === id);
  if (conf) renderConferenceModal(conf);
};

function renderConferenceModal(c) {
  const isEdit = !!c;
  const confMeals = c ? meals.filter(m => m.conference_id === c.conference_id) : [];
  
  const isSlotChecked = (day, part) => {
    return confMeals.some(m => m.day_number === day && m.part_day === part);
  };

  openModal(
    `${icon(isEdit ? 'edit-2' : 'plus')} ${isEdit ? 'Update' : 'Schedule'} Conference`,
    `
    <div id="conference-form" class="fade-in">
      <div class="form-grid">
        <div class="form-group span-2">
          <label>Conference Theme *</label>
          <div style="position: relative;">
            <div style="position: absolute; left: 12px; top: 50%; transform: translateY(-50%); color: var(--accent);">
              ${icon('award', 'icon-sm')}
            </div>
            <input type="text" id="conf-theme" style="padding-left: 40px;" value="${esc(c?.theme || '')}" placeholder="e.g. 10th Annual General Conference" required>
          </div>
        </div>
        
        <div class="form-group span-2">
          <label>Venue / Location *</label>
          <div style="position: relative;">
            <div style="position: absolute; left: 12px; top: 50%; transform: translateY(-50%); color: var(--accent);">
              ${icon('map-pin', 'icon-sm')}
            </div>
            <input type="text" id="conf-location" style="padding-left: 40px;" value="${esc(c?.location || '')}" placeholder="e.g. VCCC Convention Hall" required>
          </div>
        </div>

        <div class="form-group">
          <label>Starting Date *</label>
          <input type="date" id="conf-start" value="${c?.start_date || ''}" onchange="updateDynamicMealGrid()" required ${confMeals.some(m => mealAttendance.some(a => a.meal_id === m.meal_id)) ? 'disabled' : ''}>
          ${confMeals.some(m => mealAttendance.some(a => a.meal_id === m.meal_id)) ? `<div style="font-size: 10px; color: var(--danger); margin-top: 4px;">Locked: Attendance data exists.</div>` : ''}
        </div>
        
        <div class="form-group">
          <label>Ending Date *</label>
          <input type="date" id="conf-end" value="${c?.end_date || ''}" onchange="updateDynamicMealGrid()" required ${confMeals.some(m => mealAttendance.some(a => a.meal_id === m.meal_id)) ? 'disabled' : ''}>
        </div>

        <div class="form-group span-2" style="margin-top: 12px;">
          <label style="font-weight: 800; color: var(--text-primary); display: flex; align-items: center; gap: 8px; margin-bottom: 16px;">
            ${icon('coffee', 'icon-sm', 'color: var(--accent)')} Meal Provision Schedule
          </label>
          <div id="meal-grid-container" style="background: var(--bg-elevated); padding: 16px; border-radius: var(--radius-lg); border: 1px solid var(--border);">
            ${renderMealGridMarkup(c?.start_date, c?.end_date, isSlotChecked, confMeals)}
          </div>
        </div>

        <div class="form-group span-2">
          <label>Additional Administrative Notes</label>
          <textarea id="conf-notes" placeholder="Optional notes for the secretariat..." style="min-height: 80px;">${esc(c?.notes || '')}</textarea>
        </div>
      </div>
    </div>
    `,
    `
    <button class="btn btn-secondary" onclick="closeModal()">${icon('x')} Cancel</button>
    <button class="btn btn-primary" onclick="saveConference(${c?.conference_id || 'null'})">${icon('save')} Save Conference</button>
    `,
    'modal-lg'
  );
}

function renderMealGridMarkup(start, end, checkFn, confMeals = []) {
  if (!start || !end) return '<div style="text-align: center; padding: 24px; color: var(--text-muted); font-size: 13px;">Specify start and end dates to generate meal schedule grid.</div>';
  
  const d1 = new Date(start);
  const d2 = new Date(end);
  const diffTime = d2 - d1;
  const numDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
  
  if (numDays <= 0) return '<div style="text-align: center; padding: 12px; color: var(--danger); font-size: 13px; font-weight: 700;">Error: End date must be after start date.</div>';
  if (numDays > 31) return '<div style="text-align: center; padding: 12px; color: var(--danger); font-size: 13px; font-weight: 700;">Conference limit exceeded (max 31 days).</div>';

  let html = `
    <table class="modern-table" style="--table-bg: transparent; border: none;">
      <thead>
        <tr>
          <th style="padding-left: 0;">Conference Day</th>
          <th style="text-align: center;">Morning</th>
          <th style="text-align: center;">Afternoon</th>
          <th style="text-align: center;">Evening</th>
        </tr>
      </thead>
      <tbody>
  `;

  for (let d = 1; d <= numDays; d++) {
    html += `
      <tr>
        <td style="padding-left: 0; font-weight: 800; color: var(--text-primary);">Day ${d}</td>
        ${['morning','afternoon','evening'].map(part => {
          const m = confMeals.find(x => x.day_number === d && x.part_day === part);
          const hasAttendance = m ? mealAttendance.some(a => a.meal_id === m.meal_id) : false;
          return `
            <td style="text-align: center;">
              <label style="display: inline-flex; align-items: center; justify-content: center; width: 24px; height: 24px; cursor: pointer;">
                <input type="checkbox"
                  class="meal-check"
                  data-day="${d}"
                  data-part="${part}"
                  style="width: 18px; height: 18px;"
                  ${checkFn(d, part) ? 'checked' : ''}
                  ${hasAttendance ? 'disabled' : ''}>
              </label>
            </td>
          `;
        }).join('')}
      </tr>
    `;
  }

  html += '</tbody></table>';
  return html;
}

window.updateDynamicMealGrid = function() {
  const start = document.getElementById('conf-start')?.value;
  const end = document.getElementById('conf-end')?.value;
  const container = document.getElementById('meal-grid-container');
  if (container) {
    container.innerHTML = renderMealGridMarkup(start, end, () => false);
  }
};

window.saveConference = async function(existingId) {
  const theme = document.getElementById('conf-theme').value.trim();
  const location = document.getElementById('conf-location').value.trim();
  const start = document.getElementById('conf-start').value;
  const end = document.getElementById('conf-end').value;
  const notes = document.getElementById('conf-notes').value.trim();

  if (!theme || !location || !start || !end) {
    showToast('Fill all required fields.', 'error');
    return;
  }

  if (start > end) {
    showToast('End date must be after start date.', 'error');
    return;
  }

  const btn = document.querySelector('.modal-footer .btn-primary');
  const oldHtml = btn?.innerHTML;

  try {
    if (btn) {
      btn.disabled = true;
      btn.innerHTML = `${icon('loader', 'animate-spin')} Saving...`;
    }

    const payload = { theme, location, start_date: start, end_date: end, notes };
    let dbConfId;

    if (existingId) {
      const conf = conferences.find(x => x.conference_id === existingId);
      if (conf) {
        const updated = await dbService.update('conferences', 'conference_id', existingId, payload);
        Object.assign(conf, updated);
        dbConfId = existingId;
      }
    } else {
      const inserted = await dbService.create('conferences', payload);
      dbConfId = inserted.conference_id;
    }

    const selectedMeals = [...document.querySelectorAll('.meal-check')]
      .filter(cb => cb.checked)
      .map(cb => ({ day: +cb.dataset.day, part: cb.dataset.part }));

    await updateConferenceMealsDB(dbConfId, selectedMeals);

    closeModal();
    renderConferences();
    showToast(`${existingId ? 'Updated' : 'Added'} successfully.`, 'success');
  } catch (err) {
    console.error('[Conferences] Save failed:', err);
    showToast(`Save failed: ${err.message || 'Unknown error'}`, 'error');
  } finally {
    if (btn) {
      btn.disabled = false;
      btn.innerHTML = oldHtml;
    }
  }
};

async function updateConferenceMealsDB(conferenceId, selectedSlots) {
  const currentMeals = meals.filter(m => m.conference_id === conferenceId);
  const slotsToKeepStrings = selectedSlots.map(s => `${s.day}-${s.part}`);
  
  // 1. Identify and remove slots from local state and db
  const toDelete = currentMeals.filter(m => !slotsToKeepStrings.includes(`${m.day_number}-${m.part_day}`));
  for (const m of toDelete) {
    const hasAttendance = mealAttendance.some(a => a.meal_id === m.meal_id);
    if (!hasAttendance) {
      await dbService.delete('meals', 'meal_id', m.meal_id);
      const idx = meals.findIndex(x => x.meal_id === m.meal_id);
      if (idx > -1) meals.splice(idx, 1);
    }
  }

  for (const slot of selectedSlots) {
    const exists = currentMeals.some(m => m.day_number === slot.day && m.part_day === slot.part);
    if (!exists) {
      await dbService.create('meals', {
        conference_id: conferenceId,
        day_number: slot.day,
        part_day: slot.part
      });
    }
  }
}
window.deleteConference = async function (id) {
  try {
    const targetId = Number(id);

    const conf = (Array.isArray(conferences) ? conferences : []).find(
      x => Number(x.conference_id) === targetId
    );
    if (!conf) {
      showToast('Conference not found.', 'error');
      return;
    }

    const confMealIds = (Array.isArray(meals) ? meals : [])
      .filter(m => Number(m.conference_id) === targetId)
      .map(m => Number(m.meal_id));

    const hasAttendance = (Array.isArray(mealAttendance) ? mealAttendance : [])
      .some(a => confMealIds.includes(Number(a.meal_id)));

    if (hasAttendance) {
      showToast('Cannot delete conference: Scanned attendance records exist.', 'error');
      return;
    }

    if (!confirm(`Delete "${conf.theme}"?`)) return;

    try {
      showToast(`Deleting "${conf.theme}" and its meal slots...`, 'info');
      
      // Delete meals from Supabase
      if (confMealIds.length > 0) {
        for (const mid of confMealIds) {
          await dbService.delete('meals', 'meal_id', mid);
        }
      }
      // Delete conference from Supabase
      await dbService.delete('conferences', 'conference_id', targetId);

      // Local state remove
      const cIdx = conferences.findIndex(x => x.conference_id === targetId);
      if (cIdx > -1) conferences.splice(cIdx, 1);
      
      confMealIds.forEach(mid => {
        const mIdx = meals.findIndex(m => m.meal_id === mid);
        if (mIdx > -1) meals.splice(mIdx, 1);
      });

      showToast(`"${conf.theme}" and its meals deleted successfully.`, 'success');
      renderConferences();
    } catch (err) {
      console.error('deleteConference error:', err);
      showToast(`Delete failed: ${err.message}`, 'error');
    }
  } catch (err) {
    console.error('deleteConference outer error:', err);
  }
};

function viewConferenceMeals(id) {
  const conf = conferences.find(x => x.conference_id === id);
  if (!conf) return;

  const confMeals = meals.filter(m => m.conference_id === id).sort((a,b) => (a.day_number - b.day_number) || a.part_day.localeCompare(b.part_day));
  
  const getSlotIcon = (part) => {
    if (part === 'morning') return icon('sun', 'icon-md');
    if (part === 'afternoon') return icon('cloud-sun', 'icon-md');
    return icon('moon', 'icon-md');
  };

  const getSlotColor = (part) => {
    if (part === 'morning') return 'var(--warning)';
    if (part === 'afternoon') return 'var(--orange)';
    return 'var(--purple)';
  };

  const mealCards = confMeals.map(m => {
    const attendanceCount = mealAttendance.filter(a => a.meal_id === m.meal_id).length;
    const sColor = getSlotColor(m.part_day);
    return `
      <div class="card" style="display: flex; flex-direction: column; gap: 16px; padding: 20px; border: 1px solid var(--border); background: var(--bg-surface); transition: transform 0.2s; box-shadow: var(--shadow-sm);">
        <div style="display: flex; align-items: center; justify-content: space-between; border-bottom: 1px solid var(--border-light); padding-bottom: 12px;">
          <div style="display: flex; align-items: center; gap: 12px;">
            <div style="background: var(--bg-elevated); padding: 10px; border-radius: 12px; color: ${sColor}; display: flex; align-items: center; justify-content: center;">
              ${getSlotIcon(m.part_day)}
            </div>
            <div style="display: flex; flex-direction: column;">
              <span style="font-size: 11px; font-weight: 800; color: var(--text-muted); text-transform: uppercase; letter-spacing: 0.05em;">Day ${m.day_number}</span>
              <span style="font-size: 16px; font-weight: 900; color: var(--text-primary); text-transform: capitalize;">${m.part_day} Meal</span>
            </div>
          </div>
          <div style="text-align: right;">
            <div style="font-size: 20px; font-weight: 900; color: var(--accent);">${attendanceCount}</div>
            <div style="font-size: 9px; font-weight: 800; color: var(--text-muted); text-transform: uppercase;">Scanned</div>
          </div>
        </div>
        
        <button class="btn btn-primary w-full" style="height: 52px; font-size: 15px; font-weight: 800; gap: 10px; box-shadow: 0 4px 12px var(--accent-glow);" onclick="openMealAttendance(${m.meal_id})">
          ${icon('maximize')} START SCANNING
        </button>
      </div>
    `;
  }).join('');

  const emptyMsg = `<div style="grid-column: 1 / -1; padding: 60px 24px;">${emptyState('No Meals Configured', 'Edit this conference to add meal slots to the schedule.', 'coffee', '', '')}</div>`;

  openModal(
    `${icon('coffee')} Meal Schedule: ${esc(conf.theme)}`,
    `<div style="display: grid; grid-template-columns: repeat(auto-fill, minmax(280px, 1fr)); gap: 16px; max-height: 60vh; overflow-y: auto; padding: 4px; background: var(--bg-base); border-radius: var(--radius-lg);">
      ${mealCards || emptyMsg}
    </div>`,
    `<div style="width: 100%; display: flex; justify-content: center;">
      <button class="btn btn-secondary" style="min-width: 200px; height: 48px; font-weight: 800;" onclick="closeModal()">${icon('arrow-left')} Return to Conferences</button>
    </div>`,
    'modal-lg'
  );
}

window.renderConferences = renderConferences;
window.renderConferenceModal = renderConferenceModal;
window.saveConference = saveConference;
window.deleteConference = deleteConference;
window.viewConferenceMeals = viewConferenceMeals;
window.updateDynamicMealGrid = updateDynamicMealGrid;
window.renderMealGridMarkup = renderMealGridMarkup;
