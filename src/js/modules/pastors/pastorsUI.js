import { showToast } from '../../shared/components/toast.js';
import { uploadImage } from '../../core/storageService.js';
// ============================================================
// Church Management System — Pastors Module
// ============================================================

import {
  pastors,
  statusTypes,
  assignmentTypes,
  districts,
  zones,
  churches,
  churchAssignments,
  pastorEvents,
  getActiveAssignment,
  counters
} from '../../core/state.js';

import { dbService } from '../../core/dbService.js';
import { PastorService } from './pastorsService.js';


import {
  icon,
  statusBadge,
  assignmentBadge,
  formatDate,
  formatDateRange,
  calcAge,
  esc,
  pastorAvatar,
  statusOptions,
  readImageFile,
  emptyState,
  confirmDelete,
  debounce
} from '../../shared/utils/helpers.js';

import { openModal, closeModal } from '../../shared/components/modal.js';

let currentView = 'all';

// ── Render Pastors Main ───────────────────────────────────────
export function renderPastors() {
  const content = document.getElementById('page-content');
  const actions = document.getElementById('topbar-actions');

  if (actions) {
    actions.innerHTML = `
      <div style="display:flex; gap:8px; flex-wrap: wrap;">
        <button class="btn btn-primary" onclick="openAddPastorModal()">${icon('plus')} <span>Add Pastor</span></button>
      </div>
    `;
  }

  if (!content) return;

  const totalPastorsCount = (Array.isArray(pastors) ? pastors : []).length;

  content.innerHTML = `
    <div class="fade-in">
      <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 24px;">
        <h1 style="margin: 0; font-size: 20px; font-weight: 800; display: flex; align-items: center; gap: 8px;">
          Pastors
          <span style="font-size: 11px; font-weight: 700; color: var(--text-muted); padding: 2px 10px; background: var(--bg-elevated); border-radius: 20px; border: 1px solid var(--border);">
            Total Pastors: ${totalPastorsCount}
          </span>
        </h1>
      </div>
      <div style="display: flex; gap: 12px; align-items: center; margin-bottom: 24px;">
        <div style="flex: 1; position: relative;">
          <div style="position: absolute; left: 16px; top: 50%; transform: translateY(-50%); color: var(--text-muted);">
            ${icon('search', 'icon-sm')}
          </div>
          <input type="text" id="pastor-search"
                 style="padding-left: 44px; height: 46px; font-size: 15px;"
                 placeholder="Search pastors by name, wife, or contact…" oninput="filterPastors()">
        </div>

        <div class="filter-trigger-wrap">
          <button type="button" class="filter-trigger-btn${currentView !== 'all' ? ' active' : ''}" onclick="togglePastorFilterPanel(event)">
            ${icon('filter', 'icon-sm')}
            ${currentView !== 'all' ? `<span class="filter-badge">1</span>` : ''}
          </button>
          <div id="pastor-filter-panel" class="filter-dropdown-panel">
            <div class="filter-section">
              <div class="filter-section-label">Status</div>
              <div class="filter-chip-list" id="pastor-status-chips">
                ${renderStatusChip('all', 'All Pastors', 'users')}
                ${renderStatusChip('active', 'Active', 'circle-check')}
                ${renderStatusChip('transferred', 'Transferred', 'arrow-right')}
                ${renderStatusChip('redirection', 'Redirection', 'refresh-cw')}
                ${renderStatusChip('pullout', 'Pull Out', 'minus-circle')}
                ${renderStatusChip('undeployed', 'Undeployed', 'user-x')}
                ${renderStatusChip('deceased', 'Deceased', 'cross')}
              </div>
            </div>
          </div>
        </div>
      </div>

      <div id="pastors-list"></div>
    </div>
  `;

  renderPastorsList();
  if (window.lucide?.createIcons) lucide.createIcons();
  bindPastorFilterOutsideClick();
}

function renderStatusChip(id, label, iconName) {
  const isActive = currentView === id;
  return `
    <button type="button" class="filter-chip${isActive ? ' active' : ''}" data-view="${id}" onclick="switchView('${id}')">
      ${icon(iconName, 'icon-xs')} ${label}
    </button>
  `;
}

let pastorOutsideClickBound = false;

