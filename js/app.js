
import { pastors, churches, districts, zones, churchAssignments, clearAllData, replaceData, getFullBackupState, restoreFullBackupState } from './data.js';
import { 
  exportDatabaseToCSV, parseDatabaseFromCSV, 
  exportPastorsToCSV, exportChurchesToCSV, 
  exportDistrictsToCSV, exportAssignmentsToCSV 
} from './csv_helper.js';
import { icon, showToast, assignmentBadge, formatDate, esc, pastorAvatar } from './utils.js';
import { renderPastors } from './pastors.js';
import { renderChurches } from './churches.js';
import { renderDistricts } from './districts.js';
import { renderAssignments } from './assignments.js';
import { renderReports } from './reports.js';
import { renderHelp } from './help.js';
let currentPage = 'dashboard';
export function navigate(page) {
  currentPage = page;
  localStorage.setItem('churchms_current_page', page);
  document.querySelectorAll('.nav-item').forEach(el => {
    el.classList.toggle('active', el.dataset.page === page);
  });
  document.querySelectorAll('.b-nav-item').forEach(el => {
    if (el.dataset.page) {
      el.classList.toggle('active', el.dataset.page === page);
    }
  });

  const fab = document.querySelector('.fab-container');
  if (fab) {
    if (['pastors', 'churches', 'districts', 'assignments'].includes(page)) {
      fab.classList.remove('hidden');
    } else {
      fab.classList.add('hidden');
    }
  }

  if (window.innerWidth <= 1024) {
    document.getElementById('sidebar').classList.remove('open');
    document.getElementById('sidebar-overlay').classList.remove('open');
  }
  const titles = {
    dashboard:   'Dashboard',
    pastors:     'Pastors',
    assignments: 'Assignments',
    districts:   'Districts & Zones',
    churches:    'Churches',
    reports:     'Reports',
    data:        'Data',
    help:        'Help & Guide',
  };
  document.getElementById('topbar-title').textContent = titles[page] || page;
  document.getElementById('topbar-actions').innerHTML = '';
  renderPage(page);
  lucide.createIcons();
}
function renderPage(page) {
  switch (page) {
    case 'dashboard':   renderDashboard();   break;
    case 'pastors':     renderPastors();     break;
    case 'assignments': renderAssignments(); break;
    case 'districts':   renderDistricts();   break;
    case 'churches':    renderChurches();    break;
    case 'reports':     renderReports();     break;
    case 'data':        renderDataPage();    break;
    case 'help':        renderHelp();        break;
  }
}
export function openModal(title, bodyHtml, footerHtml = '', size = '') {
  const overlay = document.getElementById('modal-overlay');
  const box     = document.getElementById('modal-box');
  document.getElementById('modal-title').innerHTML = title;
  document.getElementById('modal-body').innerHTML  = bodyHtml;
  document.getElementById('modal-footer').innerHTML = footerHtml;
  box.className = `modal ${size}`;
  overlay.classList.add('open');
  lucide.createIcons();
}
export function closeModal() {
  document.getElementById('modal-overlay').classList.remove('open');
}
export function handleOverlayClick(e) {
  if (e.target === document.getElementById('modal-overlay')) closeModal();
}

window.handleFabClick = function() {
  if (currentPage === 'pastors' && window.openAddPastorModal) {
    window.openAddPastorModal();
  } else if (currentPage === 'churches' && window.openAddChurchModal) {
    window.openAddChurchModal();
  } else if (currentPage === 'districts' && window.openAddDistrictModal) {
    window.openAddDistrictModal();
  } else if (currentPage === 'assignments' && window.openAddAssignmentModal) {
    window.openAddAssignmentModal();
  }
};

window.toggleSidebar = function() {
  document.getElementById('sidebar').classList.toggle('open');
  document.getElementById('sidebar-overlay').classList.toggle('open');
};
function renderDashboard() {
  const content = document.getElementById('page-content');
  const totalPastors          = pastors.length;
  const activePastors         = pastors.filter(p => p.status_code === 'active').length;
  const suspendedPastors      = pastors.filter(p => p.status_code === 'suspended').length;
  const interimPastors        = pastors.filter(p => p.status_code === 'interim').length;
  const undeployedPastors     = pastors.filter(p => p.status_code === 'undeployed').length;
  const totalDistricts        = districts.length;
  const totalZones            = zones.length;
  const mindanaoChurches      = churches.filter(c => !c.is_international).length;
  const internationalChurches = churches.filter(c => c.is_international).length;
  const recentAssignments = [...churchAssignments]
    .sort((a, b) => new Date(b.created_at || b.start_date) - new Date(a.created_at || a.start_date))
    .slice(0, 6);
  const isNew = totalPastors === 0 && churches.length === 0 && totalDistricts === 0;
  content.innerHTML = `<div class="fade-in">
    ${isNew ? `
    <div class="card" style="text-align:center;padding:48px 32px;margin-bottom:32px;border:2px dashed var(--border-light)">
      <div style="width:64px;height:64px;background:var(--accent-dim);border-radius:var(--radius-xl);display:flex;align-items:center;justify-content:center;margin:0 auto 20px">
        ${icon('church', 'icon-xl')} 
      </div>
      <h2 style="font-size:22px;font-weight:700;margin-bottom:8px">Welcome to ChurchMS</h2>
      <p style="color:var(--text-muted);max-width:480px;margin:0 auto 24px">Start by setting up your organization structure. Add districts, zones, and churches. Then add your pastors and assign them.</p>
      <div style="display:flex;gap:12px;justify-content:center;flex-wrap:wrap">
        <button class="btn btn-primary" onclick="navigate('pastors')">${icon('user-plus')} Add Pastor</button>
        <button class="btn btn-secondary" onclick="navigate('districts')">${icon('map')} Add District</button>
        <button class="btn btn-secondary" onclick="navigate('churches')">${icon('church')} Add Church</button>
      </div>
    </div>` : ''}
    <div class="stats-grid">
      <div class="stat-card">
        <div class="stat-icon" style="background:var(--accent-dim);color:var(--accent)">${icon('users', 'icon-md')}</div>
        <div class="stat-info">
          <div class="stat-value">${totalPastors}</div>
          <div class="stat-label">Total Pastors</div>
          <div class="stat-change text-success">${activePastors} active</div>
        </div>
      </div>
      <div class="stat-card">
        <div class="stat-icon" style="background:var(--success-dim);color:var(--success)">${icon('church', 'icon-md')}</div>
        <div class="stat-info">
          <div class="stat-value">${mindanaoChurches}</div>
          <div class="stat-label">Mindanao Churches</div>
          <div class="stat-change text-muted">${internationalChurches} international</div>
        </div>
      </div>
      <div class="stat-card">
        <div class="stat-icon" style="background:var(--info-dim);color:var(--info)">${icon('globe', 'icon-md')}</div>
        <div class="stat-info">
          <div class="stat-value">${internationalChurches}</div>
          <div class="stat-label">International Churches</div>
          <div class="stat-change text-muted">Churches abroad</div>
        </div>
      </div>
      <div class="stat-card">
        <div class="stat-icon" style="background:var(--purple-dim);color:var(--purple)">${icon('map', 'icon-md')}</div>
        <div class="stat-info">
          <div class="stat-value">${totalDistricts}</div>
          <div class="stat-label">Districts</div>
          <div class="stat-change text-muted">${totalZones} zones</div>
        </div>
      </div>
      <div class="stat-card">
        <div class="stat-icon" style="background:var(--warning-dim);color:var(--warning)">${icon('user-x', 'icon-md')}</div>
        <div class="stat-info">
          <div class="stat-value">${undeployedPastors}</div>
          <div class="stat-label">Undeployed</div>
          <div class="stat-change text-muted">Ready for assignment</div>
        </div>
      </div>
      <div class="stat-card">
        <div class="stat-icon" style="background:var(--danger-dim);color:var(--danger)">${icon('ban', 'icon-md')}</div>
        <div class="stat-info">
          <div class="stat-value">${suspendedPastors}</div>
          <div class="stat-label">Suspended Pastors</div>
          <div class="stat-change text-muted">${interimPastors} interim</div>
        </div>
      </div>
    </div>
    <div class="dashboard-grid">
      <div class="card" style="padding:0">
        <div class="card-header" style="padding:16px 20px">
          <div class="card-title">${icon('clock', 'icon-sm')} Recent Assignments</div>
          <button type="button" class="btn btn-sm btn-secondary" onclick="navigate('assignments')">${icon('arrow-right', 'icon-sm')} View All</button>
        </div>
        ${recentAssignments.length === 0
          ? `<div class="empty-state" style="padding:32px">${icon('inbox','icon-lg')}<p style="margin-top:12px">No assignments yet.</p></div>`
          : `<div class="table-wrapper" style="border:none;border-radius:0">
              <table>
                <thead><tr><th>Pastor</th><th>Church</th><th>Type</th><th>Since</th></tr></thead>
                <tbody>
                  ${recentAssignments.map(a => {
                    const p = pastors.find(x => x.pastor_id === a.pastor_id);
                    const c = churches.find(x => x.church_id === a.church_id);
                    return `<tr>
                      <td><div class="pastor-info">${pastorAvatar(p?.pastor_name||'?',p?.image_url,'sm')}<span class="pastor-name">${esc(p?.pastor_name||'Unknown')}</span></div></td>
                      <td class="td-muted">${c ? esc(c.church_name) : '—'}</td>
                      <td>${assignmentBadge(a.assignment_type_code)}</td>
                      <td class="td-muted">${formatDate(a.start_date)}</td>
                    </tr>`;
                  }).join('')}
                </tbody>
              </table>
            </div>`}
      </div>
      <div style="display:flex;flex-direction:column;gap:20px">
        <div class="card">
          <div class="card-title" style="margin-bottom:16px">${icon('pie-chart','icon-sm')} Status Breakdown</div>
          ${[
            { label:'Active',     count:activePastors,     color:'success' },
            { label:'Undeployed', count:undeployedPastors, color:'purple' },
            { label:'Suspended',  count:suspendedPastors,  color:'danger' },
            { label:'Interim',    count:interimPastors,    color:'warning' },
          ].map(s => `
            <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:10px">
              <div style="display:flex;align-items:center;gap:8px">
                <div style="width:8px;height:8px;border-radius:50%;background:var(--${s.color})"></div>
                <span style="font-size:13px;color:var(--text-secondary)">${s.label}</span>
              </div>
              <div style="display:flex;align-items:center;gap:8px">
                <div style="height:6px;width:${totalPastors > 0 ? Math.round((s.count/totalPastors)*80) : 0}px;background:var(--${s.color});border-radius:3px;min-width:4px"></div>
                <span style="font-size:13px;font-weight:600">${s.count}</span>
              </div>
            </div>`).join('')}
        </div>
        <div class="card">
          <div class="card-title" style="margin-bottom:16px">${icon('zap','icon-sm')} Quick Actions</div>
          <div style="display:flex;flex-direction:column;gap:8px">
            <button class="btn btn-secondary w-full" onclick="navigate('pastors')">${icon('user-plus')} Add Pastor</button>
            <button class="btn btn-secondary w-full" onclick="navigate('churches')">${icon('plus')} Add Church</button>
            <button class="btn btn-secondary w-full" onclick="navigate('districts')">${icon('map-pin')} Add District</button>
            <button class="btn btn-secondary w-full" onclick="navigate('assignments')">${icon('clipboard-list')} New Assignment</button>
          </div>
        </div>
      </div>
      </div>
    </div>
    <div style="margin-top: 40px; text-align: center; font-size: 13px; color: var(--text-muted); padding-top: 24px; border-top: 1px solid var(--border);">
      Created by <strong>Joshua Wayman A. Arabejo</strong><br>
      Church Management System &copy; 2025 - 2026
    </div>
  </div>`;
}
window.toggleSidebar = function() {
  document.getElementById('sidebar').classList.toggle('open');
};
window.navigate = navigate;
window.openModal = openModal;
window.closeModal = closeModal;
window.handleOverlayClick = handleOverlayClick;

