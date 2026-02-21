// ============================================================
// Church Management System — Districts / Zones Module
// Hierarchy: District → Zone → Church
// ============================================================

import {
  districts, zones, churches, pastors, churchAssignments,
  getZonesForDistrict, getChurchesForZone, getUnzonedChurchesForDistrict, cascadeDeleteChurch, saveAll, nextId
} from './data.js';
import {
  icon, showToast, esc, pastorAvatar, statusBadge, assignmentBadge,
  emptyState, confirmDelete, debounce
} from './utils.js';
import { openModal, closeModal, navigate, updateNavCounts } from './app.js';

const TODAY = new Date().toISOString().split('T')[0];

// ── Render Districts Page ─────────────────────────────────────
export function renderDistricts() {
  const content = document.getElementById('page-content');
  const actions = document.getElementById('topbar-actions');
  actions.innerHTML = `<button class="btn btn-primary" onclick="openAddDistrictModal()">${icon('plus')} Add District</button>`;

  content.innerHTML = `<div class="fade-in">
    <div class="filter-bar">
      <div class="search-input-wrap">
        ${icon('search','icon-sm search-icon')}
        <input type="text" id="district-search" placeholder="Search districts, zones…" oninput="filterDistricts()">
      </div>
    </div>
    <div id="districts-list" style="margin-top:16px"></div>
  </div>`;

  renderDistrictsList();
  lucide.createIcons();
}

function renderDistrictsList() {
  const search = (document.getElementById('district-search')?.value || '').toLowerCase();
  const container = document.getElementById('districts-list');
  if (!container) return;

  let distList = districts.filter(d =>
    !search ||
    d.district_name.toLowerCase().includes(search) ||
    zones.some(z => z.district_id === d.district_id && z.zone_name.toLowerCase().includes(search))
  );

  if (distList.length === 0) {
    container.innerHTML = emptyState(
      districts.length === 0 ? 'No Districts Yet' : 'No Results',
      districts.length === 0 ? 'Create your first district to start organizing your churches.' : 'Try adjusting your search.',
      districts.length === 0 ? 'Add District' : '',
      'openAddDistrictModal()'
    );
    lucide.createIcons();
    return;
  }

  container.innerHTML = distList.map(renderDistrictCard).join('');
  lucide.createIcons();
  initDragAndDrop();
}

