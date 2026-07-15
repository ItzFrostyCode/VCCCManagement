import { showToast } from '../../shared/components/toast.js';
import { conferences, meals, mealAttendance, pastors, disciples, mealCutoffSettings, updateMealCutoffSettings } from '../../core/state.js';
import { dbService } from '../../core/dbService.js';
import { icon, esc, formatDate, emptyState } from '../../shared/utils/helpers.js';
import { openModal, closeModal } from '../../shared/components/modal.js';

// ── Meals Monitor (overview page) ───────────────────────────────

export function renderMeals() {
  const content = document.getElementById('page-content');
  const actions = document.getElementById('topbar-actions');
  if (actions) actions.innerHTML = '';
  if (!content) return;

  content.innerHTML = `
    <div class="fade-in">
      <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 24px;">
        <h1 style="margin: 0; font-size: 20px; font-weight: 800; display: flex; align-items: center; gap: 8px;">
          Meals Monitor
          <span style="font-size: 11px; font-weight: 700; color: var(--text-muted); padding: 2px 10px; background: var(--bg-elevated); border-radius: 20px; border: 1px solid var(--border);">
            ${conferences.filter(c => meals.some(m => m.conference_id === c.conference_id)).length} Active Schedules
          </span>
        </h1>
      </div>
      <div id="meals-monitor-list" style="display: flex; flex-direction: column; gap: 24px;">
        ${renderMealsMonitorCards()}
      </div>
    </div>
  `;

  if (window.lucide) lucide.createIcons();
}

function renderMealsMonitorCards() {
  const withMeals = conferences.filter(c => meals.some(m => m.conference_id === c.conference_id));

  if (withMeals.length === 0) {
    return emptyState(
      'No Meal Schedules Yet',
      'Set up a meal schedule from the Conferences page first, then monitor scanning progress here.',
      'utensils', 'Go to Conferences', "navigate('conferences')"
    );
  }

  const now = new Date();
  const sorted = [...withMeals].sort((a, b) => new Date(b.start_date) - new Date(a.start_date));

  return sorted.map(c => {
    const start = new Date(c.start_date);
    const end = new Date(c.end_date);
    const isOngoing = now >= start && now <= end;

    const confMeals = meals
      .filter(m => m.conference_id === c.conference_id)
      .sort((a, b) => (a.day_number - b.day_number) || a.part_day.localeCompare(b.part_day));

    const slotIcon = { morning: 'sun', afternoon: 'cloud-sun', evening: 'moon' };

    const slotChips = confMeals.map(m => {
      const count = mealAttendance.filter(a => a.meal_id === m.meal_id).length;
      return `
        <button class="card btn-ghost" onclick="openMealAttendance(${m.meal_id})"
          style="display: flex; align-items: center; gap: 10px; padding: 12px 16px; border: 1px solid var(--border); cursor: pointer; min-width: 160px;">
          ${icon(slotIcon[m.part_day] || 'utensils', 'icon-sm')}
          <div style="text-align: left;">
            <div style="font-size: 12px; font-weight: 800; text-transform: capitalize;">Day ${m.day_number} · ${m.part_day}</div>
            <div style="font-size: 11px; color: var(--text-muted); font-weight: 700;">${count} scanned</div>
          </div>
        </button>
      `;
    }).join('');

    return `
      <div class="card" style="padding: 20px; border: 1px solid var(--border);">
        <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 16px; flex-wrap: wrap; gap: 8px;">
          <div>
            <div style="font-weight: 800; font-size: 16px;">${esc(c.theme)}</div>
            <div style="font-size: 12px; color: var(--text-muted); font-weight: 600;">${formatDate(c.start_date)} — ${formatDate(c.end_date)}</div>
          </div>
          ${isOngoing ? `<span class="badge" style="background: var(--success-dim); color: var(--success); border-color: var(--success); font-weight: 800;">ONGOING</span>` : ''}
        </div>
        <div style="display: flex; flex-wrap: wrap; gap: 10px;">
          ${slotChips}
        </div>
      </div>
    `;
  }).join('');
}

window.renderMeals = renderMeals;

