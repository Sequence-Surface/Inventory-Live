// Sidebar navigation: hash-based page switching over the always-in-DOM page
// divs (the imperative dashboard script keeps every getElementById wire intact).
// Charts render at 0×0 while their page is hidden, so each activation resizes
// the newly visible canvases.

const PAGE_TITLES = {
  dashboard: 'Dashboard',
  actions: 'Action Centre',
  folders: 'Folders & Zones',
  vendors: 'Vendors',
  data: 'Data & Uploads',
  sync: 'Google Sheets Sync',
};
const DEFAULT_PAGE = 'dashboard';

function currentPageFromHash() {
  const m = (window.location.hash || '').match(/^#\/([a-z]+)/i);
  const page = m ? m[1].toLowerCase() : DEFAULT_PAGE;
  return PAGE_TITLES[page] ? page : DEFAULT_PAGE;
}

function activatePage(page) {
  document.querySelectorAll('.app-pages .page').forEach((el) => {
    el.classList.toggle('active', el.dataset.page === page);
  });
  document.querySelectorAll('[data-page-link]').forEach((el) => {
    el.classList.toggle('active', el.dataset.pageLink === page);
  });
  const title = document.getElementById('pageTitle');
  if (title) title.textContent = PAGE_TITLES[page] || page;
  // Resize charts that were laid out while hidden.
  requestAnimationFrame(() => {
    document.querySelectorAll('.app-pages .page.active canvas').forEach((c) => {
      const Chart = window.Chart;
      if (Chart && typeof Chart.getChart === 'function') {
        const inst = Chart.getChart(c);
        if (inst) inst.resize();
      }
    });
  });
  // Mobile: close the off-canvas sidebar after navigating.
  const sidebar = document.getElementById('appSidebar');
  if (sidebar) sidebar.classList.remove('open');
  const main = document.querySelector('.app-main');
  if (main) main.scrollTop = 0;
}

export function setupNav() {
  const apply = () => activatePage(currentPageFromHash());
  window.addEventListener('hashchange', apply);
  apply();

  const burger = document.getElementById('sidebarBurger');
  const sidebar = document.getElementById('appSidebar');
  if (burger && sidebar) {
    burger.addEventListener('click', () => sidebar.classList.toggle('open'));
  }

  const logout = document.getElementById('logoutBtn');
  if (logout) {
    logout.addEventListener('click', async () => {
      if (!confirm('Log out of the dashboard?')) return;
      try { await fetch('/api/auth/logout', { method: 'POST' }); } catch (e) {}
      window.location.reload();
    });
  }
}
