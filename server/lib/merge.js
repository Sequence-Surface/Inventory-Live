import Product from '../models/Product.js';
import MonthlyHistory from '../models/MonthlyHistory.js';
import StockSnapshot from '../models/StockSnapshot.js';
import Upload from '../models/Upload.js';
import { YM_RE, codeKeyOf, parseFlexibleDate } from './labels.js';

// ============================================================================
// Server-side merge semantics. All three merges are UPSERTS keyed on codeKey
// (and ym for history) so re-uploading a full export and uploading only the
// newest slice both work — nothing already stored is ever deleted.
// ============================================================================

// ---- Product Master ----
// rows: [{ parentId, parentCode, vendorName, categoryName, productType,
//          launchDate, stock, children: [{code, productId, launchDate, folder, variant}] }]
// Missing-from-file products are flagged active:false (delisted), never deleted.
export async function mergeMaster({ fileName = '', source = 'file', rows = [] }) {
  const upload = await Upload.create({ type: 'master', source, fileName, counts: {} });

  const seenKeys = new Set();
  const ops = [];
  let parsed = 0;
  for (const r of rows) {
    const code = String(r.parentCode || '').trim();
    const key = codeKeyOf(code);
    if (!key || seenKeys.has(key)) continue;
    seenKeys.add(key);
    parsed++;
    const children = (r.children || []).map((ci) => ({
      code: String(ci.code || '').trim(),
      productId: ci.productId != null && !isNaN(+ci.productId) ? +ci.productId : null,
      launchDateRaw: String(ci.launchDate || ''),
      folder: String(ci.folder || ''),
      variant: String(ci.variant || 'Standard'),
    }));
    const masterStock = +r.stock || 0;
    ops.push({
      updateOne: {
        filter: { codeKey: key },
        update: {
          $set: {
            parentCode: code,
            parentId: r.parentId != null && !isNaN(+r.parentId) ? +r.parentId : null,
            vendorName: String(r.vendorName || '').trim(),
            categoryName: String(r.categoryName || '').trim(),
            productType: String(r.productType || '').trim(),
            launchDateRaw: String(r.launchDate || ''),
            launchDate: parseFlexibleDate(r.launchDate),
            masterStock,
            children,
            active: true,
            lastMasterUploadId: upload._id,
          },
          $setOnInsert: {
            // No stock upload yet → the master's parent-level Stock column is the
            // initial on-hand (same fallback the client used).
            k: masterStock, it: 0, po: 0,
            firstUploadId: upload._id,
          },
        },
        upsert: true,
      },
    });
  }

  const existingKeys = (await Product.find({}).select('codeKey').lean()).map((p) => p.codeKey);
  let created = 0, updated = 0;
  if (ops.length) {
    const res = await Product.bulkWrite(ops, { ordered: false });
    created = res.upsertedCount || 0;
    updated = res.matchedCount || 0;
  }

  // Delist products absent from this file (history/stock stay intact).
  const missing = existingKeys.filter((k) => !seenKeys.has(k));
  let delisted = 0;
  if (missing.length) {
    const res = await Product.updateMany(
      { codeKey: { $in: missing }, active: true },
      { $set: { active: false } }
    );
    delisted = res.modifiedCount || 0;
  }

  const counts = { parsed, created, updated, delisted, skipped: rows.length - parsed };
  await Upload.updateOne({ _id: upload._id }, { $set: { counts } });
  return { uploadId: upload._id, counts };
}

