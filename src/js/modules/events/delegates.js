import { pastors, disciples, churchAssignments, districts, churches } from '../../core/state.js';
import { icon, esc, pastorAvatar, emptyState } from '../../shared/utils/helpers.js';
import { openModal, closeModal } from '../../shared/components/modal.js';

export function renderDelegates() {
  const content = document.getElementById('page-content');
  const allDelegates = getCombinedDelegates();
  const actions = document.getElementById('topbar-actions');

  if (actions) {
    actions.innerHTML = `
      <button type="button" class="btn btn-secondary" onclick="exportSelectedIDs()">${icon('download')} <span>Export Selected</span></button>
      <button type="button" class="btn btn-primary" onclick="exportAllIDs()">${icon('archive')} <span>Export All IDs</span></button>
      <button type="button" class="btn btn-success" onclick="downloadDelegateProgress()">${icon('image')} <span>Download Progress</span></button>
    `;
  }
  
  content.innerHTML = `
    <div class="fade-in">
      <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 24px;">
        <h1 style="margin: 0; font-size: 20px; font-weight: 800; display: flex; align-items: center; gap: 8px;">
          Delegates
          <span style="font-size: 11px; font-weight: 700; color: var(--text-muted); padding: 2px 10px; background: var(--bg-elevated); border-radius: 20px; border: 1px solid var(--border);">
            Total Delegates: ${allDelegates.length}
          </span>
        </h1>
      </div>

      <!-- Hidden Progress Stats for Image Export -->
      <div id="delegate-progress-export-node" style="position: absolute; left: -9999px; top: -9999px; width: 800px; background: white; padding: 40px; border-radius: 24px; color: #1e293b; font-family: sans-serif;">
        <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 40px;">
          <div>
            <h1 style="font-size: 32px; font-weight: 800; margin: 0; color: #0f172a;">Victory Chapel Christian Center</h1>
            <p style="font-size: 16px; font-weight: 600; color: #64748b; margin: 4px 0 0 0;">Conference Delegate Progress Report</p>
          </div>
          <div style="text-align: right;">
            <div style="font-size: 14px; color: #94a3b8; font-weight: 700; text-transform: uppercase;">Generated On</div>
            <div style="font-size: 16px; font-weight: 800;">${new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}</div>
          </div>
        </div>

        <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 24px; margin-bottom: 40px;">
          <div style="background: #f8fafc; border: 1px solid #e2e8f0; padding: 24px; border-radius: 20px; text-align: center;">
            <div style="font-size: 48px; font-weight: 900; color: #2563eb;">${pastors.length}</div>
            <div style="font-size: 14px; font-weight: 700; color: #64748b; text-transform: uppercase; margin-top: 8px;">Main Pastors</div>
          </div>
          <div style="background: #fff1f2; border: 1px solid #fecdd3; padding: 24px; border-radius: 20px; text-align: center;">
            <div style="font-size: 48px; font-weight: 900; color: #e11d48;">${pastors.filter(p => p.wife_name).length}</div>
            <div style="font-size: 14px; font-weight: 700; color: #64748b; text-transform: uppercase; margin-top: 8px;">Pastors' Wives</div>
          </div>
          <div style="background: #f0f9ff; border: 1px solid #bae6fd; padding: 24px; border-radius: 20px; text-align: center;">
            <div style="font-size: 48px; font-weight: 900; color: #0284c7;">${disciples.length}</div>
            <div style="font-size: 14px; font-weight: 700; color: #64748b; text-transform: uppercase; margin-top: 8px;">Disciples</div>
          </div>
        </div>

        <div style="background: #1e293b; color: white; padding: 32px; border-radius: 24px; display: flex; justify-content: space-between; align-items: center;">
          <div>
            <div style="font-size: 16px; font-weight: 700; opacity: 0.8; margin-bottom: 4px;">GRAND TOTAL DELEGATES</div>
            <div style="font-size: 56px; font-weight: 900; letter-spacing: -0.04em;">${allDelegates.length}</div>
          </div>
          <div style="text-align: right;">
            <div style="font-size: 14px; font-weight: 700; margin-bottom: 8px;">DEPLOYMENT COVERAGE</div>
            <div style="width: 200px; height: 12px; background: rgba(255,255,255,0.1); border-radius: 6px; overflow: hidden;">
              <div style="width: 100%; height: 100%; background: #22c55e;"></div>
            </div>
          </div>
        </div>
        
        <div style="margin-top: 40px; padding-top: 24px; border-top: 1px dashed #e2e8f0; text-align: center; color: #94a3b8; font-size: 12px; font-weight: 600;">
          VICTORY CHAPEL CHRISTIAN CENTER - DAVAO OFFICIAL REPORT
        </div>
      </div>

      <div style="display: flex; gap: 12px; align-items: center; margin-bottom: 24px;">
        <div style="padding: 0 4px; display: flex; align-items: center;">
          <input type="checkbox" id="select-all-delegates" onchange="toggleSelectAllDelegates(this.checked)" style="width: 18px; height: 18px; cursor: pointer;">
        </div>
        <div style="flex: 1; position: relative;">
          <div style="position: absolute; left: 16px; top: 50%; transform: translateY(-50%); color: var(--text-muted);">
            ${icon('search', 'icon-sm')}
          </div>
          <input type="text" id="delegate-search"
                 style="padding-left: 44px; height: 46px; font-size: 15px;"
                 placeholder="Search by registered name..." oninput="filterDelegates()">
        </div>

        <div class="filter-trigger-wrap">
          <button type="button" class="filter-trigger-btn${getDelegateActiveFilterCount() > 0 ? ' active' : ''}" onclick="toggleDelegateFilterPanel(event)">
            ${icon('filter', 'icon-sm')}
            ${getDelegateActiveFilterCount() > 0 ? `<span class="filter-badge">${getDelegateActiveFilterCount()}</span>` : ''}
          </button>
          <div id="delegate-filter-panel" class="filter-dropdown-panel" style="width: 560px;">
            <div class="filter-section">
              <div class="filter-section-label">Category</div>
              <div class="filter-chip-list" id="delegate-category-chips">
                ${renderCategoryChip('all', 'All Registered')}
                ${renderCategoryChip('pastor', 'Main Pastors')}
                ${renderCategoryChip('wife', "Pastors' Wives")}
                ${renderCategoryChip('disciple', 'Church Disciples')}
              </div>
            </div>
            <div class="filter-section" style="border-top: 1px solid var(--border); padding-top: 16px;">
              <div class="filter-section-label">Hierarchy</div>
              <div style="font-size: 11px; color: var(--text-muted); margin-bottom: 12px; display: flex; align-items: flex-start; gap: 6px;">
                ${icon('info', 'icon-xs')} Narrow down: District → Church → Pastor. Leave a column unchecked to include everything at that level.
              </div>
              <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(150px, 1fr)); gap: 12px;">
                <div>
                  <div style="font-size: 11px; font-weight: 800; text-transform: uppercase; letter-spacing: 0.05em; color: var(--text-muted); margin-bottom: 8px;">1. Districts</div>
                  <div id="hf-districts" style="display: flex; flex-direction: column; gap: 4px; max-height: 160px; overflow-y: auto; border: 1px solid var(--border); border-radius: var(--radius-md); padding: 8px;">
                    ${renderHierarchyChecklist(districts, 'district_id', 'district_name', hierarchyFilterState.districts, 'onHierarchyDistrictChange')}
                  </div>
                </div>
                <div>
                  <div style="font-size: 11px; font-weight: 800; text-transform: uppercase; letter-spacing: 0.05em; color: var(--text-muted); margin-bottom: 8px;">2. Churches</div>
                  <div id="hf-churches" style="display: flex; flex-direction: column; gap: 4px; max-height: 160px; overflow-y: auto; border: 1px solid var(--border); border-radius: var(--radius-md); padding: 8px;">
                    ${renderHierarchyChecklist(getAvailableChurches(), 'church_id', 'church_name', hierarchyFilterState.churches, 'onHierarchyChurchChange')}
                  </div>
                </div>
                <div>
                  <div style="font-size: 11px; font-weight: 800; text-transform: uppercase; letter-spacing: 0.05em; color: var(--text-muted); margin-bottom: 8px;">3. Pastor &amp; Wife</div>
                  <div id="hf-pastors" style="display: flex; flex-direction: column; gap: 4px; max-height: 160px; overflow-y: auto; border: 1px solid var(--border); border-radius: var(--radius-md); padding: 8px;">
                    ${renderHierarchyChecklist(getAvailablePastors(), 'pastor_id', 'pastor_name', hierarchyFilterState.pastors, 'onHierarchyPastorChange')}
                  </div>
                </div>
              </div>
              <div style="margin-top: 12px; display: flex; justify-content: flex-end;">
                <button type="button" class="btn btn-sm btn-secondary" onclick="clearHierarchyFilters()">${icon('x', 'icon-xs')} Clear Hierarchy</button>
              </div>
            </div>
          </div>
          <select id="delegate-type-filter" style="display: none;">
            <option value="all">All Registered</option>
            <option value="pastor">Main Pastors</option>
            <option value="wife">Pastors' Wives</option>
            <option value="disciple">Church Disciples</option>
          </select>
        </div>
      </div>
      <div id="delegates-list" class="grid-list" style="gap: 16px;">
        ${renderDelegateCards(allDelegates)}
      </div>
    </div>
  `;
  if (window.lucide) lucide.createIcons();
  bindDelegateFilterOutsideClick();
}

