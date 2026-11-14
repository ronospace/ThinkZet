// Operator console. This file is served only to a founder session and is never referenced by the
// consumer application: index.html does not load it, does not define these functions, and its
// markup carries no link to this page. The helpers below mirror the consumer ones by name and by
// output so the same screen reads the same way in both places.
'use strict';
const $ = (s, r = document) => r.querySelector(s);
const api = async (p, opt) => { const r = await fetch(p, opt); return r.json(); };
const post = (p, b) => api(p, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(b || {}) });
const esc = (v) => String(v == null ? '' : v).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const int = (n) => (n == null || n === '' || Number.isNaN(Number(n)) ? '0' : Number(n).toLocaleString('en-GB'));
const money = (n, c) => { if (n == null || Number.isNaN(Number(n))) return 'Not disclosed'; try { return new Intl.NumberFormat('en-GB', { style: 'currency', currency: c || 'EUR', maximumFractionDigits: 0 }).format(Number(n)); } catch (e) { return int(n) + ' ' + (c || ''); } };
const pct = (n, d) => (n == null || Number.isNaN(Number(n)) ? '0%' : Number(n).toFixed(d == null ? 0 : d) + '%');
const score = (n) => (n == null ? '0' : String(Math.round(Number(n))));
const titleCase = (s) => String(s || '').replace(/[_-]+/g, ' ').replace(/\b[a-z]/g, (m) => m.toUpperCase());
const STATE = { founder: true };
const TYPE_LABEL = { job: 'Jobs', contract: 'Contracts', fellowship: 'Fellowships', grant: 'Grants', accelerator: 'Accelerators', cofounder: 'Co-founder', research: 'Research', hackathon: 'Hackathons', speaking: 'Speaking', mentorship: 'Mentorship' };
let toastTimer = null;
function toast(msg) {
  const t = document.getElementById('toast'); if (!t) return;
  t.textContent = msg; t.classList.add('on');
  clearTimeout(toastTimer); toastTimer = setTimeout(() => t.classList.remove('on'), 2400);
}
function go(view) { location.hash = view; }

