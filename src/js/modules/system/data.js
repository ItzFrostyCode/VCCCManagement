import { showToast } from '../../shared/components/toast.js';

import { icon, esc } from '../../shared/utils/helpers.js';
import { openModal, closeModal } from '../../shared/components/modal.js';

import { 
  getFullBackupState, restoreFullBackupState, clearAllData, 
  pastors, churches, districts, zones, churchAssignments as assigns, disciples
} from '../../core/state.js';
import { 
  exportDatabaseToCSV, parseDatabaseFromCSV, 
  exportPastorsToCSV, exportChurchesToCSV, 
  exportDistrictsToCSV, exportAssignmentsToCSV 
} from '../../shared/utils/csv_helper.js';

export function renderDataPage() {
  const content = document.getElementById('page-content');
  if (!content) return;
  
  content.innerHTML = `
    <div class="fade-in">
      <div style="margin-bottom: 32px;">
        <h1 style="font-size: 28px; font-weight: 800; color: var(--text-primary); margin-bottom: 8px;">Database & Administration</h1>
        <p style="color: var(--text-muted); font-size: 15px;">Manage your local records, export data for reporting, or restore from a system backup.</p>
      </div>

      <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(350px, 1fr)); gap: 24px;">
        
        <!-- Export Section -->
        <div class="card" style="padding: 24px; border-top: 4px solid var(--accent);">
          <div style="display: flex; align-items: center; gap: 12px; margin-bottom: 24px;">
            <div style="width: 40px; height: 40px; border-radius: 12px; background: var(--accent-dim); color: var(--accent); display: flex; align-items: center; justify-content: center;">
              ${icon('download', 'icon-md')}
            </div>
            <div>
              <div style="font-size: 16px; font-weight: 800; color: var(--text-primary);">Data Export</div>
              <div style="font-size: 12px; color: var(--text-muted);">Download your data in various formats</div>
            </div>
          </div>

          <div style="display: flex; flex-direction: column; gap: 12px;">
            <button class="btn btn-primary" style="justify-content: flex-start; padding: 12px 16px;" onclick="downloadFullBackup()">
              ${icon('file-text', 'icon-sm')} <span>Export Full System Backup (.JSON)</span>
            </button>
            <button class="btn btn-secondary" style="justify-content: flex-start; padding: 12px 16px;" onclick="downloadCSV()">
              ${icon('file-spreadsheet', 'icon-sm')} <span>Export Raw Legacy Data (.CSV)</span>
            </button>
            
            <div style="margin: 12px 0 8px; font-size: 11px; font-weight: 800; text-transform: uppercase; color: var(--text-muted); letter-spacing: 0.1em; border-bottom: 1px solid var(--border); padding-bottom: 8px;">
              Specialized Reporting Sheets
            </div>
            
            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 12px;">
              <button class="btn btn-secondary btn-sm" onclick="downloadHierarchicalSheet()">${icon('list', 'icon-xs')} Directory</button>
              <button class="btn btn-secondary btn-sm" onclick="openPastorsExportModal()">${icon('users', 'icon-xs')} Pastors</button>
              <button class="btn btn-secondary btn-sm" onclick="openChurchesExportModal()">${icon('church', 'icon-xs')} Churches</button>
              <button class="btn btn-secondary btn-sm" onclick="openDistrictsExportModal()">${icon('map', 'icon-xs')} Districts</button>
              <button class="btn btn-secondary btn-sm" onclick="exportSelectedDisciples()">${icon('user-check', 'icon-xs')} Disciples</button>
            </div>
          </div>
        </div>

        <!-- Import Section -->
        <div class="card" style="padding: 24px; border-top: 4px solid var(--success);">
          <div style="display: flex; align-items: center; gap: 12px; margin-bottom: 24px;">
            <div style="width: 40px; height: 40px; border-radius: 12px; background: var(--success-dim); color: var(--success); display: flex; align-items: center; justify-content: center;">
              ${icon('upload', 'icon-md')}
            </div>
            <div>
              <div style="font-size: 16px; font-weight: 800; color: var(--text-primary);">Data Import</div>
              <div style="font-size: 12px; color: var(--text-muted);">Restore or sync records from a file</div>
            </div>
          </div>

          <div style="display: flex; flex-direction: column; gap: 16px;">
            <label class="btn btn-secondary" style="cursor:pointer; justify-content: flex-start; padding: 12px 16px;">
              ${icon('file-text', 'icon-sm')} <span>Import JSON Backup</span>
              <input type="file" id="json-import" accept=".json" style="display:none" onchange="handleJSONImport(event)">
            </label>
            
            <label class="btn btn-secondary" style="cursor:pointer; justify-content: flex-start; padding: 12px 16px;">
              ${icon('file-spreadsheet', 'icon-sm')} <span>Import CSV Data</span>
              <input type="file" id="csv-import" accept=".csv" style="display:none" onchange="handleCSVImport(event)">
            </label>

            <div style="background: #fffbeb; border: 1px solid #fde68a; padding: 16px; border-radius: var(--radius-lg); display: flex; gap: 12px;">
              <div style="color: #d97706; margin-top: 2px;">${icon('alert-triangle', 'icon-sm')}</div>
              <div style="font-size: 12px; color: #92400e; line-height: 1.5;">
                <strong>Import Notice:</strong> Data will be merged with your existing records. Duplicate IDs will be updated with new values.
              </div>
            </div>
          </div>
        </div>


      </div>
    </div>
  `;
  window.lucide?.createIcons?.();
}

