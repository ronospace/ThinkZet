// Auth + session layer. Passwordless magic code (dev mode surfaces the code in-app),
// server-side sessions, HttpOnly cookies. No dependencies.
'use strict';
const crypto = require('node:crypto');
const { db } = require('./db.cjs');

const COOKIE = 'careeros_session';
const SESSION_DAYS = 180;

function randomCode() {
  return String(crypto.randomInt(100000, 999999));
}
function token() {
  return crypto.randomBytes(32).toString('base64url');
}

function parseCookies(req) {
  const raw = req.headers.cookie || '';
  const out = {};
  for (const part of raw.split(';')) {
    const i = part.indexOf('=');
    if (i === -1) continue;
    out[part.slice(0, i).trim()] = decodeURIComponent(part.slice(i + 1).trim());
  }
  return out;
}

function setCookie(res, name, value, maxAgeSec) {
  const prev = res.getHeader('Set-Cookie');
  // SameSite=None with Secure is required for the cross-site POST Apple returns by: with Lax the
  // browser drops the new session cookie on that response, so sign-in completes and the person
  // still lands signed out. None is only valid over HTTPS, so a local http run keeps Lax.
  const secure = process.env.COOKIE_SECURE !== 'false' && (process.env.APP_URL || '').startsWith('https://');
  const sameSite = secure ? 'None' : 'Lax';
  const cookie = `${name}=${encodeURIComponent(value)}; Path=/; HttpOnly; SameSite=${sameSite}; Max-Age=${maxAgeSec}${secure ? '; Secure' : ''}`;
  res.setHeader('Set-Cookie', prev ? [].concat(prev, cookie) : [cookie]);
}

function requestCode(email) {
  const clean = String(email || '').trim().toLowerCase();
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(clean)) throw new Error('invalid email');
  const code = randomCode();
  const expires = new Date(Date.now() + 10 * 60 * 1000).toISOString();
  db.prepare('INSERT INTO login_codes (email, code, expires_at) VALUES (?,?,?)').run(clean, code, expires);
  return { email: clean, code, expiresAt: expires, dev: true };
}

function verifyCode(email, code) {
  const clean = String(email || '').trim().toLowerCase();
  const row = db.prepare(`SELECT * FROM login_codes WHERE email=? AND code=? AND used=0 AND expires_at > datetime('now')
    ORDER BY id DESC LIMIT 1`).get(clean, String(code || '').trim());
  if (!row) return null;
  db.prepare('UPDATE login_codes SET used=1 WHERE id=?').run(row.id);
  return sessionForEmail(clean);
}

// Shared by the email code and by Google/Apple sign-in. The caller must already have proved
// that the person owns this address (a code from the inbox, or a provider-verified email).
function sessionForEmail(clean, displayName) {
  let user = db.prepare('SELECT * FROM users WHERE email=?').get(clean);
  const provided = displayName && String(displayName).trim().slice(0, 80);
  if (user && provided && !(user.name && user.name.trim())) {
    db.prepare('UPDATE users SET name=? WHERE id=?').run(provided, user.id);
    user = db.prepare('SELECT * FROM users WHERE id=?').get(user.id);
  }
  if (!user) {
    const id = crypto.randomUUID();
    // Never derive a name from the email handle: 'ronnohjeff' cannot be split into a first name.
    // Google and Apple supply a real name; email sign-in asks for it during onboarding.
    const name = (displayName && String(displayName).trim().slice(0, 80)) || null;
    db.prepare('INSERT INTO users (id,email,name) VALUES (?,?,?)').run(id, clean, name);
    user = db.prepare('SELECT * FROM users WHERE id=?').get(id);
  }
  const t = token();
  const expires = new Date(Date.now() + SESSION_DAYS * 86400000).toISOString();
  db.prepare('INSERT INTO sessions (token,user_id,expires_at) VALUES (?,?,?)').run(t, user.id, expires);
  return { user, token: t, expiresAt: expires };
}

// A session is rolling: every visit pushes its expiry forward, so someone who comes back weekly is
// never asked to sign in again. The cookie is re-issued with the same lifetime, which keeps the
// browser copy and the database row in step.
function currentUser(req, res) {
  const t = parseCookies(req)[COOKIE];
  if (!t) return null;
  const s = db.prepare('SELECT * FROM sessions WHERE token=? AND expires_at > datetime(\'now\')').get(t);
  if (!s) return null;
  const left = new Date(s.expires_at).getTime() - Date.now();
  // Only extend when less than 90 days remain, so a busy user does not write to the row on every request.
  if (left < 90 * 86400000) {
    const expires = new Date(Date.now() + SESSION_DAYS * 86400000).toISOString();
    db.prepare('UPDATE sessions SET last_seen=datetime(\'now\'), expires_at=? WHERE token=?').run(expires, t);
    if (res && typeof res.setHeader === 'function') setCookie(res, COOKIE, t, SESSION_DAYS * 86400);
  } else {
    db.prepare('UPDATE sessions SET last_seen=datetime(\'now\') WHERE token=?').run(t);
  }
  return db.prepare('SELECT * FROM users WHERE id=?').get(s.user_id);
}

function logout(req, res) {
  const t = parseCookies(req)[COOKIE];
  if (t) db.prepare('DELETE FROM sessions WHERE token=?').run(t);
  setCookie(res, COOKIE, '', 0);
}

module.exports = { requestCode, verifyCode, sessionForEmail, currentUser, logout, setCookie, parseCookies, COOKIE, SESSION_DAYS };
