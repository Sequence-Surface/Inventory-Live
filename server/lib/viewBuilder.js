import Product from '../models/Product.js';
import MonthlyHistory from '../models/MonthlyHistory.js';
import Upload from '../models/Upload.js';
import {
  STATUS_CODES, MOVER_CODES, PRIORITY_CODES, ABC_CODES, VARIANTS,
  build24Window, windowIndexMap, currentYm, codeKeyOf, parseFlexibleDate,
} from './labels.js';

// ============================================================================
// Builds the D-shaped dataset the dashboard consumes, from the collections.
// This is the server-side port of the client's rebuildDashboardFromUploads()
// (window + lookups + products + derived + aggregates) so GET /api/data always
// returns a complete, render-ready view. The DB keeps UNBOUNDED history; only
// the 24-month window projection ships to the browser.
// ============================================================================

// ---- Derivation helpers (ported verbatim from the client dashboard) ----

function recomputeSalesDerived(p) {
  const s = p.s || [];
  p.a = s.slice(-12).reduce((x, y) => x + (+y || 0), 0);
  const recent6 = s.slice(-6);
  const sum6 = recent6.reduce((x, y) => x + (+y || 0), 0);
  p.m = recent6.length ? sum6 / recent6.length : 0;
  const avail = typeof p.av === 'number' ? p.av : (p.k || 0) + (p.it || 0);
  p.ad = !p.m || p.m <= 0 ? 999 : Math.max(0, Math.min(999, Math.round((avail * 30) / p.m)));
}

function recomputeDerivedStock(p) {
  p.av = (p.k || 0) + (p.it || 0);
  if (!p.m || p.m <= 0) p.ad = 999;
  else p.ad = Math.max(0, Math.min(999, Math.round((p.av * 30) / p.m)));
}

function monthsSinceLastSale(s) {
  for (let i = s.length - 1, k = 0; i >= 0; i--, k++) if ((+s[i] || 0) > 0) return k;
  return 13;
}

// Age in months relative to the window-end month, from a launch date string.
// Uses the fixed flexible parser (ISO-first, anchored) instead of the old
// unanchored day-first regex.
function productAgeMonths(launchRaw, anchorYm) {
  if (!launchRaw) return 24;
  const d = parseFlexibleDate(launchRaw);
  if (!d) return 24;
  const lym = d.getUTCFullYear() * 12 + (d.getUTCMonth() + 1);
  const [ay, am] = anchorYm.split('-').map((n) => parseInt(n, 10));
  return Math.max(0, Math.min(24, ay * 12 + am - lym));
}

function turnoverRatio(p) {
  const stock = p.av || 0;
  if (stock <= 0) return 99;
  return Math.min(99, Math.round(((p.a || 0) / stock) * 100) / 100);
}

function statusIndexFor(p) {
  const S = (name) => { const i = STATUS_CODES.indexOf(name); return i >= 0 ? i : 0; };
  const hasStock = (p.av || 0) > 0;
  const hasSales = (p.a || 0) > 0 || (p.m || 0) > 0;
  if (!hasStock && !hasSales) return S('Inactive');
  if (!hasStock) return S('Critical');
  if (!hasSales) return S('Dead Stock');
  const ad = p.ad;
  if (ad < 15) return S('Critical');
  if (ad < 30) return S('Low Stock');
  if (ad <= 90) return S('Healthy');
  if (ad <= 180) return S('Adequate');
  return S('Overstocked');
}

function moverIndexFor(p) {
  const Mv = (name) => { const i = MOVER_CODES.indexOf(name); return i >= 0 ? i : 0; };
  if ((p.av || 0) <= 0 && (p.a || 0) <= 0) return Mv('No Stock');
  const ms = p.ms;
  if (ms >= 12) return Mv('Non-Moving (12m+)');
  if (ms >= 6) return Mv('Slow (6-12m)');
  if (ms >= 3) return Mv('Sluggish (3-6m)');
  return Mv('Active');
}

function assignABC(products) {
  const sorted = products.slice().sort((a, b) => (b.a || 0) - (a.a || 0));
  const total = sorted.reduce((x, p) => x + (p.a || 0), 0);
  let cum = 0;
  sorted.forEach((p) => {
    if (total <= 0 || (p.a || 0) <= 0) { p.b = 2; return; }
    cum += p.a || 0;
    const share = cum / total;
    p.b = share <= 0.8 ? 0 : share <= 0.95 ? 1 : 2;
  });
}

