// Ingestion pipeline: normalise → deduplicate → quality gate → canonical records.
// This is the part every aggregator dies on. It runs for real here.
'use strict';
const { db } = require('./db.cjs');
const { makeOpportunities, CURRENCY_RATES } = require('./corpus.cjs');
const { resolveSkill } = require('./taxonomy.cjs');
const { classifyFamily, classifySeniority, normaliseLocation, detectSponsorship, extractComp, extractSkills } = require('./classify.cjs');
const sources = require('./sources.cjs');

const normTitle = (t) => String(t || '').toLowerCase()
  .replace(/\((remote|hybrid|onsite)\)/g, '')
  .replace(/\b(senior|sr\.?|junior|jr\.?|staff|lead|principal|ii|iii|i)\b/g, '')
  .replace(/[^a-z0-9 ]/g, ' ').replace(/\s+/g, ' ').trim();

const normCity = (c) => String(c || '').toLowerCase().replace(/\(.*\)/g, '').trim();

function jaccard(a, b) {
  const A = new Set(a), B = new Set(b);
  if (!A.size || !B.size) return 0;
  let inter = 0;
  for (const x of A) if (B.has(x)) inter++;
  return inter / (A.size + B.size - inter);
}

function compBucket(min, max, currency, period) {
  if (min == null) return 'na';
  const rate = CURRENCY_RATES[currency] || 1;
  let eurAnnual = ((Number(min) + Number(max || min)) / 2) * rate;
  if (period === 'hour') eurAnnual *= 1600;
  if (period === 'month') eurAnnual *= 12;
  if (period === 'day') eurAnnual *= 220;
  return String(Math.round(eurAnnual / 20000)); // 20k EUR buckets
}

function similarity(a, b) {
  const titleSim = jaccard(normTitle(a.title).split(' '), normTitle(b.title).split(' '));
  const sameCompany = String(a.company).toLowerCase() === String(b.company).toLowerCase();
  const sameCity = normCity(a.city) === normCity(b.city);
  const skillSim = jaccard(a.skills || [], b.skills || []);
  const compSim = compBucket(a.comp_min, a.comp_max, a.currency, a.comp_period) ===
                  compBucket(b.comp_min, b.comp_max, b.currency, b.comp_period);
  let score = 0.45 * titleSim + 0.2 * skillSim;
  if (sameCompany) score += 0.25;
  if (sameCity) score += 0.1;
  if (compSim) score += 0.05;
  return { score, sameCompany, sameCity };
}

function qualityGate(opp) {
  const issues = [];
  let score = 1;
  if (!opp.comp_min) { score -= 0.22; issues.push('no compensation'); }
  if (!opp.description || opp.description.length < 40) { score -= 0.18; issues.push('thin description'); }
  const ageDays = (Date.now() - new Date(opp.posted_at).getTime()) / 86400000;
  if (ageDays > 60) { score -= 0.35; issues.push('stale (>60d)'); }
  if (opp.visa_sponsorship === 'unknown') { score -= 0.05; }
  if (String(opp.company).toLowerCase() === 'unknown') { score -= 0.1; }
  return { score: Math.max(0.05, Math.min(1, score)), issues, ageDays };
}