export function openMealAttendance(mealId) {
  const meal = meals.find(m => m.meal_id === mealId);
  if (!meal) return;
  
  const attendanceCount = mealAttendance.filter(a => a.meal_id === mealId).length;
  
  openModal(
    `${icon('qr-code')} Meal Scanning: Day ${meal.day_number} (${meal.part_day})`,
    `
    <div class="fade-in" style="display: flex; flex-direction: column; gap: 24px;">
      <div style="background: var(--bg-elevated); padding: 16px; border-radius: var(--radius-lg); border: 1px solid var(--border); display: flex; flex-direction: column; gap: 12px;">
        <div style="display: flex; align-items: center; justify-content: center; gap: 12px; font-weight: 800; color: var(--accent);">
          ${icon('clock', 'icon-sm')}
          <span id="meal-cutoff-label">Scan Window Closes: ${getMealCutoff(meal.part_day)}</span>
          <button type="button" onclick="toggleMealCutoffSettings()" title="Set cutoff time"
                  style="background: none; border: none; cursor: pointer; color: var(--text-muted); display: flex; align-items: center; padding: 4px;">
            ${icon('settings', 'icon-sm')}
          </button>
        </div>
        <div id="meal-cutoff-settings-panel" style="display: none; align-items: center; justify-content: center; gap: 12px; flex-wrap: wrap; border-top: 1px solid var(--border); padding-top: 12px;">
          <label style="font-size: 12px; font-weight: 700; color: var(--text-muted); display: flex; align-items: center; gap: 6px;">
            Cutoff time:
            <input type="time" id="meal-cutoff-input"
                   value="${mealCutoffSettings[meal.part_day] || ''}"
                   ${mealCutoffSettings[meal.part_day] == null ? 'disabled' : ''}
                   style="width: 130px;">
          </label>
          <label style="font-size: 12px; font-weight: 700; color: var(--text-muted); display: flex; align-items: center; gap: 6px; cursor: pointer;">
            <input type="checkbox" id="meal-cutoff-no-limit" onchange="document.getElementById('meal-cutoff-input').disabled = this.checked"
                   ${mealCutoffSettings[meal.part_day] == null ? 'checked' : ''}>
            No cutoff (open all day)
          </label>
          <button type="button" class="btn btn-sm btn-primary" onclick="saveMealCutoffSetting('${meal.part_day}')">${icon('check')} Save</button>
        </div>
      </div>

      <div id="qr-reader-container" style="width: 100%; max-width: 400px; aspect-ratio: 1; margin: 0 auto; overflow: hidden; border-radius: 24px; border: 4px solid var(--bg-hover); box-shadow: 0 20px 50px rgba(0,0,0,0.1); background: #000; position: relative;">
        <div id="qr-reader" style="width: 100%; height: 100%;"></div>
        
        <!-- Confirmation Overlay (Success/Error) -->
        <div id="scan-confirmation-overlay" style="display: none; position: absolute; top:0; left:0; width:100%; height:100%; z-index: 10; background: var(--bg-base); animation: fadeIn 0.2s ease-out; flex-direction: column; align-items: center; justify-content: center; padding: 24px; text-align: center;">
          <div id="conf-icon-container" style="width: 100px; height: 100px; border-radius: 50%; display: flex; align-items: center; justify-content: center; margin-bottom: 20px;"></div>
          <h2 id="conf-title" style="font-size: 24px; font-weight: 900; margin-bottom: 8px;"></h2>
          <div id="conf-name" style="font-size: 20px; font-weight: 800; color: var(--text-primary); margin-bottom: 4px;"></div>
          <div id="conf-type" style="font-size: 14px; font-weight: 700; color: var(--text-muted); text-transform: uppercase; margin-bottom: 32px;"></div>
          
          <div style="display: flex; flex-direction: column; gap: 12px; width: 100%;">
            <button class="btn btn-primary" onclick="resumeScanner()" style="width: 100%; height: 60px; font-size: 18px; font-weight: 900; justify-content: center;">
              ${icon('camera')} SCAN NEXT 
            </button>
            <button class="btn btn-secondary" onclick="stopScannerAndClose()" style="width: 100%; height: 50px; font-size: 14px; font-weight: 800; justify-content: center;">
              FINISH SCANNING
            </button>
          </div>
        </div>

        <div id="scan-overlay" style="position: absolute; top:0; left:0; width:100%; height:100%; pointer-events:none; border:2px solid transparent; transition:all 0.4s ease; display: flex; align-items: center; justify-content: center;">
          <div style="width: 250px; height: 250px; border: 2px dashed rgba(255,255,255,0.4); border-radius: 20px; box-shadow: 0 0 0 1000px rgba(0,0,0,0.5);"></div>
        </div>
      </div>
      
      <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 16px;">
        <div class="card" style="text-align: center; padding: 16px; border: 1px solid var(--border); background: var(--bg-elevated);">
          <div id="att-count" style="font-size: 32px; font-weight: 900; color: var(--accent); transition: transform 0.2s;">${attendanceCount}</div>
          <div style="font-size: 11px; font-weight: 800; color: var(--text-muted); text-transform: uppercase; letter-spacing: 0.05em; margin-top: 4px;">Verified Scans</div>
        </div>
        <button class="card btn-ghost" onclick="viewMealAttendanceTable(${mealId})" 
                style="display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 6px; padding: 16px; border: 1px solid var(--border); cursor: pointer; transition: all 0.2s;">
          <div style="width: 40px; height: 40px; border-radius: 12px; background: var(--bg-base); display: flex; align-items: center; justify-content: center; color: var(--text-secondary);">
            ${icon('list', 'icon-md')}
          </div>
          <div style="font-size: 11px; font-weight: 800; color: var(--text-primary); text-transform: uppercase;">Review Log</div>
        </button>
      </div>
      
      <div id="scan-result" style="display: none; padding: 20px; border-radius: var(--radius-lg); text-align: center; font-weight: 800; font-size: 15px; box-shadow: var(--shadow-md); transform-origin: bottom; animation: slideUp 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275);"></div>
    </div>
    `,
    `<button class="btn btn-secondary" onclick="stopScannerAndClose()">${icon('x')} Stop & Close</button>`,
    'modal-lg'
  );
  
  startScanner(mealId);
}
window.openMealAttendance = openMealAttendance;

