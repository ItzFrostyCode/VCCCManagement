import { showToast } from '../../shared/components/toast.js';

// ============================================================
// Church Management System — Districts / Zones Module
// Hierarchy: District → Zone → Church
// ============================================================

import {
  districts,
  zones,
  churches,
  pastors,
  churchAssignments,
  getZonesForDistrict,
  getChurchesForZone,
  getUnzonedChurchesForDistrict
} from '../../core/state.js';

import { dbService } from '../../core/dbService.js';

import {
  icon,
  esc,
  pastorAvatar,
  assignmentBadge,
  emptyState,
  confirmDelete,
  debounce,
  hexToRgba
} from '../../shared/utils/helpers.js';

import { openModal, closeModal } from '../../shared/components/modal.js';

const TODAY = new Date().toISOString().split('T')[0];
const EXPANDED_DISTRICTS_KEY = 'churchms_expanded_districts';

// Initialize expanded state from storage
let expandedDistricts = new Set(JSON.parse(localStorage.getItem(EXPANDED_DISTRICTS_KEY) || '[]'));

function saveExpandedState() {
  localStorage.setItem(EXPANDED_DISTRICTS_KEY, JSON.stringify([...expandedDistricts]));
}

// ── Render Districts Page ─────────────────────────────────────
export function renderDistricts() {
  const content = document.getElementById('page-content');
  const actions = document.getElementById('topbar-actions');

  if (actions) {
    actions.innerHTML = `
      <button type="button" class="btn btn-primary" onclick="openAddDistrictModal()">${icon('plus')} <span>Add District</span></button>
    `;
  }

  if (!content) return;

  content.innerHTML = `
    <div class="fade-in px-2 sm:px-0">
      <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <h1 class="m-0 text-xl font-extrabold tracking-tight flex items-center gap-3">
          Districts
          <span style="font-size: 11px; font-weight: 700; color: var(--text-muted); padding: 2px 10px; background: var(--bg-elevated); border-radius: 20px; border: 1px solid var(--border); letter-spacing: normal;">
            Total Districts: ${districts.length}
          </span>
        </h1>
      </div>

      <div class="card p-4 mb-6 flex flex-col md:flex-row gap-4 items-stretch md:items-center">
        <div class="relative flex-1">
          <div class="absolute left-4 top-1/2 -translate-y-1/2 color-[var(--text-muted)]">
            ${icon('search', 'icon-sm')}
          </div>
          <input type="text" id="district-search"
                 style="padding-left: 44px;"
                 class="bg-[var(--bg-base)] border-transparent w-full"
                 placeholder="Search districts, zones, or stations…" oninput="filterDistricts()">
        </div>
        <div class="text-[11px] sm:text-xs font-bold text-[var(--text-muted)] uppercase tracking-wider flex items-center gap-2 px-2">
          ${icon('info', 'icon-xs')} Hierarchy: District → Area → Station
        </div>
      </div>

      <div id="districts-list"></div>
    </div>`;

  renderDistrictsList();
  lucide.createIcons();
}

