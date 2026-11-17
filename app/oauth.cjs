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
    const row = AUTH_DB.prepare('SELECT provider,nonce,expires_at,claimed_at FROM oauth_states WHERE state=?').get(state);
    if (!row) return undefined;
    return { provider: row.provider, nonce: row.nonce, exp: new Date(row.expires_at).getTime(), claimed: !!row.claimed_at };
  },
  // Claim the state exactly once. SQLite reports the number of rows a DELETE touched, so the caller
  // that gets 1 owns this sign-in and every other callback for the same state is a replay. This is what
  // stops a second Apple POST (a reload, a retry, a double tap on Continue) from consuming the code twice
  // and answering "expired" to a person who already authorised.
  claim(state) {
    const info = AUTH_DB.prepare("UPDATE oauth_states SET claimed_at=datetime('now') WHERE state=? AND claimed_at IS NULL").run(state);
    return (info.changes || 0) === 1;
  },
  delete(state) { AUTH_DB.prepare('DELETE FROM oauth_states WHERE state=?').run(state); },
  sweep() { AUTH_DB.prepare("DELETE FROM oauth_states WHERE expires_at < datetime('now')").run(); },
};

function sweep() {
  const now = Date.now();
  pending.sweep();
}

// A provider is offered only when it will work. Four present variables and a key that parses is not
// the same as Apple accepting the client: a rotated-out .p8 or a wrong Services ID passes every local
// check and still answers invalid_client. So Apple is offered only after a probe that asked Apple, and
// a failed probe withdraws the button instead of leading someone into an error they cannot fix.
function appleConfigured() {
  return !!(env('APPLE_CLIENT_ID') && env('APPLE_TEAM_ID') && env('APPLE_KEY_ID') && appleKeyUsable());
}
function providers() {
  return {
    google: !!(env('GOOGLE_CLIENT_ID') && env('GOOGLE_CLIENT_SECRET')),
    // No probe result means no evidence, and no evidence is not a yes.
    apple: appleConfigured() && !!appleProbe && appleProbe.ok === true,
  };
}

let appleProbe = null;
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