// ---- Sales / Purchase history ----
// rows: [{ parentCode, ym, qty }] — qty may be 0 (stored as 0, a genuine zero).
// Per-(codeKey, ym) upsert of ONLY the given side, so sales and purchases never
// clobber each other, out-of-window months are stored normally, and both
// "full re-export" and "only the new month" files merge losslessly.
export async function mergeHistory({ fileName = '', source = 'file', valueType, rows = [] }) {
  const isPurch = valueType === 'purchases' || valueType === 'purch';
  const type = isPurch ? 'purchases' : 'sales';
  const upload = await Upload.create({ type, source, fileName, counts: {} });
  const now = new Date();

  const knownKeys = new Set((await Product.find({}).select('codeKey').lean()).map((p) => p.codeKey));

  // Collapse duplicate (code, ym) rows in one file by summing (matches the raw
  // transformer, which sums all transaction lines in a month).
  const byPair = new Map();
  let skippedBadMonth = 0, skippedNoCode = 0;
  const unknownParents = new Set();
  for (const r of rows) {
    const key = codeKeyOf(r.parentCode);
    const ym = String(r.ym || '').trim();
    const qty = +r.qty;
    if (!key) { skippedNoCode++; continue; }
    if (!YM_RE.test(ym) || isNaN(qty)) { skippedBadMonth++; continue; }
    if (!knownKeys.has(key)) unknownParents.add(key);
    const pairKey = key + '\u0000' + ym;
    byPair.set(pairKey, (byPair.get(pairKey) || 0) + qty);
  }

  const field = isPurch ? 'purchases' : 'sales';
  const uploadField = isPurch ? 'purchUploadId' : 'salesUploadId';
  const timeField = isPurch ? 'purchUpdatedAt' : 'salesUpdatedAt';
  const monthsCovered = new Set();
  const ops = [];
  for (const [pairKey, qty] of byPair) {
    const [key, ym] = pairKey.split('\u0000');
    monthsCovered.add(ym);
    ops.push({
      updateOne: {
        filter: { codeKey: key, ym },
        update: { $set: { [field]: qty, [uploadField]: upload._id, [timeField]: now } },
        upsert: true,
      },
    });
  }
  let merged = 0;
  if (ops.length) {
    const res = await MonthlyHistory.bulkWrite(ops, { ordered: false });
    merged = (res.upsertedCount || 0) + (res.matchedCount || 0);
  }

  const counts = {
    parsed: rows.length,
    merged,
    skippedBadMonth,
    skippedNoCode,
    unknownParents: unknownParents.size,
  };
  const months = [...monthsCovered].sort();
  await Upload.updateOne({ _id: upload._id }, { $set: { counts, monthsCovered: months } });
  return { uploadId: upload._id, counts, monthsCovered: months };
}

// ---- Stock ----
// rows: [{ parentCode, k, it, po }] — a null/missing field means "not provided":
// the product keeps its existing value for that field (mirrors the client's
// partial-column behavior). Every upload appends timestamped snapshot rows.
export async function mergeStock({ fileName = '', source = 'file', takenAt, rows = [] }) {
  const upload = await Upload.create({ type: 'stock', source, fileName, counts: {} });
  const ts = takenAt ? new Date(takenAt) : new Date();

  const products = await Product.find({}).select('codeKey k it po').lean();
  const byKey = new Map(products.map((p) => [p.codeKey, p]));

  const seen = new Set();
  const snapshots = [];
  const ops = [];
  const unmatchedCodes = [];
  let matched = 0;
  for (const r of rows) {
    const key = codeKeyOf(r.parentCode);
    if (!key || seen.has(key)) continue;
    seen.add(key);
    const existing = byKey.get(key);
    if (!existing) { unmatchedCodes.push(String(r.parentCode || '').trim()); continue; }
    matched++;
    const k = r.k != null && !isNaN(+r.k) ? +r.k : existing.k || 0;
    const it = r.it != null && !isNaN(+r.it) ? +r.it : existing.it || 0;
    const po = r.po != null && !isNaN(+r.po) ? +r.po : existing.po || 0;
    snapshots.push({ codeKey: key, k, it, po, takenAt: ts, uploadId: upload._id });
    ops.push({
      updateOne: {
        filter: { codeKey: key },
        update: { $set: { k, it, po, stockAsOf: ts, stockUploadId: upload._id } },
      },
    });
  }

  if (snapshots.length) await StockSnapshot.insertMany(snapshots);
  if (ops.length) await Product.bulkWrite(ops, { ordered: false });

  const counts = { parsed: rows.length, matched, unmatched: unmatchedCodes.length, unmatchedCodes: unmatchedCodes.slice(0, 50) };
  await Upload.updateOne({ _id: upload._id }, { $set: { counts } });
  return { uploadId: upload._id, counts };
}
