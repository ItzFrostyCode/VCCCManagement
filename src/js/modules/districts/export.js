import { showToast } from '../../shared/components/toast.js';
import { pastors, churches, districts, zones, churchAssignments } from '../../core/state.js';
import { icon, esc, formatDate } from '../../shared/utils/helpers.js';
import { openModal, closeModal } from '../../shared/components/modal.js';

// ── Districts Export Options Modal ───────────────────────────
window.openDistrictsExportModal = function () {
  openModal(
    `${icon('download')} Export Districts Data`,
    `
    <div class="fade-in" style="display: flex; flex-direction: column; gap: 24px;">
      <p style="font-size: 14px; color: var(--text-muted); line-height: 1.5;">Choose the type of territorial report you wish to generate. Standard reports focus on counts, while detailed reports include personnel info.</p>
      
      <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 16px;">
        <label class="export-opt-card no-style" style="cursor: pointer; position: relative;">
          <input type="radio" name="dist-export-type" value="standard" checked style="position: absolute; opacity: 0;">
          <div class="opt-content" style="padding: 24px; border: 2px solid var(--accent); border-radius: var(--radius-lg); background: var(--accent-dim); transition: all 0.2s; text-align: center; display: flex; flex-direction: column; align-items: center; gap: 12px;">
            <div class="opt-icon" style="width: 48px; height: 48px; border-radius: 12px; background: #fff; display: flex; align-items: center; justify-content: center; color: var(--accent); box-shadow: var(--shadow-sm);">
              ${icon('table', 'icon-md')}
            </div>
            <div>
              <div class="opt-title" style="font-weight: 800; font-size: 14px; color: var(--accent); margin-bottom: 4px;">Standard Sheet</div>
              <div class="opt-desc" style="font-size: 11px; color: var(--accent); opacity: 0.8; line-height: 1.4;">Churches grouped by District</div>
            </div>
          </div>
        </label>

        <label class="export-opt-card no-style" style="cursor: pointer; position: relative;">
          <input type="radio" name="dist-export-type" value="detailed" style="position: absolute; opacity: 0;">
          <div class="opt-content" style="padding: 24px; border: 1px solid var(--border); border-radius: var(--radius-lg); background: var(--bg-elevated); transition: all 0.2s; text-align: center; display: flex; flex-direction: column; align-items: center; gap: 12px;">
            <div class="opt-icon" style="width: 48px; height: 48px; border-radius: 12px; background: var(--bg-base); display: flex; align-items: center; justify-content: center; color: var(--text-muted);">
              ${icon('file-text', 'icon-md')}
            </div>
            <div>
              <div class="opt-title" style="font-weight: 800; font-size: 14px; color: var(--text-primary); margin-bottom: 4px;">District Info</div>
              <div class="opt-desc" style="font-size: 11px; color: var(--text-muted); line-height: 1.4;">Profiles with pastor images</div>
            </div>
          </div>
        </label>
      </div>

      <div id="dist-standard-options" style="margin-top: 8px;">
        <label class="card" style="display: flex; align-items: center; gap: 12px; padding: 16px; border: 1px solid var(--border); background: var(--bg-elevated); cursor: pointer; transition: all 0.2s;">
          <input type="checkbox" id="district-export-include-zones" checked style="width: 20px; height: 20px; accent-color: var(--accent); cursor: pointer;">
          <div>
            <div style="font-size: 14px; font-weight: 800; color: var(--text-primary);">Include Regional Zones</div>
            <div style="font-size: 11px; color: var(--text-muted);">Breakdown churches further by zone coverage</div>
          </div>
        </label>
      </div>
    </div>
    `,
    `<button class="btn btn-secondary" onclick="closeModal()">${icon('x')} Cancel</button>
     <button class="btn btn-primary" onclick="_runDistrictsExportUnified()">${icon('arrow-right')} Continue</button>`,
    'modal-md'
  );

  const rads = document.querySelectorAll('input[name="dist-export-type"]');
  rads.forEach(rad => {
    rad.addEventListener('change', () => {
      document.getElementById('dist-standard-options').style.display = rad.value === 'standard' ? 'block' : 'none';

      rads.forEach(r => {
        const content = r.closest('label').querySelector('.opt-content');
        if (r.checked) {
          content.style.borderColor = 'var(--accent)';
          content.style.background = 'var(--accent-dim)';
          content.style.borderWidth = '2px';
          content.querySelector('.opt-title').style.color = 'var(--accent)';
          content.querySelector('.opt-icon').style.background = '#fff';
          content.querySelector('.opt-icon').style.color = 'var(--accent)';
          content.querySelector('.opt-icon').style.boxShadow = 'var(--shadow-sm)';
        } else {
          content.style.borderColor = 'var(--border)';
          content.style.background = 'var(--bg-elevated)';
          content.style.borderWidth = '1px';
          content.querySelector('.opt-title').style.color = 'var(--text-primary)';
          content.querySelector('.opt-icon').style.background = 'var(--bg-base)';
          content.querySelector('.opt-icon').style.color = 'var(--text-muted)';
          content.querySelector('.opt-icon').style.boxShadow = 'none';
        }
      });
    });
  });

  document.querySelector('input[name="dist-export-type"][value="standard"]')?.dispatchEvent(new Event('change'));
};

