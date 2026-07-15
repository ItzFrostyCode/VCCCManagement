import { icon } from '../utils/helpers.js';

export function showToast(message, type = 'info') {
  const container = document.getElementById('toast-container');
  if (!container) return;
  const icons = { success: 'circle-check', error: 'circle-x', warning: 'triangle-alert', info: 'info' };
  const toast = document.createElement('div');
  toast.className = `toast toast-${type}`;
  toast.innerHTML = `${icon(icons[type] || 'info', 'icon-sm')} <span>${message}</span>`;
  container.appendChild(toast);
  
  // Make sure Lucide icons are rendered inside the toast immediately
  if (window.lucide) window.lucide.createIcons();

  requestAnimationFrame(() => toast.classList.add('show'));
  setTimeout(() => {
    toast.classList.remove('show');
    setTimeout(() => toast.remove(), 400);
  }, 3500);
}
