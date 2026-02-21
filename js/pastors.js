// ============================================================
// Church Management System — Pastors Module
// ============================================================

import {
  pastors, churchAssignments, districts, churches,
  nextId, getActiveAssignment, saveAll, counters
} from './data.js';

import {
  icon, showToast, statusBadge, assignmentBadge, formatDate, formatDateRange,
  esc, pastorAvatar, statusOptions, readImageFile, emptyState, confirmDelete, debounce
} from './utils.js';
import { openModal, closeModal, navigate, updateNavCounts } from './app.js';

let currentView = 'all'; // all, active, undeployed, suspended, interim

// ── Render Pastors Main ───────────────────────────────────────
export function renderPastors() {
  const content = document.getElementById('page-content');
  const actions = document.getElementById('topbar-actions');
  actions.innerHTML = `<button class="btn btn-primary" onclick="openAddPastorModal()">${icon('user-plus')} Add Pastor</button>`;

  content.innerHTML = `<div class="fade-in">
    <div class="filter-bar tabs-container" style="margin-bottom:16px">
      <div class="segmented-control" style="width:100%">
        ${renderTab('all', 'All Pastors', 'users')}
        ${renderTab('active', 'Active', 'check-circle')}
        ${renderTab('undeployed', 'Undeployed', 'user-x')}
        ${renderTab('suspended', 'Suspended', 'ban')}
        ${renderTab('interim', 'Interim', 'timer')}
      </div>
    </div>

    <div class="filter-bar">
      <div class="search-input-wrap" style="flex:1">
        ${icon('search','icon-sm search-icon')}
        <input type="text" id="pastor-search" placeholder="Search pastors…" oninput="filterPastors()">
      </div>
    </div>

    <div id="pastors-list" style="margin-top:16px"></div>
  </div>`;

  renderPastorsList();
  lucide.createIcons();
}

function renderTab(id, label, iconName) {
  const isActive = currentView === id;
  return `<button class="segmented-btn ${isActive ? 'active' : ''}" onclick="switchView('${id}')">
    ${icon(iconName, 'icon-xs')} ${label}
  </button>`;
}

window.switchView = function(view) {
  currentView = view;
  renderPastors();
};

// ── Render List Logic ─────────────────────────────────────────
function renderPastorsList() {
  const search = (document.getElementById('pastor-search')?.value || '').toLowerCase();

  let list = pastors.filter(p => {
    if (currentView === 'active'     && p.status_code !== 'active')     return false;
    if (currentView === 'undeployed' && p.status_code !== 'undeployed') return false;
    if (currentView === 'suspended'  && p.status_code !== 'suspended')  return false;
    if (currentView === 'interim'    && p.status_code !== 'interim')    return false;
    const matchSearch = !search ||
      p.pastor_name.toLowerCase().includes(search) ||
      (p.wife_name || '').toLowerCase().includes(search);
    return matchSearch;
  });

  const container = document.getElementById('pastors-list');
  if (!container) return;

  if (list.length === 0) {
    container.innerHTML = emptyState('No Pastors Found', 'Try adjusting your search or add a new pastor.', 'Add Pastor', 'openAddPastorModal()');
    lucide.createIcons();
    return;
  }

  container.innerHTML = renderTableView(list);
  lucide.createIcons();
}

