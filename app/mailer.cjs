// Email: composition, delivery, and engagement loops.
//
// Three delivery modes, all honest:
//   1. No provider configured -> an OUTBOX. Messages are composed, stored and viewable,
//      never silently dropped. You can read exactly what would have been sent.
//   2. Resend configured      -> real delivery, real events.
//   3. Postmark configured    -> real delivery.
//
// The brief is the retention loop. It has one job: give a reason to open the app today.
'use strict';
const crypto = require('node:crypto');
const { db } = require('./db.cjs');

const CONFIG = {
  resendKey: process.env.RESEND_API_KEY || '',
  postmarkKey: process.env.POSTMARK_API_KEY || '',
  from: process.env.EMAIL_FROM || 'MirrorSpread <brief@careeros.local>',
  replyTo: process.env.EMAIL_REPLY_TO || '',
  appUrl: process.env.APP_URL || 'http://127.0.0.1:4173',
  unsubscribeSecret: process.env.EMAIL_UNSUB_SECRET || 'dev-unsubscribe-secret',
};

function provider() {
  if (CONFIG.resendKey) return 'resend';
  if (CONFIG.postmarkKey) return 'postmark';
  return 'outbox';
}

function status() {
  const p = provider();
  return {
    provider: p,
    live: p !== 'outbox',
    from: CONFIG.from,
    note: p === 'outbox'
      ? 'No email provider configured. Messages are composed and stored in the outbox – you can read exactly what would have been sent, nothing is lost.'
      : `Sending through ${p}.`,
    missing: p === 'outbox' ? ['RESEND_API_KEY or POSTMARK_API_KEY'] : [],
  };
}

// ---- preferences ----
function prefsFor(userId) {
  let row = db.prepare('SELECT * FROM email_prefs WHERE user_id=?').get(userId);
  if (!row) {
    db.prepare('INSERT INTO email_prefs (user_id) VALUES (?)').run(userId);
    row = db.prepare('SELECT * FROM email_prefs WHERE user_id=?').get(userId);
  }
  return row;
}

function setPrefs(userId, patch) {
  prefsFor(userId);
  const allowed = ['daily_brief', 'opportunity_alerts', 'weekly_digest', 'marketing', 'timezone', 'send_hour'];
  const fields = [];
  const values = [];
  for (const k of allowed) {
    if (patch[k] !== undefined) {
      fields.push(`${k}=?`);
      values.push(k === 'timezone' ? String(patch[k]) : k === 'send_hour' ? Number(patch[k]) : (patch[k] ? 1 : 0));
    }
  }
  if (fields.length) {
    db.prepare(`UPDATE email_prefs SET ${fields.join(',')}, updated_at=datetime('now') WHERE user_id=?`).run(...values, userId);
  }
  return prefsFor(userId);
}

function unsubscribeToken(userId) {
  return crypto.createHmac('sha256', CONFIG.unsubscribeSecret).update(String(userId)).digest('hex').slice(0, 24);
}

function verifyUnsubscribe(userId, token) {
  return unsubscribeToken(userId) === token;
}

// ---- queue ----
function enqueue({ userId = null, leadId = null, to, kind, subject, text, html, scheduledFor = null }) {
  const id = crypto.randomUUID();
  db.prepare(`INSERT INTO email_queue (id,user_id,lead_id,to_email,kind,subject,body_text,body_html,scheduled_for)
    VALUES (?,?,?,?,?,?,?,?,COALESCE(?,datetime('now')))`)
    .run(id, userId, leadId, to, kind, subject, text || null, html || null, scheduledFor);
  return id;
}

