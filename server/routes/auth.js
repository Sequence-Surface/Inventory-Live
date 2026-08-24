import { Router } from 'express';
import { checkCredentials, issueSessionCookie, clearSessionCookie, sessionFromRequest } from '../lib/auth.js';

const router = Router();

// POST /api/auth/login — { username, password } → session cookie.
router.post('/login', (req, res) => {
  const { username, password } = req.body || {};
  if (!username || !password || !checkCredentials(username, password)) {
    return res.status(401).json({ error: 'Wrong username or password.' });
  }
  issueSessionCookie(res, String(username));
  res.json({ ok: true, user: String(username) });
});

// POST /api/auth/logout — clears the session cookie.
router.post('/logout', (req, res) => {
  clearSessionCookie(res);
  res.json({ ok: true });
});

// GET /api/auth/me — is this browser signed in?
router.get('/me', (req, res) => {
  const session = sessionFromRequest(req);
  if (!session) return res.status(401).json({ error: 'Not signed in.' });
  res.json({ ok: true, user: session.user });
});

export default router;
