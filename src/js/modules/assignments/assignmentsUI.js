import { showToast } from '../../shared/components/toast.js';
// ============================================================
// Church Management System — Assignments Module
// ============================================================

import {
  pastors, churches, districts, churchAssignments, getActiveAssignment, updatePastorStatus, clearPastorDistrictRoles, releaseDisciplesFromPastor
} from '../../core/state.js';

import { dbService } from '../../core/dbService.js';

import {
  icon, esc, pastorAvatar, statusBadge, assignmentBadge,
  assignmentTypeOptions, formatDate, formatDateRange, emptyState, debounce
} from '../../shared/utils/helpers.js';

import { openModal, closeModal } from '../../shared/components/modal.js';

const TODAY = new Date().toISOString().split('T')[0];
let currentTab = 'active';
let _afterSaveCallback = null;

function setAssignmentAfterSave(cb) {
  _afterSaveCallback = cb;
}

function jsStr(value) {
  return JSON.stringify(String(value ?? ''));
}

function safeCreateIcons() {
  if (window.lucide?.createIcons) lucide.createIcons();
}

function setLoadingState(button, loadingText, originalHtml) {
  if (!button) return originalHtml;
  button.disabled = true;
  button.innerHTML = `${icon('loader', 'animate-spin')} ${loadingText}`;
  return originalHtml;
}

function restoreButtonState(button, originalHtml) {
  if (!button) return;
  button.disabled = false;
  button.innerHTML = originalHtml;
}

// ── Render Assignments Page ───────────────────────────────────
export function renderAssignments() {
  const content = document.getElementById('page-content');
  const actions = document.getElementById('topbar-actions');
  const activeCount = (Array.isArray(churchAssignments) ? churchAssignments : []).filter(a => !a.end_date).length;

  if (actions) {
    actions.innerHTML = `
      <div style="display:flex; gap:8px; flex-wrap: wrap;">
        <button class="btn btn-primary" onclick="openAddAssignmentModal()">${icon('plus')} <span>Add Assignment</span></button>
      </div>
    `;
  }

  if (!content) return;
  content.innerHTML = `
      <div class="fade-in">
        <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 24px; flex-wrap: wrap; gap: 12px;">
          <h1 style="margin: 0; font-size: 20px; font-weight: 800; display: flex; align-items: center; gap: 8px;">
          Assignments
          <span style="font-size: 11px; font-weight: 700; color: var(--text-muted); padding: 2px 10px; background: var(--bg-elevated); border-radius: 20px; border: 1px solid var(--border);">
            Total Assignments: ${activeCount}
          </span>
        </h1>

        <div class="filter-trigger-wrap">
          <button type="button" class="filter-trigger-btn active" style="width:auto; padding:0 14px; gap:8px;" onclick="toggleAssignFilterPanel(event)">
            ${icon(ASSIGN_TAB_META[currentTab].iconName, 'icon-sm')}
            <span style="font-size:13px; font-weight:700;">${ASSIGN_TAB_META[currentTab].label}</span>
            ${icon('chevron-down', 'icon-xs')}
          </button>
          <div id="assign-filter-panel" class="filter-dropdown-panel">
            <div class="filter-section">
              <div class="filter-section-label">View</div>
              <div class="filter-chip-list" id="assign-tab-chips">
                ${Object.entries(ASSIGN_TAB_META).map(([id, meta]) => renderAssignChip(id, meta)).join('')}
              </div>
            </div>
          </div>
        </div>
        </div>
      <div id="assignments-content"></div>
    </div>
  `;

  renderCurrentTab();
  safeCreateIcons();
  bindAssignFilterOutsideClick();
}

const ASSIGN_TAB_META = {
  active:      { label: 'Active Deployments', iconName: 'check-circle' },
  undeployed:  { label: 'Available Pastors',  iconName: 'user' },
  pullout:     { label: 'Pull Out',           iconName: 'minus-circle' },
  redirection: { label: 'Redirection',        iconName: 'refresh-cw' },
  history:     { label: 'Assignment Logs',    iconName: 'clock' },
};

let assignOutsideClickBound = false;

function renderAssignChip(id, meta) {
  const isActive = currentTab === id;
  return `
    <button type="button" class="filter-chip${isActive ? ' active' : ''}" data-tab="${id}" onclick="switchAssignTab('${id}')">
      ${icon(meta.iconName, 'icon-xs')} ${meta.label}
    </button>
  `;
}

window.toggleAssignFilterPanel = function(event) {
  event.stopPropagation();
  document.getElementById('assign-filter-panel')?.classList.toggle('open');
};

function bindAssignFilterOutsideClick() {
  if (assignOutsideClickBound) return;
  assignOutsideClickBound = true;
  document.addEventListener('click', (e) => {
    const wrap = document.querySelector('#page-content .filter-trigger-wrap');
    if (wrap && !wrap.contains(e.target)) {
      document.getElementById('assign-filter-panel')?.classList.remove('open');
    }
  });
}

function switchAssignTab(tab) {
  currentTab = tab;
  renderAssignments();
}

function renderCurrentTab() {
  switch (currentTab) {
    case 'active':
      renderActiveTab();
      break;
    case 'undeployed':
      renderUndeployedTab();
      break;
    case 'pullout':
      renderPulloutTab();
      break;
    case 'redirection':
      renderRedirectionTab();
      break;
    case 'history':
      renderHistoryTab();
      break;
    default:
      renderActiveTab();
  }
}

