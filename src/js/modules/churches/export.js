import { showToast } from '../../shared/components/toast.js';
import { pastors, churches, districts, zones, churchAssignments } from '../../core/state.js';
import { exportChurchesToCSV } from '../../shared/utils/csv_helper.js';
import { icon, formatDate } from '../../shared/utils/helpers.js';
import { openModal, closeModal } from '../../shared/components/modal.js';

// ── Churches Export Options Modal ────────────────────────────
window.openChurchesExportModal = function () {
  openModal(
    `${icon('download')} Export Churches`,
    `
    <div class="fade-in" style="display: flex; flex-direction: column; gap: 24px;">
      <p style="font-size: 14px; color: var(--text-muted); line-height: 1.5;">Select an export template based on your needs. The "Import Template" is specifically for bulk updates and migration.</p>
      
      <div style="display: grid; grid-template-columns: 1fr; gap: 12px;">
        <label class="export-type-card no-style" style="cursor: pointer; position: relative; display: block;">
          <input type="radio" name="church-export-template" value="directory" checked style="position: absolute; opacity: 0;">
          <div class="opt-content" style="padding: 16px; border: 2px solid var(--accent); border-radius: var(--radius-lg); background: var(--accent-dim); transition: all 0.2s; display: flex; align-items: center; gap: 16px;">
            <div class="opt-icon" style="width: 40px; height: 40px; border-radius: 10px; background: #fff; display: flex; align-items: center; justify-content: center; color: var(--accent); box-shadow: var(--shadow-sm); flex-shrink: 0;">
              ${icon('book-open', 'icon-sm')}
            </div>
            <div style="flex: 1;">
              <div class="opt-title" style="font-weight: 800; font-size: 14px; color: var(--accent); margin-bottom: 2px;">Church Directory (Excel)</div>
              <div class="opt-desc" style="font-size: 11px; color: var(--accent); opacity: 0.8; line-height: 1.3;">Formatted for printing. Includes Pastors, Wives, and Contacts.</div>
            </div>
          </div>
        </label>

        <label class="export-type-card no-style" style="cursor: pointer; position: relative; display: block;">
          <input type="radio" name="church-export-template" value="import" style="position: absolute; opacity: 0;">
          <div class="opt-content" style="padding: 16px; border: 1px solid var(--border); border-radius: var(--radius-lg); background: var(--bg-elevated); transition: all 0.2s; display: flex; align-items: center; gap: 16px;">
            <div class="opt-icon" style="width: 40px; height: 40px; border-radius: 10px; background: var(--bg-base); display: flex; align-items: center; justify-content: center; color: var(--text-muted); flex-shrink: 0;">
              ${icon('file-code', 'icon-sm')}
            </div>
            <div style="flex: 1;">
              <div class="opt-title" style="font-weight: 800; font-size: 14px; color: var(--text-primary); margin-bottom: 2px;">Data Import Template (CSV)</div>
              <div class="opt-desc" style="font-size: 11px; color: var(--text-muted); line-height: 1.3;">Optimized for re-import. Includes Address, District, Zone, and Notes.</div>
            </div>
          </div>
        </label>

        <label class="export-type-card no-style" style="cursor: pointer; position: relative; display: block;">
          <input type="radio" name="church-export-template" value="add_new" style="position: absolute; opacity: 0;">
          <div class="opt-content" style="padding: 16px; border: 1px solid var(--border); border-radius: var(--radius-lg); background: var(--bg-elevated); transition: all 0.2s; display: flex; align-items: center; gap: 16px;">
            <div class="opt-icon" style="width: 40px; height: 40px; border-radius: 10px; background: var(--bg-base); display: flex; align-items: center; justify-content: center; color: var(--text-muted); flex-shrink: 0;">
              ${icon('file-plus-2', 'icon-sm')}
            </div>
            <div style="flex: 1;">
              <div class="opt-title" style="font-weight: 800; font-size: 14px; color: var(--text-primary); margin-bottom: 2px;">Add New (Excel Template)</div>
              <div class="opt-desc" style="font-size: 11px; color: var(--text-muted); line-height: 1.3;">Clean template for bulk adding new records. No IDs included.</div>
            </div>
          </div>
        </label>

        <label class="export-type-card no-style" style="cursor: pointer; position: relative; display: block;">
          <input type="radio" name="church-export-template" value="master" style="position: absolute; opacity: 0;">
          <div class="opt-content" style="padding: 16px; border: 1px solid var(--border); border-radius: var(--radius-lg); background: var(--bg-elevated); transition: all 0.2s; display: flex; align-items: center; gap: 16px;">
            <div class="opt-icon" style="width: 40px; height: 40px; border-radius: 10px; background: var(--bg-base); display: flex; align-items: center; justify-content: center; color: var(--text-muted); flex-shrink: 0;">
              ${icon('database', 'icon-sm')}
            </div>
            <div style="flex: 1;">
              <div class="opt-title" style="font-weight: 800; font-size: 14px; color: var(--text-primary); margin-bottom: 2px;">Master List (Excel)</div>
              <div class="opt-desc" style="font-size: 11px; color: var(--text-muted); line-height: 1.3;">Comprehensive spreadsheet including System IDs and audit data.</div>
            </div>
          </div>
        </label>
      </div>
    </div>
    `,
    `<button class="btn btn-secondary" onclick="closeModal()">${icon('x')} Cancel</button>
     <button class="btn btn-primary" onclick="_runChurchesExport()">${icon('download')} Start Export</button>`,
    'modal-md'
  );

  const cards = document.querySelectorAll('.export-type-card');
  cards.forEach(card => {
    const input = card.querySelector('input');
    const content = card.querySelector('.opt-content');
    const iconDiv = card.querySelector('.opt-icon');
    const title = card.querySelector('.opt-title');
    const desc = card.querySelector('.opt-desc');
    
    const update = () => {
      if (input.checked) {
        content.style.borderColor = 'var(--accent)';
        content.style.background = 'var(--accent-dim)';
        content.style.borderWidth = '2px';
        iconDiv.style.background = '#fff';
        iconDiv.style.color = 'var(--accent)';
        iconDiv.style.boxShadow = 'var(--shadow-sm)';
        title.style.color = 'var(--accent)';
        desc.style.color = 'var(--accent)';
        desc.style.opacity = '0.8';
      } else {
        content.style.borderColor = 'var(--border)';
        content.style.background = 'var(--bg-elevated)';
        content.style.borderWidth = '1px';
        iconDiv.style.background = 'var(--bg-base)';
        iconDiv.style.color = 'var(--text-muted)';
        iconDiv.style.boxShadow = 'none';
        title.style.color = 'var(--text-primary)';
        desc.style.color = 'var(--text-muted)';
        desc.style.opacity = '1';
      }
    };
    input.addEventListener('change', () => {
      document.querySelectorAll('.export-type-card input').forEach(i => i.dispatchEvent(new Event('manual-update')));
    });
    input.addEventListener('manual-update', update);
    update();
  });
};