function renderDistrictsList() {
  const search = (document.getElementById('district-search')?.value || '').toLowerCase();
  const container = document.getElementById('districts-list');
  if (!container) return;

  const distList = districts.filter(d =>
    !search ||
    d.district_name.toLowerCase().includes(search) ||
    zones.some(z => z.district_id === d.district_id && z.zone_name.toLowerCase().includes(search))
  );

  if (distList.length === 0) {
    container.innerHTML = emptyState(
      districts.length === 0 ? 'No Districts Yet' : 'No Results',
      districts.length === 0
        ? 'Create your first district to start organizing your churches.'
        : 'Try adjusting your search.',
      'map',
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

  const leaderObj = district.leader_pastor_id
    ? pastors.find(p => p.pastor_id === district.leader_pastor_id)
    : null;

  const isExpanded = expandedDistricts.has(district.district_id);
  const dColor = district.color || '#4f46e5';

  return `
    <div class="card" id="district-card-${district.district_id}" style="margin-bottom: 24px; padding: 0; overflow: hidden; border-top: 4px solid ${dColor};">
      <div onclick="toggleDistrictCard(${district.district_id})" class="district-header-row">
        <div style="flex: 1; min-width: 0;">
          <div style="display: flex; align-items: center; gap: 10px;">
            <div style="width: 12px; height: 12px; border-radius: 3px; background: ${dColor}; flex-shrink: 0; box-shadow: 0 0 0 3px ${hexToRgba(dColor, 0.15)};"></div>
            <div class="text-[16px] sm:text-[18px] font-extrabold text-[var(--text-primary)] tracking-tight truncate">${esc(district.district_name)}</div>
          </div>
          <div class="district-stats-label">
            <span style="white-space: nowrap;">${distZones.length} Areas</span>
            <span style="opacity: 0.3;">|</span>
            <span style="white-space: nowrap;">${totalChurches} Mission Stations</span>
          </div>
        </div>
        <div style="display: flex; align-items: center; gap: 8px; flex-shrink: 0; margin-left: 8px;">
          <button type="button" class="btn-icon-sm" style="background: transparent; border: 1px solid var(--border);" onclick="event.stopPropagation(); toggleDistrictEditMode(${district.district_id})">${icon('settings', 'icon-sm')}</button>
          <div style="transform: rotate(${isExpanded ? '180deg' : '0deg'}); transition: transform 0.3s cubic-bezier(0.4, 0, 0.2, 1); color: var(--text-muted);" id="chevron-${district.district_id}">${icon('chevron-down')}</div>
        </div>
      </div>

      <div id="district-body-${district.district_id}" class="district-body" style="display: ${isExpanded ? 'block' : 'none'};">
        <div class="edit-actions">
          <button type="button" class="btn btn-sm btn-secondary" onclick="openEditDistrictModal(${district.district_id})">${icon('pencil', 'icon-xs')} Rename</button>
          <button type="button" class="btn btn-sm btn-secondary hover:text-danger" onclick="deleteDistrict(${district.district_id})">${icon('trash-2', 'icon-xs')} Delete</button>
          <div style="flex: 1;"></div>
          <button type="button" class="btn btn-sm btn-primary" onclick="openAssignChurchToDistrictModal(${district.district_id})">${icon('link', 'icon-xs')} Assign Church</button>
          <button type="button" class="btn btn-sm btn-secondary" onclick="openAddChurchInDistrict(${district.district_id})">${icon('church', 'icon-xs')} New Church</button>
          <button type="button" class="btn btn-sm btn-secondary" onclick="openAddZoneModal(${district.district_id})">${icon('plus', 'icon-xs')} New Zone</button>
        </div>

        <div class="mb-3 sm:mb-4">
          <div class="leader-badge" style="border-left: 3px solid ${dColor};">
            ${
              leaderObj
                ? `
                  <div style="display: flex; align-items: center; gap: 12px; flex: 1; min-width: 0;">
                    ${pastorAvatar(leaderObj.pastor_name, leaderObj.image_url, 'md')}
                    <div style="min-width: 0;">
                      <div style="font-size: 11px; font-weight: 800; text-transform: uppercase; color: var(--accent); letter-spacing: 0.1em; margin-bottom: 2px;">District Leader</div>
                      <div style="font-weight: 800; font-size: 15px; color: var(--text-primary); white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">${esc(leaderObj.pastor_name)}</div>
                    </div>
                  </div>
                  <button title="Change Leader" class="btn-icon-sm" style="position: absolute; right: 8px; top: 8px; background: transparent; border: none; opacity: 0.5;" onclick="openAssignDistrictLeaderModal(${district.district_id}, 'main')">${icon('user-plus')}</button>
                `
                : `
                  <div style="display: flex; align-items: center; gap: 12px; opacity: 0.6; flex: 1; cursor: pointer;" onclick="openAssignDistrictLeaderModal(${district.district_id}, 'main')">
                    <div style="width: 44px; height: 44px; border-radius: 50%; background: var(--bg-base); border: 2px dashed var(--border); display: flex; align-items: center; justify-content: center; color: var(--text-muted); flex-shrink: 0;">${icon('user-plus')}</div>
                    <div>
                      <div style="font-size: 11px; font-weight: 800; text-transform: uppercase; color: var(--text-muted); letter-spacing: 0.1em;">Overseer Vacant</div>
                      <div style="font-weight: 600; font-size: 14px; text-decoration: underline;">Assign Pastor</div>
                    </div>
                  </div>
                `
            }
          </div>
        </div>

        ${
          unzonedChurches.length > 0
            ? `
              <div class="mb-3 sm:mb-4">
                <div style="font-size: 11px; font-weight: 800; color: var(--warning); text-transform: uppercase; letter-spacing: 0.1em; margin-bottom: 8px; display: flex; align-items: center; gap: 8px;">
                  ${icon('alert-triangle', 'icon-xs')} Unzoned Mission Stations
                </div>
                <div class="unzoned-pool" data-district="${district.district_id}" style="border: 2px dashed var(--warning); border-radius: var(--radius-lg); padding: 12px; background: var(--warning-dim);">
                  ${unzonedChurches.map(c => renderChurchDraggable(c, district.color)).join('')}
                </div>
              </div>
            `
            : ''
        }

        <div class="flex flex-col gap-2 sm:gap-3">
          ${
            distZones.length === 0 && unzonedChurches.length === 0
              ? `
                <div style="text-align: center; padding: 48px; background: var(--bg-elevated); border: 1px dashed var(--border); border-radius: var(--radius-xl);">
                  <div style="color: var(--text-muted); margin-bottom: 16px;">${icon('church', 'icon-lg', 'opacity: 0.3')}</div>
                  <div style="font-weight: 700; color: var(--text-secondary);">This district is empty</div>
                  <button class="btn btn-sm btn-primary" style="margin-top: 16px;" onclick="openAssignChurchToDistrictModal(${district.district_id})">${icon('link', 'icon-xs')} Assign Church</button>
                </div>
              `
              : distZones.map(z => renderZoneCard(z)).join('')
          }
        </div>
      </div>
    </div>
  `;
}

// ── Toggle Scripts ────────────────────────────────────────────
window.toggleDistrictCard = function (id) {
  const body = document.getElementById(`district-body-${id}`);
  const chev = document.getElementById(`chevron-${id}`);

  if (body) {
    const isHidden = body.style.display === 'none';
    body.style.display = isHidden ? 'block' : 'none';
    if (chev) chev.style.transform = isHidden ? 'rotate(180deg)' : 'rotate(0deg)';

    if (isHidden) expandedDistricts.add(id);
    else expandedDistricts.delete(id);

    saveExpandedState();
  }
};

window.toggleDistrictEditMode = function (id) {
  const card = document.getElementById(`district-card-${id}`);
  const body = document.getElementById(`district-body-${id}`);
  const chev = document.getElementById(`chevron-${id}`);

  if (body && body.style.display === 'none') {
    body.style.display = 'block';
    if (chev) chev.style.transform = 'rotate(180deg)';
    expandedDistricts.add(id);
    saveExpandedState();
  }

  if (card) {
    card.classList.toggle('editing');
  }
};

function renderChurchDraggable(c, dColor) {
  const activeAssign = churchAssignments.find(a => a.church_id === c.church_id && !a.end_date);
  const pastor = activeAssign ? pastors.find(p => p.pastor_id === activeAssign.pastor_id) : null;

  return `
    <div class="church-row-responsive draggable-church cursor-grab" draggable="true" data-church-id="${c.church_id}">
      <div class="flex items-center gap-4 w-full sm:w-auto">
        <div style="color: var(--text-muted); opacity: 0.5;">${icon('grip-vertical', 'icon-xs')}</div>
        <div class="church-info">
          <div style="font-weight: 700; font-size: 14px; color: var(--text-primary);">${esc(c.church_name)}</div>
          ${c.church_address ? `<div style="font-size: 11px; color: var(--text-muted); display: flex; align-items: center; gap: 4px; margin-top: 2px;">${icon('map-pin', 'icon-xs')} ${esc(c.church_address)}</div>` : ''}
        </div>
      </div>
      <div class="church-pastor-info">
        ${
          pastor
            ? `
              <div style="display: flex; align-items: center; gap: 8px; flex: 1; min-width: 0;">
                ${pastorAvatar(pastor.pastor_name, pastor.image_url, 'xs')}
                <div style="font-size: 13px; font-weight: 600; color: var(--text-secondary); white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">${esc(pastor.pastor_name)}</div>
              </div>
              ${assignmentBadge(activeAssign.assignment_type_code)}
            `
            : `
              <span style="font-size: 10px; font-weight: 800; background: var(--danger-dim); color: var(--danger); padding: 2px 8px; border-radius: 10px; text-transform: uppercase;">Vacant</span>
            `
        }
      </div>
      <div style="display: flex; gap: 4px; margin-left: auto;">
        ${!pastor ? `<button class="btn btn-icon-sm" style="border: none; background: var(--accent-dim); color: var(--accent);" onclick="openAssignPastorToChurch(${c.church_id})">${icon('user-plus')}</button>` : ''}
        <button class="btn btn-icon-sm" style="border: none; background: var(--bg-elevated);" onclick="openEditChurchInDistrict(${c.church_id})">${icon('pencil')}</button>
        <button class="btn btn-icon-sm hover:text-danger" style="border: none; background: var(--bg-elevated);" onclick="deleteChurchFromDistrict(${c.church_id})">${icon('trash-2')}</button>
      </div>
    </div>
  `;
}

function renderChurchRow(c) {
  const activeAssign = churchAssignments.find(a => a.church_id === c.church_id && !a.end_date);
  const pastor = activeAssign ? pastors.find(p => p.pastor_id === activeAssign.pastor_id) : null;

  return `
    <div class="church-row-responsive draggable-church cursor-grab" draggable="true" data-church-id="${c.church_id}">
      <div class="flex items-center gap-4 w-full sm:w-auto">
        <div style="color: var(--text-muted); opacity: 0.3;">${icon('grip-vertical', 'icon-xs')}</div>
        <div class="church-info">
          <div style="font-weight: 700; font-size: 13px; color: var(--text-primary); text-overflow: ellipsis; white-space: nowrap; overflow: hidden;">${esc(c.church_name)}</div>
        </div>
      </div>
      <div class="church-pastor-info">
        ${
          pastor
            ? `
              <div style="display: flex; align-items: center; gap: 8px; flex: 1; min-width: 0;">
                ${pastorAvatar(pastor.pastor_name, pastor.image_url, 'xs')}
                <div style="font-size: 12px; font-weight: 600; color: var(--text-secondary); text-overflow: ellipsis; white-space: nowrap; overflow: hidden; flex: 1;">${esc(pastor.pastor_name)}</div>
              </div>
            `
            : `
              <span style="font-size: 10px; font-weight: 800; background: var(--danger-dim); color: var(--danger); padding: 1px 6px; border-radius: 4px; text-transform: uppercase;">Vacant</span>
            `
        }
      </div>
      <div style="display: flex; gap: 4px; margin-left: auto;">
        ${!pastor ? `<button title="Assign Pastor" class="btn-icon-sm" style="border: none; background: var(--accent-dim); color: var(--accent);" onclick="openAssignPastorToChurch(${c.church_id})">${icon('user-plus')}</button>` : ''}
        <button title="Edit" class="btn-icon-sm" style="border: none; background: var(--bg-elevated);" onclick="openEditChurchInDistrict(${c.church_id})">${icon('pencil')}</button>
        <button title="Delete" class="btn-icon-sm hover:text-danger" style="border: none; background: var(--bg-elevated);" onclick="deleteChurchFromDistrict(${c.church_id})">${icon('trash-2')}</button>
      </div>
    </div>
  `;
}

function renderZoneCard(z) {
  const zoneChurches = getChurchesForZone(z.zone_id);
  const total = zoneChurches.length;
  const filled = zoneChurches.filter(c => churchAssignments.some(a => a.church_id === c.church_id && !a.end_date)).length;
  const percent = total > 0 ? (filled / total) * 100 : 0;
  const vacantCount = total - filled;

  const d = districts.find(x => x.district_id === z.district_id);
  const dColor = d?.color || '#4f46e5';

  return `
    <div style="margin-left: 16px; background: var(--bg-elevated); border: 1px solid var(--border); border-left: 3px solid ${hexToRgba(dColor, 0.5)}; border-radius: var(--radius-lg); overflow: hidden;">
      <div onclick="toggleCollapse('zone-${z.zone_id}')" class="flex items-start gap-3 sm:gap-4 cursor-pointer bg-white p-3">
        <div style="flex: 1;">
          <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 6px;">
            <div style="display: flex; align-items: center; gap: 8px;">
              <div style="width: 6px; height: 6px; border-radius: 50%; background: ${dColor};"></div>
              <div style="font-weight: 700; font-size: 13px; color: var(--text-primary);">${esc(z.zone_name)}</div>
            </div>
            <div style="font-size: 11px; font-weight: 700; color: ${percent === 100 ? 'var(--success)' : 'var(--text-muted)'}; display: flex; align-items: center; gap: 4px;">
              ${percent === 100 ? icon('check-circle', 'icon-xs') : ''}
              ${Math.round(percent)}% Deployment
            </div>
          </div>

          <div style="height: 4px; background: var(--bg-base); border-radius: 2px; overflow: hidden;">
            <div style="height: 100%; background: ${percent === 100 ? 'var(--success)' : dColor}; width: ${percent}%; border-radius: 2px; transition: width 1s ease-out;"></div>
          </div>

          <div style="display: flex; justify-content: space-between; margin-top: 6px;">
            <div style="font-size: 11px; font-weight: 600; color: var(--text-muted);">${filled} / ${total} Stations Assigned</div>
            ${vacantCount > 0 ? `<div style="font-size: 11px; font-weight: 700; color: var(--danger);">${vacantCount} vacant</div>` : ''}
          </div>
        </div>

        <div style="display: flex; gap: 6px; align-items: center;" onclick="event.stopPropagation()">
          <button class="btn btn-icon-sm" style="border: none; background: var(--bg-base);" onclick="openAddChurchInZone(${z.zone_id})">${icon('plus')}</button>
          <button class="btn btn-icon-sm" style="border: none; background: var(--bg-base);" onclick="editZone(${z.zone_id})">${icon('pencil')}</button>
          <button class="btn btn-icon-sm hover:text-danger" style="border: none; background: var(--bg-base);" onclick="deleteZone(${z.zone_id})">${icon('trash-2')}</button>
          <div style="margin-left: 4px; color: var(--text-muted);">${icon('chevron-down', 'icon-sm')}</div>
        </div>
      </div>

      <div id="zone-${z.zone_id}" class="drop-zone" data-zone-id="${z.zone_id}" style="padding: 8px; border-top: 1px dashed var(--border);">
        ${
          zoneChurches.length === 0
            ? `
              <div style="text-align: center; padding: 20px; color: var(--text-muted); font-size: 13px; font-style: italic; border: 2px dashed var(--border); border-radius: var(--radius-lg); margin: 4px;">
                ${icon('info', 'icon-xs', 'margin-bottom: 8px')}
                <div>Drop stations here to assign to this area</div>
              </div>
            `
            : zoneChurches.map(c => renderChurchRow(c)).join('')
        }
      </div>
    </div>
  `;
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

    zone.addEventListener('drop', async e => {
      e.preventDefault();
      zone.classList.remove('drag-over');
      if (!draggedChurchId) return;

      const zoneId = +zone.dataset.zoneId;
      const church = churches.find(c => c.church_id === draggedChurchId);
      if (!church) return;

      const z = zones.find(zn => zn.zone_id === zoneId);
      if (!z) return;

      try {
        await dbService.update('churches', 'church_id', church.church_id, { zone_id: zoneId, district_id: z.district_id });
        church.zone_id = zoneId;
        church.district_id = z.district_id;
        showToast(`"${church.church_name}" moved to ${z.zone_name}.`, 'success');
        renderDistrictsList();
      } catch (err) {
        showToast('Failed to update church zone.', 'error');
      }
    });
  });

  document.querySelectorAll('.unzoned-pool').forEach(pool => {
    pool.addEventListener('dragover', e => {
      e.preventDefault();
      pool.classList.add('drag-over');
    });

    pool.addEventListener('dragleave', () => pool.classList.remove('drag-over'));

    pool.addEventListener('drop', async e => {
      e.preventDefault();
      pool.classList.remove('drag-over');
      if (!draggedChurchId) return;

      const districtId = +pool.dataset.district;
      const church = churches.find(c => c.church_id === draggedChurchId);
      if (!church) return;

      try {
        await dbService.update('churches', 'church_id', church.church_id, { zone_id: null, district_id: districtId });
        church.zone_id = null;
        church.district_id = districtId;
        showToast(`"${church.church_name}" removed from zone.`, 'info');
        renderDistrictsList();
      } catch (err) {
        showToast('Failed to remove church from zone.', 'error');
      }
    });
  });
}

