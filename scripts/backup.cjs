// DATA-02 – offsite backup of the SQLite volume.
//
// Runs a consistent snapshot of the database, verifies it, and uploads it to any S3-compatible
// bucket (Cloudflare R2, Backblaze B2, Hetzner, Wasabi, MinIO, AWS). Nothing here needs a bucket to
// exist: with no bucket configured it writes the snapshot locally and says so, so the day the
// credentials arrive the only change is three environment variables.
//
// Usage
//   node scripts/backup.cjs                 snapshot, verify, upload if configured, prune old copies
//   node scripts/backup.cjs --keep 14       keep 14 daily copies instead of 7
//   node scripts/backup.cjs --no-prune      never delete a remote copy
//   node scripts/backup.cjs --local-only    never upload, even when a bucket is configured
//
// Environment (all optional except the bucket trio, which must be complete or absent)
//   DB_PATH          default <repo>/data/careeros.db
//   BACKUP_DIR       default <repo>/backups
//   S3_ENDPOINT      e.g. https://<account>.r2.cloudflarestorage.com
//   S3_BUCKET        bucket name
//   S3_ACCESS_KEY    access key id
//   S3_SECRET_KEY    secret access key
//   S3_REGION        default auto (R2 and most S3-compatible stores accept this)
//   S3_PREFIX        default thinkzet-backups
'use strict';
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const { DatabaseSync } = require('node:sqlite');

const REPO = path.join(__dirname, '..');
const args = process.argv.slice(2);
const flag = (n) => args.includes(n);
const opt = (n, d) => { const i = args.indexOf(n); return i >= 0 && args[i + 1] ? args[i + 1] : d; };

const DB_PATH = process.env.DB_PATH || path.join(REPO, 'data', 'careeros.db');
const BACKUP_DIR = process.env.BACKUP_DIR || path.join(REPO, 'backups');
const KEEP = Math.max(1, Number(opt('--keep', 7)) || 7);
const LOCAL_ONLY = flag('--local-only');
const NO_PRUNE = flag('--no-prune');

const S3 = {
  endpoint: (process.env.S3_ENDPOINT || '').replace(/\/+$/, ''),
  bucket: process.env.S3_BUCKET || '',
  key: process.env.S3_ACCESS_KEY || '',
  secret: process.env.S3_SECRET_KEY || '',
  region: process.env.S3_REGION || 'auto',
  prefix: (process.env.S3_PREFIX || 'thinkzet-backups').replace(/^\/+|\/+$/g, ''),
};
const bucketReady = !!(S3.endpoint && S3.bucket && S3.key && S3.secret);

const stamp = () => {
  const d = new Date();
  const p = (n) => String(n).padStart(2, '0');
  return `${d.getUTCFullYear()}${p(d.getUTCMonth() + 1)}${p(d.getUTCDate())}-${p(d.getUTCHours())}${p(d.getUTCMinutes())}${p(d.getUTCSeconds())}`;
};
const human = (b) => (b > 1048576 ? (b / 1048576).toFixed(1) + ' MB' : Math.round(b / 1024) + ' KB');

// A snapshot taken with VACUUM INTO is a complete, consistent database even while the app is writing:
// it is a copy of a committed state, not a byte copy of a file mid-transaction.
function snapshot() {
  if (!fs.existsSync(DB_PATH)) throw new Error(`no database at ${DB_PATH}`);
  fs.mkdirSync(BACKUP_DIR, { recursive: true });
  const name = `careeros-${stamp()}.db`;
  const out = path.join(BACKUP_DIR, name);
  const db = new DatabaseSync(DB_PATH, { readOnly: true });
  try {
    db.exec(`VACUUM INTO '${out.replace(/'/g, "''")}'`);
  } finally { db.close(); }
  return { name, path: out, bytes: fs.statSync(out).size };
}

// A backup nobody opened is a hope. Open it, check the pages, count the rows that matter.
function verify(file) {
  const db = new DatabaseSync(file, { readOnly: true });
  try {
    const integrity = db.prepare('PRAGMA integrity_check').get();
    const ok = String(Object.values(integrity || {})[0] || '').toLowerCase() === 'ok';
    const tables = db.prepare("SELECT COUNT(*) AS n FROM sqlite_master WHERE type='table'").get().n;
    const count = (t) => { try { return db.prepare(`SELECT COUNT(*) AS n FROM ${t}`).get().n; } catch { return 0; } };
    return {
      ok, tables,
      opportunities: count('opportunities'),
      users: count('users'),
      salaryRecords: count('salary_records'),
    };
  } finally { db.close(); }
}

// ---- S3 signing, by hand: SigV4 for a single PUT and a single list, no SDK, no dependency ----
const sha256 = (b) => crypto.createHash('sha256').update(b).digest('hex');
const hmac = (k, d) => crypto.createHmac('sha256', k).update(d).digest();

