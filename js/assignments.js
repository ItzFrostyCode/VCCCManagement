// ============================================================
// Church Management System — Assignments Module
// ============================================================

import {
  pastors, churches, districts, churchAssignments, nextId, getActiveAssignment, saveAll
} from './data.js';
import {
  icon, showToast, esc, pastorAvatar, statusBadge, assignmentBadge,
  assignmentTypeOptions, formatDate, formatDateRange, emptyState, debounce
} from './utils.js';
import { openModal, closeModal, navigate } from './app.js';

const TODAY = new Date().toISOString().split('T')[0];
let currentTab = 'active';

// ── Render Assignments Page ───────────────────────────────────
export function renderAssignments() {
  const content = document.getElementById('page-content');
  const actions = document.getElementById('topbar-actions');
  actions.innerHTML = `<button class="btn btn-primary" onclick="openAddAssignmentModal()">${icon('plus')} New Assignment</button>`;

  content.innerHTML = `<div class="fade-in">
    <div class="filter-bar tabs-container" style="margin-bottom:16px">
      <!-- Desktop Tabs -->
      <div class="desktop-tabs">
        ${renderTab('active', 'Active', 'check-circle')}
        ${renderTab('undeployed', 'Undeployed', 'user-x')}
        ${renderTab('suspended', 'Suspended', 'ban')}
        ${renderTab('interim', 'Interim', 'timer')}
        ${renderTab('history', 'History', 'clock')}
      </div>
      <!-- Mobile Dropdown -->
      <select class="mobile-tabs-dropdown hidden" onchange="switchAssignTab(this.value)">
        <option value="active" ${currentTab === 'active' ? 'selected' : ''}>Active</option>
        <option value="undeployed" ${currentTab === 'undeployed' ? 'selected' : ''}>Undeployed</option>
        <option value="suspended" ${currentTab === 'suspended' ? 'selected' : ''}>Suspended</option>
        <option value="interim" ${currentTab === 'interim' ? 'selected' : ''}>Interim</option>
        <option value="history" ${currentTab === 'history' ? 'selected' : ''}>History</option>
      </select>
    </div>
    <div id="assignments-content"></div>
  </div>`;

  renderCurrentTab();
  lucide.createIcons();
}

function renderTab(id, label, iconName) {
  const style = currentTab === id
    ? 'background:var(--accent);color:#fff;border-color:var(--accent)'
    : 'background:var(--bg-elevated);color:var(--text-muted)';
  return `<button class="btn btn-sm" style="${style}; white-space:nowrap" onclick="switchAssignTab('${id}')">
    ${icon(iconName, 'icon-xs')} ${label}
  </button>`;
}

window.switchAssignTab = function(tab) {
  currentTab = tab;
  renderAssignments();
};

function renderCurrentTab() {
  switch (currentTab) {
    case 'active':     return renderActiveTab();
    case 'undeployed': return renderUndeployedTab();
    case 'suspended':  return renderSuspendedTab();
    case 'interim':    return renderInterimTab();
    case 'history':    return renderHistoryTab();
  }
}

// ── Active Tab ────────────────────────────────────────────────
function renderActiveTab() {
  const container = document.getElementById('assignments-content');
  const active = churchAssignments.filter(a => !a.end_date);

  if (active.length === 0) {
    container.innerHTML = emptyState('No Active Assignments', 'Create a new assignment to get started.', 'New Assignment', 'openAddAssignmentModal()');
    lucide.createIcons();
    return;
  }

  container.innerHTML = `<div class="table-wrapper">
    <table>
      <thead>
        <tr>
          <th>Pastor</th>
          <th>Church</th>
          <th>District</th>
          <th>Type</th>
          <th>Since</th>
          <th>Actions</th>
        </tr>
      </thead>
      <tbody>
        ${active.map(a => {
          const p = pastors.find(x => x.pastor_id === a.pastor_id);
          const c = a.church_id ? churches.find(x => x.church_id === a.church_id) : null;
          const d = a.district_id ? districts.find(x => x.district_id === a.district_id) : null;
          return `<tr>
            <td>
              <div class="pastor-info">
                ${pastorAvatar(p?.pastor_name||'?', p?.image_url, 'sm')}
                <div>
                  <div class="pastor-name">${esc(p?.pastor_name||'Unknown')}</div>
                  ${p ? `<div>${statusBadge(p.status_code)}</div>` : ''}
                </div>
              </div>
            </td>
            <td data-label="Church">${c ? esc(c.church_name) : '<span class="td-muted">—</span>'}</td>
            <td data-label="District">${d ? esc(d.district_name) : '<span class="td-muted">—</span>'}</td>
            <td data-label="Type">${assignmentBadge(a.assignment_type_code)}</td>
            <td data-label="Since" class="td-muted">${formatDate(a.start_date)}</td>
            <td>
              <div class="td-actions">
                <button class="btn btn-sm btn-danger" onclick="closeAssignment(${a.assignment_id})">${icon('x-circle')} Close</button>
                <button class="btn btn-sm btn-secondary" onclick="openSuspendModal(${a.pastor_id})">${icon('ban')} Suspend</button>
              </div>
            </td>
          </tr>`;
        }).join('')}
      </tbody>
    </table>
  </div>`;
}

