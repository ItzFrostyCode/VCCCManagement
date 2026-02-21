// ============================================================
// Church Management System — Churches Module
// ============================================================

import {
  churches, districts, zones, churchAssignments, pastors, nextId, churchHasActivePastor, cascadeDeleteChurch, saveAll
} from './data.js';
import {
  icon, showToast, esc, pastorAvatar, emptyState, confirmDelete, debounce
} from './utils.js';
import { openModal, closeModal, updateNavCounts } from './app.js';

const TODAY = new Date().toISOString().split('T')[0];
let currentView = 'all'; // 'all', 'vacant', 'international'

// ── Render Churches Main ──────────────────────────────────────
export function renderChurches() {
  const content = document.getElementById('page-content');
  const actions = document.getElementById('topbar-actions');
  actions.innerHTML = `<button class="btn btn-primary" onclick="openAddChurchModal()">${icon('plus')} Add Church</button>`;

  content.innerHTML = `<div class="fade-in">
    <div class="filter-bar tabs-container" style="margin-bottom:16px">
      <div class="segmented-control" style="width:100%">
        ${renderTab('all', 'All Churches', 'church')}
        ${renderTab('vacant', 'Vacant', 'alert-triangle')}
        ${renderTab('international', 'International', 'globe')}
      </div>
    </div>

    <div class="filter-bar">
      <div class="search-input-wrap" style="flex:1">
        ${icon('search','icon-sm search-icon')}
        <input type="text" id="church-search" placeholder="Search churches…" oninput="filterChurches()">
      </div>
      <select id="church-district-filter" class="filter-select" onchange="filterChurches()">
        <option value="">All Districts</option>
        ${districts.map(d => `<option value="${d.district_id}">${esc(d.district_name)}</option>`).join('')}
      </select>
    </div>
    <div id="churches-list" style="margin-top:16px"></div>
  </div>`;

  renderChurchesList();
  lucide.createIcons();
}

function renderTab(id, label, iconName) {
  const isActive = currentView === id;
  return `<button class="segmented-btn ${isActive ? 'active' : ''}" onclick="switchChurchView('${id}')">
    ${icon(iconName, 'icon-xs')} ${label}
  </button>`;
}

window.switchChurchView = function(view) {
  currentView = view;
  renderChurches();
};

// ── Render List ───────────────────────────────────────────────
function renderChurchesList() {
  const search  = (document.getElementById('church-search')?.value || '').toLowerCase();
  const distId  = +document.getElementById('church-district-filter')?.value || null;
  const container = document.getElementById('churches-list');
  if (!container) return;

  let list = churches.filter(c => {
    if (currentView === 'vacant') {
      const hasPastor = churchAssignments.some(a => a.church_id === c.church_id && !a.end_date);
      if (hasPastor) return false;
    }
    if (currentView === 'international' && !c.is_international) return false;
    if (search && !c.church_name.toLowerCase().includes(search) &&
        !(c.church_address||'').toLowerCase().includes(search)) return false;
    if (distId && c.district_id !== distId) return false;
    return true;
  });

  if (list.length === 0) {
    container.innerHTML = emptyState('No Churches Found', 'Add a church to get started.', 'Add Church', 'openAddChurchModal()');
    lucide.createIcons();
    return;
  }

  list.sort((a, b) => a.church_name.localeCompare(b.church_name));

  container.innerHTML = `<div class="grid-list">
    ${list.map(c => renderChurchCard(c)).join('')}
  </div>`;
  lucide.createIcons();
}

function renderChurchCard(c) {
  const activeAssign = churchAssignments.find(a => a.church_id === c.church_id && !a.end_date);
  const pObj = activeAssign ? pastors.find(p => p.pastor_id === activeAssign.pastor_id) : null;
  const zone = c.zone_id ? zones.find(z => z.zone_id === c.zone_id) : null;
  const district = c.district_id ? districts.find(d => d.district_id === c.district_id) : null;

  const intlStyle = c.is_international ? 'border: 1px solid var(--primary);' : '';

  return `<div class="card church-card" style="${intlStyle}">
    <div style="display:flex;justify-content:space-between;align-items:start;margin-bottom:12px">
      <div>
        <div style="font-weight:700;font-size:16px">${esc(c.church_name)}</div>
        <div style="font-size:12px;color:var(--text-muted);margin-top:2px">
          ${c.is_international ? '<span class="badge badge-international">International</span>' : ''}
          ${district ? `<span>${esc(district.district_name)}</span>` : ''}
          ${zone ? ` · <span>${esc(zone.zone_name)}</span>` : ''}
        </div>
      </div>
      <div style="display:flex;gap:4px">
        <button class="btn-icon" onclick="openEditChurchModal(${c.church_id})">${icon('pencil')}</button>
        <button class="btn-icon" onclick="deleteChurch(${c.church_id})">${icon('trash-2')}</button>
      </div>
    </div>

    <div style="font-size:13px;color:var(--text-secondary);margin-bottom:16px;flex:1">
      ${c.church_address ? `<div>${icon('map-pin','icon-xs')} ${esc(c.church_address)}</div>` : '<div style="color:var(--text-muted);font-style:italic">No address</div>'}
    </div>

    <div style="border-top:1px solid var(--border);padding-top:12px;margin-top:auto">
      ${pObj ? `
        <div style="display:flex;align-items:center;gap:10px">
          ${pastorAvatar(pObj.pastor_name, pObj.image_url, 'sm')}
          <div>
            <div style="font-size:13px;font-weight:600">${esc(pObj.pastor_name)}</div>
            <div style="font-size:11px;color:var(--text-muted)">Senior Pastor</div>
          </div>
        </div>
      ` : `<div style="font-size:13px;color:var(--text-muted);font-style:italic">Vacant — no pastor assigned</div>`}
    </div>
  </div>`;
}

