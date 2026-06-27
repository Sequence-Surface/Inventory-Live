import { Router } from 'express';
import State from '../models/State.js';

const router = Router();

// GET /api/state — return every persisted key as an object { key: value }.
// The frontend uses this to hydrate localStorage on load.
router.get('/', async (req, res) => {
  try {
    const docs = await State.find({}).lean();
    const out = {};
    for (const d of docs) out[d.key] = d.value;
    res.json(out);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/state/:key — single value
router.get('/:key', async (req, res) => {
  try {
    const doc = await State.findOne({ key: req.params.key }).lean();
    res.json(doc ? doc.value : null);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PUT /api/state/:key — upsert a value (body: the raw JSON value)
router.put('/:key', async (req, res) => {
  try {
    const value = req.body && Object.prototype.hasOwnProperty.call(req.body, 'value')
      ? req.body.value
      : req.body;
    await State.findOneAndUpdate(
      { key: req.params.key },
      { key: req.params.key, value },
      { upsert: true, new: true }
    );
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE /api/state/:key — remove a key (mirrors localStorage.removeItem)
router.delete('/:key', async (req, res) => {
  try {
    await State.deleteOne({ key: req.params.key });
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
