import { showToast } from '../../shared/components/toast.js';
import { pastors, districts, disciples, churchAssignments, churches } from '../../core/state.js';
import { dbService } from '../../core/dbService.js';
import { icon, esc, pastorAvatar, viewDelegateQR, emptyState } from '../../shared/utils/helpers.js';
import { openModal, closeModal } from '../../shared/components/modal.js';

const jsStr = (value) => JSON.stringify(String(value ?? ''));

export function renderDisciples() {
  const content = document.getElementById('page-content');
  const actions = document.getElementById('topbar-actions');

  if (actions) {
    actions.innerHTML = `
      <button type="button" class="btn btn-primary" onclick="openAddDiscipleModal()">${icon('user-plus')} <span>Add Disciple</span></button>
    `;
  }

  if (!content) return;

  content.innerHTML = `
    <div class="fade-in">
      <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 24px;">
        <h1 style="margin: 0; font-size: 20px; font-weight: 800; display: flex; align-items: center; gap: 8px;">
          Disciples
          <span style="font-size: 11px; font-weight: 700; color: var(--text-muted); padding: 2px 10px; background: var(--bg-elevated); border-radius: 20px; border: 1px solid var(--border);">
            Total Disciples: ${disciples.length}
          </span>
        </h1>
      </div>
      <div class="card" style="padding: 16px; margin-bottom: 32px; display: flex; gap: 16px; flex-wrap: wrap; align-items: center;">
        <div style="flex: 1; position: relative; min-width: 280px;">
          <div style="position: absolute; left: 16px; top: 50%; transform: translateY(-50%); color: var(--text-muted);">
            ${icon('search', 'icon-sm')}
          </div>
          <input type="text" id="disciple-search"
                 style="padding-left: 44px; background: var(--bg-base); border-color: transparent;"
                 placeholder="Search by disciple name..." oninput="updateDisciplesList()">
        </div>
        <div style="font-size: 13px; font-weight: 700; color: var(--text-muted); text-transform: uppercase; display: flex; align-items: center; gap: 8px;">
          ${icon('users', 'icon-xs')} Registered Members
        </div>
      </div>
      <div id="disciples-list"></div>
    </div>
  `;

  updateDisciplesList();
  window.lucide?.createIcons?.();
}

