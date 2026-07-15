export function openModal(title, bodyHtml, footer = '', size = '') {
  const overlay = document.getElementById('modal-overlay');
  const box = document.getElementById('modal-box');
  const titleEl = document.getElementById('modal-title');
  const bodyEl = document.getElementById('modal-body');
  const footerEl = document.getElementById('modal-footer');

  if (!overlay || !box) return;

  titleEl.innerHTML = title;
  bodyEl.innerHTML = bodyHtml;
  if (footerEl) footerEl.innerHTML = footer;

  // Apply size class (modal-sm, modal-lg, etc) if provided
  box.className = `modal ${size}`;
  
  overlay.classList.add('open');
  
  // Re-render Lucide icons dynamically injected into the modal
  if (window.lucide) window.lucide.createIcons();
}

export function closeModal() {
  const overlay = document.getElementById('modal-overlay');
  if (overlay) overlay.classList.remove('open');
}

export function handleOverlayClick(e) {
  // If the user clicked the backdrop (and not the modal content itself), close it
  if (e.target.id === 'modal-overlay') {
    closeModal();
  }
}