window.togglePastorFilterPanel = function(event) {
  event.stopPropagation();
  document.getElementById('pastor-filter-panel')?.classList.toggle('open');
  document.querySelector('.filter-trigger-wrap .filter-trigger-btn')?.classList.toggle('active');
};

function bindPastorFilterOutsideClick() {
  if (pastorOutsideClickBound) return;
  pastorOutsideClickBound = true;
  document.addEventListener('click', (e) => {
    const wrap = document.querySelector('#page-content .filter-trigger-wrap');
    if (wrap && !wrap.contains(e.target)) {
      document.getElementById('pastor-filter-panel')?.classList.remove('open');
    }
  });
}

window.switchView = function (view) {
  currentView = view;
  document.querySelectorAll('#pastor-status-chips .filter-chip').forEach(c => {
    c.classList.toggle('active', c.dataset.view === view);
  });
  const btn = document.querySelector('.filter-trigger-wrap .filter-trigger-btn');
  if (btn) {
    let badge = btn.querySelector('.filter-badge');
    if (view !== 'all') {
      if (!badge) {
        badge = document.createElement('span');
        badge.className = 'filter-badge';
        badge.textContent = '1';
        btn.appendChild(badge);
      }
      btn.classList.add('active');
    } else {
      badge?.remove();
      btn.classList.remove('active');
    }
  }
  renderPastorsList();
};

// ── Render List Logic ─────────────────────────────────────────
function renderPastorsList() {
  const search = (document.getElementById('pastor-search')?.value || '').toLowerCase();

  const list = pastors.filter(p => {
    if (currentView === 'active' && p.status_code !== 'active') return false;
    if (currentView === 'undeployed' && p.status_code !== 'undeployed') return false;
    if (currentView === 'transferred' && p.status_code !== 'transferred') return false;
    if (currentView === 'redirection' && p.status_code !== 'redirection') return false;
    if (currentView === 'pullout' && p.status_code !== 'pullout') return false;
    if (currentView === 'deceased' && p.status_code !== 'deceased') return false;

    const matchSearch =
      !search ||
      (p.pastor_name || '').toLowerCase().includes(search) ||
      (p.wife_name || '').toLowerCase().includes(search);

    return matchSearch;
  });

  const container = document.getElementById('pastors-list');
  if (!container) return;

  if (list.length === 0) {
    container.innerHTML = emptyState(
      'No Pastors Found',
      'Try adjusting your search or add a new pastor.',
      'user-x',
      'Add Pastor',
      'openAddPastorModal()'
    );
    if (window.lucide?.createIcons) lucide.createIcons();
    return;
  }

  container.innerHTML = renderTableView(list);
  if (window.lucide?.createIcons) lucide.createIcons();
}