export function updateDisciplesList() {
  const container = document.getElementById('disciples-list');
  if (!container) return;

  const searchInput = (document.getElementById('disciple-search')?.value || '').toLowerCase().trim();

  const filtered = (Array.isArray(disciples) ? disciples : [])
    .filter(d => String(d.full_name || '').toLowerCase().includes(searchInput))
    .sort((a, b) => String(a.full_name || '').localeCompare(String(b.full_name || '')));

  if (filtered.length === 0) {
    container.innerHTML = emptyState(
      'No Disciples Found',
      searchInput ? 'No results match your search query.' : 'Start by adding a new disciple to the system.',
      'user-check',
      !searchInput ? 'Add Disciple' : '',
      !searchInput ? 'openAddDiscipleModal()' : ''
    );
    window.lucide?.createIcons?.();
    return;
  }

  container.innerHTML = `
    <div class="grid-list">
      ${filtered.map(d => {
        const p = d.pastor_id ? (Array.isArray(pastors) ? pastors : []).find(x => x.pastor_id === d.pastor_id) : null;
        const color = getPastorColor(d.pastor_id);
        const isUnassigned = !d.pastor_id;

        // Church comes from the disciple's own stored church_id (snapshotted
        // at registration), not re-derived from the pastor's current
        // assignment - so it stays correct even after the mentor is released.
        const church = d.church_id ? (churches || []).find(c => c.church_id === d.church_id) : null;
        const churchName = church ? church.church_name : 'N/A';

        return `
          <div class="card" style="padding: 24px; display: flex; flex-direction: column; transition: transform 0.2s, box-shadow 0.2s; border-color: var(--border); position: relative;">

            <div style="display: flex; gap: 16px; align-items: flex-start; margin-bottom: 20px;">
              ${pastorAvatar(d.full_name, '', 'md', color)}
              <div style="flex: 1; min-width: 0; padding-right: 32px;">
                <div style="font-weight: 800; font-size: 16px; color: var(--text-primary); letter-spacing: -0.02em; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">${esc(d.full_name || '')}</div>
                ${d.contact_number ? `
                  <div style="display: flex; align-items: center; gap: 6px; color: var(--text-secondary); font-size: 12px; margin-top: 4px; font-weight: 500;">
                    ${icon('phone', 'icon-xs')} ${esc(d.contact_number)}
                  </div>
                ` : ''}
                ${church ? `
                  <div style="display: flex; align-items: center; gap: 6px; color: var(--text-muted); font-size: 12px; margin-top: 4px; font-weight: 500;">
                    ${icon('church', 'icon-xs')} ${esc(church.church_name)}
                  </div>
                ` : ''}
              </div>
            </div>

            <div style="margin-top: auto; padding-top: 16px; border-top: 1px dashed var(--border);">
              <div style="font-size: 10px; font-weight: 800; text-transform: uppercase; letter-spacing: 0.05em; color: var(--text-muted); margin-bottom: 8px; display: flex; align-items: center; gap: 6px;">
                Mentor Pastor
              </div>
              <div style="display: flex; align-items: center; justify-content: space-between; gap: 8px;">
                <div style="display: flex; align-items: center; gap: 8px;">
                  <div style="width: 8px; height: 8px; border-radius: 50%; background: ${color};"></div>
                  <span style="font-weight: 600; font-size: 13px; color: ${isUnassigned ? 'var(--danger)' : 'var(--text-secondary)'};">${p ? esc(p.pastor_name) : 'Mentor Vacant'}</span>
                </div>
                ${isUnassigned ? `<button class="btn btn-icon-sm" style="border: none; background: var(--accent-dim); color: var(--accent);" onclick="openReassignDiscipleModal(${d.disciple_id})" title="Reassign Mentor">${icon('user-plus', 'icon-xs')}</button>` : ''}
              </div>
            </div>

            <div style="display: flex; gap: 6px; margin-top: 20px;">
              <button class="btn btn-secondary btn-sm" style="flex: 1; padding: 12px 0; display: flex; flex-direction: column; gap: 4px; height: auto;" onclick='previewID({type:"disciple", full_name: ${jsStr(d.full_name || "")}, church_name: ${jsStr(churchName)}, qr_code: ${jsStr(getDelegateQR("disciple", d.disciple_id))}})' title="Generate ID Card">${icon('contact', 'icon-xs')} <span style="font-size: 10px;">ID Card</span></button>
              <button class="btn btn-secondary btn-sm" style="flex: 1; padding: 12px 0; display: flex; flex-direction: column; gap: 4px; height: auto;" onclick="openEditDiscipleModal(${d.disciple_id})">${icon('edit-2', 'icon-xs')} <span style="font-size: 10px;">Edit</span></button>
              <button class="btn btn-secondary btn-sm hover:text-danger" style="flex: 1; padding: 12px 0; display: flex; flex-direction: column; gap: 4px; height: auto;" onclick="deleteDisciple(${d.disciple_id})">${icon('trash-2', 'icon-xs')} <span style="font-size: 10px;">Delete</span></button>
            </div>
          </div>
        `;
      }).join('')}
    </div>
  `;

  window.lucide?.createIcons?.();
}

export function getPastorColor(pastorId) {
  if (!pastorId) return 'var(--text-muted)';
  const active = (Array.isArray(churchAssignments) ? churchAssignments : []).find(a => a.pastor_id === Number(pastorId) && !a.end_date);
  if (active) {
    const d = (Array.isArray(districts) ? districts : []).find(x => x.district_id === active.district_id);
    return d?.color || 'var(--text-muted)';
  }
  return 'var(--text-muted)';
}

export function openAddDiscipleModal() {
  renderDiscipleModal(null);
}

export function openEditDiscipleModal(id) {
  const d = (Array.isArray(disciples) ? disciples : []).find(x => x.disciple_id === id);
  if (d) renderDiscipleModal(d);
}