// ── District Card ─────────────────────────────────────────────
function renderDistrictCard(district) {
  const distZones = getZonesForDistrict(district.district_id);
  const unzonedChurches = getUnzonedChurchesForDistrict(district.district_id);
  const totalChurches = churches.filter(c => {
    if (c.district_id === district.district_id) return true;
    if (c.zone_id) {
      const z = zones.find(zn => zn.zone_id === c.zone_id);
      return z && z.district_id === district.district_id;
    }
    return false;
  }).length;

  const leaderObj    = district.leader_pastor_id ? pastors.find(p => p.pastor_id === district.leader_pastor_id) : null;
  const assistantObj = district.assistant_leader_pastor_id ? pastors.find(p => p.pastor_id === district.assistant_leader_pastor_id) : null;

  return `<div class="card" id="district-card-${district.district_id}" style="margin-bottom:16px; transition:all 0.2s">
    <!-- Header Row (Always Visible) -->
    <div class="district-header-row" onclick="toggleDistrictCard(${district.district_id})">
      <div style="flex:1">
        <div class="district-name" style="font-size:16px;font-weight:700;transition:color 0.2s">${esc(district.district_name)}</div>
        <div style="font-size:12px;color:var(--text-muted)">${distZones.length} zones · ${totalChurches} churches</div>
      </div>
      <div style="display:flex;align-items:center;gap:4px">
        <button class="btn-icon" onclick="event.stopPropagation(); toggleDistrictEditMode(${district.district_id})">${icon('settings','icon-sm')}</button>
        <div style="transform:rotate(0deg);transition:transform 0.2s" id="chevron-${district.district_id}">${icon('chevron-down')}</div>
      </div>
    </div>

    <!-- Body Content (Collapsible) -->
    <div class="card-body-content" id="district-body-${district.district_id}" style="margin-top:16px; display:none">

      <!-- Edit Mode Actions -->
      <div class="edit-actions" style="margin-bottom:16px; gap:8px; border-bottom:1px solid var(--border); padding-bottom:16px">
        <button class="btn btn-sm btn-ghost" onclick="openEditDistrictModal(${district.district_id})">${icon('pencil')} Rename</button>
        <button class="btn btn-sm btn-ghost" style="color:var(--danger)" onclick="deleteDistrict(${district.district_id})">${icon('trash')} Delete</button>
        <div style="flex:1"></div>
        <button class="btn btn-sm btn-ghost" onclick="openAddZoneModal(${district.district_id})">${icon('plus')} Zone</button>
        <button class="btn btn-sm btn-ghost" onclick="openAddChurchInDistrict(${district.district_id})">${icon('church')} Church</button>
      </div>

      <!-- Leadership Grid -->
      <div class="leadership-section">
        <div class="leadership-grid">
          <!-- Leader -->
          <div class="leader-cell">
            ${leaderObj
              ? `<div style="display:flex;align-items:center;gap:10px;flex:1">
                   ${pastorAvatar(leaderObj.pastor_name, leaderObj.image_url, 'sm')}
                   <div><div style="font-weight:600;font-size:13px">${esc(leaderObj.pastor_name)}</div><div style="font-size:11px;color:var(--text-muted);text-transform:uppercase;letter-spacing:0.05em">District Leader</div></div>
                 </div>`
              : `<div style="display:flex;align-items:center;gap:10px;flex:1;opacity:0.6">
                   <div class="avatar avatar-sm" style="background:var(--bg-base);color:var(--text-muted)">?</div>
                   <div><div style="font-weight:600;font-size:13px">Vacant</div><div style="font-size:11px;color:var(--text-muted)">District Leader</div></div>
                 </div>`
            }
          </div>
          <!-- Assistant -->
          <div class="leader-cell">
            ${assistantObj
              ? `<div style="display:flex;align-items:center;gap:10px;flex:1">
                   ${pastorAvatar(assistantObj.pastor_name, assistantObj.image_url, 'sm')}
                   <div><div style="font-weight:600;font-size:13px">${esc(assistantObj.pastor_name)}</div><div style="font-size:11px;color:var(--text-muted);text-transform:uppercase;letter-spacing:0.05em">Assistant Leader</div></div>
                 </div>`
              : `<div style="display:flex;align-items:center;gap:10px;flex:1;opacity:0.6">
                   <div class="avatar avatar-sm" style="background:var(--bg-base);color:var(--text-muted)">?</div>
                   <div><div style="font-weight:600;font-size:13px">Vacant</div><div style="font-size:11px;color:var(--text-muted)">Assistant Leader</div></div>
                 </div>`
            }
          </div>
        </div>
      </div>

      ${unzonedChurches.length > 0 ? `
        <div style="margin-bottom:16px">
          <div style="font-size:11px;font-weight:700;color:var(--text-muted);text-transform:uppercase;letter-spacing:0.5px;margin-bottom:6px">
            ${icon('alert-circle','icon-xs')} Unzoned Churches
          </div>
          <div class="unzoned-pool" data-district="${district.district_id}">
            ${unzonedChurches.map(c => renderChurchDraggable(c)).join('')}
          </div>
        </div>
      ` : ''}

      <div class="city-list">
        ${distZones.length === 0
          ? `<div style="color:var(--text-muted);font-size:13px;padding:8px 0;font-style:italic">No zones created yet.</div>`
          : distZones.map(z => renderZoneCard(z)).join('')}
      </div>
    </div>
  </div>`;
}

// ── Toggle Scripts ────────────────────────────────────────────
window.toggleDistrictCard = function(id) {
  const body = document.getElementById(`district-body-${id}`);
  const chev = document.getElementById(`chevron-${id}`);
  if (body) {
    const isHidden = body.style.display === 'none';
    body.style.display = isHidden ? 'block' : 'none';
    if (chev) chev.style.transform = isHidden ? 'rotate(180deg)' : 'rotate(0deg)';
  }
};