export function updateNavCounts() {
  // Navigation badges were removed in a previous UI cleanup.
  // This function is kept as a no-op to maintain compatibility with sectional modules.
}
window.updateNavCounts = updateNavCounts;
window.viewImage = function(url, title) {
  openModal(
    `${icon('image')} ${title || 'Image Preview'}`,
    `<div style="display:flex;justify-content:center;align-items:center;background:var(--bg-base);border-radius:var(--radius-md);overflow:hidden;padding:4px">
       <img src="${url}" style="max-width:100%;max-height:80vh;object-fit:contain;border-radius:var(--radius-sm)">
     </div>`,
    `<button type="button" class="btn btn-secondary" onclick="closeModal()">Close</button>`,
    'modal-lg'
  );
};
document.addEventListener('DOMContentLoaded', () => {
  document.querySelectorAll('.nav-item[data-page]').forEach(el => {
    el.addEventListener('click', () => navigate(el.dataset.page));
  });
  updateNavCounts();
  
  const savedPage = localStorage.getItem('churchms_current_page') || 'dashboard';
  navigate(savedPage);
});
function renderDataPage() {
  const content = document.getElementById('page-content');
  content.innerHTML = `
    <div class="fade-in">
      <div class="card">
        <div class="card-header">
          <div class="card-title">${icon('database')} Data Management</div>
        </div>
        <div class="card-body">
          <p class="text-muted" style="margin-bottom:24px">
            Manage your local database. Export data for analysis or safely import a backup.
          </p>
          <div style="display:flex;flex-direction:column;gap:20px">
            <!-- Full Database Backup & Restore (Top, Full Width) -->
            <div class="leadership-grid" style="gap:20px">
              <!-- Backup -->
              <div style="border:1px solid var(--border-light);border-radius:var(--radius-md);padding:24px;background:var(--bg-card);box-shadow:0 1px 2px rgba(0,0,0,0.05);display:flex;flex-direction:column">
                <div style="margin-bottom:16px;flex:1">
                  <h3 style="font-size:18px;font-weight:600;margin-bottom:8px">Full Database Backup</h3>
                  <p style="font-size:14px;color:var(--text-muted);line-height:1.5">Download the entire raw database structure as a JSON file. Keep this safe to restore your data exactly as it is now.</p>
                </div>
                <button class="btn btn-primary" style="width:100%;justify-content:center;padding:12px;font-size:15px;font-weight:600" onclick="downloadFullBackup()">${icon('download')} Download Backup (.json)</button>
              </div>

              <!-- Restore -->
              <div style="border:1px solid var(--border-light);border-radius:var(--radius-md);padding:24px;background:var(--bg-card);box-shadow:0 1px 2px rgba(0,0,0,0.05);display:flex;flex-direction:column">
                <div style="margin-bottom:16px;flex:1">
                  <h3 style="font-size:18px;font-weight:600;margin-bottom:8px">Restore from Backup</h3>
                  <p style="font-size:14px;color:var(--text-muted);line-height:1.5">Restore your database from a previously downloaded .json backup. <span style="color:var(--danger);font-weight:600">This will overwrite all current data.</span></p>
                </div>
                <button class="btn btn-secondary" style="width:100%;justify-content:center;padding:12px;font-size:15px;font-weight:600" onclick="triggerRestoreBackup()">${icon('upload')} Upload & Restore Backup</button>
              </div>
            </div>

            <!-- Legacy CSV Backup (Optional) -->
            <div style="text-align:center;padding:8px">
               <button class="btn btn-link" style="font-size:12px;color:var(--text-muted)" onclick="downloadCSV()">${icon('file-text', 'icon-xs')} Download Legacy CSV Backup</button>
            </div>
          </div>
        </div>
      </div>
    </div>
  `;
}

// ── Sectional CSV Export/Import ──────────────────────────────

window.exportSectionCSV = function(section) {
  let csv = '';
  let filename = '';
  const now = new Date().toISOString().split('T')[0];

  switch(section) {
    case 'pastors':
      csv = exportPastorsToCSV();
      filename = `pastors_${now}.csv`;
      break;
    case 'churches':
      csv = exportChurchesToCSV();
      filename = `churches_${now}.csv`;
      break;
    case 'districts':
      csv = exportDistrictsToCSV();
      filename = `districts_${now}.csv`;
      break;
    case 'assignments':
      csv = exportAssignmentsToCSV();
      filename = `assignments_${now}.csv`;
      break;
  }

  if (csv) {
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.style.display = 'none';
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    window.URL.revokeObjectURL(url);
    document.body.removeChild(a);
  }
};

window.triggerImportCSV = function(section) {
  const input = document.createElement('input');
  input.type = 'file';
  input.accept = '.csv,.xlsx';
  input.onchange = e => {
    const file = e.target.files[0];
    if (file) handleSectionFileImport(file, section);
  };
  input.click();
};