// ── Table View ────────────────────────────────────────────────
function renderTableView(list) {
  return `<div class="table-wrapper">
    <table>
      <thead>
        <tr>
          <th>Pastor</th>
          <th>Wife</th>
          <th>Contact</th>
          <th>Pastoring Since</th>
          <th>Status</th>
          <th>Current Assignment</th>
          <th>Actions</th>
        </tr>
      </thead>
      <tbody>
        ${list.map(p => {
          const active = getActiveAssignment(p.pastor_id);
          const church = active?.church_id ? churches.find(c => c.church_id === active.church_id) : null;
          return `<tr>
            <td>
              <div class="pastor-info">
                ${pastorAvatar(p.pastor_name, p.image_url, 'md')}
                <div>
                  <div class="pastor-name">${esc(p.pastor_name)}</div>
                  ${p.birth_date ? `<div class="pastor-meta">${icon('calendar','icon-xs')} ${formatDate(p.birth_date)}</div>` : ''}
                </div>
              </div>
            </td>
            <td data-label="Wife">
              ${p.wife_name ? `<div class="pastor-info">
                ${pastorAvatar(p.wife_name, p.wife_image_url, 'sm')}
                <div>
                  <div style="font-size:13px;font-weight:500">${esc(p.wife_name)}</div>
                  ${p.wife_birth_date ? `<div class="pastor-meta">${icon('calendar','icon-xs')} ${formatDate(p.wife_birth_date)}</div>` : ''}
                </div>
              </div>` : '<span class="td-muted">—</span>'}
            </td>
            <td data-label="Contact" class="td-muted">${esc(p.contact_number) || '—'}</td>
            <td data-label="Pastoring Since" class="td-muted">${p.pastoring_start_date ? formatDate(p.pastoring_start_date) : '—'}</td>
            <td data-label="Status">${statusBadge(p.status_code)}</td>
            <td data-label="Current Assignment">
              ${active
                ? `<div style="font-size:14px">${church ? esc(church.church_name) : 'No church'}</div>`
                : '<span class="td-muted">—</span>'}
            </td>
            <td>
              <div class="td-actions">
                <button class="btn btn-icon-sm btn-secondary" onclick="viewPastor(${p.pastor_id})">${icon('eye')}</button>
                <button class="btn btn-icon-sm btn-secondary" onclick="editPastor(${p.pastor_id})">${icon('pencil')}</button>
                <button class="btn btn-icon-sm btn-danger" onclick="deletePastor(${p.pastor_id})">${icon('trash-2')}</button>
              </div>
            </td>
          </tr>`;
        }).join('')}
      </tbody>
    </table>
  </div>`;
}

