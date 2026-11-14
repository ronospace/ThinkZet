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

// ---------- Remotive (global remote, salary stated as text) ----------
// Pay arrives as free text such as "OTE $25k - $35k", "$50-$75 /hour" or "$3.5k-$5k/month", so it is parsed into a
// number, a currency and a period. Anything that does not parse cleanly is left without pay rather than guessed.
function parsePayText(text) {
  if (!text || typeof text !== 'string') return null;
  const t = text.replace(/\s+/g, ' ').trim();
  const cur = /£/.test(t) ? 'GBP' : /€/.test(t) ? 'EUR' : /CHF/.test(t) ? 'CHF' : /CAD|CA\$/.test(t) ? 'CAD' : 'USD';
  const nums = [...t.matchAll(/(\d+(?:\.\d+)?)\s*([kK])?/g)].map((m) => Number(m[1]) * (m[2] ? 1000 : 1));
  if (!nums.length) return null;
  let period = 'year';
  if (/\/\s*(hr|hour)|per hour|hourly/i.test(t)) period = 'hour';
  else if (/\/\s*(mo|month)|per month|monthly/i.test(t)) period = 'month';
  else if (/\/\s*day|per day|daily/i.test(t)) period = 'day';
  const min = Math.min(...nums);
  const max = Math.max(...nums);
  // A yearly figure under 1000 is a mis-parse, not a salary.
  if (period === 'year' && max < 1000) return null;
  return { currency: cur, compMin: min, compMax: max, compPeriod: period };
}

async function remotive() {
  const j = await getJSON('https://remotive.com/api/remote-jobs');
  const rows = Array.isArray(j.jobs) ? j.jobs : [];
  return rows.map((r) => {
    const pay = parsePayText(r.salary);
    return {
      externalId: String(r.id),
      title: r.title,
      company: r.company_name,
      description: strip(r.description).slice(0, 2000),
      city: 'Remote',
      country: 'WW',
      remote: true,
      tags: r.tags || [],
      jobTypes: r.job_type ? [r.job_type] : [],
      url: r.url,
      postedAt: r.publication_date || new Date().toISOString(),
      currency: pay ? pay.currency : null,
      compMin: pay ? pay.compMin : null,
      compMax: pay ? pay.compMax : null,
      compPeriod: pay ? pay.compPeriod : null,
    };
  });
}

// ---------- Adzuna (credentialed: DE, GB, CH, US, and every other country it covers) ----------
// Adzuna answers 401 without an app id and key. Both live in the environment, so the day the
// credential arrives this adapter starts returning rows with no code change: the source list is
// built from ADAPTERS, and an adapter whose keys are absent is simply not registered.
const ADZUNA_COUNTRIES = (process.env.ADZUNA_COUNTRIES || 'de,gb,ch,us').split(',').map((c) => c.trim().toLowerCase()).filter(Boolean);

function adzunaConfigured() {
  return !!(process.env.ADZUNA_APP_ID && process.env.ADZUNA_APP_KEY);
}

