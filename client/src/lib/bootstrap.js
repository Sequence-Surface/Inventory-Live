// Bootstraps the dashboard: loads the dataset from MongoDB (via the API),
// hydrates localStorage from the persisted state collection, mirrors future
// localStorage writes back to MongoDB, exposes Chart.js + SheetJS as globals,
// then runs the original (verbatim) dashboard logic.

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

// Wrap localStorage so any key the app writes is also persisted to MongoDB,
// and removals are deleted server-side. Behavior of localStorage itself is
// unchanged (still synchronous, still the in-session source of truth).
function installLocalStorageMirror() {
  const nativeSet = Storage.prototype.setItem;
  const nativeRemove = Storage.prototype.removeItem;

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

  Storage.prototype.setItem = function (key, value) {
    nativeSet.call(this, key, value);
    if (this === window.localStorage) persist(key, value);
  };
  Storage.prototype.removeItem = function (key) {
    nativeRemove.call(this, key);
    if (this === window.localStorage) remove(key);
  };
}

export async function bootstrapDashboard() {
  if (started) return;
  started = true;

  // 1) Dataset from MongoDB -> the global the dashboard expects.
  window.__DATA__ = await fetchJSON('/api/data');

  // 2) Hydrate localStorage from persisted state (using the NATIVE setItem so
  //    we don't echo every value straight back to the server).
  try {
    const state = await fetchJSON('/api/state');
    const nativeSet = Storage.prototype.setItem;
    for (const [key, value] of Object.entries(state || {})) {
      if (typeof value === 'string') nativeSet.call(window.localStorage, key, value);
    }
  } catch (e) {
    console.warn('[bootstrap] could not hydrate state', e);
  }

  // 3) Mirror future writes back to MongoDB.
  installLocalStorageMirror();

  // 4) Expose the chart + spreadsheet libraries as globals (the original used
  //    CDN scripts that defined window.Chart / window.XLSX).
  window.Chart = Chart;
  window.XLSX = XLSX;

  // 5) Run the verbatim dashboard logic against the now-ready DOM + globals by
  //    injecting it as a classic script (non-strict, global scope, like the
  //    original inline <script>). Executes synchronously on append.
  const el = document.createElement('script');
  el.textContent = dashboardSrc;
  document.body.appendChild(el);
}