// ── Active Tab ────────────────────────────────────────────────
function renderActiveTab() {
  const container = document.getElementById('assignments-content');
  if (!container) return;

  const active = (Array.isArray(churchAssignments) ? churchAssignments : []).filter(a => !a.end_date);

  if (active.length === 0) {
    container.innerHTML = emptyState(
      'No Active Assignments',
      'Create a new assignment to get started.',
      'clipboard-list',
      'New Assignment',
      'openAddAssignmentModal()'
    );
    safeCreateIcons();
    return;
  }

  container.innerHTML = `
    <div class="grid-list">
      ${active.map(a => {
        const p = (Array.isArray(pastors) ? pastors : []).find(x => x.pastor_id === a.pastor_id);
        const c = a.church_id ? (Array.isArray(churches) ? churches : []).find(x => x.church_id === a.church_id) : null;
        const d = a.district_id ? (Array.isArray(districts) ? districts : []).find(x => x.district_id === a.district_id) : null;

        return `
          <div class="card" style="padding: 24px; display: flex; flex-direction: column; border-color: var(--border);">
            <div style="display: flex; gap: 16px; align-items: center; margin-bottom: 20px;">
              ${pastorAvatar(p?.pastor_name || '?', p?.image_url, 'md')}
              <div style="flex: 1; min-width: 0;">
                <div style="font-weight: 800; font-size: 16px; color: var(--text-primary); white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">
                  ${esc(p?.pastor_name || 'Unknown')}
                </div>
                <div style="font-size: 12px; color: var(--text-muted); font-weight: 500; display: flex; align-items: center; gap: 6px; margin-top: 4px;">
                  ${icon('calendar', 'icon-xs')} Since ${a.start_date ? formatDate(a.start_date) : 'N/A'}
                </div>
              </div>
            </div>

            <div style="padding: 12px; border-radius: var(--radius-lg); background: var(--bg-elevated); border: 1px solid var(--border); margin-bottom: 20px;">
              <div style="font-size: 10px; font-weight: 800; text-transform: uppercase; color: var(--text-muted); margin-bottom: 8px; display: flex; align-items: center; gap: 4px;">
                ${icon('map-pin', 'icon-xs')} Station
              </div>
              <div style="font-weight: 700; color: var(--text-primary); font-size: 14px;">
                ${c ? esc(c.church_name) : 'No Station Selected'}
              </div>
              ${d ? `
                <div style="font-size: 11px; font-weight: 700; color: var(--text-muted); text-transform: uppercase; margin-top: 2px;">
                  ${esc(d.district_name)}
                </div>
              ` : ''}
              <div style="margin-top: 8px;">${assignmentBadge(a.assignment_type_code)}</div>
            </div>

            <div style="display: flex; gap: 8px; margin-top: auto;">
              <button class="btn btn-secondary btn-sm" style="flex: 1; padding: 8px 0; display: flex; flex-direction: column; gap: 4px; height: auto;" onclick="openAddAssignmentModal(null, null, ${a.assignment_id})">${icon('pencil', 'icon-xs')} <span style="font-size: 10px;">Edit</span></button>
              <button class="btn btn-secondary btn-sm hover:text-danger" style="flex: 1; padding: 8px 0; display: flex; flex-direction: column; gap: 4px; height: auto;" onclick="closeAssignment(${a.assignment_id})">${icon('x-circle', 'icon-xs')} <span style="font-size: 10px;">Close</span></button>
              <button class="btn btn-secondary btn-sm" style="flex: 1; padding: 8px 0; display: flex; flex-direction: column; gap: 4px; height: auto;" onclick="openPulloutModal(${a.pastor_id})">${icon('minus-circle', 'icon-xs')} <span style="font-size: 10px;">Pull Out</span></button>
            </div>
          </div>
        `;
      }).join('')}
    </div>
  `;
  safeCreateIcons();
}

// ── Undeployed Tab ────────────────────────────────────────────
function renderUndeployedTab() {
  const container = document.getElementById('assignments-content');
  if (!container) return;

  const list = (Array.isArray(pastors) ? pastors : []).filter(p => p.status_code === 'undeployed');

  if (list.length === 0) {
    container.innerHTML = emptyState('No Available Pastors', 'All pastors are currently assigned to mission stations.', 'user-check', '', '');
    safeCreateIcons();
    return;
  }

  container.innerHTML = `
    <div style="display: grid; grid-template-columns: repeat(auto-fill, minmax(320px, 1fr)); gap: 20px;">
      ${list.map(p => `
        <div class="card" style="padding: 20px; display: flex; align-items: center; gap: 16px; border-left: 4px solid var(--accent-dim);">
          ${pastorAvatar(p.pastor_name, p.image_url, 'md')}
          <div style="flex: 1; min-width: 0;">
            <div style="font-weight: 800; font-size: 15px; color: var(--text-primary); margin-bottom: 4px; border-bottom: none;">
              ${esc(p.pastor_name)}
            </div>
            <div style="display: flex; flex-direction: column; gap: 4px;">
              ${p.contact_number ? `<div style="font-size: 12px; color: var(--text-muted); font-weight: 600; display: flex; align-items: center; gap: 6px;">${icon('phone', 'icon-xs')} ${esc(p.contact_number)}</div>` : ''}
              ${p.pastoring_start_date ? `<div style="font-size: 12px; color: var(--text-muted); font-weight: 600; display: flex; align-items: center; gap: 6px;">${icon('calendar', 'icon-xs')} Since ${formatDate(p.pastoring_start_date)}</div>` : ''}
            </div>
          </div>
          <button type="button" class="btn btn-sm btn-primary" style="padding: 10px 16px; border-radius: 10px;" onclick="openAddAssignmentModal(${p.pastor_id})">${icon('plus', 'icon-xs')} Deploy</button>
        </div>
      `).join('')}
    </div>
  `;
  safeCreateIcons();
}

