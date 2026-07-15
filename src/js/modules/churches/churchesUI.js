import { showToast } from '../../shared/components/toast.js';
// ============================================================
// Church Management System — Churches Module
// ============================================================

import {
  churches,
  districts,
  zones,
  churchAssignments,
  pastors,
  disciples,
  churchHasActivePastor
} from '../../core/state.js';

import { dbService } from '../../core/dbService.js';

import {
  icon,
  esc,
  pastorAvatar,
  emptyState,
  confirmDelete,
  debounce
} from '../../shared/utils/helpers.js';

import { openModal, closeModal } from '../../shared/components/modal.js';

const TODAY = new Date().toISOString().split('T')[0];
let currentView = 'all'; // 'all', 'local', 'vacant', 'international'

// ── Render Churches Main ──────────────────────────────────────
export function renderChurches() {
  const content = document.getElementById('page-content');
  const actions = document.getElementById('topbar-actions');
  if (!content) return;

  if (actions) {
    actions.innerHTML = `
      <div style="display:flex; gap:8px; flex-wrap: wrap;">
        <button class="btn btn-primary" onclick="openAddChurchModal()">${icon('plus')} <span>Add Church</span></button>
      </div>
    `;
  }

  const localWithPastorCount = (Array.isArray(churches) ? churches : []).filter(c => !c.is_international && churchHasActivePastor(c.church_id)).length;
  const internationalCount = (Array.isArray(churches) ? churches : []).filter(c => c.is_international).length;

  content.innerHTML = `
    <div class="fade-in">
      <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 24px;">
        <h1 style="margin: 0; font-size: 24px; font-weight: 800; display: flex; align-items: center; gap: 8px; flex-wrap: wrap;">
          Churches
          <span style="font-size: 14px; font-weight: 600; color: var(--text-muted); padding: 4px 10px; background: var(--bg-elevated); border-radius: 20px; border: 1px solid var(--border);">
            Local (Active): ${localWithPastorCount}
          </span>
          <span style="font-size: 14px; font-weight: 600; color: var(--text-muted); padding: 4px 10px; background: var(--bg-elevated); border-radius: 20px; border: 1px solid var(--border);">
            International: ${internationalCount}
          </span>
        </h1>
      </div>
      <div style="display: flex; gap: 12px; align-items: center; margin-bottom: 24px;">
        <div style="flex: 1; position: relative;">
          <div style="position: absolute; left: 16px; top: 50%; transform: translateY(-50%); color: var(--text-muted);">
            ${icon('search', 'icon-sm')}
          </div>
          <input type="text" id="church-search"
                 style="padding-left: 44px; height: 46px; font-size: 15px;"
                 placeholder="Search by name or address…" oninput="filterChurches()">
        </div>

        <div class="filter-trigger-wrap">
          <button type="button" class="filter-trigger-btn${currentView !== 'all' || churchDistrictFilter ? ' active' : ''}" onclick="toggleChurchFilterPanel(event)">
            ${icon('filter', 'icon-sm')}
            ${(currentView !== 'all' ? 1 : 0) + (churchDistrictFilter ? 1 : 0) > 0
              ? `<span class="filter-badge">${(currentView !== 'all' ? 1 : 0) + (churchDistrictFilter ? 1 : 0)}</span>`
              : ''}
          </button>
          <div id="church-filter-panel" class="filter-dropdown-panel">
            <div class="filter-section">
              <div class="filter-section-label">Status</div>
              <div class="filter-chip-list" id="church-status-chips">
                ${renderStatusChip('all', 'All Churches', 'church')}
                ${renderStatusChip('local', 'Local', 'map')}
                ${renderStatusChip('vacant', 'Vacant', 'user-x')}
                ${renderStatusChip('international', 'International', 'globe')}
              </div>
            </div>
            <div class="filter-section">
              <div class="filter-section-label">District</div>
              <select id="church-district-filter" onchange="filterChurches()">
                <option value="">All Regions / Districts</option>
                ${[...districts]
                  .sort((a, b) => a.district_name.localeCompare(b.district_name))
                  .map(d => `<option value="${d.district_id}"${churchDistrictFilter === String(d.district_id) ? ' selected' : ''}>${esc(d.district_name)}</option>`)
                  .join('')}
              </select>
            </div>
          </div>
        </div>
      </div>

      <div id="churches-list"></div>
    </div>
  `;

  renderChurchesList();
  window.lucide?.createIcons?.();
  bindChurchFilterOutsideClick();
}

