import { Router } from 'express';
import Dataset from '../models/Dataset.js';

const router = Router();

// GET /api/data — returns the full dataset object (the original `D`).
router.get('/', async (req, res) => {
  try {
    const doc = await Dataset.findOne({ key: 'main' }).lean();
    if (!doc) {
      return res.status(404).json({
        error: 'Dataset not seeded. Run `npm run seed` in the server folder.',
      });
    }
    res.json(doc.data);
  } catch (err) {
    console.error('[data] error', err);
    res.status(500).json({ error: err.message });
  }
});

export default router;
