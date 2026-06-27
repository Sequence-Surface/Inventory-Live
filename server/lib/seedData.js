import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import Dataset from '../models/Dataset.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Upserts dataset.json into the Dataset collection. Safe to call on every boot:
// it only writes when the data is missing (unless force=true).
export async function ensureSeeded({ force = false } = {}) {
  const existing = await Dataset.findOne({ key: 'main' }).lean();
  if (existing && !force) return { seeded: false };

  const jsonPath = path.join(__dirname, '..', 'seed', 'dataset.json');
  if (!fs.existsSync(jsonPath)) {
    throw new Error('dataset.json not found in server/seed/');
  }
  const data = JSON.parse(fs.readFileSync(jsonPath, 'utf-8'));
  await Dataset.findOneAndUpdate(
    { key: 'main' },
    { key: 'main', data },
    { upsert: true, new: true }
  );
  return { seeded: true, products: data.products?.length };
}
