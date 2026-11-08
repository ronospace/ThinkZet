// Synthetic-but-realistic opportunity corpus generator.
// Reproduces the messiness of real sources: duplicate listings across boards,
// inconsistent titles/currencies/periods, unknown sponsorship, stale posts.
'use strict';
const crypto = require('node:crypto');

let seed = 20261107;
function rnd() { seed = (seed * 1103515245 + 12345) & 0x7fffffff; return seed / 0x7fffffff; }
const pick = (a) => a[Math.floor(rnd() * a.length)];
const int = (a, b) => Math.floor(a + rnd() * (b - a + 1));
const chance = (p) => rnd() < p;

const CURRENCY_RATES = { EUR: 1, USD: 0.92, GBP: 1.17, INR: 0.011, CAD: 0.68, PLN: 0.23, CHF: 1.05 };

const SOURCES = [
  { key: 'mercor', quality: 0.86, channel: 'marketplace', period: 'hour', currency: 'USD' },
  { key: 'micro1', quality: 0.84, channel: 'marketplace', period: 'hour', currency: 'USD' },
  { key: 'turing', quality: 0.78, channel: 'marketplace', period: 'month', currency: 'USD' },
  { key: 'arc', quality: 0.83, channel: 'marketplace', period: 'month', currency: 'EUR' },
  { key: 'linkedin', quality: 0.55, channel: 'fulltime', period: 'year', currency: 'EUR' },
  { key: 'indeed', quality: 0.46, channel: 'fulltime', period: 'year', currency: 'EUR' },
  { key: 'wellfound', quality: 0.72, channel: 'fulltime', period: 'year', currency: 'USD' },
  { key: 'otta', quality: 0.79, channel: 'fulltime', period: 'year', currency: 'EUR' },
  { key: 'upwork', quality: 0.52, channel: 'freelance', period: 'hour', currency: 'USD' },
  { key: 'remoteok', quality: 0.61, channel: 'fulltime', period: 'year', currency: 'USD' },
  { key: 'flexjobs', quality: 0.64, channel: 'fulltime', period: 'year', currency: 'USD' },
  { key: 'braintrust', quality: 0.58, channel: 'freelance', period: 'hour', currency: 'USD' },
];

const COMPANIES = [
  ['Vercel', 'infra'], ['Stripe', 'fintech'], ['Linear', 'saas'], ['Anthropic', 'ai'], ['OpenAI', 'ai'],
  ['Mistral', 'ai'], ['Hugging Face', 'ai'], ['Supabase', 'infra'], ['Neon', 'infra'], ['Temporal', 'infra'],
  ['Personio', 'hrtech'], ['Celonis', 'data'], ['N26', 'fintech'], ['Trade Republic', 'fintech'],
  ['Zalando', 'commerce'], ['Delivery Hero', 'commerce'], ['Bolt', 'mobility'], ['Wolt', 'commerce'],
  ['Datadog', 'observability'], ['Grafana Labs', 'observability'], ['Revolut', 'fintech'], ['Wise', 'fintech'],
  ['Spotify', 'media'], ['Klarna', 'fintech'], ['Adyen', 'fintech'], ['Miro', 'saas'], ['Typeform', 'saas'],
  ['GetYourGuide', 'travel'], ['Doctolib', 'health'], ['Qonto', 'fintech'], ['Algolia', 'search'],
  ['Elastic', 'infra'], ['Canonical', 'infra'], ['GitLab', 'devtools'], ['CircleCI', 'devtools'],
  ['Plaid', 'fintech'], ['Ramp', 'fintech'], ['Deel', 'hrtech'], ['Remote', 'hrtech'], ['Oyster', 'hrtech'],
  ['Scale AI', 'ai'], ['Cohere', 'ai'], ['Weights & Biases', 'mltooling'], ['LangChain', 'ai'],
  ['Pinecone', 'ai'], ['Modal', 'infra'], ['Together AI', 'ai'], ['Groq', 'infra'], ['Perplexity', 'ai'],
];

