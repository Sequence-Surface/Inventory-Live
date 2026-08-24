import crypto from 'crypto';

// Simple, dependency-free session auth for a single-team tool.
// Credentials come from env (AUTH_USER / AUTH_PASSWORD); a signed, httpOnly
// cookie carries the session. Changing the password invalidates all sessions
// (the signing secret is derived from the credentials).

const USER = process.env.AUTH_USER || 'admin';
const PASSWORD = process.env.AUTH_PASSWORD || 'admin123';
const SESSION_DAYS = 7;
const COOKIE = 'inv_session';

if (!process.env.AUTH_PASSWORD) {
  console.warn('==============================================================');
  console.warn('[auth] Using the DEFAULT login (admin / admin123).');
  console.warn('[auth] Set AUTH_USER and AUTH_PASSWORD in server/.env to change it.');
  console.warn('==============================================================');
}

const secret = crypto.createHash('sha256').update(`inv-auth|${USER}|${PASSWORD}`).digest();

function sign(payload) {
  const mac = crypto.createHmac('sha256', secret).update(payload).digest('base64url');
  return `${Buffer.from(payload).toString('base64url')}.${mac}`;
}

function verify(token) {
  if (!token || typeof token !== 'string') return null;
  const dot = token.lastIndexOf('.');
  if (dot < 0) return null;
  let payload;
  try { payload = Buffer.from(token.slice(0, dot), 'base64url').toString(); } catch (e) { return null; }
  const expected = crypto.createHmac('sha256', secret).update(payload).digest('base64url');
  const given = token.slice(dot + 1);
  const a = Buffer.from(expected), b = Buffer.from(given);
  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) return null;
  const [user, expiry] = payload.split('|');
  if (!expiry || Date.now() > +expiry) return null;
  return { user };
}

function timingSafeStringEqual(a, b) {
  const ha = crypto.createHash('sha256').update(String(a)).digest();
  const hb = crypto.createHash('sha256').update(String(b)).digest();
  return crypto.timingSafeEqual(ha, hb);
}

export function checkCredentials(username, password) {
  return timingSafeStringEqual(username, USER) && timingSafeStringEqual(password, PASSWORD);
}

export function issueSessionCookie(res, username) {
  const expiry = Date.now() + SESSION_DAYS * 24 * 60 * 60 * 1000;
  const token = sign(`${username}|${expiry}`);
  res.setHeader('Set-Cookie',
    `${COOKIE}=${token}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${SESSION_DAYS * 24 * 60 * 60}`);
}

export function clearSessionCookie(res) {
  res.setHeader('Set-Cookie', `${COOKIE}=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0`);
}

export function sessionFromRequest(req) {
  const header = req.headers.cookie || '';
  for (const part of header.split(';')) {
    const [k, ...rest] = part.trim().split('=');
    if (k === COOKIE) return verify(rest.join('='));
  }
  return null;
}

// Express middleware: every /api route behind this returns 401 without a
// valid session. (Static files and the SPA page stay public — the client
// shows the login screen; the DATA is what's protected.)
export function requireAuth(req, res, next) {
  const session = sessionFromRequest(req);
  if (!session) return res.status(401).json({ error: 'Not signed in.' });
  req.user = session.user;
  next();
}
