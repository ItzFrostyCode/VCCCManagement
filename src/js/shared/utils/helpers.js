// ============================================================
// Church Management System — Utility Functions
// Icons: Lucide (loaded via CDN in index.html)
// ============================================================

import { statusTypes, assignmentTypes } from '../../core/state.js';

// ── Icon Helper ──────────────────────────────────────────────
export function icon(name, cls = '') {
  return `<i data-lucide="${name}" class="icon ${cls}"></i>`;
}

export function iconBtn(iconName, label, cls = 'btn btn-sm btn-secondary', title = '') {
  return `<button class="${cls}" title="${title || label}">${icon(iconName)} <span>${label}</span></button>`;
}

// ── Badge HTML ───────────────────────────────────────────────

const statusMeta = {
  active:      { label: 'Active',      cls: 'badge-active',      icon: 'check-circle' },
  transferred: { label: 'Transferred', cls: 'badge-regular',     icon: 'arrow-right' },
  redirection: { label: 'Redirection', cls: 'badge-regular',     icon: 'refresh-cw' },
  pullout:     { label: 'Pull Out',    cls: 'badge-suspended',   icon: 'minus-circle' },
  undeployed:  { label: 'Undeployed',  cls: 'badge-undeployed',  icon: 'user-x' },
  deceased:    { label: 'Deceased',    cls: 'badge-deceased',    icon: 'cross' },
};

const assignmentMeta = {
  regular:       { label: 'Regular',       cls: 'badge-regular',       icon: 'home' },
  pioneering:    { label: 'Pioneering',    cls: 'badge-active',        icon: 'sprout' },
  training:      { label: 'Training',      cls: 'badge-regular',       icon: 'graduation-cap' },
  swap:          { label: 'Swap',          cls: 'badge-on_leave',      icon: 'arrow-left-right' },
  suspended:     { label: 'Suspended',     cls: 'badge-suspended',     icon: 'ban' },
  international: { label: 'International', cls: 'badge-regular',       icon: 'globe' },
  interim:       { label: 'Interim',       cls: 'badge-on_leave',      icon: 'timer' },
};

export function statusBadge(code) {
  const m = statusMeta[code] || { label: code, cls: '', icon: 'circle' };
  return `<span class="badge ${m.cls}">${icon(m.icon, 'icon-xs')} ${m.label}</span>`;
}

export function assignmentBadge(code) {
  const m = assignmentMeta[code] || { label: code, cls: '', icon: 'tag' };
  return `<span class="badge ${m.cls}">${icon(m.icon, 'icon-xs')} ${m.label}</span>`;
}

// ── Select Options ───────────────────────────────────────────

export function statusOptions(selected = '') {
  return statusTypes.map(s =>
    `<option value="${s.status_code}" ${selected === s.status_code ? 'selected' : ''}>${statusMeta[s.status_code]?.label || s.status_code}</option>`
  ).join('');
}

export function assignmentTypeOptions(selected = '', excludeSuspended = false) {
  return assignmentTypes
    .filter(a => !excludeSuspended || a.assignment_code !== 'suspended')
    .map(a =>
      `<option value="${a.assignment_code}" ${selected === a.assignment_code ? 'selected' : ''}>${assignmentMeta[a.assignment_code]?.label || a.assignment_code}</option>`
    ).join('');
}

export function pastorOptions(pastorsList, selected = '', includeBlank = true) {
  const blank = includeBlank ? `<option value="">— None —</option>` : '';
  return blank + pastorsList.map(p =>
    `<option value="${p.pastor_id}" ${selected === p.pastor_id ? 'selected' : ''}>${esc(p.pastor_name)} (${statusMeta[p.status_code]?.label || p.status_code})</option>`
  ).join('');
}

// ── Avatar ───────────────────────────────────────────────────

export function pastorAvatar(name, imageUrl = '', size = 'md', customColor = null) {
  if (imageUrl) {
    return `<div class="avatar-wrapper avatar-${size}">
      <img src="${imageUrl}" alt="${esc(name)}">
      <div class="avatar-overlay" onclick="viewImage('${imageUrl}', '${esc(name)}'); event.stopPropagation();">
        ${icon('eye', 'icon-sm')}
      </div>
    </div>`;
  }
  const initials = (name || '?').split(' ').map(w => w[0]).slice(0, 2).join('').toUpperCase();
  const colors = ['#4f8ef7','#22c55e','#a855f7','#f59e0b','#06b6d4','#f97316','#ef4444'];
  const color = customColor || colors[(name || '').charCodeAt(0) % colors.length];
  return `<div class="avatar avatar-${size}" style="background:${color}">${initials}</div>`;
}

// ── Date Helpers ─────────────────────────────────────────────

export function formatDate(dateStr) {
  if (!dateStr) return '—';
  try {
    return new Date(dateStr + 'T00:00:00').toLocaleDateString('en-PH', { year: 'numeric', month: 'short', day: 'numeric' });
  } catch { return dateStr; }
}

export function formatDateRange(start, end) {
  return end ? `${formatDate(start)} → ${formatDate(end)}` : `${formatDate(start)} → Present`;
}

export function calcAge(birthDate) {
  if (!birthDate) return null;
  const diff = Date.now() - new Date(birthDate).getTime();
  return Math.floor(diff / (365.25 * 24 * 60 * 60 * 1000));
}

// ── Toast Notifications ──────────────────────────────────────
// Removed: Moved to src/js/components/toast.js


// ── Image Upload ─────────────────────────────────────────────