// ── Pull Out Tab ─────────────────────────────────────────────
function renderPulloutTab() {
  const container = document.getElementById('assignments-content');
  if (!container) return;

  const list = (Array.isArray(pastors) ? pastors : []).filter(p => p.status_code === 'pullout' || p.status_code === 'suspended');

  if (list.length === 0) {
    container.innerHTML = emptyState('No Pulled Out Pastors', 'No pastors are currently pulled out.', 'minus-circle', '', '');
    safeCreateIcons();
    return;
  }

  container.innerHTML = `
    <div class="grid-list">
      ${list.map(p => `
        <div class="card" style="padding: 24px; display: flex; flex-direction: column; border-color: var(--danger-dim);">
          <div style="display: flex; gap: 16px; align-items: center; margin-bottom: 16px;">
            ${pastorAvatar(p.pastor_name, p.image_url, 'md')}
            <div style="flex: 1; min-width: 0;">
              <div style="font-weight: 800; font-size: 16px; color: var(--text-primary); white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">
                ${esc(p.pastor_name)}
              </div>
              <div style="margin-top: 6px;">${statusBadge(p.status_code)}</div>
            </div>
          </div>

          <div style="flex: 1; font-size: 13px; color: var(--text-secondary); line-height: 1.5; margin-bottom: 24px; padding: 12px; background: var(--bg-base); border-radius: var(--radius-md); border: 1px dashed var(--border);">
            <div style="font-size: 10px; font-weight: 800; text-transform: uppercase; color: var(--text-muted); margin-bottom: 8px; display: flex; align-items: center; gap: 4px;">
              ${icon('file-text', 'icon-xs')} Reason / Notes
            </div>
            ${p.notes ? esc(p.notes) : '<span style="opacity: 0.5; font-style: italic;">No notes provided.</span>'}
          </div>

          <button type="button" class="btn btn-secondary w-full" onclick="openReinstateModal(${p.pastor_id})">${icon('refresh-cw', 'icon-xs')} Reinstate</button>
        </div>
      `).join('')}
    </div>
  `;
  safeCreateIcons();
}

// ── Redirection Tab ──────────────────────────────────────────
function renderRedirectionTab() {
  const container = document.getElementById('assignments-content');
  if (!container) return;

  const list = (Array.isArray(pastors) ? pastors : []).filter(p => p.status_code === 'redirection' || p.status_code === 'interim');

  if (list.length === 0) {
    container.innerHTML = emptyState('No Redirection Roles', 'No pastors are currently serving in redirection capacities.', 'refresh-cw', '', '');
    safeCreateIcons();
    return;
  }

  container.innerHTML = `
    <div class="grid-list">
      ${list.map(p => {
        const active = getActiveAssignment(p.pastor_id);
        const c = active?.church_id ? (Array.isArray(churches) ? churches : []).find(x => x.church_id === active.church_id) : null;

        return `
          <div class="card" style="padding: 24px; display: flex; flex-direction: column; border-color: var(--warning-dim);">
            <div style="display: flex; gap: 16px; align-items: center; margin-bottom: 20px;">
              ${pastorAvatar(p.pastor_name, p.image_url, 'md')}
              <div style="flex: 1; min-width: 0;">
                <div style="font-weight: 800; font-size: 16px; color: var(--text-primary); white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">
                  ${esc(p.pastor_name)}
                </div>
                <div style="margin-top: 6px;">${statusBadge(p.status_code)}</div>
              </div>
            </div>

            <div style="padding: 12px; border-radius: var(--radius-lg); background: var(--bg-elevated); border: 1px solid var(--border); margin-bottom: 20px;">
              <div style="font-size: 10px; font-weight: 800; text-transform: uppercase; color: var(--text-muted); margin-bottom: 8px; display: flex; align-items: center; gap: 4px;">
                ${icon('map-pin', 'icon-xs')} Temporary Station
              </div>
              <div style="font-weight: 700; color: var(--text-primary); font-size: 14px;">
                ${c ? esc(c.church_name) : 'No Station'}
              </div>

              <div style="font-size: 12px; color: var(--text-secondary); font-weight: 500; display: flex; align-items: center; gap: 6px; margin-top: 12px; padding-top: 12px; border-top: 1px dashed var(--border);">
                ${icon('calendar', 'icon-xs')} Since ${active?.start_date ? formatDate(active.start_date) : '—'}
              </div>
            </div>

            <button type="button" class="btn btn-secondary w-full" style="margin-top: auto;" onclick="openReinstateModal(${p.pastor_id})">${icon('refresh-cw', 'icon-xs')} Reassign</button>
          </div>
        `;
      }).join('')}
    </div>
  `;
  safeCreateIcons();
}

// ── History Tab ───────────────────────────────────────────────
function renderHistoryTab() {
  const container = document.getElementById('assignments-content');
  if (!container) return;

  const closed = (Array.isArray(churchAssignments) ? churchAssignments : [])
    .filter(a => a.end_date)
    .sort((a, b) => new Date(b.end_date) - new Date(a.end_date));

  if (closed.length === 0) {
    container.innerHTML = emptyState(
      'No Historical Data',
      'Records of past assignments will be archived here.',
      'clock',
      '',
      ''
    );
    safeCreateIcons();
    return;
  }

  container.innerHTML = `
    <div class="grid-list">
      ${closed.map(a => {
        const p = (Array.isArray(pastors) ? pastors : []).find(x => x.pastor_id === a.pastor_id);
        const c = a.church_id ? (Array.isArray(churches) ? churches : []).find(x => x.church_id === a.church_id) : null;
        const d = a.district_id ? (Array.isArray(districts) ? districts : []).find(x => x.district_id === a.district_id) : null;

        const start = a.start_date ? new Date(a.start_date) : null;
        const end = a.end_date ? new Date(a.end_date) : null;

        let durationStr = 'N/A';
        if (start && end && !isNaN(start) && !isNaN(end)) {
          const months = (end.getFullYear() - start.getFullYear()) * 12 + (end.getMonth() - start.getMonth());
          durationStr = months >= 12 ? `${Math.floor(months / 12)}y ${months % 12}m` : `${months}m`;
        }

        return `
          <div class="card" style="padding: 24px; display: flex; flex-direction: column; opacity: 0.85; filter: grayscale(20%);">
            <div style="display: flex; gap: 16px; align-items: start; margin-bottom: 16px;">
              ${pastorAvatar(p?.pastor_name || '?', p?.image_url, 'md')}
              <div style="flex: 1; min-width: 0;">
                <div style="font-weight: 800; font-size: 16px; color: var(--text-primary); white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">
                  ${esc(p?.pastor_name || 'Unknown')}
                </div>
                <div style="margin-top: 6px;">${assignmentBadge(a.assignment_type_code)}</div>
              </div>
              <div class="badge" style="background: var(--bg-base); border: 1px solid var(--border); color: var(--text-secondary);">
                ${durationStr}
              </div>
            </div>

            <div style="padding: 12px; border-radius: var(--radius-lg); background: var(--bg-elevated); font-size: 13px;">
              <div style="font-weight: 700; color: var(--text-primary);">
                ${c ? esc(c.church_name) : 'Unspecified Field'}
              </div>
              ${d ? `
                <div style="font-size: 11px; font-weight: 700; color: var(--text-muted); text-transform: uppercase; margin-top: 4px;">
                  ${esc(d.district_name)}
                </div>
              ` : ''}
            </div>

            <div style="display: flex; align-items: center; gap: 8px; color: var(--text-muted); font-size: 12px; font-weight: 500; margin-top: 16px;">
              ${icon('calendar', 'icon-xs')} ${a.start_date ? formatDate(a.start_date) : 'N/A'} — ${a.end_date ? formatDate(a.end_date) : 'N/A'}
            </div>
          </div>
        `;
      }).join('')}
    </div>
  `;

  safeCreateIcons();
}