async function renderEmail() {
  const [st, prefs, outbox, seq] = await Promise.all([api('/api/email/status'), api('/api/email/prefs'), api('/api/email/outbox'), api('/api/email/sequence')]);
  const toggle = (key, label, hint) => `<div class="kv"><span>${label}<div class="muted" style="font-size:var(--text-xs)">${hint}</div></span>
    <span><button class="chip tg" data-k="${key}" style="cursor:pointer;${prefs[key] ? 'border-color:var(--good);color:var(--good)' : ''}">${prefs[key] ? 'on' : 'off'}</button></span></div>`;
  $('#view').innerHTML = `
    <div class="card" style="margin-bottom:14px">
      <div class="row" style="justify-content:space-between;flex-wrap:wrap;gap:8px">
        <div><h3 style="margin:0">Delivery</h3><div class="dim" style="font-size:var(--text-sm);margin-top:4px">${esc(st.status.note)}</div></div>
        <span class="chip ${st.status.live ? 'have' : ''}">${esc(st.status.provider)}</span>
      </div>
      <div class="row" style="margin-top:14px;gap:8px;flex-wrap:wrap">
        <button class="btn sm" id="e-brief">Compose my brief now</button>
        <button class="btn sm ghost" id="e-broadcast">Queue for everyone</button>
        <button class="btn sm ghost" id="e-flush">Flush queue</button>
      </div>
    </div>

    <div class="grid" style="grid-template-columns:1fr 1.4fr">
      <div class="card">
        <h3>What You Receive</h3>
        <div style="margin-top:10px">
          ${toggle('daily_brief', 'Daily brief', 'One email a day. What changed, and what to do.')}
          ${toggle('opportunity_alerts', 'High-match alerts', 'Only for 85+ matches. Rare by design.')}
          ${toggle('weekly_digest', 'Weekly digest', 'The week in your market.')}
          ${toggle('marketing', 'Product updates', 'Off by default.')}
        </div>
        <div class="note" style="margin-top:12px">Every email carries a one-click unsubscribe. Unsubscribing is a preference, not a lost user – the app keeps working.</div>
      </div>
      <div class="card" style="margin-top:14px">
        <h3>Signup Sequence</h3>
        <div class="dim" style="font-size:var(--text-sm);margin-top:6px">Four emails over seven days, scheduled automatically when someone builds their twin. Each one is written from that person's own numbers.</div>
        <div style="margin-top:10px">${(() => {
          // Scheduled instances of the same email are one row with a count, not the same title four times.
          const list = seq.queued.length ? seq.queued : seq.steps.map((x) => ({ subject: x.subject, scheduled_for: 'day ' + x.day }));
          const groups = [];
          for (const q of list) {
            const g = groups.find((x) => x.subject === q.subject);
            if (g) g.count += 1; else groups.push({ subject: q.subject, count: 1, when: String(q.scheduled_for || '').slice(0, 10) });
          }
          return groups.map((g) => `<div class="kv"><span>${esc(g.subject)}${g.count > 1 ? ` <span class="chip" style="margin-left:6px">×${g.count}</span>` : ''}</span><span class="muted mono" style="font-size:var(--text-xs)">${esc(g.when)}</span></div>`).join('');
        })()}</div>
      </div>
      <div class="card">
        <h3>Outbox (${int(outbox.messages.length)})</h3>
        <div style="margin-top:10px;max-height:420px;overflow:auto">
          ${outbox.messages.length ? outbox.messages.map((m) => `<div style="padding:10px 0;border-bottom:1px solid var(--line)">
            <div class="row" style="justify-content:space-between"><span style="font-size:var(--text-sm);font-weight:550">${esc(m.subject)}</span><span class="chip ${m.status === 'sent' ? 'have' : ''}">${esc(m.status)}</span></div>
            <div class="muted" style="font-size:var(--text-xs);margin-top:2px">${esc(m.to_email)} · ${esc(titleCase(m.kind))} · ${m.sent_at ? new Date(m.sent_at).toLocaleString('en-GB') : 'queued'}</div>
          </div>`).join('') : '<div class="muted">Nothing composed yet.</div>'}
        </div>
      </div>
    </div>`;
  document.querySelectorAll('.tg').forEach((b) => {
    b.onclick = async () => {
      const next = !prefs[b.dataset.k];
      await post('/api/email/prefs', { [b.dataset.k]: next });
      renderEmail();
    };
  });
  $('#e-brief').onclick = async () => {
    const r = await post('/api/email/brief', {});
    if (r.error) return toast(r.error);
    toast('Composed: ' + r.subject);
    renderEmail();
  };
  $('#e-broadcast').onclick = async () => {
    const r = await post('/api/email/broadcast', {});
    toast(`${r.queued} briefs queued`);
    renderEmail();
  };
  $('#e-flush').onclick = async () => {
    const r = await post('/api/email/flush', {});
    toast(`${r.attempted} attempted`);
    renderEmail();
  };
}

