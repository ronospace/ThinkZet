// Referral / affiliate layer.
//
// Design principle that cannot be violated: the referral engine must never be able to
// influence ranking. It is a separate module, it reads nothing from the match engine, and
// the match engine reads nothing from here. A user is routed to a partner only when that
// partner's opportunity is the one they already chose.
'use strict';
const crypto = require('node:crypto');
const { db } = require('./db.cjs');

const DEFAULT_PROGRAMS = [
  { name: 'Mercor', slug: 'mercor', category: 'ai_marketplace', payout_model: 'cpa', payout_amount: 150, template: 'https://t.mercor.com/jHGSI', notes: 'AI talent marketplace – hourly contracts' },
  { name: 'micro1', slug: 'micro1', category: 'ai_marketplace', payout_model: 'cpa', payout_amount: 120, template: 'https://refer.micro1.ai/referral/jobs?referralCode=899c8653-93c8-450d-a7da-d54426b36cfc', notes: 'AI screening + talent marketplace' },
  { name: 'Turing', slug: 'turing', category: 'ai_marketplace', payout_model: 'cpa', payout_amount: 100, template: 'https://work.turing.com/r/ajA5uG1dgw', notes: 'Remote developer staffing' },
  { name: 'Arc.dev', slug: 'arc', category: 'ai_marketplace', payout_model: 'cpa', payout_amount: 90, template: 'https://arc.dev/?ref={code}', notes: 'Curated remote developer marketplace' },
  { name: 'Upwork', slug: 'upwork', category: 'freelance', payout_model: 'revshare', payout_amount: 0, template: 'https://www.upwork.com/?ref={code}', notes: 'Freelance liquidity' },
  { name: 'Coursera', slug: 'coursera', category: 'learning', payout_model: 'revshare', payout_amount: 0, template: 'https://www.coursera.org/?ref={code}', notes: 'Course affiliate' },
  { name: 'DataCamp', slug: 'datacamp', category: 'learning', payout_model: 'revshare', payout_amount: 0, template: 'https://www.datacamp.com/?ref={code}', notes: 'Data skills affiliate' },
  { name: 'AWS Skill Builder', slug: 'aws', category: 'learning', payout_model: 'revshare', payout_amount: 0, template: 'https://skillbuilder.aws/?ref={code}', notes: 'Certification partner' },
  { name: 'Google Cloud Skills', slug: 'gcp', category: 'learning', payout_model: 'revshare', payout_amount: 0, template: 'https://cloud.google.com/training/?ref={code}', notes: 'Certification partner' },
  { name: 'Immigration partner', slug: 'immigration', category: 'immigration', payout_model: 'cpa', payout_amount: 200, template: 'https://example-immigration.com/?ref={code}', notes: 'Consultation referral' },
  { name: 'Relocation partner', slug: 'relocation', category: 'relocation', payout_model: 'cpa', payout_amount: 250, template: 'https://example-relocation.com/?ref={code}', notes: 'Relocation package referral' },
  { name: 'Brilliant', slug: 'brilliant', category: 'learning', payout_model: 'revshare', payout_amount: 0, template: 'https://whybrilliant.com/r/M9HRR8B2', notes: 'Referral supplied by the founder' },
  { name: 'Turing (invite 2)', slug: 'turing-2', category: 'ai_marketplace', payout_model: 'cpa', payout_amount: 0, template: 'https://work.turing.com/r/L-JAfKYpjF', notes: 'Referral supplied by the founder' },
  { name: 'Turing (invite 3)', slug: 'turing-3', category: 'ai_marketplace', payout_model: 'cpa', payout_amount: 0, template: 'https://work.turing.com/r/_4ZxnDClr2', notes: 'Referral supplied by the founder' },
  { name: 'AfterQuery', slug: 'afterquery', category: 'ai_marketplace', payout_model: 'cpa', payout_amount: 0, template: 'https://experts.afterquery.com/apply?ref=dBm26iSb98N6TO3z6OanGy9ORjV2', notes: 'Referral supplied by the founder' },
  { name: 'Rust Labs (engineering)', slug: 'rustlabs-eng', category: 'ai_marketplace', payout_model: 'cpa', payout_amount: 0, template: 'https://experts.rustlabs.ai/apply?ref=wht75utc&program=talent-sourcer-swe&role=senior-engineer&track=engineering', notes: 'Referral supplied by the founder' },
  { name: 'Rust Labs (business analyst)', slug: 'rustlabs-ba', category: 'ai_marketplace', payout_model: 'cpa', payout_amount: 0, template: 'https://experts.rustlabs.ai/screens/business-analyst-rater/apply?ref=wht75utc&program=talent-sourcer-business-analyst', notes: 'Referral supplied by the founder' },
  { name: 'Rust Labs (scientific coding)', slug: 'rustlabs-sci', category: 'ai_marketplace', payout_model: 'cpa', payout_amount: 0, template: 'https://experts.rustlabs.ai/apply?ref=wht75utc&program=talent-sourcer-scientific-coding&role=scientific-coding', notes: 'Referral supplied by the founder' },
  { name: 'Ethos', slug: 'ethos', category: 'ai_marketplace', payout_model: 'cpa', payout_amount: 0, template: 'https://agent.askethos.com/refer/pifuwuc8xbgg', notes: 'Referral supplied by the founder' },
];