window.renderDataPage = renderDataPage;

// --- Export/Import Logic Handlers ---

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
      const { parseDatabaseFromXLSX } = await import(`/src/js/shared/utils/xlsx_helper.js?v=${Date.now()}`);
      newData = await parseDatabaseFromXLSX(buffer, { pastors, churches, districts, zones });
    } else {
      const text = await file.text();
      newData = parseDatabaseFromCSV(text);
    }

    const { mergeData } = await import('../../core/state.js');
    const stats = await mergeData(newData);
    
    showToast(`Data imported. New: ${stats.added}, Updated: ${stats.replaced}`, 'success');
    window.navigate(section);
  } catch (err) {
    console.error('Import failed:', err);
    const msg = err.message || 'Unknown error';
    showToast(`Import failed: ${msg}. Please check the file format.`, 'error');
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

window.handleJSONImport = async function(e) {
  const file = e.target.files[0];
  if (!file) return;

  const reader = new FileReader();
  reader.onload = async (event) => {
    try {
      const data = JSON.parse(event.target.result);
      if (confirm('Are you sure you want to import this data? It will be merged with your current records.')) {
        import('../../core/state.js').then(async (module) => {
          await module.mergeData(data);
          showToast('Data imported and merged successfully!', 'success');
          setTimeout(() => window.location.reload(), 1500);
        });
      }
    } catch (err) {
      showToast('Invalid JSON file.', 'error');
    }
  };
  reader.readAsText(file);
};

window.handleCSVImport = async function(e) {
  const file = e.target.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = async (event) => {
     try {
       const text = event.target.result;
       const data = parseDatabaseFromCSV(text);
       const { mergeData } = await import('../../core/state.js');
        const stats = await mergeData(data);
       showToast(`Imported: ${stats.added} added, ${stats.replaced} updated.`, 'success');
       setTimeout(() => window.location.reload(), 1500);
     } catch (err) {
       showToast('Failed to parse CSV.', 'error');
     }
  };
  reader.readAsText(file);
};


window.handleFileImport = async function (input) {
  try {
    const file = input?.files?.[0];
    if (!file) return;

    const proceed = confirm(
      'This will merge the uploaded backup into your current database. Duplicates will be skipped. Continue?'
    );
    if (!proceed) {
      input.value = '';
      return;
    }

    const { mergeData } = await import('../../core/state.js');

    let parsed;
    const name = file.name.toLowerCase();

    if (name.endsWith('.xlsx') || name.endsWith('.xls')) {
      const buffer = await file.arrayBuffer();
      const { parseDatabaseFromXLSX } = await import(`/src/js/shared/utils/xlsx_helper.js?v=${Date.now()}`);
      parsed = await parseDatabaseFromXLSX(buffer, { pastors, churches, districts, zones });
    } else if (name.endsWith('.csv') || name.endsWith('.txt')) {
      const text = await file.text();
      parsed = parseDatabaseFromCSV(text);
    } else if (name.endsWith('.json')) {
      const text = await file.text();
      parsed = JSON.parse(text);
    } else {
      throw new Error('Unsupported file type. Please upload .xlsx, .csv, .txt, or .json.');
    }

    if (!parsed) throw new Error('Failed to parse uploaded file.');

    const stats = await mergeData(parsed) ?? { added: 0, replaced: 0, skipped: 0 };

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

    openModal(
      `${icon('database')} Import Results`,
      modalBody,
      `<button class="btn btn-primary" onclick="window.location.reload()">Finish & Reload</button>`,
      'modal-md'
    );
  } catch (err) {
    console.error('Import error:', err);
    alert(`Error importing data: ${err?.message || 'Unknown error'}`);
  } finally {
    try { if (input) input.value = ''; } catch (e) { /* ignore */ }
  }
};
window.importHierarchicalSheet = function() {
  const input = document.createElement('input');
  input.type = 'file';
  input.accept = '.xlsx,.xls,.csv,.json';
  input.onchange = e => handleFileImport(e.target);
  input.click();
};
window.exportFullDatabase = downloadFullBackup;
window.handleJSONImport = handleJSONImport;
window.handleJSONImport = handleJSONImport; // Re-expose as global for simple buttons
window.renderDataPage = renderDataPage;
