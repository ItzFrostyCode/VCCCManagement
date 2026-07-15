import { closeModal } from '../shared/components/modal.js';

export let currentPage = 'dashboard';

export async function navigate(page) {
  try {
    closeModal();
    currentPage = page;
    localStorage.setItem('churchms_current_page', page);

    // Update Nav UI
    document.querySelectorAll('.nav-item').forEach(el => {
      el.classList.toggle('active', el.dataset.page === page);
    });
    document.querySelectorAll('.b-nav-item').forEach(el => {
      if (el.dataset.page) {
        el.classList.toggle('active', el.dataset.page === page);
      }
    });

    // Toggle FAB
    const fab = document.querySelector('.fab-container');
    if (fab) {
      if (['pastors', 'churches', 'districts', 'assignments'].includes(page)) {
        fab.classList.remove('hidden');
      } else {
        fab.classList.add('hidden');
      }
    }

    // Close sidebar on mobile
    if (window.innerWidth <= 1024) {
      document.getElementById('sidebar')?.classList.remove('open');
      document.getElementById('sidebar-overlay')?.classList.remove('open');
    }

    // Titles
    const titles = {
      dashboard:   'Dashboard',
      pastors:     'Pastors',
      assignments: 'Assignments',
      districts:   'Districts & Zones',
      churches:    'Churches',
      conferences: 'Conferences',
      meals:       'Meals Monitor',
      disciples:   'Disciples',
      delegates:   'Delegates & QR',
      reports:     'Reports',
      data:        'Data',
      help:        'Help & Guide',
    };
    
    const titleEl = document.getElementById('topbar-title');
    if (titleEl) titleEl.textContent = titles[page] || page;
    
    const actionsEl = document.getElementById('topbar-actions');
    if (actionsEl) actionsEl.innerHTML = '';

    // Route Rendering (Awaited to catch dynamic import errors)
    await renderPage(page);

    if (window.lucide) {
      window.lucide.createIcons();
    }
  } catch (error) {
    console.error(`Router Error navigating to ${page}:`, error);
    const content = document.getElementById('page-content');
    if (content) {
      content.innerHTML = `
        <div class="alert alert-danger" style="margin:20px;">
          <strong>Error loading page:</strong> ${error.message}
          <div style="margin-top:10px;font-family:monospace;font-size:12px;opacity:0.8">${error.stack}</div>
        </div>
      `;
    }
  }
}

async function renderPage(page) {
  switch (page) {
    case 'dashboard':   
      const { renderDashboard } = await import('../modules/dashboard/dashboard.js');
      renderDashboard();   
      break;
    case 'pastors':     
      const { renderPastors } = await import('../modules/pastors/index.js');
      renderPastors();     
      break;
    case 'assignments': 
      const { renderAssignments } = await import('../modules/assignments/index.js');
      renderAssignments(); 
      break;
    case 'districts':   
      const { renderDistricts } = await import('../modules/districts/index.js');
      renderDistricts();   
      break;
    case 'churches':    
      const { renderChurches } = await import('../modules/churches/index.js');
      renderChurches();    
      break;
    case 'conferences':
      const { renderConferences } = await import('../modules/events/conferences.js');
      renderConferences();
      break;
    case 'meals':
      const { renderMeals } = await import('../modules/events/meals.js');
      renderMeals();
      break;
    case 'disciples':
      const { renderDisciples } = await import('../modules/events/disciples.js');
      renderDisciples();
      break;
    case 'delegates':
      const { renderDelegates } = await import('../modules/events/delegates.js');
      renderDelegates();
      break;
    case 'reports':     
      const { renderReports } = await import('../modules/system/reports.js');
      renderReports();     
      break;
    case 'data':        
      const { renderDataPage } = await import('../modules/system/data.js');
      renderDataPage();    
      break;
    case 'help':        
      const { renderHelp } = await import('../modules/system/help.js');
      renderHelp();        
      break;
  }
}

export function initRouter() {
  document.addEventListener('DOMContentLoaded', () => {
    document.querySelectorAll('.nav-item[data-page]').forEach(el => {
      el.addEventListener('click', () => navigate(el.dataset.page));
    });
    
    // Default page
    const savedPage = localStorage.getItem('churchms_current_page') || 'dashboard';
    
    // Adding a short timeout ensures module scripts are fully loaded before rendering
    setTimeout(() => {
      navigate(savedPage);
    }, 50);
  });
}
