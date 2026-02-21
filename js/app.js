
import { pastors, churches, districts, zones, churchAssignments, clearAllData, replaceData } from './data.js';
import { exportDatabaseToCSV, parseDatabaseFromCSV } from './csv_helper.js';
import { icon, showToast, assignmentBadge, formatDate, esc, pastorAvatar } from './utils.js';
import { renderPastors } from './pastors.js';
import { renderChurches } from './churches.js';
import { renderDistricts } from './districts.js';
import { renderAssignments } from './assignments.js';
import { renderReports } from './reports.js';
import { renderHelp } from './help.js';
let currentPage = 'dashboard';
export function updateNavCounts() {
  const elP = document.getElementById('nav-count-pastors');
  const elA = document.getElementById('nav-count-assignments');
  const elD = document.getElementById('nav-count-districts');
  const elC = document.getElementById('nav-count-churches');
  if (elP) elP.textContent = pastors.length;
  if (elA) elA.textContent = churchAssignments.filter(a => !a.end_date).length;
  if (elD) elD.textContent = districts.length;
  if (elC) elC.textContent = churches.length;
}
export function navigate(page) {
  currentPage = page;
  updateNavCounts();
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
          <button class="btn btn-sm btn-secondary" onclick="navigate('assignments')">${icon('arrow-right', 'icon-sm')} View All</button>
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
window.closeModal = closeModal;
window.handleOverlayClick = handleOverlayClick;
window.viewImage = function(url, title) {
  openModal(
    `${icon('image')} ${title || 'Image Preview'}`,
    `<div style="display:flex;justify-content:center;align-items:center;background:var(--bg-base);border-radius:var(--radius-md);overflow:hidden;padding:4px">
       <img src="${url}" style="max-width:100%;max-height:80vh;object-fit:contain;border-radius:var(--radius-sm)">
     </div>`,
    `<button class="btn btn-secondary" onclick="closeModal()">Close</button>`,
    'modal-lg'
  );
};
document.addEventListener('DOMContentLoaded', () => {
  document.querySelectorAll('.nav-item[data-page]').forEach(el => {
    el.addEventListener('click', () => navigate(el.dataset.page));
  });
  updateNavCounts();
  navigate('dashboard');
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
            <!-- Full Database Backup (Top, Full Width) -->
            <div style="border:1px solid var(--border-light);border-radius:var(--radius-md);padding:24px;background:var(--bg-card);box-shadow:0 1px 2px rgba(0,0,0,0.05)">
              <div style="margin-bottom:16px">
                <h3 style="font-size:18px;font-weight:600;margin-bottom:8px">Full Database Backup</h3>
                <p style="font-size:14px;color:var(--text-muted);line-height:1.5">Download the entire raw database structure. Keep this safe to restore your data later.</p>
              </div>
              <button class="btn btn-primary" style="width:100%;justify-content:center;padding:12px;font-size:15px;font-weight:600" onclick="downloadCSV()">${icon('download')} Download Full Backup</button>
            </div>

            <!-- Side-by-Side Cards (Stack on Mobile) -->
            <div style="display:grid;grid-template-columns:repeat(auto-fit, minmax(min(100%, 280px), 1fr));gap:20px">
              <!-- Custom User Exports -->
              <div style="border:1px solid var(--border-light);border-radius:var(--radius-md);padding:24px;background:var(--bg-card);box-shadow:0 1px 2px rgba(0,0,0,0.05);display:flex;flex-direction:column">
                <div style="flex-grow:1;margin-bottom:24px">
                  <h3 style="font-size:16px;font-weight:600;margin-bottom:8px">Export Spreadsheets</h3>
                  <p style="font-size:14px;color:var(--text-muted);line-height:1.5">Download custom formatted data views for Google Sheets or Excel.</p>
                </div>
                <div style="display:flex;flex-direction:column;gap:12px">
                  <button class="btn btn-secondary w-full" style="justify-content:center" onclick="downloadPastorsSheet()">${icon('users')} Pastors Sheet</button>
                  <button class="btn btn-secondary w-full" style="justify-content:center" onclick="downloadChurchesSheet()">${icon('church')} Churches Sheet</button>
                  <button class="btn btn-secondary w-full" style="justify-content:center" onclick="downloadDistrictsSheet()">${icon('map')} Districts & Zones Sheet</button>
                  <button class="btn btn-secondary w-full" style="justify-content:center" onclick="downloadReportsSheet()">${icon('clipboard-list')} Assignments & Reports Sheet</button>
                </div>
              </div>

              <!-- Import -->
              <div style="border:1px solid var(--border-light);border-radius:var(--radius-md);padding:24px;background:var(--bg-card);box-shadow:0 1px 2px rgba(0,0,0,0.05);display:flex;flex-direction:column">
                <div style="flex-grow:1;margin-bottom:24px">
                  <h3 style="font-size:16px;font-weight:600;margin-bottom:8px">Import Data</h3>
                  <p style="font-size:14px;color:var(--text-muted);line-height:1.5;margin-bottom:12px">Restore from a Full Database Backup CSV file.</p>
                  <p style="font-size:14px;color:var(--text-muted);line-height:1.5"><strong>New records will be merged</strong> with existing ones without overwriting them.</p>
                </div>
                <input type="file" id="csv-upload" accept=".csv" style="display:none" onchange="handleFileImport(this)">
                <button class="btn btn-secondary w-full" style="justify-content:center;padding:12px;font-size:14px;font-weight:600;background:var(--bg-base)" onclick="document.getElementById('csv-upload').click()">${icon('upload')} Select Backup File</button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  `;
}
window.downloadCSV = function() {
  const csv = exportDatabaseToCSV();
  const blob = new Blob([csv], { type: 'text/csv' });
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.setAttribute('hidden', '');
  a.setAttribute('href', url);
  a.setAttribute('download', 'churchms_database_backup.csv');
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
};
window.downloadPastorsSheet = async function() {
  const { exportPastorsToCSV } = await import('./csv_helper.js');
  const csv = exportPastorsToCSV();
  const blob = new Blob([csv], { type: 'text/csv' });
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.setAttribute('hidden', '');
  a.setAttribute('href', url);
  a.setAttribute('download', 'pastors_sheet.csv');
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
};
window.downloadChurchesSheet = async function() {
  const { exportChurchesToCSV } = await import('./csv_helper.js');
  const csv = exportChurchesToCSV();
  const blob = new Blob([csv], { type: 'text/csv' });
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.setAttribute('hidden', '');
  a.setAttribute('href', url);
  a.setAttribute('download', 'churches_sheet.csv');
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
};
window.downloadDistrictsSheet = async function() {
  const { exportDistrictsToCSV } = await import('./csv_helper.js');
  const csv = exportDistrictsToCSV();
  const blob = new Blob([csv], { type: 'text/csv' });
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.setAttribute('hidden', '');
  a.setAttribute('href', url);
  a.setAttribute('download', 'districts_sheet.csv');
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
};
window.downloadReportsSheet = async function() {
  const { exportAssignmentsToCSV } = await import('./csv_helper.js');
  const csv = exportAssignmentsToCSV();
  const blob = new Blob([csv], { type: 'text/csv' });
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.setAttribute('hidden', '');
  a.setAttribute('href', url);
  a.setAttribute('download', 'assignments_reports_sheet.csv');
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
};
window.handleFileImport = async function(input) {
  const file = input.files[0];
  if (!file) return;
  if (!confirm('This will merge the uploaded backup into your current database. Duplicates will be skipped. Continue?')) {
    input.value = ''; 
    return;
  }
  const { mergeData } = await import('./data.js');
  const reader = new FileReader();
  reader.onload = function(e) {
    try {
      const data = parseDatabaseFromCSV(e.target.result);
      if (!data) throw new Error('Failed to parse CSV');
      mergeData(data);
      alert('Backup merged successfully!');
      window.location.reload();
    } catch (err) {
      console.error(err);
      alert('Error importing data. Please check the file format.');
    }
  };
  reader.readAsText(file);
};