// ── Church Form ───────────────────────────────────────────────
function buildChurchForm(c = {}) {
  const distOpts = `<option value="">— No District —</option>` +
    districts.map(d => `<option value="${d.district_id}" ${c.district_id === d.district_id ? 'selected' : ''}>${esc(d.district_name)}</option>`).join('');

  const zoneOpts = `<option value="">— No Zone —</option>` +
    zones.filter(z => !c.district_id || z.district_id === c.district_id)
      .map(z => `<option value="${z.zone_id}" ${c.zone_id === z.zone_id ? 'selected' : ''}>${esc(z.zone_name)}</option>`).join('');

  return `
    <div class="form-grid">
      <div class="form-group span-2">
        <label>${icon('church','icon-xs')} Church Name *</label>
        <input type="text" id="f-ch-name" placeholder="Full church name" value="${esc(c.church_name||'')}">
      </div>
      <div class="form-group span-2">
        <label>${icon('map-pin','icon-xs')} Church Address</label>
        <textarea id="f-ch-address" placeholder="e.g. Purok 5, Brgy. San Jose, General Santos City">${esc(c.church_address||'')}</textarea>
      </div>
      <div class="form-group">
        <label>${icon('map','icon-xs')} District (optional)</label>
        <select id="f-ch-district" onchange="onChurchDistrictChange()">
          ${distOpts}
        </select>
      </div>
      <div class="form-group">
        <label>${icon('layers','icon-xs')} Zone (optional)</label>
        <select id="f-ch-zone">${zoneOpts}</select>
      </div>
      <div class="form-group span-2">
        <label>${icon('file-text','icon-xs')} Notes</label>
        <textarea id="f-ch-notes" placeholder="Optional notes">${esc(c.notes||'')}</textarea>
      </div>
      <div class="form-group">
        <label style="display:flex;align-items:center;gap:6px;cursor:pointer">
          <input type="checkbox" id="f-ch-intl" ${c.is_international ? 'checked' : ''} style="width:auto">
          ${icon('globe','icon-xs')} International Church
        </label>
      </div>
    </div>`;
}

window.onChurchDistrictChange = function() {
  const distId = +document.getElementById('f-ch-district')?.value || null;
  const zoneSelect = document.getElementById('f-ch-zone');
  if (!zoneSelect) return;
  const filteredZones = distId ? zones.filter(z => z.district_id === distId) : zones;
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
  const c = churches.find(x => x.church_id === id);
  if (!c) return;
  openModal(
    `${icon('pencil')} Edit Church`,
    buildChurchForm(c),
    `<button class="btn btn-secondary" onclick="closeModal()">${icon('x')} Cancel</button>
     <button class="btn btn-primary" onclick="saveChurch(${id})">${icon('save')} Save Changes</button>`,
    'modal-lg'
  );
};

window.saveChurch = function(id = null) {
  const name    = document.getElementById('f-ch-name')?.value.trim();
  const address = document.getElementById('f-ch-address')?.value.trim();
  const distId  = +document.getElementById('f-ch-district')?.value || null;
  const zoneId  = +document.getElementById('f-ch-zone')?.value || null;
  const notes   = document.getElementById('f-ch-notes')?.value.trim();
  const isIntl  = document.getElementById('f-ch-intl')?.checked || false;

  if (!name) { showToast('Church name is required.', 'error'); return; }

  if (id) {
    const c = churches.find(x => x.church_id === id);
    if (!c) return;
    Object.assign(c, { church_name: name, church_address: address||null, district_id: distId, zone_id: zoneId, notes: notes||null, is_international: isIntl });
    showToast(`"${name}" updated. District reflects these changes.`, 'success');
  } else {
    churches.push({
      church_id: nextId('church'),
      church_name: name,
      church_address: address || null,
      district_id: distId,
      zone_id: zoneId,
      is_international: isIntl,
      notes: notes || null,
      created_at: TODAY
    });
    showToast(`"${name}" added. District reflects this new church.`, 'success');
  }
  saveAll();
  updateNavCounts();
  closeModal();
  renderChurches();
};

window.deleteChurch = function(id) {
  const c = churches.find(x => x.church_id === id);
  if (!c) return;
  confirmDelete(c.church_name + " (Removes it from District & Zone)", () => {
    cascadeDeleteChurch(id);
    showToast(`"${c.church_name}" has been deleted. District updated.`, 'info');
    saveAll();
    updateNavCounts();
    renderChurches();
  });
};

window.filterChurches = debounce(renderChurchesList, 200);