window._runDistrictsExportUnified = function () {
  const type = document.querySelector('input[name="dist-export-type"]:checked')?.value;
  if (type === 'standard') {
    const includeZones = document.getElementById('district-export-include-zones')?.checked ?? true;
    closeModal();
    downloadDistrictsSheet(includeZones);
  } else {
    window.openDistrictInfoExportModal();
  }
};

window.openDistrictInfoExportModal = function () {
  openModal(
    `${icon('file-text')} District Profiles Setup`,
    `
    <div class="fade-in" style="display: flex; flex-direction: column; gap: 20px;">
      <p style="font-size: 14px; color: var(--text-muted); line-height: 1.5;">Configure a high-fidelity report containing active personnel and station data for specific territories.</p>
      
      <div class="form-group">
        <label class="form-label">${icon('filter', 'icon-xs')} Report Scope</label>
        <div style="position: relative;">
          <div style="position: absolute; left: 12px; top: 50%; transform: translateY(-50%); color: var(--accent); z-index: 1;">
            ${icon('globe', 'icon-sm')}
          </div>
          <select id="dist-info-scope" onchange="_renderDistrictInfoSelectors()" class="form-select" style="padding-left: 40px; height: 48px; width: 100%;">
            <option value="all">Export All Districts</option>
            <option value="multi">Select Multiple Districts</option>
            <option value="single">Single District Selection</option>
          </select>
        </div>
      </div>

      <div id="dist-info-selector-container" style="display: none; max-height: 200px; overflow-y: auto; border: 1px solid var(--border); border-radius: var(--radius-lg); padding: 12px; background: var(--bg-elevated); box-shadow: inset 0 2px 4px rgba(0,0,0,0.02);">
      </div>

      <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 12px;">
        <label class="card hover-elevated" style="display: flex; align-items: center; gap: 10px; padding: 12px; border: 1px solid var(--border); cursor: pointer; transition: all 0.2s;">
          <input type="checkbox" id="dist-info-inc-pastor" style="width: 18px; height: 18px; accent-color: var(--accent); cursor: pointer;">
          <div>
            <div style="font-size: 13px; font-weight: 800; color: var(--text-primary);">Pastor Image</div>
            <div style="font-size: 10px; color: var(--text-muted);">Embed profile photo</div>
          </div>
        </label>
        <label class="card hover-elevated" style="display: flex; align-items: center; gap: 10px; padding: 12px; border: 1px solid var(--border); cursor: pointer; transition: all 0.2s;">
          <input type="checkbox" id="dist-info-inc-wife" style="width: 18px; height: 18px; accent-color: var(--accent); cursor: pointer;">
          <div>
            <div style="font-size: 13px; font-weight: 800; color: var(--text-primary);">Wife Image</div>
            <div style="font-size: 10px; color: var(--text-muted);">Embed spouse photo</div>
          </div>
        </label>
      </div>
    </div>
    `,
    `<button class="btn btn-secondary" onclick="closeModal()">${icon('x')} Cancel</button>
     <button class="btn btn-primary" onclick="_runDistrictInfoExport()">${icon('download')} Generate Report</button>`,
    'modal-lg'
  );
  setTimeout(() => window._renderDistrictInfoSelectors(), 0);
};

window._renderDistrictInfoSelectors = function () {
  const scope = document.getElementById('dist-info-scope')?.value;
  const container = document.getElementById('dist-info-selector-container');
  if (!container) return;

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
  } else if (scope === 'multi') {
    container.style.display = 'block';
    let html = `<div style="display:flex;flex-direction:column;gap:6px">`;
    districts.forEach(d => {
      html += `<label style="display:flex;align-items:center;gap:8px;cursor:pointer;font-size:13px"><input type="checkbox" class="dist-info-multi-cb" value="${d.district_id}"> ${esc(d.district_name)}</label>`;
    });
    html += `</div>`;
    container.innerHTML = html;
  }
};

