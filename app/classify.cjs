// Opportunity classification + geographic normalisation for live source records.
'use strict';
const { resolveSkill } = require('./taxonomy.cjs');

const FAMILY_SIGNALS = [
  ['ai_engineering', /\b(llm|genai|generative ai|ai engineer|prompt|rag|agent|applied ai)\b/i],
  ['ml_engineering', /\b(machine learning|ml engineer|mlops|deep learning|computer vision|nlp scientist)\b/i],
  ['data_science', /\b(data scientist|applied scientist|analytics scientist|quantitative researcher)\b/i],
  ['data_engineering', /\b(data engineer|analytics engineer|etl|data platform|warehouse)\b/i],
  ['platform', /\b(devops|sre|site reliability|platform engineer|infrastructure|cloud engineer|kubernetes)\b/i],
  ['security', /\b(security engineer|appsec|infosec|pentest|soc analyst)\b/i],
  ['mobile', /\b(ios|android|flutter|react native|mobile engineer)\b/i],
  ['frontend', /\b(frontend|front-end|front end|react|vue|angular|ui engineer)\b/i],
  ['product', /\b(product manager|product owner|product lead|pm\b|head of product)\b/i],
  ['design', /\b(product designer|ux|ui designer|design lead)\b/i],
  ['backend', /\b(backend|back-end|software engineer|full[- ]stack|golang|java|node|rust developer|python developer)\b/i],
];

// Explicit non-target roles. These are dropped from the default feed — a career OS for
// professionals should not show internships, trades or sales roles unless asked for.
const EXCLUDE_TITLE = /(\bintern\b|\binternship\b|\bwerkstudent|\bpraktik|\bpraktikum\b|\bausbildung\b|\bazubi\b|\btrainee\b|\bworking student\b|\bservicetechniker|\belektrotechnik|\bcontroller\b|\bfilmproduktion|\bgrafik|\bcontent management\b|\bsales\b|\baccount (executive|manager)\b|\brecruiter\b|\bcustomer (support|success)\b|\bnurse\b|\bmedical\b|\bwarehouse\b|\bdriver\b|\bteacher\b|\blegal counsel\b|\bpeople ops\b|\bhr (manager|generalist)\b|\bmarketing (manager|intern)\b|\bfinance\b|\baccountant\b|\barchitect(ure)? internship\b)/i;

// Core tech vocabulary — a title must contain at least one to be a real tech role.
const TECH_CORE = /\b(engineer|developer|scientist|architect|programmer|devops|sre|analyst|data|software|ml\b|machine learning|ai\b|llm|backend|frontend|full[- ]?stack|platform|infrastructure|security|cloud|qa\b|flutter|react|python|java|golang|rust|node|mobile|ios|android|kubernetes|sql|product manager|designer|ux|ui)\b/i;

function classifyFamily(title, tags, description) {
  const text = `${title} ${(tags || []).join(' ')}`;
  if (EXCLUDE_TITLE.test(title)) return 'non_tech';
  if (!TECH_CORE.test(title)) return 'non_tech';
  for (const [fam, re] of FAMILY_SIGNALS) if (re.test(text)) return fam;
  const body = (description || '').slice(0, 400);
  for (const [fam, re] of FAMILY_SIGNALS) if (re.test(body)) return fam;
  return 'backend';
}

function classifySeniority(title, level, description) {
  const t = `${title} ${level || ''}`.toLowerCase();
  if (/principal|distinguished|fellow/.test(t)) return 'principal';
  if (/staff/.test(t)) return 'staff';
  if (/head of|director|vp\b|chief/.test(t)) return 'lead';
  if (/lead|manager|supervisor/.test(t)) return 'lead';
  if (/senior|sr\.?\b|iii\b/.test(t)) return 'senior';
  if (/junior|jr\.?\b|graduate|intern|entry|trainee|werkstudent|praktikum/.test(t)) return 'junior';
  const body = (description || '').toLowerCase();
  if (/\b([5-9]|1[0-9])\+? years\b/.test(body)) return 'senior';
  if (/\b(2|3|4)\+? years\b/.test(body)) return 'mid';
  return 'mid';
}

const COUNTRY_NAMES = {
  germany: 'DE', deutschland: 'DE', netherlands: 'NL', holland: 'NL', portugal: 'PT', spain: 'ES',
  france: 'FR', ireland: 'IE', poland: 'PL', sweden: 'SE', denmark: 'DK', norway: 'NO', finland: 'FI',
  switzerland: 'CH', austria: 'AT', belgium: 'BE', italy: 'IT', 'united kingdom': 'GB', uk: 'GB',
  england: 'GB', scotland: 'GB', canada: 'CA', 'united states': 'US', usa: 'US', 'new york': 'US',
  india: 'IN', brazil: 'BR', mexico: 'MX', argentina: 'AR', colombia: 'CO', nigeria: 'NG',
  kenya: 'KE', 'south africa': 'ZA', egypt: 'EG', 'united arab emirates': 'AE', dubai: 'AE',
  'saudi arabia': 'SA', turkey: 'TR', israel: 'IL', australia: 'AU', 'new zealand': 'NZ',
  singapore: 'SG', japan: 'JP', 'south korea': 'KR', china: 'CN', ukraine: 'UA', romania: 'RO',
  czech: 'CZ', 'czech republic': 'CZ', hungary: 'HU', greece: 'GR', estonia: 'EE', lithuania: 'LT',
  latvia: 'LV', bulgaria: 'BG', croatia: 'HR', serbia: 'RS', slovakia: 'SK', slovenia: 'SI',
  'anywhere': 'WW', worldwide: 'WW', global: 'WW', remote: 'WW',
};