async function handleSectionFileImport(file, section) {
  try {
    let newData;
    if (file.name.endsWith('.xlsx')) {
      const buffer = await file.arrayBuffer();
      const { parseDatabaseFromXLSX } = await import('./xlsx_helper.js');
      newData = await parseDatabaseFromXLSX(buffer);
    } else {
      const text = await file.text();
      newData = parseDatabaseFromCSV(text);
    }

    const { mergeData } = await import('./data.js');
    const stats = mergeData(newData);
    
    showToast(`Data imported. New: ${stats.added}, Updated: ${stats.replaced}`, 'success');
    navigate(section);
  } catch (err) {
    console.error('Import failed:', err);
    showToast('Import failed. Please check the file format.', 'error');
  }
}

window.downloadCSV = function() {
  const csv = exportDatabaseToCSV();
  const blob = new Blob([csv], { type: 'text/csv' });
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.setAttribute('hidden', '');
  a.setAttribute('href', url);
  const now = new Date().toISOString().split('T')[0];
  a.setAttribute('download', `churchms_legacy_backup_${now}.csv`);
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
};

window.downloadFullBackup = function() {
  const data = getFullBackupState();
  const json = JSON.stringify(data, null, 2);
  const blob = new Blob([json], { type: 'application/json' });
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.setAttribute('hidden', '');
  a.setAttribute('href', url);
  const now = new Date().toISOString().split('T')[0];
  a.setAttribute('download', `churchms_full_backup_${now}.json`);
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  showToast('Full backup (JSON) downloaded successfully.', 'success');
};

window.triggerRestoreBackup = function() {
  const input = document.createElement('input');
  input.type = 'file';
  input.accept = '.json';
  input.onchange = e => {
    const file = e.target.files[0];
    if (file) handleRestoreBackup(file);
  };
  input.click();
};

async function handleRestoreBackup(file) {
  if (!confirm('CRITICAL: This will PERMANENTLY OVERWRITE all current data in the system with the data from the backup file. Are you absolutely sure you want to proceed?')) {
    return;
  }

  try {
    const text = await file.text();
    const data = JSON.parse(text);
    
    restoreFullBackupState(data);
    
    showToast('Database restored successfully! Reloading...', 'success');
    setTimeout(() => {
      window.location.reload();
    }, 1500);
  } catch (err) {
    console.error('Restore failed:', err);
    showToast('Restore failed. Invalid backup file format.', 'error');
  }
}
// ── Pastors Export Options Modal ─────────────────────────────
window.openPastorsExportModal = function() {
  openModal(
    `${icon('download')} Export Pastors Sheet`,
    `<div style="display:flex;flex-direction:column;gap:16px;padding:4px 0">
      <p style="font-size:14px;color:var(--text-muted)">Choose what to include in the exported Excel file.</p>
      
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px">
        <label class="export-opt-card no-style">
          <input type="checkbox" id="export-include-id">
          <div class="opt-content">
            ${icon('fingerprint', 'icon-md')}
            <div class="opt-title">Include IDs</div>
            <div class="opt-desc">Internal system IDs for admin use.</div>
          </div>
        </label>
        <label class="export-opt-card no-style">
          <input type="checkbox" id="export-include-images" checked>
          <div class="opt-content">
            ${icon('image', 'icon-md')}
            <div class="opt-title">Include Photos</div>
            <div class="opt-desc">Embed images into the Excel sheet.</div>
          </div>
        </label>
      </div>
    </div>`,
    `<button class="btn btn-secondary" onclick="closeModal()">${icon('x')} Cancel</button>
     <button class="btn btn-primary" onclick="_runPastorsExport()">${icon('download')} Export Now</button>`,
    'modal-md'
  );
};

window._runPastorsExport = async function() {
  const includeId = document.getElementById('export-include-id')?.checked || false;
  const includeImages = document.getElementById('export-include-images')?.checked || false;
  closeModal();
  await downloadPastorsSheet(includeId, includeImages);
};

window.downloadPastorsSheet = async function(includeId = false) {
  // Load ExcelJS from CDN (only once)
  if (!window.ExcelJS) {
    await new Promise((resolve, reject) => {
      const s = document.createElement('script');
      s.src = 'https://cdn.jsdelivr.net/npm/exceljs@4.4.0/dist/exceljs.min.js';
      s.onload = resolve;
      s.onerror = reject;
      document.head.appendChild(s);
    });
  }

  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'VCCC ChurchMS';
  const ws = workbook.addWorksheet('Pastors');

  // ── Column definitions (PastorID optional) ────────────────────
  const cols = [];
  if (includeId) cols.push({ header: 'PastorID', key: 'pastor_id', width: 10 });
  cols.push(
    { header: 'PastorName',         key: 'pastor_name',          width: 28 },
    { header: 'Birthdate',          key: 'birth_date',           width: 15 },
    { header: 'Start of Pastoring', key: 'pastoring_start_date', width: 20 },
    { header: 'WifeName',           key: 'wife_name',            width: 28 },
    { header: 'WifeBirthdate',      key: 'wife_birth_date',      width: 15 },
    { header: 'ContactNumber',      key: 'contact_number',       width: 18 },
    { header: 'PastorImage',        key: 'pastor_image',         width: 16 },
    { header: 'WifeImage',          key: 'wife_image',           width: 16 },
  );
  ws.columns = cols;

  // Image columns: if ID included, pastor image = col 7 (H), wife = col 8 (I)
  //               if ID excluded, pastor image = col 6 (G), wife = col 7 (H)
  const imgCol = includeId ? 7 : 6;

  // ── Style header row ──────────────────────────────────────────
  const headerRow = ws.getRow(1);
  headerRow.font  = { bold: true, color: { argb: 'FF1A1A2E' } };
  headerRow.fill  = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFDCE6F1' } };
  headerRow.alignment = { vertical: 'middle', horizontal: 'center' };
  headerRow.height = 24;

  // ── Helper: parse data URL → { base64, extension } ───────────
  function parseDataUrl(dataUrl) {
    const m = dataUrl.match(/^data:image\/(\w+);base64,(.+)$/);
    if (!m) return null;
    const ext = m[1] === 'jpeg' || m[1] === 'jpg' ? 'jpeg' : 'png';
    return { base64: m[2], extension: ext };
  }

  // ── Build rows + embed images ─────────────────────────────────
  for (let i = 0; i < pastors.length; i++) {
    const p      = pastors[i];
    const hasImg = (p.image_url      && p.image_url.startsWith('data:'))
                || (p.wife_image_url && p.wife_image_url.startsWith('data:'));

    const rowData = {};
    if (includeId) rowData.pastor_id = p.pastor_id;
    rowData.pastor_name          = p.pastor_name          || '';
    rowData.birth_date           = p.birth_date           || '';
    rowData.pastoring_start_date = p.pastoring_start_date || '';
    rowData.wife_name            = p.wife_name            || '';
    rowData.wife_birth_date      = p.wife_birth_date      || '';
    rowData.contact_number       = p.contact_number       || '';
    rowData.pastor_image         = '';
    rowData.wife_image           = '';

    const row = ws.addRow(rowData);
    if (hasImg) row.height = 80;
    row.alignment = { vertical: 'middle' };

    const r0 = row.number - 1;
    const r1 = row.number;

    const addImg = (dataUrl, col0) => {
      const parsed = parseDataUrl(dataUrl);
      if (!parsed) return;
      const imgId = workbook.addImage({ base64: parsed.base64, extension: parsed.extension });
      ws.addImage(imgId, { tl: { col: col0, row: r0 }, br: { col: col0 + 1, row: r1 }, editAs: 'twoCell' });
    };

    if (p.image_url      && p.image_url.startsWith('data:'))      addImg(p.image_url,      imgCol);
    if (p.wife_image_url && p.wife_image_url.startsWith('data:')) addImg(p.wife_image_url, imgCol + 1);
  }

  // ── Download as .xlsx ─────────────────────────────────────────
  const buffer = await workbook.xlsx.writeBuffer();
  const blob   = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
  const url    = URL.createObjectURL(blob);
  const a      = document.createElement('a');
  a.setAttribute('hidden', '');
  a.setAttribute('href', url);
  const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
  a.setAttribute('download', `pastors_sheet_${today}.xlsx`);
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
};