const ROLE_FAMILIES = [
  { key: 'data_science', label: 'Data Scientist', titles: ['Data Scientist', 'Senior Data Scientist', 'Applied Scientist', 'ML Data Scientist'], skills: [['Python', 1], ['SQL', 0.9], ['Machine Learning', 0.95], ['Statistics', 0.8], ['scikit-learn', 0.7], ['Experimentation', 0.6], ['AWS', 0.45], ['MLOps', 0.5], ['PyTorch', 0.4]] },
  { key: 'ml_engineering', label: 'ML Engineer', titles: ['ML Engineer', 'Senior ML Engineer', 'Machine Learning Engineer', 'Staff ML Engineer'], skills: [['Python', 1], ['PyTorch', 0.9], ['MLOps', 0.85], ['Docker', 0.7], ['Kubernetes', 0.6], ['AWS', 0.65], ['System Design', 0.6], ['LLMOps', 0.45], ['RAG', 0.4]] },
  { key: 'ai_engineering', label: 'AI Engineer', titles: ['AI Engineer', 'Senior AI Engineer', 'LLM Engineer', 'GenAI Engineer'], skills: [['Python', 1], ['RAG', 0.9], ['LLMOps', 0.85], ['Prompt Engineering', 0.8], ['FastAPI', 0.6], ['TypeScript', 0.5], ['Fine-tuning', 0.45], ['AWS', 0.5]] },
  { key: 'data_engineering', label: 'Data Engineer', titles: ['Data Engineer', 'Senior Data Engineer', 'Analytics Engineer', 'Staff Data Engineer'], skills: [['SQL', 1], ['Python', 0.85], ['Spark', 0.7], ['dbt', 0.65], ['Airflow', 0.65], ['AWS', 0.6], ['Data Engineering', 0.95], ['Data Modelling', 0.7]] },
  { key: 'backend', label: 'Backend Engineer', titles: ['Backend Engineer', 'Senior Backend Engineer', 'Staff Engineer', 'Platform Engineer'], skills: [['TypeScript', 0.8], ['Node.js', 0.75], ['Go', 0.5], ['System Design', 0.9], ['Docker', 0.7], ['Kubernetes', 0.55], ['SQL', 0.8], ['AWS', 0.6], ['Kafka', 0.4]] },
  { key: 'frontend', label: 'Frontend Engineer', titles: ['Frontend Engineer', 'Senior Frontend Engineer', 'Product Engineer', 'Full-Stack Engineer'], skills: [['TypeScript', 1], ['React', 0.95], ['Node.js', 0.5], ['Testing', 0.6], ['Design Systems', 0.5], ['GraphQL', 0.4]] },
  { key: 'mobile', label: 'Mobile Engineer', titles: ['Flutter Engineer', 'Mobile Engineer', 'Senior Flutter Developer', 'iOS Engineer'], skills: [['Flutter', 0.95], ['Mobile Engineering', 0.9], ['TypeScript', 0.3], ['Testing', 0.5], ['CI/CD', 0.45]] },
  { key: 'platform', label: 'Platform / SRE', titles: ['SRE', 'Platform Engineer', 'Infrastructure Engineer', 'DevOps Engineer'], skills: [['Kubernetes', 0.95], ['Terraform', 0.85], ['AWS', 0.9], ['Docker', 0.85], ['Observability', 0.7], ['CI/CD', 0.8], ['Security Engineering', 0.4]] },
  { key: 'product', label: 'Product Manager', titles: ['Product Manager', 'Senior Product Manager', 'AI Product Manager'], skills: [['Product Management', 0.95], ['Product Analytics', 0.7], ['Communication', 0.9], ['SQL', 0.5], ['Experimentation', 0.55]] },
];

const CITIES = [
  ['Berlin', 'DE', 1.0, 'yes'], ['Munich', 'DE', 1.08, 'yes'], ['Amsterdam', 'NL', 1.06, 'yes'],
  ['Dublin', 'IE', 1.02, 'yes'], ['Lisbon', 'PT', 0.72, 'likely'], ['Warsaw', 'PL', 0.68, 'unknown'],
  ['London', 'GB', 1.18, 'likely'], ['Zurich', 'CH', 1.42, 'yes'], ['Stockholm', 'SE', 0.98, 'yes'],
  ['Barcelona', 'ES', 0.78, 'likely'], ['Paris', 'FR', 0.94, 'yes'], ['Toronto', 'CA', 0.96, 'yes'],
  ['Remote (EU)', 'EU', 0.95, 'unknown'], ['Remote (Global)', 'WW', 0.9, 'unknown'],
  ['Bangalore', 'IN', 0.28, 'unknown'], ['Dubai', 'AE', 0.92, 'yes'], ['New York', 'US', 1.35, 'no'],
  ['San Francisco', 'US', 1.5, 'no'],
];