export function readImageFile(file) {
  return new Promise((resolve, reject) => {
    if (!file) { resolve(null); return; }
    const reader = new FileReader();
    reader.onload = e => resolve(e.target.result);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

export function imageUploadField(id, label, currentUrl = '') {
  return `
    <div class="form-group">
      <label>${label}</label>
      <div class="img-upload-wrap" id="${id}-wrap">
        <div class="img-preview" id="${id}-preview">
          ${currentUrl
            ? `<img src="${currentUrl}" alt="preview" style="width:100%;height:100%;object-fit:cover;border-radius:var(--radius-md)">`
            : `<div class="img-placeholder">${icon('image-plus', 'icon-lg')}<span>Click to upload</span></div>`}
        </div>
        <input type="file" id="${id}" accept="image/*" style="display:none">
        <div style="display:flex;gap:8px;margin-top:8px">
          <button type="button" class="btn btn-sm btn-secondary" onclick="document.getElementById('${id}').click()">
            ${icon('upload')} Upload
          </button>
          ${currentUrl ? `<button type="button" class="btn btn-sm btn-danger" onclick="clearImageField('${id}')">
            ${icon('trash-2')} Remove
          </button>` : ''}
        </div>
      </div>
    </div>`;
}

// ── HTML Escape ──────────────────────────────────────────────

export function esc(str) {
  if (str == null) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, "&#39;");
}

export function getDelegateQR(type, id) {
  return `VCCC:${String(type).toUpperCase()}:${id}`;
}

// ── Debounce ─────────────────────────────────────────────────

export function debounce(fn, delay) {
  let timer;
  return (...args) => { clearTimeout(timer); timer = setTimeout(() => fn(...args), delay); };
}

// ── Empty State ──────────────────────────────────────────────

export function emptyState(title, subtitle, iconName = 'inbox', actionLabel = '', actionFn = '') {
  return `
    <div class="empty-state">
      <div class="empty-icon">${icon(iconName, 'icon-xl')}</div>
      <h3>${title}</h3>
      <p>${subtitle}</p>
      ${actionLabel ? `<button class="btn btn-primary" onclick="${actionFn}">${icon('plus')} ${actionLabel}</button>` : ''}
    </div>`;
}

// ── Confirm Dialog ───────────────────────────────────────────

export function confirmDelete(name, onConfirm) {
  if (confirm(`Delete "${name}"? This cannot be undone.`)) onConfirm();
}

// ── Color Helpers ────────────────────────────────────────────

export function hexToRgba(hex, alpha = 1) {
  if (!hex || !/^#[0-9A-Fa-f]{6}$/i.test(hex)) return `rgba(79, 70, 229, ${alpha})`; // fallback primary color
  let r = parseInt(hex.slice(1, 3), 16);
  let g = parseInt(hex.slice(3, 5), 16);
  let b = parseInt(hex.slice(5, 7), 16);
  
  // Clamp brightness for light mode visibility (prevent pure white)
  const lum = 0.299 * r + 0.587 * g + 0.114 * b;
  if (lum > 220) {
    r = Math.max(0, r - 40);
    g = Math.max(0, g - 40);
    b = Math.max(0, b - 40);
  }
  
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

export function viewImage(url, title = 'Image View') {
  if (window.openModal) {
    window.openModal(
      title,
      `<div style="text-align:center"><img src="${url}" style="max-width:100%; max-height:70vh; border-radius:var(--radius-md); box-shadow:var(--shadow-lg)"></div>`,
      `<button class="btn btn-secondary" onclick="closeModal()">Close</button>`
    );
  }
}

export function viewDelegateQR(value, name) {
  if (window.openModal) {
    window.openModal(
      `${icon('qr-code')} Delegate Pass: ${esc(name)}`,
      `<div style="display:flex; flex-direction:column; align-items:center; gap:20px; padding:10px 0;">
        <div id="qr-target" style="padding:16px; background:#fff; border-radius:var(--radius-lg); box-shadow:0 10px 25px rgba(0,0,0,0.1)"></div>
        <div style="text-align:center">
          <div style="font-weight:700; font-size:18px;">${esc(name)}</div>
          <div style="font-size:12px; color:var(--text-muted); margin-top:4px;">Present this QR code for meal attendance scanning.</div>
        </div>
      </div>`,
      `<button class="btn btn-secondary" onclick="closeModal()">Close</button>`,
      'modal-md'
    );
  }
  
  setTimeout(() => {
    const container = document.getElementById('qr-target');
    const qrLib = window.QRCode || (typeof QRCode !== 'undefined' ? QRCode : null) || window.qrcode;
    if (container && qrLib && typeof qrLib.toCanvas === 'function') {
      const qrCanvas = document.createElement('canvas');
      container.appendChild(qrCanvas);
      qrLib.toCanvas(qrCanvas, value, { 
        width: 240, 
        margin: 1,
        color: { dark: '#1e293b', light: '#ffffff' }
      }, (err) => {
        if (err) console.error('[QR Error]', err);
      });
    } else if (container) {
      container.innerHTML = '<div style="color:var(--danger); font-size:12px; padding:20px;">QR Generator failed to load.<br>Please refresh the page.</div>';
    }
  }, 150);
}

// Expose utilities to window for inline handlers
window.viewImage = viewImage;
window.viewDelegateQR = viewDelegateQR;
window.getDelegateQR = getDelegateQR;
window.icon = icon;
window.esc = esc;
window.formatDate = formatDate;
window.statusBadge = statusBadge;
window.assignmentBadge = assignmentBadge;
