// Unit test for the one guard that stands between a model and a changed fact.
// Run: node scripts/llm-unit.cjs   (no server, no network, no key needed)
'use strict';
const LLM = require('../app/llm.cjs');

let pass = 0, fail = 0;
const failures = [];
function ok(name, cond, detail) {
  if (cond) { pass++; return; }
  fail++; failures.push(name + (detail ? ' -> ' + detail : ''));
}

// ---- keepsNumbers: the answer keeps the evidence's numbers, or it is rejected ----
const evidence = 'Your median is EUR131,790 a year, from 145 postings. You are 69% below it, a gap of EUR41,555.';

ok('keeps every number', LLM.keepsNumbers(evidence, 'Your median is EUR131,790 a year from 145 postings. That is 69% below where you are, a gap of EUR41,555.') === true);
// The threshold is 0.8 of the distinct claims, so four claims needs all four and five claims allows one
// to go. The boundary is asserted on both sides rather than assumed.
ok('drops one number of four fails, because 0.75 is under the threshold',
  LLM.keepsNumbers(evidence, 'Your median is EUR131,790 a year from 145 postings, 69% below where you are.') === false);
const five = 'Your median is EUR131,790 a year, from 145 postings, 69% below it, a gap of EUR41,555 across 12 roles.';
ok('drops one number of five passes, because 0.8 is the threshold',
  LLM.keepsNumbers(five, 'Your median is EUR131,790 a year from 145 postings, 69% below it, a gap of EUR41,555.') === true);
ok('drops two numbers of four fails',
  LLM.keepsNumbers(evidence, 'Your median is EUR131,790 a year. You are below it.') === false);
ok('invents a number by replacing the real one fails',
  LLM.keepsNumbers(evidence, 'Your median is EUR150,000 a year from 145 postings, 69% below, a gap of EUR41,555.') === false);
ok('an answer with no numbers at all fails',
  LLM.keepsNumbers(evidence, 'You are paid less than the market.') === false);
ok('an empty answer fails', LLM.keepsNumbers(evidence, '') === false);
ok('evidence with no numbers passes anything', LLM.keepsNumbers('No figures here.', 'Still no figures.') === true);
ok('a single-digit number is not counted as a claim', LLM.keepsNumbers('You have 3 gaps.', 'You have several gaps.') === true);
ok('a thousands separator is compared as written', LLM.keepsNumbers('EUR131,790', 'EUR131,790') === true);
ok('the same number twice in the evidence is one claim', LLM.keepsNumbers('145 postings, 145 records', '145 postings and records') === true);

// ---- mode: rules unless all three variables are present ----
const saved = { e: process.env.LLM_ENDPOINT, k: process.env.LLM_API_KEY, m: process.env.LLM_MODEL };
delete process.env.LLM_ENDPOINT; delete process.env.LLM_API_KEY; delete process.env.LLM_MODEL;
ok('no key means rules mode', LLM.mode() === 'rules' && LLM.available() === false);
process.env.LLM_ENDPOINT = 'https://example.test/v1/chat/completions';
ok('endpoint alone is not enough', LLM.available() === false);
process.env.LLM_API_KEY = 'test-key';
ok('endpoint and key without a model is not enough', LLM.available() === false);
process.env.LLM_MODEL = 'test-model';
ok('all three means model mode', LLM.mode() === 'model' && LLM.available() === true);

// ---- phrase: returns the evidence unchanged when there is no model to ask ----
(async () => {
  delete process.env.LLM_ENDPOINT;
  const out = await LLM.phrase(evidence);
  ok('phrase returns the evidence verbatim without a key', out === evidence, JSON.stringify(out).slice(0, 60));
  const empty = await LLM.phrase('');
  ok('phrase of nothing is nothing', empty === '');

  // Restore whatever the shell had, so sourcing this file twice is harmless.
  if (saved.e) process.env.LLM_ENDPOINT = saved.e; else delete process.env.LLM_ENDPOINT;
  if (saved.k) process.env.LLM_API_KEY = saved.k; else delete process.env.LLM_API_KEY;
  if (saved.m) process.env.LLM_MODEL = saved.m; else delete process.env.LLM_MODEL;

  console.log(`${pass} passed, ${fail} failed`);
  if (fail) { console.log(failures.join('\n')); process.exit(1); }
})();
