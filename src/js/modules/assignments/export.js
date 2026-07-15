import { pastors, churches, districts, churchAssignments } from '../../core/state.js';
import { icon } from '../../shared/utils/helpers.js';
import { openModal, closeModal } from '../../shared/components/modal.js';

// ── Assignments Export Options Modal ─────────────────────────
window.openAssignmentsExportModal = function () {
  openModal(
    `${icon('download')} Export Assignments Sheet`,
    `
    <div class="fade-in" style="display: flex; flex-direction: column; gap: 24px;">
      <p style="font-size: 14px; color: var(--text-muted); line-height: 1.5;">Download a detailed report of all active pastor assignments across all districts.</p>
      
      <div style="display: grid; grid-template-columns: 1fr; gap: 16px;">
        <div class="opt-content" style="padding: 24px; border: 2px solid var(--accent); border-radius: var(--radius-lg); background: var(--accent-dim); text-align: center; display: flex; flex-direction: column; align-items: center; gap: 12px;">
          <div class="opt-icon" style="width: 48px; height: 48px; border-radius: 12px; background: #fff; display: flex; align-items: center; justify-content: center; color: var(--accent); box-shadow: var(--shadow-sm);">
            ${icon('file-spreadsheet', 'icon-md')}
          </div>
          <div>
            <div class="opt-title" style="font-weight: 800; font-size: 14px; color: var(--accent); margin-bottom: 4px;">Active Assignments Only</div>
            <div class="opt-desc" style="font-size: 11px; color: var(--accent); opacity: 0.8; line-height: 1.4;">Generates a breakdown of currently deployed personnel.</div>
          </div>
        </div>
      </div>
    </div>
    `,
    `<button class="btn btn-secondary" onclick="closeModal()">${icon('x')} Cancel</button>
     <button class="btn btn-primary" onclick="_runAssignmentsExport()">${icon('download')} Generate Excel</button>`,
    'modal-md'
  );
};

window._runAssignmentsExport = async function () {
  closeModal();
  await downloadAssignmentsSheet();
};

window.downloadAssignmentsSheet = async function () {
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
  const ws = workbook.addWorksheet('Active Assignments');

  ws.columns = [
    { header: 'Pastor', key: 'pastor_name', width: 30 },
    { header: 'Church', key: 'church_name', width: 30 },
    { header: 'District', key: 'district_name', width: 25 },
    { header: 'Type', key: 'type', width: 15 },
    { header: 'Started', key: 'start_date', width: 15 }
  ];

  churchAssignments.filter(a => !a.end_date).forEach(a => {
    const p = pastors.find(x => x.pastor_id === a.pastor_id);
    const c = churches.find(x => x.church_id === a.church_id);
    const d = districts.find(x => x.district_id === a.district_id);
    ws.addRow({
      pastor_name: p ? p.pastor_name : 'Unknown',
      church_name: c ? c.church_name : 'Unknown',
      district_name: d ? d.district_name : 'Unknown',
      type: a.assignment_type_code,
      start_date: a.start_date
    });
  });

  const buffer = await workbook.xlsx.writeBuffer();
  const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `active_assignments_${new Date().toISOString().split('T')[0]}.xlsx`;
  a.click();
};