function renderStatusChip(id, label, iconName) {
  const isActive = currentView === id;
  return `
    <button type="button" class="filter-chip${isActive ? ' active' : ''}" data-view="${id}" onclick="switchChurchView('${id}')">
      ${icon(iconName, 'icon-xs')} ${label}
    </button>
  `;
}

let churchDistrictFilter = '';
let churchOutsideClickBound = false;

window.toggleChurchFilterPanel = function(event) {
  event.stopPropagation();
  document.getElementById('church-filter-panel')?.classList.toggle('open');
  document.querySelector('.filter-trigger-wrap .filter-trigger-btn')?.classList.toggle('active');
};

function bindChurchFilterOutsideClick() {
  if (churchOutsideClickBound) return;
  churchOutsideClickBound = true;
  document.addEventListener('click', (e) => {
    const wrap = document.querySelector('#page-content .filter-trigger-wrap');
    if (wrap && !wrap.contains(e.target)) {
      document.getElementById('church-filter-panel')?.classList.remove('open');
    }
  });
}

window.switchChurchView = function(view) {
  currentView = view;
  document.querySelectorAll('#church-status-chips .filter-chip').forEach(c => {
    c.classList.toggle('active', c.dataset.view === view);
  });
  updateChurchFilterBadge();
  renderChurchesList();
};

function updateChurchFilterBadge() {
  churchDistrictFilter = document.getElementById('church-district-filter')?.value || '';
  const btn = document.querySelector('.filter-trigger-wrap .filter-trigger-btn');
  if (!btn) return;
  const count = (currentView !== 'all' ? 1 : 0) + (churchDistrictFilter ? 1 : 0);
  let badge = btn.querySelector('.filter-badge');
  if (count > 0) {
    if (!badge) {
      badge = document.createElement('span');
      badge.className = 'filter-badge';
      btn.appendChild(badge);
    }
    badge.textContent = count;
    btn.classList.add('active');
  } else {
    badge?.remove();
    btn.classList.remove('active');
  }
}

// ── Render List ───────────────────────────────────────────────
function renderChurchesList() {
  const search = (document.getElementById('church-search')?.value || '').toLowerCase();
  const distId = +document.getElementById('church-district-filter')?.value || null;
  const container = document.getElementById('churches-list');
  if (!container) return;

  let list = (Array.isArray(churches) ? churches : []).filter(c => {
    const hasPastor = (Array.isArray(churchAssignments) ? churchAssignments : []).some(a => a.church_id === c.church_id && !a.end_date);

    if (currentView === 'local') {
      if (c.is_international || !hasPastor) return false;
    } else if (currentView === 'vacant') {
      if (c.is_international || hasPastor) return false;
    } else if (currentView === 'international') {
      if (!c.is_international) return false;
    }

    if (
      search &&
      !String(c.church_name || '').toLowerCase().includes(search) &&
      !String(c.church_address || '').toLowerCase().includes(search)
    ) return false;

    if (distId && c.district_id !== distId) return false;
    return true;
  });

  if (list.length === 0) {
    container.innerHTML = emptyState(
      'No Churches Found',
      'Add a church to get started.',
      'church',
      'Add Church',
      'openAddChurchModal()'
    );
    window.lucide?.createIcons?.();
    return;
  }

  list = [...list].sort((a, b) => a.church_name.localeCompare(b.church_name));

  container.innerHTML = `
    <div class="grid-list">
      ${list.map(c => renderChurchCard(c)).join('')}
    </div>
  `;

  window.lucide?.createIcons?.();
}