function buildAggregates(D) {
  const products = D.products;
  const aggP = new Array(24).fill(0), aggS = new Array(24).fill(0);
  products.forEach((p) => {
    for (let i = 0; i < 24; i++) { aggP[i] += +p.p[i] || 0; aggS[i] += +p.s[i] || 0; }
  });
  D.aggP = aggP; D.aggS = aggS;

  const critIdx = STATUS_CODES.indexOf('Critical');
  let totalChildren = 0, totalStock = 0, inTransit = 0, pending = 0, annualSales = 0;
  let classACount = 0, classBCount = 0, classCCount = 0, classASales = 0;
  let criticalCount = 0, slowCount = 0, nonMovingUnits = 0, bulkAnomalyCount = 0;
  products.forEach((p) => {
    totalChildren += p.ch ? p.ch.length : 0;
    totalStock += +p.k || 0; inTransit += +p.it || 0; pending += +p.po || 0;
    annualSales += +p.a || 0;
    if (p.b === 0) { classACount++; classASales += +p.a || 0; }
    else if (p.b === 1) classBCount++; else classCCount++;
    if (p.st === critIdx) criticalCount++;
    const mv = MOVER_CODES[p.mv] || '';
    if (mv.startsWith('Slow') || mv.startsWith('Non-Moving')) { slowCount++; nonMovingUnits += +p.k || 0; }
    bulkAnomalyCount += p.ba ? p.ba.length : 0;
  });
  D.kpi = {
    totalProducts: products.length, totalChildren,
    totalFolders: D.folders.length, totalCategories: D.cats.length,
    annualSales, totalStock, inTransitTotal: inTransit, pendingTotal: pending,
    classACount, classBCount, classCCount, classASales,
    netReorderQty: 0, netReorderProducts: 0, reorderSavedByPipeline: 0,
    criticalCount, criticalImprovedCount: 0,
    bulkAnomalyCount, slowMoverCount: slowCount, nonMovingUnits,
  };

  const byFolder = {};
  products.forEach((p) => {
    const f = D.folders[p.fl] || '(uncategorized)';
    if (!byFolder[f]) byFolder[f] = { Folder: f, parents: 0, children: 0, sales: 0, stock: 0, folder_age: 0, _ageSum: 0, folder_avg_age: 0, new_count: 0, young_count: 0 };
    const g = byFolder[f];
    g.parents++; g.children += p.ch ? p.ch.length : 0; g.sales += +p.a || 0; g.stock += +p.k || 0;
    g.folder_age = Math.max(g.folder_age, p.pa || 0); g._ageSum += p.pa || 0;
    if ((p.pa || 0) <= 3) g.new_count++;
    if ((p.pa || 0) <= 6) g.young_count++;
  });
  D.folderSummary = Object.values(byFolder).map((g) => {
    g.folder_avg_age = g.parents ? Math.round(g._ageSum / g.parents) : 0;
    delete g._ageSum;
    return g;
  });
}

// Newest 'yyyy-mm' present anywhere in the stored history (unbounded), else null.
export async function maxHistoryYm() {
  const doc = await MonthlyHistory.findOne({}).sort({ ym: -1 }).select('ym').lean();
  return doc ? doc.ym : null;
}

// ---- View cache ----
// Building the view for thousands of products takes seconds; cache the default
// (no explicit end month) view and invalidate on every write (upload/reset).
let _viewCache = null;
export function invalidateDatasetViewCache() { _viewCache = null; }

export async function buildDatasetView({ end } = {}) {
  if (!end && _viewCache) return _viewCache;
  const view = await _buildDatasetView({ end });
  if (!end) _viewCache = view;
  return view;
}

