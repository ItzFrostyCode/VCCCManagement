// ============================================================
// Church Management System — Reports Module
// Status codes: active | suspended | interim | undeployed
// Assignment types: regular | pioneering | training | swap |
//                   suspended | international | interim
// ============================================================

import { pastors, churches, districts, zones, churchAssignments } from './data.js';
import { icon, statusBadge, assignmentBadge, formatDate, formatDateRange, esc, pastorAvatar } from './utils.js';

export function renderReports() {
  const content = document.getElementById('page-content');
  document.getElementById('topbar-actions').innerHTML = '';

  content.innerHTML = `<div class="fade-in">
    <div class="filter-bar tabs-container" style="margin-bottom:16px">
      <!-- Desktop Tabs -->
      <div class="desktop-tabs">
        <button type="button" class="tab-btn active" data-report="suspended" onclick="switchReport('suspended',this)">${icon('ban','icon-xs')} Suspended</button>
        <button type="button" class="tab-btn" data-report="undeployed" onclick="switchReport('undeployed',this)">${icon('user-x','icon-xs')} Undeployed</button>
        <button type="button" class="tab-btn" data-report="interim" onclick="switchReport('interim',this)">${icon('clock','icon-xs')} Interim</button>
        <button type="button" class="tab-btn" data-report="vacant" onclick="switchReport('vacant',this)">${icon('alert-triangle','icon-xs')} Vacant Churches</button>
        <button type="button" class="tab-btn" data-report="zone-counts" onclick="switchReport('zone-counts',this)">${icon('bar-chart-2','icon-xs')} Zone Coverage</button>
        <button type="button" class="tab-btn" data-report="international" onclick="switchReport('international',this)">${icon('globe','icon-xs')} International</button>
        <button type="button" class="tab-btn" data-report="timeline" onclick="switchReport('timeline',this)">${icon('clock','icon-xs')} Timeline</button>
      </div>
      <!-- Mobile Dropdown -->
      <select class="mobile-tabs-dropdown hidden" onchange="switchReportDropdown(this.value)">
        <option value="suspended">Suspended</option>
        <option value="undeployed">Undeployed</option>
        <option value="interim">Interim</option>
        <option value="vacant">Vacant Churches</option>
        <option value="zone-counts">Zone Coverage</option>
        <option value="international">International</option>
        <option value="timeline">Timeline</option>
      </select>
    </div>
    <div id="report-content"></div>
  </div>`;

  renderReport('suspended');
  lucide.createIcons();
}

window.switchReport = function(type, btn) {
  document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
  if (btn) btn.classList.add('active');
  
  // Sync dropdown if called from tab
  const dropdown = document.querySelector('.mobile-tabs-dropdown');
  if (dropdown) dropdown.value = type;

  renderReport(type);
};

window.switchReportDropdown = function(type) {
  // Find matching tab button and set it active
  const btn = document.querySelector(`.tab-btn[data-report="${type}"]`);
  switchReport(type, btn);
};

function renderReport(type) {
  const container = document.getElementById('report-content');
  if (!container) return;
  switch (type) {
    case 'suspended':    container.innerHTML = reportSuspended();    break;
    case 'undeployed':   container.innerHTML = reportUndeployed();   break;
    case 'interim':       container.innerHTML = reportInterim();       break;
    case 'vacant':       container.innerHTML = reportVacant();       break;
    case 'zone-counts':  container.innerHTML = reportZoneCounts();   break;
    case 'international':container.innerHTML = reportInternational();break;
    case 'timeline':     container.innerHTML = reportTimeline();     break;
  }
  lucide.createIcons();
}

// ── Suspended ────────────────────────────────────────────────
function reportSuspended() {
  const suspended = pastors.filter(p => p.status_code === 'suspended');
  if (suspended.length === 0) return emptyReport('No suspended pastors.');

  const rows = suspended.map(p => {
    const suspendAssign = [...churchAssignments]
      .filter(a => a.pastor_id === p.pastor_id && a.assignment_type_code === 'suspended')
      .sort((a,b) => new Date(b.start_date)-new Date(a.start_date))[0];
    const prevChurch = suspendAssign?.origin_church_id ? churches.find(c => c.church_id === suspendAssign.origin_church_id) : null;
    return `<tr>
      <td><div class="pastor-info">${pastorAvatar(p.pastor_name,p.image_url,'md')}<div><div class="pastor-name">${esc(p.pastor_name)}</div></div></div></td>
      <td data-label="Status">${statusBadge(p.status_code)}</td>
      <td data-label="Suspended On" class="td-muted">${suspendAssign ? formatDate(suspendAssign.start_date) : '—'}</td>
      <td data-label="Previous Church">${prevChurch ? esc(prevChurch.church_name) : '<span class="td-muted">—</span>'}</td>
      <td data-label="Reason" class="td-muted">${esc(suspendAssign?.notes)||'—'}</td>
    </tr>`;
  }).join('');

  return reportTable('Suspended Pastors', `<span class="badge badge-suspended">${suspended.length} pastors</span>`,
    '<th>Pastor</th><th>Status</th><th>Suspended On</th><th>Previous Church</th><th>Reason</th>', rows, 'suspended');
}