async function renderLeads() {
  const d = await api('/api/leads');
  const fb = await api('/api/feedback').catch(() => ({ total: 0, average: null, distribution: [], recent: [] }));
  const st = d.stats;
  const nextLead = [...(d.leads || [])]
    .filter((l) => !l.converted_user_id)
    .sort((a, b) => (b.gap_pct || 0) - (a.gap_pct || 0))[0] || null;
  $('#view').innerHTML = `
    <div class="grid" style="grid-template-columns:repeat(4,1fr)">
      <div class="card"><h3>Leads Captured</h3><div class="big mono">${st.total}</div><div class="muted" style="font-size:var(--text-xs)">from the free check</div></div>
      <div class="card"><h3>Converted to Accounts</h3><div class="big mono">${st.converted}</div><div class="muted" style="font-size:var(--text-xs)">${st.conversionRate}% conversion</div></div>
      <div class="card"><h3>Underpaid &gt;10%</h3><div class="big mono">${st.withGap}</div><div class="muted" style="font-size:var(--text-xs)">highest-intent segment</div></div>
      <div class="card"><h3>Shares Created</h3><div class="big mono">${st.shares}</div><div class="muted" style="font-size:var(--text-xs)">${st.shareViews} views</div></div>
    </div>
    ${nextLead ? `<div class="card tone-blue" style="margin-top:14px">
      <div class="kpi-k">Contact next</div>
      <div class="row" style="justify-content:space-between;align-items:flex-start;gap:16px;margin-top:6px;flex-wrap:wrap">
        <div style="min-width:240px">
          <div style="font-size:var(--text-lg);font-weight:680;letter-spacing:var(--tracking-tight)">${esc(nextLead.role || 'Unknown role')}</div>
          <div class="muted" style="font-size:var(--text-sm);margin-top:3px">${esc(nextLead.email)}${nextLead.country ? ' · ' + esc(nextLead.country) : ''}${nextLead.years ? ' · ' + nextLead.years + ' yrs' : ''}</div>
        </div>
        <div class="row" style="gap:22px;align-items:flex-end">
          <div><div class="kpi-k">Gap</div><div class="big mono" style="color:var(--bad)">+${Math.round(nextLead.gap_pct)}%</div></div>
          <div><div class="kpi-k">Median</div><div class="big mono">${money(nextLead.median)}</div></div>
          <div><div class="kpi-k">State</div><div class="prio p2" style="margin-top:4px">${nextLead.converted_user_id ? 'Account' : 'Not converted'}</div></div>
        </div>
      </div>
      <div class="row" style="margin-top:14px;gap:8px"><button class="btn sm" id="lead-mail">Email this lead</button><button class="btn sm ghost" onclick="go('email')">Open Email</button></div>
    </div>` : ''}
    <div class="card" style="margin-top:14px">
      <h3>Leads</h3>
      <table class="t" style="margin-top:8px">
        <thead><tr><th>Email</th><th>Role</th><th>Yrs</th><th>Country</th><th>Paid</th><th>Gap</th><th>Median</th><th>State</th><th>When</th></tr></thead>
        <tbody>
    ${d.leads.length ? d.leads.map((l) => `<tr>
          <td>${esc(l.email)}</td>
          <td>${esc(l.role || '–')}</td>
          <td class="mono">${l.years ?? '–'}</td>
          <td class="mono">${esc(l.country || '–')}</td>
          <td class="mono">${l.current_salary ? money(l.current_salary) : '–'}</td>
          <td class="mono" style="color:${l.gap_pct > 10 ? 'var(--bad)' : l.gap_pct > 0 ? 'var(--warn)' : 'var(--good)'}">${l.gap_pct != null ? (l.gap_pct > 0 ? '+' : '') + l.gap_pct + '%' : '–'}</td>
          <td class="mono">${l.median ? money(l.median) : '–'}</td>
          <td>${l.converted_user_id ? '<span class="chip have">account</span>' : '<span class="chip">lead</span>'}</td>
          <td class="muted" style="font-size:var(--text-xs)">${new Date(l.created_at).toLocaleDateString('en-GB')}</td>
        </tr>`).join('') : '<tr><td colspan="9" class="muted">No leads yet. Run the free check on the landing page.</td></tr>'}
        </tbody>
      </table>
    </div>
    ${fb.total ? `<div class="card" style="margin-top:14px">
      <div class="row" style="justify-content:space-between;align-items:baseline">
        <div><h3 style="display:inline;margin:0">Feedback</h3> <span class="muted">${fb.total} rating${fb.total === 1 ? '' : 's'} · average ${fb.average}</span></div>
        <div class="muted" style="font-size:var(--text-xs)">${fb.distribution.map((x) => x.rating + '★ ' + x.n).join(' · ')}</div>
      </div>
      ${fb.recent.filter((r) => r.comment).slice(0, 5).map((r) => `<div style="margin-top:8px;font-size:var(--text-sm)"><b>${r.rating}★</b> <span class="muted">${esc(r.surface)} · ${esc(r.created_at)}</span><div>${esc(r.comment)}</div></div>`).join('')}
    </div>` : ''}
    <div class="card" style="margin-top:14px">
      <h3>What to Do With This</h3>
      <div class="dim" style="font-size:var(--text-sm);margin-top:8px">A lead with a gap above 10% is the highest-intent person in the system: they have seen a number, they believe it, and they have not yet acted. That is the list to email first – not the whole database.</div>
    </div>`;
  const mailBtn = document.getElementById('lead-mail');
  if (mailBtn && nextLead) {
    mailBtn.onclick = () => { STATE.leadToMail = nextLead.email; toast('Opening Email for ' + nextLead.email); go('email'); };
  }
}