export function openReassignDiscipleModal(id) {
  const d = (Array.isArray(disciples) ? disciples : []).find(x => x.disciple_id === id);
  if (!d) return;
  const church = d.church_id ? (Array.isArray(churches) ? churches : []).find(c => c.church_id === d.church_id) : null;

  openModal(
    `${icon('user-plus')} Reassign Mentor`,
    `<div class="form-grid cols-1">
      <div class="form-group span-2" style="background: var(--bg-elevated); padding: 12px; border-radius: var(--radius-md); border: 1px dashed var(--border);">
        <div style="font-size: 12px; color: var(--text-muted);">
          ${icon('info', 'icon-xs')} <strong>${esc(d.full_name)}</strong> is currently unassigned${church ? ` at <strong>${esc(church.church_name)}</strong>` : ''}. Pick a new mentor pastor below.
        </div>
      </div>
      <div class="form-group">
        <label>New Mentor Pastor *</label>
        <div class="search-select-wrapper">
          <div style="position: absolute; left: 12px; top: 50%; transform: translateY(-50%); color: var(--accent); z-index: 1;">
            ${icon('user-check', 'icon-sm')}
          </div>
          <input type="text" id="f-reassign-pastor-search" class="search-select-input" style="padding-left: 40px;"
                 placeholder="Search by name..."
                 oninput="filterReassignPastorOptions(this.value)"
                 onfocus="filterReassignPastorOptions(this.value)"
                 onblur="setTimeout(() => document.getElementById('reassign-pastor-options')?.classList.remove('open'), 200)"
                 autocomplete="off">
          <input type="hidden" id="f-reassign-pastor-id" value="">
          <div id="reassign-pastor-options" class="search-select-options"></div>
        </div>
      </div>
    </div>`,
    `<button class="btn btn-secondary" onclick="closeModal()">${icon('x')} Cancel</button>
     <button class="btn btn-primary" onclick="confirmReassignDisciple(${id})">${icon('save')} Reassign</button>`,
    'modal-md'
  );
}

export function filterReassignPastorOptions(query) {
  const container = document.getElementById('reassign-pastor-options');
  if (!container) return;

  const q = String(query || '').toLowerCase().trim();
  const matches = q === ''
    ? (Array.isArray(pastors) ? pastors : []).slice(0, 10)
    : (Array.isArray(pastors) ? pastors : []).filter(p => String(p.pastor_name || '').toLowerCase().includes(q)).slice(0, 10);

  container.innerHTML = matches.length === 0
    ? '<div class="search-select-option muted">No pastors found</div>'
    : matches.map(p => `
        <div class="search-select-option" onclick='selectReassignPastor(${p.pastor_id}, ${jsStr(p.pastor_name || '')})'>
          <span>${esc(p.pastor_name || '')}</span>
        </div>
      `).join('');

  container.classList.add('open');
}

export function selectReassignPastor(id, name) {
  const idInput = document.getElementById('f-reassign-pastor-id');
  const searchInput = document.getElementById('f-reassign-pastor-search');
  const options = document.getElementById('reassign-pastor-options');
  if (idInput) idInput.value = id;
  if (searchInput) searchInput.value = name;
  if (options) options.classList.remove('open');
}

export async function confirmReassignDisciple(discipleId) {
  const newPastorId = +(document.getElementById('f-reassign-pastor-id')?.value || 0);
  if (!newPastorId) {
    showToast('Please select a pastor.', 'error');
    return;
  }

  const d = (Array.isArray(disciples) ? disciples : []).find(x => x.disciple_id === discipleId);
  if (!d) return;

  const activeAssign = (Array.isArray(churchAssignments) ? churchAssignments : []).find(a => a.pastor_id === newPastorId && !a.end_date);

  try {
    const updated = await dbService.update('disciples', 'disciple_id', discipleId, {
      pastor_id: newPastorId,
      church_id: activeAssign?.church_id ?? d.church_id,
      district_id: activeAssign?.district_id ?? d.district_id,
    });
    Object.assign(d, updated);
    showToast('Disciple reassigned successfully.', 'success');
    closeModal();
    if (document.getElementById('disciples-list')) updateDisciplesList();
  } catch (err) {
    console.error('[Disciples] Reassign failed:', err);
    showToast(`Failed to reassign: ${err.message || 'Unknown error'}`, 'error');
  }
}

