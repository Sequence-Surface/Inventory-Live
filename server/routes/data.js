import { Router } from 'express';
import Product from '../models/Product.js';
import MonthlyHistory from '../models/MonthlyHistory.js';
import StockSnapshot from '../models/StockSnapshot.js';
import Upload from '../models/Upload.js';
import { buildDatasetView, invalidateDatasetViewCache } from '../lib/viewBuilder.js';

const router = Router();

// GET /api/data — the dashboard dataset, built fresh from the collections.
// The DB keeps unbounded history; this is the 24-month window projection the
// client renders. Optional ?end=yyyy-mm views the window as of another month.
router.get('/', async (req, res) => {
  try {
    const end = typeof req.query.end === 'string' && /^\d{4}-\d{2}$/.test(req.query.end)
      ? req.query.end : undefined;
    const data = await buildDatasetView({ end });
    res.json(data);
  } catch (err) {
    console.error('[data] error', err);
    res.status(500).json({ error: err.message });
  }
});

// PUT /api/data — legacy whole-blob persist. The collections are now the source
// of truth and all writes go through /api/uploads/*, so this is retired.
router.put('/', (req, res) => {
  res.status(410).json({
    error: 'PUT /api/data is retired. Uploads persist through /api/uploads/master|history|stock.',
  });
});

// POST /api/data/reset — wipe all uploaded data (products, history, snapshots,
// upload log), leaving a blank dashboard. The legacy Dataset backup is untouched.
router.post('/reset', async (req, res) => {
  try {
    const [p, h, s, u] = await Promise.all([
      Product.deleteMany({}),
      MonthlyHistory.deleteMany({}),
      StockSnapshot.deleteMany({}),
      Upload.deleteMany({}),
    ]);
    invalidateDatasetViewCache();
    await Upload.create({
      type: 'reset', source: 'system', fileName: '',
      counts: { products: p.deletedCount, historyRows: h.deletedCount, snapshots: s.deletedCount, uploads: u.deletedCount },
    });
    const data = await buildDatasetView();
    res.json({ ok: true, data });
  } catch (err) {
    console.error('[data] reset error', err);
    res.status(500).json({ error: err.message });
  }
});

export default router;