window._runChurchesExport = async function () {
  const template = document.querySelector('input[name="church-export-template"]:checked')?.value || 'directory';
  closeModal();

  if (template === 'import') {
    const csv = exportChurchesToCSV();
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `churches_import_template_${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    showToast('Import-ready CSV exported.', 'success');
    return;
  }

  await downloadChurchesSheet(template);
};

window.downloadChurchesSheet = async function (template = 'directory') {
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
  workbook.creator = 'VCCC Pastoral Deployment & Records System';
  const ws = workbook.addWorksheet('Churches');
  const today = new Date().toISOString().split('T')[0];

  const cols = [];
  if (template === 'master') {
    cols.push({ header: 'ChurchID', key: 'church_id', width: 10 });
  }
  
  // Standard columns for identification and data entry
  cols.push(
    { header: 'Church Name', key: 'church_name', width: 34 },
    { header: 'Address', key: 'church_address', width: 40 }
  );

  if (template === 'master' || template === 'directory') {
    cols.push(
      { header: "Senior Pastor", key: 'pastor_name', width: 26 },
      { header: "Pastor's Wife", key: 'wife_name', width: 26 },
      { header: 'Contact', key: 'contact', width: 18 }
    );
  }

  // District and Zone mapping (names used for matching during import if IDs are missing)
  cols.push(
    { header: 'District', key: 'district_name', width: 20 },
    { header: 'Zone', key: 'zone_name', width: 20 }
  );

  if (template === 'master' || template === 'add_new') {
    cols.push(
      { header: 'Is International', key: 'intl', width: 22 },
      { header: 'Notes', key: 'notes', width: 40 }
    );
  }

  if (template === 'master') {
    cols.push(
      { header: 'Created At', key: 'created_at', width: 20 },
      { header: 'Updated At', key: 'updated_at', width: 20 }
    );
  }
  
  ws.columns = cols;

  const headerRow = ws.getRow(1);
  headerRow.font = { bold: true, color: { argb: 'FF000000' } };
  headerRow.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFDCE6F1' } };
  headerRow.alignment = { vertical: 'middle', horizontal: 'center' };
  headerRow.height = 24;

  // For the 'add_new' template, we just want the headers and maybe a sample row
  if (template === 'add_new') {
    ws.addRow({
      church_name: 'Example Church Name',
      church_address: '123 Street, Brgy, City',
      district_name: districts[0]?.district_name || 'Main District',
      zone_name: zones[0]?.zone_name || 'Zone 1',
      intl: 'No',
      notes: 'Sample note for reference'
    });
    
    // Add data validation for International column
    ws.dataValidations.add('E2:E1000', {
      type: 'list',
      allowBlank: true,
      formulae: ['"Yes,No"']
    });
  } else {
    const sorted = [...churches].sort((a, b) => a.church_name.localeCompare(b.church_name));

    sorted.forEach((c, i) => {
      let pastorName = '';
      let wifeName = '';
      let contactNum = '';
      let isLeaderChurch = false;

      const activeAssign = churchAssignments.find(a => a.church_id === c.church_id && !a.end_date);
      const d = districts.find(dist => dist.district_id === c.district_id);
      const z = zones.find(zone => zone.zone_id === c.zone_id);

      if (c.district_id && activeAssign) {
        if (d && activeAssign.pastor_id === d.leader_pastor_id) isLeaderChurch = true;
      }

      if (template === 'master' || template === 'directory') {
        if (activeAssign) {
          const p = pastors.find(x => x.pastor_id === activeAssign.pastor_id);
          if (p) {
            pastorName = p.pastor_name || '';
            wifeName = p.wife_name || '';
            contactNum = p.contact_number || '';
          }
        }
      }

      const rowData = {};
      if (template === 'master') {
        rowData.church_id = c.church_id;
      }
      rowData.church_name = c.church_name || '';
      if (template === 'master' || template === 'directory') {
        rowData.pastor_name = pastorName;
        rowData.wife_name = wifeName;
        rowData.contact = contactNum;
      }
      rowData.church_address = c.church_address || '';

      rowData.district_name = d ? d.district_name : '';
      rowData.zone_name = z ? z.zone_name : '';

      if (template === 'master' || template === 'add_new') {
        rowData.intl = c.is_international ? 'Yes' : 'No';
        rowData.notes = c.notes || '';
      }

      if (template === 'master') {
        rowData.created_at = formatDate(c.created_at, 'YYYY-MM-DD HH:mm:ss');
        rowData.updated_at = formatDate(c.updated_at, 'YYYY-MM-DD HH:mm:ss');
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
  }

  const filename = template === 'add_new' ? `church_import_template_${today}.xlsx` : `church_sheet_${today}.xlsx`;

  const buffer = await workbook.xlsx.writeBuffer();
  const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.setAttribute('hidden', '');
  a.setAttribute('href', url);
  a.setAttribute('download', filename);
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
};