export function renderDiscipleModal(d) {
  const isEdit = !!d;
  const p = d ? (Array.isArray(pastors) ? pastors : []).find(x => x.pastor_id === d.pastor_id) : null;

  openModal(
    `${icon(isEdit ? 'edit-2' : 'user-plus')} ${isEdit ? 'Update' : 'Register'} Member`,
    `<div class="form-grid">
      <div class="form-group span-2">
        <label>Full Name *</label>
        <div style="position: relative;">
          <div style="position: absolute; left: 12px; top: 50%; transform: translateY(-50%); color: var(--accent);">
            ${icon('user', 'icon-sm')}
          </div>
          <input type="text" id="f-disciple-name" style="padding-left: 40px;" value="${esc(d?.full_name || '')}" placeholder="e.g. Juan Dela Cruz">
        </div>
      </div>

      <div class="form-group">
        <label>Contact Number</label>
        <div style="position: relative;">
          <div style="position: absolute; left: 12px; top: 50%; transform: translateY(-50%); color: var(--accent);">
            ${icon('phone', 'icon-sm')}
          </div>
          <input type="text" id="f-disciple-contact" style="padding-left: 40px;" value="${esc(d?.contact_number || '')}" placeholder="09XX XXX XXXX">
        </div>
      </div>

      <div class="form-group">
        <label>Birthdate (Optional)</label>
        <div style="position: relative;">
          <div style="position: absolute; left: 12px; top: 50%; transform: translateY(-50%); color: var(--accent);">
            ${icon('cake', 'icon-sm')}
          </div>
          <input type="date" id="f-disciple-birthdate" style="padding-left: 40px;" value="${d?.birth_date || ''}">
        </div>
      </div>

      <div class="form-group span-2">
        <label>Primary Pastor *</label>
        <div class="search-select-wrapper">
          <div style="position: absolute; left: 12px; top: 50%; transform: translateY(-50%); color: var(--accent); z-index: 1;">
            ${icon('user-check', 'icon-sm')}
          </div>
          <input type="text" id="f-pastor-search" class="search-select-input" style="padding-left: 40px;"
                 placeholder="Search by name..."
                 oninput="filterPastorOptions(this.value)"
                 onfocus="this.value === '' ? filterPastorOptions('') : filterPastorOptions(this.value)"
                 onblur="setTimeout(() => document.getElementById('pastor-options')?.classList.remove('open'), 200)"
                 value="${esc(p?.pastor_name || '')}" autocomplete="off">
          <input type="hidden" id="f-pastor-id" value="${d?.pastor_id || ''}">
          <div id="pastor-options" class="search-select-options"></div>
        </div>
      </div>

      <div class="form-group span-2" id="disciple-pastor-context">
        ${renderPastorContext(p)}
      </div>
    </div>`,
    `<button class="btn btn-secondary" onclick="closeModal()">${icon('x')} Cancel</button>
     <button class="btn btn-primary" onclick="confirmSaveDisciple(${d?.disciple_id ?? 'null'})">${icon('save')} Save Member</button>`,
    'modal-md'
  );
}

function renderPastorContext(p) {
  if (!p) {
    return `
      <div style="background: var(--bg-elevated); padding: 12px; border-radius: var(--radius-md); border: 1px dashed var(--border);">
        <div style="font-size: 11px; color: var(--text-muted); display: flex; align-items: start; gap: 8px;">
          ${icon('info', 'icon-xs', 'margin-top: 2px')}
          <span>Select a pastor to auto-fill their Church and District.</span>
        </div>
      </div>
    `;
  }

  const active = (Array.isArray(churchAssignments) ? churchAssignments : []).find(a => a.pastor_id === p.pastor_id && !a.end_date);
  const church = active ? (Array.isArray(churches) ? churches : []).find(c => c.church_id === active.church_id) : null;
  const district = active ? (Array.isArray(districts) ? districts : []).find(x => x.district_id === active.district_id) : null;

  return `
    <div style="background: var(--bg-elevated); padding: 12px; border-radius: var(--radius-md); border: 1px solid var(--border); display: flex; gap: 20px; flex-wrap: wrap;">
      <div>
        <div style="font-size: 10px; font-weight: 800; text-transform: uppercase; letter-spacing: 0.05em; color: var(--text-muted); margin-bottom: 2px;">Church</div>
        <div style="font-size: 13px; font-weight: 700; color: var(--text-primary); display: flex; align-items: center; gap: 6px;">
          ${icon('church', 'icon-xs')} ${esc(church?.church_name || 'No active assignment')}
        </div>
      </div>
      <div>
        <div style="font-size: 10px; font-weight: 800; text-transform: uppercase; letter-spacing: 0.05em; color: var(--text-muted); margin-bottom: 2px;">District</div>
        <div style="font-size: 13px; font-weight: 700; color: var(--text-primary); display: flex; align-items: center; gap: 6px;">
          ${icon('map', 'icon-xs')} ${esc(district?.district_name || '—')}
        </div>
      </div>
    </div>
  `;
}