// ── Search helpers ───────────────────────────────────────────
function filterAssignPastorOptions() {
  const query = (document.getElementById('assign-pastor-search')?.value || '').toLowerCase();
  const optionsContainer = document.getElementById('assign-pastor-options');
  if (!optionsContainer) return;

  const filtered = (Array.isArray(pastors) ? pastors : []).filter(p =>
    String(p.pastor_name || '').toLowerCase().includes(query) &&
    p.status_code !== 'pullout' &&
    p.status_code !== 'suspended' &&
    p.status_code !== 'deceased'
  );

  if (filtered.length === 0) {
    optionsContainer.innerHTML = `<div style="padding: 12px; color: var(--text-muted); font-size: 13px; text-align: center;">No pastors found matching ${esc(query)}</div>`;
  } else {
    optionsContainer.innerHTML = filtered.map(p => `
      <div class="search-select-option" onmousedown='selectAssignPastor(${p.pastor_id}, ${jsStr(p.pastor_name)})'>
        ${pastorAvatar(p.pastor_name, p.image_url, 'xs')}
        <div style="flex: 1;">
          <div style="font-weight: 700;">${esc(p.pastor_name)}</div>
          <div style="font-size: 11px; opacity: 0.6;">Status: ${esc(p.status_code)}</div>
        </div>
      </div>
    `).join('');
  }

  optionsContainer.classList.add('open');
}

function selectAssignPastor(id, name) {
  const input = document.getElementById('assign-pastor-search');
  const hidden = document.getElementById('f-assign-pastor');
  const options = document.getElementById('assign-pastor-options');
  if (input) input.value = name;
  if (hidden) hidden.value = id;
  if (options) options.classList.remove('open');
}

// ── Searchable Assignment Helpers ───────────────────────────
function filterAssignTypeOptions() {
  const query = (document.getElementById('assign-type-search')?.value || '').toLowerCase();
  const optionsContainer = document.getElementById('assign-type-options');
  if (!optionsContainer) return;

  const typesList = [
    { code: 'regular', label: 'Regular' },
    { code: 'pioneering', label: 'Pioneering' },
    { code: 'training', label: 'Training' },
    { code: 'swap', label: 'Swap' },
    { code: 'suspended', label: 'Suspended' },
    { code: 'international', label: 'International' },
    { code: 'interim', label: 'Interim' }
  ];

  const filtered = typesList.filter(t => t.label.toLowerCase().includes(query));

  optionsContainer.innerHTML = filtered.map(t => `
    <div class="search-select-option" onmousedown="selectAssignType('${t.code}', '${t.label}')">
      <div style="font-weight: 700;">${esc(t.label)}</div>
    </div>
  `).join('');
  optionsContainer.classList.add('open');
}
function selectAssignType(code, label) {
  const input = document.getElementById('assign-type-search');
  const hidden = document.getElementById('f-assign-type');
  const options = document.getElementById('assign-type-options');
  if (input) input.value = label;
  if (hidden) hidden.value = code;
  if (options) options.classList.remove('open');
}

function filterAssignDistrictOptions() {
  const query = (document.getElementById('assign-district-search')?.value || '').toLowerCase();
  const optionsContainer = document.getElementById('assign-district-options');
  if (!optionsContainer) return;

  const filtered = (Array.isArray(districts) ? districts : []).filter(d => d.district_name.toLowerCase().includes(query));
  optionsContainer.innerHTML = filtered.map(d => `
    <div class="search-select-option" onmousedown='selectAssignDistrict(${d.district_id}, ${jsStr(d.district_name)})'>
      <div style="width: 12px; height: 12px; border-radius: 3px; background: ${d.color || 'var(--accent)'};"></div>
      <div style="font-weight: 700;">${esc(d.district_name)}</div>
    </div>
  `).join('');
  optionsContainer.classList.add('open');
}
function selectAssignDistrict(id, name) {
  const input = document.getElementById('assign-district-search');
  const hidden = document.getElementById('f-assign-district');
  const options = document.getElementById('assign-district-options');
  if (input) input.value = name;
  if (hidden) hidden.value = id;
  if (options) options.classList.remove('open');
  onAssignDistrictChange();
}

function filterAssignChurchOptions() {
  const query = (document.getElementById('assign-church-search')?.value || '').toLowerCase();
  const optionsContainer = document.getElementById('assign-church-options');
  const distId = +document.getElementById('f-assign-district')?.value || null;
  if (!optionsContainer) return;

  const filtered = (Array.isArray(churches) ? churches : []).filter(c => 
    (!distId || c.district_id === distId) && 
    c.church_name.toLowerCase().includes(query)
  );

  optionsContainer.innerHTML = filtered.map(c => `
    <div class="search-select-option" onmousedown='selectAssignChurch(${c.church_id}, ${jsStr(c.church_name)})'>
      <div style="font-weight: 700;">${esc(c.church_name)}</div>
    </div>
  `).join('');
  optionsContainer.classList.add('open');
}
function selectAssignChurch(id, name) {
  const input = document.getElementById('assign-church-search');
  const hidden = document.getElementById('f-assign-church');
  const options = document.getElementById('assign-church-options');
  if (input) input.value = name;
  if (hidden) hidden.value = id;
  if (options) options.classList.remove('open');
}