// ── Card View ────────────────────────────────────────────────
function renderTableView(list) {
  return `
    <div class="grid-list">
      ${list.map(p => {
        const active = getActiveAssignment(p.pastor_id);
        const church = active?.church_id ? churches.find(c => c.church_id === active.church_id) : null;
        const dist = active?.district_id ? districts.find(d => d.district_id === active.district_id) : null;

        return `
          <div class="card" style="padding: 24px; display: flex; flex-direction: column; transition: transform 0.2s, box-shadow 0.2s; border-color: var(--border);">
            
            <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 20px;">
              <div style="display: flex; gap: 16px; align-items: center; flex: 1; min-width: 0;">
                ${pastorAvatar(p.pastor_name, p.image_url, 'lg')}
                <div style="flex: 1; min-width: 0;">
                  <div style="font-weight: 800; font-size: 18px; color: var(--text-primary); letter-spacing: -0.02em; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">
                    ${esc(p.pastor_name)}
                  </div>
                  <div style="display: flex; flex-wrap: wrap; gap: 8px; margin-top: 6px; align-items: center;">
                    ${statusBadge(p.status_code)}
                    ${p.contact_number ? `
                      <span style="font-size: 12px; color: var(--text-muted); font-weight: 500; display: flex; align-items: center; gap: 4px;">
                        ${icon('phone', 'icon-xs')} ${esc(p.contact_number)}
                      </span>
                    ` : ''}
                  </div>
                </div>
              </div>
            </div>

            <div style="display: flex; flex-direction: column; gap: 12px; margin-bottom: 24px; font-size: 13px; color: var(--text-secondary);">
              ${p.wife_name ? `
                <div style="display: flex; align-items: center; gap: 10px;">
                  <div style="color: var(--accent); opacity: 0.8;">${icon('heart', 'icon-xs')}</div>
                  <div style="display: flex; align-items: center; gap: 8px;">
                     ${pastorAvatar(p.wife_name, p.wife_image_url, 'xs')}
                     <span style="font-weight: 600;">${esc(p.wife_name)}</span>
                  </div>
                </div>
              ` : ''}
              
              <div style="display: flex; align-items: center; gap: 10px;">
                <div style="color: var(--accent); opacity: 0.8;">${icon('calendar', 'icon-xs')}</div>
                <span>Service Start: <span style="font-weight: 600;">
                  ${p.pastoring_start_date ? formatDate(p.pastoring_start_date) : 'N/A'}
                </span></span>
              </div>
            </div>

            <div style="margin-top: auto;">
              <div style="font-size: 10px; font-weight: 800; text-transform: uppercase; letter-spacing: 0.05em; color: var(--text-muted); margin-bottom: 12px; display: flex; align-items: center; gap: 6px;">
                ${icon('map-pin', 'icon-xs')} Current Assignment
              </div>

              ${active ? `
                <div style="display: flex; flex-direction: column; gap: 4px; padding: 12px; border-radius: var(--radius-lg); background: var(--bg-elevated); border: 1px solid var(--border);">
                  <div style="font-weight: 700; color: var(--text-primary); font-size: 14px;">
                    ${church ? esc(church.church_name) : 'No Details'}
                  </div>
                  ${dist ? `
                    <div style="font-size: 11px; font-weight: 700; color: var(--text-muted); text-transform: uppercase;">
                      ${esc(dist.district_name)}
                    </div>
                  ` : ''}
                  <div style="margin-top: 4px;">
                    ${assignmentBadge(active.assignment_type_code)}
                  </div>
                </div>
              ` : `
                <div style="padding: 12px; border-radius: var(--radius-lg); background: var(--bg-base); border: 1px dashed var(--border); color: var(--text-muted); font-size: 13px; font-style: italic;">
                  ${icon('info', 'icon-xs')} No active assignment
                </div>
              `}
            </div>

            <div style="display: flex; gap: 8px; margin-top: 20px;">
              <button class="btn btn-secondary btn-sm" style="flex: 1;" onclick="viewPastor(${p.pastor_id})">${icon('eye')} View</button>
              <button class="btn btn-secondary btn-sm" style="flex: 1;" onclick="editPastor(${p.pastor_id})">${icon('pencil')} Edit</button>
              <button class="btn btn-secondary btn-sm hover:text-danger" style="flex: 1;" onclick="deletePastor(${p.pastor_id})">${icon('trash-2')} Delete</button>
            </div>

          </div>
        `;
      }).join('')}
    </div>
  `;
}