window.toggleDistrictEditMode = function(id) {
  const card = document.getElementById(`district-card-${id}`);
  const body = document.getElementById(`district-body-${id}`);
  const chev = document.getElementById(`chevron-${id}`);
  
  // Ensure it's expanded when editing
  if (body && body.style.display === 'none') {
    body.style.display = 'block';
    if (chev) chev.style.transform = 'rotate(180deg)';
  }
  
  if (card) {
    card.classList.toggle('editing');
  }
};

function renderChurchDraggable(c) {
  const activeAssign = churchAssignments.find(a => a.church_id === c.church_id && !a.end_date);
  const pastor = activeAssign ? pastors.find(p => p.pastor_id === activeAssign.pastor_id) : null;
  return `<div class="church-row draggable-church" draggable="true" data-church-id="${c.church_id}" style="cursor:grab">
    <div class="church-row-info">
      <div class="church-row-icon">${icon('grip-vertical','icon-xs')}</div>
      <div>
        <div class="church-row-name">${esc(c.church_name)}</div>
        ${c.church_address ? `<div class="church-row-addr">${icon('map-pin','icon-xs')} ${esc(c.church_address)}</div>` : ''}
      </div>
    </div>
    <div class="church-row-pastor">
      ${pastor
        ? `<div class="pastor-info">${pastorAvatar(pastor.pastor_name, pastor.image_url, 'sm')}<div style="font-size:13px;font-weight:600">${esc(pastor.pastor_name)}</div></div>`
        : `<span class="badge badge-suspended" style="font-size:10px">${icon('alert-triangle','icon-xs')} Vacant</span>`}
    </div>
    <div class="td-actions">
      ${!pastor ? `<button class="btn btn-sm btn-ghost" style="font-size:11px" onclick="openAssignPastorToChurch(${c.church_id})">${icon('user-plus')} Assign</button>` : ''}
      <button class="btn btn-icon-sm btn-ghost" onclick="openEditChurchInDistrict(${c.church_id})">${icon('pencil')}</button>
      <button class="btn btn-icon-sm btn-ghost" style="color:var(--danger)" onclick="deleteChurchFromDistrict(${c.church_id})">${icon('trash-2')}</button>
    </div>
  </div>`;
}

function renderZoneCard(z) {
  const zoneChurches = getChurchesForZone(z.zone_id);
  const total  = zoneChurches.length;
  const filled = zoneChurches.filter(c => churchAssignments.some(a => a.church_id === c.church_id && !a.end_date)).length;
  const percent = total > 0 ? (filled / total) * 100 : 0;
  const vacantCount = total - filled;

  return `<div class="zone-card-wrap">
    <div class="zone-card" onclick="toggleCollapse('zone-${z.zone_id}')" style="align-items:flex-start">
      <div style="flex:1;min-width:0">
        <div class="zone-title" style="margin-bottom:6px">
          ${icon('layers','icon-sm')}
          <span style="font-weight:600">${esc(z.zone_name)}</span>
        </div>
        <div style="padding-right:16px">
          <div style="display:flex;justify-content:space-between;font-size:11px;color:var(--text-muted);margin-bottom:2px">
            <span>Coverage: ${filled}/${total} Assigned</span>
            <span class="${filled===total&&total>0?'text-success':''}">${Math.round(percent)}%</span>
          </div>
          <div class="zone-progress">
            <div class="zone-bar" style="width:${percent}%"></div>
          </div>
          ${vacantCount > 0 ? `<div style="font-size:10px;color:var(--danger);margin-top:2px">${vacantCount} vacant churches</div>` : ''}
        </div>
      </div>
      <div class="td-actions" onclick="event.stopPropagation()">
        <button class="btn btn-sm btn-ghost" onclick="openAddChurchInZone(${z.zone_id})">${icon('plus')} Church</button>
        <button class="btn btn-icon-sm btn-ghost" onclick="editZone(${z.zone_id})">${icon('pencil')}</button>
        <button class="btn btn-icon-sm btn-ghost" style="color:var(--danger)" onclick="deleteZone(${z.zone_id})">${icon('trash-2')}</button>
        ${icon('chevron-down','icon-sm')}
      </div>
    </div>
    <div id="zone-${z.zone_id}" class="zone-churches drop-zone" data-zone-id="${z.zone_id}">
      ${zoneChurches.length === 0
        ? `<div class="zone-church-empty drop-placeholder">${icon('info','icon-xs')} No churches yet. Drag churches here or <button class="btn btn-sm btn-secondary" onclick="openAddChurchInZone(${z.zone_id})">${icon('plus')} Add</button></div>`
        : zoneChurches.map(c => renderChurchRow(c)).join('')}
    </div>
  </div>`;
}

