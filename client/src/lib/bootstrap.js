// Bootstraps the dashboard: loads the dataset from MongoDB (via the API),
// replaces window.localStorage with an in-memory store that is seeded from
// MongoDB and writes through to MongoDB (so the browser persists NOTHING on disk
// and every value originates from the database), exposes Chart.js + SheetJS as
// globals, then runs the original (verbatim) dashboard logic.

import Chart from 'chart.js/auto';
import * as XLSX from 'xlsx';
// Import the ported dashboard logic as raw text so we can inject it as a
// classic <script>. This runs in non-strict, global scope exactly like the
// original inline <script>, avoiding any ES-module strict-mode behavior change.
import dashboardSrc from '../dashboard.app.js?raw';

let started = false;

async function fetchJSON(url, opts) {
  const res = await fetch(url, opts);
  if (!res.ok) throw new Error(`${url} -> HTTP ${res.status}`);
  return res.json();
}

// Replace window.localStorage with a MongoDB-backed, in-memory store.
//  - Reads come from an in-memory Map that is SEEDED from MongoDB at startup,
//    so the dashboard's synchronous localStorage.getItem() calls still work.
//  - Writes update the Map AND write through to MongoDB (the /api/state routes).
//  - Nothing is written to the browser's real disk-backed localStorage, so the
//    browser stores no data — MongoDB is the single source of truth.
function installMongoBackedStorage(initialState) {
  const mem = new Map();
  for (const [key, value] of Object.entries(initialState || {})) {
    if (typeof value === 'string') mem.set(key, value);
  }

  const persist = (key, value) => {
    fetch(`/api/state/${encodeURIComponent(key)}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ value }),
    }).catch(() => {});
  };
  const remove = (key) => {
    fetch(`/api/state/${encodeURIComponent(key)}`, { method: 'DELETE' }).catch(() => {});
  };

  const shim = {
    getItem(key) { key = String(key); return mem.has(key) ? mem.get(key) : null; },
    setItem(key, value) { key = String(key); value = String(value); mem.set(key, value); persist(key, value); },
    removeItem(key) { key = String(key); mem.delete(key); remove(key); },
    clear() { const keys = [...mem.keys()]; mem.clear(); keys.forEach(remove); },
    key(i) { return [...mem.keys()][i] ?? null; },
    get length() { return mem.size; },
  };

  // Wipe any pre-existing browser-stored data so nothing stale lingers on disk,
  // then swap window.localStorage for the in-memory shim.
  try { window.localStorage && window.localStorage.clear(); } catch (e) {}
  try {
    Object.defineProperty(window, 'localStorage', { value: shim, configurable: true });
  } catch (e) {
    // Fallback for engines that won't let localStorage be redefined: route the
    // native Storage methods through the in-memory Map so the real disk store is
    // never read from or written to.
    Storage.prototype.getItem = function (k) { return shim.getItem(k); };
    Storage.prototype.setItem = function (k, v) { shim.setItem(k, v); };
    Storage.prototype.removeItem = function (k) { shim.removeItem(k); };
    Storage.prototype.clear = function () { shim.clear(); };
  }
}

export async function bootstrapDashboard() {
  if (started) return;
  started = true;

  // 1) Dataset from MongoDB -> the global the dashboard expects.
  window.__DATA__ = await fetchJSON('/api/data');

  // 2) Load persisted state from MongoDB, then install the in-memory,
  //    MongoDB-backed localStorage replacement (browser stores nothing on disk).
  let state = {};
  try {
    state = await fetchJSON('/api/state');
  } catch (e) {
    console.warn('[bootstrap] could not load state from MongoDB', e);
  }
  installMongoBackedStorage(state);

  // 3) Expose the chart + spreadsheet libraries as globals (the original used
  //    CDN scripts that defined window.Chart / window.XLSX).
  window.Chart = Chart;
  window.XLSX = XLSX;

  // 4) Run the verbatim dashboard logic against the now-ready DOM + globals by
  //    injecting it as a classic script (non-strict, global scope, like the
  //    original inline <script>). Executes synchronously on append.
  const el = document.createElement('script');
  el.textContent = dashboardSrc;
  document.body.appendChild(el);
}