async function renderLaunch() {
  const l = await api('/api/launch');
  const blocking = l.checks.filter((c) => c.blocking && !c.ok);
  const envFile = 'app/' + '.env';
  $('#view').innerHTML = `
    <div class="card" style="border-color:${l.ready ? 'var(--good)' : 'var(--bad)'};background:${l.ready ? 'linear-gradient(135deg,color-mix(in srgb,var(--good) 10%,var(--panel)),var(--panel))' : 'linear-gradient(135deg,color-mix(in srgb,var(--bad) 10%,var(--panel)),var(--panel))'}">
      <div class="muted" style="font-size:var(--text-2xs);letter-spacing:.14em;text-transform:uppercase">Launch readiness</div>
      <div style="font-size:clamp(18px,3vw,26px);font-weight:720;letter-spacing:-.02em;margin-top:10px;color:${l.ready ? 'var(--good)' : 'var(--bad)'}">${esc(l.verdict)}</div>
    </div>
    <div class="card" style="margin-top:14px">
      ${l.checks.map((c) => `<div style="display:flex;gap:12px;align-items:flex-start;padding:11px 0;border-bottom:1px solid var(--line)">
        <div style="width:16px;text-align:center;font-size:var(--text-sm);color:${c.ok ? 'var(--good)' : c.blocking ? 'var(--bad)' : 'var(--warn)'}">${c.ok ? '✓' : c.blocking ? '✕' : '!'}</div>
        <div style="flex:1">
          <div style="font-size:var(--text-sm);font-weight:550">${esc(c.label)}${c.blocking ? '' : ' <span class="muted" style="font-size:var(--text-2xs);font-weight:400">(not blocking)</span>'}</div>
          <div class="muted" style="font-size:var(--text-sm);margin-top:2px">${esc(c.detail)}</div>
        </div>
      </div>`).join('')}
    </div>
    ${blocking.length ? `<div class="card" style="margin-top:14px">
      <h3>To Get to Zero Blockers</h3>
      <div style="margin-top:10px;font-size:var(--text-sm);line-height:1.9">
        ${blocking.map((b) => {
          if (b.key === 'email') return '<div><b>Email:</b> add <span class="mono">RESEND_API_KEY</span> to <span class="mono">' + envFile + '</span> and restart.</div>';
          if (b.key === 'app_url') return '<div><b>Public URL:</b> deploy (see <span class="mono">app/DEPLOY.md</span>), then set <span class="mono">APP_URL</span> to the real domain.</div>';
          if (b.key === 'legal') return '<div><b>Legal:</b> publish privacy and terms pages.</div>';
          if (b.key === 'inventory' || b.key === 'sources') return '<div><b>Data:</b> run an ingest – the corpus is too thin to launch on.</div>';
          return `<div><b>${esc(b.label)}:</b> ${esc(b.detail)}</div>`;
        }).join('')}
      </div>
    </div>` : `<div class="card" style="margin-top:14px"><h3>Send It to Twenty People</h3>
      <div class="dim" style="font-size:var(--text-sm);margin-top:6px">Not to get customers. To find out whether the rate gap lands the way we think it does. Watch the Funnel screen for the first twenty; the biggest leak it names is what to fix next.</div></div>`}
    <div class="card" style="margin-top:14px">
      <h3>What to Watch in the First Week</h3>
      <div class="dim" style="font-size:var(--text-sm);margin-top:8px;line-height:1.9">
        <div>· <b>Rate checks completed</b> – the landing funnel working at all.</div>
        <div>· <b>Lead capture rate</b> – of people who saw a number, how many gave an email.</div>
        <div>· <b>First opportunity opened</b> – the moment the product becomes a tool rather than a report.</div>
        <div>· <b>Funnel biggest leak</b> – fix that, ignore everything else.</div>
      </div>
    </div>`;
}