// ── Undeployed Tab ────────────────────────────────────────────
function renderUndeployedTab() {
  const container = document.getElementById('assignments-content');
  const list = pastors.filter(p => p.status_code === 'undeployed');

  if (list.length === 0) {
    container.innerHTML = emptyState('No Undeployed Pastors', 'All pastors are currently assigned.', '', '');
    lucide.createIcons();
    return;
  }

  container.innerHTML = `<div class="grid-list">
    ${list.map(p => `<div class="card" style="display:flex;align-items:center;gap:16px">
      ${pastorAvatar(p.pastor_name, p.image_url, 'md')}
      <div style="flex:1">
        <div style="font-weight:700">${esc(p.pastor_name)}</div>
        ${p.contact_number ? `<div style="font-size:12px;color:var(--text-muted)">${icon('phone','icon-xs')} ${esc(p.contact_number)}</div>` : ''}
        ${p.pastoring_start_date ? `<div style="font-size:12px;color:var(--text-muted)">${icon('briefcase','icon-xs')} Since ${formatDate(p.pastoring_start_date)}</div>` : ''}
      </div>
      <button class="btn btn-primary btn-sm" onclick="openAddAssignmentModal(${p.pastor_id})">${icon('plus')} Assign</button>
    </div>`).join('')}
  </div>`;
}

// ── Suspended Tab ─────────────────────────────────────────────
function renderSuspendedTab() {
  const container = document.getElementById('assignments-content');
  const list = pastors.filter(p => p.status_code === 'suspended');

  if (list.length === 0) {
    container.innerHTML = emptyState('No Suspended Pastors', 'No pastors are currently suspended.', '', '');
    lucide.createIcons();
    return;
  }

  container.innerHTML = `<div class="grid-list">
    ${list.map(p => `<div class="card" style="display:flex;align-items:center;gap:16px;border-left:4px solid var(--danger)">
      ${pastorAvatar(p.pastor_name, p.image_url, 'md')}
      <div style="flex:1">
        <div style="font-weight:700">${esc(p.pastor_name)}</div>
        ${statusBadge(p.status_code)}
        ${p.notes ? `<div style="font-size:12px;color:var(--text-muted);margin-top:4px">${icon('file-text','icon-xs')} ${esc(p.notes)}</div>` : ''}
      </div>
      <button class="btn btn-secondary btn-sm" onclick="openReinstateModal(${p.pastor_id})">${icon('refresh-cw')} Reinstate</button>
    </div>`).join('')}
  </div>`;
}

// ── Interim Tab ───────────────────────────────────────────────
function renderInterimTab() {
  const container = document.getElementById('assignments-content');
  const list = pastors.filter(p => p.status_code === 'interim');

  if (list.length === 0) {
    container.innerHTML = emptyState('No Interim Pastors', 'No pastors are currently serving as interim.', '', '');
    lucide.createIcons();
    return;
  }

  container.innerHTML = `<div class="grid-list">
    ${list.map(p => {
      const active = getActiveAssignment(p.pastor_id);
      const c = active?.church_id ? churches.find(x => x.church_id === active.church_id) : null;
      return `<div class="card" style="display:flex;align-items:center;gap:16px;border-left:4px solid var(--warning)">
        ${pastorAvatar(p.pastor_name, p.image_url, 'md')}
        <div style="flex:1">
          <div style="font-weight:700">${esc(p.pastor_name)}</div>
          ${statusBadge(p.status_code)}
          ${c ? `<div style="font-size:12px;color:var(--text-muted);margin-top:4px">${icon('church','icon-xs')} ${esc(c.church_name)}</div>` : ''}
          ${active ? `<div style="font-size:12px;color:var(--text-muted)">${icon('calendar','icon-xs')} Since ${formatDate(active.start_date)}</div>` : ''}
        </div>
        <button class="btn btn-secondary btn-sm" onclick="openReinstateModal(${p.pastor_id})">${icon('refresh-cw')} Reassign</button>
      </div>`;
    }).join('')}
  </div>`;
}

