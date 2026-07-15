import { pastors } from '../../core/state.js';
import { icon } from '../../shared/utils/helpers.js';
import { openModal, closeModal } from '../../shared/components/modal.js';

// ── Pastors Export Options Modal ─────────────────────────────
window.openPastorsExportModal = function () {
  openModal(
    `${icon('download')} Export Pastors Sheet`,
    `
    <div class="fade-in" style="display: flex; flex-direction: column; gap: 24px;">
      <p style="font-size: 14px; color: var(--text-muted); line-height: 1.5;">Configure your export settings for the pastor directory including service dates and family details.</p>

      <label class="export-opt-card no-style" style="cursor: pointer; position: relative;">
        <input type="checkbox" id="export-include-images" checked style="position: absolute; opacity: 0;">
        <div class="opt-content" style="padding: 24px; border: 2px solid var(--accent); border-radius: var(--radius-lg); background: var(--accent-dim); transition: all 0.2s; text-align: center; display: flex; flex-direction: column; align-items: center; gap: 12px;">
          <div class="opt-icon" style="width: 48px; height: 48px; border-radius: 12px; background: #fff; display: flex; align-items: center; justify-content: center; color: var(--accent); box-shadow: var(--shadow-sm);">
            ${icon('image', 'icon-md')}
          </div>
          <div>
            <div class="opt-title" style="font-weight: 800; font-size: 14px; color: var(--accent); margin-bottom: 4px;">Profile Photos</div>
            <div class="opt-desc" style="font-size: 11px; color: var(--accent); opacity: 0.8; line-height: 1.4;">Embed images in XLSX file</div>
          </div>
        </div>
      </label>
    </div>
    `,
    `<button class="btn btn-secondary" onclick="closeModal()">${icon('x')} Cancel</button>
     <button class="btn btn-primary" onclick="_runPastorsExport()">${icon('download')} Generate Excel</button>`,
    'modal-md'
  );

  const cards = document.querySelectorAll('.export-opt-card');
  cards.forEach(card => {
    const input = card.querySelector('input');
    const content = card.querySelector('.opt-content');

    const update = () => {
      if (input.checked) {
        content.style.borderColor = 'var(--accent)';
        content.style.background = 'var(--accent-dim)';
        content.style.borderWidth = '2px';
      } else {
        content.style.borderColor = 'var(--border)';
        content.style.background = 'var(--bg-elevated)';
        content.style.borderWidth = '1px';
      }
    };

    input.addEventListener('change', update);
    update();
  });
};

window._runPastorsExport = async function () {
  const includeImages = document.getElementById('export-include-images')?.checked || false;
  closeModal();
  await downloadPastorsSheet(includeImages);
};

window.downloadPastorsSheet = async function (includeImages = true) {
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

  const cols = [
    { header: 'PastorName', key: 'pastor_name', width: 28 },
    { header: 'Birthdate', key: 'birth_date', width: 15 },
    { header: 'Start of Pastoring', key: 'pastoring_start_date', width: 20 },
    { header: 'WifeName', key: 'wife_name', width: 28 },
    { header: 'WifeBirthdate', key: 'wife_birth_date', width: 15 },
    { header: 'ContactNumber', key: 'contact_number', width: 18 },
    { header: 'PastorImage', key: 'pastor_image', width: 16 },
    { header: 'WifeImage', key: 'wife_image', width: 16 }
  ];
  ws.columns = cols;

  const imgCol = cols.length - 2; // second-to-last column (PastorImage)

  const headerRow = ws.getRow(1);
  headerRow.font = { bold: true, color: { argb: 'FF1A1A2E' } };
  headerRow.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFDCE6F1' } };
  headerRow.alignment = { vertical: 'middle', horizontal: 'center' };
  headerRow.height = 24;

  function parseDataUrl(dataUrl) {
    const m = dataUrl.match(/^data:image\/(\w+);base64,(.+)$/);
    if (!m) return null;
    const ext = m[1] === 'jpeg' || m[1] === 'jpg' ? 'jpeg' : 'png';
    return { base64: m[2], extension: ext };
  }

  const sorted = [...pastors].sort((a, b) => String(a.pastor_name || '').localeCompare(String(b.pastor_name || '')));

  for (let i = 0; i < sorted.length; i++) {
    const p = sorted[i];
    const hasImg =
      (p.image_url && p.image_url.startsWith('data:')) ||
      (p.wife_image_url && p.wife_image_url.startsWith('data:'));

    const rowData = {
      pastor_name: p.pastor_name || '',
      birth_date: p.birth_date || '',
      pastoring_start_date: p.pastoring_start_date || '',
      wife_name: p.wife_name || '',
      wife_birth_date: p.wife_birth_date || '',
      contact_number: p.contact_number || '',
      pastor_image: '',
      wife_image: ''
    };

    // Explicit row placement (not addRow's auto cursor): embedding an image
    // whose anchor box reaches into the next row confuses ExcelJS's internal
    // row cursor, causing addRow() to silently skip a row for every pastor
    // that has a photo. getRow(exact number) sidesteps that entirely.
    const row = ws.getRow(i + 2);
    row.values = cols.map(c => rowData[c.key]);
    if (hasImg) row.height = 80;
    row.alignment = { vertical: 'middle' };
    row.commit();

    const r0 = row.number - 1;
    const r1 = row.number;

    const addImg = (dataUrl, col0) => {
      const parsed = parseDataUrl(dataUrl);
      if (!parsed) return;
      const imgId = workbook.addImage({ base64: parsed.base64, extension: parsed.extension });
      ws.addImage(imgId, { tl: { col: col0, row: r0 }, br: { col: col0 + 1, row: r1 }, editAs: 'twoCell' });
    };

    if (includeImages && p.image_url && p.image_url.startsWith('data:')) addImg(p.image_url, imgCol);
    if (includeImages && p.wife_image_url && p.wife_image_url.startsWith('data:')) addImg(p.wife_image_url, imgCol + 1);
  }

  const buffer = await workbook.xlsx.writeBuffer();
  const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.setAttribute('hidden', '');
  a.setAttribute('href', url);
  const today = new Date().toISOString().split('T')[0];
  a.setAttribute('download', `pastors_sheet_${today}.xlsx`);
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
};
