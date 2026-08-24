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
import { setupNav } from './nav.js';

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

// Apply the saved theme (mirrored into a cookie by the dashboard) so the login
// page and loading skeleton match the user's chosen look before sign-in.
function applySavedThemeEarly() {
  try {
    const m = (document.cookie.match(/(?:^|;\s*)inv_theme=([a-z]+):([a-z]+)/) || []);
    const mode = m[1] === 'light' ? 'light' : 'dark';
    const palette = ['violet', 'ocean', 'emerald'].includes(m[2]) ? m[2] : 'violet';
    document.documentElement.setAttribute('data-theme', mode);
    document.documentElement.setAttribute('data-palette', palette);
  } catch (e) { /* keep defaults */ }
}

// Full-screen sign-in overlay shown until the browser holds a valid session.
// Resolves once /api/auth/login succeeds.
function showLoginScreen() {
  return new Promise((resolve) => {
    const el = document.createElement('div');
    el.id = 'loginScreen';
    el.innerHTML = `
      <div class="login-card">
        <div class="login-logo" aria-hidden="true">&#9672;</div>
        <h1 class="login-title">Inventory <em>Intelligence</em></h1>
        <p class="login-sub">Sign in to continue</p>
        <form id="loginForm" autocomplete="on">
          <label class="login-label" for="loginUser">Username</label>
          <input class="login-input" id="loginUser" name="username" autocomplete="username" placeholder="Enter your username" required>
          <label class="login-label" for="loginPass">Password</label>
          <div class="login-pass-row">
            <input class="login-input" id="loginPass" name="password" type="password" autocomplete="current-password" placeholder="Enter your password" required>
            <button type="button" class="login-eye" id="loginEye" aria-label="Show password" title="Show / hide password">
              <svg id="loginEyeOn" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M2.06 12.35a1 1 0 0 1 0-.7 10.75 10.75 0 0 1 19.88 0 1 1 0 0 1 0 .7 10.75 10.75 0 0 1-19.88 0"/><circle cx="12" cy="12" r="3"/></svg>
              <svg id="loginEyeOff" style="display:none" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M10.73 5.08A10.43 10.43 0 0 1 12 5c7 0 10 7 10 7a13.16 13.16 0 0 1-1.67 2.68"/><path d="M6.61 6.61A13.53 13.53 0 0 0 2 12s3 7 10 7a9.74 9.74 0 0 0 5.39-1.61"/><line x1="2" y1="2" x2="22" y2="22"/><path d="M14.12 14.12a3 3 0 1 1-4.24-4.24"/></svg>
            </button>
          </div>
          <div class="login-error" id="loginError"></div>
          <button class="login-btn" id="loginSubmit" type="submit">Sign in</button>
        </form>
      </div>`;
    document.body.appendChild(el);
    const form = el.querySelector('#loginForm');
    const err = el.querySelector('#loginError');
    const btn = el.querySelector('#loginSubmit');
    // Show / hide password toggle
    const eye = el.querySelector('#loginEye');
    const passInput = el.querySelector('#loginPass');
    eye.addEventListener('click', () => {
      const show = passInput.type === 'password';
      passInput.type = show ? 'text' : 'password';
      el.querySelector('#loginEyeOn').style.display = show ? 'none' : '';
      el.querySelector('#loginEyeOff').style.display = show ? '' : 'none';
      eye.setAttribute('aria-label', show ? 'Hide password' : 'Show password');
      passInput.focus();
    });
    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      err.textContent = '';
      btn.disabled = true;
      btn.textContent = 'Signing in…';
      try {
        const res = await fetch('/api/auth/login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            username: el.querySelector('#loginUser').value.trim(),
            password: el.querySelector('#loginPass').value,
          }),
        });
        if (!res.ok) {
          const body = await res.json().catch(() => ({}));
          throw new Error(body.error || 'Sign-in failed');
        }
        el.remove();
        resolve();
      } catch (e2) {
        err.textContent = e2.message || 'Sign-in failed';
        btn.disabled = false;
        btn.textContent = 'Sign in';
      }
    });
    setTimeout(() => el.querySelector('#loginUser').focus(), 50);
  });
}

async function ensureAuthenticated() {
  const res = await fetch('/api/auth/me');
  if (res.ok) return;
  await showLoginScreen();
}

export async function bootstrapDashboard() {
  if (started) return;
  started = true;

  // 0) Theme first (from its cookie mirror), then sign in — every data API
  //    requires a session.
  applySavedThemeEarly();
  await ensureAuthenticated();

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

  // 4) Wire the sidebar navigation BEFORE the dashboard logic runs, so the
  //    default page is visible when charts get created (hidden canvases render
  //    at 0×0).
  setupNav();

  // 5) Run the verbatim dashboard logic against the now-ready DOM + globals by
  //    injecting it as a classic script (non-strict, global scope, like the
  //    original inline <script>). Executes synchronously on append.
  const el = document.createElement('script');
  el.textContent = dashboardSrc;
  document.body.appendChild(el);
}
