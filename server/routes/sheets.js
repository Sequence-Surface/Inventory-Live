import { Router } from 'express';

const router = Router();

// GET /api/sheets/proxy?url=<encoded google sheets export/csv url>
// Server-side fetch of a Google Sheets export so the browser isn't blocked by
// CORS. Returns the raw bytes; the frontend still detects CSV vs XLSX and parses
// it exactly as before.
router.get('/proxy', async (req, res) => {
  const url = req.query.url;
  if (!url || typeof url !== 'string') {
    return res.status(400).json({ error: 'Missing url query param' });
  }
  // Only allow Google Sheets / Docs hosts.
  let parsed;
  try {
    parsed = new URL(url);
  } catch {
    return res.status(400).json({ error: 'Invalid url' });
  }
  if (!/(^|\.)docs\.google\.com$|(^|\.)googleusercontent\.com$/.test(parsed.hostname)) {
    return res.status(400).json({ error: 'Only Google Sheets URLs are allowed' });
  }

  try {
    const upstream = await fetch(url, { redirect: 'follow' });
    if (!upstream.ok) {
      return res.status(upstream.status).json({ error: 'Upstream HTTP ' + upstream.status });
    }
    const buf = Buffer.from(await upstream.arrayBuffer());
    res.setHeader(
      'Content-Type',
      upstream.headers.get('content-type') || 'application/octet-stream'
    );
    res.send(buf);
  } catch (err) {
    console.error('[sheets] proxy error', err);
    res.status(502).json({ error: err.message });
  }
});

export default router;