async function renderAnalytics() {
  const a = await api('/api/analytics?days=30');
  const f = a.funnel;
  const maxN = Math.max(...f.steps.map((s) => s.events), 1);
  const daily = a.summary.daily || [];
  const maxDay = Math.max(...daily.map((d) => d.n), 1);
  $('#view').innerHTML = `
    <div class="card plain" style="border-color:var(--line);">
      <div class="muted" style="font-size:var(--text-2xs);letter-spacing:.14em;text-transform:uppercase">Funnel · last ${f.windowDays} days · measured from real events</div>
      <div class="stmt">${esc(f.verdict)}</div>
      <div class="row" style="margin-top:14px;gap:24px">
        <div><div class="big sm mono">${f.overallConversion}%</div><div class="muted" style="font-size:var(--text-xs)">visit &gt; paid</div></div>
        <div><div class="big sm mono">${a.summary.total}</div><div class="muted" style="font-size:var(--text-xs)">events recorded</div></div>
      </div>
    </div>

    <h2 class="section">Step by Step</h2>
    <div class="card">
      ${f.steps.map((s, i) => `<div style="padding:10px 0;border-bottom:1px solid var(--line)">
        <div class="row" style="justify-content:space-between">
          <div><span class="mono muted" style="margin-right:10px">${i + 1}</span><b style="font-size:var(--text-sm)">${esc(s.label)}</b><span class="muted" style="font-size:var(--text-xs);margin-left:8px">${esc(s.meaning)}</span></div>
          <div class="row" style="gap:14px">
            <span class="mono">${s.events}</span>
            ${s.conversionFromPrevious != null ? `<span class="mono" style="font-size:var(--text-xs);color:${s.conversionFromPrevious < 30 ? 'var(--bad)' : s.conversionFromPrevious < 60 ? 'var(--warn)' : 'var(--good)'}">${s.conversionFromPrevious}%</span>` : '<span class="muted" style="font-size:var(--text-xs)">–</span>'}
          </div>
        </div>
        <div class="bar" style="margin-top:6px"><i style="width:${Math.round((s.events / maxN) * 100)}%"></i></div>
      </div>`).join('')}
    </div>

    <div class="grid" style="grid-template-columns:1.4fr 1fr;margin-top:14px">
      <div class="card">
        <h3>Events per Day</h3>
        <div style="display:flex;align-items:flex-end;gap:4px;height:120px;margin-top:14px">
          ${daily.length ? daily.map((d) => `<div style="flex:1;display:flex;flex-direction:column;justify-content:flex-end;align-items:center" title="${d.d}: ${d.n}">
            <div style="width:100%;background:linear-gradient(180deg,var(--accent),var(--accent2));border-radius:3px 3px 0 0;height:${Math.max(3, Math.round((d.n / maxDay) * 100))}%"></div>
          </div>`).join('') : '<div class="muted">no events yet</div>'}
        </div>
        <div class="muted" style="font-size:var(--text-xs);margin-top:8px">${int(daily.length)} active day${daily.length === 1 ? '' : 's'} in the last 14</div>
      </div>
      <div class="card">
        <h3>Top Events</h3>
        <div style="margin-top:10px">${a.summary.byName.slice(0, 10).map((e) => `<div class="kv"><span>${esc(e.name)}</span><span class="mono">${e.n}</span></div>`).join('') || '<div class="muted">none yet</div>'}</div>
      </div>
    </div>

    `;
}