// What the pasted key actually looks like, without printing a byte of it. A .p8 that fails to parse
// is almost always one of four shapes: the whole PEM on one line with literal \n, the base64 body
// only, a truncated paste, or a key from a different key type. Naming the shape is the difference
// between "misconfigured" and "paste it again like this".
function appleKeyShape() {
  const raw = String(env('APPLE_PRIVATE_KEY') || '');
  const trimmed = raw.trim();
  const shape = {
    present: !!trimmed,
    length: trimmed.length,
    hasBeginMarker: /-----BEGIN [A-Z ]*PRIVATE KEY-----/.test(trimmed),
    hasEndMarker: /-----END [A-Z ]*PRIVATE KEY-----/.test(trimmed),
    literalBackslashN: /\\n/.test(trimmed),
    realNewlines: /\n/.test(trimmed),
    lines: trimmed ? trimmed.split(/\r?\n/).length : 0,
    quoted: /^["']/.test(trimmed),
    parses: false,
    error: null,
  };
  // An absent key is absent, not broken: no marker, no error, nothing to explain.
  if (trimmed) {
    try { crypto.createPrivateKey(normalisePem(trimmed)); shape.parses = true; }
    catch (e) { shape.error = String(e.message || e).replace(/[^\x20-\x7e]/g, ' ').slice(0, 160); }
  }
  return shape;
}

// True only when the private key actually parses. A key that is present but unreadable must not
// advertise the provider as ready, or the button looks live and fails after consent.
function appleKeyUsable() {
  try { crypto.createPrivateKey(normalisePem(env('APPLE_PRIVATE_KEY'))); return true; } catch { return false; }
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
  if (!st || st.provider !== provider || st.exp < Date.now()) throw new Error('This sign-in link expired. Please try again.');
  // Read first, then claim: the row must still exist to be read, and exactly one caller may claim it.
  // A second callback for the same state is a replay (reload, retry, a second tap on Continue), not an
  // expired link, and saying so is what stops the person signing in twice.
  if (st.claimed || !pending.claim(state)) throw new Error('This sign-in was already completed. Please try again.');

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
  if (!res.ok || !j.id_token) {
    // Keep the provider's exact answer: status, error code and description. This is what tells an
    // invalid_client apart from an invalid_grant, a bad redirect or a rejected client secret.
    const detail = `${provider} token exchange ${res.status}: ${j.error || 'no error code'}${j.error_description ? ' - ' + j.error_description : ''}`;
    const err = new Error(detail);
    err.step = 'token_exchange';
    err.providerStatus = res.status;
    err.providerBody = j;
    throw err;
  }

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
  return AUTH.sessionForEmail(String(c.email).toLowerCase(), name, provider);
}

// Which variables a provider still needs, and whether the key parses. Names and booleans only, never a value.
function readiness() {
  const has = (k) => !!env(k);
  let keyParses = false;
  try { crypto.createPrivateKey(normalisePem(env('APPLE_PRIVATE_KEY'))); keyParses = true; } catch { keyParses = false; }
  return {
    google: {
      GOOGLE_CLIENT_ID: has('GOOGLE_CLIENT_ID'),
      GOOGLE_CLIENT_SECRET: has('GOOGLE_CLIENT_SECRET'),
      ready: !!(has('GOOGLE_CLIENT_ID') && has('GOOGLE_CLIENT_SECRET')),
    },
    apple: {
      APPLE_CLIENT_ID: has('APPLE_CLIENT_ID'),
      APPLE_TEAM_ID: has('APPLE_TEAM_ID'),
      APPLE_KEY_ID: has('APPLE_KEY_ID'),
      APPLE_PRIVATE_KEY: has('APPLE_PRIVATE_KEY'),
      keyParses,
      keyShape: appleKeyShape(),
      // Mint the client secret and check the signature against the key's own public half. This proves one
      // thing only: the JWT is well formed and signed by the key in APPLE_PRIVATE_KEY. It cannot prove that
      // APPLE_KEY_ID or APPLE_TEAM_ID name the same key and team, because the check never asks Apple.
      // Naming it clientSecretOk claimed more than it measured, which is exactly how a broken Apple key
      // reads as ready. Use POST /api/auth/apple/probe for the answer that involves Apple.
      signatureMatchesKey: keyParses ? (() => {
        try {
          const jwt = appleClientSecret();
          const [h, b, sig] = jwt.split('.');
          const pub = crypto.createPublicKey(crypto.createPrivateKey(normalisePem(env('APPLE_PRIVATE_KEY'))));
          return crypto.verify('sha256', Buffer.from(`${h}.${b}`), { key: pub, dsaEncoding: 'ieee-p1363' }, Buffer.from(sig, 'base64url'));
        } catch { return false; }
      })() : false,
      ...appleFormat(),
      ready: !!(has('APPLE_CLIENT_ID') && has('APPLE_TEAM_ID') && has('APPLE_KEY_ID') && keyParses),
    },
  };
}


// Apple answers invalid_client when the client secret itself is refused, and invalid_grant when the
// secret was accepted but the authorization code was not. Sending a deliberately bad code therefore
// tells the two apart in one request, without a browser and without revealing a single value:
//   invalid_grant  -> our credentials are good, the code was the problem
//   invalid_client -> Apple is refusing the key, the key id, the team id or the client id
// The result is a boolean on the diagnostic page, never a key.
// appleProbe is declared above providers() so a probe result can withdraw the Apple button.
async function probeApple() {
  if (!appleConfigured()) { appleProbe = { at: new Date().toISOString(), ok: false, code: 'not_configured' }; return appleProbe; }
  try {
    const form = new URLSearchParams({
      grant_type: 'authorization_code', code: 'thinkzet-probe', redirect_uri: redirectUri('https://thinkzet.com', 'apple'),
      client_id: env('APPLE_CLIENT_ID'), client_secret: appleClientSecret(),
    });
    const res = await fetch('https://appleid.apple.com/auth/token', {
      method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: form, signal: AbortSignal.timeout(12000),
    });
    const j = await res.json().catch(() => ({}));
    const code = String(j.error || res.status);
    appleProbe = { at: new Date().toISOString(), ok: code === 'invalid_grant', code };
  } catch (e) {
    appleProbe = { at: new Date().toISOString(), ok: null, code: 'unreachable' };
  }
  return appleProbe;
}
function appleCredentials() { return appleProbe; }

// Apple's own format rules, checked locally. A Services ID is a reverse-domain identifier and is
// never the app's bundle id; the key id and team id are ten characters. These catch the two mistakes
// that produce invalid_client while every variable is present and the key parses.
function appleFormat() {
  const cid = env('APPLE_CLIENT_ID');
  const kid = env('APPLE_KEY_ID');
  const tid = env('APPLE_TEAM_ID');
  return {
    clientIdLooksLikeServicesId: /^[A-Za-z0-9.-]+\.[A-Za-z0-9.-]+$/.test(cid) && cid.split('.').length >= 3,
    keyIdTenChars: /^[A-Z0-9]{10}$/.test(kid),
    teamIdTenChars: /^[A-Z0-9]{10}$/.test(tid),
  };
}

module.exports = { providers, appleConfigured, startUrl, finish, readiness, probeApple, appleCredentials, appleFormat, appleKeyShape };