function renderChurchCard(c) {
  const activeAssign = (Array.isArray(churchAssignments) ? churchAssignments : []).find(a => a.church_id === c.church_id && !a.end_date);
  const pObj = activeAssign ? (Array.isArray(pastors) ? pastors : []).find(p => p.pastor_id === activeAssign.pastor_id) : null;
  const zone = c.zone_id ? (Array.isArray(zones) ? zones : []).find(z => z.zone_id === c.zone_id) : null;
  const district = c.district_id ? (Array.isArray(districts) ? districts : []).find(d => d.district_id === c.district_id) : null;

  return `
    <div class="card" style="padding: 24px; display: flex; flex-direction: column; transition: transform 0.2s, box-shadow 0.2s; border-color: ${pObj ? 'var(--border)' : 'var(--danger-dim)'};">
      <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 20px;">
        <div style="flex: 1;">
          <div style="font-weight: 800; font-size: 18px; color: var(--text-primary); letter-spacing: -0.02em;">
            ${esc(c.church_name)}
          </div>
          <div style="display: flex; gap: 8px; margin-top: 6px; flex-wrap: wrap;">
            ${c.is_international ? '<span class="badge" style="background: var(--accent-dim); color: var(--accent); font-weight: 800; font-size: 10px; padding: 2px 8px;">International</span>' : ''}
            ${district ? `<span style="font-size: 11px; font-weight: 700; color: var(--text-muted); text-transform: uppercase;">${esc(district.district_name)}</span>` : ''}
            ${zone ? `<span style="font-size: 11px; font-weight: 700; color: var(--text-muted); opacity: 0.6;">${esc(zone.zone_name)}</span>` : ''}
          </div>
        </div>
        <div style="display: flex; gap: 4px; border: 1px solid var(--border); background: var(--bg-elevated); border-radius: 8px; padding: 2px;">
          <button title="View Details" class="btn-icon-sm" style="border: none; background: transparent; color: var(--accent);" onclick="viewChurchDetails(${c.church_id})">${icon('eye')}</button>
          <button title="Edit" class="btn-icon-sm" style="border: none; background: transparent;" onclick="openEditChurchModal(${c.church_id})">${icon('pencil')}</button>
          <button title="Delete" class="btn-icon-sm hover:text-danger" style="border: none; background: transparent;" onclick="deleteChurch(${c.church_id})">${icon('trash-2')}</button>
        </div>
      </div>

      <div style="font-size: 13px; color: var(--text-secondary); line-height: 1.5; margin-bottom: 24px; min-height: 40px; display: flex; align-items: start; gap: 8px;">
        ${c.church_address ? `
          <div style="margin-top: 2px; color: var(--accent);">${icon('map-pin', 'icon-xs')}</div>
          <span>${esc(c.church_address)}</span>
        ` : '<span style="color: var(--text-muted); font-style: italic; opacity: 0.6;">No location recorded</span>'}
      </div>

      <div style="margin-top: auto;">
        <div style="font-size: 10px; font-weight: 800; text-transform: uppercase; letter-spacing: 0.05em; color: var(--text-muted); margin-bottom: 12px; display: flex; align-items: center; gap: 6px;">
          ${icon('user', 'icon-xs')} Leadership
        </div>
        ${pObj ? `
          <div style="display: flex; align-items: center; gap: 12px; padding: 12px; background: var(--bg-elevated); border-radius: var(--radius-lg); border: 1px solid var(--border);">
            ${pastorAvatar(pObj.pastor_name, pObj.image_url, 'sm')}
            <div style="flex: 1;">
              <div style="font-size: 13px; font-weight: 700; color: var(--text-primary);">${esc(pObj.pastor_name)}</div>
              <div style="font-size: 11px; color: var(--text-muted); font-weight: 500;">Senior Pastor</div>
            </div>
            <div title="Assigned" style="color: var(--success);">${icon('check-circle', 'icon-xs')}</div>
          </div>
        ` : `
          <div style="display: flex; align-items: center; gap: 12px; padding: 12px; background: var(--bg-base); border-radius: var(--radius-lg); border: 1px dashed var(--danger-dim); color: var(--danger);">
            <div style="width: 32px; height: 32px; border-radius: 50%; background: var(--danger-dim); display: flex; align-items: center; justify-content: center; opacity: 0.6;">
              ${icon('user-x', 'icon-xs')}
            </div>
            <div style="font-size: 13px; font-weight: 700; opacity: 0.8;">Station Vacant</div>
          </div>
        `}
      </div>
    </div>
  `;
}