function seedIfEmpty() {
  const count = db.prepare('SELECT COUNT(*) AS n FROM opportunities').get().n;
  if (count > 0) return { skipped: true, count };

  const raw = makeOpportunities();
  const t0 = Date.now();

  // Stage 1: normalise skills to the controlled vocabulary + compute content hash
  for (const o of raw) {
    o.skills = Array.from(new Set((o.skills || []).map(resolveSkill).filter(Boolean)));
    const q = qualityGate(o);
    o.quality = q.score;
    o.issues = q.issues;
    o.content_hash = require('node:crypto').createHash('sha1')
      .update(`${String(o.company).toLowerCase()}|${normTitle(o.title)}|${normCity(o.city)}|${compBucket(o.comp_min, o.comp_max, o.currency, o.comp_period)}`)
      .digest('hex').slice(0, 16);
  }

  // Stage 2: deduplicate. Group by dedupe_group, then merge within group by similarity.
  const byGroup = new Map();
  for (const o of raw) {
    const k = o.dedupe_group;
    if (!byGroup.has(k)) byGroup.set(k, []);
    byGroup.get(k).push(o);
  }

  const canonical = [];
  let mergedCount = 0;
  for (const [, group] of byGroup) {
    const clusters = [];
    for (const o of group) {
      let placed = false;
      for (const c of clusters) {
        const sim = similarity(c.lead, o);
        if (sim.score >= 0.72) {
          c.members.push(o);
          // Survivor rules: widest comp range, richest description, earliest first-seen, best source quality
          if ((o.comp_max || 0) > (c.lead.comp_max || 0)) { c.lead.comp_min = o.comp_min ?? c.lead.comp_min; c.lead.comp_max = o.comp_max ?? c.lead.comp_max; c.lead.currency = o.currency || c.lead.currency; c.lead.comp_period = o.comp_period || c.lead.comp_period; }
          if ((o.description || '').length > (c.lead.description || '').length) c.lead.description = o.description;
          if (new Date(o.posted_at) < new Date(c.lead.posted_at)) c.lead.posted_at = o.posted_at;
          if (o.source_quality > c.lead.source_quality) { c.lead.source_quality = o.source_quality; c.lead.apply_url = o.apply_url; c.lead.source = o.source; }
          if (o.visa_sponsorship === 'yes') c.lead.visa_sponsorship = 'yes';
          c.lead.skills = Array.from(new Set([...c.lead.skills, ...o.skills]));
          placed = true;
          break;
        }
      }
      if (!placed) clusters.push({ lead: { ...o }, members: [o] });
    }
    for (const c of clusters) {
      c.lead.source_count = c.members.length;
      c.lead.sources = c.members.map((m) => ({ key: m.source, url: m.apply_url, id: m.id }));
      if (c.members.length > 1) mergedCount += c.members.length - 1;
      canonical.push(c.lead);
    }
  }

  const insOpp = db.prepare(`INSERT INTO opportunities
    (id,type,title,company,role_family,seniority,remote_type,city,country,comp_min,comp_max,currency,comp_period,
     visa_sponsorship,skills,description,apply_url,source,source_count,source_quality,posted_at,closes_at,status,
     content_hash,dedupe_group)
    VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`);
  const insSrc = db.prepare(`INSERT OR IGNORE INTO opportunity_sources (opportunity_id,source_key,external_id,source_url) VALUES (?,?,?,?)`);

  db.exec('BEGIN');
  for (const o of canonical) {
    insOpp.run(o.id, o.type, o.title, o.company, o.role_family, o.seniority, o.remote_type, o.city, o.country,
      o.comp_min, o.comp_max, o.currency, o.comp_period, o.visa_sponsorship, JSON.stringify(o.skills),
      o.description, o.apply_url, o.source, o.source_count, o.source_quality, o.posted_at, o.closes_at, 'open',
      o.content_hash, o.dedupe_group);
    for (const s of o.sources || [{ key: o.source, url: o.apply_url, id: o.id }]) {
      insSrc.run(o.id, s.key, s.id, s.url);
    }
  }

  // Salary records from every posting with comp (the raw material for rate intelligence)
  const insSal = db.prepare(`INSERT INTO salary_records
    (role_family,seniority,country,city,remote,channel,skills,amount,currency,period,source,sample_size,verified,observed_at)
    VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?)`);
  for (const o of canonical) {
    if (o.comp_min == null) continue;
    const amount = (Number(o.comp_min) + Number(o.comp_max || o.comp_min)) / 2;
    const remote = o.remote_type === 'remote' ? 1 : 0;
    insSal.run(o.role_family, o.seniority, o.country, o.city, remote, o.channel || 'fulltime',
      JSON.stringify(o.skills), amount, o.currency, o.comp_period, o.source, 1, 0, o.posted_at);
  }
  db.exec('COMMIT');

  // Skill market stats
  const skillRows = db.prepare('SELECT id, canonical, demand_index, salary_premium, growth_rate, is_emerging FROM skills').all();
  const stat = db.prepare('UPDATE skills SET demand_index=?, salary_premium=?, growth_rate=? WHERE id=?');
  for (const s of skillRows) {
    const n = db.prepare('SELECT COUNT(*) AS n FROM opportunities WHERE skills LIKE ?').get(`%"${s.canonical}"%`).n;
    const idx = Math.round(20 + Math.min(120, n * 2.2) + (s.demand_index || 50) * 0.35);
    stat.run(idx, s.salary_premium, s.growth_rate, s.id);
  }

  return {
    skipped: false,
    raw: raw.length,
    canonical: canonical.length,
    merged: mergedCount,
    duplicateRate: Number(((mergedCount / raw.length) * 100).toFixed(1)),
    ms: Date.now() - t0,
  };
}