function renderCategoryChip(type, label) {
  const isActive = type === 'all';
  return `
    <button type="button" class="filter-chip${isActive ? ' active' : ''}" data-type="${type}" onclick="switchDelegateCategory('${type}')">
      ${label}
    </button>
  `;
}

let delegateOutsideClickBound = false;

window.toggleDelegateFilterPanel = function(event) {
  event.stopPropagation();
  document.getElementById('delegate-filter-panel')?.classList.toggle('open');
};

function bindDelegateFilterOutsideClick() {
  if (delegateOutsideClickBound) return;
  delegateOutsideClickBound = true;
  document.addEventListener('click', (e) => {
    const wrap = document.querySelector('#page-content .filter-trigger-wrap');
    if (wrap && !wrap.contains(e.target)) {
      document.getElementById('delegate-filter-panel')?.classList.remove('open');
    }
  });
}

window.switchDelegateCategory = function(type) {
  const select = document.getElementById('delegate-type-filter');
  if (select) select.value = type;

  document.querySelectorAll('#delegate-category-chips .filter-chip').forEach(c => {
    c.classList.toggle('active', c.dataset.type === type);
  });

  updateDelegateFilterBadge();
  filterDelegates();
};

function getCombinedDelegates() {
  const list = [];
  
  const getDelegateColor = (pastorId) => {
    const active = churchAssignments.find(a => a.pastor_id === pastorId && !a.end_date);
    if (active) {
      const d = districts.find(x => x.district_id === active.district_id);
      return d ? d.color : null;
    }
    return null;
  };

  // Add Pastors
  pastors.forEach(p => {
    const active = churchAssignments.find(a => a.pastor_id === p.pastor_id && !a.end_date);
    const church = active ? (churches || []).find(c => c.church_id === active.church_id) : null;
    const churchName = church ? church.church_name : 'N/A';

    const dColor = getDelegateColor(p.pastor_id);
    list.push({
      id: p.pastor_id,
      name: p.pastor_name,
      type: 'pastor',
      typeLabel: 'Pastor',
      churchName: churchName,
      districtId: active?.district_id ?? null,
      churchId: active?.church_id ?? null,
      pastorId: p.pastor_id,
      color: dColor,
      img: p.image_url,
      qrValue: getDelegateQR('pastor', p.pastor_id)
    });

    // Add Wife if exists
    if (p.wife_name) {
      list.push({
        id: p.pastor_id,
        name: p.wife_name,
        type: 'wife',
        typeLabel: 'Pastor\'s Wife',
        churchName: churchName,
        districtId: active?.district_id ?? null,
        churchId: active?.church_id ?? null,
        pastorId: p.pastor_id,
        color: dColor,
        img: p.wife_image_url,
        qrValue: getDelegateQR('wife', p.pastor_id)
      });
    }
  });

  // Add Disciples
  disciples.forEach(d => {
    const p = d.pastor_id ? pastors.find(x => x.pastor_id === d.pastor_id) : null;
    // Church/district come from the disciple's own snapshot, not the
    // pastor's live assignment - stays correct after a mentor is released.
    const church = d.church_id ? (churches || []).find(c => c.church_id === d.church_id) : null;
    const churchName = church ? church.church_name : 'N/A';

    const dColor = d.district_id ? (districts || []).find(x => x.district_id === d.district_id)?.color : null;
    list.push({
      id: d.disciple_id,
      name: d.full_name,
      type: 'disciple',
      typeLabel: p ? `Disciple of ${p.pastor_name}` : 'Disciple (Unassigned)',
      churchName: churchName,
      districtId: d.district_id ?? null,
      churchId: d.church_id ?? null,
      pastorId: d.pastor_id ?? null,
      color: dColor,
      img: null,
      pastorInitial: p ? p.pastor_name.charAt(0) : '?',
      qrValue: getDelegateQR('disciple', d.disciple_id)
    });
  });
  
  // De-duplicate based on qrValue (type + id)
  const uniqueList = [];
  const seen = new Set();
  list.forEach(item => {
    if (!seen.has(item.qrValue)) {
      uniqueList.push(item);
      seen.add(item.qrValue);
    }
  });
  
  return uniqueList.sort((a, b) => a.name.localeCompare(b.name));
}

