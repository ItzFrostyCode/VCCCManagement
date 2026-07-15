import { pastors, churches, districts, churchAssignments, conferences, meals, mealAttendance, disciples } from '../../core/state.js';
import { formatDateRange } from '../../shared/utils/helpers.js';

window.downloadHierarchicalSheet = async function () {
  if (window.downloadDistrictsSheet) {
    await window.downloadDistrictsSheet(true);
  }
};

window.downloadReportSheet = async function (type, extraData) {
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
  const ws = workbook.addWorksheet('Report');

  if (type === 'timeline' && extraData) {
    const p = pastors.find(x => x.pastor_id === +extraData);
    if (!p) return;
    ws.name = `Timeline - ${p.pastor_name.substring(0, 20)}`;
    ws.columns = [
      { header: 'Period', key: 'period', width: 30 },
      { header: 'Church', key: 'church', width: 30 },
      { header: 'Type', key: 'type', width: 15 }
    ];
    const assignments = churchAssignments
      .filter(a => a.pastor_id === p.pastor_id)
      .sort((a, b) => new Date(a.start_date) - new Date(b.start_date));
    assignments.forEach(a => {
      const c = churches.find(x => x.church_id === a.church_id);
      ws.addRow({
        period: formatDateRange(a.start_date, a.end_date),
        church: c ? c.church_name : 'No Church',
        type: a.assignment_type_code
      });
    });
  } else if (type === 'pullout' || type === 'suspended') {
    const pulloutArr = pastors.filter(p => p.status_code === 'pullout' || p.status_code === 'suspended');
    ws.columns = [
      { header: 'Pastor', key: 'name', width: 30 },
      { header: 'Notes', key: 'notes', width: 50 }
    ];
    pulloutArr.forEach(p => ws.addRow({ name: p.pastor_name, notes: p.notes }));
  } else if (type === 'conference-meals-detailed' && extraData) {
    const cId = +extraData;
    const c = conferences.find(x => x.conference_id === cId);
    if (!c) return;
    
    ws.name = `Meals - ${c.theme.substring(0, 20).replace(/[^a-zA-Z0-9 ]/g, '')}`;
    
    ws.columns = [
      { header: 'Delegate Name', key: 'name', width: 30 },
      { header: 'Category', key: 'category', width: 15 },
      { header: 'Day & Meal', key: 'meal_slot', width: 20 },
      { header: 'Scan Time', key: 'scanned_at', width: 25 }
    ];
    
    const headerRow = ws.getRow(1);
    headerRow.font = { bold: true };
    headerRow.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFDCE6F1' } };

    const confMeals = meals.filter(m => m.conference_id === cId);
    const confMealIds = confMeals.map(m => m.meal_id);
    
    const records = mealAttendance
      .filter(a => confMealIds.includes(a.meal_id))
      .sort((a, b) => new Date(a.scanned_at) - new Date(b.scanned_at));
      
    records.forEach(r => {
      const m = confMeals.find(x => x.meal_id === r.meal_id);
      
      let name = 'Unknown';
      if (r.delegate_type === 'PASTOR') {
        const p = pastors.find(x => x.pastor_id === r.delegate_id);
        if (p) name = p.pastor_name || 'Unknown';
      } else if (r.delegate_type === 'WIFE') {
        const p = pastors.find(x => x.pastor_id === r.delegate_id);
        if (p) name = p.wife_name || 'Unknown';
      } else if (r.delegate_type === 'DISCIPLE') {
        const d = disciples.find(x => x.disciple_id === r.delegate_id);
        if (d) name = d.full_name || 'Unknown';
      }
      
      const timeStr = new Date(r.scanned_at).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' });
      const mealSlotStr = m ? `Day ${m.day_number} (${m.part_day})` : 'Unknown';
      
      ws.addRow({
        name: name,
        category: r.delegate_type,
        meal_slot: mealSlotStr,
        scanned_at: timeStr
      });
    });
  } else if (type === 'disciples-export') {
    if (window.exportSelectedDisciples) {
        await window.exportSelectedDisciples();
    }
    return;
  }

  const buffer = await workbook.xlsx.writeBuffer();
  const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `report_${type}_${new Date().toISOString().split('T')[0]}.xlsx`;
  a.click();
};