// ── Pastor Form ───────────────────────────────────────────────
function buildPastorForm(p = {}) {
  return `
    <div class="form-section-title">${icon('user','icon-xs')} Pastor Information</div>
    <div class="form-grid">
      <div class="form-group">
        <label>${icon('user','icon-xs')} Pastor's Name *</label>
        <input type="text" id="f-name" placeholder="Full name" value="${esc(p.pastor_name||'')}">
      </div>
      <div class="form-group">
        <label>${icon('phone','icon-xs')} Contact Number</label>
        <input type="tel" id="f-contact" placeholder="+63 9XX XXX XXXX" value="${esc(p.contact_number||'')}">
      </div>
      <div class="form-group">
        <label>${icon('calendar','icon-xs')} Pastor's Birth Date (optional)</label>
        <input type="date" id="f-birth" value="${p.birth_date||''}">
      </div>
      <div class="form-group">
        <label>${icon('calendar','icon-xs')} Pastoring Start Date *</label>
        <input type="date" id="f-pastoring-start" value="${p.pastoring_start_date||''}">
      </div>
      <div class="form-group span-2">
        <label>${icon('activity','icon-xs')} Status</label>
        <select id="f-status">
          ${statusOptions(p.status_code || 'undeployed')}
        </select>
      </div>
      <div class="form-group span-2">
        <label>${icon('file-text','icon-xs')} Notes</label>
        <textarea id="f-notes" placeholder="Optional Notes (ex. Pastor Background, Pastor Education,Previous Work, Pastor Testimony etc...)">${esc(p.notes||'')}</textarea>
      </div>
    </div>

    <div class="form-section-title">${icon('heart','icon-xs')} Wife's Information</div>
    <div class="form-grid">
      <div class="form-group">
        <label>${icon('user','icon-xs')} Wife's Name</label>
        <input type="text" id="f-wife" placeholder="Wife's full name (optional)" value="${esc(p.wife_name||'')}">
      </div>
      <div class="form-group">
        <label>${icon('calendar','icon-xs')} Wife's Birth Date (optional)</label>
        <input type="date" id="f-wife-birth" value="${p.wife_birth_date||''}">
      </div>
    </div>

    <div class="form-section-title">${icon('image','icon-xs')} Photos</div>
    <div class="form-grid">
      <div class="form-group">
        <label>Pastor's Photo</label>
        <div class="img-upload-wrap">
          <div class="img-preview" id="pastor-img-preview" onclick="document.getElementById('pastor-img').click()" style="cursor:pointer">
            ${p.image_url
              ? `<img src="${p.image_url}" alt="pastor" style="width:100%;height:100%;object-fit:cover">`
              : `<div class="img-placeholder">${icon('image-plus','icon-lg')}<span>Click to upload</span></div>`}
          </div>
          <input type="file" id="pastor-img" accept="image/*" style="display:none">
          <button type="button" class="btn btn-sm btn-secondary" style="margin-top:6px" onclick="document.getElementById('pastor-img').click()">
            ${icon('upload')} Upload Photo
          </button>
        </div>
      </div>
      <div class="form-group">
        <label>Wife's Photo</label>
        <div class="img-upload-wrap">
          <div class="img-preview" id="wife-img-preview" onclick="document.getElementById('wife-img').click()" style="cursor:pointer">
            ${p.wife_image_url
              ? `<img src="${p.wife_image_url}" alt="wife" style="width:100%;height:100%;object-fit:cover">`
              : `<div class="img-placeholder">${icon('image-plus','icon-lg')}<span>Click to upload</span></div>`}
          </div>
          <input type="file" id="wife-img" accept="image/*" style="display:none">
          <button type="button" class="btn btn-sm btn-secondary" style="margin-top:6px" onclick="document.getElementById('wife-img').click()">
            ${icon('upload')} Upload Photo
          </button>
        </div>
      </div>
    </div>`;
}

function setupImageUploads() {
  setTimeout(() => {
    const pastorInput = document.getElementById('pastor-img');
    const wifeInput   = document.getElementById('wife-img');
    if (pastorInput) {
      pastorInput.addEventListener('change', async () => {
        const url = await readImageFile(pastorInput.files[0]);
        if (url) document.getElementById('pastor-img-preview').innerHTML =
          `<img src="${url}" alt="pastor" style="width:100%;height:100%;object-fit:cover">`;
      });
    }
    if (wifeInput) {
      wifeInput.addEventListener('change', async () => {
        const url = await readImageFile(wifeInput.files[0]);
        if (url) document.getElementById('wife-img-preview').innerHTML =
          `<img src="${url}" alt="wife" style="width:100%;height:100%;object-fit:cover">`;
      });
    }
  }, 100);
}

// ── Modals ────────────────────────────────────────────────────
window.openAddPastorModal = function() {
  openModal(
    `${icon('user-plus')} Add Pastor`,
    buildPastorForm(),
    `<button class="btn btn-secondary" onclick="closeModal()">${icon('x')} Cancel</button>
     <button class="btn btn-primary" onclick="savePastor()">${icon('save')} Save Pastor</button>`,
    'modal-lg'
  );
  setupImageUploads();
};