const BASE_ANNUAL_EUR = {
  data_science: 78000, ml_engineering: 88000, ai_engineering: 92000, data_engineering: 76000,
  backend: 80000, frontend: 72000, mobile: 70000, platform: 86000, product: 82000,
};
const SENIORITY_MULT = { junior: 0.62, mid: 0.85, senior: 1.0, staff: 1.3, lead: 1.18, principal: 1.45 };

const OTHER_TYPES = [
  { type: 'fellowship', titles: ['AI Safety Research Fellowship', 'Data Science for Public Good Fellowship', 'Mozilla Technology Fellowship', 'Open Source AI Fellowship'], comp: [0, 24000], period: 'stipend' },
  { type: 'grant', titles: ['Independent AI Research Grant', 'Open Source Maintainer Grant', 'Prototype Fund Grant'], comp: [10000, 60000], period: 'oneoff' },
  { type: 'accelerator', titles: ['AI Founders Accelerator – Cohort 9', 'B2B SaaS Accelerator', 'Climate Tech Accelerator'], comp: [25000, 150000], period: 'investment' },
  { type: 'cofounder', titles: ['Technical Co-Founder – AI Legal Tech', 'Co-Founder & CTO – Vertical AI', 'Founding Engineer / Co-Founder – DevTools'], comp: [0, 0], period: 'equity' },
  { type: 'research', titles: ['Research Scientist – LLM Evaluation', 'Applied Research – Multimodal', 'Research Engineer – Agents'], comp: [85000, 140000], period: 'year' },
  { type: 'hackathon', titles: ['Agentic AI Hackathon – Berlin', 'AI x Climate Hack', 'LLM Evals Challenge'], comp: [2000, 25000], period: 'prize' },
  { type: 'speaking', titles: ['Keynote: Production RAG at Scale', 'Workshop: MLOps for Small Teams', 'Panel: The AI Talent Market'], comp: [1500, 8000], period: 'fee' },
  { type: 'mentorship', titles: ['Mentor – AI Engineering Bootcamp', 'Technical Mentor – Founders Program'], comp: [0, 4000], period: 'stipend' },
];

function hash(s) { return crypto.createHash('sha1').update(s).digest('hex').slice(0, 16); }
function daysAgo(n) { const d = new Date(Date.now() - n * 86400000); return d.toISOString(); }
function daysAhead(n) { const d = new Date(Date.now() + n * 86400000); return d.toISOString(); }