async function renderReferrals() {
  const r = await api('/api/referrals');
  const catLabel = { ai_marketplace: 'AI marketplaces', freelance: 'Freelance', learning: 'Learning', immigration: 'Immigration', relocation: 'Relocation' };
  $('#view').innerHTML = `
    <div class="card plain" style="margin-bottom:14px">
      <h3>How Partners Work Here</h3>
      <div class="facts">
        <span class="fk">The rule</span>
        <span class="fv">${esc(r.note)}</span>
        <span class="fk">What you see</span>
        <span class="fv">A partner appears only next to a skill gap the engine already found, or when you have said you would relocate. Nothing here can create, reorder or raise an opportunity.</span>
      </div>
    </div>
    ${STATE.founder ? `<div class="card" style="margin-bottom:14px">
      <h3>Partner Routing</h3>
      <div class="dim" style="font-size:var(--text-sm);margin-top:6px">Operator controls. Only the founder sees this form.</div>
      <div class="row" style="margin-top:14px;gap:8px;flex-wrap:wrap">
        <input id="p-name" placeholder="Partner name" style="background:var(--panel2);border:1px solid var(--line);border-radius:8px;padding:7px 10px;outline:none;font-size:var(--text-sm)"/>
        <input id="p-template" placeholder="Your referral URL – use {code} for the tracking token" style="flex:1;min-width:280px;background:var(--panel2);border:1px solid var(--line);border-radius:8px;padding:7px 10px;outline:none;font-size:var(--text-sm)"/>
        <input id="p-amount" placeholder="€ payout" style="width:100px;background:var(--panel2);border:1px solid var(--line);border-radius:8px;padding:7px 10px;outline:none;font-size:var(--text-sm)"/>
        <button class="btn sm" id="p-add">Add partner</button>
      </div>
      <div class="note" style="margin-top:10px">Paste your own affiliate link here when you have it. The engine appends a tracking token and routes through <span class="mono">/go/&lt;code&gt;</span> so clicks and conversions are attributed – without ever touching what gets recommended.</div>
    </div>` : ''}
    <div class="grid" style="grid-template-columns:repeat(2,1fr)">
      ${r.programs.map((p) => `<div class="card">
        <div class="row" style="justify-content:space-between">
          <div><b style="font-size:var(--text-base)">${esc(p.name)}</b><div class="muted" style="font-size:var(--text-xs)">${esc(catLabel[p.category] || p.category)}</div></div>
          <span class="bdg ${p.active ? 'mom' : 'neu'}">${p.active ? 'Active' : 'Paused'}</span>
        </div>
        ${r.operator ? `<div class="kv" style="margin-top:10px"><span>Model</span><span class="mono">${esc(titleCase(p.payout_model))}</span></div>
        <div class="kv"><span>Payout</span><span class="mono">${p.payout_amount ? money(p.payout_amount) : 'rev share'}</span></div>
        <div class="kv"><span>Clicks routed</span><span class="mono">${int(p.clicks)}</span></div>
        <div class="muted" style="font-size:var(--text-xs);margin-top:8px;word-break:break-all">${esc(p.template || '–')}</div>`
        : `<div class="muted" style="font-size:var(--text-sm);margin-top:8px">Attached to a gap the engine already found. It cannot change a score.</div>`}
      </div>`).join('')}
    </div>`;
  if ($('#p-add')) $('#p-add').onclick = async () => {
    const name = $('#p-name').value.trim();
    const template = $('#p-template').value.trim();
    if (!name || !template) return toast('Name and URL required');
    const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, '-');
    await post('/api/referrals', { name, slug, template, payoutAmount: Number($('#p-amount').value || 0), category: 'other' });
    toast('Partner added');
    renderReferrals();
  };
}