// ── Church Form ───────────────────────────────────────────────
function buildChurchForm(c = {}) {
  const distOpts = `<option value="">— No District —</option>` +
    (Array.isArray(districts) ? districts : [])
      .map(d => `<option value="${d.district_id}" ${c.district_id === d.district_id ? 'selected' : ''}>${esc(d.district_name)}</option>`)
      .join('');

  const zoneOpts = `<option value="">— No Zone —</option>` +
    (Array.isArray(zones) ? zones : [])
      .filter(z => !c.district_id || z.district_id === c.district_id)
      .map(z => `<option value="${z.zone_id}" ${c.zone_id === z.zone_id ? 'selected' : ''}>${esc(z.zone_name)}</option>`)
      .join('');

  return `
    <div class="form-grid">
      <div class="form-group span-2">
        <label>Church Name *</label>
        <div style="position: relative;">
          <div style="position: absolute; left: 12px; top: 50%; transform: translateY(-50%); color: var(--accent);">
            ${icon('church', 'icon-sm')}
          </div>
          <input type="text" id="f-ch-name" style="padding-left: 40px;" placeholder="Full name of the church" value="${esc(c.church_name || '')}">
        </div>
      </div>

      <div class="form-group">
        <label>District Allocation</label>
        <select id="f-ch-district" onchange="onChurchDistrictChange()">
          ${distOpts}
        </select>
      </div>

      <div class="form-group">
        <label>Regional Zone</label>
        <select id="f-ch-zone">${zoneOpts}</select>
      </div>

      <div class="form-group">
        <label>Church Address</label>
        <textarea id="f-ch-address" rows="2" placeholder="Street, Barangay, City/Province">${esc(c.church_address || '')}</textarea>
      </div>

      <div class="form-group">
        <label>Operational Notes</label>
        <textarea id="f-ch-notes" rows="2" placeholder="Additional details or history...">${esc(c.notes || '')}</textarea>
      </div>

      <div class="form-group span-2">
        <label style="display: flex; align-items: center; gap: 12px; cursor: pointer; background: var(--bg-elevated); padding: 12px; border-radius: var(--radius-md); border: 1px solid var(--border);">
          <input type="checkbox" id="f-ch-intl" ${c.is_international ? 'checked' : ''} style="width: 18px; height: 18px; accent-color: var(--accent);">
          <div style="flex: 1;">
            <div style="font-size: 13px; font-weight: 700; color: var(--text-primary);">International Status</div>
            <div style="font-size: 11px; color: var(--text-muted);">Mark if this church is located outside PH</div>
          </div>
          <div style="color: var(--accent); opacity: 0.8;">${icon('globe', 'icon-sm')}</div>
        </label>
      </div>
    </div>
  `;
}

window.onChurchDistrictChange = function() {
  const distId = +document.getElementById('f-ch-district')?.value || null;
  const zoneSelect = document.getElementById('f-ch-zone');
  if (!zoneSelect) return;

  const filteredZones = distId
    ? (Array.isArray(zones) ? zones : []).filter(z => z.district_id === distId)
    : (Array.isArray(zones) ? zones : []);

  zoneSelect.innerHTML = `<option value="">— No Zone —</option>` +
    filteredZones.map(z => `<option value="${z.zone_id}">${esc(z.zone_name)}</option>`).join('');
};

// ── CRUD ──────────────────────────────────────────────────────
window.openAddChurchModal = function() {
  openModal(
    `${icon('church')} Add Church`,
    buildChurchForm(),
    `<button class="btn btn-secondary" onclick="closeModal()">${icon('x')} Cancel</button>
     <button class="btn btn-primary" onclick="saveChurch()">${icon('save')} Save Church</button>`,
    'modal-lg'
  );
};