function filterPulloutPastorOptions() {
  const query = (document.getElementById('pullout-pastor-search')?.value || '').toLowerCase();
  const optionsContainer = document.getElementById('pullout-pastor-options');
  if (!optionsContainer) return;

  const available = (Array.isArray(pastors) ? pastors : []).filter(
    p => p.status_code !== 'pullout' &&
         p.status_code !== 'suspended' &&
         String(p.pastor_name || '').toLowerCase().includes(query)
  );

  if (available.length === 0) {
    optionsContainer.innerHTML = `<div style="padding: 12px; color: var(--text-muted); font-size: 13px; text-align: center;">No pastors found matching ${esc(query)}</div>`;
  } else {
    optionsContainer.innerHTML = available.map(p => `
      <div class="search-select-option" onmousedown='selectPulloutPastor(${p.pastor_id}, ${jsStr(p.pastor_name)})'>
        ${pastorAvatar(p.pastor_name, p.image_url, 'xs')}
        <div style="font-weight: 700;">${esc(p.pastor_name)}</div>
      </div>
    `).join('');
  }
  optionsContainer.classList.add('open');
}

function selectPulloutPastor(id, name) {
  const input = document.getElementById('pullout-pastor-search');
  const hidden = document.getElementById('f-pullout-pastor');
  const options = document.getElementById('pullout-pastor-options');
  if (input) input.value = name;
  if (hidden) hidden.value = id;
  if (options) options.classList.remove('open');
}

function filterReinstatePastorOptions() {
  const query = (document.getElementById('reinstate-pastor-search')?.value || '').toLowerCase();
  const optionsContainer = document.getElementById('reinstate-pastor-options');
  if (!optionsContainer) return;

  const list = (Array.isArray(pastors) ? pastors : []).filter(
    p => (p.status_code === 'pullout' ||
          p.status_code === 'suspended' ||
          p.status_code === 'redirection' ||
          p.status_code === 'interim') &&
         String(p.pastor_name || '').toLowerCase().includes(query)
  );

  if (list.length === 0) {
    optionsContainer.innerHTML = `<div style="padding: 12px; color: var(--text-muted); font-size: 13px; text-align: center;">No pastors found matching ${esc(query)}</div>`;
  } else {
    optionsContainer.innerHTML = list.map(p => `
      <div class="search-select-option" onmousedown='selectReinstatePastor(${p.pastor_id}, ${jsStr(p.pastor_name)})'>
        ${pastorAvatar(p.pastor_name, p.image_url, 'xs')}
        <div style="font-weight: 700;">${esc(p.pastor_name)} (${esc(p.status_code)})</div>
      </div>
    `).join('');
  }
  optionsContainer.classList.add('open');
}

function selectReinstatePastor(id, name) {
  const input = document.getElementById('reinstate-pastor-search');
  const hidden = document.getElementById('f-reinstate-pastor');
  const options = document.getElementById('reinstate-pastor-options');
  if (input) input.value = name;
  if (hidden) hidden.value = id;
  if (options) options.classList.remove('open');
}