// ── Undeployed ───────────────────────────────────────────────
function reportUndeployed() {
  const undeployed = pastors.filter(p => p.status_code === 'undeployed');
  if (undeployed.length === 0) return emptyReport('No undeployed pastors. All pastors are assigned.');

  const rows = undeployed.map(p => {
    const last = [...churchAssignments].filter(a => a.pastor_id === p.pastor_id).sort((a,b) => new Date(b.start_date)-new Date(a.start_date))[0];
    const lastChurch = last?.church_id ? churches.find(c => c.church_id === last.church_id) : null;
    return `<tr>
      <td><div class="pastor-info">${pastorAvatar(p.pastor_name,p.image_url,'md')}<div><div class="pastor-name">${esc(p.pastor_name)}</div></div></div></td>
      <td data-label="Status">${statusBadge(p.status_code)}</td>
      <td data-label="Contact" class="td-muted">${esc(p.contact_number)||'—'}</td>
      <td data-label="Last Church">${lastChurch ? esc(lastChurch.church_name) : '<span class="td-muted">No prior assignment</span>'}</td>
      <td data-label="Last Active" class="td-muted">${last ? formatDate(last.end_date||last.start_date) : '—'}</td>
      <td data-label="Notes" class="td-muted">${esc(p.notes)||'—'}</td>
    </tr>`;
  }).join('');

  return reportTable('Undeployed Pastors', `<span class="badge badge-undeployed">${undeployed.length} ready</span>`,
    '<th>Pastor</th><th>Status</th><th>Contact</th><th>Last Church</th><th>Last Active</th><th>Notes</th>', rows, 'undeployed');
}

// ── Interim ──────────────────────────────────────────────────
function reportInterim() {
  const interim = pastors.filter(p => p.status_code === 'interim');
  if (interim.length === 0) return emptyReport('No interim pastors currently.');

  const rows = interim.map(p => {
    const assign = churchAssignments.find(a => a.pastor_id === p.pastor_id && !a.end_date);
    const church = assign?.church_id ? churches.find(c => c.church_id === assign.church_id) : null;
    return `<tr>
      <td><div class="pastor-info">${pastorAvatar(p.pastor_name,p.image_url,'md')}<div><div class="pastor-name">${esc(p.pastor_name)}</div></div></div></td>
      <td data-label="Status">${statusBadge(p.status_code)}</td>
      <td data-label="Current Church">${church ? esc(church.church_name) : '<span class="td-muted">Unassigned</span>'}</td>
      <td data-label="Since" class="td-muted">${assign ? formatDate(assign.start_date) : '—'}</td>
      <td data-label="Notes" class="td-muted">${esc(p.notes)||'—'}</td>
    </tr>`;
  }).join('');

  return reportTable('Interim Pastors', `<span class="badge badge-interim">${interim.length} pastors</span>`,
    '<th>Pastor</th><th>Status</th><th>Current Church</th><th>Since</th><th>Notes</th>', rows, 'interim');
}

// ── Vacant Churches ──────────────────────────────────────────
function reportVacant() {
  const vacant = churches.filter(c => !churchAssignments.some(a => a.church_id === c.church_id && !a.end_date));
  if (vacant.length === 0) return emptyReport('✅ All churches have an active pastor assignment.');

  const rows = vacant.map(c => {
    const zone = c.zone_id ? zones.find(z => z.zone_id === c.zone_id) : null;
    const dist = zone ? districts.find(x => x.district_id === zone.district_id)
                      : (c.district_id ? districts.find(x => x.district_id === c.district_id) : null);
    const last = [...churchAssignments].filter(a => a.church_id === c.church_id).sort((a,b) => new Date(b.start_date)-new Date(a.start_date))[0];
    const lastPastor = last ? pastors.find(p => p.pastor_id === last.pastor_id) : null;
    return `<tr>
      <td><div><div class="pastor-name">${esc(c.church_name)}</div>${c.church_address ? `<span style="font-size:11px;color:var(--text-muted)">${esc(c.church_address)}</span>` : ''}</div></td>
      <td data-label="Location" class="td-muted" style="font-size:12px">${[dist?.district_name, zone?.zone_name].filter(Boolean).map(esc).join(' / ')}</td>
      <td data-label="Last Pastor">${lastPastor ? esc(lastPastor.pastor_name) : '<span class="td-muted">Never assigned</span>'}</td>
      <td data-label="Vacated" class="td-muted">${last ? formatDate(last.end_date) : '—'}</td>
      <td data-label="Status"><span class="badge badge-suspended">${icon('alert-triangle','icon-xs')} Needs Pastor</span></td>
    </tr>`;
  }).join('');

  return reportTable('Churches Without Active Pastor', `<span class="badge badge-suspended">${vacant.length} vacant</span>`,
    '<th>Church</th><th>Location</th><th>Last Pastor</th><th>Vacated</th><th>Status</th>', rows, 'vacant');
}