// ── History Tab ───────────────────────────────────────────────
function renderHistoryTab() {
  const container = document.getElementById('assignments-content');
  const closed = churchAssignments.filter(a => a.end_date).sort((a, b) => new Date(b.end_date) - new Date(a.end_date));

  if (closed.length === 0) {
    container.innerHTML = emptyState('No History Yet', 'Closed assignments will appear here.', '', '');
    lucide.createIcons();
    return;
  }

  container.innerHTML = `<div class="table-wrapper">
    <table>
      <thead>
        <tr>
          <th>Pastor</th>
          <th>Church</th>
          <th>District</th>
          <th>Type</th>
          <th>Period</th>
        </tr>
      </thead>
      <tbody>
        ${closed.map(a => {
          const p = pastors.find(x => x.pastor_id === a.pastor_id);
          const c = a.church_id ? churches.find(x => x.church_id === a.church_id) : null;
          const d = a.district_id ? districts.find(x => x.district_id === a.district_id) : null;
          return `<tr>
            <td>
              <div class="pastor-info">
                ${pastorAvatar(p?.pastor_name||'?', p?.image_url, 'sm')}
                <span>${esc(p?.pastor_name||'Unknown')}</span>
              </div>
            </td>
            <td data-label="Church">${c ? esc(c.church_name) : '<span class="td-muted">—</span>'}</td>
            <td data-label="District">${d ? esc(d.district_name) : '<span class="td-muted">—</span>'}</td>
            <td data-label="Type">${assignmentBadge(a.assignment_type_code)}</td>
            <td data-label="Period" class="td-muted">${formatDateRange(a.start_date, a.end_date)}</td>
          </tr>`;
        }).join('')}
      </tbody>
    </table>
  </div>`;
}

// ── New Assignment Modal ──────────────────────────────────────
window.openAddAssignmentModal = function(preselectedPastorId = null, preselectedChurchId = null) {
  const availablePastors = pastors.filter(p => p.status_code !== 'suspended');
  const pastorOpts = `<option value="">— Select Pastor —</option>` +
    availablePastors.map(p => `<option value="${p.pastor_id}" ${preselectedPastorId === p.pastor_id ? 'selected' : ''}>${esc(p.pastor_name)} (${p.status_code})</option>`).join('');

  let districtFieldHtml = '';
  let churchFieldHtml = '';

  if (preselectedChurchId) {
    const c = churches.find(x => x.church_id === preselectedChurchId);
    const d = c && c.district_id ? districts.find(x => x.district_id === c.district_id) : null;
    
    districtFieldHtml = `
      <div class="form-group">
        <label>${icon('map','icon-xs')} District</label>
        <input type="text" value="${esc(d ? d.district_name : 'No District')}" disabled style="opacity:0.6; background:var(--bg-base)">
        <input type="hidden" id="f-assign-district" value="${d ? d.district_id : ''}">
      </div>
    `;
    churchFieldHtml = `
      <div class="form-group">
        <label>${icon('church','icon-xs')} Church</label>
        <input type="text" value="${esc(c ? c.church_name : '')}" disabled style="opacity:0.6; background:var(--bg-base)">
        <input type="hidden" id="f-assign-church" value="${preselectedChurchId}">
      </div>
    `;
  } else {
    const churchOpts = `<option value="">— No Church —</option>` +
      churches.map(c => `<option value="${c.church_id}" ${preselectedChurchId === c.church_id ? 'selected' : ''}>${esc(c.church_name)}</option>`).join('');

    const districtOpts = `<option value="">— No District —</option>` +
      districts.map(d => `<option value="${d.district_id}">${esc(d.district_name)}</option>`).join('');
      
    districtFieldHtml = `
      <div class="form-group">
        <label>${icon('map','icon-xs')} District</label>
        <select id="f-assign-district" onchange="onAssignDistrictChange()">${districtOpts}</select>
      </div>
    `;
    churchFieldHtml = `
      <div class="form-group">
        <label>${icon('church','icon-xs')} Church</label>
        <select id="f-assign-church">${churchOpts}</select>
      </div>
    `;
  }

  openModal(
    `${icon('clipboard-list')} New Assignment`,
    `<div class="form-grid">
      <div class="form-group span-2">
        <label>${icon('user','icon-xs')} Pastor *</label>
        <select id="f-assign-pastor">${pastorOpts}</select>
      </div>
      <div class="form-group">
        <label>${icon('tag','icon-xs')} Assignment Type *</label>
        <select id="f-assign-type">${assignmentTypeOptions('regular', true)}</select>
      </div>
      <div class="form-group">
        <label>${icon('calendar','icon-xs')} Start Date *</label>
        <input type="date" id="f-assign-start" value="${TODAY}">
      </div>
      ${districtFieldHtml}
      ${churchFieldHtml}
      <div class="form-group span-2">
        <label>${icon('file-text','icon-xs')} Notes</label>
        <textarea id="f-assign-notes" placeholder="Optional notes"></textarea>
      </div>
    </div>`,
    `<button class="btn btn-secondary" onclick="closeModal()">${icon('x')} Cancel</button>
     <button class="btn btn-primary" onclick="saveAssignment()">${icon('save')} Save Assignment</button>`,
    'modal-lg'
  );
};