// ── Collapse Toggle ───────────────────────────────────────────
window.toggleCollapse = function (id) {
  const el = document.getElementById(id);
  if (el) el.style.display = el.style.display === 'none' ? '' : 'none';
};

// ── District CRUD ─────────────────────────────────────────────
window.openAddDistrictModal = function () {
  openModal(
    `${icon('map')} Add District`,
    buildDistrictForm(),
    `<button class="btn btn-secondary" onclick="closeModal()">${icon('x')} Cancel</button>
     <button class="btn btn-primary" onclick="saveDistrict()">${icon('save')} Save</button>`
  );
};

window.openEditDistrictModal = function (id) {
  const d = districts.find(x => x.district_id === id);
  if (!d) return;

  openModal(
    `${icon('pencil')} Edit District`,
    buildDistrictForm(d),
    `<button class="btn btn-secondary" onclick="closeModal()">${icon('x')} Cancel</button>
     <button class="btn btn-primary" onclick="saveDistrict(${id})">${icon('save')} Save Changes</button>`
  );
};

window.filterDistrictLeaderOptions = function (inputId, optionsId) {
  const query = document.getElementById(inputId)?.value.toLowerCase() || '';
  const optionsContainer = document.getElementById(optionsId);
  if (!optionsContainer) return;

  const filtered = pastors.filter(
    p =>
      (p.status_code !== 'pullout' && p.status_code !== 'suspended') &&
      p.pastor_name.toLowerCase().includes(query)
  );

  if (filtered.length === 0) {
    optionsContainer.innerHTML = `<div style="padding: 12px; color: var(--text-muted); font-size: 13px; text-align: center;">No pastors found matching "${esc(query)}"</div>`;
  } else {
    optionsContainer.innerHTML = filtered
      .map(
        p => `
          <div class="search-select-option" onclick="selectDistrictLeader('${inputId}', '${optionsId}', ${p.pastor_id}, '${esc(p.pastor_name).replace(/'/g, "\\'")}')">
            ${pastorAvatar(p.pastor_name, p.image_url, 'xs')}
            <div style="font-weight: 700;">${esc(p.pastor_name)}</div>
          </div>
        `
      )
      .join('');
  }

  optionsContainer.classList.add('open');
};

