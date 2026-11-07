// Live source adapters. Real HTTP, real pagination, real failure isolation.
// Design rule: a broken source must never take the pipeline down — it degrades and reports.
'use strict';

const UA = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122 Safari/537.36';
const TIMEOUT_MS = 15000;

async function getJSON(url, opts = {}) {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), TIMEOUT_MS);
  try {
    const res = await fetch(url, { headers: { 'User-Agent': UA, Accept: 'application/json', ...(opts.headers || {}) }, signal: ctrl.signal });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return await res.json();
  } finally { clearTimeout(t); }
}

const strip = (html) => String(html || '')
  .replace(/<style[\s\S]*?<\/style>/gi, ' ')
  .replace(/<script[\s\S]*?<\/script>/gi, ' ')
  .replace(/<[^>]+>/g, ' ')
  .replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&')
  .replace(/&#x2F;/gi, '/').replace(/&#x27;/gi, "'").replace(/&quot;/g, '"').replace(/&lt;/g, '<').replace(/&gt;/g, '>')
  .replace(/&#(\d+);/g, (_, d) => String.fromCharCode(Number(d)))
  .replace(/\s+/g, ' ').trim();

// ---------- Arbeitnow (DE/EU, no key, paginated) ----------
async function arbeitnow({ pages = 3 } = {}) {
  const out = [];
  for (let p = 1; p <= pages; p++) {
    const j = await getJSON(`https://www.arbeitnow.com/api/job-board-api?page=${p}`);
    for (const r of j.data || []) {
      out.push({
        externalId: r.slug,
        title: r.title,
        company: r.company_name,
        description: strip(r.description).slice(0, 2000),
        city: r.location || null,
        country: 'DE',
        remote: !!r.remote,
        tags: r.tags || [],
        jobTypes: r.job_types || [],
        url: r.url,
        postedAt: r.created_at ? new Date(r.created_at * 1000).toISOString() : new Date().toISOString(),
        currency: null, compMin: null, compMax: null, compPeriod: null,
      });
    }
  }
  return out;
}

// ---------- RemoteOK (global remote, has salary sometimes) ----------
async function remoteok() {
  const j = await getJSON('https://remoteok.com/api');
  const rows = Array.isArray(j) ? j.filter((x) => x.id) : [];
  return rows.map((r) => ({
    externalId: String(r.id),
    title: r.position,
    company: r.company,
    description: strip(r.description).slice(0, 2000),
    city: r.location || 'Remote',
    country: 'WW',
    remote: true,
    tags: r.tags || [],
    jobTypes: [],
    url: r.url,
    postedAt: r.date || new Date().toISOString(),
    currency: r.salary_min ? 'USD' : null,
    compMin: r.salary_min || null,
    compMax: r.salary_max || null,
    compPeriod: r.salary_min ? 'year' : null,
  }));
}

// ---------- Jobicy (global remote, salary-dense) ----------
async function jobicy({ pages = 2, industries = ['engineering', 'data-science', 'dev'] } = {}) {
  const out = [];
  let cursor = null;
  for (let p = 0; p < pages; p++) {
    const ind = industries[p % industries.length];
    const url = `https://jobicy.com/api/v2/remote-jobs?count=50&industry=${ind}${cursor ? '&cursor=' + encodeURIComponent(cursor) : ''}`;
    let j;
    try { j = await getJSON(url); } catch (e) { continue; }  // one bad industry must not kill the source
    cursor = j.nextCursor;
    for (const r of j.jobs || []) {
      const periodMap = { yearly: 'year', monthly: 'month', hourly: 'hour', daily: 'day' };
      out.push({
        externalId: String(r.id),
        title: r.jobTitle,
        company: r.companyName,
        description: strip(r.jobDescription || r.jobExcerpt).slice(0, 2000),
        city: (r.jobGeo || 'Remote').split(',')[0].trim(),
        country: null,
        remote: true,
        tags: [...(r.jobIndustry || []), ...(r.jobType || [])],
        jobTypes: r.jobType || [],
        url: r.url,
        postedAt: r.pubDate || new Date().toISOString(),
        currency: r.salaryCurrency || null,
        compMin: r.salaryMin || null,
        compMax: r.salaryMax || null,
        compPeriod: r.salaryPeriod ? (periodMap[r.salaryPeriod] || 'year') : null,
      });
    }
    if (!cursor) break;
  }
  return out;
}

// ---------- Hacker News "Who is hiring" (the highest-signal channel in tech) ----------
async function hackernews() {
  // Find the most recent "Ask HN: Who is hiring?" thread via Algolia
  const search = await getJSON('https://hn.algolia.com/api/v1/search_by_date?query=%22Ask%20HN%3A%20Who%20is%20hiring%3F%22&tags=story&hitsPerPage=5');
  const story = (search.hits || []).find((h) => /who is hiring/i.test(h.title));
  if (!story) return [];
  const thread = await getJSON(`https://hn.algolia.com/api/v1/items/${story.objectID}`);
  const comments = (thread.children || []).filter((c) => c.text);
  const out = [];
  for (const c of comments.slice(0, 120)) {
    const text = strip(c.text);
    if (text.length < 60) continue;
    const firstLine = text.split(/(?<=\.)\s/)[0].slice(0, 160);
    // HN convention: "Company | Role | Location | Remote | Salary"
    const parts = firstLine.split('|').map((s) => s.trim()).filter(Boolean);
    if (parts.length < 2) continue;
    const company = parts[0].slice(0, 80);
    const title = parts[1].slice(0, 120);
    const rest = parts.slice(2).join(' | ');
    const remote = /remote/i.test(rest + ' ' + text.slice(0, 300));
    const salary = text.match(/\$?\s?(\d{2,3})\s?[kK]\s?(?:-|–|to)\s?\$?\s?(\d{2,3})\s?[kK]/);
    out.push({
      externalId: String(c.id),
      title, company,
      description: text.slice(0, 2000),
      city: /remote/i.test(rest) ? 'Remote' : (parts[2] || 'Unknown').slice(0, 60),
      country: null,
      remote,
      tags: [],
      jobTypes: [],
      url: `https://news.ycombinator.com/item?id=${c.id}`,
      postedAt: c.created_at || new Date().toISOString(),
      currency: salary ? 'USD' : null,
      compMin: salary ? Number(salary[1]) * 1000 : null,
      compMax: salary ? Number(salary[2]) * 1000 : null,
      compPeriod: salary ? 'year' : null,
    });
  }
  return out;
}

const ADAPTERS = {
  arbeitnow: { fn: arbeitnow, quality: 0.7, label: 'Arbeitnow', note: 'DE/EU board, no key required' },
  remoteok: { fn: remoteok, quality: 0.62, label: 'RemoteOK', note: 'Global remote, salary-dense' },
  jobicy: { fn: jobicy, quality: 0.68, label: 'Jobicy', note: 'Global remote, paginated cursor' },
  hackernews: { fn: hackernews, quality: 0.8, label: 'HN Who is Hiring', note: 'Highest-signal tech channel' },
};

async function fetchSource(key, opts) {
  const a = ADAPTERS[key];
  if (!a) throw new Error('unknown source ' + key);
  const t0 = Date.now();
  try {
    const rows = await a.fn(opts);
    return { key, ok: true, count: rows.length, ms: Date.now() - t0, rows, quality: a.quality, label: a.label };
  } catch (e) {
    return { key, ok: false, count: 0, ms: Date.now() - t0, error: String(e.message || e), quality: a.quality, label: a.label };
  }
}

async function fetchAll(keys = Object.keys(ADAPTERS)) {
  const results = await Promise.all(keys.map((k) => fetchSource(k)));
  return results;
}

module.exports = { ADAPTERS, fetchSource, fetchAll, getJSON, strip };
