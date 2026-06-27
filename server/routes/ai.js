import { Router } from 'express';

const router = Router();

// POST /api/ai/messages
// Proxies the Anthropic Messages API. The API key comes from the request body
// (set via the in-app AI Settings gear, exactly like the original), or falls
// back to ANTHROPIC_API_KEY in the server .env. The streaming SSE response is
// piped straight back to the browser so the frontend's reader loop is unchanged.
router.post('/messages', async (req, res) => {
  const { apiKey, model, max_tokens, stream, system, messages } = req.body || {};
  const key = apiKey || process.env.ANTHROPIC_API_KEY;

  if (!key) {
    return res.status(400).json({
      error: 'No Anthropic API key — add one via the AI Settings gear, or set ANTHROPIC_API_KEY on the server.',
    });
  }

  try {
    const upstream = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': key,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model,
        max_tokens: max_tokens || 4096,
        stream: stream !== false,
        system,
        messages,
      }),
    });

    if (!upstream.ok) {
      const text = await upstream.text();
      return res.status(upstream.status).send(text);
    }

    // Mirror upstream content type (text/event-stream when streaming).
    res.setHeader('Content-Type', upstream.headers.get('content-type') || 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache, no-transform');
    res.setHeader('Connection', 'keep-alive');
    if (typeof res.flushHeaders === 'function') res.flushHeaders();

    const reader = upstream.body.getReader();
    // eslint-disable-next-line no-constant-condition
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      res.write(Buffer.from(value));
    }
    res.end();
  } catch (err) {
    console.error('[ai] proxy error', err);
    if (!res.headersSent) res.status(502).json({ error: err.message });
    else res.end();
  }
});

export default router;