window.selectDistrictLeader = function (inputId, optionsId, id, name) {
  const input = document.getElementById(inputId);
  const hiddenId = inputId === 'add-leader-search' ? 'f-add-leader' : 'f-assign-leader';
  const hidden = document.getElementById(hiddenId);
  const options = document.getElementById(optionsId);

  if (input) input.value = name;
  if (hidden) hidden.value = id;
  if (options) options.classList.remove('open');
};

function buildDistrictForm(d = {}) {
  const leaderPastor = d.leader_pastor_id ? pastors.find(p => p.pastor_id === d.leader_pastor_id) : null;

  return `
    <div class="form-grid cols-1">
      <div class="form-group span-2">
        <label>District Name *</label>
        <div style="position: relative;">
          <div style="position: absolute; left: 12px; top: 50%; transform: translateY(-50%); color: var(--accent);">
            ${icon('map', 'icon-sm')}
          </div>
          <input type="text" id="f-dist-name" style="padding-left: 40px;" placeholder="e.g. District 1, Palawan" value="${esc(d.district_name || '')}">
        </div>
      </div>

      <div class="form-group">
        <label>District Leader (Overseer) *</label>
        <div class="search-select-wrapper">
          <div style="position: relative;">
            <div style="position: absolute; left: 12px; top: 50%; transform: translateY(-50%); color: var(--accent);">
              ${icon('user', 'icon-sm')}
            </div>
            <input type="text" id="add-leader-search"
              class="search-select-input"
              placeholder="Search pastor by name..."
              value="${esc(leaderPastor?.pastor_name || '')}"
              autocomplete="off"
              onfocus="filterDistrictLeaderOptions('add-leader-search', 'add-leader-options')"
              oninput="filterDistrictLeaderOptions('add-leader-search', 'add-leader-options')"
              onblur="setTimeout(() => { document.getElementById('add-leader-options')?.classList.remove('open'); }, 200)">
            <input type="hidden" id="f-add-leader" value="${d.leader_pastor_id || ''}">
          </div>
          <div id="add-leader-options" class="search-select-options"></div>
        </div>
      </div>

      <div class="form-group span-2">
        <label>District Theme Color</label>
        <div style="display: flex; align-items: center; gap: 16px; padding: 12px; background: var(--bg-elevated); border: 1px solid var(--border); border-radius: var(--radius-lg);">
          <input type="color" id="f-dist-color" value="${esc(d.color || '#4f46e5')}" style="width: 44px; height: 44px; border: none; border-radius: 8px; cursor: pointer; padding: 0; background: none;">
          <div>
            <div style="font-size: 13px; font-weight: 700; color: var(--text-primary);">Accent Color</div>
            <div style="font-size: 11px; color: var(--text-muted);">This color will represent this district across the system.</div>
          </div>
        </div>
      </div>

      <div class="form-group span-2">
        <label>District Notes</label>
        <textarea id="f-dist-notes" rows="3" placeholder="Additional details or history...">${esc(d.notes || '')}</textarea>
      </div>
    </div>
  `;
}