window.onAssignDistrictChange = function() {
  const distId = +document.getElementById('f-assign-district')?.value || null;
  const churchSelect = document.getElementById('f-assign-church');
  if (!churchSelect) return;
  const filtered = distId ? churches.filter(c => c.district_id === distId) : churches;
  churchSelect.innerHTML = `<option value="">— No Church —</option>` +
    filtered.map(c => `<option value="${c.church_id}">${esc(c.church_name)}</option>`).join('');
};

window.saveAssignment = function() {
  const pastorId  = +document.getElementById('f-assign-pastor')?.value || null;
  const type      = document.getElementById('f-assign-type')?.value;
  const startDate = document.getElementById('f-assign-start')?.value;
  const distId    = +document.getElementById('f-assign-district')?.value || null;
  const churchId  = +document.getElementById('f-assign-church')?.value || null;
  const notes     = document.getElementById('f-assign-notes')?.value.trim();

  if (!pastorId)  { showToast('Please select a pastor.', 'error'); return; }
  if (!type)      { showToast('Please select an assignment type.', 'error'); return; }
  if (!startDate) { showToast('Start date is required.', 'error'); return; }

  const p = pastors.find(x => x.pastor_id === pastorId);
  if (!p) return;

  // Close any existing active assignment for this pastor
  const existing = getActiveAssignment(pastorId);
  if (existing) {
    existing.end_date = startDate;
    showToast(`Previous assignment closed.`, 'info');
  }

  // If church already has active pastor, close that too
  if (churchId) {
    const churchAssign = churchAssignments.find(a => a.church_id === churchId && !a.end_date);
    if (churchAssign && churchAssign.pastor_id !== pastorId) {
      churchAssign.end_date = startDate;
      const prevPastor = pastors.find(x => x.pastor_id === churchAssign.pastor_id);
      if (prevPastor) prevPastor.status_code = 'undeployed';
    }
  }

  // Determine new status
  const newStatus = type === 'interim' ? 'interim' : 'active';
  p.status_code = newStatus;

  // If district_id not set on church, auto-set it
  if (churchId && distId) {
    const ch = churches.find(x => x.church_id === churchId);
    if (ch && !ch.district_id) ch.district_id = distId;
  }

  churchAssignments.push({
    assignment_id: nextId('assignment'),
    pastor_id: pastorId,
    district_id: distId,
    church_id: churchId,
    assignment_type_code: type,
    start_date: startDate,
    notes: notes || null,
    created_at: TODAY,
  });

  showToast(`${p.pastor_name} assigned successfully.`, 'success');
  saveAll();
  closeModal();
  renderAssignments();
};

// ── Close Assignment ──────────────────────────────────────────
window.closeAssignment = function(assignmentId) {
  const a = churchAssignments.find(x => x.assignment_id === assignmentId);
  if (!a) return;
  const p = pastors.find(x => x.pastor_id === a.pastor_id);
  if (confirm(`Close this assignment for ${p?.pastor_name || 'this pastor'}?`)) {
    a.end_date = TODAY;
    if (p) p.status_code = 'undeployed';
    showToast('Assignment closed. Pastor is now undeployed.', 'info');
    saveAll();
    renderAssignments();
  }
};