async function renderOps() {
  const o = await api('/api/ops');
  const live = await api('/api/ingest');
  const lc = await api('/api/opportunities/lifecycle');
  const last = live.last;
  $('#view').innerHTML = `
    <h2 class="section section-ico" data-ico="pulse">Live Ingestion</h2>
    <div class="grid" style="grid-template-columns:repeat(4,1fr)">
      <div class="card"><h3>Live Opportunities</h3><div class="big mono">${int(live.liveTotal)}</div><div class="muted" style="font-size:var(--text-xs)">from real APIs</div></div>
      <div class="card"><h3>Last Run Kept</h3><div class="big mono">${last ? int(last.kept) : '–'}</div><div class="muted" style="font-size:var(--text-xs)">${last ? last.droppedNonTech + ' non-tech dropped' : ''}</div></div>
      <div class="card"><h3>New This Run</h3><div class="big mono">${last ? int(last.inserted) : '–'}</div><div class="muted" style="font-size:var(--text-xs)">${last ? last.merged + ' merged into existing' : ''}</div></div>
      <div class="card"><h3>Run Time</h3><div class="big mono">${last ? last.ms + 'ms' : '–'}</div><div class="muted" style="font-size:var(--text-xs)">${last ? new Date(last.at).toLocaleString('en-GB') : ''}</div></div>
    </div>
    <div class="grid" style="grid-template-columns:1fr 1fr;margin-top:14px">
      <div class="card"><h3>Source Health</h3>
        <table class="t" style="margin-top:8px"><thead><tr><th>Adapter</th><th>Status</th><th>Rows</th><th>Latency</th></tr></thead><tbody>
        ${(last ? last.report : live.adapters.map((a) => ({ key: a.key, ok: null, count: 0, ms: 0 }))).map((r) => `<tr>
          <td>${esc(r.label || r.key)}<div class="muted" style="font-size:var(--text-xs)">${esc((live.adapters.find((a) => a.key === r.key) || {}).note || '')}</div></td>
          <td>${r.ok === null ? '<span class="muted">not run</span>' : r.ok ? '<span style="color:var(--good)">● ok</span>' : `<span style="color:var(--bad)">● ${esc(r.error || 'fail')}</span>`}</td>
          <td class="mono">${int(r.count)}</td><td class="mono">${r.ms}ms</td></tr>`).join('')}
        </tbody></table>
        <div class="facts tight" style="margin-top:12px">
          <span class="fk">Adapters registered</span><span class="fv">${int(live.adapters.length)}, each derived from the source list rather than typed out.</span>
          <span class="fk">Failure</span><span class="fv">A broken source degrades to zero rows and reports. It never takes the pipeline down.</span>
        </div>
      </div>
      <div class="card"><h3>What the Pipeline Did</h3>
        <div class="kv"><span>Fetched from APIs</span><span class="mono">${int(last ? last.fetched : 0)}</span></div>
        <div class="kv"><span>Kept as relevant tech roles</span><span class="mono">${int(last ? last.kept : 0)}</span></div>
        <div class="kv"><span>Dropped as non-target (internships, sales, trades)</span><span class="mono">${int(last ? last.droppedNonTech : 0)}</span></div>
        <div class="kv"><span>Inserted as new canonical opportunities</span><span class="mono">${int(last ? last.inserted : 0)}</span></div>
        <div class="kv"><span>Merged as duplicates of existing</span><span class="mono">${int(last ? last.merged : 0)}</span></div>
        <div class="kv"><span>Duplicate rate</span><span class="mono">${last ? pct(last.duplicateRate, 1) : '–'}</span></div>
        <div class="facts tight" style="margin-top:12px">
          <span class="fk">Classification</span><span class="fv">Deterministic. A title must contain core tech vocabulary, must not be an internship, trade or sales role, then maps to one role family by signal priority.</span>
        </div>
      </div>
    </div>
    <h2 class="section section-ico" data-ico="heart">Listing Health</h2>
    <div class="grid" style="grid-template-columns:repeat(4,1fr)">
      <div class="card"><h3>Live Opportunities</h3><div class="big mono">${int(lc.total)}</div><div class="muted" style="font-size:var(--text-xs)">${int(lc.fresh7)} posted this week</div></div>
      <div class="card"><h3>Feed Health</h3><div class="big mono">${lc.health}%</div><div class="muted" style="font-size:var(--text-xs)">after removing ghosts</div></div>
      <div class="card"><h3>Ghost Listings Filtered</h3><div class="big mono">${int(lc.ghost)}</div><div class="muted" style="font-size:var(--text-xs)">no comp + thin description</div></div>
      <div class="card"><h3>Stale (&gt;60 days)</h3><div class="big mono">${int(lc.stale)}</div><div class="muted" style="font-size:var(--text-xs)">deprioritised in ranking</div></div>
    </div>
    <div class="card" style="margin-top:14px"><div class="dim" style="font-size:var(--text-sm)">${esc(lc.note)}</div></div>
    <h2 class="section section-ico" data-ico="stack">Corpus</h2>
    <div class="grid" style="grid-template-columns:repeat(4,1fr)">
      <div class="card"><h3>Raw Listings Ingested</h3><div class="big mono">${int(o.ingest.raw)}</div></div>
      <div class="card"><h3>Canonical Opportunities</h3><div class="big mono">${int(o.totalOpportunities)}</div></div>
      <div class="card"><h3>Duplicates Merged</h3><div class="big mono">${int(o.ingest.merged)}</div><div class="muted" style="font-size:var(--text-xs)">${o.ingest.duplicateRate == null ? 'Not measured on this run' : pct(o.ingest.duplicateRate, 1) + ' of raw'}</div></div>
      <div class="card"><h3>Salary Records</h3><div class="big mono">${int(o.salaryRecords)}</div></div>
    </div>
    <div class="grid" style="grid-template-columns:1fr 1fr;margin-top:14px">
      <div class="card"><h3>Ingestion by Source</h3>
        <table class="t" style="margin-top:8px"><thead><tr><th>Source</th><th>Listings</th><th>Quality</th></tr></thead><tbody>
        ${o.bySource.map((s) => `<tr><td>${esc(s.source)}</td><td class="mono">${int(s.n)}</td><td class="mono">${Math.round(s.q * 100)}</td></tr>`).join('')}
        </tbody></table>
      </div>
      <div class="card"><h3>Opportunity Types</h3>
        <table class="t" style="margin-top:8px"><thead><tr><th>Type</th><th>Count</th></tr></thead><tbody>
        ${o.byType.map((s) => `<tr><td>${TYPE_LABEL[s.type] || esc(s.type)}</td><td class="mono">${int(s.n)}</td></tr>`).join('')}
        </tbody></table>
      </div>
    </div>
    <div class="card" style="margin-top:14px">
      <h3>Pipeline Honesty</h3>
      <div class="kv"><span>Average listings merged into one opportunity</span><span class="mono">${o.avgSourcesPerOpportunity == null ? '–' : Number(o.avgSourcesPerOpportunity).toFixed(1)}</span></div>
      <div class="kv"><span>Opportunities seen on more than one board</span><span class="mono">${int(o.multiSourced)}</span></div>
      <div class="kv"><span>Listings with no disclosed compensation</span><span class="mono">${int(o.missingComp)}</span></div>
      <div class="kv"><span>Ingestion time</span><span class="mono">${int(o.ingest.ms)} ms</span></div>
      <div class="facts tight" style="margin-top:12px">
        <span class="fk">Deduplication</span>
        <span class="fv">Title similarity (Jaccard on normalised tokens) plus company, city and compensation bucket, merged above a 0.72 threshold, with survivor rules that keep the widest comp range and richest description.</span>
      </div>
    </div>`;
}