window.saveDistrict = async function (id = null) {
  const name = document.getElementById('f-dist-name')?.value.trim();
  const color = document.getElementById('f-dist-color')?.value || '#4f46e5';
  const leader = +document.getElementById('f-add-leader')?.value || null;
  const notes = document.getElementById('f-dist-notes')?.value.trim();

  if (!name) {
    showToast('District name is required.', 'error');
    return;
  }

  if (!leader) {
    showToast('District Leader is required.', 'error');
    return;
  }

  const isDuplicate = districts.some(
    d => d.district_id !== id && d.district_name.toLowerCase() === name.toLowerCase()
  );

  if (isDuplicate) {
    showToast(`A district named "${name}" already exists.`, 'error');
    return;
  }

  const payload = {
    district_name: name,
    color,
    leader_pastor_id: leader,
    notes: notes || null
  };

  const btn = document.querySelector('.modal-footer .btn-primary');
  const originalHtml = btn ? btn.innerHTML : '';

  try {
    if (btn) {
      btn.disabled = true;
      btn.innerHTML = `${icon('loader', 'animate-spin')} Saving...`;
    }

    if (id) {
      const updated = await dbService.update('districts', 'district_id', id, payload);
      const d = districts.find(x => x.district_id === id);
      if (d) Object.assign(d, updated);
      showToast('District updated.', 'success');
    } else {
      await dbService.create('districts', payload);
      showToast('District added.', 'success');
    }

    closeModal();
    renderDistricts();
  } catch (err) {
    console.error('[Districts] Save failed:', err);
    showToast(`Failed to save district: ${err.message || 'Unknown error'}`, 'error');
  } finally {
    if (btn) {
      btn.disabled = false;
      btn.innerHTML = originalHtml;
    }
  }
};

window.deleteDistrict = function (id) {
  const d = districts.find(x => x.district_id === id);
  if (!d) return;

  confirmDelete(d.district_name, async () => {
    try {
      showToast(`Deleting District "${d.district_name}"...`, 'info');

      // 1. Delete all churches (and their assignments) in this district
      const distChurches = churches.filter(c => c.district_id === id);
      for (const c of distChurches) {
        await dbService.delete('churches', 'church_id', c.church_id);
      }

      // 2. Delete all zones in this district
      const distZones = zones.filter(z => z.district_id === id);
      if (distZones.length > 0) {
        for (const z of distZones) {
          await dbService.delete('zones', 'zone_id', z.zone_id);
        }
      }

      // 3. Delete District itself
      await dbService.delete('districts', 'district_id', id);

      // Now update local state Optimistically
      for (const c of distChurches) {
          const idx = churches.findIndex(x => x.church_id === c.church_id);
          if (idx > -1) churches.splice(idx, 1);
      }
      for (const z of distZones) {
          const idx = zones.findIndex(x => x.zone_id === z.zone_id);
          if (idx > -1) zones.splice(idx, 1);
      }
      const idx = districts.findIndex(x => x.district_id === id);
      if (idx > -1) districts.splice(idx, 1);

      showToast(`District "${d.district_name}" and its hierarchy deleted.`, 'success');
      renderDistricts();
    } catch (err) {
      console.error('[Districts] Delete failed:', err);
      showToast(`Delete failed: ${err.message}`, 'error');
    }
  });
};

// ── Assign District Leader Modal ──────────────────────────────
window.openAssignDistrictLeaderModal = function (districtId, role) {
  const d = districts.find(x => x.district_id === districtId);
  if (!d) return;

  const leaderPastor = d.leader_pastor_id ? pastors.find(p => p.pastor_id === d.leader_pastor_id) : null;
  const roleLabel = 'District Leader';

  openModal(
    `${icon('user-plus')} Assign ${roleLabel}`,
    `
      <div class="form-grid cols-1">
        <div class="form-group">
          <label>${icon('user', 'icon-xs')} ${roleLabel}</label>
          <div class="search-select-wrapper">
            <div style="position: relative;">
              <div style="position: absolute; left: 12px; top: 50%; transform: translateY(-50%); color: var(--accent);">
                ${icon('user', 'icon-sm')}
              </div>
              <input type="text" id="assign-leader-search"
                class="search-select-input"
                value="${esc(leaderPastor?.pastor_name || '')}"
                autocomplete="off"
                style="padding-left: 40px;"
                onfocus="filterDistrictLeaderOptions('assign-leader-search', 'assign-leader-options')"
                oninput="filterDistrictLeaderOptions('assign-leader-search', 'assign-leader-options')"
                onblur="setTimeout(() => { document.getElementById('assign-leader-options')?.classList.remove('open'); }, 200)">
              <input type="hidden" id="f-assign-leader" value="${d.leader_pastor_id || ''}">
            </div>
            <div id="assign-leader-options" class="search-select-options"></div>
          </div>
        </div>
      </div>
    `,
    `<button class="btn btn-secondary" onclick="closeModal()">${icon('x')} Cancel</button>
     <button class="btn btn-primary" onclick="saveDistrictLeader(${districtId}, '${role}')">${icon('save')} Save</button>`
  );
};

