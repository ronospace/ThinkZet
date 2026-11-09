// Sign in with Google and Apple. Authorization-code flow, no dependencies.
//
// Trust model: the id_token is fetched by this server straight from the provider's token
// endpoint over TLS, so it is trusted as the provider's own answer (OpenID Connect Core
// 3.1.3.7). We still check issuer, audience, expiry and the per-login nonce. An account is
// only created or linked when the provider says the email is verified.
//
// State lives in memory, not in a cookie: Apple returns by cross-site POST, and SameSite=Lax
// cookies are not sent on that request.
'use strict';
const crypto = require('node:crypto');
const AUTH = require('./auth.cjs');
const { db: AUTH_DB } = require('./db.cjs');

const env = (k) => (process.env[k] || '').trim();
// state -> { provider, nonce, exp }. Kept in the database, not in memory: Apple returns by a
// cross-site POST that can land on a different instance, and any redeploy would wipe an in-memory
// map, which reads as "this sign-in link expired" immediately after a successful consent.
const pending = {
  set(state, v) {
    AUTH_DB.prepare('INSERT OR REPLACE INTO oauth_states (state,provider,nonce,expires_at) VALUES (?,?,?,?)')
      .run(state, v.provider, v.nonce, new Date(v.exp).toISOString());
  },
  get(state) {
    const row = AUTH_DB.prepare('SELECT provider,nonce,expires_at FROM oauth_states WHERE state=?').get(state);
    if (!row) return undefined;
    return { provider: row.provider, nonce: row.nonce, exp: new Date(row.expires_at).getTime() };
  },
  delete(state) { AUTH_DB.prepare('DELETE FROM oauth_states WHERE state=?').run(state); },
  sweep() { AUTH_DB.prepare("DELETE FROM oauth_states WHERE expires_at < datetime('now')").run(); },
};

function sweep() {
  const now = Date.now();
  pending.sweep();
}

function providers() {
  return {
    google: !!(env('GOOGLE_CLIENT_ID') && env('GOOGLE_CLIENT_SECRET')),
    apple: !!(env('APPLE_CLIENT_ID') && env('APPLE_TEAM_ID') && env('APPLE_KEY_ID') && env('APPLE_PRIVATE_KEY')),
  };
}

const b64u = (b) => Buffer.from(b).toString('base64url');

// Apple's client secret is a short-lived ES256 JWT signed with the .p8 key.

// Accepts a PEM with literal \n, real newlines, surrounding quotes, or a bare base64 body.
function normalisePem(raw) {
  let v = String(raw || '').trim();
  if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) v = v.slice(1, -1);
  v = v.replace(/\\r/g, '').replace(/\\n/g, '\n').trim();
  if (!v.includes('-----BEGIN')) {
    const body = v.replace(/\s+/g, '');
    const wrapped = (body.match(/.{1,64}/g) || []).join('\n');
    v = `-----BEGIN PRIVATE KEY-----\n${wrapped}\n-----END PRIVATE KEY-----`;
  }
  return v;
}

function appleClientSecret() {
  const now = Math.floor(Date.now() / 1000);
  const head = b64u(JSON.stringify({ alg: 'ES256', kid: env('APPLE_KEY_ID'), typ: 'JWT' }));
  const body = b64u(JSON.stringify({
    iss: env('APPLE_TEAM_ID'), iat: now, exp: now + 300,
    aud: 'https://appleid.apple.com', sub: env('APPLE_CLIENT_ID'),
  }));
  // Railway (and any dashboard paste) may deliver the key with literal \n, real newlines, or wrapped
  // in quotes. Normalise all three, and rebuild the PEM if only the base64 body survived, so a bad
  // paste cannot surface as a raw OpenSSL "DECODER routines::unsupported" error.
  const key = normalisePem(env('APPLE_PRIVATE_KEY'));
  const sig = crypto.sign('sha256', Buffer.from(`${head}.${body}`), { key, dsaEncoding: 'ieee-p1363' });
  return `${head}.${body}.${b64u(sig)}`;
}

function redirectUri(origin, provider) {
  return `${origin}/api/auth/${provider}/callback`;
}

function startUrl(provider, origin) {
  sweep();
  if (!providers()[provider]) throw new Error(`${provider} sign-in is not configured`);
  const state = crypto.randomBytes(24).toString('base64url');
  const nonce = crypto.randomBytes(16).toString('base64url');
  pending.set(state, { provider, nonce, exp: Date.now() + 10 * 60 * 1000 });
  const q = new URLSearchParams({ response_type: 'code', state, nonce, redirect_uri: redirectUri(origin, provider) });
  if (provider === 'google') {
    q.set('client_id', env('GOOGLE_CLIENT_ID'));
    q.set('scope', 'openid email profile');
    q.set('prompt', 'select_account');
    return `https://accounts.google.com/o/oauth2/v2/auth?${q}`;
  }
  q.set('client_id', env('APPLE_CLIENT_ID'));
  q.set('scope', 'name email');
  q.set('response_mode', 'form_post');
  return `https://appleid.apple.com/auth/authorize?${q}`;
}

function decodeJwt(t) {
  const parts = String(t || '').split('.');
  if (parts.length !== 3) throw new Error('malformed id_token');
  return JSON.parse(Buffer.from(parts[1], 'base64url').toString('utf8'));
}

async function finish(provider, origin, code, state, appleUser) {
  const st = pending.get(state);
  pending.delete(state);
  if (!st || st.provider !== provider || st.exp < Date.now()) throw new Error('This sign-in link expired. Please try again.');

  const form = new URLSearchParams({ grant_type: 'authorization_code', code, redirect_uri: redirectUri(origin, provider) });
  let url;
  if (provider === 'google') {
    url = 'https://oauth2.googleapis.com/token';
    form.set('client_id', env('GOOGLE_CLIENT_ID'));
    form.set('client_secret', env('GOOGLE_CLIENT_SECRET'));
  } else {
    url = 'https://appleid.apple.com/auth/token';
    form.set('client_id', env('APPLE_CLIENT_ID'));
    form.set('client_secret', appleClientSecret());
  }
  const res = await fetch(url, {
    method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: form, signal: AbortSignal.timeout(15000),
  });
  const j = await res.json().catch(() => ({}));
  if (!res.ok || !j.id_token) throw new Error(j.error_description || j.error || `${provider} sign-in failed`);

  const c = decodeJwt(j.id_token);
  const issOk = provider === 'google'
    ? ['https://accounts.google.com', 'accounts.google.com'].includes(c.iss)
    : c.iss === 'https://appleid.apple.com';
  const aud = provider === 'google' ? env('GOOGLE_CLIENT_ID') : env('APPLE_CLIENT_ID');
  if (!issOk || c.aud !== aud) throw new Error('Sign-in could not be verified');
  if (!c.exp || c.exp * 1000 < Date.now()) throw new Error('Sign-in expired');
  if (c.nonce !== st.nonce) throw new Error('Sign-in could not be verified');
  const verified = c.email_verified === true || c.email_verified === 'true';
  if (!c.email || !verified) throw new Error('That account has no verified email address');

  let name = c.name || null;
  if (!name && appleUser) {
    try { const u = typeof appleUser === 'string' ? JSON.parse(appleUser) : appleUser; name = [u?.name?.firstName, u?.name?.lastName].filter(Boolean).join(' ') || null; } catch { /* name is optional */ }
  }
  return AUTH.sessionForEmail(String(c.email).toLowerCase(), name);
}

module.exports = { providers, startUrl, finish };