export function filterPastorOptions(query) {
  const container = document.getElementById('pastor-options');
  if (!container) return;

  const q = String(query || '').toLowerCase().trim();
  const matches = q === ''
    ? (Array.isArray(pastors) ? pastors : []).slice(0, 10)
    : (Array.isArray(pastors) ? pastors : []).filter(p => String(p.pastor_name || '').toLowerCase().includes(q)).slice(0, 10);

  if (matches.length === 0) {
    container.innerHTML = '<div class="search-select-option muted">No pastors found</div>';
  } else {
    container.innerHTML = matches.map(p => `
      <div class="search-select-option" onclick='selectPastor(${p.pastor_id}, ${jsStr(p.pastor_name || '')})'>
        <span>${esc(p.pastor_name || '')}</span>
      </div>
    `).join('');
  }

  container.classList.add('open');
}

export function selectPastor(id, name) {
  const pastorIdInput = document.getElementById('f-pastor-id');
  const pastorSearchInput = document.getElementById('f-pastor-search');
  const options = document.getElementById('pastor-options');
  const contextEl = document.getElementById('disciple-pastor-context');

  if (pastorIdInput) pastorIdInput.value = id;
  if (pastorSearchInput) pastorSearchInput.value = name;
  if (options) options.classList.remove('open');
  if (contextEl) {
    const p = (Array.isArray(pastors) ? pastors : []).find(x => x.pastor_id === id);
    contextEl.innerHTML = renderPastorContext(p);
    window.lucide?.createIcons?.();
  }
}

export async function confirmSaveDisciple(existingId) {
  const name = document.getElementById('f-disciple-name')?.value.trim() || '';
  const contact = document.getElementById('f-disciple-contact')?.value.trim() || '';
  const birthdate = document.getElementById('f-disciple-birthdate')?.value || '';
  const pastorId = +(document.getElementById('f-pastor-id')?.value || 0);

  if (!name) {
    showToast('Full name is required.', 'error');
    return;
  }

  if (!pastorId) {
    showToast('Please select a pastor.', 'error');
    return;
  }


  const btn = document.querySelector('.modal-footer .btn-primary');
  const originalHtml = btn ? btn.innerHTML : '';

  // Prevent UI Duplicates
  const duplicate = disciples.find(d => 
    d.full_name.toLowerCase() === name.toLowerCase() && 
    d.pastor_id === pastorId && 
    d.disciple_id !== existingId
  );
  if (duplicate) {
    showToast('A disciple with this exactly name already exists under this pastor.', 'error');
    return;
  }

  try {
    if (btn) {
      btn.disabled = true;
      btn.innerHTML = `${icon('loader', 'animate-spin')} Saving...`;
    }

    // Snapshot the mentor pastor's current church/district so the disciple
    // stays tied to this church even if the pastor later transfers, pulls
    // out, or passes away (the mentor link gets cleared, not the church).
    const activeAssign = (Array.isArray(churchAssignments) ? churchAssignments : []).find(a => a.pastor_id === pastorId && !a.end_date);

    const payload = {
      full_name: name,
      contact_number: contact || null,
      birth_date: birthdate || null,
      pastor_id: pastorId,
      church_id: activeAssign?.church_id ?? null,
      district_id: activeAssign?.district_id ?? null,
    };

    if (existingId) {
      const d = disciples.find(x => x.disciple_id === existingId);
      if (d) {
        const updated = await dbService.update('disciples', 'disciple_id', existingId, payload);
        Object.assign(d, updated);
      }
    } else {
      await dbService.create('disciples', payload);
    }

    showToast('Disciple saved successfully.', 'success');
    closeModal();
    if (document.getElementById('disciples-list')) updateDisciplesList();

  } catch (err) {
    console.error('[Disciples] Save failed:', err);
    showToast(`Failed to save disciple: ${err.message || 'Unknown error'}`, 'error');
  } finally {
    if (btn) {
      btn.disabled = false;
      btn.innerHTML = originalHtml;
    }
  }
}