window.saveDistrictLeader = async function (districtId, role) {
  const d = districts.find(x => x.district_id === districtId);
  if (!d) return;

  const pastorId = +document.getElementById('f-assign-leader')?.value || null;

  const btn = document.querySelector('.modal-footer .btn-primary');
  const originalHtml = btn ? btn.innerHTML : '';

  try {
    if (btn) {
      btn.disabled = true;
      btn.innerHTML = `${icon('loader', 'animate-spin')} Updating...`;
    }

    await dbService.update('districts', 'district_id', d.district_id, { leader_pastor_id: pastorId });
    d.leader_pastor_id = pastorId;
    
    showToast('Leader updated.', 'success');
    closeModal();
    renderDistricts();
  } catch (err) {
    console.error('[Districts] Save leader failed:', err);
    showToast(`Failed to save leader: ${err.message || 'Unknown error'}`, 'error');
  } finally {
    if (btn) {
      btn.disabled = false;
      btn.innerHTML = originalHtml;
    }
  }
};

// ── Zone CRUD ─────────────────────────────────────────────────
window.openAddZoneModal = function (districtId) {
  openModal(
    `${icon('layers')} Add Zone`,
    buildZoneForm(districtId),
    `<button class="btn btn-secondary" onclick="closeModal()">${icon('x')} Cancel</button>
     <button class="btn btn-primary" onclick="saveZone(null,${districtId})">${icon('save')} Save</button>`
  );
};

window.editZone = function (id) {
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

  return `
    <div class="form-grid">
      <div class="form-group span-2">
        <label>Parent District</label>
        <div style="display: flex; align-items: center; gap: 8px; padding: 10px 14px; background: var(--bg-elevated); border: 1px solid var(--border); border-radius: var(--radius-md); color: var(--text-muted); font-weight: 600;">
          <div style="width: 8px; height: 8px; border-radius: 50%; background: ${district?.color || 'var(--accent)'};"></div>
          ${esc(district?.district_name || 'No District')}
        </div>
      </div>

      <div class="form-group span-2">
        <label>Zone Name *</label>
        <div style="position: relative;">
          <div style="position: absolute; left: 12px; top: 50%; transform: translateY(-50%); color: var(--accent);">
            ${icon('layers', 'icon-sm')}
          </div>
          <input type="text" id="f-zone-name" style="padding-left: 40px;" placeholder="e.g. Zone A, North Sector" value="${esc(z.zone_name || '')}">
        </div>
      </div>

      <div class="form-group span-2">
        <label>Zone Notes</label>
        <textarea id="f-zone-notes" rows="3" placeholder="Additional details...">${esc(z.notes || '')}</textarea>
      </div>
    </div>
  `;
}

window.saveZone = async function (id, districtId) {
  const name = document.getElementById('f-zone-name')?.value.trim();
  const notes = document.getElementById('f-zone-notes')?.value.trim();

  if (!name) {
    showToast('Zone name is required.', 'error');
    return;
  }

  const isDuplicate = zones.some(
    z => z.zone_id !== id && z.district_id === districtId && z.zone_name.toLowerCase() === name.toLowerCase()
  );

  if (isDuplicate) {
    showToast(`A zone named "${name}" already exists in this district.`, 'error');
    return;
  }

  const payload = {
    district_id: districtId,
    zone_name: name,
    notes: notes || null
  };

  const btn = document.querySelector('.modal-footer .btn-primary');
  const originalHtml = btn ? btn.innerHTML : '';

  try {
    if (btn) {
      btn.disabled = true;
      btn.innerHTML = `${icon('loader', 'animate-spin')} Syncing to Cloud...`;
    }

    if (id) {
      const updated = await dbService.update('zones', 'zone_id', id, payload);
      const z = zones.find(x => x.zone_id === id);
      if (z) Object.assign(z, updated);
      showToast(`Zone "${name}" updated.`, 'success');
    } else {
      await dbService.create('zones', payload);
      showToast(`Zone "${name}" created.`, 'success');
    }

    closeModal();
    renderDistricts();
  } catch (err) {
    console.error('[Districts] Zone save failed:', err);
    showToast(`Failed to save zone: ${err.message || 'Unknown error'}`, 'error');
  } finally {
    if (btn) {
      btn.disabled = false;
      btn.innerHTML = originalHtml;
    }
  }
};

window.deleteZone = function (id) {
  const z = zones.find(x => x.zone_id === id);
  if (!z) return;

  confirmDelete(`Zone ${z.zone_name} and all of its churches`, async () => {
    try {
      showToast(`Deleting Zone "${z.zone_name}"...`, 'info');

      // 1. Delete all churches in this zone
      const churchesInZone = churches.filter(c => c.zone_id === id);
      for (const c of churchesInZone) {
        await dbService.delete('churches', 'church_id', c.church_id);
      }

      // 2. Delete Zone from Supabase
      await dbService.delete('zones', 'zone_id', id);

      // 3. Remove from local state
      for (const c of churchesInZone) {
          const idx = churches.findIndex(x => x.church_id === c.church_id);
          if (idx > -1) churches.splice(idx, 1);
      }
      
      const idx = zones.findIndex(zn => zn.zone_id === id);
      if (idx > -1) zones.splice(idx, 1);

      showToast(`Zone "${z.zone_name}" and its churches deleted from cloud.`, 'success');
      renderDistricts();
    } catch (err) {
      console.error('[Zones] Delete failed:', err);
      showToast(`Delete failed: ${err.message}`, 'error');
    }
  });
};