window.openEditChurchModal = function(id) {
  const c = (Array.isArray(churches) ? churches : []).find(x => x.church_id === id);
  if (!c) return;

  openModal(
    `${icon('pencil')} Edit Church`,
    buildChurchForm(c),
    `<button class="btn btn-secondary" onclick="closeModal()">${icon('x')} Cancel</button>
     <button class="btn btn-primary" onclick="saveChurch(${id})">${icon('save')} Save Changes</button>`,
    'modal-lg'
  );
};

window.saveChurch = async function(id = null) {
  const name = document.getElementById('f-ch-name')?.value.trim();
  const address = document.getElementById('f-ch-address')?.value.trim();
  const distId = +document.getElementById('f-ch-district')?.value || null;
  const zoneId = +document.getElementById('f-ch-zone')?.value || null;
  const notes = document.getElementById('f-ch-notes')?.value.trim();
  const isIntl = document.getElementById('f-ch-intl')?.checked || false;

  if (!name) {
    showToast('Church name is required.', 'error');
    return;
  }

  const payload = {
    church_name: name,
    church_address: address,
    district_id: distId,
    zone_id: zoneId,
    notes: notes,
    is_international: isIntl
  };

  const btn = document.querySelector('.modal-footer .btn-primary');
  const originalHtml = btn ? btn.innerHTML : '';

  try {
    if (btn) {
      btn.disabled = true;
      btn.innerHTML = `${icon('loader', 'animate-spin')} Saving...`;
    }

    if (id) {
      // Update in Supabase
      const updated = await dbService.update('churches', 'church_id', id, payload);
      const c = churches.find(x => x.church_id === id);
      if (c) Object.assign(c, updated);
      showToast(`"${name}" updated.`, 'success');
    } else {
      await dbService.create('churches', payload);
      showToast(`"${name}" added.`, 'success');
    }

    closeModal();
    renderChurches();
  } catch (err) {
    console.error('[Churches] Save failed:', err);
    showToast(`Failed to sync with Cloud: ${err.message || 'Unknown error'}`, 'error');
  } finally {
    if (btn) {
      btn.disabled = false;
      btn.innerHTML = originalHtml;
    }
  }
};

window.deleteChurch = function(id) {
  const c = churches.find(x => x.church_id === id);
  if (!c) return;

  confirmDelete(`${c.church_name} (Removes it from District & Zone)`, async () => {
    try {
      showToast(`Deleting "${c.church_name}"...`, 'info');
      // Delete from Supabase
      await dbService.delete('churches', 'church_id', id);
      
      // Update local state (Optimistic UI)
      const idx = churches.findIndex(x => x.church_id === id);
      if (idx > -1) churches.splice(idx, 1);
      
      // Also remove any active assignments from local state since Supabase cascades or sets null
      for (let i = churchAssignments.length - 1; i >= 0; i--) {
         if (churchAssignments[i].church_id === id) {
             churchAssignments[i].church_id = null;
         }
      }

      showToast(`"${c.church_name}" deleted successfully.`, 'success');
      renderChurches();
    } catch (err) {
      console.error('[Churches] Delete failed:', err);
      showToast('Deletion failed. Check connection.', 'error');
    }
  });
};

