import { Router } from 'express';
import Upload from '../models/Upload.js';
import MonthlyHistory from '../models/MonthlyHistory.js';
import StockSnapshot from '../models/StockSnapshot.js';
import { mergeMaster, mergeHistory, mergeStock } from '../lib/merge.js';
import { buildDatasetView, invalidateDatasetViewCache } from '../lib/viewBuilder.js';
import { codeKeyOf } from '../lib/labels.js';

const router = Router();

// POST /api/uploads/master — merge a parsed Product Master (upsert; missing
// products are delisted, never deleted). Returns counts + the fresh dataset view.
router.post('/master', async (req, res) => {
  try {
    const { fileName, source, rows } = req.body || {};
    if (!Array.isArray(rows) || !rows.length) {
      return res.status(400).json({ error: 'Body must include a non-empty rows array.' });
    }
    const result = await mergeMaster({ fileName, source, rows });
    invalidateDatasetViewCache();
    const data = await buildDatasetView();
    res.json({ ok: true, ...result, data });
  } catch (err) {
    console.error('[uploads] master error', err);
    res.status(500).json({ error: err.message });
  }
});

// POST /api/uploads/history — merge sales OR purchases rows keyed by (code, ym).
router.post('/history', async (req, res) => {
  try {
    const { fileName, source, valueType, rows } = req.body || {};
    if (!Array.isArray(rows) || !rows.length) {
      return res.status(400).json({ error: 'Body must include a non-empty rows array.' });
    }
    if (!['sales', 'purchases', 'purch'].includes(valueType)) {
      return res.status(400).json({ error: "valueType must be 'sales' or 'purchases'." });
    }
    const result = await mergeHistory({ fileName, source, valueType, rows });
    invalidateDatasetViewCache();
    const data = await buildDatasetView();
    res.json({ ok: true, ...result, data });
  } catch (err) {
    console.error('[uploads] history error', err);
    res.status(500).json({ error: err.message });
  }
});

// POST /api/uploads/stock — append a timestamped stock snapshot + update current stock.
router.post('/stock', async (req, res) => {
  try {
    const { fileName, source, takenAt, rows } = req.body || {};
    if (!Array.isArray(rows) || !rows.length) {
      return res.status(400).json({ error: 'Body must include a non-empty rows array.' });
    }
    const result = await mergeStock({ fileName, source, takenAt, rows });
    invalidateDatasetViewCache();
    const data = await buildDatasetView();
    res.json({ ok: true, ...result, data });
  } catch (err) {
    console.error('[uploads] stock error', err);
    res.status(500).json({ error: err.message });
  }
});

// GET /api/uploads/months — every month present in the stored history, with
// row counts and totals per side (drives the month-wise delete picker).
router.get('/months', async (req, res) => {
  try {
    const agg = await MonthlyHistory.aggregate([
      { $group: {
        _id: '$ym',
        salesRows: { $sum: { $cond: [{ $ne: ['$sales', null] }, 1, 0] } },
        purchRows: { $sum: { $cond: [{ $ne: ['$purchases', null] }, 1, 0] } },
        salesQty: { $sum: { $ifNull: ['$sales', 0] } },
        purchQty: { $sum: { $ifNull: ['$purchases', 0] } },
      } },
      { $sort: { _id: -1 } },
    ]);
    res.json(agg.map((m) => ({ ym: m._id, salesRows: m.salesRows, purchRows: m.purchRows, salesQty: m.salesQty, purchQty: m.purchQty })));
  } catch (err) {
    console.error('[uploads] months error', err);
    res.status(500).json({ error: err.message });
  }
});

// POST /api/uploads/delete-month — remove ONE month's history, one side or both.
// side 'sales'|'purchases': blanks that side only (the other side is untouched);
// side 'both': removes the month entirely. Rows left with neither side are deleted.
router.post('/delete-month', async (req, res) => {
  try {
    const { ym, side } = req.body || {};
    if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(String(ym || ''))) {
      return res.status(400).json({ error: 'ym must be yyyy-mm.' });
    }
    if (!['sales', 'purchases', 'both'].includes(side)) {
      return res.status(400).json({ error: "side must be 'sales', 'purchases' or 'both'." });
    }
    let removedRows = 0, blankedRows = 0;
    if (side === 'both') {
      const del = await MonthlyHistory.deleteMany({ ym });
      removedRows = del.deletedCount || 0;
    } else {
      const field = side === 'sales' ? 'sales' : 'purchases';
      const upd = await MonthlyHistory.updateMany(
        { ym, [field]: { $ne: null } },
        { $set: { [field]: null, [field === 'sales' ? 'salesUploadId' : 'purchUploadId']: null } }
      );
      blankedRows = upd.modifiedCount || 0;
      const del = await MonthlyHistory.deleteMany({ ym, sales: null, purchases: null });
      removedRows = del.deletedCount || 0;
    }
    const counts = { ym, side, blankedRows, removedRows };
    await Upload.create({ type: 'delete', source: 'system', fileName: `${side} · ${ym}`, counts, monthsCovered: [ym] });
    invalidateDatasetViewCache();
    const data = await buildDatasetView();
    res.json({ ok: true, counts, data });
  } catch (err) {
    console.error('[uploads] delete-month error', err);
    res.status(500).json({ error: err.message });
  }
});

// GET /api/uploads — the upload audit log (newest first).
router.get('/', async (req, res) => {
  try {
    const limit = Math.min(200, Math.max(1, parseInt(req.query.limit, 10) || 50));
    const items = await Upload.find({}).sort({ uploadedAt: -1 }).limit(limit).lean();
    res.json(items);
  } catch (err) {
    console.error('[uploads] list error', err);
    res.status(500).json({ error: err.message });
  }
});

// GET /api/uploads/history/:parentCode — the FULL unbounded monthly series for one product.
router.get('/history/:parentCode', async (req, res) => {
  try {
    const rows = await MonthlyHistory.find({ codeKey: codeKeyOf(req.params.parentCode) })
      .sort({ ym: 1 }).lean();
    res.json(rows);
  } catch (err) {
    console.error('[uploads] history read error', err);
    res.status(500).json({ error: err.message });
  }
});

// GET /api/uploads/stock-snapshots?parentCode=&limit= — stock audit trail.
router.get('/stock-snapshots', async (req, res) => {
  try {
    const limit = Math.min(500, Math.max(1, parseInt(req.query.limit, 10) || 100));
    const q = req.query.parentCode ? { codeKey: codeKeyOf(req.query.parentCode) } : {};
    const rows = await StockSnapshot.find(q).sort({ takenAt: -1 }).limit(limit).lean();
    res.json(rows);
  } catch (err) {
    console.error('[uploads] snapshots error', err);
    res.status(500).json({ error: err.message });
  }
});

export default router;