// ── Church in District/Zone Helpers ──────────────────────────
window.openAssignChurchToDistrictModal = function (districtId) {
  const d = districts.find(x => x.district_id === districtId);
  if (!d) return;

  const unassigned = churches.filter(c => !c.district_id);

  if (unassigned.length === 0) {
    showToast('There are no unassigned churches available. Please create a new one.', 'info');
    return;
  }

  openModal(
    `${icon('link')} Assign Existing Church to ${esc(d.district_name)}`,
    `
      <div class="form-grid">
        <div class="form-group span-2">
          <label>Select an Unassigned Mission Station</label>
          <div class="search-select-wrapper">
            <div style="position: relative;">
              <div style="position: absolute; left: 12px; top: 50%; transform: translateY(-50%); color: var(--accent);">
                ${icon('search', 'icon-sm')}
              </div>
              <input type="text" id="assign-existing-church-search"
                class="search-select-input"
                placeholder="Search unassigned churches..."
                autocomplete="off"
                style="padding-left: 40px;"
                onfocus="filterAssignChurchToDistrictOptions()"
                oninput="filterAssignChurchToDistrictOptions()"
                onblur="setTimeout(() => { document.getElementById('assign-existing-church-options')?.classList.remove('open'); }, 200)">
              <input type="hidden" id="f-assign-existing-church" value="">
            </div>
            <div id="assign-existing-church-options" class="search-select-options"></div>
          </div>
        </div>
        <div class="form-group span-2" style="font-size: 13px; color: var(--text-muted); margin-top: 8px;">
          ${icon('info', 'icon-xs')} The selected church will be added to this district without a specific zone allocation. It will appear under "Unzoned Mission Stations".
        </div>
      </div>
    `,
    `<button class="btn btn-secondary" onclick="closeModal()">${icon('x')} Cancel</button>
     <button class="btn btn-primary" onclick="confirmAssignExistingChurch(${districtId})">${icon('save')} Assign Church</button>`,
    'modal-lg'
  );
};

window.confirmAssignExistingChurch = async function (districtId) {
  const churchId = +document.getElementById('f-assign-existing-church')?.value || null;

  if (!churchId) {
    showToast('Please select a church.', 'error');
    return;
  }

  const c = churches.find(x => x.church_id === churchId);
  if (!c) return;

  const btn = document.querySelector('.modal-footer .btn-primary');
  const originalHtml = btn ? btn.innerHTML : '';

  try {
    if (btn) {
      btn.disabled = true;
      btn.innerHTML = `${icon('loader', 'animate-spin')} Assigning...`;
    }

    await dbService.update('churches', 'church_id', churchId, { district_id: districtId, zone_id: null });
    c.district_id = districtId;
    c.zone_id = null;

    showToast(`"${c.church_name}" assigned to district.`, 'success');
    closeModal();
    renderDistricts();
  } catch (err) {
    console.error('[Districts] Church assignment failed:', err);
    showToast(`Failed to assign church: ${err.message || 'Unknown error'}`, 'error');
  } finally {
    if (btn) {
      btn.disabled = false;
      btn.innerHTML = originalHtml;
    }
  }
};

window.openAddChurchInDistrict = function (districtId) {
  const d = districts.find(x => x.district_id === districtId);

  openModal(
    `${icon('church')} Add Church — ${esc(d?.district_name || '')}`,
    `
      <div class="form-grid">
        <div class="form-group span-2">
          <label>Church Name *</label>
          <div style="position: relative;">
            <div style="position: absolute; left: 12px; top: 50%; transform: translateY(-50%); color: var(--accent);">
              ${icon('church', 'icon-sm')}
            </div>
            <input type="text" id="f-hch-name" style="padding-left: 40px;" placeholder="Full name of the church" value="">
          </div>
        </div>
        <div class="form-group span-2">
          <label>Church Address</label>
          <textarea id="f-hch-address" rows="2" placeholder="Street, Barangay, City/Province"></textarea>
        </div>
        <div class="form-group span-2">
          <label>Operational Notes</label>
          <textarea id="f-hch-notes" rows="3" placeholder="Additional details or history..."></textarea>
        </div>
      </div>
    `,
    `<button class="btn btn-secondary" onclick="closeModal()">${icon('x')} Cancel</button>
     <button class="btn btn-primary" onclick="saveChurchInDistrict(${districtId}, null)">${icon('save')} Save Church</button>`,
    'modal-lg'
  );
};

window.openAddChurchInZone = function (zoneId) {
  const z = zones.find(x => x.zone_id === zoneId);
  const d = z ? districts.find(x => x.district_id === z.district_id) : null;

  openModal(
    `${icon('church')} Add Church — ${esc(z?.zone_name || '')}`,
    `
      <div style="display: flex; align-items: center; gap: 12px; padding: 12px 16px; background: var(--bg-elevated); border: 1px solid var(--border); border-radius: var(--radius-lg); margin-bottom: 24px;">
        <div style="width: 32px; height: 32px; background: ${d?.color || 'var(--accent)'}; border-radius: 8px; display: flex; align-items: center; justify-content: center; color: #fff;">
          ${icon('layers', 'icon-sm')}
        </div>
        <div>
          <div style="font-size: 13px; font-weight: 800; color: var(--text-primary);">${esc(z?.zone_name || 'Area')}</div>
          <div style="font-size: 11px; font-weight: 600; color: var(--text-muted);">${esc(d?.district_name || 'District')}</div>
        </div>
      </div>

      <div class="form-grid">
        <div class="form-group span-2">
          <label>Church Name *</label>
          <div style="position: relative;">
            <div style="position: absolute; left: 12px; top: 50%; transform: translateY(-50%); color: var(--accent);">
              ${icon('church', 'icon-sm')}
            </div>
            <input type="text" id="f-hch-name" style="padding-left: 40px;" placeholder="Full name of the church" value="">
          </div>
        </div>
        <div class="form-group span-2">
          <label>Church Address</label>
          <textarea id="f-hch-address" rows="2" placeholder="Street, Barangay, City/Province"></textarea>
        </div>
        <div class="form-group span-2">
          <label>Operational Notes</label>
          <textarea id="f-hch-notes" rows="3" placeholder="Additional details or history..."></textarea>
        </div>
      </div>
    `,
    `<button class="btn btn-secondary" onclick="closeModal()">${icon('x')} Cancel</button>
     <button class="btn btn-primary" onclick="saveChurchInDistrict(${z?.district_id || 'null'}, ${zoneId})">${icon('save')} Save Church</button>`,
    'modal-lg'
  );
};