// ── Churches Export Options Modal ────────────────────────────
window.openChurchesExportModal = function() {
  openModal(
    `${icon('download')} Export Churches Sheet`,
    `<div style="display:flex;flex-direction:column;gap:16px;padding:4px 0">
      <p style="font-size:14px;color:var(--text-muted)">Choose what to include in the exported Excel file.</p>

      <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px">
        <label class="export-opt-card no-style">
          <input type="checkbox" id="church-export-include-id">
          <div class="opt-content">
            ${icon('fingerprint', 'icon-md')}
            <div class="opt-title">Include IDs</div>
            <div class="opt-desc">Internal system IDs for admin use.</div>
          </div>
        </label>
        <label class="export-opt-card no-style">
          <input type="checkbox" id="church-export-include-pastor" checked>
          <div class="opt-content">
            ${icon('user-check', 'icon-md')}
            <div class="opt-title">Pastor Info</div>
            <div class="opt-desc">Include names and contact details.</div>
          </div>
        </label>
      </div>
    </div>`,
    `<button class="btn btn-secondary" onclick="closeModal()">${icon('x')} Cancel</button>
     <button class="btn btn-primary" onclick="_runChurchesExport()">${icon('download')} Export Now</button>`,
    'modal-md'
  );
};

window._runChurchesExport = async function() {
  const includeId     = document.getElementById('church-export-include-id')?.checked     || false;
  const includePastor = document.getElementById('church-export-include-pastor')?.checked  || false;
  closeModal();
  await downloadChurchesSheet(includeId, includePastor);
};

// ── Districts Export Options Modal ───────────────────────────
window.openDistrictsExportModal = function() {
  openModal(
    `${icon('download')} Export Districts Data`,
    `<div style="display:flex;flex-direction:column;gap:16px;padding:4px 0">
      <p style="font-size:14px;color:var(--text-muted)">Select the type of report you want to generate.</p>
      
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px">
        <label class="export-opt-card">
          <input type="radio" name="dist-export-type" value="standard" checked>
          <div class="opt-content">
            ${icon('table', 'icon-md')}
            <div class="opt-title">Standard Sheet</div>
            <div class="opt-desc">Churches grouped by Districts and Zones.</div>
          </div>
        </label>
        <label class="export-opt-card">
          <input type="radio" name="dist-export-type" value="detailed">
          <div class="opt-content">
            ${icon('file-text', 'icon-md')}
            <div class="opt-title">District Info</div>
            <div class="opt-desc">Detailed profiles with pastor images.</div>
          </div>
        </label>
      </div>

      <div id="dist-standard-options" style="margin-top:8px">
        <label style="display:flex;align-items:center;gap:12px;cursor:pointer;padding:12px;border:1px solid var(--border);border-radius:var(--radius-md);background:var(--bg-base)">
          <input type="checkbox" id="district-export-include-zones" checked style="width:16px;height:16px;accent-color:var(--accent);cursor:pointer">
          <span style="font-size:13px;font-weight:600">Include Zones</span>
        </label>
      </div>
    </div>`,
    `<button class="btn btn-secondary" onclick="closeModal()">${icon('x')} Cancel</button>
     <button class="btn btn-primary" onclick="_runDistrictsExportUnified()">${icon('download')} Continue</button>`,
    'modal-md'
  );

  // Toggle options visibility based on radio selection
  document.querySelectorAll('input[name="dist-export-type"]').forEach(rad => {
    rad.addEventListener('change', () => {
      document.getElementById('dist-standard-options').style.display = rad.value === 'standard' ? 'block' : 'none';
    });
  });
};

window._runDistrictsExportUnified = function() {
  const type = document.querySelector('input[name="dist-export-type"]:checked')?.value;
  if (type === 'standard') {
    const includeZones = document.getElementById('district-export-include-zones')?.checked ?? true;
    closeModal();
    downloadDistrictsSheet(includeZones);
  } else {
    // Switch to step 2: Detailed Info scope selection
    window.openDistrictInfoExportModal();
  }
};

// ── District Info Export Options Modal ───────────────────────────
window.openDistrictInfoExportModal = function() {
  openModal(
    `${icon('download')} Export District Info Sheet`,
    `<div style="display:flex;flex-direction:column;gap:16px;padding:4px 0">
      <p style="font-size:14px;color:var(--text-muted)">Export a formatted district sheet with assigned pastors and churches.</p>
      
      <div class="form-group">
        <label>${icon('filter', 'icon-xs')} Export Scope</label>
        <select id="dist-info-scope" onchange="_renderDistrictInfoSelectors()" class="form-select">
          <option value="all">1. All Districts</option>
          <option value="multi">2. Multi-Select Districts</option>
          <option value="single">3. Select 1 District</option>
        </select>
      </div>

      <div id="dist-info-selector-container" style="display:none; max-height: 150px; overflow-y: auto; border: 1px solid var(--border); border-radius: var(--radius-md); padding: 8px; background: var(--bg-card)">
      </div>

      <div style="display:flex;gap:12px;margin-top:8px">
        <label style="flex:1;display:flex;align-items:center;gap:8px;cursor:pointer;padding:10px;border:1px solid var(--border);border-radius:var(--radius-md);background:var(--bg-base)">
          <input type="checkbox" id="dist-info-inc-pastor" style="width:16px;height:16px;accent-color:var(--accent);cursor:pointer">
          <span style="font-size:13px;font-weight:600">Include Pastor Image</span>
        </label>
        <label style="flex:1;display:flex;align-items:center;gap:8px;cursor:pointer;padding:10px;border:1px solid var(--border);border-radius:var(--radius-md);background:var(--bg-base)">
          <input type="checkbox" id="dist-info-inc-wife" style="width:16px;height:16px;accent-color:var(--accent);cursor:pointer">
          <span style="font-size:13px;font-weight:600">Include Wife Image</span>
        </label>
      </div>
    </div>`,
    `<button class="btn btn-secondary" onclick="closeModal()">${icon('x')} Cancel</button>
     <button class="btn btn-primary" onclick="_runDistrictInfoExport()">${icon('download')} Export Now</button>`
  );

  setTimeout(() => window._renderDistrictInfoSelectors(), 0);
};

window._renderDistrictInfoSelectors = function() {
  const scope = document.getElementById('dist-info-scope')?.value;
  const container = document.getElementById('dist-info-selector-container');
  if (!container) return;
  
  import('./data.js').then(({ districts }) => {
    if (scope === 'all') {
      container.style.display = 'none';
      container.innerHTML = '';
    } else if (scope === 'single') {
      container.style.display = 'block';
      let html = `<select id="dist-info-single-select" class="form-select" style="width:100%">`;
      districts.forEach(d => {
        html += `<option value="${d.district_id}">${esc(d.district_name)}</option>`;
      });
      html += `</select>`;
      container.innerHTML = html;
      container.style.padding = '0';
      container.style.border = 'none';
      container.style.background = 'transparent';
    } else if (scope === 'multi') {
      container.style.display = 'block';
      container.style.padding = '8px';
      container.style.border = '1px solid var(--border)';
      container.style.background = 'var(--bg-card)';
      let html = `<div style="display:flex;flex-direction:column;gap:6px">`;
      districts.forEach(d => {
        html += `<label style="display:flex;align-items:center;gap:8px;cursor:pointer;font-size:13px">
                   <input type="checkbox" class="dist-info-multi-cb" value="${d.district_id}" style="accent-color:var(--accent);width:16px;height:16px;"> 
                   ${esc(d.district_name)}
                 </label>`;
      });
      html += `</div>`;
      container.innerHTML = html;
    }
  });
};

window._runDistrictInfoExport = async function() {
  const scope = document.getElementById('dist-info-scope')?.value;
  let selectedIds = [];
  
  if (scope === 'single') {
    const val = document.getElementById('dist-info-single-select')?.value;
    if (val) selectedIds.push(+val);
  } else if (scope === 'multi') {
    const cbs = document.querySelectorAll('.dist-info-multi-cb:checked');
    cbs.forEach(cb => selectedIds.push(+cb.value));
    if (selectedIds.length === 0) {
      const { showToast } = await import('./utils.js');
      showToast('Please select at least one district.', 'error');
      return;
    }
  }

  const incPastor = document.getElementById('dist-info-inc-pastor')?.checked || false;
  const incWife = document.getElementById('dist-info-inc-wife')?.checked || false;
  closeModal();
  await downloadDistrictInfoSheet(scope, selectedIds, incPastor, incWife);
};

