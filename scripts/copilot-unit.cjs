// UI-206 – the planner is tested on its own, without a server, a database or a session.
// Every case names the intent the question must reach. A case that reaches a different intent is a
// routing bug, not a wording preference, so the script exits non-zero.
'use strict';
const { plan } = require('../app/copilot.cjs');

const CASES = [
  ['hello', 'greet'], ['hi there', 'greet'], ['good morning', 'greet'],
  ['thanks', 'thanks'], ['thank you', 'thanks'],
  ['who are you', 'who'], ['what are you', 'who'],
  ['what is my name', 'myname'], ['who am i', 'myname'], ['do you know me', 'myname'],
  ['what is the date today', 'date'], ["what's the date", 'date'], ['what date is it', 'date'],
  ['what day is it', 'date'], ["today's date", 'date'], ['which day is today', 'date'],
  ['what is today', 'date'], ['date', 'date'],
  ['what time is it', 'time'], ['current time', 'time'],
  ['what do you know about me', 'profile'], ['my profile', 'profile'],
  ['how complete is my profile', 'profile'], ['what is missing from my profile', 'profile'],
  ['my seniority', 'profile'],
  ['am i underpaid', 'pay'], ['how much am i worth', 'pay'], ['what is my market rate', 'pay'],
  ['what should i do next', 'next'], ['what next', 'next'], ['where should i focus', 'next'],
  ['which skills block me', 'skills'], ['what should i learn', 'skills'], ['skill gaps', 'skills'],
  ['should i relocate', 'relocate'], ['do i need a visa', 'relocate'],
  ['which job fits me', 'fit'], ['best fit', 'fit'],
  ['how competitive am i', 'competitive'], ['what are my chances', 'competitive'],
  ['career trajectory', 'growth'], ['what is my growth path', 'growth'], ['over 24 months', 'growth'],
  ['interview prep', 'interview'], ['prepare for interview', 'interview'],
  ['how do i negotiate', 'negotiate'], ['salary negotiation', 'negotiate'],
  ['how many applications have i sent', 'tracker'], ['my pipeline', 'tracker'],
  ['what is my career score', 'score'], ['how am i doing', 'score'],
  ['what is the capital of France', 'unknown'], ['tell me a joke', 'unknown'],
  ['how do i cook pasta', 'unknown'], ['who won the world cup', 'unknown'],
];

let failed = 0;
for (const [q, want] of CASES) {
  const p = plan(q);
  if (p.name !== want) {
    failed++;
    console.log(`FAIL ${q} -> ${p.name} (want ${want}) score=${p.score} second=${p.runnerUp}:${p.runnerUpScore}`);
  }
}
console.log(`${CASES.length - failed} passed, ${failed} failed`);
process.exit(failed ? 1 : 0);