// ── Suspend Modal ─────────────────────────────────────────────
window.openSuspendModal = function(preselectedId = null) {
  const available = pastors.filter(p => p.status_code !== 'suspended');
  const opts = `<option value="">— Select Pastor —</option>` +
    available.map(p => `<option value="${p.pastor_id}" ${preselectedId === p.pastor_id ? 'selected' : ''}>${esc(p.pastor_name)}</option>`).join('');

  openModal(
    `${icon('ban')} Suspend Pastor`,
    `<div class="alert alert-warning" style="margin-bottom:16px">${icon('triangle-alert','icon-sm')} <div>Suspending a pastor will close their active assignment and remove them from any district leadership roles.</div></div>
    <div class="form-grid cols-1">
      <div class="form-group">
        <label>${icon('user','icon-xs')} Pastor *</label>
        <select id="f-suspend-pastor">${opts}</select>
      </div>
      <div class="form-group">
        <label>${icon('file-text','icon-xs')} Reason / Notes</label>
        <textarea id="f-suspend-notes" placeholder="Reason for suspension…"></textarea>
      </div>
    </div>`,
    `<button class="btn btn-secondary" onclick="closeModal()">${icon('x')} Cancel</button>
     <button class="btn btn-danger" onclick="confirmSuspend()">${icon('ban')} Suspend</button>`
  );
};

window.confirmSuspend = function() {
  const pastorId = +document.getElementById('f-suspend-pastor')?.value || null;
  const notes    = document.getElementById('f-suspend-notes')?.value.trim();
  if (!pastorId) { showToast('Please select a pastor.', 'error'); return; }

  const p = pastors.find(x => x.pastor_id === pastorId);
  if (!p) return;

  // Close active assignment
  const active = getActiveAssignment(pastorId);
  if (active) active.end_date = TODAY;

  // Remove from district leadership
  districts.filter(d => d.leader_pastor_id === pastorId).forEach(d => d.leader_pastor_id = null);
  districts.filter(d => d.assistant_leader_pastor_id === pastorId).forEach(d => d.assistant_leader_pastor_id = null);

  p.status_code = 'suspended';
  if (notes) p.notes = notes;

  showToast(`${p.pastor_name} has been suspended.`, 'warning');
  saveAll();
  closeModal();
  renderAssignments();
};

// ── Reinstate Modal ───────────────────────────────────────────
window.openReinstateModal = function(preselectedId = null) {
  const list = pastors.filter(p => p.status_code === 'suspended' || p.status_code === 'interim');
  const opts = `<option value="">— Select Pastor —</option>` +
    list.map(p => `<option value="${p.pastor_id}" ${preselectedId === p.pastor_id ? 'selected' : ''}>${esc(p.pastor_name)} (${p.status_code})</option>`).join('');

  openModal(
    `${icon('refresh-cw')} Reinstate / Reassign Pastor`,
    `<div class="form-grid cols-1">
      <div class="form-group">
        <label>${icon('user','icon-xs')} Pastor *</label>
        <select id="f-reinstate-pastor">${opts}</select>
      </div>
      <div class="form-group">
        <label>${icon('activity','icon-xs')} New Status</label>
        <select id="f-reinstate-status">
          <option value="undeployed">Undeployed (no assignment yet)</option>
          <option value="active">Active (will create new assignment)</option>
        </select>
      </div>
      <div class="form-group">
        <label>${icon('file-text','icon-xs')} Notes</label>
        <textarea id="f-reinstate-notes" placeholder="Optional notes…"></textarea>
      </div>
    </div>`,
    `<button class="btn btn-secondary" onclick="closeModal()">${icon('x')} Cancel</button>
     <button class="btn btn-primary" onclick="confirmReinstate()">${icon('check')} Reinstate</button>`
  );
};

window.confirmReinstate = function() {
  const pastorId = +document.getElementById('f-reinstate-pastor')?.value || null;
  const newStatus = document.getElementById('f-reinstate-status')?.value;
  const notes    = document.getElementById('f-reinstate-notes')?.value.trim();
  if (!pastorId) { showToast('Please select a pastor.', 'error'); return; }

  const p = pastors.find(x => x.pastor_id === pastorId);
  if (!p) return;
  p.status_code = newStatus;
  if (notes) p.notes = notes;

  showToast(`${p.pastor_name} reinstated as ${newStatus}.`, 'success');
  saveAll();
  closeModal();

  if (newStatus === 'active') {
    openAddAssignmentModal(pastorId);
  } else {
    renderAssignments();
  }
};
