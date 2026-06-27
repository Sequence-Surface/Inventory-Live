import 'dotenv/config';
import mongoose from 'mongoose';
import { connectDB } from '../lib/db.js';
import { ensureSeeded } from '../lib/seedData.js';

// Explicit seeding for a real (persistent) MongoDB. With the in-memory fallback
// the server auto-seeds on boot, so this is only needed when you point
// MONGODB_URI at your own database.
async function main() {
  const uri = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/inventory_intelligence';
  await connectDB(uri);
  const result = await ensureSeeded({ force: true });
  console.log('[seed] done:', result);
  await mongoose.connection.close();
  process.exit(0);
}

main().catch((err) => {
  console.error('[seed] failed', err);
  process.exit(1);
});