function seedPrograms() {
  const ins = db.prepare(`INSERT INTO referral_programs (name,slug,category,payout_model,payout_amount,template,notes)
    VALUES (?,?,?,?,?,?,?)
    ON CONFLICT(slug) DO UPDATE SET template=excluded.template, notes=excluded.notes, name=excluded.name`);
  for (const p of DEFAULT_PROGRAMS) {
    ins.run(p.name, p.slug, p.category, p.payout_model, p.payout_amount, p.template, p.notes);
  }
}

function programForSource(sourceKey) {
  const map = {
    mercor: 'mercor', micro1: 'micro1', turing: 'turing', arc: 'arc', upwork: 'upwork',
    braintrust: 'upwork', coursera: 'coursera', datacamp: 'datacamp', brilliant: 'brilliant', ethos: 'ethos',
  };
  const slug = map[sourceKey];
  if (!slug) return null;
  return db.prepare('SELECT * FROM referral_programs WHERE slug=? AND active=1').get(slug) || null;
}

function programForSkill(skillName) {
  const s = String(skillName || '').toLowerCase();
  if (/aws|sagemaker|cloud/.test(s)) return db.prepare("SELECT * FROM referral_programs WHERE slug='aws'").get();
  if (/gcp|bigquery|vertex/.test(s)) return db.prepare("SELECT * FROM referral_programs WHERE slug='gcp'").get();
  if (/ml|llm|rag|pytorch|data/.test(s)) return db.prepare("SELECT * FROM referral_programs WHERE slug='datacamp'").get();
  return db.prepare("SELECT * FROM referral_programs WHERE slug='coursera'").get();
}

function buildLink(program, userId, targetUrl, surface) {
  const code = crypto.randomBytes(5).toString('hex');
  db.prepare('INSERT INTO referral_links (program_id,code,target_url) VALUES (?,?,?)')
    .run(program.id, code, targetUrl || '');
  return { code, url: `/go/${code}`, surface };
}

function resolveLink(code) {
  return db.prepare(`SELECT l.*, p.template, p.name, p.slug, p.category
    FROM referral_links l JOIN referral_programs p ON p.id=l.program_id WHERE l.code=?`).get(code);
}

function recordClick(code, { userId, opportunityId, surface, ip, ua }) {
  const link = resolveLink(code);
  if (!link) return null;
  const ipHash = ip ? crypto.createHash('sha256').update(String(ip)).digest('hex').slice(0, 16) : null;
  db.prepare(`INSERT INTO referral_clicks (link_code,program_id,user_id,opportunity_id,surface,ip_hash,ua)
    VALUES (?,?,?,?,?,?,?)`).run(code, link.program_id, userId || null, opportunityId || null, surface || null, ipHash, (ua || '').slice(0, 200));
  const target = (link.template || link.target_url || '').replace('{code}', code);
  return { target, program: link };
}

function summary(userId) {
  const programs = db.prepare('SELECT * FROM referral_programs ORDER BY active DESC, name').all();
  const clicks = db.prepare('SELECT program_id, COUNT(*) n FROM referral_clicks WHERE user_id=? OR user_id IS NULL GROUP BY program_id').all();
  const clickMap = Object.fromEntries(clicks.map((c) => [c.program_id, c.n]));
  const links = db.prepare('SELECT COUNT(*) n FROM referral_links').get().n;
  return {
    programs: programs.map((p) => ({ ...p, clicks: clickMap[p.id] || 0 })),
    totalLinks: links,
    totalClicks: db.prepare('SELECT COUNT(*) n FROM referral_clicks').get().n,
    note: 'Referral routing is physically isolated from ranking. The match engine cannot read this module.',
  };
}

module.exports = { seedPrograms, programForSource, programForSkill, buildLink, resolveLink, recordClick, summary, DEFAULT_PROGRAMS };
