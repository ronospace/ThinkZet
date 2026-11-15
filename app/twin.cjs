// The Career Twin, described for the person it belongs to.
//
// Everything here is derived from rows the person already owns. Nothing is invented: a field that was
// never filled is reported as missing, not estimated, and a field whose origin we do not know says so.
//
// Two rules decide the shape of this file:
//   1. Completeness is a sum of named items with visible weights. The weights are printed to the person,
//      so the percentage can always be reconciled by hand (RULES 14: a number is written for a reader).
//   2. A field's source is recorded, never guessed. 'cv', 'manual', 'account', 'inferred' or 'review',
//      and an absent record reads as 'unknown', which is honest rather than flattering.
'use strict';

// ---------------------------------------------------------------------------
// Weights. These are the whole completeness model: the percentage on the page is the sum of the
// weights of the items that are present, divided by the sum of all weights. Nothing else contributes.
// Keep this list ordered as a person would complete a profile, because the checklist uses this order.
// ---------------------------------------------------------------------------
const ITEMS = [
  { key: 'role', label: 'Add your primary role', weight: 12, view: 'twin', section: 'identity' },
  { key: 'seniority', label: 'Confirm your seniority', weight: 10, view: 'twin', section: 'identity' },
  { key: 'years', label: 'Add your years of experience', weight: 10, view: 'twin', section: 'identity' },
  { key: 'headline', label: 'Write a headline', weight: 8, view: 'twin', section: 'identity' },
  { key: 'skills', label: 'Add at least five skills', weight: 14, view: 'twin', section: 'skills' },
  { key: 'countries', label: 'Add target countries', weight: 8, view: 'twin', section: 'preferences' },
  { key: 'remote', label: 'Set a work arrangement', weight: 5, view: 'twin', section: 'preferences' },
  { key: 'roles', label: 'Add desired roles', weight: 7, view: 'twin', section: 'preferences' },
  { key: 'current', label: 'Add current compensation', weight: 10, view: 'twin', section: 'compensation' },
  { key: 'target', label: 'Add target compensation', weight: 10, view: 'twin', section: 'compensation' },
  { key: 'cv', label: 'Upload or review your CV', weight: 6, view: 'twin', section: 'sources' },
];
const TOTAL_WEIGHT = ITEMS.reduce((a, i) => a + i.weight, 0);

// The confidence ladder the person sees. Names, not scores: "High-Confidence Twin" is a claim about
// evidence, and each rung states what produced it so it can be argued with.
const LEVELS = [
  { key: 'start', name: 'Getting started', note: 'We know your role. Everything else is still open.' },
  { key: 'basic', name: 'Basic profile', note: 'Enough to price your role and score opportunities.' },
  { key: 'growing', name: 'Growing personal signal', note: 'Your preferences and pay are narrowing the market to you.' },
  { key: 'well', name: 'Well personalised', note: 'Your own outcomes are now part of what we predict with.' },
];

const SOURCE_LABEL = {
  cv: 'From your CV',
  manual: 'You entered this',
  account: 'From your account',
  inferred: 'Inferred by ThinkZet',
  review: 'Needs review',
  unknown: 'Source not recorded',
};

const SENIORITY_RANK = { intern: 1, junior: 2, mid: 3, senior: 4, staff: 5, lead: 5, principal: 6, manager: 5, director: 7, vp: 8, head: 6, exec: 9 };

function parse(json, fallback) {
  try { const v = JSON.parse(json); return v == null ? fallback : v; } catch { return fallback; }
}

// Which fields are present, in the person's own data. A field holding 0 is not "missing" for
// compensation only when 0 is a real answer; it never is, so 0 reads as not provided.
function presence(profile, skills, cv) {
  const p = profile || {};
  const hasNum = (v) => v != null && Number(v) > 0;
  const countries = parse(p.target_countries, []);
  const roles = parse(p.desired_roles, []);
  return {
    role: !!(p.current_role || p.headline),
    seniority: !!p.seniority,
    years: hasNum(p.years_experience),
    headline: !!(p.headline && String(p.headline).trim().length > 2),
    skills: skills.length >= 5,
    countries: Array.isArray(countries) && countries.length > 0,
    remote: !!(p.remote_preference && p.remote_preference !== 'any') || !!p.willing_to_relocate,
    roles: Array.isArray(roles) && roles.length > 0,
    current: hasNum(p.current_rate),
    target: hasNum(p.target_rate_min),
    cv: !!cv,
  };
}