export function viewChurchColumns(churchIds = null) {
  const ids = churchIds === null ? null : (Array.isArray(churchIds) ? churchIds : [churchIds]);
  const targets = ids === null ? churches : churches.filter(c => ids.includes(c.church_id));

  if (!targets.length) {
    showToast('No churches selected.', 'warning');
    return;
  }

  const columnsHtml = targets.map(church => {
    if (!church) return '';

    const activeAssign = (Array.isArray(churchAssignments) ? churchAssignments : [])
      .find(a => a.church_id === church.church_id && !a.end_date);

    const pastor = activeAssign
      ? (Array.isArray(pastors) ? pastors : []).find(p => p.pastor_id === activeAssign.pastor_id)
      : null;

    const pastorDisciples = pastor
      ? (Array.isArray(disciples) ? disciples : []).filter(d => d.pastor_id === pastor.pastor_id)
      : [];

    return `
      <div class="hierarchy-column" style="display: flex; flex-direction: column; gap: 20px; padding: 24px; border: 1px solid var(--border); border-radius: var(--radius-lg); background: var(--bg-elevated);">
        
        <div style="text-align: center; border-bottom: 2px solid var(--accent); padding-bottom: 12px;">
          <h3>${esc(church.church_name)}</h3>
        </div>

        <div style="text-align: center;">
          ${pastor ? esc(pastor.pastor_name) : 'No Pastor Assigned'}
        </div>

        <div>
          ${pastorDisciples.length
            ? pastorDisciples.map(d => `<div>${esc(d.full_name)}</div>`).join('')
            : '<div>No Disciples</div>'
          }
        </div>

      </div>
    `;
  }).join('');

  const modalContent = `
    <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); gap: 20px;">
      ${columnsHtml}
    </div>
  `;

  openModal(
    `${icon('layout')} Church Hierarchy`,
    modalContent,
    `<button class="btn btn-secondary" onclick="closeModal()">Close</button>`,
    'modal-full'
  );
}

export async function deleteRecordFromUI(id) {
    // legacy alias
    return deleteDisciple(id);
}

export async function deleteDisciple(id) {
  const d = (Array.isArray(disciples) ? disciples : []).find(x => x.disciple_id === id);
  if (!d) return;

  if (confirm(`Are you sure you want to delete disciple "${d.full_name}"?`)) {
    try {
      showToast(`Deleting "${d.full_name}"...`, 'info');
      
      const idx = disciples.findIndex(x => x.disciple_id === id);
      if (idx > -1) {
        await dbService.delete('disciples', 'disciple_id', id);
        disciples.splice(idx, 1);
        showToast('Disciple deleted successfully.', 'success');
        updateDisciplesList();
      }
    } catch (err) {
      console.error('[Disciples] Delete failed:', err);
      showToast(`Failed to delete: ${err.message}`, 'error');
    }
  }
}

window.renderDisciples = renderDisciples;
window.updateDisciplesList = updateDisciplesList;
window.openAddDiscipleModal = openAddDiscipleModal;
window.openEditDiscipleModal = openEditDiscipleModal;
window.openReassignDiscipleModal = openReassignDiscipleModal;
window.filterPastorOptions = filterPastorOptions;
window.selectPastor = selectPastor;
window.filterReassignPastorOptions = filterReassignPastorOptions;
window.selectReassignPastor = selectReassignPastor;
window.confirmReassignDisciple = confirmReassignDisciple;
window.confirmSaveDisciple = confirmSaveDisciple;
window.deleteDisciple = deleteDisciple;
window.getPastorColor = getPastorColor;
window.viewChurchColumns = viewChurchColumns;