function renderChurchRow(c) {
  const activeAssign = churchAssignments.find(a => a.church_id === c.church_id && !a.end_date);
  const pastor = activeAssign ? pastors.find(p => p.pastor_id === activeAssign.pastor_id) : null;

  return `<div class="church-row draggable-church" draggable="true" data-church-id="${c.church_id}">
    <div class="church-row-info">
      <div class="church-row-icon">${icon('church','icon-xs')}</div>
      <div>
        <div class="church-row-name">${esc(c.church_name)}</div>
        ${c.church_address ? `<div class="church-row-addr">${icon('map-pin','icon-xs')} ${esc(c.church_address)}</div>` : ''}
      </div>
    </div>
    <div class="church-row-pastor">
      ${pastor
        ? `<div class="pastor-info">
            ${pastorAvatar(pastor.pastor_name, pastor.image_url, 'sm')}
            <div>
              <div style="font-size:13px;font-weight:600">${esc(pastor.pastor_name)}</div>
              <div style="display:flex;gap:4px;margin-top:2px">${statusBadge(pastor.status_code)} ${assignmentBadge(activeAssign.assignment_type_code)}</div>
            </div>
           </div>`
        : `<span class="badge badge-suspended" style="font-size:10px">${icon('alert-triangle','icon-xs')} Vacant</span>`}
    </div>
    <div class="td-actions">
      ${!pastor ? `<button class="btn btn-sm btn-ghost" style="font-size:11px" onclick="openAssignPastorToChurch(${c.church_id})">${icon('user-plus')} Assign</button>` : `<button class="btn btn-icon-sm btn-ghost" onclick="viewPastor(${pastor.pastor_id})">${icon('eye')}</button>`}
      <button class="btn btn-icon-sm btn-ghost" onclick="openEditChurchInDistrict(${c.church_id})">${icon('pencil')}</button>
      <button class="btn btn-icon-sm btn-ghost" style="color:var(--danger)" onclick="deleteChurchFromDistrict(${c.church_id})">${icon('trash-2')}</button>
    </div>
  </div>`;
}

// ── Drag and Drop ─────────────────────────────────────────────
function initDragAndDrop() {
  let draggedChurchId = null;

  document.querySelectorAll('.draggable-church').forEach(el => {
    el.addEventListener('dragstart', e => {
      draggedChurchId = +el.dataset.churchId;
      el.style.opacity = '0.5';
      e.dataTransfer.effectAllowed = 'move';
    });
    el.addEventListener('dragend', () => {
      el.style.opacity = '';
      draggedChurchId = null;
    });
  });

  document.querySelectorAll('.drop-zone').forEach(zone => {
    zone.addEventListener('dragover', e => {
      e.preventDefault();
      zone.classList.add('drag-over');
    });
    zone.addEventListener('dragleave', () => zone.classList.remove('drag-over'));
    zone.addEventListener('drop', e => {
      e.preventDefault();
      zone.classList.remove('drag-over');
      if (!draggedChurchId) return;
      const zoneId = +zone.dataset.zoneId;
      const church = churches.find(c => c.church_id === draggedChurchId);
      if (!church) return;
      const z = zones.find(zn => zn.zone_id === zoneId);
      if (!z) return;
      church.zone_id = zoneId;
      church.district_id = z.district_id;
      showToast(`"${church.church_name}" moved to ${z.zone_name}.`, 'success');
      saveAll();
      renderDistrictsList();
    });
  });

  document.querySelectorAll('.unzoned-pool').forEach(pool => {
    pool.addEventListener('dragover', e => {
      e.preventDefault();
      pool.classList.add('drag-over');
    });
    pool.addEventListener('dragleave', () => pool.classList.remove('drag-over'));
    pool.addEventListener('drop', e => {
      e.preventDefault();
      pool.classList.remove('drag-over');
      if (!draggedChurchId) return;
      const districtId = +pool.dataset.district;
      const church = churches.find(c => c.church_id === draggedChurchId);
      if (!church) return;
      church.zone_id = null;
      church.district_id = districtId;
      showToast(`"${church.church_name}" removed from zone.`, 'info');
      saveAll();
      renderDistrictsList();
    });
  });
}