// ---------- live ingestion ----------
function normaliseLive(row, sourceKey, quality) {
  const fam = classifyFamily(row.title, row.tags, row.description);
  const seniority = classifySeniority(row.title, row.level, row.description);
  const loc = normaliseLocation(row.city, row.description);
  const comp = row.compMin ? { currency: row.currency || 'EUR', min: row.compMin, max: row.compMax || row.compMin, period: row.compPeriod || 'year' }
    : extractComp(`${row.title} ${row.description}`);
  const skills = extractSkills(row.title, row.description, row.tags);
  const type = /contract|freelance|contractor/i.test((row.jobTypes || []).join(' ') + ' ' + row.title) ? 'contract' : 'job';
  const postedAt = row.postedAt && !isNaN(new Date(row.postedAt)) ? new Date(row.postedAt).toISOString() : new Date().toISOString();
  return {
    id: `${sourceKey}:${row.externalId}`,
    type,
    title: row.title,
    company: row.company || 'Unknown',
    role_family: fam,
    seniority,
    remote_type: row.remote || loc.remote ? 'remote' : 'onsite',
    city: row.city || (loc.remote ? 'Remote' : 'Unknown'),
    country: row.country || loc.country || 'WW',
    comp_min: comp ? comp.min : null,
    comp_max: comp ? comp.max : null,
    currency: comp ? comp.currency : null,
    comp_period: comp ? comp.period : 'year',
    visa_sponsorship: detectSponsorship(row.description),
    skills,
    description: row.description || '',
    apply_url: row.url,
    source: sourceKey,
    source_quality: quality,
    channel: type === 'contract' ? 'freelance' : 'fulltime',
    posted_at: postedAt,
    closes_at: null,
    dedupe_group: `${String(row.company || 'unknown').toLowerCase()}|${normTitle(row.title)}|${normCity(row.city)}`,
    live: true,
  };
}