window.saveChurchInDistrict = async function (districtId, zoneId) {
  const name = document.getElementById('f-hch-name')?.value.trim();
  const address = document.getElementById('f-hch-address')?.value.trim();
  const notes = document.getElementById('f-hch-notes')?.value.trim();

  if (!name) {
    showToast('Church name is required.', 'error');
    return;
  }

  const payload = {
    church_name: name,
    church_address: address || null,
    district_id: districtId || null,
    zone_id: zoneId || null,
    is_international: false,
    notes: notes || null
  };

  const btn = document.querySelector('.modal-footer .btn-primary');
  const originalHtml = btn ? btn.innerHTML : '';

  try {
    if (btn) {
      btn.disabled = true;
      btn.innerHTML = `${icon('loader', 'animate-spin')} Saving...`;
    }

    await dbService.create('churches', payload);

    showToast(`"${name}" added.`, 'success');
    closeModal();
    renderDistricts();
  } catch (err) {
    console.error('[Districts] Church save failed:', err);
    showToast(`Failed to save church: ${err.message || 'Unknown error'}`, 'error');
  } finally {
    if (btn) {
      btn.disabled = false;
      btn.innerHTML = originalHtml;
    }
  }
};

window.openEditChurchInDistrict = function (churchId) {
  const c = churches.find(x => x.church_id === churchId);
  if (!c) return;

  openModal(
    `${icon('pencil')} Edit Church`,
    `
      <div class="form-grid">
        <div class="form-group span-2">
          <label>Church Name *</label>
          <div style="position: relative;">
            <div style="position: absolute; left: 12px; top: 50%; transform: translateY(-50%); color: var(--accent);">
              ${icon('church', 'icon-sm')}
            </div>
            <input type="text" id="f-hch-name" style="padding-left: 40px;" value="${esc(c.church_name)}">
          </div>
        </div>
        <div class="form-group span-2">
          <label>Church Address</label>
          <textarea id="f-hch-address" rows="2">${esc(c.church_address || '')}</textarea>
        </div>
        <div class="form-group span-2">
          <label>Operational Notes</label>
          <textarea id="f-hch-notes" rows="3">${esc(c.notes || '')}</textarea>
        </div>
      </div>
    `,
    `<button class="btn btn-secondary" onclick="closeModal()">${icon('x')} Cancel</button>
     <button class="btn btn-primary" onclick="updateChurchInDistrict(${churchId})">${icon('save')} Save</button>`,
    'modal-lg'
  );
};

window.updateChurchInDistrict = async function (churchId) {
  const c = churches.find(x => x.church_id === churchId);
  if (!c) return;

  const name = document.getElementById('f-hch-name')?.value.trim();
  const address = document.getElementById('f-hch-address')?.value.trim();
  const notes = document.getElementById('f-hch-notes')?.value.trim();

  if (!name) {
    showToast('Church name is required.', 'error');
    return;
  }

  const payload = {
    church_name: name,
    church_address: address || null,
    notes: notes || null
  };

  const btn = document.querySelector('.modal-footer .btn-primary');
  const originalHtml = btn ? btn.innerHTML : '';

  try {
    if (btn) {
      btn.disabled = true;
      btn.innerHTML = `${icon('loader', 'animate-spin')} Updating...`;
    }

    const updated = await dbService.update('churches', 'church_id', churchId, payload);
    Object.assign(c, updated);

    showToast(`"${name}" updated.`, 'success');
    closeModal();
    renderDistricts();
  } catch (err) {
    console.error('[Districts] Church update failed:', err);
    showToast(`Failed to update church: ${err.message || 'Unknown error'}`, 'error');
  } finally {
    if (btn) {
      btn.disabled = false;
      btn.innerHTML = originalHtml;
    }
  }
};

window.deleteChurchFromDistrict = function (churchId) {
  const c = churches.find(x => x.church_id === churchId);
  if (!c) return;

  confirmDelete(c.church_name + ' from the district', async () => {
    try {
      await dbService.delete('churches', 'church_id', churchId);
      const idx = churches.findIndex(x => x.church_id === churchId);
      if (idx > -1) churches.splice(idx, 1);
      
      showToast(`"${c.church_name}" has been deleted. District updated.`, 'success');
      renderDistricts();
    } catch (err) {
      console.error('[Districts] Delete church failed:', err);
      showToast(`Delete failed: ${err.message}`, 'error');
    }
  });
};

// ── Assign Pastor to Church (from district view) ──────────────
window.openAssignPastorToChurch = function (churchId) {
  if (window.openAddAssignmentModal) {
    if (window.setAssignmentAfterSave) {
      window.setAssignmentAfterSave(() => renderDistrictsList());
    }
    window.openAddAssignmentModal(null, churchId);
  } else {
    window.navigate('assignments');
  }
};

// ── Filter ────────────────────────────────────────────────────
window.filterAssignChurchToDistrictOptions = function () {
  const query = (document.getElementById('assign-existing-church-search')?.value || '').toLowerCase();
  const dropdown = document.getElementById('assign-existing-church-options');
  if (!dropdown) return;

  const unassigned = churches.filter(c => !c.district_id);
  const filtered = unassigned.filter(c => c.church_name.toLowerCase().includes(query));

  if (filtered.length === 0) {
    dropdown.innerHTML = `<div class="search-select-empty">No unassigned mission stations found.</div>`;
    dropdown.classList.add('open');
    return;
  }

  dropdown.innerHTML = filtered
    .map(
      c => `
        <div class="search-select-item" onclick="selectAssignChurchToDistrict(${c.church_id}, '${esc(c.church_name).replace(/'/g, "\\'")}')">
          <div style="font-weight: 700;">${esc(c.church_name)}</div>
        </div>
      `
    )
    .join('');

  dropdown.classList.add('open');
};

window.selectAssignChurchToDistrict = function (churchId, churchName) {
  const searchInput = document.getElementById('assign-existing-church-search');
  const hiddenInput = document.getElementById('f-assign-existing-church');
  const dropdown = document.getElementById('assign-existing-church-options');

  if (searchInput) searchInput.value = churchName;
  if (hiddenInput) hiddenInput.value = churchId;
  if (dropdown) dropdown.classList.remove('open');
};

window.filterDistricts = debounce(renderDistrictsList, 200);
window.renderDistricts = renderDistricts;
window.renderDistrictsList = renderDistrictsList;