// ── Collapse Toggle ───────────────────────────────────────────
window.toggleCollapse = function(id) {
  const el = document.getElementById(id);
  if (el) el.style.display = el.style.display === 'none' ? '' : 'none';
};

// ── District CRUD ─────────────────────────────────────────────
window.openAddDistrictModal = function() {
  openModal(
    `${icon('map')} Add District`,
    buildDistrictForm(),
    `<button class="btn btn-secondary" onclick="closeModal()">${icon('x')} Cancel</button>
     <button class="btn btn-primary" onclick="saveDistrict()">${icon('save')} Save</button>`
  );
};

window.openEditDistrictModal = function(id) {
  const d = districts.find(x => x.district_id === id);
  if (!d) return;
  openModal(
    `${icon('pencil')} Edit District`,
    buildDistrictForm(d),
    `<button class="btn btn-secondary" onclick="closeModal()">${icon('x')} Cancel</button>
     <button class="btn btn-primary" onclick="saveDistrict(${id})">${icon('save')} Save Changes</button>`
  );
};

function buildDistrictForm(d = {}) {
  const available = pastors.filter(p => d.leader_pastor_id === p.pastor_id || d.assistant_leader_pastor_id === p.pastor_id || p.status_code !== 'suspended');
  const pastorOpts = `<option value="">— No Leader —</option>` +
    available.map(p => `<option value="${p.pastor_id}" ${d.leader_pastor_id === p.pastor_id ? 'selected' : ''}>${esc(p.pastor_name)}</option>`).join('');
  const asstOpts = `<option value="">— No Assistant —</option>` +
    available.map(p => `<option value="${p.pastor_id}" ${d.assistant_leader_pastor_id === p.pastor_id ? 'selected' : ''}>${esc(p.pastor_name)}</option>`).join('');

  return `<div class="form-grid cols-1">
    <div class="form-group">
      <label>${icon('map','icon-xs')} District Name *</label>
      <input type="text" id="f-dist-name" placeholder="e.g. District 1, Palawan" value="${esc(d.district_name||'')}">
    </div>
    <div class="form-group">
      <label>${icon('user','icon-xs')} District Leader (Pastor) *</label>
      <select id="f-dist-leader">${pastorOpts}</select>
    </div>
    <div class="form-group">
      <label>${icon('user-plus','icon-xs')} District Assistant Leader *</label>
      <select id="f-dist-assistant">${asstOpts}</select>
    </div>
    <div class="form-group">
      <label>${icon('file-text','icon-xs')} Notes</label>
      <textarea id="f-dist-notes" placeholder="Optional notes">${esc(d.notes||'')}</textarea>
    </div>
  </div>`;
}

window.saveDistrict = function(id = null) {
  const name   = document.getElementById('f-dist-name')?.value.trim();
  const leader = +document.getElementById('f-dist-leader')?.value || null;
  const asst   = +document.getElementById('f-dist-assistant')?.value || null;
  const notes  = document.getElementById('f-dist-notes')?.value.trim();
  if (!name) { showToast('District name is required.', 'error'); return; }
  if (!leader) { showToast('District Leader is required.', 'error'); return; }
  if (!asst) { showToast('District Assistant Leader is required.', 'error'); return; }
  if (leader && leader === asst) { showToast('Leader and Assistant cannot be the same person.', 'error'); return; }

  if (id) {
    const d = districts.find(x => x.district_id === id);
    if (!d) return;
    d.district_name = name;
    d.leader_pastor_id = leader;
    d.assistant_leader_pastor_id = asst;
    d.notes = notes || null;
    showToast('District updated.', 'success');
  } else {
    districts.push({ district_id: nextId('district'), district_name: name, leader_pastor_id: leader, assistant_leader_pastor_id: asst, notes: notes||null, created_at: TODAY });
    showToast('District added.', 'success');
  }
  saveAll();
  updateNavCounts();
  closeModal();
  renderDistricts();
};