window.editPastor = function(id) {
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

window.savePastor = async function(id = null) {
  const name          = document.getElementById('f-name')?.value.trim();
  const contact       = document.getElementById('f-contact')?.value.trim();
  const wife          = document.getElementById('f-wife')?.value.trim();
  const birth         = document.getElementById('f-birth')?.value;
  const wifeBirth     = document.getElementById('f-wife-birth')?.value;
  const pastoringStart= document.getElementById('f-pastoring-start')?.value;
  const status        = document.getElementById('f-status')?.value;
  const notes         = document.getElementById('f-notes')?.value.trim();

  if (!name) { showToast('Pastor name is required.', 'error'); return; }

  const pastorFile   = document.getElementById('pastor-img')?.files[0];
  const wifeFile     = document.getElementById('wife-img')?.files[0];
  const pastorImgUrl = pastorFile ? await readImageFile(pastorFile) : null;
  const wifeImgUrl   = wifeFile   ? await readImageFile(wifeFile)   : null;
  const today        = new Date().toISOString().split('T')[0];

  if (id !== null) {
    const p = pastors.find(x => x.pastor_id === id);
    if (!p) return;
    p.pastor_name        = name;
    p.contact_number     = contact;
    p.wife_name          = wife || null;
    p.birth_date         = birth || null;
    p.wife_birth_date    = wifeBirth || null;
    p.pastoring_start_date = pastoringStart || null;
    p.status_code        = status;
    p.notes              = notes || null;
    if (pastorImgUrl) p.image_url      = pastorImgUrl;
    if (wifeImgUrl)   p.wife_image_url = wifeImgUrl;

    if (status === 'suspended') {
      const removed = [];
      districts.filter(d => d.leader_pastor_id === id).forEach(d => {
        d.leader_pastor_id = null; removed.push(`${d.district_name} Leader`);
      });
      districts.filter(d => d.assistant_leader_pastor_id === id).forEach(d => {
        d.assistant_leader_pastor_id = null; removed.push(`${d.district_name} Assistant`);
      });
      if (removed.length > 0) {
        showToast(`Pastor suspended. Auto-removed from: ${removed.join(', ')}`, 'warning');
      } else {
        showToast(`${name} updated successfully.`, 'success');
      }
    } else {
      showToast(`${name} updated successfully.`, 'success');
    }
  } else {
    pastors.push({
      pastor_id:           nextId('pastor'),
      pastor_name:         name,
      wife_name:           wife || null,
      contact_number:      contact || null,
      birth_date:          birth || null,
      wife_birth_date:     wifeBirth || null,
      pastoring_start_date: pastoringStart || null,
      status_code:         status || 'undeployed',
      image_url:           pastorImgUrl || null,
      wife_image_url:      wifeImgUrl || null,
      notes:               notes || null,
      created_at:          today,
    });
    showToast(`${name} added successfully.`, 'success');
  }
  saveAll();
  updateNavCounts();
  closeModal();
  renderPastors();
};

window.viewPastor = function(id) {
  const p = pastors.find(x => x.pastor_id === id);
  if (!p) return;
  const active  = getActiveAssignment(p.pastor_id);
  const church  = active?.church_id ? churches.find(c => c.church_id === active.church_id) : null;
  const history = churchAssignments
    .filter(a => a.pastor_id === id)
    .sort((a, b) => new Date(b.start_date) - new Date(a.start_date));

  openModal(
    `${icon('user')} ${esc(p.pastor_name)}`,
    `<div style="display:flex;gap:24px;align-items:flex-start;margin-bottom:24px;flex-wrap:wrap">
      <div style="display:flex;flex-direction:column;align-items:center;gap:8px">
        ${pastorAvatar(p.pastor_name, p.image_url, 'xl')}
        ${statusBadge(p.status_code)}
      </div>
      <div style="flex:1;min-width:200px">
        <div style="font-size:22px;font-weight:700;margin-bottom:4px">${esc(p.pastor_name)}</div>
        ${p.wife_name ? `<div style="color:var(--text-muted);font-size:13px;margin-bottom:8px">${icon('heart','icon-xs')} ${esc(p.wife_name)}</div>` : ''}
        ${p.contact_number ? `<div style="font-size:13px;margin-bottom:4px">${icon('phone','icon-xs')} ${esc(p.contact_number)}</div>` : ''}
        ${p.birth_date ? `<div style="font-size:13px;margin-bottom:4px">${icon('calendar','icon-xs')} Pastor DOB: ${formatDate(p.birth_date)}</div>` : ''}
        ${p.wife_birth_date ? `<div style="font-size:13px;margin-bottom:4px">${icon('calendar','icon-xs')} Wife DOB: ${formatDate(p.wife_birth_date)}</div>` : ''}
        ${p.pastoring_start_date ? `<div style="font-size:13px;margin-bottom:4px">${icon('briefcase','icon-xs')} Pastoring since: ${formatDate(p.pastoring_start_date)}</div>` : ''}
        ${p.notes ? `<div style="font-size:13px;color:var(--text-muted);margin-top:8px">${icon('file-text','icon-xs')} ${esc(p.notes)}</div>` : ''}
      </div>
      ${p.wife_image_url ? `<div>${pastorAvatar(p.wife_name||'Wife', p.wife_image_url, 'xl')}<div style="font-size:11px;color:var(--text-muted);text-align:center;margin-top:4px">Wife</div></div>` : ''}
    </div>
    ${active ? `<div class="alert alert-info" style="margin-bottom:16px">
      ${icon('clipboard-list','icon-sm')} <div><strong>Current Assignment:</strong> ${assignmentBadge(active.assignment_type_code)} ${church ? esc(church.church_name) : 'No church'} · Since ${formatDate(active.start_date)}</div>
    </div>` : ''}
    <div class="form-section-title">${icon('clock','icon-xs')} Assignment History</div>
    ${history.length === 0
      ? `<p style="color:var(--text-muted);font-size:13px">No assignment history.</p>`
      : `<div class="timeline">
          ${history.map(a => {
            const c = a.church_id ? churches.find(x => x.church_id === a.church_id) : null;
            return `<div class="timeline-item">
              <div class="timeline-dot ${a.end_date ? 'dot-muted' : 'dot-success'}"></div>
              <div class="timeline-date">${formatDateRange(a.start_date, a.end_date)}</div>
              <div class="timeline-content">
                <div style="display:flex;gap:6px;margin-bottom:4px">${assignmentBadge(a.assignment_type_code)}${!a.end_date ? '<span class="badge badge-active">Current</span>' : ''}</div>
                <strong>${c ? esc(c.church_name) : 'No Church'}</strong>
                ${a.notes ? `<p>${esc(a.notes)}</p>` : ''}
              </div>
            </div>`;
          }).join('')}
        </div>`}`,
    `<button class="btn btn-secondary" onclick="closeModal()">${icon('x')} Close</button>
     <button class="btn btn-primary" onclick="closeModal();editPastor(${id})">${icon('pencil')} Edit</button>`,
    'modal-lg'
  );
};

window.deletePastor = function(id) {
  const p = pastors.find(x => x.pastor_id === id);
  if (!p) return;
  confirmDelete(p.pastor_name, () => {
    const idx = pastors.findIndex(x => x.pastor_id === id);
    if (idx > -1) pastors.splice(idx, 1);
    const toRemove = churchAssignments.filter(a => a.pastor_id === id).map(a => a.assignment_id);
    toRemove.forEach(aid => {
      const i = churchAssignments.findIndex(a => a.assignment_id === aid);
      if (i > -1) churchAssignments.splice(i, 1);
    });

    // If no pastors remain at all, reset the ID counter so next pastor starts from 0
    if (pastors.length === 0) {
      counters.pastor = 0;
      if (churchAssignments.length === 0) counters.assignment = 0;
    }

    saveAll();
    showToast(`${p.pastor_name} deleted.`, 'info');
    updateNavCounts();
    renderPastors();
  });
};


window.filterPastors = debounce(renderPastorsList, 200);

window.openAssignModal = function(pastorId) {
  if (window.openAddAssignmentModal) {
    window.openAddAssignmentModal(pastorId);
  } else {
    navigate('assignments');
  }
};