window.viewChurchDetails = function(id) {
  try {
    const c = (Array.isArray(churches) ? churches : []).find(x => x.church_id === id);
    if (!c) return;

    const activeAssign = (Array.isArray(churchAssignments) ? churchAssignments : []).find(a => a.church_id === c.church_id && !a.end_date);
    const pObj = activeAssign ? (Array.isArray(pastors) ? pastors : []).find(p => p.pastor_id === activeAssign.pastor_id) : null;
    const zone = c.zone_id ? (Array.isArray(zones) ? zones : []).find(z => z.zone_id === c.zone_id) : null;
    const district = c.district_id ? (Array.isArray(districts) ? districts : []).find(d => d.district_id === c.district_id) : null;

    const churchDisciples = (pObj && Array.isArray(disciples))
      ? disciples.filter(d => d.pastor_id === pObj.pastor_id)
      : [];

    const disciplesListHtml = churchDisciples.length > 0
      ? churchDisciples.map(d => `
        <div style="padding:8px;border-bottom:1px solid var(--border);font-size:13px;">
          ${esc(d.full_name)}
        </div>
      `).join('')
      : `<div style="color:var(--text-muted);font-size:13px;font-style:italic;padding:8px;">No disciples assigned to this pastor.</div>`;

    openModal(
      `${icon('church')} Church Details`,
      `
      <div style="display:flex;flex-direction:column;gap:20px;">
        <div>
          <div style="font-size:24px;font-weight:800;color:var(--text-primary);">
            ${esc(c.church_name)}
          </div>

          <div style="font-size:13px;color:var(--text-muted);margin-top:4px;">
            ${district ? esc(district.district_name) : 'No District'}
            ${zone ? ` › ${esc(zone.zone_name)}` : ''}
            ${c.is_international ? ' (International)' : ''}
          </div>

          <div style="font-size:13px;color:var(--text-secondary);margin-top:8px;">
            ${icon('map-pin', 'icon-xs')}
            ${c.church_address ? esc(c.church_address) : 'No address'}
          </div>
        </div>

        <div class="form-grid" style="gap:16px;">
          <div class="card" style="padding:16px;background:var(--bg-surface);border:1px solid var(--border);">
            <div style="font-size:11px;font-weight:800;text-transform:uppercase;color:var(--text-muted);margin-bottom:12px;display:flex;align-items:center;gap:6px;">
              ${icon('user','icon-xs')} Assigned Pastor
            </div>

            ${
              pObj
                ? `
                <div style="display:flex;align-items:center;gap:12px;">
                  ${pastorAvatar(pObj.pastor_name, pObj.image_url, 'md')}
                  <div>
                    <div style="font-weight:700;font-size:14px;">${esc(pObj.pastor_name)}</div>
                    ${pObj.wife_name ? `<div style="font-size:12px;color:var(--text-secondary);margin-top:2px;">Wife: ${esc(pObj.wife_name)}</div>` : ''}
                  </div>
                </div>
              `
                : `<div style="color:var(--danger);font-size:13px;font-weight:600;">Station Vacant</div>`
            }
          </div>

          <div class="card" style="padding:16px;background:var(--bg-surface);border:1px solid var(--border);max-height:200px;overflow-y:auto;">
            <div style="font-size:11px;font-weight:800;text-transform:uppercase;color:var(--text-muted);margin-bottom:12px;display:flex;align-items:center;gap:6px;">
              ${icon('users','icon-xs')} Disciples (${churchDisciples.length})
            </div>
            ${!pObj ? `<div style="color:var(--text-muted);font-size:13px;font-style:italic;">Need an assigned pastor first.</div>` : disciplesListHtml}
          </div>
        </div>

        ${c.notes ? `
          <div class="card" style="padding:16px;background:var(--bg-surface);border:1px solid var(--border);">
            <div style="font-size:11px;font-weight:800;text-transform:uppercase;color:var(--text-muted);margin-bottom:8px;display:flex;align-items:center;gap:6px;">
              ${icon('sticky-note','icon-xs')} Operational Notes
            </div>
            <div style="font-size:13px;color:var(--text-secondary);line-height:1.5;">
              ${esc(c.notes)}
            </div>
          </div>
        ` : ''}
      </div>
      `,
      `
      <button class="btn btn-secondary" onclick="closeModal()">Close Details</button>
      <button class="btn btn-primary" onclick="closeModal();openEditChurchModal(${c.church_id})">${icon('pencil')} Edit Church</button>
      `,
      'modal-lg'
    );
  } catch (err) {
    console.error('viewChurchDetails error:', err);
  }
};

window.filterChurches = debounce(() => {
  updateChurchFilterBadge();
  renderChurchesList();
}, 200);