window._runDistrictInfoExport = async function () {
  const scope = document.getElementById('dist-info-scope')?.value;
  let sIds = [];

  if (scope === 'single') {
    const val = document.getElementById('dist-info-single-select')?.value;
    if (val) sIds.push(+val);
  } else if (scope === 'multi') {
    const cbs = document.querySelectorAll('.dist-info-multi-cb:checked');
    cbs.forEach(cb => sIds.push(+cb.value));
    if (sIds.length === 0) {
      showToast('Please select at least one district.', 'error');
      return;
    }
  }

  const incP = document.getElementById('dist-info-inc-pastor')?.checked || false;
  const incW = document.getElementById('dist-info-inc-wife')?.checked || false;
  closeModal();
  await downloadDistrictInfoSheet(scope, sIds, incP, incW);
};

window.downloadDistrictsSheet = async function (includeZones = true) {
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
  const ws = workbook.addWorksheet('Districts');

  const cols = [
    { header: 'District', key: 'district_name', width: 25 },
    { header: 'Leader', key: 'leader_name', width: 25 }
  ];
  if (includeZones) {
    cols.push(
      { header: 'Zone', key: 'zone_name', width: 25 },
      { header: 'Church', key: 'church_name', width: 30 }
    );
  } else {
    cols.push({ header: 'Churches Count', key: 'church_count', width: 15 });
  }
  ws.columns = cols;

  const headerRow = ws.getRow(1);
  headerRow.font = { bold: true };
  headerRow.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFDCE6F1' } };

  districts.forEach(d => {
    const leader = pastors.find(p => p.pastor_id === d.leader_pastor_id);
    const distChurches = churches.filter(c => c.district_id === d.district_id);

    if (includeZones) {
      const distZones = zones.filter(z => z.district_id === d.district_id);
      distZones.forEach(z => {
        const zoneChurches = distChurches.filter(c => c.zone_id === z.zone_id);
        zoneChurches.forEach(c => {
          ws.addRow({
            district_name: d.district_name,
            leader_name: leader ? leader.pastor_name : 'No Leader',
            zone_name: z.zone_name,
            church_name: c.church_name
          });
        });
        if (zoneChurches.length === 0) {
          ws.addRow({
            district_name: d.district_name,
            leader_name: leader ? leader.pastor_name : 'No Leader',
            zone_name: z.zone_name,
            church_name: 'No Churches'
          });
        }
      });

      const unzoned = distChurches.filter(c => !c.zone_id);
      unzoned.forEach(c => {
        ws.addRow({
          district_name: d.district_name,
          leader_name: leader ? leader.pastor_name : 'No Leader',
          zone_name: 'Unzoned',
          church_name: c.church_name
        });
      });
    } else {
      ws.addRow({
        district_name: d.district_name,
        leader_name: leader ? leader.pastor_name : 'No Leader',
        church_count: distChurches.length
      });
    }
  });

  const buffer = await workbook.xlsx.writeBuffer();
  const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `districts_report_${new Date().toISOString().split('T')[0]}.xlsx`;
  a.click();
};

window.downloadDistrictInfoSheet = async function (scope, sIds, incP, incW) {
  if (!window.ExcelJS) {
    await new Promise((resolve, reject) => {
      const s = document.createElement('script');
      s.src = 'https://cdn.jsdelivr.net/npm/exceljs@4.4.0/dist/exceljs.min.js';
      s.onload = resolve;
      s.onerror = reject;
      document.head.appendChild(s);
    });
  }

  const targets = scope === 'all' ? districts : districts.filter(d => sIds.includes(d.district_id));
  if (targets.length === 0) {
    showToast('No districts to export.', 'error');
    return;
  }

  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'VCCC ChurchMS';

  for (const d of targets) {
    const ws = workbook.addWorksheet(d.district_name.substring(0, 31));
    ws.columns = [
      { header: 'Target', key: 'target', width: 30 },
      { header: 'Details', key: 'details', width: 50 }
    ];

    const leader = pastors.find(p => p.pastor_id === d.leader_pastor_id);

    ws.addRow({ target: 'District Name', details: d.district_name });
    ws.addRow({ target: 'District Leader', details: leader ? leader.pastor_name : 'Not set' });
    ws.addRow({});

    const churchesHeader = ws.addRow({ target: 'CHURCHES', details: '' });
    churchesHeader.font = { bold: true };

    const distChurches = churches.filter(c => c.district_id === d.district_id);
    distChurches.forEach(c => {
      const assign = churchAssignments.find(a => a.church_id === c.church_id && !a.end_date);
      const p = assign ? pastors.find(x => x.pastor_id === assign.pastor_id) : null;
      ws.addRow({ target: c.church_name, details: p ? p.pastor_name : 'No active pastor' });
    });
  }

  const buffer = await workbook.xlsx.writeBuffer();
  const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `district_info_export_${new Date().toISOString().split('T')[0]}.xlsx`;
  a.click();
};