// ── Zone Coverage ────────────────────────────────────────────
function reportZoneCounts() {
  const rows = districts.map(d => {
    const distZones    = zones.filter(z => z.district_id === d.district_id);
    const distChurches = churches.filter(c => {
      if (c.district_id === d.district_id) return true;
      if (c.zone_id) { const z = zones.find(zn => zn.zone_id === c.zone_id); return z && z.district_id === d.district_id; }
      return false;
    });
    const assigned = distChurches.filter(c => churchAssignments.some(a => a.church_id === c.church_id && !a.end_date)).length;
    const zoneRows = distZones.map(z => {
      const zChurches = churches.filter(c => c.zone_id === z.zone_id);
      const zAssigned = zChurches.filter(c => churchAssignments.some(a => a.church_id === c.church_id && !a.end_date)).length;
      return `<tr>
        <td style="padding-left:32px" class="td-muted">${esc(z.zone_name)}</td>
        <td></td>
        <td><strong>${zChurches.length}</strong></td>
        <td>${zAssigned}</td>
        <td>${zChurches.length - zAssigned > 0
          ? `<span class="text-danger">${zChurches.length - zAssigned} vacant</span>`
          : '<span class="text-success">All assigned</span>'}</td>
      </tr>`;
    }).join('');
    return `<tr style="background:var(--bg-elevated)">
      <td colspan="2"><strong>${esc(d.district_name)}</strong></td>
      <td><strong>${distChurches.length}</strong></td>
      <td>${assigned}</td>
      <td>${distChurches.length - assigned > 0 ? `<span class="text-danger">${distChurches.length - assigned} vacant</span>` : '<span class="text-success">All assigned</span>'}</td>
    </tr>${zoneRows}`;
  }).join('');

  if (!rows) return emptyReport('No districts or zones configured yet.');
  return reportTable('Zone Coverage', '', '<th>District</th><th>Zone</th><th>Churches</th><th>Assigned</th><th>Coverage</th>', rows, 'zone-coverage');
}

// ── International ────────────────────────────────────────────
function reportInternational() {
  const intlAssignedIds = new Set();
  const intlAssignments = churchAssignments.filter(a => {
    if (a.assignment_type_code === 'international') {
      if (a.church_id) intlAssignedIds.add(a.church_id);
      return true;
    }
    const c = churches.find(x => x.church_id === a.church_id);
    if (c && c.is_international) {
      intlAssignedIds.add(a.church_id);
      return true;
    }
    return false;
  });

  const unassignedIntlChurches = churches.filter(c => c.is_international && !intlAssignedIds.has(c.church_id));

  if (intlAssignments.length === 0 && unassignedIntlChurches.length === 0) {
    return emptyReport('No international records found.');
  }

  const rows = [];

  intlAssignments.forEach(a => {
    const p = pastors.find(x => x.pastor_id === a.pastor_id);
    const c = a.church_id ? churches.find(x => x.church_id === a.church_id) : null;
    rows.push(`<tr>
      <td><div class="pastor-info">${pastorAvatar(p?.pastor_name||'?',p?.image_url,'md')}<div><div class="pastor-name">${esc(p?.pastor_name||'Unknown')}</div></div></div></td>
      <td data-label="Status">${a.end_date ? '<span class="badge" style="background:var(--border);color:var(--text-muted)">Ended</span>' : '<span class="badge badge-active">Active</span>'}</td>
      <td data-label="Church">${c ? esc(c.church_name) : '<span class="td-muted">—</span>'}</td>
      <td data-label="Period" class="td-muted">${formatDateRange(a.start_date, a.end_date)}</td>
      <td data-label="Notes" class="td-muted">${esc(a.notes)||'—'}</td>
    </tr>`);
  });

  unassignedIntlChurches.forEach(c => {
    rows.push(`<tr>
      <td><div class="pastor-info"><div class="img-placeholder" style="width:36px;height:36px;border-radius:6px">${icon('user-x','icon-sm')}</div><div><div class="pastor-name td-muted" style="font-style:italic">Vacant</div></div></div></td>
      <td data-label="Status"><span class="badge badge-suspended">Unassigned</span></td>
      <td data-label="Church">${esc(c.church_name)}</td>
      <td data-label="Period" class="td-muted">—</td>
      <td data-label="Notes" class="td-muted">${esc(c.notes)||'—'}</td>
    </tr>`);
  });

  const total = intlAssignments.length + unassignedIntlChurches.length;

  return reportTable('International Records', `<span class="badge badge-international">${total} records</span>`,
    '<th>Pastor</th><th>Status</th><th>Church</th><th>Period</th><th>Notes</th>', rows.join(''), 'international');
}