// ── Modals ────────────────────────────────────────────────────
function openAddAssignmentModal(preselectedPastorId = null, preselectedChurchId = null, editAssignmentId = null) {
  const isEdit = !!editAssignmentId;
  const assignment = isEdit ? (Array.isArray(churchAssignments) ? churchAssignments : []).find(a => a.assignment_id === editAssignmentId) : null;
  if (isEdit && !assignment) return;

  const pastorId = isEdit ? assignment.pastor_id : preselectedPastorId;
  const selectedPastor = pastorId ? (Array.isArray(pastors) ? pastors : []).find(p => p.pastor_id === pastorId) : null;
  const type = isEdit ? assignment.assignment_type_code : 'regular';
  const startDate = isEdit ? assignment.start_date : TODAY;
  const churchId = isEdit ? assignment.church_id : preselectedChurchId;
  const notes = isEdit ? assignment.notes : '';

  let distId = null;
  if (churchId) {
    const c = (Array.isArray(churches) ? churches : []).find(x => x.church_id === churchId);
    if (c && c.district_id) distId = c.district_id;
  } else if (isEdit) {
    distId = assignment.district_id;
  }

  openModal(
    `${icon(isEdit ? 'pencil' : 'clipboard-list')} ${isEdit ? 'Edit' : 'New'} Deployment`,
    `<div class="form-grid">
      <div class="form-group span-2">
        <label>Pastor *</label>
        <div class="search-select-wrapper">
          <div style="position: relative;">
            <div style="position: absolute; left: 12px; top: 50%; transform: translateY(-50%); color: var(--accent);">
              ${icon('user', 'icon-sm')}
            </div>
            <input type="text" id="assign-pastor-search"
              class="search-select-input"
              placeholder="Search pastor..."
              value="${esc(selectedPastor?.pastor_name || '')}"
              autocomplete="off"
              onfocus="filterAssignPastorOptions()"
              oninput="filterAssignPastorOptions()"
              onblur="setTimeout(() => { document.getElementById('assign-pastor-options')?.classList.remove('open'); }, 200)">
            <input type="hidden" id="f-assign-pastor" value="${pastorId || ''}">
          </div>
          <div id="assign-pastor-options" class="search-select-options"></div>
        </div>
      </div>

      <div class="form-group">
        <label>Assignment Type *</label>
        <div class="search-select-wrapper">
          <div style="position: relative;">
            <div style="position: absolute; left: 12px; top: 50%; transform: translateY(-50%); color: var(--accent);">
              ${icon('tag', 'icon-sm')}
            </div>
            <input type="text" id="assign-type-search"
              class="search-select-input"
              placeholder="Select Type..."
              value="${type ? type.charAt(0).toUpperCase() + type.slice(1) : ''}"
              autocomplete="off"
              onfocus="filterAssignTypeOptions()"
              oninput="filterAssignTypeOptions()"
              onblur="setTimeout(() => { document.getElementById('assign-type-options')?.classList.remove('open'); }, 200)">
            <input type="hidden" id="f-assign-type" value="${type || ''}">
          </div>
          <div id="assign-type-options" class="search-select-options"></div>
        </div>
      </div>

      <div class="form-group">
        <label>Effective Date *</label>
        <input type="date" id="f-assign-start" value="${startDate}">
      </div>

      <div class="form-group span-2" style="background: var(--bg-elevated); border: 1px solid var(--border); padding: 16px; border-radius: var(--radius-lg); margin: 8px 0;">
        <div style="font-size: 11px; font-weight: 800; color: var(--text-muted); text-transform: uppercase; letter-spacing: 0.1em; margin-bottom: 16px; display: flex; align-items: center; gap: 6px;">
          ${icon('map-pin', 'icon-xs')} Mission Station Allocation
        </div>
        <div class="form-grid" style="margin-top: 0;">
          <div class="form-group">
            <label>District</label>
            <div class="search-select-wrapper">
              <div style="position: relative;">
                <input type="text" id="assign-district-search"
                  class="search-select-input"
                  placeholder="Search District..."
                  value="${esc((Array.isArray(districts) ? districts : []).find(d => d.district_id === distId)?.district_name || '')}"
                  autocomplete="off"
                  onfocus="filterAssignDistrictOptions()"
                  oninput="filterAssignDistrictOptions()"
                  onblur="setTimeout(() => { document.getElementById('assign-district-options')?.classList.remove('open'); }, 200)">
                <input type="hidden" id="f-assign-district" value="${distId || ''}">
              </div>
              <div id="assign-district-options" class="search-select-options"></div>
            </div>
          </div>
          <div class="form-group">
            <label>Church / Mission Station</label>
            <div class="search-select-wrapper">
              <div style="position: relative;">
                <input type="text" id="assign-church-search"
                  class="search-select-input"
                  placeholder="Search Church..."
                  value="${esc((Array.isArray(churches) ? churches : []).find(c => c.church_id === churchId)?.church_name || '')}"
                  autocomplete="off"
                  onfocus="filterAssignChurchOptions()"
                  oninput="filterAssignChurchOptions()"
                  onblur="setTimeout(() => { document.getElementById('assign-church-options')?.classList.remove('open'); }, 200)">
                <input type="hidden" id="f-assign-church" value="${churchId || ''}">
              </div>
              <div id="assign-church-options" class="search-select-options"></div>
            </div>
          </div>
        </div>
      </div>

      <div class="form-group span-2">
        <label>Deployment Notes</label>
        <textarea id="f-assign-notes" rows="2" placeholder="Transfer notes or specific instructions...">${esc(notes || '')}</textarea>
      </div>
    </div>`,
    `<button type="button" class="btn btn-secondary" onclick="closeModal()">${icon('x')} Cancel</button>
     <button type="button" class="btn btn-primary" onclick="saveAssignment(${editAssignmentId || 'null'})">${icon('save')} ${isEdit ? 'Update' : 'Deploy'} Pastor</button>`,
    'modal-lg'
  );
}

function onAssignDistrictChange() {
  const distId = +document.getElementById('f-assign-district')?.value || null;
  const churchSelect = document.getElementById('f-assign-church');
  if (!churchSelect) return;

  const filtered = distId ? (Array.isArray(churches) ? churches : []).filter(c => c.district_id === distId) : (Array.isArray(churches) ? churches : []);
  churchSelect.innerHTML = `<option value="">— No Church —</option>` +
    filtered.map(c => `<option value="${c.church_id}">${esc(c.church_name)}</option>`).join('');
}

