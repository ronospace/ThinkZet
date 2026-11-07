// CareerOS AI — data layer. SQLite (node:sqlite), single file, zero dependencies.
'use strict';
const { DatabaseSync } = require('node:sqlite');
const path = require('node:path');
const fs = require('node:fs');

const DB_PATH = path.join(__dirname, '..', 'data', 'careeros.db');
fs.mkdirSync(path.dirname(DB_PATH), { recursive: true });

const db = new DatabaseSync(DB_PATH);
db.exec('PRAGMA journal_mode = WAL;');
db.exec('PRAGMA foreign_keys = ON;');

db.exec(`
CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  name TEXT,
  country TEXT,
  locale TEXT DEFAULT 'en',
  created_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS profiles (
  user_id TEXT PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  headline TEXT,
  summary TEXT,
  years_experience INTEGER,
  seniority TEXT,
  current_role TEXT,
  current_company TEXT,
  current_rate REAL,
  rate_unit TEXT,
  rate_currency TEXT DEFAULT 'EUR',
  target_rate_min REAL,
  remote_preference TEXT,
  willing_to_relocate INTEGER DEFAULT 0,
  target_countries TEXT,
  visa_needed INTEGER DEFAULT 0,
  risk_tolerance TEXT DEFAULT 'balanced',
  time_to_move TEXT DEFAULT 'exploring',
  goals TEXT,
  resume_text TEXT,
  embedding TEXT,
  completeness INTEGER DEFAULT 0,
  updated_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS skills (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  canonical TEXT UNIQUE NOT NULL,
  category TEXT,
  aliases TEXT,
  demand_index REAL,
  salary_premium REAL,
  growth_rate REAL,
  is_emerging INTEGER DEFAULT 0,
  decay_years REAL
);

CREATE TABLE IF NOT EXISTS profile_skills (
  user_id TEXT REFERENCES users(id) ON DELETE CASCADE,
  skill_id INTEGER REFERENCES skills(id),
  proficiency TEXT,
  confidence REAL DEFAULT 1,
  source TEXT DEFAULT 'resume',
  PRIMARY KEY (user_id, skill_id)
);

CREATE TABLE IF NOT EXISTS opportunities (
  id TEXT PRIMARY KEY,
  type TEXT NOT NULL,
  title TEXT NOT NULL,
  company TEXT,
  role_family TEXT,
  seniority TEXT,
  remote_type TEXT,
  city TEXT,
  country TEXT,
  comp_min REAL,
  comp_max REAL,
  currency TEXT,
  comp_period TEXT,
  visa_sponsorship TEXT DEFAULT 'unknown',
  skills TEXT,
  description TEXT,
  apply_url TEXT,
  source TEXT,
  source_count INTEGER DEFAULT 1,
  source_quality REAL DEFAULT 0.5,
  posted_at TEXT,
  closes_at TEXT,
  status TEXT DEFAULT 'open',
  content_hash TEXT,
  dedupe_group TEXT,
  last_seen TEXT DEFAULT (datetime('now')),
  created_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS opportunity_sources (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  opportunity_id TEXT REFERENCES opportunities(id) ON DELETE CASCADE,
  source_key TEXT,
  external_id TEXT,
  source_url TEXT,
  UNIQUE (source_key, external_id)
);

CREATE TABLE IF NOT EXISTS matches (
  user_id TEXT REFERENCES users(id) ON DELETE CASCADE,
  opportunity_id TEXT REFERENCES opportunities(id) ON DELETE CASCADE,
  match_score REAL, skill_fit REAL, experience_fit REAL,
  income_potential REAL, interview_probability REAL, offer_probability REAL,
  risk_score REAL, missing_skills TEXT, reasons TEXT, model_version TEXT,
  computed_at TEXT DEFAULT (datetime('now')),
  PRIMARY KEY (user_id, opportunity_id)
);

CREATE TABLE IF NOT EXISTS career_scores (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id TEXT REFERENCES users(id) ON DELETE CASCADE,
  employability INTEGER, interview_readiness INTEGER, market_demand INTEGER,
  salary_potential INTEGER, future_growth INTEGER, career_momentum INTEGER,
  overall INTEGER, benchmark_percentile INTEGER, breakdown TEXT,
  computed_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS career_twin (
  user_id TEXT PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  version INTEGER DEFAULT 1,
  state TEXT,
  learning_signals TEXT,
  updated_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS applications (
  id TEXT PRIMARY KEY,
  user_id TEXT REFERENCES users(id) ON DELETE CASCADE,
  opportunity_id TEXT REFERENCES opportunities(id) ON DELETE CASCADE,
  status TEXT DEFAULT 'saved',
  notes TEXT,
  applied_at TEXT,
  updated_at TEXT DEFAULT (datetime('now')),
  UNIQUE (user_id, opportunity_id)
);

CREATE TABLE IF NOT EXISTS outcomes (
  id TEXT PRIMARY KEY,
  user_id TEXT REFERENCES users(id) ON DELETE CASCADE,
  opportunity_id TEXT,
  application_id TEXT,
  outcome_type TEXT NOT NULL,
  occurred_at TEXT DEFAULT (datetime('now')),
  amount REAL, currency TEXT, period TEXT,
  salary_delta_pct REAL, satisfaction INTEGER,
  verified INTEGER DEFAULT 0, consent_to_aggregate INTEGER DEFAULT 0,
  notes TEXT
);

CREATE TABLE IF NOT EXISTS salary_records (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  role_family TEXT, seniority TEXT, country TEXT, city TEXT,
  remote INTEGER, channel TEXT, skills TEXT,
  amount REAL, currency TEXT, period TEXT,
  source TEXT, sample_size INTEGER DEFAULT 1, verified INTEGER DEFAULT 0,
  observed_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS activity_logs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id TEXT, action TEXT, entity_type TEXT, entity_id TEXT, metadata TEXT,
  created_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS ingestion_runs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  payload TEXT NOT NULL,
  created_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS referral_programs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  category TEXT,
  payout_model TEXT,
  payout_amount REAL,
  payout_currency TEXT DEFAULT 'EUR',
  attribution_days INTEGER DEFAULT 30,
  template TEXT,
  notes TEXT,
  active INTEGER DEFAULT 1,
  created_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS referral_links (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  program_id INTEGER REFERENCES referral_programs(id) ON DELETE CASCADE,
  code TEXT UNIQUE NOT NULL,
  target_url TEXT,
  created_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS referral_clicks (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  link_code TEXT,
  program_id INTEGER,
  user_id TEXT,
  opportunity_id TEXT,
  surface TEXT,
  ip_hash TEXT,
  ua TEXT,
  created_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS referral_earnings (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  program_id INTEGER,
  link_code TEXT,
  state TEXT DEFAULT 'clicked',
  amount REAL,
  currency TEXT DEFAULT 'EUR',
  external_id TEXT,
  note TEXT,
  created_at TEXT DEFAULT (datetime('now')),
  UNIQUE (program_id, external_id)
);

CREATE TABLE IF NOT EXISTS plan_state (
  user_id TEXT PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  plan TEXT DEFAULT 'free',
  cycle TEXT DEFAULT 'monthly',
  since TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS sessions (
  token TEXT PRIMARY KEY,
  user_id TEXT REFERENCES users(id) ON DELETE CASCADE,
  created_at TEXT DEFAULT (datetime('now')),
  last_seen TEXT DEFAULT (datetime('now')),
  expires_at TEXT
);

CREATE TABLE IF NOT EXISTS login_codes (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  email TEXT NOT NULL,
  code TEXT NOT NULL,
  expires_at TEXT NOT NULL,
  used INTEGER DEFAULT 0,
  created_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS brief_seen (
  user_id TEXT,
  opportunity_id TEXT,
  seen_at TEXT DEFAULT (datetime('now')),
  PRIMARY KEY (user_id, opportunity_id)
);

CREATE TABLE IF NOT EXISTS saved_searches (
  id TEXT PRIMARY KEY,
  user_id TEXT REFERENCES users(id) ON DELETE CASCADE,
  name TEXT,
  filters TEXT,
  created_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS feed_snapshots (
  user_id TEXT, day TEXT, payload TEXT, created_at TEXT DEFAULT (datetime('now')),
  PRIMARY KEY (user_id, day)
);

CREATE INDEX IF NOT EXISTS idx_opp_type ON opportunities(type, status);
CREATE INDEX IF NOT EXISTS idx_opp_country ON opportunities(country);
CREATE INDEX IF NOT EXISTS idx_opp_family ON opportunities(role_family, seniority);
CREATE INDEX IF NOT EXISTS idx_matches_user ON matches(user_id, match_score DESC);
CREATE INDEX IF NOT EXISTS idx_salary_seg ON salary_records(role_family, country, period);
CREATE INDEX IF NOT EXISTS idx_apps_user ON applications(user_id, status);
`);

module.exports = { db, DB_PATH };
