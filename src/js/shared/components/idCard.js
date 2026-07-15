import { openModal, closeModal } from './modal.js';
import { showToast } from './toast.js';
import { icon, esc } from '../utils/helpers.js';

function ensureScript(src, checkGlobal) {
  if (checkGlobal()) return Promise.resolve();
  return new Promise((resolve, reject) => {
    const s = document.createElement('script');
    s.src = src;
    s.onload = resolve;
    s.onerror = reject;
    document.head.appendChild(s);
  });
}

const ensureQRCode = () => ensureScript('https://cdn.jsdelivr.net/npm/qrcode@1/build/qrcode.min.js', () => window.QRCode);
const ensureDomToImage = () => ensureScript('https://cdn.jsdelivr.net/npm/dom-to-image@2.6.0/dist/dom-to-image.min.js', () => window.domtoimage);
const ensureJSZip = () => ensureScript('https://cdn.jsdelivr.net/npm/jszip@3/dist/jszip.min.js', () => window.JSZip);

const TYPE_META = {
  pastor:   { label: 'Pastor',         color: '#4f46e5' },
  wife:     { label: "Pastor's Wife",  color: '#a855f7' },
  disciple: { label: 'Disciple',       color: '#10b981' },
};

function initials(name) {
  return (name || '?').split(' ').filter(Boolean).map(w => w[0]).slice(0, 2).join('').toUpperCase();
}

function buildIdCardHTML(info) {
  const meta = TYPE_META[info.type] || { label: info.type || 'Delegate', color: '#64748b' };
  return `
    <div class="id-card-render" style="width: 320px; padding: 28px 24px; background: linear-gradient(160deg, #ffffff, #f8fafc); border-radius: 20px; box-shadow: 0 10px 30px rgba(0,0,0,0.15); font-family: sans-serif; text-align: center; border: 1px solid #e2e8f0; box-sizing: border-box;">
      <div style="font-size: 11px; font-weight: 800; letter-spacing: 0.1em; color: #64748b; text-transform: uppercase; margin-bottom: 4px;">Victory Chapel Christian Center</div>
      <div style="font-size: 14px; font-weight: 700; color: #1e293b; margin-bottom: 20px;">Delegate Identification</div>
      <div style="width: 90px; height: 90px; border-radius: 50%; background: ${meta.color}; color: #fff; display: flex; align-items: center; justify-content: center; font-size: 30px; font-weight: 800; margin: 0 auto 16px; border: 4px solid #fff; box-shadow: 0 4px 12px rgba(0,0,0,0.15);">
        ${initials(info.full_name)}
      </div>
      <div style="font-size: 18px; font-weight: 800; color: #0f172a; margin-bottom: 6px; word-break: break-word;">${esc(info.full_name || '')}</div>
      <div style="display: inline-block; font-size: 11px; font-weight: 800; color: #fff; background: ${meta.color}; padding: 4px 14px; border-radius: 20px; text-transform: uppercase; letter-spacing: 0.05em; margin-bottom: 12px;">${esc(meta.label)}</div>
      <div style="font-size: 13px; color: #475569; font-weight: 600; margin-bottom: 20px; word-break: break-word;">${esc(info.church_name || 'N/A')}</div>
      <div class="id-card-qr-target" style="display: flex; justify-content: center; align-items: center; min-height: 148px; padding: 12px; background: #fff; border-radius: 12px; border: 1px solid #e2e8f0; margin: 0 auto; width: fit-content;"></div>
      <div style="font-size: 10px; color: #94a3b8; margin-top: 14px; font-weight: 600;">Present this ID for conference verification</div>
    </div>
  `;
}

async function renderQrInto(node, qrValue) {
  const target = node.querySelector('.id-card-qr-target');
  if (!target || !qrValue) return;
  await ensureQRCode();
  const canvas = document.createElement('canvas');
  target.appendChild(canvas);
  await new Promise(resolve => {
    window.QRCode.toCanvas(canvas, qrValue, { width: 140, margin: 1 }, () => resolve());
  });
}

let _currentPreviewInfo = null;

export async function previewID(info) {
  if (!info || !info.full_name) {
    showToast('No delegate info to preview.', 'error');
    return;
  }
  _currentPreviewInfo = info;

  openModal(
    `${icon('contact')} Delegate ID Preview`,
    `<div id="id-card-preview-slot" style="display: flex; justify-content: center; padding: 8px 0;">${buildIdCardHTML(info)}</div>`,
    `<button class="btn btn-secondary" onclick="closeModal()">${icon('x')} Close</button>
     <button class="btn btn-primary" onclick="downloadCurrentIdCard()">${icon('download')} Download ID</button>`,
    'modal-sm'
  );

  const node = document.querySelector('#id-card-preview-slot .id-card-render');
  if (node) await renderQrInto(node, info.qr_code);
}

window.downloadCurrentIdCard = async function () {
  if (!_currentPreviewInfo) return;
  const node = document.querySelector('#id-card-preview-slot .id-card-render');
  if (!node) return;
  try {
    await ensureDomToImage();
    const dataUrl = await window.domtoimage.toPng(node, { bgcolor: '#ffffff' });
    const a = document.createElement('a');
    a.href = dataUrl;
    a.download = `ID_${(_currentPreviewInfo.full_name || 'delegate').replace(/\s+/g, '_')}.png`;
    a.click();
  } catch (err) {
    console.error('[IDCard] Download failed:', err);
    showToast('Failed to generate ID image.', 'error');
  }
};

export async function exportBulkIDs(list, filename) {
  if (!Array.isArray(list) || list.length === 0) {
    showToast('No delegates selected to export.', 'warning');
    return;
  }

  showToast(`Generating ${list.length} ID card${list.length > 1 ? 's' : ''}...`, 'info');

  try {
    await Promise.all([ensureQRCode(), ensureDomToImage(), ensureJSZip()]);

    const zip = new window.JSZip();
    const folderNames = { pastor: 'Pastors', wife: "Pastors' Wives", disciple: 'Disciples' };
    const container = document.createElement('div');
    container.style.cssText = 'position: fixed; left: -9999px; top: 0; pointer-events: none;';
    document.body.appendChild(container);

    // Track a running index per category so filenames stay sequential within
    // their own folder instead of sharing one global counter.
    const perFolderIndex = {};

    for (let i = 0; i < list.length; i++) {
      const info = list[i];
      container.innerHTML = buildIdCardHTML(info);
      const node = container.querySelector('.id-card-render');
      await renderQrInto(node, info.qr_code);
      await new Promise(r => setTimeout(r, 30));

      const dataUrl = await window.domtoimage.toPng(node, { bgcolor: '#ffffff' });
      const base64 = dataUrl.split(',')[1];

      const folderName = folderNames[info.type] || 'Other';
      perFolderIndex[folderName] = (perFolderIndex[folderName] || 0) + 1;
      const safeName = `${perFolderIndex[folderName]}_${(info.full_name || 'delegate').replace(/[^a-z0-9]/gi, '_')}.png`;
      zip.folder(folderName).file(safeName, base64, { base64: true });
    }

    document.body.removeChild(container);

    const blob = await zip.generateAsync({ type: 'blob' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename || `ID_Cards_${Date.now()}.zip`;
    a.click();
    URL.revokeObjectURL(url);

    showToast(`Exported ${list.length} ID card${list.length > 1 ? 's' : ''} successfully.`, 'success');
  } catch (err) {
    console.error('[IDCard] Bulk export failed:', err);
    showToast('Failed to export ID cards.', 'error');
  }
}

window.previewID = previewID;
window.exportBulkIDs = exportBulkIDs;