function makeOpportunities() {
  const rows = [];
  // 1) Jobs & contracts — each "real" role posted on 1-3 boards (creates genuine duplicates)
  for (let i = 0; i < 640; i++) {
    const fam = pick(ROLE_FAMILIES);
    const [company, sector] = pick(COMPANIES);
    const [city, country, costIdx, visaDefault] = pick(CITIES);
    const seniority = pick(['mid', 'mid', 'senior', 'senior', 'senior', 'staff', 'lead', 'junior']);
    const remoteType = country === 'WW' ? 'remote' : pick(['remote', 'remote', 'hybrid', 'onsite']);
    const type = chance(0.28) ? 'contract' : 'job';
    const base = BASE_ANNUAL_EUR[fam.key] * SENIORITY_MULT[seniority] * costIdx;
    const skillSet = fam.skills.filter(() => chance(0.75)).slice(0, 8);
    if (skillSet.length < 3) skillSet.push(...fam.skills.slice(0, 4));
    const title = pick(fam.titles);

    const postings = int(1, 3);
    const firstSeen = int(1, 55);
    for (let p = 0; p < postings; p++) {
      const src = pick(SOURCES);
      const salaryPeriod = type === 'contract' ? 'hour' : 'year';
      const annual = base * (0.88 + rnd() * 0.3);
      let compMin, compMax, currency, period;
      if (salaryPeriod === 'hour') {
        period = 'hour'; currency = src.currency;
        const hourlyEUR = annual / 1600; // contractor hours/yr
        compMin = Math.round((hourlyEUR * 0.92) / CURRENCY_RATES[currency]);
        compMax = Math.round((hourlyEUR * 1.18) / CURRENCY_RATES[currency]);
      } else {
        period = 'year'; currency = src.currency;
        compMin = Math.round((annual * 0.93) / CURRENCY_RATES[currency] / 500) * 500;
        compMax = Math.round((annual * 1.16) / CURRENCY_RATES[currency] / 500) * 500;
      }
      const id = hash(`${company}|${title}|${city}|${p}`);
      rows.push({
        id: `${id}-${src.key}`,
        type,
        title: p === 0 ? title : title + (chance(0.4) ? ' (Remote)' : ''),
        company, sector, role_family: fam.key, seniority, remote_type: remoteType,
        city, country, comp_min: compMin, comp_max: compMax, currency, comp_period: period,
        visa_sponsorship: chance(0.7) ? visaDefault : 'unknown',
        skills: skillSet.map(([s]) => s),
        description: `${company} is hiring a ${title}${city !== 'Remote (Global)' ? ` in ${city}` : ' (fully remote)'}. ${sector} company. Stack: ${skillSet.map(([s]) => s).join(', ')}.`,
        apply_url: `https://example.com/${src.key}/${id}`,
        source: src.key, source_quality: src.quality, channel: src.channel,
        posted_at: daysAgo(firstSeen + p * 2), closes_at: chance(0.3) ? daysAhead(int(2, 30)) : null,
        dedupe_group: `${company}|${title}|${city}`.toLowerCase(),
      });
    }
  }

  // 2) Non-job opportunities (fellowships, grants, accelerators, cofounder, research, etc.)
  for (const t of OTHER_TYPES) {
    for (let i = 0; i < 7; i++) {
      const [city, country] = pick(CITIES.slice(0, 14));
      const company = t.type === 'cofounder' ? pick(['Stealth AI startup', 'Seed-stage AI startup', 'YC W27 startup']) : pick(['Mozilla Foundation', 'Open Society', 'Antler', 'Techstars', 'EF', 'Wellcome Trust', 'Schmidt Futures', 'Startup Portugal', 'Bundesagentur']);
      const fam = pick(ROLE_FAMILIES);
      const amount = int(t.comp[0], t.comp[1]);
      const id = hash(`${t.type}|${company}|${i}`);
      rows.push({
        id,
        type: t.type,
        title: pick(t.titles),
        company, sector: 'programme', role_family: fam.key, seniority: pick(['mid', 'senior', 'senior']),
        remote_type: chance(0.5) ? 'remote' : 'hybrid',
        city, country,
        comp_min: amount, comp_max: amount, currency: 'EUR', comp_period: t.period,
        visa_sponsorship: chance(0.5) ? 'yes' : 'unknown',
        skills: fam.skills.slice(0, 5).map(([s]) => s),
        description: `${t.title} — ${company}. ${t.period === 'equity' ? 'Equity-only founding role.' : `Funding/value of ${amount} EUR (${t.period}).`}`,
        apply_url: `https://example.com/programmes/${id}`,
        source: 'programmes', source_quality: 0.8, channel: t.type,
        posted_at: daysAgo(int(2, 40)), closes_at: daysAhead(int(5, 60)),
        dedupe_group: `${t.type}|${company}|${i}`,
      });
    }
  }

  // 3) Realistic noise: stale + ghost listings
  for (let i = 0; i < 60; i++) {
    const fam = pick(ROLE_FAMILIES);
    const [company] = pick(COMPANIES);
    const [city, country] = pick(CITIES);
    const id = hash(`stale|${company}|${i}`);
    rows.push({
      id, type: 'job', title: pick(fam.titles), company, sector: 'unknown', role_family: fam.key,
      seniority: 'mid', remote_type: 'hybrid', city, country,
      comp_min: null, comp_max: null, currency: null, comp_period: 'year',
      visa_sponsorship: 'unknown', skills: fam.skills.slice(0, 4).map(([s]) => s),
      description: 'No description provided.',
      apply_url: `https://example.com/stale/${id}`, source: 'indeed', source_quality: 0.3,
      channel: 'fulltime', posted_at: daysAgo(int(60, 140)), closes_at: null,
      dedupe_group: `stale|${company}|${i}`,
    });
  }

  return rows;
}

module.exports = { makeOpportunities, CURRENCY_RATES, ROLE_FAMILIES, SENIORITY_MULT, BASE_ANNUAL_EUR };