// ── Pastor Timeline ──────────────────────────────────────────
function reportTimeline() {
  const select = `
    <div class="form-group" style="max-width:320px;margin-bottom:20px;display:flex;align-items:flex-end;gap:12px">
      <div style="flex:1">
        <label>${icon('user','icon-xs')} Select Pastor</label>
        <select id="timeline-pastor-select" onchange="renderTimeline()">
          <option value="">Choose a pastor…</option>
          ${pastors.map(p => `<option value="${p.pastor_id}">${esc(p.pastor_name)} (${p.status_code})</option>`).join('')}
        </select>
      </div>
      <button type="button" class="btn btn-outline" onclick="exportTimeline()">${icon('download')} Export</button>
    </div>
    <div id="timeline-result"></div>`;

  return `<div class="card">${select}</div>`;
}

window.exportTimeline = function() {
  const pastorId = document.getElementById('timeline-pastor-select')?.value;
  if (!pastorId) {
    if (window.showToast) window.showToast('Select a pastor first to export timeline.', 'error');
    else alert('Select a pastor first to export timeline.');
    return;
  }
  if (window.downloadReportSheet) {
    window.downloadReportSheet('timeline', pastorId);
  }
};

window.renderTimeline = function() {
  const pastorId = +document.getElementById('timeline-pastor-select')?.value || null;
  const result   = document.getElementById('timeline-result');
  if (!pastorId || !result) return;
  const assignments = churchAssignments.filter(a => a.pastor_id === pastorId).sort((a,b) => new Date(a.start_date)-new Date(b.start_date));
  if (assignments.length === 0) { result.innerHTML = `<div class="empty-state"><p>No assignment history for this pastor.</p></div>`; return; }
  const items = assignments.map(a => {
    const c = a.church_id ? churches.find(x => x.church_id === a.church_id) : null;
    const dotClass = a.assignment_type_code === 'suspended' ? 'dot-danger' : a.end_date ? 'dot-muted' : 'dot-success';
    return `<div class="timeline-item">
      <div class="timeline-dot ${dotClass}"></div>
      <div class="timeline-date">${formatDateRange(a.start_date, a.end_date)}</div>
      <div class="timeline-content">
        <div style="display:flex;gap:6px;margin-bottom:4px">${assignmentBadge(a.assignment_type_code)}${!a.end_date ? '<span class="badge badge-active" style="font-size:10px">Current</span>' : ''}</div>
        <strong>${c ? esc(c.church_name) : 'No Church'}</strong>
        ${a.notes ? `<p>${esc(a.notes)}</p>` : ''}
      </div>
    </div>`;
  }).join('');
  result.innerHTML = `<div class="timeline">${items}</div>`;
  lucide.createIcons();
};

// ── Helpers ──────────────────────────────────────────────────
function reportTable(title, badge, headers, rows, exportType) {
  const exportBtn = exportType ? `<button type="button" class="btn btn-sm btn-outline" style="margin-left:auto" onclick="window.downloadReportSheet && window.downloadReportSheet('${exportType}')">${icon('download', 'icon-xs')} Export</button>` : '';
  return `<div class="card" style="padding:0">
    <div class="card-header" style="padding:16px 20px; display:flex; align-items:center;">
      <div class="card-title">${title}</div>
      ${badge ? `<div style="margin-left:12px">${badge}</div>` : ''}
      ${exportBtn}
    </div>
    <div class="table-wrapper" style="border:none;border-radius:0">
      <table><thead><tr>${headers}</tr></thead><tbody>${rows}</tbody></table>
    </div>
  </div>`;
}

function emptyReport(msg) {
  return `<div class="empty-state">${icon('inbox','icon-xl')}<h3 style="margin-top:12px">No Data</h3><p>${msg}</p></div>`;
}