async function deliver(row) {
  const p = provider();
  if (p === 'outbox') {
    db.prepare("UPDATE email_queue SET status='outbox', provider='outbox', sent_at=datetime('now') WHERE id=?").run(row.id);
    return { ok: true, mode: 'outbox' };
  }
  try {
    if (p === 'resend') {
      const res = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: { Authorization: `Bearer ${CONFIG.resendKey}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ from: CONFIG.from, to: [row.to_email], subject: row.subject, text: row.body_text, html: row.body_html || undefined, reply_to: CONFIG.replyTo || undefined }),
        signal: AbortSignal.timeout(20000),
      });
      const j = await res.json();
      if (!res.ok) throw new Error(j?.message || `resend ${res.status}`);
      db.prepare("UPDATE email_queue SET status='sent', provider='resend', provider_id=?, sent_at=datetime('now') WHERE id=?").run(j.id || null, row.id);
      return { ok: true, mode: 'resend', id: j.id };
    }
    if (p === 'postmark') {
      const res = await fetch('https://api.postmarkapp.com/email', {
        method: 'POST',
        headers: { 'X-Postmark-Server-Token': CONFIG.postmarkKey, 'Content-Type': 'application/json' },
        body: JSON.stringify({ From: CONFIG.from, To: row.to_email, Subject: row.subject, TextBody: row.body_text, HtmlBody: row.body_html || undefined, MessageStream: 'outbound' }),
        signal: AbortSignal.timeout(20000),
      });
      const j = await res.json();
      if (!res.ok) throw new Error(j?.Message || `postmark ${res.status}`);
      db.prepare("UPDATE email_queue SET status='sent', provider='postmark', provider_id=?, sent_at=datetime('now') WHERE id=?").run(j.MessageID || null, row.id);
      return { ok: true, mode: 'postmark', id: j.MessageID };
    }
  } catch (e) {
    db.prepare("UPDATE email_queue SET status='failed', error=? WHERE id=?").run(String(e.message || e), row.id);
    return { ok: false, error: String(e.message || e) };
  }
  return { ok: false, error: 'unknown provider' };
}

async function flush(limit = 25) {
  const rows = db.prepare("SELECT * FROM email_queue WHERE status='queued' AND scheduled_for <= datetime('now') ORDER BY scheduled_for LIMIT ?").all(limit);
  const results = [];
  for (const row of rows) results.push({ id: row.id, kind: row.kind, ...(await deliver(row)) });
  return { attempted: rows.length, results };
}

// ---- composition ----
const money = (n) => new Intl.NumberFormat('en-GB', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(n);

function briefEmail({ user, brief, rates, scores, prefs }) {
  const unsub = `${CONFIG.appUrl}/unsubscribe/${user.id}/${unsubscribeToken(user.id)}`;
  const name = (user.name || 'there').split(' ')[0];
  const lines = [];
  lines.push(`${brief.headline}`);
  lines.push('');
  if (rates && rates.gapPct != null && rates.gapPct > 5) {
    lines.push(`Your market position: ${rates.gapPct}% below the median for your profile (${money(rates.p50)}${rates.period === 'hour' ? '/hr' : '/yr'}). That is ${money(Math.abs(rates.gapAbs))} a year.`);
    lines.push('');
  }
  if (brief.actions && brief.actions.length) {
    lines.push('Do these, in this order:');
    brief.actions.forEach((a, i) => lines.push(`${i + 1}. ${a.text}`));
    lines.push('');
  }
  if (brief.newHighMatch && brief.newHighMatch.length) {
    lines.push('New at your bar:');
    brief.newHighMatch.slice(0, 4).forEach((o) => lines.push(`· ${o.title} at ${o.company} – ${o.match_score}/100, ${o.interview_probability}% interview odds`));
    lines.push('');
  }
  if (scores) {
    lines.push(`Career Score: ${scores.overall}/100 (${scores.benchmark_percentile}th percentile). Weakest: ${lowestScore(scores)}.`);
    lines.push('');
  }
  lines.push(`Open your radar: ${CONFIG.appUrl}/?app=1`);
  lines.push('');
  lines.push(`– MirrorSpread, a product of ZyraFlow GmbH™
You get this because you asked for the daily brief. Unsubscribe: ${unsub}`);

  const text = `Good morning ${name},\n\n${lines.join('\n')}`;
  const html = renderHtml({ name, brief, rates, scores, unsub });
  return {
    subject: brief.counts.newSinceYesterday > 0
      ? `${brief.counts.newSinceYesterday} new opportunit${brief.counts.newSinceYesterday === 1 ? 'y' : 'ies'} for you`
      : `Your brief: ${rates && rates.gapPct > 5 ? `${rates.gapPct}% below market` : `${brief.counts.totalScored} opportunities scored`}`,
    text,
    html,
  };
}

function lowestScore(s) {
  const pairs = [['employability', s.employability], ['interview readiness', s.interview_readiness], ['market demand', s.market_demand], ['salary potential', s.salary_potential], ['future growth', s.future_growth], ['momentum', s.career_momentum]];
  pairs.sort((a, b) => a[1] - b[1]);
  return `${pairs[0][0]} at ${pairs[0][1]}`;
}

function renderHtml({ name, brief, rates, scores, unsub }) {
  const row = (label, value) => `<tr><td style="padding:6px 0;color:#6b7683;font-size:13px">${label}</td><td style="padding:6px 0;text-align:right;font-size:13px;font-weight:600">${value}</td></tr>`;
  return `<!doctype html><html><body style="margin:0;background:#0b0d10;padding:28px 0;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Inter,sans-serif;color:#e8edf4">
  <div style="max-width:560px;margin:0 auto;background:#12161c;border:1px solid #222a35;border-radius:14px;overflow:hidden">
    <div style="padding:22px 24px;border-bottom:1px solid #222a35">
      <div style="font-size:11px;letter-spacing:.14em;text-transform:uppercase;color:#4c8dff;font-weight:700">MirrorSpread · Morning brief</div>
      <div style="font-size:10.5px;color:#6b7683;margin-top:4px">See your value. Expand your possibilities.</div>
      <div style="font-size:20px;font-weight:700;letter-spacing:-.02em;margin-top:8px;line-height:1.35">${escHtml(brief.headline)}</div>
    </div>
    <div style="padding:22px 24px">
      <p style="margin:0 0 16px;font-size:14px;color:#9aa7b8">Good morning ${escHtml(name)}.</p>
      ${rates && rates.gapPct != null ? `<div style="background:#161b24;border:1px solid #2f2a4d;border-radius:10px;padding:14px 16px;margin-bottom:18px">
        <div style="font-size:11px;letter-spacing:.1em;text-transform:uppercase;color:#a99bf0">Your market position</div>
        <div style="font-size:22px;font-weight:750;margin-top:4px;color:${rates.gapPct > 5 ? '#ff8f96' : '#6fe3a4'}">${rates.gapPct > 0 ? rates.gapPct + '% below market' : Math.abs(rates.gapPct) + '% above market'}</div>
        <div style="font-size:12.5px;color:#9aa7b8;margin-top:4px">Median ${money(rates.p50)}${rates.period === 'hour' ? '/hr' : '/yr'}${rates.gapAbs > 0 ? ` · ${money(rates.gapAbs)}/yr on the table` : ''}</div>
      </div>` : ''}
      ${brief.actions && brief.actions.length ? `<div style="margin-bottom:18px">
        <div style="font-size:11px;letter-spacing:.1em;text-transform:uppercase;color:#6b7683;margin-bottom:8px">Do these, in this order</div>
        ${brief.actions.map((a, i) => `<div style="padding:9px 0;border-bottom:1px solid #222a35;font-size:13.5px"><span style="color:#6b7683;margin-right:8px">${i + 1}</span>${escHtml(a.text)}</div>`).join('')}
      </div>` : ''}
      ${brief.newHighMatch && brief.newHighMatch.length ? `<div style="margin-bottom:18px">
        <div style="font-size:11px;letter-spacing:.1em;text-transform:uppercase;color:#6b7683;margin-bottom:8px">New at your bar</div>
        ${brief.newHighMatch.slice(0, 4).map((o) => `<div style="padding:9px 0;border-bottom:1px solid #222a35;font-size:13px">
          <b>${escHtml(o.title)}</b> <span style="color:#6b7683">at ${escHtml(o.company)}</span>
          <div style="color:#9aa7b8;font-size:12px;margin-top:2px">${o.match_score}/100 match · ${o.interview_probability}% interview odds</div>
        </div>`).join('')}
      </div>` : ''}
      ${scores ? `<table style="width:100%;border-collapse:collapse;margin-bottom:18px">${row('Career Score', scores.overall + '/100')}${row('Percentile', 'p' + scores.benchmark_percentile)}${row('Weakest', escHtml(lowestScore(scores)))}</table>` : ''}
      <a href="${CONFIG.appUrl}/?app=1" style="display:block;text-align:center;background:#1f6feb;color:#fff;text-decoration:none;padding:13px;border-radius:10px;font-size:14px;font-weight:600">Open your radar</a>
    </div>
    <div style="padding:16px 24px;border-top:1px solid #222a35;font-size:11px;color:#6b7683">
      You get this because you turned on the daily brief.
      <a href="${unsub}" style="color:#6b7683">Unsubscribe</a> · <a href="${CONFIG.appUrl}/?app=1" style="color:#6b7683">Manage preferences</a>
      <div style="margin-top:8px;opacity:.7">© 2026 ZyraFlow GmbH™. All rights reserved.</div>
    </div>
  </div>
</body></html>`;
}

function escHtml(s) {
  return String(s == null ? '' : s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
}

function alertEmail({ user, opportunity, rates }) {
  const unsub = `${CONFIG.appUrl}/unsubscribe/${user.id}/${unsubscribeToken(user.id)}`;
  const text = `A ${opportunity.match_score}/100 match just appeared.\n\n${opportunity.title} at ${opportunity.company}\n${opportunity.city || ''} ${opportunity.country || ''}\n${opportunity.interview_probability}% interview odds, ${opportunity.offer_probability}% offer odds\n${opportunity.comp_min ? `${money(opportunity.comp_min)}${opportunity.period === 'hour' ? '/hr' : '/yr'}\n` : ''}\nSee it: ${CONFIG.appUrl}/?app=1\n\nUnsubscribe: ${unsub}`;
  return {
    subject: `${opportunity.match_score}/100 match: ${opportunity.title} at ${opportunity.company}`,
    text,
    html: `<div style="font-family:-apple-system,sans-serif;background:#0b0d10;color:#e8edf4;padding:24px">
      <div style="max-width:520px;margin:0 auto;background:#12161c;border:1px solid #222a35;border-radius:12px;padding:22px">
        <div style="font-size:11px;letter-spacing:.12em;text-transform:uppercase;color:#4c8dff;font-weight:700">New high match</div>
        <div style="font-size:19px;font-weight:700;margin-top:8px">${escHtml(opportunity.title)}</div>
        <div style="color:#9aa7b8;font-size:13px;margin-top:3px">${escHtml(opportunity.company)} · ${escHtml(opportunity.city || '')} ${escHtml(opportunity.country || '')}</div>
        <div style="margin-top:14px;font-size:13px;color:#9aa7b8">${opportunity.match_score}/100 match · ${opportunity.interview_probability}% interview odds</div>
        <a href="${CONFIG.appUrl}/?app=1" style="display:block;text-align:center;background:#1f6feb;color:#fff;text-decoration:none;padding:12px;border-radius:9px;font-size:13.5px;font-weight:600;margin-top:16px">See it</a>
        <div style="font-size:11px;color:#6b7683;margin-top:14px"><a href="${unsub}" style="color:#6b7683">Unsubscribe from alerts</a></div>
      </div></div>`,
  };
}

function leadReportEmail({ lead }) {
  const gap = lead.gap_pct;
  const text = `Your market value report\n\nRole: ${lead.role}\nExperience: ${lead.years} years\n${lead.current_salary ? `You report: ${money(lead.current_salary)}\n` : ''}Market median for your profile: ${money(lead.median)}\n${gap != null ? `${gap > 0 ? `You are ${gap}% below market${lead.gap_abs ? ` – about ${money(Math.abs(lead.gap_abs))} a year` : ''}.` : `You are ${Math.abs(gap)}% above market.`}\n` : ''}\nNext step: build your Career Twin and see the opportunities that pay this.\n${CONFIG.appUrl}\n\nUnsubscribe: ${CONFIG.appUrl}/unsubscribe/lead/${lead.id}`;
  return {
    subject: gap > 10 ? `You are ${gap}% below market – here's your report` : 'Your market value report',
    text,
    html: `<div style="font-family:-apple-system,sans-serif;background:#0b0d10;color:#e8edf4;padding:24px">
      <div style="max-width:520px;margin:0 auto;background:#12161c;border:1px solid #222a35;border-radius:12px;padding:24px">
        <div style="font-size:11px;letter-spacing:.12em;text-transform:uppercase;color:#4c8dff;font-weight:700">Your market value report</div>
        <div style="font-size:26px;font-weight:750;margin-top:10px;color:${gap > 10 ? '#ff8f96' : '#6fe3a4'}">${gap != null ? (gap > 0 ? `${gap}% below market` : `${Math.abs(gap)}% above market`) : 'Market value'}</div>
        <table style="width:100%;border-collapse:collapse;margin-top:16px">
          <tr><td style="padding:6px 0;color:#6b7683;font-size:13px">Role</td><td style="text-align:right;font-size:13px;font-weight:600">${escHtml(lead.role || '–')}</td></tr>
          <tr><td style="padding:6px 0;color:#6b7683;font-size:13px">Experience</td><td style="text-align:right;font-size:13px;font-weight:600">${lead.years || '—'} years</td></tr>
          ${lead.current_salary ? `<tr><td style="padding:6px 0;color:#6b7683;font-size:13px">You report</td><td style="text-align:right;font-size:13px;font-weight:600">${money(lead.current_salary)}</td></tr>` : ''}
          <tr><td style="padding:6px 0;color:#6b7683;font-size:13px">Market median</td><td style="text-align:right;font-size:13px;font-weight:600">${money(lead.median)}</td></tr>
        </table>
        <a href="${CONFIG.appUrl}/?app=1" style="display:block;text-align:center;background:#1f6feb;color:#fff;text-decoration:none;padding:13px;border-radius:10px;font-size:14px;font-weight:600;margin-top:18px">Build your Career Twin</a>
        <div style="font-size:11px;color:#6b7683;margin-top:14px"><a href="${CONFIG.appUrl}/unsubscribe/lead/${lead.id}" style="color:#6b7683">Unsubscribe</a></div>
      </div></div>`,
  };
}

module.exports = {
  CONFIG, provider, status, prefsFor, setPrefs, enqueue, deliver, flush,
  briefEmail, alertEmail, leadReportEmail, unsubscribeToken, verifyUnsubscribe, money,
};