let html5QrCode = null;
let lastScannedCode = null;
let lastScanTime = 0;

function startScanner(mealId) {
  const meal = meals.find(m => m.meal_id === mealId);
  if (!isMealWindowOpen(meal.part_day)) {
    showToast(`Scanning for ${meal.part_day} meal is closed.`, 'error');
  }
  
  setTimeout(() => {
    if (typeof Html5Qrcode === 'undefined') {
      showToast('QR Scanner library not loaded.', 'error');
      return;
    }
    html5QrCode = new Html5Qrcode("qr-reader");
    const config = { fps: 10, qrbox: { width: 250, height: 250 } };
    
    html5QrCode.start(
      { facingMode: "environment" }, 
      config,
      (decodedText) => handleScan(decodedText, mealId),
      (errorMessage) => { /* ignore errors */ }
    );
  }, 300);
}

function stopScannerAndClose() {
  if (html5QrCode) {
    html5QrCode.stop().then(() => {
      html5QrCode = null;
      closeModal();
    }).catch(() => {
      html5QrCode = null;
      closeModal();
    });
  } else {
    closeModal();
  }
};

export async function handleScan(decodedText, mealId) {
  const now = Date.now();
  if (decodedText === lastScannedCode && (now - lastScanTime < 3000)) return;
  
  lastScannedCode = decodedText;
  lastScanTime = now;

  const meal = meals.find(m => m.meal_id === mealId);
  if (!isMealWindowOpen(meal.part_day)) {
    showScanResult('Meal window closed', 'error');
    return;
  }
  
  // Format: VCCC:TYPE:ID
  const parts = decodedText.split(':');
  if (parts.length !== 3 || parts[0] !== 'VCCC') {
    showScanConfirmation({ msg: 'Invalid Pass Format', details: 'The scanned code is not a valid VCCC delegate pass.' }, 'error');
    return;
  }
  
  const type = parts[1]; // PASTOR, WIFE, DISCIPLE
  const id = parseInt(parts[2]);
  
  // Check if already scanned for THIS meal
  const isAlreadyScanned = mealAttendance.some(a => a.meal_id === mealId && a.delegate_type === type && a.delegate_id === id);
  if (isAlreadyScanned) {
    showScanConfirmation({ msg: 'Record Already Exists', details: 'This QR code has already been scanned for this meal.' }, 'error');
    return;
  }
  
  // Find delegate name
  let name = 'Unknown';
  let color = 'var(--text-primary)';
  if (type === 'PASTOR') {
    const p = pastors.find(x => x.pastor_id === id);
    if (p) { name = p.pastor_name; color = 'var(--accent)'; }
  } else if (type === 'WIFE') {
    const p = pastors.find(x => x.pastor_id === id);
    if (p) { name = p.wife_name; color = 'var(--purple)'; }
  } else if (type === 'DISCIPLE') {
    const d = disciples.find(x => x.disciple_id === id);
    if (d) { name = d.full_name; color = 'var(--success)'; }
  }
  
  const attRecord = {
    meal_id: mealId,
    delegate_type: type,
    delegate_id: id,
    scanned_at: new Date().toISOString()
  };

  try {
    await dbService.create('meal_attendance', attRecord);
  } catch (err) {
    console.error('Failed to save attendance:', err);
    showScanConfirmation({ msg: 'Save Failed', details: 'Network error or DB issue.' }, 'error');
    return;
  }
  
  // Show big confirmation for elderly-friendly experience
  const nameInfo = { name, type: type === 'WIFE' ? 'Wife' : type.charAt(0) + type.slice(1).toLowerCase() };
  showScanConfirmation(nameInfo, 'success');

  // Vibrate if supported
  if ('vibrate' in navigator) navigator.vibrate(200);
  
  // Update count in UI
  const countEl = document.getElementById('att-count');
  if (countEl) {
    countEl.textContent = mealAttendance.filter(a => a.meal_id === mealId).length;
    countEl.style.transform = 'scale(1.2)';
    setTimeout(() => countEl.style.transform = 'scale(1)', 200);
  }
}