window.deleteDistrict = function(id) {
  const d = districts.find(x => x.district_id === id);
  if (!d) return;
  confirmDelete(d.district_name, () => {
    const distZones = zones.filter(z => z.district_id === id);
    distZones.forEach(z => {
      const churchesInZone = churches.filter(c => c.zone_id === z.zone_id);
      churchesInZone.forEach(c => cascadeDeleteChurch(c.church_id));
      const zi = zones.findIndex(zn => zn.zone_id === z.zone_id);
      if (zi > -1) zones.splice(zi, 1);
    });
    const unzonedChurches = churches.filter(c => c.district_id === id && !c.zone_id);
    unzonedChurches.forEach(c => cascadeDeleteChurch(c.church_id));
    const idx = districts.findIndex(x => x.district_id === id);
    if (idx > -1) districts.splice(idx, 1);
    showToast(`District "${d.district_name}" deleted.`, 'info');
    saveAll();
    updateNavCounts();
    renderDistricts();
  });
};

// ── Assign District Leader Modal ──────────────────────────────
window.openAssignDistrictLeaderModal = function(districtId, role) {
  const d = districts.find(x => x.district_id === districtId);
  if (!d) return;
  const available = pastors.filter(p => p.status_code !== 'suspended');
  const currentId = role === 'main' ? d.leader_pastor_id : d.assistant_leader_pastor_id;
  const opts = `<option value="">— Remove Leader —</option>` +
    available.map(p => `<option value="${p.pastor_id}" ${currentId === p.pastor_id ? 'selected' : ''}>${esc(p.pastor_name)}</option>`).join('');
  const roleLabel = role === 'main' ? 'District Leader' : 'Assistant Leader';

  openModal(
    `${icon('user-plus')} Assign ${roleLabel}`,
    `<div class="form-grid cols-1">
      <div class="form-group">
        <label>${icon('user','icon-xs')} ${roleLabel}</label>
        <select id="f-leader-select">${opts}</select>
      </div>
    </div>`,
    `<button class="btn btn-secondary" onclick="closeModal()">${icon('x')} Cancel</button>
     <button class="btn btn-primary" onclick="saveDistrictLeader(${districtId}, '${role}')">${icon('save')} Save</button>`
  );
};

window.saveDistrictLeader = function(districtId, role) {
  const d = districts.find(x => x.district_id === districtId);
  if (!d) return;
  const pastorId = +document.getElementById('f-leader-select')?.value || null;
  if (role === 'main') d.leader_pastor_id = pastorId;
  else d.assistant_leader_pastor_id = pastorId;
  showToast('Leader updated.', 'success');
  saveAll();
  closeModal();
  renderDistricts();
};

// ── Zone CRUD ─────────────────────────────────────────────────
window.openAddZoneModal = function(districtId) {
  openModal(
    `${icon('layers')} Add Zone`,
    buildZoneForm(districtId),
    `<button class="btn btn-secondary" onclick="closeModal()">${icon('x')} Cancel</button>
     <button class="btn btn-primary" onclick="saveZone(null,${districtId})">${icon('save')} Save</button>`
  );
};

window.editZone = function(id) {
  const z = zones.find(x => x.zone_id === id);
  if (!z) return;
  openModal(
    `${icon('pencil')} Edit Zone`,
    buildZoneForm(z.district_id, z),
    `<button class="btn btn-secondary" onclick="closeModal()">${icon('x')} Cancel</button>
     <button class="btn btn-primary" onclick="saveZone(${id},${z.district_id})">${icon('save')} Save Changes</button>`
  );
};

