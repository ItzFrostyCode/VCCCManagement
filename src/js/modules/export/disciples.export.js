import { pastors, disciples } from '../../core/state.js';
import { showToast } from '../../shared/components/toast.js';

window.exportSelectedDisciples = async function () {
  if (disciples.length === 0) {
    showToast('No disciples to export.', 'info');
    return;
  }

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
  const ws = workbook.addWorksheet('Disciples');
  ws.columns = [
    { header: 'Full Name', key: 'full_name', width: 30 },
    { header: 'Contact', key: 'contact', width: 20 },
    { header: 'Mentor Pastor', key: 'pastor', width: 30 }
  ];

  disciples.forEach(d => {
    const p = pastors.find(x => x.pastor_id === d.pastor_id);
    ws.addRow({
      full_name: d.full_name,
      contact: d.contact_number,
      pastor: p ? p.pastor_name : 'Unknown'
    });
  });

  const buffer = await workbook.xlsx.writeBuffer();
  const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `disciples_list_${new Date().toISOString().split('T')[0]}.xlsx`;
  a.click();
};
