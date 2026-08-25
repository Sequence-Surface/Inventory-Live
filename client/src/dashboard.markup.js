// Exact body markup ported verbatim from the original dashboard HTML.
// Rendered into the DOM by App.jsx so the original logic (which uses
// getElementById) operates against an identical DOM tree.
/* eslint-disable */
export const DASHBOARD_HTML = `

<!-- Fixed top-right button: re-fetch the latest data from MongoDB and reload the dashboard -->

<!-- Processing loader overlay — shown while an uploaded file is being cleaned & the dashboard rebuilt -->
<div id="processingOverlay" style="display:none;">
  <div class="proc-box">
    <div class="proc-spinner"></div>
    <div class="proc-msg" id="processingMsg">Processing…</div>
  </div>
</div>

<!-- Floating Reorder-Now total panel (draggable; defaults to right-middle of viewport) -->
<div id="reorderFloatingTotal" aria-live="polite">
  <div class="rft-drag" title="Drag to reposition"><span>Drag</span><span class="rft-drag-handle">⠿</span></div>
  <div class="rft-label">Total Order Qty</div>
  <div class="rft-qty" id="rftQty">0</div>
  <div class="rft-meta"><span>Rows: <strong id="rftRows">0</strong></span><span>Vendors: <strong id="rftVendors">0</strong></span></div>
</div>

<!-- AI settings gear (fixed top-right) -->
<button id="aiGearBtn" type="button" class="ai-gear" title="AI settings — API key, model, system prompt" aria-label="AI settings">⚙</button>

<!-- AI settings modal -->
<div id="aiSettingsOverlay" class="ai-overlay" aria-hidden="true">
  <div class="ai-modal" role="dialog" aria-labelledby="aiSettingsTitle">
    <div class="ai-modal-head">
      <h3 id="aiSettingsTitle">AI Settings</h3>
      <button type="button" class="ai-close" id="aiSettingsClose" aria-label="Close">×</button>
    </div>
    <div class="ai-modal-body">
      <label class="ai-field-label">Anthropic API key</label>
      <div class="ai-field-row">
        <input type="password" id="aiApiKeyInput" class="ai-input" placeholder="sk-ant-..." autocomplete="off" spellcheck="false">
        <button type="button" class="ai-input-toggle" id="aiApiKeyShow" title="Show / hide">👁</button>
      </div>
      <div class="ai-help">Stored only in your browser (localStorage). <a href="https://console.anthropic.com/settings/keys" target="_blank" rel="noopener" style="color: var(--accent);">Get a key →</a></div>

      <label class="ai-field-label">Model</label>
      <select id="aiModelSelect" class="ai-input">
        <option value="claude-sonnet-4-6">Sonnet 4.6 — recommended (balanced cost / smarts)</option>
        <option value="claude-opus-4-6">Opus 4.6 — most capable (slowest, most expensive)</option>
        <option value="claude-haiku-4-5-20251001">Haiku 4.5 — fastest, cheapest</option>
      </select>
      <div class="ai-help">Different models have different speed / cost / capability tradeoffs.</div>

      <label class="ai-field-label">System prompt</label>
      <textarea id="aiSystemPromptInput" class="ai-input" rows="6">You are a senior inventory analyst helping the user reason about SKU-level demand, supply, and reorder decisions. The user will paste structured briefs from their inventory dashboard. Be specific: cite numbers from the brief, reference particular months when relevant, distinguish ongoing trends from one-off spikes. When the data is ambiguous, say so plainly. Offer pragmatic recommendations the user can act on this week. Be concise but thorough — short paragraphs and bullet points are fine.</textarea>
      <div class="ai-help">Tune Claude's persona / focus for inventory questions.</div>

      <div class="ai-stats">
        <div><strong id="aiTokensIn">0</strong> input tokens</div>
        <div><strong id="aiTokensOut">0</strong> output tokens</div>
        <div>~<strong id="aiCostEstimate">$0.00</strong> estimated</div>
      </div>
    </div>
    <div class="ai-modal-foot">
      <button type="button" class="dl-btn" id="aiSettingsReset">Reset prompt</button>
      <button type="button" class="dl-btn primary" id="aiSettingsSave">Save</button>
    </div>
  </div>
</div>

<!-- AI chat side panel -->
<aside id="aiChatPanel" class="ai-chat-panel" aria-hidden="true">
  <div class="ai-chat-head">
    <div class="ai-chat-title">
      <span class="ai-chat-sparkle">✦</span>
      <strong id="aiChatSkuName">AI Analysis</strong>
    </div>
    <div class="ai-chat-actions">
      <button type="button" class="dl-btn" id="aiChatCopy" title="Copy current SKU brief to clipboard">Copy brief</button>
      <button type="button" class="dl-btn" id="aiChatNew" title="Start a new conversation">New chat</button>
      <button type="button" class="ai-close" id="aiChatClose" aria-label="Close">×</button>
    </div>
  </div>

  <div class="ai-chat-context" id="aiChatContext">
    <div class="ai-chat-context-head">
      <strong>SKU context</strong>
      <button type="button" class="ai-context-toggle" id="aiChatContextToggle">▾ collapse</button>
    </div>
    <pre id="aiChatContextBody" class="ai-chat-context-body"></pre>
  </div>

  <div class="ai-chat-messages" id="aiChatMessages">
    <div class="ai-chat-empty">Ask anything about this SKU. Try one of the suggested questions in the brief, or type your own.</div>
  </div>

  <div class="ai-chat-input-row">
    <textarea id="aiChatInput" class="ai-input" rows="2" placeholder="Ask why this SKU spiked, whether to order, what trends to watch for..."></textarea>
    <button type="button" class="dl-btn primary" id="aiChatSend">Send</button>
  </div>
  <div class="ai-chat-footer">
    <span id="aiChatStatus"></span>
    <span id="aiChatSessionCost" style="color: var(--text-3); margin-left: auto;"></span>
  </div>
</aside>

<div class="app-shell">
<aside class="sidebar" id="appSidebar">
  <div class="sidebar-brand">
    <div class="sidebar-logo" aria-hidden="true">&#9672;</div>
    <div class="sidebar-brand-text"><strong>Inventory</strong><em>Intelligence</em></div>
  </div>
  <nav class="sidebar-nav" id="sidebarNav" aria-label="Main navigation">
    <a class="nav-item" href="#/dashboard" data-page-link="dashboard"><span class="nav-icn"><svg class="nav-icn-svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="3" y="3" width="7" height="9" rx="1"/><rect x="14" y="3" width="7" height="5" rx="1"/><rect x="14" y="12" width="7" height="9" rx="1"/><rect x="3" y="16" width="7" height="5" rx="1"/></svg></span><span class="nav-label">Dashboard</span></a>
    <a class="nav-item" href="#/actions" data-page-link="actions"><span class="nav-icn"><svg class="nav-icn-svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></svg></span><span class="nav-label">Action Centre</span></a>
    <a class="nav-item" href="#/folders" data-page-link="folders"><span class="nav-icn"><svg class="nav-icn-svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M20 20a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2h-7.9a2 2 0 0 1-1.69-.9L9.6 3.9A2 2 0 0 0 7.93 3H4a2 2 0 0 0-2 2v13a2 2 0 0 0 2 2Z"/></svg></span><span class="nav-label">Folders &amp; Zones</span></a>
    <a class="nav-item" href="#/vendors" data-page-link="vendors"><span class="nav-icn"><svg class="nav-icn-svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M14 18V6a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2v11a1 1 0 0 0 1 1h2"/><path d="M15 18H9"/><path d="M19 18h2a1 1 0 0 0 1-1v-3.65a1 1 0 0 0-.22-.62l-3.48-4.35A1 1 0 0 0 17.52 8H14"/><circle cx="17" cy="18" r="2"/><circle cx="7" cy="18" r="2"/></svg></span><span class="nav-label">Vendors</span></a>
    <a class="nav-item" href="#/data" data-page-link="data"><span class="nav-icn"><svg class="nav-icn-svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><ellipse cx="12" cy="5" rx="9" ry="3"/><path d="M3 5v14a9 3 0 0 0 18 0V5"/><path d="M3 12a9 3 0 0 0 18 0"/></svg></span><span class="nav-label">Data &amp; Uploads</span></a>
    <a class="nav-item" href="#/sync" data-page-link="sync"><span class="nav-icn"><svg class="nav-icn-svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8"/><path d="M21 3v5h-5"/><path d="M21 12a9 9 0 0 1-9 9 9.75 9.75 0 0 1-6.74-2.74L3 16"/><path d="M8 16H3v5"/></svg></span><span class="nav-label">Sheets Sync</span></a>
  </nav>
  <div class="sidebar-foot">
    <button class="theme-toggle" id="themeToggle" aria-label="Toggle light/dark theme" type="button">
      <span data-theme-val="dark">&#9790; DARK</span>
      <span data-theme-val="light">&#9728; LIGHT</span>
    </button>
    <button class="logout-btn" id="logoutBtn" type="button" title="Sign out of the dashboard">
      <svg class="nav-icn-svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>
      <span class="nav-label">Log out</span>
    </button>
    <div class="sidebar-version">v5.0 &middot; database edition</div>
  </div>
</aside>
<div class="app-main">
  <header class="topbar">
    <button class="sidebar-burger" id="sidebarBurger" aria-label="Toggle navigation" type="button">&#9776;</button>
    <h2 class="topbar-title" id="pageTitle">Dashboard</h2>
    <div class="topbar-meta">
      <span class="topbar-pill" title="Latest month present in your uploaded sales/purchase history">Data through&nbsp;<strong id="dataThroughLabel">&mdash;</strong></span>
      <span class="topbar-pill" title="Most recent upload stored in the database"><span id="lastUploadLabel">no uploads yet</span></span>
      <select class="ui-select theme-select" id="themeSelect" title="Choose a theme — colors apply everywhere instantly">
        <option value="light:violet">Light &middot; Violet</option>
        <option value="light:ocean">Light &middot; Ocean</option>
        <option value="light:emerald">Light &middot; Emerald</option>
        <option value="dark:violet">Dark &middot; Violet</option>
        <option value="dark:ocean">Dark &middot; Ocean</option>
        <option value="dark:emerald">Dark &middot; Emerald</option>
      </select>
      <button id="syncMongoBtnTop" class="sync-top-btn" title="Fetch the latest data from MongoDB and reload"><svg class="btn-icn-svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8"/><path d="M21 3v5h-5"/><path d="M21 12a9 9 0 0 1-9 9 9.75 9.75 0 0 1-6.74-2.74L3 16"/><path d="M8 16H3v5"/></svg> Sync</button>
    </div>
  </header>
  <main class="app-pages">
<div class="page" data-page="dashboard">
<!-- 01 KPIs -->
<section class="section">
  <div class="section-head">
    <span class="section-num">01 /</span>
    <span class="section-title">Portfolio at a <em>glance</em></span>
    <span class="section-rule"></span>
  </div>
  <div class="kpis" id="kpis"></div>
</section>
<!-- 02 Aggregate flow -->
<section class="section">
  <div class="section-head">
    <span class="section-num">02 /</span>
    <span class="section-title">Aggregate flow — <em>24 months</em></span>
    <span class="section-rule"></span>
  </div>
  <div class="insight reveal reveal-1">
    <span class="insight-icon">↗</span>
    <span class="insight-text" id="aggInsightText"></span>
  </div>
  <div class="panel reveal reveal-2">
    <h3 class="panel-title">Total purchases vs sales · all SKUs</h3>
    <p class="panel-sub">bars: purchases · line: sales</p>
    <div class="chart-wrap xtall"><canvas id="aggChart"></canvas></div>
  </div>
</section>
<!-- 03 Stock health -->
<section class="section">
  <div class="section-head">
    <span class="section-num">03 /</span>
    <span class="section-title">Stock health & <em>ABC mix</em></span>
    <span class="section-rule"></span>
  </div>
  <div class="grid-3-cols">
    <div class="panel reveal reveal-1">
      <h3 class="panel-title">Stock status</h3>
      <p class="panel-sub">products by inventory state</p>
      <div class="chart-wrap"><canvas id="statusChart"></canvas></div>
    </div>
    <div class="panel reveal reveal-2">
      <h3 class="panel-title">ABC · Pareto</h3>
      <p class="panel-sub">A items drive 80% of revenue</p>
      <div class="chart-wrap"><canvas id="abcChart"></canvas></div>
    </div>
    <div class="panel reveal reveal-3">
      <h3 class="panel-title">Mover status</h3>
      <p class="panel-sub">activity in last 13 months</p>
      <div class="chart-wrap"><canvas id="moverChart"></canvas></div>
    </div>
  </div>
</section>
</div>

<div class="page" data-page="actions">
<!-- 04 Action centre -->
<section class="section">
  <div class="section-head">
    <span class="section-num">04 /</span>
    <span class="section-title">Action centre — <em>monthly view, filters & exports</em></span>
    <span class="section-rule"></span>
  </div>

  <div class="insight danger reveal reveal-1">
    <span class="insight-icon">!</span>
    <span class="insight-text" id="actionInsightText"></span>
  </div>

  <div class="panel reveal reveal-2" id="section4Panel">
    <div class="download-row">
      <button class="dl-btn primary" id="dlReorder"><span class="icn"><svg class="btn-icn-svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg></span> Reorder Plan (uses my edits)</button>
      <button class="dl-btn" id="dlSlow"><span class="icn"><svg class="btn-icn-svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg></span> Slow / Non-Moving</button>
      <button class="dl-btn" id="dlOver"><span class="icn"><svg class="btn-icn-svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg></span> Overstocked</button>
      <button class="dl-btn" id="dlMonthly"><span class="icn"><svg class="btn-icn-svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg></span> Current monthly view</button>
      <button class="dl-btn" id="dlMaster"><span class="icn"><svg class="btn-icn-svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg></span> Master parent-child list</button>
    </div>

    <div class="filter-bar">
      <div class="filter-bar-head"><svg class="flt-icn" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M3 4h18l-7 8v6l-4 2v-8L3 4z"/></svg><span class="fbh-title">Filters</span><span class="fbh-hint">narrow down the 24-month table below</span><button type="button" class="fbh-clear" id="filterClearAll">Clear all filters</button></div>
      <div class="filter-group multi" data-filter="search">
        <div class="filter-label"><svg class="flt-icn" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/></svg>Search product <span class="ms-count" id="searchCount"></span></div>
        <input class="ms-input" id="searchInput" placeholder="Search &amp; select products…" autocomplete="off">
        <div class="ms-chips" id="searchChips"></div>
        <div class="filter-hint">Find products by name &mdash; pick several to compare</div>
      </div>
      <div class="filter-group multi" data-filter="cat">
        <div class="filter-label"><svg class="flt-icn" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12.586 2.586A2 2 0 0 0 11.172 2H4a2 2 0 0 0-2 2v7.172a2 2 0 0 0 .586 1.414l8.704 8.704a2.426 2.426 0 0 0 3.42 0l6.58-6.58a2.426 2.426 0 0 0 0-3.42z"/><circle cx="7.5" cy="7.5" r="1"/></svg>Category <span class="ms-count" id="catCount"></span></div>
        <input class="ms-input" id="catFilter" placeholder="Search &amp; select categories…" autocomplete="off">
        <datalist id="catList"></datalist>
        <div class="ms-chips" id="catChips"></div>
        <div class="filter-hint">Only products from the chosen categories</div>
      </div>
      <div class="filter-group multi" data-filter="vendor">
        <div class="filter-label"><svg class="flt-icn" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M14 18V6a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2v11a1 1 0 0 0 1 1h2"/><path d="M15 18H9"/><path d="M19 18h2a1 1 0 0 0 1-1v-3.65a1 1 0 0 0-.22-.62l-3.48-4.35A1 1 0 0 0 17.52 8H14"/><circle cx="17" cy="18" r="2"/><circle cx="7" cy="18" r="2"/></svg>Vendor <span class="ms-count" id="vendorCount"></span></div>
        <input class="ms-input" id="vendorFilter" placeholder="Search &amp; select vendors…" autocomplete="off">
        <datalist id="vendorList"></datalist>
        <div class="ms-chips" id="vendorChips"></div>
        <div class="filter-hint">Only products bought from these suppliers</div>
      </div>
      <div class="filter-group multi" data-filter="folder">
        <div class="filter-label"><svg class="flt-icn" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M20 20a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2h-7.9a2 2 0 0 1-1.69-.9L9.6 3.9A2 2 0 0 0 7.93 3H4a2 2 0 0 0-2 2v13a2 2 0 0 0 2 2Z"/></svg>Folder <span class="ms-count" id="folderCount"></span></div>
        <input class="ms-input" id="folderFilter" placeholder="Search &amp; select folders…" autocomplete="off">
        <datalist id="folderList"></datalist>
        <div class="ms-chips" id="folderChips"></div>
        <div class="filter-hint">Limit the table to specific folders</div>
      </div>
      <div class="filter-group multi" data-filter="abc">
        <div class="filter-label"><svg class="flt-icn" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m12.83 2.18a2 2 0 0 0-1.66 0L2.6 6.08a1 1 0 0 0 0 1.83l8.58 3.91a2 2 0 0 0 1.66 0l8.58-3.9a1 1 0 0 0 0-1.83z"/><path d="m22 12.18-9.17 4.16a2 2 0 0 1-1.66 0L2 12.18"/><path d="m22 17.18-9.17 4.16a2 2 0 0 1-1.66 0L2 17.18"/></svg>ABC class <span class="ms-count" id="abcCount"></span></div>
        <div class="ms-toggles" id="abcToggles">
          <button class="ms-toggle" data-val="0">A</button>
          <button class="ms-toggle" data-val="1">B</button>
          <button class="ms-toggle" data-val="2">C</button>
        </div>
        <div class="filter-hint">A = top sellers that drive 80% of sales</div>
      </div>
      <div class="filter-group multi" data-filter="status">
        <div class="filter-label"><svg class="flt-icn" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M22 12h-2.48a2 2 0 0 0-1.93 1.46l-2.35 8.36a.25.25 0 0 1-.48 0L9.24 2.18a.25.25 0 0 0-.48 0l-2.35 8.36A2 2 0 0 1 4.49 12H2"/></svg>Status <span class="ms-count" id="statusCount"></span></div>
        <button type="button" class="ui-select ui-dropbtn" id="statusDropBtn">All statuses</button>
        <div class="combo-panel" id="statusPanel">
          <div class="ms-toggles vertical" id="statusToggles"></div>
        </div>
        <div class="filter-hint">Stock health &mdash; critical, low, healthy, overstocked&hellip;</div>
      </div>
      <div class="filter-group" data-filter="mover">
        <div class="filter-label"><svg class="flt-icn" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M8 6h13"/><path d="M8 12h13"/><path d="M8 18h13"/><path d="m3 6 1 1 2-2"/><path d="m3 12 1 1 2-2"/><path d="m3 18 1 1 2-2"/></svg>Movement <span class="ms-count" id="moverCount2"></span></div>
        <select class="ui-select" id="moverFilterSel">
          <option value="">All movement</option>
          <option value="Active">Active (sold recently)</option>
          <option value="Sluggish (3-6m)">Sluggish &middot; 3&ndash;6 months</option>
          <option value="Slow (6-12m)">Slow &middot; 6&ndash;12 months</option>
          <option value="Non-Moving (12m+)">Non-moving &middot; 12+ months</option>
          <option value="No Stock">No stock &amp; no sales</option>
        </select>
        <div class="filter-hint">How recently each product last sold</div>
      </div>
      <div class="filter-group" data-filter="demand">
        <div class="filter-label"><svg class="flt-icn" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M2 12h3l3-9 4 18 3-9h3"/><path d="M18 12h4"/></svg>Demand type <span class="ms-count" id="demandCount2"></span></div>
        <select class="ui-select" id="demandFilterSel" title="The demand-shape badge shown on every row (drives the Auto reorder formula)">
          <option value="">All demand types</option>
          <option value="smooth">Smooth &middot; steady sellers</option>
          <option value="trending">Trending &middot; recent shift</option>
          <option value="intermittent">Intermittent &middot; many zero months</option>
          <option value="lumpy">Lumpy &middot; project orders</option>
          <option value="erratic">Erratic &middot; unpredictable</option>
          <option value="dead">Dead &middot; no sales 6m</option>
        </select>
        <div class="filter-hint">The sales pattern the reorder maths uses</div>
      </div>
      <div class="filter-group" data-filter="stocklvl">
        <div class="filter-label"><svg class="flt-icn" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 2v20"/><path d="m19 15-7 7-7-7"/><rect x="4" y="2" width="16" height="8" rx="2"/></svg>Stock level <span class="ms-count" id="stockLvlCount2"></span></div>
        <select class="ui-select" id="stockLvlFilterSel">
          <option value="">All stock levels</option>
          <option value="instock">In stock</option>
          <option value="outstock">Out of stock</option>
          <option value="pipeline">Has pipeline (transit / PO)</option>
          <option value="cover15">Cover under 15 days</option>
          <option value="cover30">Cover under 30 days</option>
          <option value="over180">Overcovered &middot; 180+ days</option>
        </select>
        <div class="filter-hint">What's in stock, out of stock, or running low</div>
      </div>
      <div class="filter-group" data-filter="age">
        <div class="filter-label"><svg class="flt-icn" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M8 2v4"/><path d="M16 2v4"/><rect width="18" height="18" x="3" y="4" rx="2"/><path d="M3 10h18"/><path d="M8 14h.01"/><path d="M12 14h.01"/><path d="M16 14h.01"/></svg>Product age <span class="ms-count" id="ageCount2"></span></div>
        <select class="ui-select" id="ageFilterSel" title="Months since the product's launch date (from your master)">
          <option value="">All ages</option>
          <option value="new3">New &middot; launched &le;3 months</option>
          <option value="young6">Young &middot; launched &le;6 months</option>
          <option value="est">Established &middot; over 6 months</option>
        </select>
        <div class="filter-hint">Time since the product was launched</div>
      </div>
    </div>

    <div id="monthlyControls" style="margin-bottom: 16px;">
      <div class="filter-bar simpler">
        <div class="filter-group">
          <div class="filter-label"><svg class="flt-icn" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M8 2v4"/><path d="M16 2v4"/><rect width="18" height="18" x="3" y="4" rx="2"/><path d="M3 10h18"/></svg>Period</div>
          <select class="ui-select" id="periodSelect">
            <option value="6">Last 6 months</option>
            <option value="12">Last 12 months</option>
            <option value="24" selected>Last 24 months</option>
            <option value="custom">Custom range…</option>
          </select>
          <div class="custom-range" id="customRange">
            <select id="customStart" class="ui-select"></select>
            <span style="color:var(--text-3); font-family:var(--mono); font-size:11px">→</span>
            <select id="customEnd" class="ui-select"></select>
          </div>
        <div class="filter-hint">How many months the table shows</div>
        </div>
        <div class="filter-group">
          <div class="filter-label"><svg class="flt-icn" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M2.06 12.35a1 1 0 0 1 0-.7 10.75 10.75 0 0 1 19.88 0 1 1 0 0 1 0 .7 10.75 10.75 0 0 1-19.88 0"/><circle cx="12" cy="12" r="3"/></svg>View</div>
          <select class="ui-select" id="viewSelect">
            <option value="sales" selected>Sales only</option>
            <option value="purchases">Purchases only</option>
            <option value="both">Sales + Purchases</option>
          </select>
        <div class="filter-hint">Show sales, purchases, or both in the table</div>
        </div>
        <div class="filter-group" style="display:flex; align-items:center; justify-content:center; gap:14px;">
          <span style="font-family:var(--mono); font-size:10px; color:var(--text-3); letter-spacing:0.1em;">
            <span style="display:inline-block; width:16px; height:2px; background:var(--indigo); margin-right:6px; vertical-align:middle;"></span>Current month
          </span>
          <span style="font-family:var(--mono); font-size:10px; color:var(--text-3); letter-spacing:0.1em;">
            <span style="display:inline-block; width:7px; height:7px; background:var(--red); border-radius:50%; box-shadow:0 0 6px var(--red); margin-right:6px; vertical-align:middle;"></span>Bulk purchase anomaly
          </span>
          <span style="font-family:var(--mono); font-size:10px; color:var(--text-3); letter-spacing:0.1em;">
            <span style="display:inline-block; width:7px; height:7px; background:var(--purple); border-radius:50%; box-shadow:0 0 6px var(--purple); margin-right:6px; vertical-align:middle;"></span>Sales spike (project order)
          </span>
        </div>
      </div>
    </div>

    <div class="tabs">
      <div class="tab active" data-tab="monthly">Monthly P/S Detail <span class="tab-count" id="monthlyCount"></span></div>
      <div class="tab" data-tab="reorder">Reorder Now <span class="tab-count" id="reorderCount"></span></div>
      <div class="tab" data-tab="bulk">Bulk-Order Flags <span class="tab-count" id="bulkCount"></span></div>
      <div class="tab" data-tab="slow">Slow / Non-Moving <span class="tab-count" id="slowCount"></span></div>
      <div class="tab" data-tab="overstock">Overstocked <span class="tab-count" id="overCount"></span></div>
    </div>

    <div class="tab-panel active" id="tab-monthly">
      <div class="mgrid-wrap">
        <table class="mgrid" id="mgridTable">
          <thead id="mgridHead"></thead>
          <tbody id="mgridBody"></tbody>
        </table>
      </div>
      <div class="paginator">
        <div class="pag-info" id="pagInfo">—</div>
        <div class="pag-controls">
          <button class="pag-btn" id="pagPrev">‹ Prev</button>
          <button class="pag-btn" id="pagNext">Next ›</button>
        </div>
      </div>
    </div>

    <div class="tab-panel" id="tab-reorder">
      <div class="reorder-actions">
        <span class="edit-summary"><strong id="editCount">0</strong> manual edits · CSV uses your final values</span>
        <button class="ai-btn" id="aiPortfolioBtn" type="button" title="Copy a portfolio-level AI brief for the currently-filtered list (aggregate stats + one-line summary per SKU). Paste into Claude to ask portfolio-wide questions.">Copy AI portfolio brief</button>
        <button class="reset-btn" id="resetEdits">Reset edits</button>
      </div>
      <div class="planning-bar">
        <div class="planning-row">
          <div class="planning-label">PLAN STOCK FOR:</div>
          <select class="ui-select planning-select" id="planningSelect">
            <option value="30">30 days</option>
            <option value="45">45 days</option>
            <option value="60" selected>60 days</option>
            <option value="75">75 days</option>
            <option value="90">90 days</option>
            <option value="120">120 days</option>
            <option value="abc">By ABC class (A 30 &middot; B 60 &middot; C 90)</option>
          </select>
          <div class="planning-info" style="font-size:10px; line-height: 1.5;" id="planningInfo">
            <!-- populated by renderPlanningInfo() — reflects the currently-selected planning days -->
          </div>
        </div>
        <div class="planning-row">
          <div class="planning-label" title="How to estimate monthly demand from sales history. Auto routes per-SKU based on its detected demand pattern (Smooth / Lumpy / Intermittent / Trending / Erratic / Dead).">DEMAND BASIS:</div>
          <select class="ui-select planning-select" id="demandBasisSelect" title="How to estimate monthly demand from sales history">
            <option value="auto" selected>Auto (recommended)</option>
            <option value="mean6">Mean of last 6 months</option>
            <option value="median6">Median of last 6 months</option>
            <option value="trimmed6">Trimmed mean 6 months</option>
            <option value="median12">Median of last 12 months</option>
          </select>
          <div class="planning-info" style="font-size:10px; line-height: 1.5;" id="demandInfo">
            <!-- populated by renderDemandInfo() — reflects the currently-selected method -->
          </div>
        </div>
        <div class="planning-row">
          <div class="planning-label">SHOW:</div>
          <select class="ui-select planning-select" id="reorderScopeSelect">
            <option value="needed" selected>Need order now</option>
            <option value="auto">Auto-flagged</option>
            <option value="manual">Manual added</option>
            <option value="all">All</option>
          </select>
          <div class="planning-info" style="font-size:10px; line-height: 1.5;" id="scopeInfo">
            <!-- populated by renderScopeInfo() — reflects the currently-selected scope -->
          </div>
        </div>
      </div>
      <div class="manual-add-bar">
        <div class="manual-add-row">
          <input id="manualAddSearch" placeholder="Search &amp; select products to add to the reorder list…" autocomplete="off">
          <datalist id="allProductsList"></datalist>
          <button class="dl-btn" id="manualAddBtn"><span class="icn">+</span> Add</button>
        </div>
        <div id="manualAddStatus" class="manual-status"></div>
        <div id="manualChips" class="manual-chips"></div>
      </div>
      <div class="mgrid-wrap compact-grid" style="max-height: 560px;">
        <table class="mgrid compact" id="rmgridTable">
          <thead id="rmgridHead"></thead>
          <tbody id="rmgridBody"></tbody>
        </table>
      </div>
      <div class="paginator">
        <div class="pag-info" id="rPagInfo">—</div>
        <div class="pag-controls">
          <button class="pag-btn" id="rPagPrev">‹ Prev</button>
          <button class="pag-btn" id="rPagNext">Next ›</button>
        </div>
      </div>
    </div>

    <div class="tab-panel" id="tab-bulk">
      <div class="table-wrap">
        <table>
          <thead><tr>
            <th>Vendor</th><th>Product</th><th>Folder</th><th>ABC</th>
            <th class="num">Stock</th><th class="num">Anomaly Months</th><th class="num">Total Buy 24M</th><th class="num">Total Sold 24M</th>
            <th>Pattern</th>
          </tr></thead>
          <tbody id="bulkBody"></tbody>
        </table>
      </div>
    </div>

    <div class="tab-panel" id="tab-slow">
      <div class="table-wrap">
        <table>
          <thead><tr>
            <th>Status</th><th>Vendor</th><th>Product</th><th>Folder</th>
            <th>ABC</th><th class="num">Stock</th><th class="num">Months Since Sale</th>
            <th class="num">Annual</th><th class="num">Turnover</th><th>Action</th>
          </tr></thead>
          <tbody id="slowBody"></tbody>
        </table>
      </div>
    </div>

    <div class="tab-panel" id="tab-overstock">
      <div class="table-wrap">
        <table>
          <thead><tr>
            <th>Vendor</th><th>Product</th><th>Folder</th>
            <th>ABC</th><th class="num">Stock</th><th class="num">Avg/mo</th>
            <th class="num">Days Cover</th><th class="num">Annual</th><th class="num">Turnover</th>
          </tr></thead>
          <tbody id="overBody"></tbody>
        </table>
      </div>
    </div>
  </div>
</section>
</div>

<div class="page" data-page="folders">
<!-- 05 Folder Browser -->
<section class="section">
  <div class="section-head">
    <span class="section-num">05 /</span>
    <span class="section-title">Folder <em>browser</em></span>
    <span class="section-rule"></span>
  </div>
  <div class="panel reveal reveal-1">
    <h3 class="panel-title">Browse SKUs by folder · parent + child codes</h3>
    <p class="panel-sub">select a folder to see every parent and all its children inside it</p>

    <div class="filter-bar simpler" style="margin-bottom: 20px;">
      <div class="filter-group">
        <div class="filter-label">Folder</div>
        <select id="folderSelect">
          <option value="">— Select folder —</option>
        </select>
      </div>
      <div class="filter-group">
        <div class="filter-label">Filter products in folder</div>
        <input id="folderProductFilter" placeholder="Search product name…" autocomplete="off">
      </div>
      <div class="filter-group" style="display:flex; align-items:center; justify-content:center;">
        <button class="dl-btn" id="dlFolder" disabled style="opacity:0.4"><span class="icn"><svg class="btn-icn-svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg></span> Folder contents (CSV)</button>
      </div>
    </div>

    <div class="folder-summary" id="folderSummary" style="display:none;"></div>

    <div class="table-wrap" id="folderTableWrap" style="display:none;">
      <table>
        <thead><tr>
          <th></th><th>Parent Code</th><th>Vendor</th>
          <th>ABC</th><th class="num">Age</th><th class="num">Stock</th><th class="num">Annual Sales</th>
          <th class="num">Children</th><th>Status</th>
        </tr></thead>
        <tbody id="folderBody"></tbody>
      </table>
    </div>
    <div id="folderEmpty" style="text-align:center; padding:40px; color:var(--text-3); font-family:var(--mono); font-size:12px;">
      Select a folder above to see its contents
    </div>
  </div>
</section>
<!-- 10 Zone browser — folders/catalogs grouped into zones 1–6, Open, Unclassified -->
<section class="section">
  <div class="section-head">
    <span class="section-num">10 /</span>
    <span class="section-title">Zone <em>browser</em></span>
    <span class="section-rule"></span>
  </div>
  <div class="panel reveal reveal-1">
    <h3 class="panel-title">Folders grouped by zone</h3>
    <p class="panel-sub">Click a zone to see the folders in it. Each card shows the folder's other zone memberships, child SKU count and parent count. Assign zones via the <strong style="color:var(--accent)">zone</strong> column in the Master CSV (Section 07). A folder can be in multiple zones; <strong style="color:var(--accent)">open</strong> means in all six; blank means not yet classified.</p>

    <div class="zone-tabs" id="zoneTabs"></div>
    <div id="zoneStatusLine" class="zone-status-line"></div>
    <div id="zoneContent"></div>
  </div>
</section>
</div>

<div class="page" data-page="vendors">
<!-- 06 Vendor rollup -->
<section class="section">
  <div class="section-head">
    <span class="section-num">06 /</span>
    <span class="section-title">Vendor <em>rollup</em></span>
    <span class="section-rule"></span>
  </div>
  <div class="panel reveal reveal-1">
    <h3 class="panel-title">By supplier — SKU mix, sales, reorder pipeline</h3>
    <p class="panel-sub">click any row to filter the action centre to that vendor</p>
    <div class="table-wrap" style="max-height: 460px;">
      <table>
        <thead><tr>
          <th>Code</th><th>Vendor</th><th>City</th>
          <th class="num">SKUs</th><th class="num">Annual Sales</th>
          <th class="num">Stock</th><th class="num">Reorder Qty</th>
          <th class="num">Reorder SKUs</th><th class="num">Slow SKUs</th>
        </tr></thead>
        <tbody id="vendorBody"></tbody>
      </table>
    </div>
  </div>
</section>
</div>

<div class="page" data-page="data">
<!-- 07 Master mapping — direct CSV/Excel upload (also available via Google Sheets Sync). -->
<section class="section">
  <div class="section-head">
    <span class="section-num">07 /</span>
    <span class="section-title">Master parent-child <em>mapping</em></span>
    <span class="section-rule"></span>
  </div>
  <div class="panel reveal reveal-1">
    <h3 class="panel-title">Upload your real parent ↔ child ↔ folder mapping</h3>
    <p class="panel-sub">CSV or Excel (.xlsx / .xls) · once uploaded the dashboard uses your codes everywhere · stays loaded across reloads · upload once, sales data periodically · Use <strong style="color:var(--accent)">↓ Template</strong> to get a starter file</p>

    <div class="upload-zone" id="uploadZone">
      <div class="upload-meta">
        <div class="upload-status" id="uploadStatus">Using synthetic mapping — upload your real master CSV to swap in</div>
        <div class="upload-spec">
          <strong style="color:var(--accent)">Raw Product Master export?</strong> Just upload it — files with columns <span style="color:var(--text-2)">ProductId, Product Name, Parent Product, SupplierName, CreationDate, Category, Product Type</span> are auto-detected and cleaned for you (parent↔child resolved, blank/0-parent rows dropped). A cleaned preview appears below.<br><br>
          Or upload an already-clean file. Required columns (case-insensitive headers): <strong style="color:var(--accent)">parent_id, parent_code, child_code, folder</strong><br>
          Optional: <strong style="color:var(--accent)">vendor_name</strong> (aliases: vendor, vendor_code) — overrides each parent's vendor<br>
          Optional: <strong style="color:var(--accent)">category</strong> (aliases: category_name, cat, product_category) — overrides each parent's category. Shown under the vendor in the row.<br>
          Optional: <strong style="color:var(--accent)">sub_category</strong> (aliases: subcategory, sub_cat, subcat, product_sub_category) — each parent's sub-category. Every product is in exactly one category and one sub-category.<br>
          Optional: <strong style="color:var(--accent)">zone</strong> — folder's zone(s). Values: <span style="color:var(--text-2)">"1" · "1,3" · "1 3 5" · "all" (open to all zones) · "" or "unclassified" (not yet zoned). Zones 1–6.</span><br>
          Optional: <strong style="color:var(--accent)">parent_launch_date</strong> (aliases: parent_created_date, parent_added_date, parent_date) — date the parent code was created. Shown in the row meta line.<br>
          Optional: <strong style="color:var(--accent)">child_launch_date</strong> (aliases: launch_date, added_date, launched_on, date_added) — date the child code was launched / added. Displayed as a small badge in the child rows.
        </div>
      </div>
      <input type="file" accept=".csv,.tsv,.txt,.xlsx,.xls" class="upload-input" id="masterUpload">
      <button class="upload-btn" id="masterTemplateBtn" title="Download a ready-to-fill Excel (.xlsx) template with the correct headers">↓ Excel Template</button>
      <button class="upload-btn" id="uploadBtnTrigger">Choose CSV / Excel</button>
      <button class="reset-btn" id="masterReset" style="display:none;">Clear & reset</button>
    </div>
    <div id="masterPreview" style="display:none; margin-top:14px;"></div>
  </div>
</section>
<!-- 08 Stock data upload — direct CSV/Excel upload (also available via Google Sheets Sync). -->
<section class="section">
  <div class="section-head">
    <span class="section-num">08 /</span>
    <span class="section-title">Stock data <em>upload</em></span>
    <span class="section-rule"></span>
  </div>
  <div class="panel reveal reveal-1">
    <h3 class="panel-title">Refresh stock levels by parent code</h3>
    <p class="panel-sub">CSV or Excel (.xlsx / .xls) · matches by <strong style="color:var(--accent)">parent_code</strong> (case-insensitive) · updates on-hand, in-transit, pending · recalculates available + days of cover · all calcs across the dashboard refresh immediately · saved locally across reloads · Use <strong style="color:var(--accent)">↓ Template</strong> to get a starter file</p>

    <div class="upload-zone" id="stockUploadZone">
      <div class="upload-meta">
        <div class="upload-status" id="stockUploadStatus">No stock override loaded — current values come from the embedded dataset</div>
        <div class="upload-spec">
          <strong style="color:var(--accent)">Raw Stock Master export?</strong> Just upload it — files with columns <span style="color:var(--text-2)">ProductID, Name, Stock</span> are auto-detected and the stock is <strong>summed per parent</strong> (a parent and its child codes are the same physical product, so they're counted once). <em>Requires the Product Master first.</em><br><br>
          Or upload a clean file. Required column: <strong style="color:var(--accent)">parent_code</strong>. Optional (defaults to existing value if missing): <strong style="color:var(--accent)">on_hand, in_transit, pending, discontinued</strong>.
          <br>Headers are case-insensitive. Accepted aliases: <span style="color:var(--text-2)">on_hand → k, stock, qty, quantity</span> · <span style="color:var(--text-2)">in_transit → transit, it</span> · <span style="color:var(--text-2)">pending → po, pending_factory</span> · <span style="color:var(--text-2)">discontinued → disc, status (values: Y/N, 1/0, true/false, active/disc)</span>
        </div>
      </div>
      <input type="file" accept=".csv,.tsv,.txt,.xlsx,.xls" class="upload-input" id="stockUpload">
      <button class="upload-btn" id="stockTemplateBtn" title="Download a ready-to-fill Excel (.xlsx) template with the correct headers">↓ Excel Template</button>
      <button class="upload-btn" id="stockUploadBtnTrigger">Choose CSV / Excel</button>
      <button class="reset-btn" id="stockReset" style="display:none;">Clear & reset</button>
    </div>
    <div id="stockUploadDetail" style="font-family:var(--mono); font-size:10px; color:var(--text-3); margin-top:10px; min-height:14px;"></div>
    <div id="stockPreview" style="display:none; margin-top:14px;"></div>
  </div>
</section>
<!-- 09 Sales & Purchase history — direct CSV/Excel upload (also available via Google Sheets Sync). -->
<section class="section">
  <div class="section-head">
    <span class="section-num">09 /</span>
    <span class="section-title">Sales &amp; Purchase <em>history</em> (24 months)</span>
    <span class="section-rule"></span>
  </div>
  <div class="panel reveal reveal-1">
    <h3 class="panel-title">Upload your monthly sales &amp; purchase data — as separate files</h3>
    <p class="panel-sub">CSV or Excel (.xlsx / .xls) · matches by <strong style="color:var(--accent)">parent_code</strong> · one row per parent per month · upload <strong style="color:var(--accent)">Sales</strong> and <strong style="color:var(--accent)">Purchases</strong> independently — each merges into the same 24-month history without overwriting the other · recalculates annual sales, avg monthly, days of cover, ABC, all KPIs · saved locally across reloads · Use <strong style="color:var(--accent)">↓ Excel Template</strong> in each box for a pre-filled starter</p>

    <div class="upload-status" id="histUploadStatus" style="margin-bottom:6px;">No history override loaded — using embedded 24-month data</div>
    <div class="upload-spec" style="margin-bottom:14px;">
      <strong style="color:var(--accent)">Raw ERP exports accepted.</strong> Drop your raw <strong>Sales</strong> or <strong>Purchase</strong> file straight into the matching box — files with columns <span style="color:var(--text-2)">Date, Product, Product Code, Qty, Company Name, PID</span> are auto-detected, mapped to their parent (via <strong>PID</strong>), aggregated by month, and previewed below. No pre-formatting needed. <em>Requires the Product Master to be cleaned first</em> (that builds the PID → parent map).<br><br>
      Already-clean files also work. Sales columns: <strong style="color:var(--accent)">parent_code, month, sales</strong> · Purchases columns: <strong style="color:var(--accent)">parent_code, month, purchases</strong><br>
      Month formats accepted: <span style="color:var(--text-2)">"2025-04" · "Apr-25" · "Apr 2025" · "April 2025" · "4/2025" · "04/25"</span> · Active 24-month window: <strong style="color:var(--accent)" id="histWindowLabel">—</strong><br>
      <span style="color:var(--text-3)">Very large Excel exports (roughly &gt; 50&nbsp;MB) can exceed the browser's limit — if one won't load, save it as <strong>CSV</strong> and upload that (same columns).</span>
    </div>

    <div class="hist-split" style="display:grid; grid-template-columns:1fr 1fr; gap:14px;">
      <div class="upload-zone" id="salesUploadZone" style="border-left:3px solid rgba(58,255,182,0.6);">
        <div class="upload-meta">
          <div class="upload-status" id="salesUploadStatus"><strong>Sales</strong> — no file loaded</div>
        </div>
        <input type="file" accept=".csv,.tsv,.txt,.xlsx,.xls" class="upload-input" id="salesUpload">
        <button class="upload-btn" id="salesTemplateBtn" title="Download a ready-to-fill Excel (.xlsx) SALES template with all 24 months">↓ Excel Template</button>
        <button class="upload-btn" id="salesUploadBtnTrigger">Choose Sales file</button>
      </div>

      <div class="upload-zone" id="purchUploadZone" style="border-left:3px solid rgba(255,92,58,0.6);">
        <div class="upload-meta">
          <div class="upload-status" id="purchUploadStatus"><strong>Purchases</strong> — no file loaded</div>
        </div>
        <input type="file" accept=".csv,.tsv,.txt,.xlsx,.xls" class="upload-input" id="purchUpload">
        <button class="upload-btn" id="purchTemplateBtn" title="Download a ready-to-fill Excel (.xlsx) PURCHASES template with all 24 months">↓ Excel Template</button>
        <button class="upload-btn" id="purchUploadBtnTrigger">Choose Purchases file</button>
      </div>
    </div>

    <div style="margin-top:12px;"><button class="reset-btn" id="histReset" style="display:none;">Clear &amp; reset history</button></div>
    <div id="histUploadDetail" style="font-family:var(--mono); font-size:10px; color:var(--text-3); margin-top:10px; min-height:14px;"></div>
    <div id="salesPreview" style="display:none; margin-top:14px;"></div>
    <div id="purchasePreview" style="display:none; margin-top:14px;"></div>
  </div>
</section>
<!-- LOG Upload history (server audit log) -->
<section class="section">
  <div class="section-head">
    <span class="section-num">LOG /</span>
    <span class="section-title">Upload <em>history</em></span>
    <span class="section-rule"></span>
  </div>
  <div class="panel">
    <h3 class="panel-title">Every upload, logged</h3>
    <p class="panel-sub">file, type, source, row counts and months covered &mdash; stored permanently in the database</p>
    <div class="table-wrap" style="max-height: 340px;">
      <table>
        <thead><tr><th>When</th><th>Type</th><th>Source</th><th>File</th><th class="num">Rows</th><th>Months covered</th></tr></thead>
        <tbody id="uploadLogBody"><tr><td colspan="6" style="color:var(--text-3)">No uploads yet</td></tr></tbody>
      </table>
    </div>
  </div>
</section>
<!-- 06.9 Data controls — clear everything to a blank dashboard before importing your own -->
<section class="section">
  <div class="section-head">
    <span class="section-num">DATA /</span>
    <span class="section-title">Start <em>fresh</em></span>
    <span class="section-rule"></span>
  </div>
  <div class="panel reveal reveal-1">
    <h3 class="panel-title">Delete one month's data</h3>
    <p class="panel-sub">Remove the sales and/or purchase history of a single month — for example to re-upload a corrected file for that month. Products, stock and every other month stay untouched. This cannot be undone.</p>
    <div class="month-delete-row">
      <select class="ui-select" id="delMonthSelect" style="min-width: 230px;"><option value="">Loading months…</option></select>
      <select class="ui-select" id="delMonthSide" style="min-width: 170px;">
        <option value="both">Sales + Purchases</option>
        <option value="sales">Sales only</option>
        <option value="purchases">Purchases only</option>
      </select>
      <button class="reset-btn" id="delMonthBtn" style="display:inline-block; background:rgba(255,74,92,0.12); border-color:rgba(255,74,92,0.5); color:var(--red);">Delete this month</button>
      <span id="delMonthStatus" style="font-family:var(--mono); font-size:11px; color:var(--text-3);"></span>
    </div>
    <hr style="border:none; border-top:1px solid var(--line); margin:20px 0;">
    <h3 class="panel-title">Clear all data</h3>
    <p class="panel-sub">Wipes all your uploaded data (master, stock, sales, purchases) from MongoDB — the dashboard goes completely empty so you can rebuild it from your own uploads below. This cannot be undone.</p>
    <div style="display:flex; gap:12px; align-items:center; flex-wrap:wrap;">
      <button class="reset-btn" id="clearAllDataBtn" style="display:inline-block; background:rgba(255,74,92,0.12); border-color:rgba(255,74,92,0.5); color:var(--red);">⨯ Clear all data (blank dashboard)</button>
      <span id="clearAllDataStatus" style="font-family:var(--mono); font-size:11px; color:var(--text-3);"></span>
    </div>
  </div>
</section>
</div>

<div class="page" data-page="sync">
<!-- 10.5 Google Sheets Sync — pull from cloud-hosted master template -->
<section class="section">
  <div class="section-head">
    <span class="section-num">SYNC /</span>
    <span class="section-title">Google Sheets <em>sync</em></span>
    <span class="section-rule"></span>
  </div>
  <div class="panel reveal reveal-1">
    <h3 class="panel-title">Live link to your Google Sheets master template</h3>
    <p class="panel-sub">Edit data in your Google Sheets, then click <strong style="color:var(--accent)">Sync All</strong> here to pull the latest values into the dashboard. The 4 sheets below were created in your Drive — open them, fill in your real data, and use this section to keep the dashboard in sync.</p>

    <div style="background: rgba(255,168,58,0.05); border: 1px solid rgba(255,168,58,0.2); padding: 12px 14px; margin-bottom: 14px; border-radius: 3px;">
      <strong style="color: var(--orange); font-family: var(--mono); font-size: 11px; letter-spacing: 0.1em;">SETUP — TWO OPTIONS:</strong>
      <p style="margin: 8px 0 4px; font-size: 12px; color: var(--text-2); line-height: 1.6;"><strong>Option A — Published CSV (recommended, anonymous):</strong></p>
      <ol style="margin: 0 0 8px 24px; font-size: 12px; color: var(--text-2); line-height: 1.6;">
        <li>Open the Google Sheet → <strong>File → Share → Publish to web</strong></li>
        <li>Pick the sheet, format <strong>CSV</strong>, click <strong>Publish</strong>, copy the URL</li>
        <li>Paste into the Published URL field below</li>
      </ol>
      <p style="margin: 8px 0 4px; font-size: 12px; color: var(--text-2); line-height: 1.6;"><strong>Option B — Direct Excel export (.xlsx, anyone-with-link access):</strong></p>
      <ol style="margin: 0 0 8px 24px; font-size: 12px; color: var(--text-2); line-height: 1.6;">
        <li>Open the Google Sheet → <strong>File → Share → Share with others</strong> → set to <strong>Anyone with the link · Viewer</strong></li>
        <li>Use the URL: <code style="color: var(--accent); font-size: 11px;">https://docs.google.com/spreadsheets/d/&lt;ID&gt;/export?format=xlsx</code></li>
        <li>Or paste the sheet's normal /edit URL — the dashboard auto-uses Excel if you append <code>?format=xlsx</code></li>
      </ol>
      <p style="margin-top: 8px; font-size: 11px; color: var(--text-3); font-family: var(--mono);">The dashboard auto-detects CSV vs Excel from the response and parses accordingly. After setup, just edit your sheets and re-click <strong>Sync All</strong> anytime.</p>
    </div>

    <div id="gsyncList" style="display: flex; flex-direction: column; gap: 10px; margin-bottom: 16px;"></div>

    <div style="display: flex; gap: 8px; flex-wrap: wrap; align-items: center;">
      <button class="dl-btn primary" id="gsyncAllBtn"><span class="icn">↻</span> Sync All from Google Sheets</button>
      <button class="dl-btn" id="gsyncSaveUrls"><span class="icn">💾</span> Save URLs</button>
      <button class="reset-btn" id="gsyncResetUrls">Clear all URLs</button>
      <label style="display: inline-flex; align-items: center; gap: 6px; font-family: var(--mono); font-size: 11px; color: var(--text-2); cursor: pointer; margin-left: 8px; padding: 6px 10px; border: 1px solid var(--line); border-radius: 3px;">
        <input type="checkbox" id="gsyncAutoToggle" style="margin: 0;">
        Auto-sync on every page load
      </label>
    </div>
    <div id="gsyncStatus" style="font-family: var(--mono); font-size: 11px; color: var(--text-3); margin-top: 12px; min-height: 16px;"></div>
    <div style="margin-top: 12px; padding: 10px 12px; background: rgba(255,168,58,0.05); border: 1px solid rgba(255,168,58,0.18); border-radius: 3px; font-size: 11px; color: var(--text-2); line-height: 1.6;">
      <strong style="color: var(--orange);">If you see "Failed to fetch":</strong> the sheet is private. Open each sheet → <strong>Share</strong> → change access to <strong>Anyone with the link · Viewer</strong>. Then click Sync All again. (Alternatively, File → Publish to web → CSV and paste that URL instead.)
    </div>
  </div>
</section>
</div>

  </main>
<footer class="footer">
  <span id="footerStats">&mdash;</span>
  <span>Inventory Intelligence &middot; all data stored in MongoDB &middot; exports honour your edits</span>
</footer>
</div>
</div>

`;