window.downloadDistrictInfoSheet = async function(scope, selectedIds, incPastor, incWife) {
  if (!window.ExcelJS) {
    await new Promise((resolve, reject) => {
      const s = document.createElement('script');
      s.src = 'https://cdn.jsdelivr.net/npm/exceljs@4.4.0/dist/exceljs.min.js';
      s.onload = resolve;
      s.onerror = reject;
      document.head.appendChild(s);
    });
  }

  const { districts, churches, pastors, churchAssignments } = await import('./data.js');
  
  let targetDistricts = districts;
  if (scope !== 'all' && selectedIds.length > 0) {
    targetDistricts = districts.filter(d => selectedIds.includes(d.district_id));
  }
  
  if (targetDistricts.length === 0) return;

  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'VCCC ChurchMS';
  const today = new Date().toISOString().split('T')[0];

  function parseDataUrl(dataUrl) {
    if (!dataUrl) return null;
    const m = dataUrl.match(/^data:image\/(\w+);base64,(.+)$/);
    if (!m) return null;
    const ext = m[1] === 'jpeg' || m[1] === 'jpg' ? 'jpeg' : 'png';
    return { base64: m[2], extension: ext };
  }

  for (const d of targetDistricts) {
    let wsName = d.district_name.replace(/[\\/*?:\[\]]/g, '').substring(0, 31);
    let ws = workbook.getWorksheet(wsName);
    if (ws) {
      let suffix = 1;
      while (workbook.getWorksheet(`${wsName.substring(0,28)}_${suffix}`)) {
        suffix++;
      }
      wsName = `${wsName.substring(0,28)}_${suffix}`;
    }
    ws = workbook.addWorksheet(wsName);

    // Helper to convert hex (#RRGGBB) to Excel ARGB (FFRRGGBB)
    const toArgb = (hex) => {
      hex = (hex || '#1a1a2e').replace('#', '');
      return 'FF' + hex.toUpperCase();
    };

    const distArgb = toArgb(d.color);

    const titleRow = ws.getRow(1);
    titleRow.height = 36;
    const titleCell = titleRow.getCell(1);
    titleCell.value = `${d.district_name} Information Sheet`;
    titleCell.font = { bold: true, size: 16, color: { argb: distArgb } };
    titleCell.alignment = { vertical: 'middle', horizontal: 'center' };
    
    const cols = [
      { header: `${d.district_name}`, key: 'church', width: 34 },
      { header: "PASTOR'S NAME", key: 'pastor', width: 28 },
      { header: "WIFE'S NAME", key: 'wife', width: 28 },
      { header: 'CONTACT NUMBER', key: 'contact', width: 20 },
      { header: 'CHURCH ADDRESS', key: 'address', width: 40 }
    ];
    
    if (incPastor) cols.push({ header: 'PASTOR IMAGE', key: 'img_pastor', width: 16 });
    if (incWife) cols.push({ header: 'WIFE IMAGE', key: 'img_wife', width: 16 });
    
    ws.columns = cols;
    ws.mergeCells(1, 1, 1, cols.length);

    const headerRow = ws.getRow(2);
    headerRow.height = 24;
    cols.forEach((c, idx) => {
      const cell = headerRow.getCell(idx + 1);
      cell.value = c.header;
      cell.font = { bold: true, color: { argb: 'FFFFFFFF' } };
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: distArgb } };
      cell.alignment = { vertical: 'middle', horizontal: 'center' };
    });

    const distChurches = churches
      .filter(c => c.district_id === d.district_id)
      .sort((a,b) => {
        // Find if either church is assigned to the district leader
        const aAssign = churchAssignments.find(x => x.church_id === a.church_id && !x.end_date);
        const bAssign = churchAssignments.find(x => x.church_id === b.church_id && !x.end_date);
        const aIsLeader = aAssign && aAssign.pastor_id === d.leader_pastor_id;
        const bIsLeader = bAssign && bAssign.pastor_id === d.leader_pastor_id;

        if (aIsLeader && !bIsLeader) return -1;
        if (!aIsLeader && bIsLeader) return 1;
        return a.church_name.localeCompare(b.church_name);
      });

    let rowNum = 3;
    for (const c of distChurches) {
      const activeAssign = churchAssignments.find(a => a.church_id === c.church_id && !a.end_date);
      let pLine = '', wLine = '', cLine = '', pImgUrl = '', wImgUrl = '';
      let isLeaderChurch = false;

      if (activeAssign) {
        if (activeAssign.pastor_id === d.leader_pastor_id) isLeaderChurch = true;
        const p = pastors.find(x => x.pastor_id === activeAssign.pastor_id);
        if (p) {
          pLine = p.pastor_name || '';
          wLine = p.wife_name || '';
          cLine = p.contact_number || '';
          pImgUrl = p.image_url || '';
          wImgUrl = p.wife_image_url || '';
        }
      }

      const rowData = {
        church: c.church_name || '',
        pastor: pLine,
        wife: wLine,
        contact: cLine,
        address: c.church_address || ''
      };
      
      const row = ws.addRow(rowData);
      row.alignment = { vertical: 'middle', wrapText: true };
      
      if (isLeaderChurch) {
        // Apply Bold and +3 font size (assuming default is 11, we will set to 14) to Church Name
        const churchCell = row.getCell(cols.findIndex(x => x.key === 'church') + 1);
        churchCell.font = { bold: true, size: 14, color: { argb: 'FF000000' } };
      }
      
      let hasImg = false;
      if (incPastor && pImgUrl.startsWith('data:')) hasImg = true;
      if (incWife && wImgUrl.startsWith('data:')) hasImg = true;
      
      if (hasImg) row.height = 80;
      else row.height = 25;

      const r0 = row.number - 1;
      const r1 = row.number;

      const addImg = (dataUrl, colIdx) => {
        const parsed = parseDataUrl(dataUrl);
        if (!parsed) return;
        const imgId = workbook.addImage({ base64: parsed.base64, extension: parsed.extension });
        ws.addImage(imgId, { tl: { col: colIdx, row: r0 }, br: { col: colIdx + 1, row: r1 }, editAs: 'twoCell' });
      };

      if (incPastor && pImgUrl.startsWith('data:')) {
        addImg(pImgUrl, cols.findIndex(x => x.key === 'img_pastor'));
      }
      if (incWife && wImgUrl.startsWith('data:')) {
        addImg(wImgUrl, cols.findIndex(x => x.key === 'img_wife'));
      }
      
      rowNum++;
    }
  }

  const buffer = await workbook.xlsx.writeBuffer();
  const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.setAttribute('hidden', '');
  a.setAttribute('href', url);
  a.setAttribute('download', `District_Info_Sheets_${today}.xlsx`);
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
};

window.downloadChurchesSheet = async function(includeId = false, includePastor = false) {
  // Load ExcelJS from CDN (only once)
  if (!window.ExcelJS) {
    await new Promise((resolve, reject) => {
      const s = document.createElement('script');
      s.src = 'https://cdn.jsdelivr.net/npm/exceljs@4.4.0/dist/exceljs.min.js';
      s.onload = resolve;
      s.onerror = reject;
      document.head.appendChild(s);
    });
  }

  const { districts, zones, churchAssignments: assigns, pastors: pastorList } = await import('./data.js');

  const year     = new Date().getFullYear();
  const today    = new Date().toISOString().split('T')[0];
  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'VCCC ChurchMS';
  const ws = workbook.addWorksheet('Churches');

  // ── Columns (ChurchID optional, PastorInfo optional) ──────────
  const cols = [];
  if (includeId) cols.push({ header: 'ChurchID', key: 'church_id', width: 10 });
  cols.push(
    { header: `All Churches as of ${year}`, key: 'church_name',    width: 34 },
  );
  if (includePastor) {
    cols.push(
      { header: "Pastor's Name",  key: 'pastor_name', width: 26 },
      { header: "Wife's Name",    key: 'wife_name',   width: 26 },
      { header: 'Contact Number', key: 'contact',     width: 18 },
      { header: 'Church Address', key: 'church_address', width: 30 },
    );
  }
  ws.columns = cols;

  // ── Style header row ──────────────────────────────────────────
  const headerRow = ws.getRow(1);
  headerRow.font      = { bold: true, color: { argb: 'FF000000' } }; // Plain black font as requested
  headerRow.fill      = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFDCE6F1' } };
  headerRow.alignment = { vertical: 'middle', horizontal: 'center' };
  headerRow.height    = 24;

  // ── Sort churches A-Z ──────────────────────────────────────────
  const sorted = [...churches].sort((a, b) => a.church_name.localeCompare(b.church_name));

  // ── Data rows ──────────────────────────────────────────────────
  sorted.forEach((c, i) => {
    // Find active pastor assignment for this church
    let pastorName = '', wifeName = '', contactNum = '';
    let isLeaderChurch = false;
    
    // Check if the assigned pastor is a district leader for the church's district
    const activeAssign = assigns.find(a => a.church_id === c.church_id && !a.end_date);
    if (c.district_id && activeAssign) {
      const d = districts.find(dist => dist.district_id === c.district_id);
      if (d && activeAssign.pastor_id === d.leader_pastor_id) {
        isLeaderChurch = true;
      }
    }

    if (includePastor) {
      if (activeAssign) {
        const p = pastorList.find(x => x.pastor_id === activeAssign.pastor_id);
        if (p) {
          pastorName  = p.pastor_name   || '';
          wifeName    = p.wife_name     || '';
          contactNum  = p.contact_number || '';
        }
      }
    }

    const rowData = {};
    if (includeId) rowData.church_id = c.church_id;
    rowData.church_name    = c.church_name    || '';
    rowData.church_address = c.church_address || '';
    if (includePastor) {
      rowData.pastor_name = pastorName;
      rowData.wife_name   = wifeName;
      rowData.contact     = contactNum;
    }

    const row = ws.addRow(rowData);
    row.alignment = { vertical: 'middle' };
    
    if (isLeaderChurch) {
      const churchCell = row.getCell(cols.findIndex(x => x.key === 'church_name') + 1);
      churchCell.font = { bold: true, size: 14, color: { argb: 'FF000000' } };
    }
    
    if (i % 2 === 1) {
      row.eachCell(cell => {
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF8F9FA' } };
      });
    }
  });

  // ── Download as .xlsx ─────────────────────────────────────────
  const buffer = await workbook.xlsx.writeBuffer();
  const blob   = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
  const url    = URL.createObjectURL(blob);
  const a      = document.createElement('a');
  a.setAttribute('hidden', '');
  a.setAttribute('href', url);
  a.setAttribute('download', `church_sheet_${today}.xlsx`);
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
};
window.downloadDistrictsSheet = async function(includeZones = true) {
  // Load ExcelJS from CDN (only once)
  if (!window.ExcelJS) {
    await new Promise((resolve, reject) => {
      const s = document.createElement('script');
      s.src = 'https://cdn.jsdelivr.net/npm/exceljs@4.4.0/dist/exceljs.min.js';
      s.onload = resolve;
      s.onerror = reject;
      document.head.appendChild(s);
    });
  }

  const { districts: dList, zones: zList, churches: cList } = await import('./data.js');
  const today    = new Date().toISOString().split('T')[0];
  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'VCCC ChurchMS';
  const ws = workbook.addWorksheet('Districts');

  // ── Colour palette ────────────────────────────────────────────
  const DISTRICT_FILL = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1A1A2E' } };
  const DISTRICT_FONT = { bold: true, color: { argb: 'FFFFFFFF' }, size: 12 };
  const ZONE_FILL     = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFDCE6F1' } };
  const ZONE_FONT     = { bold: true, italic: true, color: { argb: 'FF1A1A2E' }, size: 11 };
  const CHURCH_FONT   = { size: 10 };

  // Helper to convert hex (#RRGGBB) to Excel ARGB (FFRRGGBB)
  const toArgb = (hex) => {
    hex = (hex || '#1a1a2e').replace('#', '');
    return 'FF' + hex.toUpperCase();
  };

  // Each district occupies one "data" column; columns are separated by one blank gap column.
  const distCount = dList.length;
  for (let di = 0; di < distCount; di++) {
    const colNum = 1 + di * 2; // columns 1, 3, 5, …
    ws.getColumn(colNum).width = 30;
    ws.getColumn(colNum + 1).width = 4; // gap column
  }

  // ── Row 1: District headers ───────────────────────────────────
  const headerRow = ws.getRow(1);
  headerRow.height = 26;
  dList.forEach((d, di) => {
    const colNum = 1 + di * 2;
    const cell = headerRow.getCell(colNum);
    cell.value      = d.district_name;
    cell.font       = DISTRICT_FONT;
    cell.fill       = { type: 'pattern', pattern: 'solid', fgColor: { argb: toArgb(d.color) } };
    cell.alignment  = { vertical: 'middle', horizontal: 'center' };
  });

  // ── Row 2: spacer ─────────────────────────────────────────────
  ws.getRow(2).height = 8;

  // ── Rows 3+: zones & churches per district ─────────────────
  const rowCursors = dList.map(() => 3);

  dList.forEach((d, di) => {
    const colNum  = 1 + di * 2;
    let cursor    = rowCursors[di];

    // If we're NOT including zones, just dump them all A-Z
    if (!includeZones) {
      const allDistChurches = cList
        .filter(c => c.district_id === d.district_id)
        .sort((a, b) => a.church_name.localeCompare(b.church_name));

      allDistChurches.forEach(c => {
        const cell = ws.getRow(cursor).getCell(colNum);
        cell.value     = c.church_name;
        cell.font      = CHURCH_FONT;
        cell.alignment = { vertical: 'middle' };
        cursor++;
      });
      return;
    }

    // Otherwise, do the Zone grouping layout
    const distZones = zList
      .filter(z => z.district_id === d.district_id)
      .sort((a, b) => a.zone_name.localeCompare(b.zone_name));

    if (distZones.length === 0) {
      const unzoned = cList
        .filter(c => c.district_id === d.district_id && !c.zone_id)
        .sort((a, b) => a.church_name.localeCompare(b.church_name));
      unzoned.forEach(c => {
        const cell = ws.getRow(cursor).getCell(colNum);
        cell.value     = c.church_name;
        cell.font      = CHURCH_FONT;
        cell.alignment = { vertical: 'middle' };
        cursor++;
      });
    } else {
      distZones.forEach((z, zi) => {
        // Zone header row
        const zoneCell = ws.getRow(cursor).getCell(colNum);
        zoneCell.value     = z.zone_name;
        zoneCell.font      = ZONE_FONT;
        zoneCell.fill      = ZONE_FILL;
        zoneCell.alignment = { vertical: 'middle', horizontal: 'left', indent: 1 };
        ws.getRow(cursor).height = 20;
        cursor++;

        // Churches in this zone
        const zoneChurches = cList
          .filter(c => c.zone_id === z.zone_id)
          .sort((a, b) => a.church_name.localeCompare(b.church_name));

        zoneChurches.forEach(c => {
          const cell = ws.getRow(cursor).getCell(colNum);
          cell.value     = c.church_name;
          cell.font      = CHURCH_FONT;
          cell.alignment = { vertical: 'middle', indent: 2 };
          cursor++;
        });

        // Blank separator
        if (zi < distZones.length - 1) cursor++;
      });

      // Show unzoned bottom
      const unzoned = cList
        .filter(c => c.district_id === d.district_id && !c.zone_id)
        .sort((a, b) => a.church_name.localeCompare(b.church_name));
      if (unzoned.length > 0) {
        cursor++;
        unzoned.forEach(c => {
          const cell = ws.getRow(cursor).getCell(colNum);
          cell.value     = c.church_name;
          cell.font      = CHURCH_FONT;
          cell.alignment = { vertical: 'middle', indent: 2 };
          cursor++;
        });
      }
    }
  });

  // ── Download as .xlsx ─────────────────────────────────────────
  const buffer = await workbook.xlsx.writeBuffer();
  const blob   = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
  const url    = URL.createObjectURL(blob);
  const a      = document.createElement('a');
  a.setAttribute('hidden', '');
  a.setAttribute('href', url);
  a.setAttribute('download', `districts_sheet_${today}.xlsx`);
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
};
window.downloadReportSheet = async function(type, pastorId = null) {
  if (!window.ExcelJS) {
    await new Promise((resolve, reject) => {
      const s = document.createElement('script');
      s.src = 'https://cdn.jsdelivr.net/npm/exceljs@4.4.0/dist/exceljs.min.js';
      s.onload = resolve;
      s.onerror = reject;
      document.head.appendChild(s);
    });
  }

  const { pastors, churches, districts, zones, churchAssignments } = await import('./data.js');
  const { formatDate, formatDateRange } = await import('./utils.js');

  const today = new Date().toISOString().split('T')[0];
  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'VCCC ChurchMS';
  
  let wsName = 'Report';
  let title = 'Report';
  let cols = [];
  let rowsData = [];

  const addRow = (ws, dataObj, isEven) => {
    const r = ws.addRow(dataObj);
    r.alignment = { vertical: 'middle' };
    r.height = 24;
    if (isEven) {
      r.eachCell(cell => { cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF8F9FA' } }; });
    }
    return r;
  };

  switch (type) {
    case 'suspended': {
      wsName = 'Suspended Pastors';
      title = 'Suspended Pastors Report';
      cols = [
        { header: 'Pastor', key: 'pastor', width: 25 },
        { header: 'Suspended On', key: 'date', width: 18 },
        { header: 'Previous Church', key: 'church', width: 25 },
        { header: 'Reason', key: 'reason', width: 40 }
      ];
      const list = pastors.filter(p => p.status_code === 'suspended');
      list.forEach(p => {
        const assign = churchAssignments.filter(a => a.pastor_id === p.pastor_id && a.assignment_type_code === 'suspended').sort((a,b)=>new Date(b.start_date)-new Date(a.start_date))[0];
        const prev = assign?.origin_church_id ? churches.find(c => c.church_id === assign.origin_church_id) : null;
        rowsData.push({
          pastor: p.pastor_name,
          date: assign ? formatDate(assign.start_date) : '-',
          church: prev ? prev.church_name : '-',
          reason: assign?.notes || '-'
        });
      });
      break;
    }
    case 'undeployed': {
      wsName = 'Undeployed Pastors';
      title = 'Undeployed Pastors Report';
      cols = [
        { header: 'Pastor', key: 'pastor', width: 25 },
        { header: 'Contact', key: 'contact', width: 18 },
        { header: 'Last Church', key: 'church', width: 25 },
        { header: 'Last Active', key: 'date', width: 18 },
        { header: 'Notes', key: 'notes', width: 40 }
      ];
      const list = pastors.filter(p => p.status_code === 'undeployed');
      list.forEach(p => {
        const last = churchAssignments.filter(a => a.pastor_id === p.pastor_id).sort((a,b)=>new Date(b.start_date)-new Date(a.start_date))[0];
        const lc = last?.church_id ? churches.find(c => c.church_id === last.church_id) : null;
        rowsData.push({
          pastor: p.pastor_name,
          contact: p.contact_number || '-',
          church: lc ? lc.church_name : 'No prior assignment',
          date: last ? formatDate(last.end_date||last.start_date) : '-',
          notes: p.notes || '-'
        });
      });
      break;
    }
    case 'interim': {
      wsName = 'Interim Pastors';
      title = 'Interim Pastors Report';
      cols = [
        { header: 'Pastor', key: 'pastor', width: 25 },
        { header: 'Current Church', key: 'church', width: 25 },
        { header: 'Since', key: 'date', width: 18 },
        { header: 'Notes', key: 'notes', width: 40 }
      ];
      const list = pastors.filter(p => p.status_code === 'interim');
      list.forEach(p => {
        const assign = churchAssignments.find(a => a.pastor_id === p.pastor_id && !a.end_date);
        const c = assign?.church_id ? churches.find(x => x.church_id === assign.church_id) : null;
        rowsData.push({
          pastor: p.pastor_name,
          church: c ? c.church_name : 'Unassigned',
          date: assign ? formatDate(assign.start_date) : '-',
          notes: p.notes || '-'
        });
      });
      break;
    }
    case 'vacant': {
      wsName = 'Vacant Churches';
      title = 'Vacant Churches Report';
      cols = [
        { header: 'Church', key: 'church', width: 25 },
        { header: 'Location', key: 'loc', width: 30 },
        { header: 'Last Pastor', key: 'pastor', width: 25 },
        { header: 'Vacated On', key: 'date', width: 18 }
      ];
      const list = churches.filter(c => !churchAssignments.some(a => a.church_id === c.church_id && !a.end_date));
      list.forEach(c => {
        const z = c.zone_id ? zones.find(x => x.zone_id === c.zone_id) : null;
        const d = z ? districts.find(x => x.district_id === z.district_id) : (c.district_id ? districts.find(x => x.district_id === c.district_id) : null);
        const last = churchAssignments.filter(a => a.church_id === c.church_id).sort((a,b)=>new Date(b.start_date)-new Date(a.start_date))[0];
        const p = last ? pastors.find(x => x.pastor_id === last.pastor_id) : null;
        rowsData.push({
          church: c.church_name,
          loc: [d?.district_name, z?.zone_name].filter(Boolean).join(' / '),
          pastor: p ? p.pastor_name : 'Never assigned',
          date: last ? formatDate(last.end_date) : '-'
        });
      });
      break;
    }
    case 'zone-coverage': {
      wsName = 'Zone Coverage';
      title = 'Zone Coverage Report';
      cols = [
        { header: 'District/Zone', key: 'name', width: 35 },
        { header: 'Total Churches', key: 'total', width: 15 },
        { header: 'Assigned', key: 'assigned', width: 15 },
        { header: 'Status', key: 'status', width: 25 }
      ];
      districts.forEach(d => {
        const dChurches = churches.filter(c => c.district_id === d.district_id || (c.zone_id && zones.find(z=>z.zone_id===c.zone_id)?.district_id === d.district_id));
        const dAssigned = dChurches.filter(c => churchAssignments.some(a => a.church_id === c.church_id && !a.end_date)).length;
        rowsData.push({
          name: `DISTRICT: ${d.district_name}`,
          total: dChurches.length,
          assigned: dAssigned,
          status: dChurches.length - dAssigned > 0 ? `${dChurches.length - dAssigned} Vacant` : 'All Assigned',
          _isBold: true
        });

        const dZones = zones.filter(z => z.district_id === d.district_id);
        dZones.forEach(z => {
          const zc = churches.filter(c => c.zone_id === z.zone_id);
          const za = zc.filter(c => churchAssignments.some(a => a.church_id === c.church_id && !a.end_date)).length;
          rowsData.push({
            name: `    Zone: ${z.zone_name}`,
            total: zc.length,
            assigned: za,
            status: zc.length - za > 0 ? `${zc.length - za} Vacant` : 'All Assigned'
          });
        });
      });
      break;
    }
    case 'international': {
      wsName = 'International';
      title = 'International Records';
      cols = [
        { header: 'Pastor', key: 'pastor', width: 25 },
        { header: 'Status', key: 'status', width: 15 },
        { header: 'Church', key: 'church', width: 25 },
        { header: 'Period', key: 'period', width: 25 },
        { header: 'Notes', key: 'notes', width: 40 }
      ];
      
      const intlAssignedIds = new Set();
      const intls = churchAssignments.filter(a => {
        if(a.assignment_type_code === 'international') { if(a.church_id) intlAssignedIds.add(a.church_id); return true; }
        const c = churches.find(x => x.church_id === a.church_id);
        if(c && c.is_international) { intlAssignedIds.add(a.church_id); return true; }
        return false;
      });
      
      intls.forEach(a => {
        const p = pastors.find(x => x.pastor_id === a.pastor_id);
        const c = a.church_id ? churches.find(x => x.church_id === a.church_id) : null;
        rowsData.push({
          pastor: p?.pastor_name || 'Unknown',
          status: a.end_date ? 'Ended' : 'Active',
          church: c?.church_name || '-',
          period: formatDateRange(a.start_date, a.end_date),
          notes: a.notes || '-'
        });
      });

      const unassigned = churches.filter(c => c.is_international && !intlAssignedIds.has(c.church_id));
      unassigned.forEach(c => {
        rowsData.push({
          pastor: 'Vacant',
          status: 'Unassigned',
          church: c.church_name,
          period: '-',
          notes: c.notes || '-'
        });
      });
      break;
    }
    case 'timeline': {
      wsName = 'Timeline';
      const pastor = pastors.find(p => p.pastor_id === +pastorId);
      title = `${pastor ? pastor.pastor_name : 'Pastor'} Timeline`;
      cols = [
        { header: 'Period', key: 'period', width: 25 },
        { header: 'Type', key: 'type', width: 15 },
        { header: 'Church', key: 'church', width: 25 },
        { header: 'Notes', key: 'notes', width: 40 }
      ];
      if (pastor) {
        const asgns = churchAssignments.filter(a => a.pastor_id === pastor.pastor_id).sort((a,b)=>new Date(a.start_date)-new Date(b.start_date));
        asgns.forEach(a => {
          const c = a.church_id ? churches.find(x => x.church_id === a.church_id) : null;
          let typeLabel = a.assignment_type_code;
          if(!a.end_date) typeLabel += ' (Current)';
          rowsData.push({
            period: formatDateRange(a.start_date, a.end_date),
            type: typeLabel.toUpperCase(),
            church: c ? c.church_name : 'No Church',
            notes: a.notes || '-'
          });
        });
      }
      break;
    }
  }

  const ws = workbook.addWorksheet(wsName);
  ws.columns = cols;

  // Header Title Row
  ws.insertRow(1, [title]);
  ws.mergeCells(1, 1, 1, cols.length);
  const titleCell = ws.getCell(1,1);
  titleCell.font = { bold: true, size: 16, color: { argb: 'FFFFFFFF' } };
  titleCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1A1A2E' } };
  titleCell.alignment = { vertical: 'middle', horizontal: 'center' };
  ws.getRow(1).height = 30;

  // Column Headers
  const headerRow = ws.getRow(2);
  headerRow.height = 24;
  cols.forEach((c, idx) => {
    const cell = headerRow.getCell(idx + 1);
    cell.font = { bold: true, color: { argb: 'FF000000' } };
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFDCE6F1' } };
    cell.alignment = { vertical: 'middle', horizontal: 'center' };
  });

  // Data
  rowsData.forEach((rowObj, i) => {
    const r = addRow(ws, rowObj, i % 2 === 1);
    if (rowObj._isBold) {
      r.font = { bold: true };
    }
  });

  const buffer = await workbook.xlsx.writeBuffer();
  const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.setAttribute('hidden', '');
  a.setAttribute('href', url);
  a.setAttribute('download', `${type}_report_${today}.xlsx`);
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
};

window.openAssignmentsExportModal = function() {
  openModal(
    `${icon('download')} Export Assignments`,
    `<div style="display:flex;flex-direction:column;gap:16px;padding:4px 0">
      <p style="font-size:14px;color:var(--text-muted)">Download the complete history of pastor assignments.</p>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px">
        <label class="export-opt-card">
          <input type="radio" name="assign-export-format" value="csv" checked>
          <div class="opt-content">
            ${icon('file-spreadsheet', 'icon-md')}
            <div class="opt-title">CSV Format</div>
            <div class="opt-desc">Best for simple data processing.</div>
          </div>
        </label>
        <label class="export-opt-card">
          <input type="radio" name="assign-export-format" value="xlsx">
          <div class="opt-content">
            ${icon('file-text', 'icon-md', 'text-success')}
            <div class="opt-title">Excel (.xlsx)</div>
            <div class="opt-desc">Formatted with colors and styles.</div>
          </div>
        </label>
      </div>
    </div>`,
    `<button class="btn btn-secondary" onclick="closeModal()">${icon('x')} Cancel</button>
     <button class="btn btn-primary" onclick="_runAssignmentsExport()">${icon('download')} Download</button>`,
    'modal-md'
  );
};

window._runAssignmentsExport = async function() {
  const format = document.querySelector('input[name="assign-export-format"]:checked')?.value;
  closeModal();
  if (format === 'xlsx') {
    await downloadReportsSheetXLSX();
  } else {
    await downloadReportsSheet();
  }
};

window.downloadReportsSheet = async function() {
  const { exportAssignmentsToCSV } = await import('./csv_helper.js');
  const csv = exportAssignmentsToCSV();
  const blob = new Blob([csv], { type: 'text/csv' });
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.setAttribute('hidden', '');
  a.setAttribute('href', url);
  const today = new Date().toISOString().split('T')[0];
  a.setAttribute('download', `assignment_sheet(${today}).csv`);
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
};

// export as global functions used by UI
window.downloadReportsSheetXLSX = async function () {
  // Keep current UX: show info toast and call CSV download for now.
  showToast('Excel format for assignments coming soon. Downloading CSV...', 'info');
  await downloadReportsSheet();
};

window.handleFileImport = async function (input) {
  try {
    const file = input?.files?.[0];
    if (!file) return;

    // Confirm destructive/merging operation with clear message
    const proceed = confirm(
      'This will merge the uploaded backup into your current database. Duplicates will be skipped. Continue?'
    );
    if (!proceed) {
      input.value = '';
      return;
    }

    // Dynamic import of merge function from data module
    const { mergeData } = await import('./data.js');

    // Parse uploaded file according to extension
    let parsed;
    const name = file.name.toLowerCase();

    if (name.endsWith('.xlsx') || name.endsWith('.xls')) {
      // XLSX: convert to buffer and delegate to helper
      const buffer = await file.arrayBuffer();
      const { parseDatabaseFromXLSX } = await import('./xlsx_helper.js');
      if (typeof parseDatabaseFromXLSX !== 'function') {
        throw new Error('XLSX parser not available (parseDatabaseFromXLSX).');
      }
      parsed = await parseDatabaseFromXLSX(buffer);
    } else if (name.endsWith('.csv') || name.endsWith('.txt')) {
      // CSV/TXT: try to import csv helper; fall back to global function if present
      const text = await file.text();
      let parseDatabaseFromCSV = null;
      try {
        const csvModule = await import('./csv_helper.js');
        parseDatabaseFromCSV = csvModule.parseDatabaseFromCSV;
      } catch (e) {
        // ignore import error — will attempt global
      }
      if (typeof parseDatabaseFromCSV !== 'function') {
        if (typeof window.parseDatabaseFromCSV === 'function') {
          parseDatabaseFromCSV = window.parseDatabaseFromCSV;
        } else {
          throw new Error('CSV parser not available (parseDatabaseFromCSV).');
        }
      }
      parsed = await parseDatabaseFromCSV(text);
    } else if (name.endsWith('.json')) {
      // Optional: support JSON backups
      const text = await file.text();
      parsed = JSON.parse(text);
    } else {
      throw new Error('Unsupported file type. Please upload .xlsx, .csv, .txt, or .json.');
    }

    if (!parsed) throw new Error('Failed to parse uploaded file.');

    // Merge parsed data into current DB
    // mergeData should return an object with numeric fields: added, replaced, skipped, etc.
    const rawStats = await mergeData(parsed) ?? {};
    const stats = {
      added: Number(rawStats.added) || 0,
      replaced: Number(rawStats.replaced) || 0,
      skipped: Number(rawStats.skipped) || 0,
      ...rawStats
    };

    // Build modal content (keeps visual structure you provided)
    const modalBody = `
      <div style="padding: 10px 0;">
        <p style="margin-bottom: 20px; color: var(--text-muted);">
          Import process completed successfully. Here is the summary of changes:
        </p>
        <div style="display: flex; flex-direction: column; gap: 12px;">
          <div style="display: flex; align-items: center; gap: 12px; padding: 12px; background: var(--success-dim); border-radius: var(--radius-md); color: var(--success);">
            ${icon('check-circle', 'icon-md')}
            <div>
              <div style="font-weight: 700; font-size: 15px;">${stats.added} Records Added</div>
              <div style="font-size: 12px; opacity: 0.8;">New records successfully inserted into the database.</div>
            </div>
          </div>

          <div style="display: flex; align-items: center; gap: 12px; padding: 12px; background: var(--info-dim); border-radius: var(--radius-md); color: var(--info);">
            ${icon('refresh-cw', 'icon-md')}
            <div>
              <div style="font-weight: 700; font-size: 15px;">${stats.replaced} Records Updated</div>
              <div style="font-size: 12px; opacity: 0.8;">Existing records synced and updated with new information.</div>
            </div>
          </div>

          <div style="display: flex; align-items: center; gap: 12px; padding: 12px; background: var(--bg-base); border-radius: var(--radius-md); border: 1px solid var(--border-light); color: var(--text-secondary);">
            ${icon('skip-forward', 'icon-md')}
            <div>
              <div style="font-weight: 700; font-size: 15px;">${stats.skipped} Records Skipped</div>
              <div style="font-size: 12px; opacity: 0.8;">Duplicates identified by name or ID and skipped to prevent clones.</div>
            </div>
          </div>
        </div>
      </div>
    `;

    // Show results and provide a final action button
    openModal(
      `${icon('database')} Import Results`,
      modalBody,
      `<button class="btn btn-primary" onclick="window.location.reload()">Finish & Reload</button>`,
      'modal-md'
    );
  } catch (err) {
    console.error('Import error:', err);
    // show a friendly alert + detailed console log (for debugging)
    alert(`Error importing data: ${err?.message || 'Unknown error'}`);
  } finally {
    // always clear input to allow re-uploading the same file if needed
    try { if (input) input.value = ''; } catch (e) { /* ignore */ }
  }
};