async function _buildDatasetView({ end } = {}) {
  const dataThrough = (await maxHistoryYm()) || null;
  const endYm = end || dataThrough || currentYm();
  const months = build24Window(endYm);
  const ymIdx = windowIndexMap(months);
  const windowStart = Object.keys(ymIdx).sort()[0];

  const allProducts = await Product.find({}).sort({ parentId: 1, codeKey: 1 }).lean();
  const activeProducts = allProducts.filter((p) => p.active !== false);
  const inactiveCodes = allProducts.filter((p) => p.active === false).map((p) => p.parentCode);

  // In-window history, grouped by codeKey.
  const histRows = await MonthlyHistory.find({ ym: { $gte: windowStart, $lte: endYm } }).lean();
  const histByCode = {};
  histRows.forEach((r) => { (histByCode[r.codeKey] || (histByCode[r.codeKey] = [])).push(r); });

  // Lookups: vendors = suppliers, cats = folders = categories (same semantics as the client).
  const vendors = [], vendorIdx = {}, cats = [], catIdx = {};
  const ensureVendor = (name) => {
    const clean = (name || '').trim();
    const keyU = clean.toUpperCase() || '__NONE__';
    if (vendorIdx[keyU] == null) {
      vendorIdx[keyU] = vendors.length;
      vendors.push(clean
        ? { code: 'V' + String(vendors.length + 1).padStart(3, '0'), name: clean, city: '', skus: 0 }
        : { code: '—', name: '(no supplier)', city: '', skus: 0 });
    }
    return vendorIdx[keyU];
  };
  const ensureCat = (name) => {
    const clean = (name || '').trim() || '(uncategorized)';
    const keyU = clean.toUpperCase();
    if (catIdx[keyU] == null) { catIdx[keyU] = cats.length; cats.push(clean); }
    return catIdx[keyU];
  };

  const okPriority = Math.max(0, PRIORITY_CODES.indexOf('OK'));
  const products = [];
  const idIndex = {};
  const launchDates = {};
  const productTypes = {};
  const childLaunchDates = {};   // UPPER(childCode) → raw launch date string

  activeProducts.forEach((doc) => {
    const code = (doc.parentCode || '').trim();
    if (!code) return;
    const codeU = codeKeyOf(code);
    const v = ensureVendor(doc.vendorName);
    const c = ensureCat(doc.categoryName);
    const s = new Array(24).fill(0), pr = new Array(24).fill(0);
    (histByCode[codeU] || []).forEach((r) => {
      const i = ymIdx[r.ym];
      if (i == null) return;
      if (r.sales != null) s[i] += r.sales;
      if (r.purchases != null) pr[i] += r.purchases;
    });
    const k = +doc.k || 0, it = +doc.it || 0, po = +doc.po || 0;
    const ch = (doc.children || []).map((ci) => [String(ci.code || ''), null, 0]);
    vendors[v].skus += 1;
    if (doc.parentId != null) idIndex[doc.parentId] = code;
    (doc.children || []).forEach((ci) => {
      if (ci.productId != null) idIndex[ci.productId] = code;
      if (ci.launchDateRaw && ci.code) childLaunchDates[codeKeyOf(ci.code)] = ci.launchDateRaw;
    });
    if (doc.launchDateRaw) launchDates[codeU] = doc.launchDateRaw;
    if (doc.productType) productTypes[codeU] = doc.productType;

    const p = {
      i: doc.parentId != null ? doc.parentId : 0,
      n: code, v, c, fl: c,
      s, p: pr, ch, ba: [],
      k, it, po, av: k + it, tp: k + it + po,
      a: 0, m: 0, ad: 999, d: 999, f: 0, nr: 0, r: 0, x: 0, t: 99,
      b: 2, st: 0, mv: 0, ms: 13, pr: okPriority, ps: 0, pa: 24, fa: 24,
    };
    recomputeDerivedStock(p);
    recomputeSalesDerived(p);
    p.ms = monthsSinceLastSale(p.s);
    p.pa = productAgeMonths(doc.launchDateRaw, endYm);
    p.fa = p.pa;
    p.t = turnoverRatio(p);
    p.st = statusIndexFor(p);
    p.mv = moverIndexFor(p);
    p.d = p.ad; p.f = Math.round(p.m || 0); p.ps = p.st;
    products.push(p);
  });

  assignABC(products);

  const lastUploadDoc = await Upload.findOne({ status: 'ok' }).sort({ uploadedAt: -1 })
    .select('type fileName uploadedAt source').lean();

  const D = {
    months,
    variants: VARIANTS.slice(),
    statusCodes: STATUS_CODES.slice(),
    moverCodes: MOVER_CODES.slice(),
    priorityCodes: PRIORITY_CODES.slice(),
    abcCodes: ABC_CODES.slice(),
    cats, folders: cats, subCats: [], vendors,
    products,
    aggP: new Array(24).fill(0),
    aggS: new Array(24).fill(0),
    kpi: {},
    folderSummary: [],
    __real: products.length > 0,
    __empty: products.length === 0,
    __idIndex: idIndex,
    meta: {
      dataThrough,
      lastUpload: lastUploadDoc
        ? { type: lastUploadDoc.type, fileName: lastUploadDoc.fileName, uploadedAt: lastUploadDoc.uploadedAt, source: lastUploadDoc.source }
        : null,
      launchDates,
      productTypes,
      childLaunchDates,
      inactiveCodes,
    },
  };
  buildAggregates(D);
  return D;
}
