import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { connectDB, connectMemoryDB } from './lib/db.js';
import { ensureSeeded } from './lib/seedData.js';

import dataRoutes from './routes/data.js';


import stateRoutes from './routes/state.js';
import aiRoutes from './routes/ai.js';
import sheetsRoutes from './routes/sheets.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PORT = process.env.PORT || 4000;
const MONGODB_URI = process.env.MONGODB_URI; // if unset, we use in-memory Mongo

const app = express();
app.use(cors());
app.use(express.json({ limit: '50mb' }));

app.get('/api/health', (req, res) => res.json({ ok: true }));
app.use('/api/data', dataRoutes);
app.use('/api/state', stateRoutes);
app.use('/api/ai', aiRoutes);
app.use('/api/sheets', sheetsRoutes);

// Serve the built React app in production (client/dist), if present.
const clientDist = path.resolve(__dirname, '../client/dist');
if (fs.existsSync(clientDist)) {
  app.use(express.static(clientDist));
  app.use((req, res, next) => {
    if (req.path.startsWith('/api/')) return next();
    res.sendFile(path.join(clientDist, 'index.html'));
  });
}

async function connect() {
  // If an explicit MONGODB_URI is set, we REQUIRE it: on failure we exit loudly rather than
  // silently using an in-memory DB (which would keep the user's data out of Atlas). Set
  // MONGODB_ALLOW_MEMORY_FALLBACK=1 to opt back into the old silent-fallback behavior.
  if (MONGODB_URI) {
    try {
      await connectDB(MONGODB_URI);
      return;
    } catch (err) {
      console.error(`[server] FAILED to connect to MONGODB_URI: ${err.message}`);
      if (process.env.MONGODB_ALLOW_MEMORY_FALLBACK === '1') {
        console.warn('[server] MONGODB_ALLOW_MEMORY_FALLBACK=1 → using TEMPORARY in-memory DB (data will NOT reach Atlas).');
        await connectMemoryDB();
        return;
      }
      console.error('[server] Refusing to start on a temporary in-memory DB (your data would not persist to Atlas).');
      console.error('[server] Check: Atlas Network Access IP allowlist, credentials, and DNS. Then restart.');
      throw err;
    }
  }
  console.log('[server] no MONGODB_URI set — starting in-memory MongoDB (zero-setup mode).');
  await connectMemoryDB();
}

async function start() {
  try {
    await connect();
    const result = await ensureSeeded();
    if (result.seeded) console.log(`[server] dataset seeded (${result.products} products).`);
    else console.log('[server] dataset already present.');
  } catch (err) {
    console.error('[server] startup failed:', err.message);
    process.exit(1);
  }
  app.listen(PORT, () => {
    console.log(`[server] listening on http://localhost:${PORT}`);
  });
}

start();