// ── Pastor Form ───────────────────────────────────────────────
function buildPastorForm(p = {}) {
  const parentP = p.parent_pastor_id ? pastors.find(x => x.pastor_id === p.parent_pastor_id) : null;
  return `
    <div style="display: flex; flex-direction: column; gap: 4px;">
      <div class="form-section-title">${icon('user', 'icon-sm')} Personal Information</div>
      <div class="form-grid">
        <div class="form-group">
          <label>Pastor's Full Name *</label>
          <input type="text" id="f-name" placeholder="Enter complete name" value="${esc(p.pastor_name || '')}">
        </div>
        <div class="form-group">
          <label>Contact Number</label>
          <input type="tel" id="f-contact" placeholder="+63 9XX XXX XXXX" value="${esc(p.contact_number || '')}">
        </div>
        <div class="form-group">
          <label>Pastor's Birth Date</label>
          <input type="date" id="f-birth" value="${p.birth_date || ''}">
        </div>
        <div class="form-group">
          <label>Pastoring Start Date *</label>
          <input type="date" id="f-pastoring-start" value="${p.pastoring_start_date || ''}">
        </div>
        <div class="form-group span-2">
          <label>Status</label>
          <select id="f-status">
            ${statusOptions(p.status_code || 'undeployed')}
          </select>
        </div>
        <div class="form-group span-2">
          <label>Discipled By (Parent Pastor)</label>
          <div class="search-select-wrapper">
            <div style="position: absolute; left: 12px; top: 50%; transform: translateY(-50%); color: var(--accent); z-index: 1;">
              ${icon('users', 'icon-sm')}
            </div>
            <input type="text" id="f-parent-search" class="search-select-input" style="padding-left: 40px;" 
                   placeholder="Search by name..." 
                   oninput="filterParentPastorOptions(this.value, ${p.pastor_id || 'null'})" 
                   onfocus="filterParentPastorOptions(this.value, ${p.pastor_id || 'null'})"
                   onblur="setTimeout(() => document.getElementById('parent-options')?.classList.remove('open'), 200)"
                   value="${esc(parentP?.pastor_name || '')}" autocomplete="off">
            <input type="hidden" id="f-parent-id" value="${p.parent_pastor_id || ''}">
            <div id="parent-options" class="search-select-options"></div>
          </div>
        </div>
        <div class="form-group span-2">
          <label>Biographical Notes</label>
          <textarea id="f-notes" rows="3" placeholder="Additional background, education, or testimony...">${esc(p.notes || '')}</textarea>
        </div>
      </div>

      <div class="form-section-title">${icon('heart', 'icon-sm')} Family Information</div>
      <div class="form-grid">
        <div class="form-group">
          <label>Wife's Name</label>
          <input type="text" id="f-wife" placeholder="Wife's full name" value="${esc(p.wife_name || '')}">
        </div>
        <div class="form-group">
          <label>Wife's Birth Date</label>
          <input type="date" id="f-wife-birth" value="${p.wife_birth_date || ''}">
        </div>
      </div>

      <div class="form-section-title">${icon('image', 'icon-sm')} Profile Photos</div>
      <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 24px;">
        <div class="card" style="padding: 20px; text-align: center; background: var(--bg-base); border-style: dashed;">
          <div id="pastor-img-preview" class="avatar-wrapper" onclick="document.getElementById('pastor-img').click()"
               style="position: relative; width: 80px; height: 80px; margin: 0 auto 16px; border-radius: 50%; overflow: hidden; background: #fff; display: flex; align-items: center; justify-content: center; border: 2px solid var(--border); transition: all 0.2s; cursor: pointer;">
            ${p.image_url ? `<img src="${p.image_url}" style="width:100%; height:100%; object-fit:cover">` : icon('user-plus', 'icon-lg')}
            ${p.image_url ? `<div class="avatar-overlay" onclick="viewImage('${p.image_url}', '${esc((p.pastor_name || "Pastor's Photo").replace(/'/g, "\\'"))}'); event.stopPropagation();">${icon('eye', 'icon-sm')}</div>` : ''}
          </div>
          <div style="font-size: 13px; font-weight: 700; color: var(--text-primary); margin-bottom: 2px;">Pastor's Photo</div>
          <div style="font-size: 11px; color: var(--text-muted); margin-bottom: 12px;">Square aspect recommended</div>
          <button type="button" class="btn btn-sm btn-secondary" onclick="document.getElementById('pastor-img').click()">
            ${icon('upload', 'icon-xs')} Choose Photo
          </button>
          <input type="file" id="pastor-img" accept="image/*" style="display:none">
        </div>

        <div class="card" style="padding: 20px; text-align: center; background: var(--bg-base); border-style: dashed;">
          <div id="wife-img-preview" class="avatar-wrapper" onclick="document.getElementById('wife-img').click()"
               style="position: relative; width: 80px; height: 80px; margin: 0 auto 16px; border-radius: 50%; overflow: hidden; background: #fff; display: flex; align-items: center; justify-content: center; border: 2px solid var(--border); transition: all 0.2s; cursor: pointer;">
            ${p.wife_image_url ? `<img src="${p.wife_image_url}" style="width:100%; height:100%; object-fit:cover">` : icon('heart', 'icon-lg')}
            ${p.wife_image_url ? `<div class="avatar-overlay" onclick="viewImage('${p.wife_image_url}', '${esc((p.wife_name || "Wife's Photo").replace(/'/g, "\\'"))}'); event.stopPropagation();">${icon('eye', 'icon-sm')}</div>` : ''}
          </div>
          <div style="font-size: 13px; font-weight: 700; color: var(--text-primary); margin-bottom: 2px;">Wife's Photo</div>
          <div style="font-size: 11px; color: var(--text-muted); margin-bottom: 12px;">Optional profile photo</div>
          <button type="button" class="btn btn-sm btn-secondary" onclick="document.getElementById('wife-img').click()">
            ${icon('upload', 'icon-xs')} Choose Photo
          </button>
          <input type="file" id="wife-img" accept="image/*" style="display:none">
        </div>
      </div>
    </div>
  `;
}

function setupImageUploads() {
  setTimeout(() => {
    const pastorInput = document.getElementById('pastor-img');
    const wifeInput = document.getElementById('wife-img');

    if (pastorInput) {
      pastorInput.addEventListener('change', async () => {
        const file = pastorInput.files?.[0];
        const url = await readImageFile(file);
        if (url) {
          const preview = document.getElementById('pastor-img-preview');
          if (preview) preview.innerHTML = `<img src="${url}" alt="pastor" style="width:100%;height:100%;object-fit:cover">`;
        }
      });
    }

    if (wifeInput) {
      wifeInput.addEventListener('change', async () => {
        const file = wifeInput.files?.[0];
        const url = await readImageFile(file);
        if (url) {
          const preview = document.getElementById('wife-img-preview');
          if (preview) preview.innerHTML = `<img src="${url}" alt="wife" style="width:100%;height:100%;object-fit:cover">`;
        }
      });
    }
  }, 100);
}

window.filterParentPastorOptions = function(query, excludeId) {
  const container = document.getElementById('parent-options');
  if (!container) return;
  const q = query.toLowerCase();
  
  const matches = q === '' 
    ? pastors.filter(p => p.pastor_id !== excludeId).slice(0, 10) 
    : pastors.filter(p => p.pastor_id !== excludeId && p.pastor_name.toLowerCase().includes(q)).slice(0, 10);

  if (matches.length === 0) {
    container.innerHTML = '<div class="search-select-option muted">No pastors found</div>';
  } else {
    container.innerHTML = matches.map(p => `
      <div class="search-select-option" onmousedown="selectParentPastor(${p.pastor_id}, '${esc(p.pastor_name.replace(/'/g, "\\'"))}')">
        <span>${esc(p.pastor_name)}</span>
      </div>
    `).join('');
  }
  
  // Add option to clear selection
  container.innerHTML += `
    <div class="search-select-option muted" style="border-top: 1px solid var(--border); margin-top: 4px; padding-top: 8px;" onmousedown="selectParentPastor('', '')">
       -- Clear Selection --
    </div>
  `;
  container.classList.add('open');
};

window.selectParentPastor = function(id, name) {
  document.getElementById('f-parent-id').value = id;
  document.getElementById('f-parent-search').value = name;
  document.getElementById('parent-options').classList.remove('open');
};

// ── Modals ────────────────────────────────────────────────────
window.openAddPastorModal = function () {
  openModal(
    `${icon('user-plus')} Add Pastor`,
    buildPastorForm(),
    `<button class="btn btn-secondary" onclick="closeModal()">${icon('x')} Cancel</button>
     <button class="btn btn-primary" onclick="savePastor()">${icon('save')} Save Pastor</button>`,
    'modal-lg'
  );
  setupImageUploads();
};

window.editPastor = function (id) {
  const p = pastors.find(x => x.pastor_id === id);
  if (!p) return;

  openModal(
    `${icon('pencil')} Edit Pastor`,
    buildPastorForm(p),
    `<button class="btn btn-secondary" onclick="closeModal()">${icon('x')} Cancel</button>
     <button class="btn btn-primary" onclick="savePastor(${id})">${icon('save')} Save Changes</button>`,
    'modal-lg'
  );
  setupImageUploads();
};
window.savePastor = async function (id = null) {
  const btn = document.querySelector('.modal-footer .btn-primary');
  const originalHtml = btn ? btn.innerHTML : '';

  try {
    const name           = document.getElementById('f-name')?.value.trim();
    const wife           = document.getElementById('f-wife')?.value.trim();
    const contact        = document.getElementById('f-contact')?.value.trim();
    const birth          = document.getElementById('f-birth')?.value;
    const wifeBirth      = document.getElementById('f-wife-birth')?.value;
    const pastoringStart = document.getElementById('f-pastoring-start')?.value;
    const status         = document.getElementById('f-status')?.value;
    const notes          = document.getElementById('f-notes')?.value.trim();
    const parentPastorId = document.getElementById('f-parent-id')?.value;

    if (!name) {
      showToast('Pastor name is required.', 'error');
      return;
    }

    const payload = {
        pastor_name: name,
        contact_number: contact || null,
        wife_name: wife || null,
        birth_date: birth || null,
        wife_birth_date: wifeBirth || null,
        pastoring_start_date: pastoringStart || null,
        status_code: status || 'undeployed',
        parent_pastor_id: parentPastorId ? Number(parentPastorId) : null,
        notes: notes || null
    };

    const pastorFile = document.getElementById('pastor-img')?.files?.[0];
    const wifeFile   = document.getElementById('wife-img')?.files?.[0];

    const result = await PastorService.save(id, payload, pastorFile, wifeFile);

    if (result.action === 'updated') {
      if (status === 'pullout') {
        showToast(`${name} updated and pulled out.`, 'warning');
      } else {
        showToast(`${name} updated successfully.`, 'success');
      }
    } else {
      showToast(`${name} added successfully.`, 'success');
    }

    closeModal();
    renderPastors();

  } catch (err) {
    console.error('[Pastors] Save failed:', err);
    showToast(`Failed to save to database: ${err.message || 'Unknown error'}`, 'error');
  } finally {
    if (btn) {
      btn.disabled = false;
      btn.innerHTML = originalHtml;
    }
  }
};

window.viewPastor = function (id) {
  const p = pastors.find(x => x.pastor_id === id);
  if (!p) return;

  const active = getActiveAssignment(p.pastor_id);
  const church = active?.church_id ? churches.find(c => c.church_id === active.church_id) : null;
  const parentP = p.parent_pastor_id ? pastors.find(x => x.pastor_id === p.parent_pastor_id) : null;
  const history = churchAssignments
    .filter(a => a.pastor_id === id)
    .sort((a, b) => new Date(b.start_date) - new Date(a.start_date));

  openModal(
    `${icon('user', 'icon-lg')} Pastor Profile`,
    `
      <div style="display: flex; flex-direction: column; gap: 32px;">
        <div style="display: flex; gap: 32px; align-items: flex-start; flex-wrap: wrap;">
          <div style="display: flex; flex-direction: column; align-items: center; gap: 12px; width: 140px;">
            ${pastorAvatar(p.pastor_name, p.image_url, 'xl')}
            <div style="transform: scale(1.1);">${statusBadge(p.status_code)}</div>
          </div>

          <div style="flex: 1; min-width: 240px;">
            <div style="font-size: 28px; font-weight: 800; letter-spacing: -0.04em; color: var(--text-primary); line-height: 1.1; margin-bottom: 4px;">${esc(p.pastor_name)}</div>
            <div style="display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 12px; margin-bottom: 24px;">
              <div style="display: flex; align-items: center; gap: 12px;">
                <div style="font-size: 14px; font-weight: 500; color: var(--text-muted);">Pastor ID: #${String(p.pastor_id).padStart(4, '0')}</div>
              </div>
              <div style="font-size: 12px; font-weight: 700; color: var(--accent); background: var(--accent-dim); padding: 4px 10px; border-radius: 20px; display: flex; align-items: center; gap: 6px;">
                ${icon('calendar', 'icon-xs')} Today: ${formatDate(new Date().toISOString().split('T')[0])}
              </div>
            </div>

            <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(150px, 1fr)); gap: 16px;">
              <div style="display: flex; align-items: center; gap: 10px; font-size: 14px; color: var(--text-secondary);">
                <div style="width: 32px; height: 32px; background: var(--bg-elevated); border-radius: 8px; display: flex; align-items: center; justify-content: center; color: var(--accent);">
                  ${icon('phone', 'icon-sm')}
                </div>
                <div>
                  <div style="font-size: 11px; font-weight: 700; text-transform: uppercase; opacity: 0.6;">Contact</div>
                  <div style="font-weight: 600;">${esc(p.contact_number) || 'No number'}</div>
                </div>
              </div>

              <div style="display: flex; align-items: center; gap: 10px; font-size: 14px; color: var(--text-secondary);">
                <div style="width: 32px; height: 32px; background: var(--bg-elevated); border-radius: 8px; display: flex; align-items: center; justify-content: center; color: var(--accent);">
                  ${icon('cake', 'icon-sm')}
                </div>
                <div>
                  <div style="font-size: 11px; font-weight: 700; text-transform: uppercase; opacity: 0.6;">Birthdate & Age</div>
                  <div style="font-weight: 600;">
                    ${p.birth_date ? `${formatDate(p.birth_date)} <span style="color:var(--accent)">(${calcAge(p.birth_date)} yrs)</span>` : 'N/A'}
                  </div>
                </div>
              </div>

              <div style="display: flex; align-items: center; gap: 10px; font-size: 14px; color: var(--text-secondary);">
                <div style="width: 32px; height: 32px; background: var(--bg-elevated); border-radius: 8px; display: flex; align-items: center; justify-content: center; color: var(--accent);">
                  ${icon('briefcase', 'icon-sm')}
                </div>
                <div>
                  <div style="font-size: 11px; font-weight: 700; text-transform: uppercase; opacity: 0.6;">Experience</div>
                  <div style="font-weight: 600;">Since ${p.pastoring_start_date ? formatDate(p.pastoring_start_date) : 'N/A'}</div>
                </div>
              </div>
            </div>

            <div style="margin-top: 16px; display: flex; align-items: center; gap: 10px; font-size: 14px; color: var(--text-secondary);">
              <div style="width: 32px; height: 32px; background: var(--bg-elevated); border-radius: 8px; display: flex; align-items: center; justify-content: center; color: var(--accent);">
                ${icon('users', 'icon-sm')}
              </div>
              <div>
                <div style="font-size: 11px; font-weight: 700; text-transform: uppercase; opacity: 0.6;">Discipled By (Lineage)</div>
                <div style="font-weight: 600;">${parentP ? esc(parentP.pastor_name) : 'No lineage recorded'}</div>
              </div>
            </div>
          </div>
        </div>

        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 24px;">
          <div class="card" style="padding: 20px; background: var(--bg-base); border-style: dashed;">
            <div style="font-size: 12px; font-weight: 800; text-transform: uppercase; letter-spacing: 0.1em; color: var(--accent); margin-bottom: 16px; display: flex; align-items: center; gap: 8px;">
              ${icon('heart', 'icon-xs')} Wife
            </div>
            ${p.wife_name ? `
              <div style="display: flex; gap: 16px; align-items: center;">
                ${pastorAvatar(p.wife_name, p.wife_image_url, 'lg')}
                <div>
                  <div style="font-weight: 700; font-size: 16px;">${esc(p.wife_name)}</div>
                  ${p.wife_birth_date ? `<div style="font-size: 13px; color: var(--text-muted); margin-top: 2px;">Born: ${formatDate(p.wife_birth_date)} <span style="color:var(--accent); font-weight:700;">(${calcAge(p.wife_birth_date)} yrs old)</span></div>` : ''}
                </div>
              </div>
            ` : '<div style="color: var(--text-muted); font-size: 13px; font-style: italic;">No spouse information recorded.</div>'}
          </div>

          <div class="card" style="padding: 20px; background: var(--bg-base); border-style: dashed;">
            <div style="font-size: 12px; font-weight: 800; text-transform: uppercase; letter-spacing: 0.1em; color: var(--accent); margin-bottom: 16px; display: flex; align-items: center; gap: 8px;">
              ${icon('sticky-note', 'icon-xs')} Internal Notes
            </div>
            <p style="font-size: 13px; line-height: 1.6; color: var(--text-secondary); max-height: 100px; overflow-y: auto;">
              ${p.notes ? esc(p.notes) : '<span style="opacity: 0.5;">No additional notes available.</span>'}
            </p>
          </div>
        </div>

        ${active ? `
          <div style="background: var(--accent-dim); border: 2px solid var(--accent); padding: 20px; border-radius: var(--radius-xl); display: flex; align-items: center; gap: 20px;">
            <div style="width: 48px; height: 48px; background: #fff; border-radius: 12px; display: flex; align-items: center; justify-content: center; color: var(--accent); box-shadow: var(--shadow-sm);">
              ${icon('church', 'icon-md')}
            </div>
            <div style="flex: 1;">
              <div style="font-size: 11px; font-weight: 800; text-transform: uppercase; color: var(--accent); letter-spacing: 0.1em;">Currently Serving In</div>
              <div style="font-size: 18px; font-weight: 800; color: var(--text-primary);">${church ? esc(church.church_name) : 'No Station'}</div>
              <div style="display: flex; gap: 12px; margin-top: 4px;">
                ${assignmentBadge(active.assignment_type_code)}
                <span style="font-size: 12px; color: var(--text-muted); font-weight: 500;">Started ${active.start_date ? formatDate(active.start_date) : 'N/A'}</span>
              </div>
            </div>
          </div>
        ` : ''}

        <div>
          <div class="form-section-title">${icon('history', 'icon-sm')} Assignment Timeline</div>
          ${history.length === 0
            ? `<div style="text-align: center; padding: 32px; color: var(--text-muted); font-style: italic;">No historical data documented.</div>`
            : `<div class="timeline" style="margin-top: 16px; padding-left: 100px;">
                ${history.map(a => {
                  const c = a.church_id ? churches.find(x => x.church_id === a.church_id) : null;
                  return `
                    <div class="timeline-item" style="padding-bottom: 32px;">
                      <div class="timeline-dot" style="background: ${a.end_date ? 'var(--border)' : 'var(--accent)'}; box-shadow: 0 0 0 4px ${a.end_date ? 'var(--bg-elevated)' : 'var(--accent-glow)'}; border-color: #fff;"></div>
                      <div style="position: absolute; left: -135px; top: 2px; width: 85px; text-align: right; font-size: 11px; font-weight: 700; color: var(--text-muted); text-transform: uppercase;">
                        ${a.start_date ? formatDate(a.start_date) : 'N/A'}
                      </div>
                      <div class="timeline-content" style="padding: 16px; border-radius: var(--radius-lg); border: 1px solid var(--border);">
                        <div style="display: flex; justify-content: space-between; align-items: start; margin-bottom: 8px;">
                          <div style="font-weight: 700; font-size: 15px;">${c ? esc(c.church_name) : 'Unspecified Field'}</div>
                          <div style="display: flex; gap: 8px; align-items: center;">
                            ${assignmentBadge(a.assignment_type_code)}
                            ${!a.end_date ? '<span class="badge badge-active" style="padding: 2px 8px; font-size: 10px;">Ongoing</span>' : ''}
                          </div>
                        </div>
                        ${a.notes ? `<p style="font-size: 13px; color: var(--text-secondary); line-height: 1.5; margin-top: 8px; padding-top: 8px; border-top: 1px dashed var(--border);">${esc(a.notes)}</p>` : ''}
                      </div>
                    </div>
                  `;
                }).join('')}
              </div>`
          }
        </div>
      </div>
    `,
    `<button class="btn btn-secondary" onclick="closeModal()">Close</button>
     <div style="display: flex; gap: 8px;">
       ${p.wife_name ? `<button class="btn btn-secondary" onclick="previewID({type:'wife', full_name:'${esc(p.wife_name.replace(/'/g, "\\'"))}', church_name:'${esc(church?.church_name?.replace(/'/g, "\\'") || 'N/A')}', qr_code:getDelegateQR('wife', ${p.pastor_id})})">${icon('contact')} Wife's ID</button>` : ''}
       <button class="btn btn-secondary" onclick="previewID({type:'pastor', full_name:'${esc(p.pastor_name.replace(/'/g, "\\'"))}', church_name:'${esc(church?.church_name?.replace(/'/g, "\\'") || 'N/A')}', qr_code:getDelegateQR('pastor', ${p.pastor_id})})">${icon('contact')} Pastor's ID</button>
       <button class="btn btn-primary" onclick="closeModal();editPastor(${id})">${icon('pencil')} Edit Profile</button>
     </div>`,
    'modal-lg'
  );
};

window.deletePastor = function (id) {
  const p = pastors.find(x => x.pastor_id === id);
  if (!p) return;

  confirmDelete(p.pastor_name, async () => {
    try {
      showToast(`Deleting ${p.pastor_name}...`, 'info');

      await PastorService.delete(id);

      showToast(`${p.pastor_name} deleted successfully from database.`, 'success');
      renderPastors();
    } catch (err) {
      console.error('[Pastors] Delete failed:', err);
      showToast(`Delete failed: ${err.message}`, 'error');
    }
  });
};

window.filterPastors = debounce(renderPastorsList, 200);