function signedHeaders(method, key, payloadHash, extra = {}) {
  const url = new URL(`${S3.endpoint}/${S3.bucket}/${key}`);
  const amzDate = new Date().toISOString().replace(/[:-]|\.\d{3}/g, '');
  const dateStamp = amzDate.slice(0, 8);
  const headers = { host: url.host, 'x-amz-content-sha256': payloadHash, 'x-amz-date': amzDate, ...extra };
  const names = Object.keys(headers).sort();
  const canonical = [
    method, url.pathname,
    [...url.searchParams.entries()].sort(([a], [b]) => a.localeCompare(b)).map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(v)}`).join('&'),
    names.map((n) => `${n}:${String(headers[n]).trim()}`).join('\n') + '\n',
    names.join(';'), payloadHash,
  ].join('\n');
  const scope = `${dateStamp}/${S3.region}/s3/aws4_request`;
  const toSign = ['AWS4-HMAC-SHA256', amzDate, scope, sha256(canonical)].join('\n');
  let k = hmac('AWS4' + S3.secret, dateStamp);
  k = hmac(k, S3.region); k = hmac(k, 's3'); k = hmac(k, 'aws4_request');
  const signature = crypto.createHmac('sha256', k).update(toSign).digest('hex');
  return {
    url: url.toString(),
    headers: {
      ...headers,
      authorization: `AWS4-HMAC-SHA256 Credential=${S3.key}/${scope}, SignedHeaders=${names.join(';')}, Signature=${signature}`,
    },
  };
}

async function put(key, body) {
  const hash = sha256(body);
  const { url, headers } = signedHeaders('PUT', key, hash, { 'content-type': 'application/octet-stream', 'content-length': String(body.length) });
  const res = await fetch(url, { method: 'PUT', headers, body, signal: AbortSignal.timeout(120000) });
  if (!res.ok) throw new Error(`upload failed ${res.status}: ${(await res.text()).slice(0, 200)}`);
}

async function list(prefix) {
  const { url, headers } = signedHeaders('GET', '', sha256(''), {});
  const u = new URL(url);
  u.searchParams.set('list-type', '2');
  u.searchParams.set('prefix', prefix);
  const { headers: h2 } = signedHeaders('GET', '', sha256(''), {});
  const res = await fetch(u.toString(), { method: 'GET', headers: { ...h2 }, signal: AbortSignal.timeout(60000) });
  if (!res.ok) throw new Error(`list failed ${res.status}`);
  const xml = await res.text();
  return [...xml.matchAll(/<Key>([^<]+)<\/Key>/g)].map((m) => m[1]);
}

async function remove(key) {
  const { url, headers } = signedHeaders('DELETE', key, sha256(''), {});
  const res = await fetch(url, { method: 'DELETE', headers, signal: AbortSignal.timeout(60000) });
  if (!res.ok && res.status !== 404) throw new Error(`delete failed ${res.status}`);
}

(async () => {
  const started = Date.now();
  const snap = snapshot();
  const check = verify(snap.path);
  if (!check.ok) {
    console.error(`FAILED  ${snap.name} did not pass integrity_check; it has been kept at ${snap.path}`);
    process.exitCode = 1;
    return;
  }
  const digest = sha256(fs.readFileSync(snap.path)).slice(0, 16);
  console.log(`snapshot  ${snap.name}  ${human(snap.bytes)}  sha256:${digest}`);
  console.log(`verified  integrity ok · ${check.tables} tables · ${check.opportunities} opportunities · ${check.users} users · ${check.salaryRecords} salary records`);

  if (!bucketReady || LOCAL_ONLY) {
    console.log(bucketReady
      ? 'upload    skipped (--local-only)'
      : 'upload    skipped: no bucket configured. Set S3_ENDPOINT, S3_BUCKET, S3_ACCESS_KEY and S3_SECRET_KEY and this same command uploads.');
    console.log(`kept      ${snap.path}`);
    return;
  }

  const key = `${S3.prefix}/${snap.name}`;
  await put(key, fs.readFileSync(snap.path));
  console.log(`upload    ${S3.endpoint}/${S3.bucket}/${key}`);

  if (!NO_PRUNE) {
    const keys = (await list(`${S3.prefix}/careeros-`)).sort();
    const stale = keys.slice(0, Math.max(0, keys.length - KEEP));
    for (const k of stale) await remove(k);
    if (stale.length) console.log(`pruned    ${stale.length} old ${stale.length === 1 ? 'copy' : 'copies'}, ${Math.min(keys.length, KEEP)} kept`);
  }
  console.log(`done      ${((Date.now() - started) / 1000).toFixed(1)}s`);
})().catch((e) => { console.error('FAILED  ' + e.message); process.exitCode = 1; });
