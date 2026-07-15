import { navigate, initRouter } from './core/router.js';
import { isDataLoaded, setDataLoaded, counters, recalculateCounters } from './core/state.js';
import { icon } from './shared/utils/helpers.js';
import { openModal, closeModal, handleOverlayClick } from './shared/components/modal.js';
import { showToast } from './shared/components/toast.js';
import './modules/export/index.js';
import './modules/pastors/export.js';
import './modules/districts/export.js';
import './modules/churches/export.js';
import './shared/components/idCard.js';

// Make globals available that HTML on-click handlers expect
window.navigate = navigate;
window.openModal = openModal;
window.closeModal = closeModal;
window.handleOverlayClick = handleOverlayClick;
window.showToast = showToast;
window.icon = icon;

document.addEventListener('DOMContentLoaded', async () => {
  // Bind sidebar/nav clicks
  document.querySelectorAll('.nav-item[data-page], .b-nav-item[data-page]').forEach(el => {
    el.addEventListener('click', () => {
      if (el.dataset.page) navigate(el.dataset.page);
    });
  });

  // Mobile nav toggles
  window.toggleSidebar = function() {
    document.getElementById('sidebar')?.classList.toggle('open');
    document.getElementById('sidebar-overlay')?.classList.toggle('open');
  };

  try {
    // Running local-only (localStorage, see core/state.js) — Supabase sync is disabled.
    const success = true;

    if (success) {
      setDataLoaded(true);
      recalculateCounters();
      
      // 2. Load the initial page route
      const savedPage = localStorage.getItem('churchms_current_page') || 'dashboard';
      initRouter();
      navigate(savedPage);

      if (window.lucide && window.lucide.createIcons) {
        window.lucide.createIcons();
      }
    } else {
      showToast('Critical Error: Failed to connect to the database. Initial state empty.', 'error');
    }
  } catch (err) {
    console.error('[App] Initialization failed:', err);
    showToast('Failed to start application services.', 'error');
  } finally {
    const loader = document.getElementById('startup-loader');
    if (loader) {
      loader.style.opacity = '0';
      setTimeout(() => loader.style.display = 'none', 500);
    }
  }
});
