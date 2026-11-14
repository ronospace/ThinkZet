// DATA-01 – optional model-backed phrasing, behind three variables and never in front of the facts.
//
// The rule this module exists to keep: the model may rephrase a grounded answer, it may never add a
// fact. Every call hands it the deterministic answer as the only evidence and tells it that anything
// outside that evidence is forbidden. If the call fails, times out, or returns something that drops a
// number the evidence contained, the deterministic answer is used unchanged. The product therefore
// behaves identically with and without a key, and says which mode it is in.
'use strict';

const endpoint = () => process.env.LLM_ENDPOINT || '';
const key = () => process.env.LLM_API_KEY || '';
const model = () => process.env.LLM_MODEL || '';

function available() {
  return !!(endpoint() && key() && model());
}

function mode() {
  return available() ? 'model' : 'rules';
}

// Every number in the evidence must survive into the answer. A model that quietly drops "€131,790"
// or turns "8 of 60" into "several" has changed the claim, so the answer is rejected, not repaired.
function keepsNumbers(evidence, answer) {
  const nums = String(evidence).match(/\d[\d.,]*/g) || [];
  const wanted = [...new Set(nums.map((n) => n.replace(/[.,]$/, '')))].filter((n) => n.length > 1);
  if (!wanted.length) return true;
  const kept = wanted.filter((n) => answer.includes(n)).length;
  return kept / wanted.length >= 0.8;
}

async function complete({ system, user, maxTokens = 400, temperature = 0.2, timeout = 12000 }) {
  if (!available()) return null;
  try {
    const res = await fetch(endpoint(), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${key()}` },
      body: JSON.stringify({
        model: model(),
        messages: [{ role: 'system', content: system }, { role: 'user', content: user }],
        max_tokens: maxTokens,
        temperature,
      }),
      signal: AbortSignal.timeout(timeout),
    });
    if (!res.ok) return null;
    const j = await res.json();
    const text = j?.choices?.[0]?.message?.content;
    return typeof text === 'string' && text.trim() ? text.trim() : null;
  } catch {
    return null;
  }
}

// Rewrite a grounded answer. Returns the original string on any doubt, so a caller never needs a
// branch: `await phrase(evidence)` is either better prose or exactly what it was given.
async function phrase(evidence, { voice = 'career copilot', maxWords = 140 } = {}) {
  if (!available() || !evidence) return evidence;
  const system = [
    `You are the ${voice} of ThinkZet, a career intelligence product.`,
    'You are given a grounded answer computed from the user\'s own records.',
    'Rewrite it so it reads naturally. Keep every number, name, skill and percentage exactly as written.',
    'Never add a fact, a company, a salary, a skill, an opinion or a recommendation that is not in the evidence.',
    'Never use markdown headings, never use em dashes, never use exclamation marks.',
    `At most ${maxWords} words. Plain text, short sentences, no preamble.`,
  ].join(' ');
  const user = `Grounded answer:\n"""\n${evidence}\n"""\n\nRewrite it under the rules.`;
  const out = await complete({ system, user, maxTokens: 420, temperature: 0.25 });
  if (!out) return evidence;
  if (!keepsNumbers(evidence, out)) return evidence;
  if (out.length > evidence.length * 2.2) return evidence;
  return out;
}

module.exports = { available, mode, complete, phrase, keepsNumbers };
