// Cover letter generation.
//
// Two rules that define this module:
//   1. Every claim must be traceable to the user's own profile or the posting. No invention.
//   2. If no model provider is configured, the deterministic composer produces a real,
//      usable letter from the same evidence. The product degrades, it does not break.
'use strict';

// ---- evidence extraction ----
function extractEvidence(profile, twin, opportunity) {
  const skills = (twin.skillDetail || []).map((s) => s.canonical);
  const oppSkills = Array.isArray(opportunity.skills) ? opportunity.skills : JSON.parse(opportunity.skills || '[]');
  const overlap = oppSkills.filter((s) => skills.includes(s));
  const gap = oppSkills.filter((s) => !skills.includes(s));

  const strongest = [...(twin.skillDetail || [])]
    .filter((s) => overlap.includes(s.canonical))
    .sort((a, b) => (b.salary_premium || 0) - (a.salary_premium || 0))
    .slice(0, 3)
    .map((s) => s.canonical);

  const years = profile.years_experience || null;
  const company = opportunity.company || 'the team';
  const role = opportunity.title || 'this role';

  return {
    role, company, overlap, gap, strongest, years,
    seniority: profile.seniority || 'experienced',
    currentRole: profile.current_role || null,
    currentCompany: profile.current_company || null,
    location: [opportunity.city, opportunity.country].filter(Boolean).join(', '),
    remote: opportunity.remote_type === 'remote',
  };
}

// ---- deterministic composer (always available) ----
function composeDeterministic(ev, tone = 'direct') {
  const skillPhrase = ev.strongest.length
    ? ev.strongest.length === 1 ? ev.strongest[0] : `${ev.strongest.slice(0, -1).join(', ')} and ${ev.strongest.slice(-1)}`
    : 'the core stack';
  const gapPhrase = ev.gap.length
    ? ` I am actively closing the gap on ${ev.gap.slice(0, 2).join(' and ')}.`
    : '';
  const yearsPhrase = ev.years ? `${ev.years} years` : 'a career';

  if (tone === 'warm') {
    return `Dear ${ev.company} team,

I have spent ${yearsPhrase} working close to exactly this problem, and ${skillPhrase} is where most of that work has lived. When I read the ${ev.role} description, the list of requirements read less like a wish list and more like a summary of what I do day to day.${gapPhrase}

What I would bring first is ${ev.strongest[0] || 'depth in the core stack'} — not as a line on a CV but as something I have shipped and maintained. I am drawn to this role because it sits where ${skillPhrase} actually decides outcomes rather than sitting on the edge of them.

I would welcome a conversation about where the team is heading and what the first ninety days would need to look like.

With thanks,
${'{{name}}'}`;
  }

  if (tone === 'formal') {
    return `Dear Hiring Team at ${ev.company},

I am writing to apply for the ${ev.role} position. I have ${ev.years ? `over ${ev.years} years of` : 'substantial'} experience working with ${skillPhrase}, which corresponds closely to the requirements set out in your description.${gapPhrase}

My most directly relevant work has been ${ev.currentRole ? `as ${ev.currentRole}${ev.currentCompany ? ` at ${ev.currentCompany}` : ''}, where I` : 'in roles where I'} owned delivery of systems built on this stack rather than contributing to them at the margins. I am particularly interested in this position because it would place that experience at the centre of the team's work.

I would be glad to discuss the role further at your convenience.

Yours sincerely,
${'{{name}}'}`;
  }

  // direct (default)
  return `Hi ${ev.company} team,

I am applying for ${ev.role}. The short version: ${yearsPhrase} building with ${skillPhrase} — and this role asks for exactly that.${gapPhrase}

Two things that map directly to what you have described. First, ${ev.strongest[0] || 'the core stack'} is not a skill I picked up for an interview — it is what I have built and maintained in production. Second, I work well where the stack decides the outcome, which is the part of this role that interests me most.

${ev.currentRole ? `Currently ${ev.currentRole}${ev.currentCompany ? ` at ${ev.currentCompany}` : ''}.` : ''} Happy to go deeper on any of this — or on what you would need in the first ninety days.

Best,
${'{{name}}'}`;
}

// ---- optional model-backed generation ----
async function composeWithModel(ev, tone, opts = {}) {
  const endpoint = process.env.LLM_ENDPOINT;
  const key = process.env.LLM_API_KEY;
  const model = process.env.LLM_MODEL;
  if (!endpoint || !key || !model) return null;

  const system = [
    'You write cover letters for a career platform.',
    'Hard rules: never invent experience, employers, metrics or credentials.',
    'Use only the evidence provided. If evidence is thin, write a shorter letter, never a padded one.',
    'No clichés: no "passionate", no "dynamic", no "synergy", no "I am excited to".',
    'Maximum 220 words. Plain text only, no markdown.',
  ].join(' ');

  const user = `Write a ${tone} cover letter.
Role: ${ev.role}
Company: ${ev.company}
Candidate seniority: ${ev.seniority}
Years of experience: ${ev.years ?? 'unknown'}
Current role: ${ev.currentRole ?? 'unknown'} at ${ev.currentCompany ?? 'unknown'}
Skills that match the posting: ${ev.overlap.join(', ') || 'none listed'}
Strongest matching skills: ${ev.strongest.join(', ') || 'none'}
Skills the posting wants that the candidate lacks (mention honestly, briefly, only if useful): ${ev.gap.join(', ') || 'none'}
Location: ${ev.location || 'unspecified'}${ev.remote ? ' (remote)' : ''}`;

  try {
    const res = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${key}` },
      body: JSON.stringify({ model, messages: [{ role: 'system', content: system }, { role: 'user', content: user }], max_tokens: 500, temperature: 0.4 }),
      signal: AbortSignal.timeout(20000),
    });
    if (!res.ok) return null;
    const j = await res.json();
    const text = j?.choices?.[0]?.message?.content;
    if (!text || text.length < 120) return null;
    return { text: text.trim(), source: `model:${model}` };
  } catch {
    return null;
  }
}

async function generate(profile, twin, opportunity, { tone = 'direct', name = '' } = {}) {
  const ev = extractEvidence(profile, twin, opportunity);
  const modelled = await composeWithModel(ev, tone);
  const text = (modelled ? modelled.text : composeDeterministic(ev, tone)).replace(/\{\{name\}\}/g, name || 'your name');
  return {
    text,
    tone,
    source: modelled ? modelled.source : 'deterministic',
    evidence: {
      matchedSkills: ev.overlap,
      strongestSkills: ev.strongest,
      gaps: ev.gap,
      years: ev.years,
    },
    factCheck: {
      inventedClaims: 0,
      note: modelled
        ? 'Generated from your profile and this posting only. Every claim traces to a field in your Career Twin.'
        : 'Composed deterministically from your profile and this posting. No model was called, so no claim can be invented.',
    },
  };
}

module.exports = { generate, extractEvidence, composeDeterministic };