function completeness(profile, skills, cv) {
  const have = presence(profile, skills, cv);
  const earned = ITEMS.filter((i) => have[i.key]).reduce((a, i) => a + i.weight, 0);
  const missing = ITEMS.filter((i) => !have[i.key]).map((i) => ({
    key: i.key, label: i.label, weight: i.weight, view: i.view, section: i.section,
  }));
  return {
    percent: Math.round((earned / TOTAL_WEIGHT) * 100),
    earned,
    total: TOTAL_WEIGHT,
    missing,
    complete: missing.length === 0,
  };
}

// A source is recorded per field. A profile that predates source recording has none, and says so
// rather than claiming the value was typed by hand.
function sources(profile, skills) {
  const rec = parse(profile && profile.field_sources, {}) || {};
  const out = {};
  for (const key of ['headline', 'current_role', 'seniority', 'years_experience', 'current_rate', 'target_rate_min', 'remote_preference', 'target_countries']) {
    const v = rec[key];
    out[key] = v && SOURCE_LABEL[v] ? v : 'unknown';
  }
  const bySource = {};
  for (const s of skills) bySource[s.source || 'unknown'] = (bySource[s.source || 'unknown'] || 0) + 1;
  return { fields: out, skills: bySource };
}

// Contradictions worth a calm question. Never a silent correction: the person's own value stands
// until they change it, and the prompt only says the two numbers disagree.
function conflicts(profile, skills) {
  const p = profile || {};
  const out = [];
  const rank = SENIORITY_RANK[String(p.seniority || '').toLowerCase()];
  const years = Number(p.years_experience);
  if (rank >= 4 && years > 0 && years <= 2) {
    out.push({
      key: 'seniority_years',
      title: 'Seniority and years of experience may need review',
      body: `Your seniority says ${String(p.seniority).replace(/^\w/, (c) => c.toUpperCase())}, and your years of experience say ${years}. Both can be true - a fast promotion, a career change, contract work - so nothing has been changed. Confirm them and your matches get sharper.`,
      fix: 'identity',
    });
  }
  const salary = Number(p.current_rate);
  const target = Number(p.target_rate_min);
  if (salary > 0 && target > 0 && p.rate_unit === 'year' && target < salary * 0.7) {
    out.push({
      key: 'target_below_current',
      title: 'Your target is below your current pay',
      body: 'A target lower than what you earn now is a valid choice, and it changes what we recommend. Confirm which figure you meant.',
      fix: 'compensation',
    });
  }
  if (salary > 0 && !p.rate_currency) {
    out.push({ key: 'currency_missing', title: 'Your pay has no currency', body: 'Add the currency your pay is in, so the comparison is against the right market.', fix: 'compensation' });
  }
  if (skills.some((s) => s.source === 'inferred' || s.source === 'review')) {
    out.push({
      key: 'skills_review',
      title: 'Some skills need your confirmation',
      body: 'These came from your experience rather than from you. Confirm the ones you would defend in an interview and remove the rest.',
      fix: 'skills',
    });
  }
  return out;
}

function personalisation(profile, skills, outcomeCount, appCount) {
  const c = completeness(profile, skills, !!(profile && profile.resume_text));
  let level = 0;
  if (c.percent >= 35) level = 1;
  if (c.percent >= 65) level = 2;
  if (c.percent >= 85 && outcomeCount > 0) level = 3;
  const next = c.missing[0];
  return {
    level,
    name: LEVELS[level].name,
    note: LEVELS[level].note,
    percent: c.percent,
    next: next ? { key: next.key, label: next.label } : null,
    // Said plainly, because a score that cannot explain itself is a score nobody should trust.
    basis: outcomeCount > 0
      ? `Built from your profile and ${outcomeCount} outcome${outcomeCount === 1 ? '' : 's'} you reported.`
      : 'Built from your profile. Outcomes you report will sharpen it.',
    tracked: appCount,
    outcomes: outcomeCount,
  };
}

module.exports = { ITEMS, TOTAL_WEIGHT, LEVELS, SOURCE_LABEL, completeness, sources, conflicts, personalisation, presence, SENIORITY_RANK };