// ── Hierarchy Filter (District → Church → Pastor & Wife) ───────
// Leaving a level empty means "all" at that level. Disciples are not a
// separate filter level - narrowing by Pastor already narrows to that
// pastor's disciples, and the individual delegate checkboxes below let
// the user multi-select specific disciples for export.
const hierarchyFilterState = {
  districts: new Set(),
  churches: new Set(),
  pastors: new Set(),
};

function getAvailableChurches() {
  if (hierarchyFilterState.districts.size === 0) return churches;
  return churches.filter(c => hierarchyFilterState.districts.has(c.district_id));
}

function getAvailablePastors() {
  const activeAssignments = churchAssignments.filter(a => !a.end_date);
  let matches = activeAssignments;
  if (hierarchyFilterState.churches.size > 0) {
    matches = matches.filter(a => hierarchyFilterState.churches.has(a.church_id));
  } else if (hierarchyFilterState.districts.size > 0) {
    matches = matches.filter(a => hierarchyFilterState.districts.has(a.district_id));
  }
  const pastorIds = new Set(matches.map(a => a.pastor_id));
  return pastors.filter(p => pastorIds.has(p.pastor_id));
}

function getDelegateActiveFilterCount() {
  const categoryActive = (document.getElementById('delegate-type-filter')?.value || 'all') !== 'all' ? 1 : 0;
  const hierarchyActive = hierarchyFilterState.districts.size + hierarchyFilterState.churches.size + hierarchyFilterState.pastors.size;
  return categoryActive + hierarchyActive;
}