async function saveAssignment(editAssignmentId = null) {
  const pastorId = +document.getElementById('f-assign-pastor')?.value || null;
  const type = document.getElementById('f-assign-type')?.value;
  const startDate = document.getElementById('f-assign-start')?.value;
  const distId = +document.getElementById('f-assign-district')?.value || null;
  const churchId = +document.getElementById('f-assign-church')?.value || null;
  const notes = document.getElementById('f-assign-notes')?.value.trim();

  if (!pastorId) { showToast('Please select a pastor.', 'error'); return; }
  if (!type) { showToast('Please select an assignment type.', 'error'); return; }
  if (!startDate) { showToast('Start date is required.', 'error'); return; }

  const btn = document.querySelector('.modal-footer .btn-primary');
  const originalHtml = setLoadingState(btn, 'Saving...', btn?.innerHTML);

  try {
    const p = pastors.find(x => x.pastor_id === pastorId);
    if (!p) {
      showToast('Pastor not found.', 'error');
      return;
    }

    if (editAssignmentId) {
      const a = churchAssignments.find(x => x.assignment_id === editAssignmentId);
      if (!a) {
        showToast('Assignment not found.', 'error');
        return;
      }

      if (a.pastor_id !== pastorId) {
        // Free the old pastor and end their assignment locally and in Supabase
        const oldP = pastors.find(x => x.pastor_id === a.pastor_id);
        if (oldP) {
          const oldActive = getActiveAssignment(oldP.pastor_id);
          if (oldActive) await dbService.update('church_assignments', 'assignment_id', oldActive.assignment_id, { end_date: startDate });
          await dbService.update('pastors', 'pastor_id', oldP.pastor_id, { status_code: 'undeployed' });
          await updatePastorStatus(oldP.pastor_id, 'undeployed');
        }
      }

      const updatedStatus = type === 'interim' ? 'redirection' : 'active';
      await dbService.update('pastors', 'pastor_id', pastorId, { status_code: updatedStatus });
      await updatePastorStatus(pastorId, updatedStatus);

      const payload = {
        pastor_id: pastorId,
        district_id: distId,
        church_id: churchId,
        assignment_type_code: type,
        start_date: startDate,
        notes: notes || null
      };

      const updatedAssign = await dbService.update('church_assignments', 'assignment_id', editAssignmentId, payload);
      Object.assign(a, updatedAssign);

      showToast('Assignment updated.', 'success');
    } else {
      const existing = getActiveAssignment(pastorId);
      if (existing) {
        await dbService.update('church_assignments', 'assignment_id', existing.assignment_id, { end_date: startDate });
        existing.end_date = startDate;

        // Transferring to a different church: disciples stay tied to the
        // church they were registered at, not the pastor - release the
        // mentor link so it doesn't silently follow them to the new post.
        if (existing.church_id !== churchId) {
          releaseDisciplesFromPastor(pastorId);
        }
      }

      if (churchId) {
        const churchAssign = churchAssignments.find(a => a.church_id === churchId && !a.end_date);
        if (churchAssign && churchAssign.pastor_id !== pastorId) {
          await dbService.update('church_assignments', 'assignment_id', churchAssign.assignment_id, { end_date: startDate });
          await dbService.update('pastors', 'pastor_id', churchAssign.pastor_id, { status_code: 'undeployed' });
          await updatePastorStatus(churchAssign.pastor_id, 'undeployed');
        }
      }

      const newStatus = type === 'interim' ? 'redirection' : 'active';
      await dbService.update('pastors', 'pastor_id', pastorId, { status_code: newStatus });
      await updatePastorStatus(pastorId, newStatus);

      if (churchId && distId) {
        const ch = churches.find(x => x.church_id === churchId);
        if (ch && !ch.district_id) {
          await dbService.update('churches', 'church_id', churchId, { district_id: distId });
          ch.district_id = distId;
        }
      }

      const payload = {
        pastor_id: pastorId,
        district_id: distId,
        church_id: churchId,
        assignment_type_code: type,
        start_date: startDate,
        notes: notes || null
      };

      await dbService.create('church_assignments', payload);

      showToast(`${p.pastor_name} assigned successfully.`, 'success');
    }

    closeModal();

    if (_afterSaveCallback) {
      const cb = _afterSaveCallback;
      _afterSaveCallback = null;
      cb();
    } else {
      renderAssignments();
    }
  } catch (err) {
    console.error('[Assignments] Save failed:', err);
    showToast(`Failed to save assignment: ${err.message || 'Unknown error'}`, 'error');
  } finally {
    restoreButtonState(btn, originalHtml);
  }
}

async function closeAssignment(assignmentId) {
  try {
    const a = churchAssignments.find(x => x.assignment_id === assignmentId);
    if (!a) {
      showToast('Assignment not found.', 'error');
      return;
    }

    const p = pastors.find(x => x.pastor_id === a.pastor_id);
    const confirmed = confirm(`Close this assignment for ${p?.pastor_name || 'this pastor'}?`);
    if (!confirmed) return;

    const today = new Date().toISOString().split('T')[0];
    await dbService.update('church_assignments', 'assignment_id', assignmentId, { end_date: today });
    await dbService.update('pastors', 'pastor_id', a.pastor_id, { status_code: 'undeployed' });
    
    await updatePastorStatus(a.pastor_id, 'undeployed');

    showToast('Assignment closed. Pastor is now undeployed.', 'info');
    renderAssignments();
  } catch (err) {
    console.error('closeAssignment error:', err);
    showToast('Failed to close assignment.', 'error');
  }
}

function openPulloutModal(preselectedId = null) {
  const selectedPastor = preselectedId ? (Array.isArray(pastors) ? pastors : []).find(p => p.pastor_id === preselectedId) : null;

  openModal(
    `${icon('minus-circle')} Pull Out Pastor`,
    `<div class="alert alert-warning" style="margin-bottom:16px">${icon('triangle-alert','icon-sm')} <div>Pulling out a pastor will close their active assignment and remove them from any district leadership roles.</div></div>
    <div class="form-grid cols-1">
      <div class="form-group">
        <label>${icon('user','icon-xs')} Pastor *</label>
        <div class="search-select-wrapper">
          <div style="position: relative;">
            <div style="position: absolute; left: 12px; top: 50%; transform: translateY(-50%); color: var(--accent);">
              ${icon('user', 'icon-sm')}
            </div>
            <input type="text" id="pullout-pastor-search"
              class="search-select-input"
              placeholder="Search pastor by name..."
              value="${esc(selectedPastor?.pastor_name || '')}"
              autocomplete="off"
              onfocus="filterPulloutPastorOptions()"
              oninput="filterPulloutPastorOptions()"
              onblur="setTimeout(() => { document.getElementById('pullout-pastor-options')?.classList.remove('open'); }, 200)">
            <input type="hidden" id="f-pullout-pastor" value="${preselectedId || ''}">
          </div>
          <div id="pullout-pastor-options" class="search-select-options"></div>
        </div>
      </div>
      <div class="form-group">
        <label>${icon('file-text','icon-xs')} Reason / Notes</label>
        <textarea id="f-pullout-notes" placeholder="Reason for pulling out…"></textarea>
      </div>
    </div>`,
    `<button type="button" class="btn btn-secondary" onclick="closeModal()">${icon('x')} Cancel</button>
     <button type="button" class="btn btn-danger" onclick="confirmPullout()">${icon('minus-circle')} Pull Out</button>`
  );
}