async function adzunaCountry(cc) {
  const id = process.env.ADZUNA_APP_ID;
  const key = process.env.ADZUNA_APP_KEY;
  if (!id || !key) throw new Error('adzuna needs ADZUNA_APP_ID and ADZUNA_APP_KEY');
  const url = `https://api.adzuna.com/v1/api/jobs/${cc}/search/1?app_id=${encodeURIComponent(id)}&app_key=${encodeURIComponent(key)}`
    + '&results_per_page=50&content-type=application/json&what=' + encodeURIComponent(process.env.ADZUNA_WHAT || '');
  const j = await getJSON(url);
  const rows = Array.isArray(j.results) ? j.results : [];
  return rows.map((r) => {
    const pay = parsePayText([r.salary_min ? `${r.salary_min}` : '', r.salary_max ? `${r.salary_max}` : '', r.salary_is_predicted === '1' ? '' : ''].join(' ').trim());
    return {
      externalId: `adzuna-${cc}-${r.id}`,
      title: r.title || '',
      company: (r.company && r.company.display_name) || '',
      description: strip(r.description).slice(0, 2000),
      city: (r.location && r.location.area && r.location.area[3]) || (r.location && r.location.display_name) || '',
      country: cc.toUpperCase(),
      remote: /remote/i.test(`${r.title || ''} ${r.description || ''}`),
      tags: [...(r.category ? [r.category.label] : []), ...((r.category && r.category.tag) || '')].filter(Boolean),
      jobTypes: r.contract_time ? [r.contract_time] : [],
      url: r.redirect_url || '',
      postedAt: r.created || new Date().toISOString(),
      currency: pay ? pay.currency : (r.salary_min ? 'EUR' : null),
      compMin: r.salary_min || (pay ? pay.compMin : null),
      compMax: r.salary_max || (pay ? pay.compMax : null),
      compPeriod: pay ? pay.compPeriod : (r.salary_min ? 'year' : null),
    };
  });
}

async function adzuna() {
  const out = [];
  const failures = [];
  for (const cc of ADZUNA_COUNTRIES) {
    try { out.push(...(await adzunaCountry(cc))); } catch (e) { failures.push(`${cc}:${e.message}`); }
  }
  if (!out.length && failures.length) throw new Error('adzuna ' + failures.join(' '));
  return out;
}

// ---------- We Work Remotely (RSS, salary parsed from the listing text) ----------
async function weworkremotely() {
  const xml = await getJSON; // placeholder to keep the linter quiet about unused imports
  void xml;
  const res = await fetch('https://weworkremotely.com/categories/remote-programming-jobs.rss', { headers: { 'user-agent': 'ThinkZet/1.0' } });
  if (!res.ok) throw new Error('weworkremotely ' + res.status);
  const text = await res.text();
  const items = text.split('<item>').slice(1);
  return items.map((it, i) => {
    const pick = (tag) => {
      const m = it.match(new RegExp('<' + tag + '>([\\s\\S]*?)</' + tag + '>'));
      return m ? m[1].replace(/<!\[CDATA\[|\]\]>/g, '').trim() : '';
    };
    const rawTitle = pick('title');
    const company = rawTitle.includes(':') ? rawTitle.split(':')[0].trim() : '';
    const title = rawTitle.includes(':') ? rawTitle.split(':').slice(1).join(':').trim() : rawTitle;
    const link = pick('link');
    const body = strip(pick('description')).slice(0, 2000);
    const pay = parsePayText((body.match(/(?:salary|pay|compensation)[^.]{0,80}/i) || [])[0] || '');
    return {
      externalId: link || 'wwr-' + i,
      title,
      company,
      description: body,
      city: 'Remote',
      country: 'WW',
      remote: true,
      tags: [],
      jobTypes: [],
      url: link,
      postedAt: pick('pubDate') ? new Date(pick('pubDate')).toISOString() : new Date().toISOString(),
      currency: pay ? pay.currency : null,
      compMin: pay ? pay.compMin : null,
      compMax: pay ? pay.compMax : null,
      compPeriod: pay ? pay.compPeriod : null,
    };
  });
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
  remotive: { fn: remotive, quality: 0.6, label: 'Remotive', note: 'Global remote, pay stated as text and parsed' },
  weworkremotely: { fn: weworkremotely, quality: 0.58, label: 'We Work Remotely', note: 'Global remote RSS, pay parsed from the listing' },
};

// A credentialed adapter is registered only when its credential is present, so a missing key can
// never turn into a failing source in the ingest log, and adding the key is the whole change.
if (adzunaConfigured()) {
  ADAPTERS.adzuna = { fn: adzuna, quality: 0.82, label: 'Adzuna', note: `Credentialed, ${ADZUNA_COUNTRIES.join('/').toUpperCase()} salary-dense` };
}

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

module.exports = { ADAPTERS, fetchSource, fetchAll, getJSON, strip, adzunaConfigured };