function showScanConfirmation(info, status) {
  const overlay = document.getElementById('scan-confirmation-overlay');
  const iconContainer = document.getElementById('conf-icon-container');
  const titleEl = document.getElementById('conf-title');
  const nameEl = document.getElementById('conf-name');
  const typeEl = document.getElementById('conf-type');

  if (!overlay) return;

  // Pause scanner
  if (html5QrCode) html5QrCode.pause();

  if (status === 'success') {
    iconContainer.style.background = 'var(--success-dim)';
    iconContainer.style.color = 'var(--success)';
    iconContainer.innerHTML = icon('check-circle', 'icon-xxl');
    titleEl.textContent = 'VERIFIED';
    titleEl.style.color = 'var(--success)';
    nameEl.textContent = info.name;
    typeEl.textContent = info.type;
  } else {
    iconContainer.style.background = 'var(--danger-dim)';
    iconContainer.style.color = 'var(--danger)';
    iconContainer.innerHTML = icon('alert-circle', 'icon-xxl');
    titleEl.textContent = 'STOP';
    titleEl.style.color = 'var(--danger)';
    nameEl.textContent = info.msg || 'Scan Error';
    typeEl.textContent = info.details || 'Please try again or contact support.';
  }

  overlay.style.display = 'flex';
  window.lucide?.createIcons?.();
}

function resumeScanner() {
  const overlay = document.getElementById('scan-confirmation-overlay');
  if (overlay) overlay.style.display = 'none';
  if (html5QrCode) html5QrCode.resume();
}

function getDelegateInfo(type, id) {
  if (type === 'PASTOR') {
    const p = pastors.find(x => x.pastor_id === id);
    return { name: p?.pastor_name || 'Unknown', typeLabel: 'Pastor' };
  } else if (type === 'WIFE') {
    const p = pastors.find(x => x.pastor_id === id);
    return { name: p?.wife_name || 'Unknown', typeLabel: 'Wife' };
  } else if (type === 'DISCIPLE') {
    const d = disciples.find(x => x.disciple_id === id);
    return { name: d?.full_name || 'Unknown', typeLabel: 'Disciple' };
  }
  return { name: 'Unknown', typeLabel: 'Unknown' };
}