async function confirmPullout() {
  const pastorId = +document.getElementById('f-pullout-pastor')?.value || null;
  const notes = document.getElementById('f-pullout-notes')?.value.trim();
  if (!pastorId) {
    showToast('Please select a pastor.', 'error');
    return;
  }

  const btn = document.querySelector('.modal-footer .btn-danger');
  const originalHtml = setLoadingState(btn, 'Processing...', btn?.innerHTML);

  try {
    const p = pastors.find(x => x.pastor_id === pastorId);
    if (!p) {
      showToast('Pastor not found.', 'error');
      return;
    }

    const active = getActiveAssignment(pastorId);
    const originChurchId = active?.church_id || null;
    const today = new Date().toISOString().split('T')[0];

    if (active) {
      await dbService.update('church_assignments', 'assignment_id', active.assignment_id, { end_date: today });
      active.end_date = today;
    }

    const suspensionDetails = {
      pastor_id: pastorId,
      district_id: active?.district_id || null,
      church_id: null,
      assignment_type_code: 'suspended',
      start_date: today,
      origin_church_id: originChurchId,
      notes: notes || 'Pastor pulled out from active duty.',
    };

    await dbService.create('church_assignments', suspensionDetails);

    await dbService.update('pastors', 'pastor_id', pastorId, { status_code: 'pullout', notes: notes });
    await updatePastorStatus(pastorId, 'pullout', notes);

    closeModal();
    showToast(`${p.pastor_name} has been pulled out.`, 'warning');
    renderAssignments();
  } catch (err) {
    console.error('[Assignments] Pull out failed:', err);
    showToast(`Failed to pull out pastor: ${err.message || 'Unknown error'}`, 'error');
  } finally {
    restoreButtonState(btn, originalHtml);
  }
}

function openReinstateModal(preselectedId = null) {
  const selectedPastor = preselectedId ? (Array.isArray(pastors) ? pastors : []).find(p => p.pastor_id === preselectedId) : null;

  openModal(
    `${icon('refresh-cw')} Reinstate / Reassign Pastor`,
    `<div class="form-grid cols-1">
      <div class="form-group">
        <label>${icon('user','icon-xs')} Pastor *</label>
        <div class="search-select-wrapper">
          <div style="position: relative;">
            <div style="position: absolute; left: 12px; top: 50%; transform: translateY(-50%); color: var(--accent);">
              ${icon('user', 'icon-sm')}
            </div>
            <input type="text" id="reinstate-pastor-search"
              class="search-select-input"
              placeholder="Search pastor by name..."
              value="${esc(selectedPastor?.pastor_name || '')}"
              autocomplete="off"
              onfocus="filterReinstatePastorOptions()"
              oninput="filterReinstatePastorOptions()"
              onblur="setTimeout(() => { document.getElementById('reinstate-pastor-options')?.classList.remove('open'); }, 200)">
            <input type="hidden" id="f-reinstate-pastor" value="${preselectedId || ''}">
          </div>
          <div id="reinstate-pastor-options" class="search-select-options"></div>
        </div>
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
    `<button type="button" class="btn btn-secondary" onclick="closeModal()">${icon('x')} Cancel</button>
     <button type="button" class="btn btn-primary" onclick="confirmReinstate()">${icon('check')} Reinstate</button>`
  );
}

async function confirmReinstate() {
  const pastorId = +document.getElementById('f-reinstate-pastor')?.value || null;
  const newStatus = document.getElementById('f-reinstate-status')?.value;
  const notes = document.getElementById('f-reinstate-notes')?.value.trim();
  if (!pastorId) {
    showToast('Please select a pastor.', 'error');
    return;
  }

  const btn = document.querySelector('.modal-footer .btn-primary');
  const originalHtml = setLoadingState(btn, 'Reinstating...', btn?.innerHTML);

  try {
    const p = pastors.find(x => x.pastor_id === pastorId);
    if (!p) {
      showToast('Pastor not found.', 'error');
      return;
    }

    await dbService.update('pastors', 'pastor_id', pastorId, { status_code: newStatus, notes: notes });
    await updatePastorStatus(pastorId, newStatus, notes);

    const active = getActiveAssignment(pastorId);
    if (active && (newStatus === 'undeployed' || newStatus === 'active')) {
      const today = new Date().toISOString().split('T')[0];
      await dbService.update('church_assignments', 'assignment_id', active.assignment_id, { end_date: today });
      active.end_date = today;
    }

    closeModal();
    showToast(`${p.pastor_name} reinstated as ${newStatus}.`, 'success');

    if (newStatus === 'active') {
      openAddAssignmentModal(pastorId);
    } else {
      renderAssignments();
    }
  } catch (err) {
    console.error('[Assignments] Reinstate failed:', err);
    showToast(`Failed to reinstate pastor: ${err.message || 'Unknown error'}`, 'error');
  } finally {
    restoreButtonState(btn, originalHtml);
  }
}

// ── Public bindings ──────────────────────────────────────────
window.renderAssignments = renderAssignments;
window.switchAssignTab = switchAssignTab;
window.setAssignmentAfterSave = setAssignmentAfterSave;
window.onAssignDistrictChange = onAssignDistrictChange;
window.filterAssignPastorOptions = filterAssignPastorOptions;
window.selectAssignPastor = selectAssignPastor;
window.filterAssignTypeOptions = filterAssignTypeOptions;
window.selectAssignType = selectAssignType;
window.filterAssignDistrictOptions = filterAssignDistrictOptions;
window.selectAssignDistrict = selectAssignDistrict;
window.filterAssignChurchOptions = filterAssignChurchOptions;
window.selectAssignChurch = selectAssignChurch;
window.triggerImportCSV = function(type) { if (window.importCSV) window.importCSV(type); };
window.openAssignmentsExportModal = function() { if (window.openExportModal) window.openExportModal('assignments'); };
window.openAddAssignmentModal = openAddAssignmentModal;
window.saveAssignment = saveAssignment;
window.closeAssignment = closeAssignment;
window.openPulloutModal = openPulloutModal;
window.confirmPullout = confirmPullout;
window.openReinstateModal = openReinstateModal;
window.confirmReinstate = confirmReinstate;
window.filterPulloutPastorOptions = filterPulloutPastorOptions;
window.selectPulloutPastor = selectPulloutPastor;
window.filterReinstatePastorOptions = filterReinstatePastorOptions;
window.selectReinstatePastor = selectReinstatePastor;