function buildZoneForm(districtId, z = {}) {
  const district = districts.find(d => d.district_id === districtId);
  return `<div class="form-grid cols-1">
    <div class="form-group">
      <label>${icon('map','icon-xs')} District</label>
      <input type="text" value="${esc(district?.district_name||'')}" disabled style="opacity:0.6">
    </div>
    <div class="form-group">
      <label>${icon('layers','icon-xs')} Zone Name *</label>
      <input type="text" id="f-zone-name" placeholder="e.g. Zone 1" value="${esc(z.zone_name||'')}">
    </div>
    <div class="form-group">
      <label>${icon('file-text','icon-xs')} Notes</label>
      <textarea id="f-zone-notes" placeholder="Optional notes">${esc(z.notes||'')}</textarea>
    </div>
  </div>`;
}

window.saveZone = function(id, districtId) {
  const name  = document.getElementById('f-zone-name')?.value.trim();
  const notes = document.getElementById('f-zone-notes')?.value.trim();
  if (!name) { showToast('Zone name is required.', 'error'); return; }

  if (id) {
    const z = zones.find(x => x.zone_id === id);
    if (!z) return;
    z.zone_name = name;
    z.notes = notes || null;
    showToast(`Zone "${name}" updated.`, 'success');
  } else {
    zones.push({ zone_id: nextId('zone'), district_id: districtId, zone_name: name, notes: notes||null, created_at: TODAY });
    showToast(`Zone "${name}" created.`, 'success');
  }
  saveAll();
  updateNavCounts();
  closeModal();
  renderDistricts();
};

window.deleteZone = function(id) {
  const z = zones.find(x => x.zone_id === id);
  if (!z) return;
  confirmDelete("Zone " + z.zone_name + " and all of its churches", () => {
    const churchesInZone = churches.filter(c => c.zone_id === id);
    churchesInZone.forEach(c => cascadeDeleteChurch(c.church_id));
    
    const idx = zones.findIndex(zn => zn.zone_id === id);
    if (idx > -1) zones.splice(idx, 1);
    showToast(`Zone "${z.zone_name}" and its churches deleted.`, 'info');
    saveAll();
    updateNavCounts();
    renderDistricts();
  });
};

// ── Church in District/Zone Helpers ──────────────────────────
window.openAddChurchInDistrict = function(districtId) {
  const d = districts.find(x => x.district_id === districtId);
  openModal(
    `${icon('church')} Add Church — ${esc(d?.district_name||'')}`,
    `<div class="form-grid">
      <div class="form-group span-2">
        <label>${icon('church','icon-xs')} Church Name *</label>
        <input type="text" id="f-hch-name" placeholder="Full church name" value="">
      </div>
      <div class="form-group span-2">
        <label>${icon('map-pin','icon-xs')} Church Address</label>
        <textarea id="f-hch-address" placeholder="e.g. Purok 5, Brgy. San Jose"></textarea>
      </div>
      <div class="form-group span-2">
        <label>${icon('file-text','icon-xs')} Notes</label>
        <textarea id="f-hch-notes" placeholder="Optional notes"></textarea>
      </div>
    </div>`,
    `<button class="btn btn-secondary" onclick="closeModal()">${icon('x')} Cancel</button>
     <button class="btn btn-primary" onclick="saveChurchInDistrict(${districtId}, null)">${icon('save')} Save Church</button>`,
    'modal-lg'
  );
};