async function ingestLive({ keys, pages } = {}) {
  const started = Date.now();
  const results = await sources.fetchAll(keys);
  const report = results.map((r) => ({ key: r.key, label: r.label, ok: r.ok, count: r.count, ms: r.ms, error: r.error || null }));

  const raw = [];
  for (const r of results) {
    if (!r.ok) continue;
    for (const row of r.rows) {
      try { raw.push(normaliseLive(row, r.key, r.quality)); } catch { /* one bad row must not kill the batch */ }
    }
  }

  // classify: keep everything, but flag non-tech so the feed can exclude it by default
  const tech = raw.filter((o) => o.role_family !== 'non_tech');
  const dropped = raw.length - tech.length;

  // dedupe against existing DB records by (company,title,city) group + similarity
  const existing = db.prepare("SELECT id, title, company, city, comp_min, comp_max, currency, comp_period, skills, source_count, dedupe_group FROM opportunities WHERE status='open'").all()
    .map((e) => ({ ...e, skills: JSON.parse(e.skills || '[]') }));

  const byGroup = new Map();
  for (const e of existing) {
    if (!byGroup.has(e.dedupe_group)) byGroup.set(e.dedupe_group, []);
    byGroup.get(e.dedupe_group).push(e);
  }

  const insOpp = db.prepare(`INSERT INTO opportunities
    (id,type,title,company,role_family,seniority,remote_type,city,country,comp_min,comp_max,currency,comp_period,
     visa_sponsorship,skills,description,apply_url,source,source_count,source_quality,posted_at,closes_at,status,
     content_hash,dedupe_group)
    VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)
    ON CONFLICT(id) DO UPDATE SET last_seen=datetime('now'), description=excluded.description, source_quality=excluded.source_quality`);
  const updOpp = db.prepare(`UPDATE opportunities SET
      comp_min=COALESCE(?,comp_min), comp_max=COALESCE(?,comp_max), currency=COALESCE(?,currency),
      comp_period=COALESCE(?,comp_period), source_count=source_count+1,
      visa_sponsorship=CASE WHEN ?='yes' THEN 'yes' ELSE visa_sponsorship END,
      skills=?, last_seen=datetime('now')
    WHERE id=?`);
  const insSrc = db.prepare('INSERT OR IGNORE INTO opportunity_sources (opportunity_id,source_key,external_id,source_url) VALUES (?,?,?,?)');
  const insSal = db.prepare(`INSERT INTO salary_records
    (role_family,seniority,country,city,remote,channel,skills,amount,currency,period,source,sample_size,verified,observed_at)
    VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?)`);

  let inserted = 0, merged = 0, updated = 0;
  db.exec('BEGIN');
  for (const o of tech) {
    const group = byGroup.get(o.dedupe_group) || [];
    let match = null;
    for (const e of group) {
      const sim = similarity(e, o);
      if (sim.score >= 0.72) { match = e; break; }
    }
    if (match) {
      updOpp.run(o.comp_min, o.comp_max, o.currency, o.comp_period, o.visa_sponsorship,
        JSON.stringify(Array.from(new Set([...match.skills, ...o.skills]))), match.id);
      insSrc.run(match.id, o.source, o.id, o.apply_url);
      merged++;
      if (o.comp_min != null) {
        insSal.run(o.role_family, o.seniority, o.country, o.city, o.remote_type === 'remote' ? 1 : 0, o.channel,
          JSON.stringify(o.skills), (o.comp_min + (o.comp_max || o.comp_min)) / 2, o.currency, o.comp_period, o.source, 1, 0, o.posted_at);
      }
    } else {
      insOpp.run(o.id, o.type, o.title, o.company, o.role_family, o.seniority, o.remote_type, o.city, o.country,
        o.comp_min, o.comp_max, o.currency, o.comp_period, o.visa_sponsorship, JSON.stringify(o.skills),
        o.description, o.apply_url, o.source, 1, o.source_quality, o.posted_at, o.closes_at, 'open',
        null, o.dedupe_group);
      insSrc.run(o.id, o.source, o.id, o.apply_url);
      if (!byGroup.has(o.dedupe_group)) byGroup.set(o.dedupe_group, []);
      byGroup.get(o.dedupe_group).push({ ...o, source_count: 1 });
      inserted++;
      if (o.comp_min != null) {
        insSal.run(o.role_family, o.seniority, o.country, o.city, o.remote_type === 'remote' ? 1 : 0, o.channel,
          JSON.stringify(o.skills), (o.comp_min + (o.comp_max || o.comp_min)) / 2, o.currency, o.comp_period, o.source, 1, 0, o.posted_at);
      }
    }
  }
  db.exec('COMMIT');

  const run = {
    at: new Date().toISOString(),
    ms: Date.now() - started,
    fetched: raw.length,
    kept: tech.length,
    droppedNonTech: dropped,
    inserted, merged, duplicateRate: raw.length ? Number(((merged / raw.length) * 100).toFixed(1)) : 0,
    report,
  };
  db.prepare('INSERT INTO ingestion_runs (payload) VALUES (?)').run(JSON.stringify(run));
  return run;
}

function lastRun() {
  const r = db.prepare('SELECT payload, created_at FROM ingestion_runs ORDER BY id DESC LIMIT 1').get();
  return r ? { ...JSON.parse(r.payload), recordedAt: r.created_at } : null;
}

module.exports = { seedIfEmpty, ingestLive, lastRun, normaliseLive, qualityGate, similarity, normTitle };
