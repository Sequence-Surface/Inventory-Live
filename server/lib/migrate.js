import Dataset from '../models/Dataset.js';
import State from '../models/State.js';
import Product from '../models/Product.js';
import MonthlyHistory from '../models/MonthlyHistory.js';
import StockSnapshot from '../models/StockSnapshot.js';
import Upload from '../models/Upload.js';
import { MONTH_ABBR, codeKeyOf, parseFlexibleDate } from './labels.js';

const MARKER_KEY = 'migratedV2';

// One-time, idempotent boot migration: legacy single-blob Dataset 'main' →
// proper collections (Product / MonthlyHistory / StockSnapshot / Upload).
// The legacy blob is kept untouched as a read-only backup.
export async function migrateLegacyBlob() {
  if (await Product.countDocuments()) return { migrated: false, reason: 'products exist' };
  if (await Dataset.findOne({ key: MARKER_KEY }).lean()) return { migrated: false, reason: 'marker present' };

  const writeMarker = () =>
    Dataset.findOneAndUpdate(
      { key: MARKER_KEY },
      { key: MARKER_KEY, data: { migratedAt: new Date().toISOString() } },
      { upsert: true }
    );

  const legacy = await Dataset.findOne({ key: 'main' }).lean();
  const data = legacy && legacy.data;
  // Decide by the ACTUAL product list, never by the __empty flag: the old client
  // seeded D with __empty:true and never cleared it when real uploads were saved
  // into the blob, so a blob can carry __empty:true AND thousands of products.
  if (!data || !Array.isArray(data.products) || !data.products.length) {
    await writeMarker();
    return { migrated: false, reason: 'no legacy data' };
  }

  // Launch dates / product types were stored via the localStorage shim → State.
  const readStateJson = async (key) => {
    try {
      const doc = await State.findOne({ key }).lean();
      if (!doc || doc.value == null) return {};
      return typeof doc.value === 'string' ? JSON.parse(doc.value) : doc.value;
    } catch (e) { return {}; }
  };
  const launchDates = await readStateJson('inventoryParentLaunchDates');
  const productTypes = await readStateJson('inventoryParentProductTypes');

  // Reverse the persisted PID→parentCode index to recover child ProductIds.
  const idIndex = data.__idIndex && typeof data.__idIndex === 'object' ? data.__idIndex : {};
  const childIdsByParent = {};
  Object.keys(idIndex).forEach((pid) => {
    const codeU = codeKeyOf(idIndex[pid]);
    (childIdsByParent[codeU] || (childIdsByParent[codeU] = [])).push(+pid);
  });

  const upload = await Upload.create({ type: 'migration', source: 'system', fileName: 'legacy Dataset main', counts: {} });
  const now = new Date();

  const months = Array.isArray(data.months) ? data.months : [];
  const ymOf = (i) => {
    const [mon, yy] = String(months[i] || '').split('-');
    const mm = MONTH_ABBR.indexOf(mon) + 1;
    return mm > 0 ? `20${yy}-${String(mm).padStart(2, '0')}` : null;
  };

  const productDocs = [];
  const historyOps = [];
  const snapshots = [];
  const seen = new Set();
  data.products.forEach((p) => {
    const code = String(p.n || '').trim();
    const codeU = codeKeyOf(code);
    if (!codeU || seen.has(codeU)) return;
    seen.add(codeU);
    const launchRaw = launchDates[codeU] || '';
    const childIds = childIdsByParent[codeU] || [];
    productDocs.push({
      parentCode: code,
      codeKey: codeU,
      parentId: p.i != null && !isNaN(+p.i) ? +p.i : null,
      vendorName: ((data.vendors || [])[p.v] || {}).name || '',
      categoryName: (data.cats || [])[p.c] || '',
      productType: productTypes[codeU] || '',
      launchDateRaw: launchRaw,
      launchDate: parseFlexibleDate(launchRaw),
      masterStock: +p.k || 0,
      children: (p.ch || []).map((c, ci) => ({
        code: String((Array.isArray(c) ? c[0] : c) || ''),
        productId: childIds[ci] != null ? childIds[ci] : null,
        launchDateRaw: '',
        folder: '',
        variant: 'Standard',
      })),
      active: true,
      k: +p.k || 0, it: +p.it || 0, po: +p.po || 0,
      stockAsOf: now,
      stockUploadId: upload._id,
      firstUploadId: upload._id,
      lastMasterUploadId: upload._id,
    });
    snapshots.push({ codeKey: codeU, k: +p.k || 0, it: +p.it || 0, po: +p.po || 0, takenAt: now, uploadId: upload._id });
    for (let i = 0; i < 24; i++) {
      const ym = ymOf(i);
      if (!ym) continue;
      // Legacy zeros are indistinguishable from "no data" (the old pipeline
      // already dropped genuine zeros) — migrate non-zero values only.
      const s = +((p.s || [])[i]) || 0;
      const pu = +((p.p || [])[i]) || 0;
      if (!s && !pu) continue;
      const set = {};
      if (s) { set.sales = s; set.salesUploadId = upload._id; set.salesUpdatedAt = now; }
      if (pu) { set.purchases = pu; set.purchUploadId = upload._id; set.purchUpdatedAt = now; }
      historyOps.push({ updateOne: { filter: { codeKey: codeU, ym }, update: { $set: set }, upsert: true } });
    }
  });

  if (productDocs.length) await Product.insertMany(productDocs);
  if (historyOps.length) await MonthlyHistory.bulkWrite(historyOps, { ordered: false });
  if (snapshots.length) await StockSnapshot.insertMany(snapshots);

  const counts = { products: productDocs.length, historyRows: historyOps.length, snapshots: snapshots.length };
  await Upload.updateOne({ _id: upload._id }, { $set: { counts } });
  await writeMarker();
  console.log(`[migrate] legacy blob migrated: ${counts.products} products, ${counts.historyRows} history rows.`);
  return { migrated: true, counts };
}