function renderMealAttendanceRows(mealId, query = '', category = 'all') {
  const records = mealAttendance
    .filter(a => a.meal_id === mealId)
    .sort((a, b) => new Date(b.scanned_at) - new Date(a.scanned_at));

  const filtered = records.filter(r => {
    const info = getDelegateInfo(r.delegate_type, r.delegate_id);
    const matchesQuery = info.name.toLowerCase().includes(query.toLowerCase());
    const matchesCategory = category === 'all' || r.delegate_type.toLowerCase() === category.toLowerCase();
    return matchesQuery && matchesCategory;
  });

  if (filtered.length === 0) {
    return `<tr><td colspan="3" style="padding: 64px 24px;">${emptyState('No Matching Records', query ? `No results for "${esc(query)}"` : 'Start scanning to see records here.', 'search', '', '')}</td></tr>`;
  }

  return filtered.map(r => {
    const info = getDelegateInfo(r.delegate_type, r.delegate_id);
    const time = new Date(r.scanned_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    let badgeCls = `badge-${r.delegate_type.toLowerCase()}`;
    return `
      <tr>
        <td style="padding-left: 24px;">
          <div style="font-weight: 800; font-size: 15px; color: var(--text-primary);">${esc(info.name)}</div>
        </td>
        <td><span class="badge ${badgeCls}" style="font-weight: 800; font-size: 10px;">${info.typeLabel}</span></td>
        <td style="color: var(--text-muted); font-size: 13px; font-weight: 700; text-align: right; padding-right: 24px;">
          ${time}
        </td>
      </tr>
    `;
  }).join('');
}

window.filterScanLog = function(mealId) {
  const query = document.getElementById('scan-log-search').value;
  const category = document.querySelector('.scan-log-filter.active')?.dataset.category || 'all';
  const tbody = document.getElementById('scan-log-body');
  if (tbody) {
    tbody.innerHTML = renderMealAttendanceRows(mealId, query, category);
  }
};

window.setScanLogFilter = function(btn, mealId, category) {
  document.querySelectorAll('.scan-log-filter').forEach(b => b.classList.remove('active', 'btn-primary'));
  document.querySelectorAll('.scan-log-filter').forEach(b => b.classList.add('btn-secondary'));
  btn.classList.remove('btn-secondary');
  btn.classList.add('active', 'btn-primary');
  filterScanLog(mealId);
};

function viewMealAttendanceTable(mealId) {
  const meal = meals.find(m => m.meal_id === mealId);
  if (!meal) return;
  
  const modalHtml = `
    <div class="fade-in" style="display: flex; flex-direction: column; gap: 20px;">
      <!-- Search & Filters -->
      <div style="display: flex; flex-direction: column; gap: 12px; background: var(--bg-elevated); padding: 16px; border-radius: var(--radius-lg); border: 1px solid var(--border);">
        <div style="position: relative;">
          <i data-lucide="search" style="position: absolute; left: 12px; top: 50%; transform: translateY(-50%); width: 18px; height: 18px; color: var(--text-muted);"></i>
          <input type="text" id="scan-log-search" 
                 style="padding-left: 40px; height: 48px; font-weight: 600;" 
                 placeholder="Search by name..." 
                 oninput="filterScanLog(${mealId})">
        </div>
        <div style="display: flex; gap: 8px; overflow-x: auto; padding-bottom: 4px; scrollbar-width: none;">
          <button class="btn btn-sm btn-primary active scan-log-filter" data-category="all" onclick="setScanLogFilter(this, ${mealId}, 'all')">All Scans</button>
          <button class="btn btn-sm btn-secondary scan-log-filter" data-category="pastor" onclick="setScanLogFilter(this, ${mealId}, 'pastor')">Pastors</button>
          <button class="btn btn-sm btn-secondary scan-log-filter" data-category="wife" onclick="setScanLogFilter(this, ${mealId}, 'wife')">Wives</button>
          <button class="btn btn-sm btn-secondary scan-log-filter" data-category="disciple" onclick="setScanLogFilter(this, ${mealId}, 'disciple')">Disciples</button>
        </div>
      </div>

      <!-- Results Table -->
      <div class="table-wrapper" style="border: 1px solid var(--border); border-radius: var(--radius-lg); max-height: 400px; overflow-y: auto;">
        <table class="modern-table">
          <thead>
            <tr>
              <th style="padding-left: 24px;">Name</th>
              <th>Category</th>
              <th style="text-align: right; padding-right: 24px;">Time</th>
            </tr>
          </thead>
          <tbody id="scan-log-body">
            ${renderMealAttendanceRows(mealId)}
          </tbody>
        </table>
      </div>
    </div>
  `;

  openModal(`${icon('list')} Scan Log: Day ${meal.day_number} (${meal.part_day})`, modalHtml, `
    <button class="btn btn-secondary" onclick="closeModal()">${icon('arrow-left')} Back to Scanner</button>
  `, 'modal-md');
  
  if (window.lucide) lucide.createIcons();
}

function showScanResult(msg, style, textColor) {
  const el = document.getElementById('scan-result');
  el.style.display = 'block';
  el.textContent = msg;
  
  if (style === 'success') {
    el.style.background = 'rgba(16, 185, 129, 0.1)';
    el.style.color = textColor || 'var(--success-dark)';
    el.style.border = '1px solid var(--success)';
  } else if (style === 'warning') {
    el.style.background = 'rgba(245, 158, 11, 0.1)';
    el.style.color = 'var(--warning-dark)';
    el.style.border = '1px solid var(--warning)';
  } else {
    el.style.background = 'rgba(239, 68, 68, 0.1)';
    el.style.color = 'var(--danger-dark)';
    el.style.border = '1px solid var(--danger)';
  }
  
  setTimeout(() => {
    el.style.display = 'none';
  }, 3000);
}

function isMealWindowOpen(partDay) {
  const cutoff = mealCutoffSettings[partDay];
  if (cutoff == null || cutoff === '') return true; // no cutoff configured = open all day

  const [cutoffHours, cutoffMinutes] = cutoff.split(':').map(Number);
  const now = new Date();
  const time = now.getHours() + (now.getMinutes() / 60);
  return time < (cutoffHours + (cutoffMinutes / 60));
}

function getMealCutoff(partDay) {
  const cutoff = mealCutoffSettings[partDay];
  if (cutoff == null || cutoff === '') return 'No cutoff (open all day)';

  const [hours, minutes] = cutoff.split(':').map(Number);
  const period = hours >= 12 ? 'PM' : 'AM';
  const displayHour = ((hours + 11) % 12) + 1;
  return `${displayHour}:${String(minutes).padStart(2, '0')} ${period}`;
}

function toggleMealCutoffSettings() {
  const panel = document.getElementById('meal-cutoff-settings-panel');
  if (panel) panel.style.display = panel.style.display === 'none' ? 'flex' : 'none';
}

function saveMealCutoffSetting(partDay) {
  const noLimit = document.getElementById('meal-cutoff-no-limit')?.checked;
  const timeVal = document.getElementById('meal-cutoff-input')?.value;
  updateMealCutoffSettings({ [partDay]: noLimit ? null : (timeVal || null) });

  const label = document.getElementById('meal-cutoff-label');
  if (label) label.textContent = `Scan Window Closes: ${getMealCutoff(partDay)}`;

  showToast('Cutoff time updated.', 'success');
  toggleMealCutoffSettings();
}

window.stopScannerAndClose = stopScannerAndClose;
window.viewMealAttendanceTable = viewMealAttendanceTable;
window.getMealCutoff = getMealCutoff;
window.isMealWindowOpen = isMealWindowOpen;
window.showScanResult = showScanResult;
window.resumeScanner = resumeScanner;
window.toggleMealCutoffSettings = toggleMealCutoffSettings;
window.saveMealCutoffSetting = saveMealCutoffSetting;
