// Auth + session layer. Passwordless magic code (dev mode surfaces the code in-app),
// server-side sessions, HttpOnly cookies. No dependencies.
'use strict';
const crypto = require('node:crypto');
const { db } = require('./db.cjs');

const COOKIE = 'careeros_session';
const SESSION_DAYS = 30;

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
  const cookie = `${name}=${encodeURIComponent(value)}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${maxAgeSec}`;
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
  if (!user) {
    const id = crypto.randomUUID();
    const name = (displayName && String(displayName).trim().slice(0, 80)) || clean.split('@')[0].replace(/[._-]+/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
    db.prepare('INSERT INTO users (id,email,name) VALUES (?,?,?)').run(id, clean, name);
    user = db.prepare('SELECT * FROM users WHERE id=?').get(id);
  }
  const t = token();
  const expires = new Date(Date.now() + SESSION_DAYS * 86400000).toISOString();
  db.prepare('INSERT INTO sessions (token,user_id,expires_at) VALUES (?,?,?)').run(t, user.id, expires);
  return { user, token: t, expiresAt: expires };
}

function currentUser(req) {
  const t = parseCookies(req)[COOKIE];
  if (!t) return null;
  const s = db.prepare('SELECT * FROM sessions WHERE token=? AND expires_at > datetime(\'now\')').get(t);
  if (!s) return null;
  db.prepare('UPDATE sessions SET last_seen=datetime(\'now\') WHERE token=?').run(t);
  return db.prepare('SELECT * FROM users WHERE id=?').get(s.user_id);
}

function logout(req, res) {
  const t = parseCookies(req)[COOKIE];
  if (t) db.prepare('DELETE FROM sessions WHERE token=?').run(t);
  setCookie(res, COOKIE, '', 0);
}

module.exports = { requestCode, verifyCode, sessionForEmail, currentUser, logout, setCookie, parseCookies, COOKIE, SESSION_DAYS };