const CITY_TO_COUNTRY = {
  berlin: 'DE', munich: 'DE', münchen: 'DE', hamburg: 'DE', frankfurt: 'DE', cologne: 'DE', köln: 'DE',
  stuttgart: 'DE', düsseldorf: 'DE', leipzig: 'DE', dresden: 'DE', amsterdam: 'NL', rotterdam: 'NL',
  utrecht: 'NL', 'the hague': 'NL', eindhoven: 'NL', lisbon: 'PT', porto: 'PT', madrid: 'ES',
  barcelona: 'ES', valencia: 'ES', paris: 'FR', lyon: 'FR', dublin: 'IE', cork: 'IE',
  london: 'GB', manchester: 'GB', edinburgh: 'GB', warsaw: 'PL', krakow: 'PL', 'kraków': 'PL',
  wroclaw: 'PL', stockholm: 'SE', copenhagen: 'DK', oslo: 'NO', helsinki: 'FI', zurich: 'CH',
  geneva: 'CH', vienna: 'AT', brussels: 'BE', milan: 'IT', rome: 'IT', toronto: 'CA',
  vancouver: 'CA', 'new york': 'US', 'san francisco': 'US', austin: 'US', seattle: 'US',
  boston: 'US', 'los angeles': 'US', bangalore: 'IN', bengaluru: 'IN', mumbai: 'IN', delhi: 'IN',
  hyderabad: 'IN', pune: 'IN', dubai: 'AE', 'abu dhabi': 'AE', singapore: 'SG', tokyo: 'JP',
  sydney: 'AU', melbourne: 'AU', 'são paulo': 'BR', 'sao paulo': 'BR', 'buenos aires': 'AR',
};

function normaliseLocation(rawCity, description) {
  const cityRaw = String(rawCity || '').trim();
  const hay = `${cityRaw} ${(description || '').slice(0, 600)}`.toLowerCase();

  let country = null;
  // 1. direct country name anywhere
  for (const [name, code] of Object.entries(COUNTRY_NAMES)) {
    if (new RegExp(`(^|[^a-z])${name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}([^a-z]|$)`, 'i').test(hay)) { country = code; break; }
  }
  // 2. city → country
  if (!country) {
    const cityLower = cityRaw.toLowerCase();
    for (const [c, code] of Object.entries(CITY_TO_COUNTRY)) {
      if (cityLower.includes(c)) { country = code; break; }
    }
  }
  // 3. remote signals
  const remote = /fully remote|remote[- ]first|anywhere|worldwide|distributed team|work from anywhere/i.test(hay)
    || /^remote/i.test(cityRaw);
  if (!country && remote) country = 'WW';

  return { country, remote };
}

const SPONSORSHIP_NEGATIVE = /(no visa sponsorship|unable to sponsor|cannot sponsor|not able to sponsor|no sponsorship|must be (?:authorized|authorised) to work|without sponsorship|no relocation support)/i;
const SPONSORSHIP_POSITIVE = /(visa sponsorship|we sponsor|sponsorship available|relocation package|relocation support|blue card|skilled worker visa|work permit provided|help with relocation)/i;

function detectSponsorship(description) {
  const d = String(description || '');
  if (SPONSORSHIP_NEGATIVE.test(d)) return 'no';
  if (SPONSORSHIP_POSITIVE.test(d)) return 'yes';
  return 'unknown';
}

function extractComp(text) {
  const d = String(text || '');
  const cur = /(€|eur)/i.test(d) ? 'EUR' : /(£|gbp)/i.test(d) ? 'GBP' : /(\$|usd)/i.test(d) ? 'USD' : null;
  const kRange = d.match(/([€£$])?\s?(\d{2,3})(?:[.,]\d{1,2})?\s?[kK]\s?(?:-|–|to|—)\s?([€£$])?\s?(\d{2,3})(?:[.,]\d{1,2})?\s?[kK]/);
  if (kRange) {
    return { currency: cur || 'EUR', min: Number(kRange[2]) * 1000, max: Number(kRange[4]) * 1000, period: 'year' };
  }
  const hourly = d.match(/([€£$])\s?(\d{2,3})(?:\.\d{1,2})?\s?(?:\/|per\s?)(?:h|hr|hour)/i);
  if (hourly) return { currency: cur || 'EUR', min: Number(hourly[2]), max: Number(hourly[2]), period: 'hour' };
  return null;
}

function extractSkills(title, description, tags) {
  const text = `${title} ${(tags || []).join(' ')} ${(description || '').slice(0, 1200)}`;
  const found = new Set();
  const lower = text.toLowerCase();
  const { SKILLS } = require('./taxonomy.cjs');
  for (const [canonical, , aliases] of SKILLS) {
    const needles = [canonical.toLowerCase(), ...aliases];
    for (const n of needles) {
      const re = new RegExp(`(^|[^a-z0-9])${n.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}([^a-z0-9]|$)`, 'i');
      if (re.test(lower)) { found.add(canonical); break; }
    }
  }
  return Array.from(found).slice(0, 12);
}

module.exports = { classifyFamily, classifySeniority, normaliseLocation, detectSponsorship, extractComp, extractSkills };