function updateDelegateFilterBadge() {
  const btn = document.querySelector('.filter-trigger-wrap .filter-trigger-btn');
  if (!btn) return;
  const count = getDelegateActiveFilterCount();
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

function renderHierarchyChecklist(items, idKey, nameKey, selectedSet, handlerName) {
  if (!items || items.length === 0) {
    return `<div style="font-size: 12px; color: var(--text-muted); font-style: italic; padding: 4px;">None available</div>`;
  }
  return items.map(item => `
    <label style="display: flex; align-items: center; gap: 8px; font-size: 13px; font-weight: 600; padding: 4px; cursor: pointer;">
      <input type="checkbox" ${selectedSet.has(item[idKey]) ? 'checked' : ''} onchange="${handlerName}(${item[idKey]}, this.checked)" style="width: 16px; height: 16px; cursor: pointer;">
      <span>${esc(item[nameKey] || '')}</span>
    </label>
  `).join('');
}

function refreshHierarchyDependentLevels() {
  const churchesEl = document.getElementById('hf-churches');
  if (churchesEl) churchesEl.innerHTML = renderHierarchyChecklist(getAvailableChurches(), 'church_id', 'church_name', hierarchyFilterState.churches, 'onHierarchyChurchChange');
  const pastorsEl = document.getElementById('hf-pastors');
  if (pastorsEl) pastorsEl.innerHTML = renderHierarchyChecklist(getAvailablePastors(), 'pastor_id', 'pastor_name', hierarchyFilterState.pastors, 'onHierarchyPastorChange');
}

window.onHierarchyDistrictChange = function(id, checked) {
  if (checked) hierarchyFilterState.districts.add(id); else hierarchyFilterState.districts.delete(id);
  // Prune church/pastor selections that no longer fall under the selected districts
  const availableChurchIds = new Set(getAvailableChurches().map(c => c.church_id));
  [...hierarchyFilterState.churches].forEach(cid => { if (!availableChurchIds.has(cid)) hierarchyFilterState.churches.delete(cid); });
  refreshHierarchyDependentLevels();
  const availablePastorIds = new Set(getAvailablePastors().map(p => p.pastor_id));
  [...hierarchyFilterState.pastors].forEach(pid => { if (!availablePastorIds.has(pid)) hierarchyFilterState.pastors.delete(pid); });
  refreshHierarchyDependentLevels();
  updateDelegateFilterBadge();
  filterDelegates();
};

window.onHierarchyChurchChange = function(id, checked) {
  if (checked) hierarchyFilterState.churches.add(id); else hierarchyFilterState.churches.delete(id);
  const availablePastorIds = new Set(getAvailablePastors().map(p => p.pastor_id));
  [...hierarchyFilterState.pastors].forEach(pid => { if (!availablePastorIds.has(pid)) hierarchyFilterState.pastors.delete(pid); });
  refreshHierarchyDependentLevels();
  updateDelegateFilterBadge();
  filterDelegates();
};

window.onHierarchyPastorChange = function(id, checked) {
  if (checked) hierarchyFilterState.pastors.add(id); else hierarchyFilterState.pastors.delete(id);
  updateDelegateFilterBadge();
  filterDelegates();
};

window.clearHierarchyFilters = function() {
  hierarchyFilterState.districts.clear();
  hierarchyFilterState.churches.clear();
  hierarchyFilterState.pastors.clear();
  const districtsEl = document.getElementById('hf-districts');
  if (districtsEl) districtsEl.innerHTML = renderHierarchyChecklist(districts, 'district_id', 'district_name', hierarchyFilterState.districts, 'onHierarchyDistrictChange');
  refreshHierarchyDependentLevels();
  updateDelegateFilterBadge();
  filterDelegates();
};

function renderDelegateCards(delegates) {
  if (delegates.length === 0) {
    return emptyState('No Delegates Found', 'Please check your registration data or adjust filters.', 'users', '', '');
  }
  
  const list = delegates.map(d => `
    <div class="card delegate-card" data-type="${d.type}" data-name="${d.name.toLowerCase()}"
         data-district="${d.districtId ?? ''}" data-church="${d.churchId ?? ''}" data-pastor="${d.pastorId ?? ''}"
         style="padding: 16px; border: 1px solid var(--border); transition: all 0.2s; position: relative; display: flex; align-items: center; gap: 16px;">
      
      <div style="padding-right: 8px;">
        <input type="checkbox" class="delegate-checkbox" data-delegate="${JSON.stringify(d).replace(/"/g, '&quot;')}" style="width: 18px; height: 18px; cursor: pointer;">
      </div>

      <div style="position: relative;">
        ${pastorAvatar(d.name, d.img, 'md', d.color || 'var(--accent)')}
        <div style="position: absolute; bottom: -2px; right: -2px; width: 12px; height: 12px; border-radius: 50%; background: ${d.color || 'var(--accent)'}; border: 2px solid #fff; box-shadow: 0 0 0 1px ${d.color || 'var(--accent)'}44;"></div>
      </div>

      <div style="flex: 1; min-width: 0;">
        <div style="font-weight: 800; font-size: 15px; color: var(--text-primary); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; margin-bottom: 2px;">${esc(d.name)}</div>
        <div style="font-size: 11px; color: var(--text-muted); font-weight: 700; text-transform: uppercase; letter-spacing: 0.05em; display: flex; align-items: center; gap: 6px;">
          ${icon(d.type === 'pastor' ? 'user' : d.type === 'wife' ? 'heart' : 'users', 'icon-xs')}
          ${d.typeLabel}
        </div>
      </div>

      <div style="display: flex; gap: 8px;">
        <button class="btn btn-icon" style="background: var(--bg-elevated); border: 1px solid var(--border); border-radius: 10px; color: var(--accent);" 
                onclick="previewID({type:'${d.type}', full_name:'${esc(d.name.replace(/'/g, "\\'"))}', church_name:'${esc(d.churchName.replace(/'/g, "\\'"))}', qr_code:'${d.qrValue}'})" title="Generate ID Card">
          ${icon('contact', 'icon-sm')}
        </button>
        <button class="btn btn-icon" style="background: var(--bg-elevated); border: 1px solid var(--border); border-radius: 10px; color: var(--text-muted);" 
                onclick="viewDelegateQR('${d.qrValue}', '${esc(d.name.replace(/'/g, "\\'"))}')" title="View Attendance QR">
          ${icon('qr-code', 'icon-sm')}
        </button>
      </div>
    </div>
  `).join('');

  setTimeout(() => window.lucide?.createIcons?.(), 50);
  return list;
}

window.filterDelegates = function() {
  const query = document.getElementById('delegate-search').value.toLowerCase();
  const type = document.getElementById('delegate-type-filter').value;
  const cards = document.querySelectorAll('.delegate-card');

  cards.forEach(card => {
    const matchesQuery = card.dataset.name.includes(query);
    const matchesType = type === 'all' || card.dataset.type === type;

    const cardDistrict = card.dataset.district ? +card.dataset.district : null;
    const cardChurch = card.dataset.church ? +card.dataset.church : null;
    const cardPastor = card.dataset.pastor ? +card.dataset.pastor : null;

    const matchesDistrict = hierarchyFilterState.districts.size === 0 || (cardDistrict !== null && hierarchyFilterState.districts.has(cardDistrict));
    const matchesChurch = hierarchyFilterState.churches.size === 0 || (cardChurch !== null && hierarchyFilterState.churches.has(cardChurch));
    const matchesPastor = hierarchyFilterState.pastors.size === 0 || (cardPastor !== null && hierarchyFilterState.pastors.has(cardPastor));

    card.style.display = (matchesQuery && matchesType && matchesDistrict && matchesChurch && matchesPastor) ? 'block' : 'none';
  });
};

window.toggleSelectAllDelegates = function(checked) {
  document.querySelectorAll('.delegate-checkbox').forEach(cb => {
    if (cb.parentElement.parentElement.style.display !== 'none') {
      cb.checked = checked;
    }
  });
};

window.exportSelectedIDs = function() {
  const selected = [];
  document.querySelectorAll('.delegate-checkbox:checked').forEach(cb => {
    const d = JSON.parse(cb.dataset.delegate);
    selected.push({
      type: d.type,
      full_name: d.name,
      church_name: d.churchName,
      qr_code: d.qrValue
    });
  });

  if (selected.length === 0) {
    import('../../shared/components/toast.js').then(m => m.showToast('Select delegates first.', 'warning'));
    return;
  }
  
  if (window.exportBulkIDs) {
    window.exportBulkIDs(selected, `Selected_IDs_${new Date().getTime()}.zip`);
  }
};

window.exportAllIDs = function() {
  const all = getCombinedDelegates().map(d => ({
    type: d.type,
    full_name: d.name,
    church_name: d.churchName,
    qr_code: d.qrValue
  }));

  if (window.exportBulkIDs) {
    window.exportBulkIDs(all, `All_Delegates_IDs_${new Date().getTime()}.zip`);
  }
};

window.exportSelectedIDs = exportSelectedIDs;
window.exportAllIDs = exportAllIDs;
window.downloadDelegateProgress = async function() {
  const node = document.getElementById('delegate-progress-export-node');
  if (!node) return;
  
  import('../../shared/components/toast.js').then(m => m.showToast('Generating progress image...', 'info'));
  
  try {
    if (!window.domtoimage) {
      await new Promise((resolve, reject) => {
        const s = document.createElement('script');
        s.src = 'https://cdn.jsdelivr.net/npm/dom-to-image@2.6.0/dist/dom-to-image.min.js';
        s.onload = resolve;
        s.onerror = reject;
        document.head.appendChild(s);
      });
    }
    // Need a tiny delay for CSS to settle
    await new Promise(r => setTimeout(r, 100));
    const dataUrl = await window.domtoimage.toJpeg(node, { quality: 0.95, bgcolor: '#ffffff' });
    const link = document.createElement('a');
    link.download = `VCCC_Progress_${new Date().getTime()}.jpg`;
    link.href = dataUrl;
    link.click();
    import('../../shared/components/toast.js').then(m => m.showToast('Progress exported successfully.', 'success'));
  } catch (error) {
    console.error('Export failed', error);
    import('../../shared/components/toast.js').then(m => m.showToast('Failed to export image.', 'error'));
  }
};
