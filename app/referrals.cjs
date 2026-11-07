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
  { name: 'Mercor', slug: 'mercor', category: 'ai_marketplace', payout_model: 'cpa', payout_amount: 150, template: 'https://mercor.com/?ref={code}', notes: 'AI talent marketplace — hourly contracts' },
  { name: 'micro1', slug: 'micro1', category: 'ai_marketplace', payout_model: 'cpa', payout_amount: 120, template: 'https://www.micro1.ai/?ref={code}', notes: 'AI screening + talent marketplace' },
  { name: 'Turing', slug: 'turing', category: 'ai_marketplace', payout_model: 'cpa', payout_amount: 100, template: 'https://www.turing.com/?ref={code}', notes: 'Remote developer staffing' },
  { name: 'Arc.dev', slug: 'arc', category: 'ai_marketplace', payout_model: 'cpa', payout_amount: 90, template: 'https://arc.dev/?ref={code}', notes: 'Curated remote developer marketplace' },
  { name: 'Upwork', slug: 'upwork', category: 'freelance', payout_model: 'revshare', payout_amount: 0, template: 'https://www.upwork.com/?ref={code}', notes: 'Freelance liquidity' },
  { name: 'Coursera', slug: 'coursera', category: 'learning', payout_model: 'revshare', payout_amount: 0, template: 'https://www.coursera.org/?ref={code}', notes: 'Course affiliate' },
  { name: 'DataCamp', slug: 'datacamp', category: 'learning', payout_model: 'revshare', payout_amount: 0, template: 'https://www.datacamp.com/?ref={code}', notes: 'Data skills affiliate' },
  { name: 'AWS Skill Builder', slug: 'aws', category: 'learning', payout_model: 'revshare', payout_amount: 0, template: 'https://skillbuilder.aws/?ref={code}', notes: 'Certification partner' },
  { name: 'Google Cloud Skills', slug: 'gcp', category: 'learning', payout_model: 'revshare', payout_amount: 0, template: 'https://cloud.google.com/training/?ref={code}', notes: 'Certification partner' },
  { name: 'Immigration partner', slug: 'immigration', category: 'immigration', payout_model: 'cpa', payout_amount: 200, template: 'https://example-immigration.com/?ref={code}', notes: 'Consultation referral' },
  { name: 'Relocation partner', slug: 'relocation', category: 'relocation', payout_model: 'cpa', payout_amount: 250, template: 'https://example-relocation.com/?ref={code}', notes: 'Relocation package referral' },
];

function seedPrograms() {
  const n = db.prepare('SELECT COUNT(*) n FROM referral_programs').get().n;
  if (n > 0) return;
  const ins = db.prepare(`INSERT OR IGNORE INTO referral_programs (name,slug,category,payout_model,payout_amount,template,notes)
    VALUES (?,?,?,?,?,?,?)`);
  for (const p of DEFAULT_PROGRAMS) {
    ins.run(p.name, p.slug, p.category, p.payout_model, p.payout_amount, p.template, p.notes);
  }
}

function programForSource(sourceKey) {
  const map = {
    mercor: 'mercor', micro1: 'micro1', turing: 'turing', arc: 'arc', upwork: 'upwork',
    braintrust: 'upwork', coursera: 'coursera', datacamp: 'datacamp',
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