window.openAddChurchInZone = function(zoneId) {
  const z = zones.find(x => x.zone_id === zoneId);
  const d = z ? districts.find(x => x.district_id === z.district_id) : null;
  openModal(
    `${icon('church')} Add Church — ${esc(z?.zone_name||'')}`,
    `<div class="alert alert-info" style="margin-bottom:16px">${icon('layers','icon-sm')} <div>Adding to: <strong>${esc(d?.district_name||'')} / ${esc(z?.zone_name||'')}</strong></div></div>
    <div class="form-grid">
      <div class="form-group span-2">
        <label>${icon('church','icon-xs')} Church Name *</label>
        <input type="text" id="f-hch-name" placeholder="Full church name" value="">
      </div>
      <div class="form-group span-2">
        <label>${icon('map-pin','icon-xs')} Church Address</label>
        <textarea id="f-hch-address" placeholder="e.g. Purok 5, Brgy. San Jose"></textarea>
      </div>
      <div class="form-group span-2">
        <label>${icon('file-text','icon-xs')} Notes</label>
        <textarea id="f-hch-notes" placeholder="Optional notes"></textarea>
      </div>
    </div>`,
    `<button class="btn btn-secondary" onclick="closeModal()">${icon('x')} Cancel</button>
     <button class="btn btn-primary" onclick="saveChurchInDistrict(${z?.district_id||'null'}, ${zoneId})">${icon('save')} Save Church</button>`,
    'modal-lg'
  );
};

window.saveChurchInDistrict = function(districtId, zoneId) {
  const name    = document.getElementById('f-hch-name')?.value.trim();
  const address = document.getElementById('f-hch-address')?.value.trim();
  const notes   = document.getElementById('f-hch-notes')?.value.trim();
  if (!name) { showToast('Church name is required.', 'error'); return; }
  churches.push({
    church_id: nextId('church'),
    church_name: name,
    church_address: address || null,
    district_id: districtId || null,
    zone_id: zoneId || null,
    is_international: false,
    notes: notes || null,
    created_at: TODAY
  });
  showToast(`"${name}" added.`, 'success');
  saveAll();
  updateNavCounts();
  closeModal();
  renderDistricts();
};

window.openEditChurchInDistrict = function(churchId) {
  const c = churches.find(x => x.church_id === churchId);
  if (!c) return;
  openModal(
    `${icon('pencil')} Edit Church`,
    `<div class="form-grid">
      <div class="form-group span-2">
        <label>${icon('church','icon-xs')} Church Name *</label>
        <input type="text" id="f-hch-name" value="${esc(c.church_name)}">
      </div>
      <div class="form-group span-2">
        <label>${icon('map-pin','icon-xs')} Church Address</label>
        <textarea id="f-hch-address">${esc(c.church_address||'')}</textarea>
      </div>
      <div class="form-group span-2">
        <label>${icon('file-text','icon-xs')} Notes</label>
        <textarea id="f-hch-notes">${esc(c.notes||'')}</textarea>
      </div>
    </div>`,
    `<button class="btn btn-secondary" onclick="closeModal()">${icon('x')} Cancel</button>
     <button class="btn btn-primary" onclick="updateChurchInDistrict(${churchId})">${icon('save')} Save</button>`,
    'modal-lg'
  );
};

window.updateChurchInDistrict = function(churchId) {
  const c = churches.find(x => x.church_id === churchId);
  if (!c) return;
  const name    = document.getElementById('f-hch-name')?.value.trim();
  const address = document.getElementById('f-hch-address')?.value.trim();
  const notes   = document.getElementById('f-hch-notes')?.value.trim();
  if (!name) { showToast('Church name is required.', 'error'); return; }
  c.church_name    = name;
  c.church_address = address || null;
  c.notes          = notes || null;
  showToast(`"${name}" updated.`, 'success');
  saveAll();
  updateNavCounts();
  closeModal();
  renderDistricts();
};

window.deleteChurchFromDistrict = function(churchId) {
  const c = churches.find(x => x.church_id === churchId);
  if (!c) return;
  confirmDelete(c.church_name + " from the district", () => {
    cascadeDeleteChurch(churchId);
    showToast(`"${c.church_name}" has been deleted. District updated.`, 'info');
    saveAll();
    updateNavCounts();
    renderDistricts();
  });
};

// ── Assign Pastor to Church (from district view) ──────────────
window.openAssignPastorToChurch = function(churchId) {
  if (window.openAddAssignmentModal) {
    window.openAddAssignmentModal(null, churchId);
  } else {
    navigate('assignments');
  }
};

// ── Filter ────────────────────────────────────────────────────
window.filterDistricts = debounce(renderDistrictsList, 200);
