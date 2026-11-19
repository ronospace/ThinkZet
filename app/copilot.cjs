// UI-206 – one place that decides what a question is about.
//
// The copilot used to route with fourteen independent regexes tested in source order, so the first
// pattern that happened to match won: "what is the date today" matched the score pattern because the
// word "today" was nowhere in the date pattern, and "what's the date" matched nothing at all. Routing
// is now a scored plan: every intent declares the words that point at it, the words are weighted, and
// the highest score wins. Ties go to the intent with the more specific phrase, never to source order.
//
// The planner decides only WHAT the question is about. It never produces an answer and never touches
// the database, so it cannot invent a fact: the caller renders from records it already holds.
'use strict';

// Words that carry no topic. Removing them stops "what is my" from scoring for every intent at once.
const STOP = new Set(('a an the is are was were be been am do does did doing have has had i me my mine ' +
  'you your yours we our it its this that these those of to in on at for with about from by as and or ' +
  'but if then than so such not no nor can could should would will shall may might must please tell ' +
  'give show know want need like get got make made what which who whom whose when where why how much ' +
  'many more most some any all both each few other own same very just also only own s t don now').split(/\s+/));

// Each intent: the words that point at it (weight 2), the phrases that point at it strongly (weight 5),
// and the words that actively point away (weight -6). A negative beats an accidental positive, which is
// what keeps "what is the capital of France" out of the pay intent.
const INTENTS = [
  {
    name: 'greet',
    phrases: [['good morning', 6], ['good afternoon', 6], ['good evening', 6], ['how are you', 5]],
    words: [['hi', 4], ['hey', 4], ['hello', 4], ['yo', 3], ['hiya', 4], ['howdy', 4], ['sup', 3], ['greetings', 4]],
    against: [['date', -3], ['pay', -3]],
  },
  {
    name: 'thanks',
    phrases: [['thank you', 6], ['thanks a lot', 6]],
    words: [['thanks', 5], ['thank', 4], ['cheers', 4], ['ta', 3]],
    against: [],
  },
  {
    name: 'who',
    phrases: [['who are you', 7], ['your name', 7], ['what are you', 6], ['are you a bot', 6], ['are you human', 6], ['are you real', 6], ['what do i call you', 7], ['who am i talking to', 7]],
    words: [['zyra', 3], ['bot', 2], ['human', 2]],
    against: [['my name', -8]],
  },
  {
    name: 'myname',
    phrases: [['my name', 7], ['who am i', 7], ['what s my name', 7], ['do you know me', 6], ['my account', 5], ['my email', 6]],
    words: [['name', 2], ['account', 2], ['email', 2]],
    against: [],
  },
  {
    name: 'date',
    phrases: [['what is the date', 7], ['what s the date', 7], ['what date', 6], ['what day', 6], ['day is it', 6], ['day today', 6], ['today s date', 7], ['todays date', 7], ['which day', 6], ['current date', 6]],
    words: [['date', 5], ['today', 4], ['todays', 5], ['day', 3], ['calendar', 3]],
    against: [['update', -6], ['validate', -6], ['candidate', -6], ['data', -4], ['rate', -4], ['pay', -4], ['salary', -4], ['score', -4], ['profile', -4], ['birth', -4]],
  },
  {
    name: 'time',
    phrases: [['what time', 7], ['time is it', 7], ['current time', 6], ['the time', 4]],
    words: [['time', 4], ['clock', 5], ['now', 2]],
    against: [['full time', -6], ['part time', -6], ['time to move', -6], ['timeline', -4], ['times', -3]],
  },
  {
    name: 'profile',
    phrases: [['my profile', 7], ['my career twin', 7], ['career twin', 5], ['what do you know about me', 8], ['what have you got on me', 8], ['my record', 6], ['my details', 6], ['my seniority', 6], ['my skills', 5], ['my experience', 5], ['my years', 6], ['my target', 5], ['my current rate', 6], ['my current salary', 6], ['what is missing', 5], ['profile complete', 6], ['how complete', 6]],
    words: [['profile', 4], ['twin', 4], ['seniority', 4], ['years', 3], ['experience', 3], ['skills', 3], ['missing', 3], ['complete', 3], ['completeness', 5], ['headline', 4], ['record', 3], ['relocate', 2], ['visa', 2]],
    against: [['capital', -8]],
  },
  {
    name: 'pay',
    phrases: [['how much am i worth', 8], ['am i underpaid', 8], ['am i paid', 7], ['my worth', 7], ['rate check', 6], ['salary check', 6], ['market rate', 6], ['pay gap', 6], ['salary gap', 6]],
    words: [['pay', 4], ['salary', 4], ['rate', 3], ['worth', 4], ['underpaid', 5], ['overpaid', 5], ['money', 3], ['earn', 4], ['earning', 4], ['earnings', 4], ['compensation', 4], ['paid', 3], ['benchmark', 3], ['median', 3], ['percentile', 2]],
    against: [['capital', -8]],
  },
  {
    name: 'next',
    phrases: [['what should i do', 8], ['what next', 7], ['what s next', 7], ['next step', 7], ['next move', 7], ['where should i go', 7], ['what now', 6], ['priorit', 6], ['focus on', 5], ['best opportunity', 7], ['best opportunities', 7], ['should i apply', 6]],
    words: [['next', 4], ['prioritise', 5], ['prioritize', 5], ['priority', 5], ['focus', 4], ['best', 3], ['opportunity', 3], ['opportunities', 3], ['move', 3], ['now', 2], ['start', 3]],
    against: [['date', -4]],
  },
  {
    name: 'skills',
    phrases: [['skill gap', 8], ['skill gaps', 8], ['what should i learn', 8], ['what to learn', 7], ['which skills', 7], ['missing skills', 7], ['blocking skills', 7], ['what am i missing', 6]],
    words: [['skill', 4], ['skills', 4], ['gap', 4], ['gaps', 4], ['learn', 4], ['course', 3], ['study', 3], ['missing', 3], ['blocking', 4], ['block', 3], ['upskill', 5]],
    against: [],
  },
  {
    name: 'relocate',
    phrases: [['should i relocate', 8], ['should i move', 7], ['move abroad', 7], ['move to', 5], ['relocate to', 6], ['another country', 6], ['other countries', 6], ['work abroad', 7], ['visa sponsorship', 7], ['need a visa', 6]],
    words: [['visa', 5], ['relocate', 5], ['relocation', 5], ['move', 3], ['abroad', 5], ['country', 3], ['countries', 3], ['sponsorship', 5], ['sponsor', 4], ['emigrate', 5], ['migration', 4]],
    against: [],
  },
  {
    name: 'fit',
    phrases: [['which job', 7], ['what job', 6], ['best fit', 7], ['match me', 7], ['suited', 6], ['good fit', 6], ['which roles', 6], ['what roles', 6]],
    words: [['fit', 4], ['suited', 4], ['match', 3], ['job', 3], ['role', 3], ['roles', 3], ['suits', 4]],
    against: [],
  },
  {
    name: 'competitive',
    phrases: [['how strong', 7], ['how competitive', 7], ['stand out', 6], ['my chances', 6], ['what are my odds', 7], ['am i competitive', 7]],
    words: [['competitive', 5], ['chances', 4], ['odds', 4], ['strong', 3], ['stand', 2], ['compete', 4]],
    against: [],
  },
  {
    name: 'growth',
    phrases: [['career trajectory', 8], ['over two years', 7], ['in two years', 7], ['24 months', 6], ['next two years', 7], ['fastest path', 7], ['promotion path', 7], ['long term', 5]],
    words: [['growth', 4], ['trajectory', 5], ['promotion', 5], ['promoted', 5], ['fastest', 4], ['months', 2], ['years', 2], ['path', 4], ['ceiling', 4], ['future', 3]],
    against: [],
  },
  {
    name: 'interview',
    phrases: [['interview prep', 8], ['prepare for interview', 8], ['interview preparation', 8], ['interview questions', 7], ['get ready for', 6]],
    words: [['interview', 5], ['interviews', 5], ['prepare', 4], ['prep', 4], ['preparation', 4], ['questions', 3]],
    against: [],
  },
  {
    name: 'negotiate',
    phrases: [['how do i negotiate', 8], ['counter offer', 7], ['counteroffer', 7], ['ask for a raise', 7], ['salary negotiation', 8], ['negotiate my', 7]],
    words: [['negotiate', 6], ['negotiation', 6], ['counter', 4], ['raise', 4], ['offer', 3], ['anchor', 4], ['package', 3]],
    against: [],
  },
  {
    name: 'tracker',
    phrases: [['how many applications', 8], ['my applications', 7], ['my pipeline', 7], ['my tracker', 7], ['what have i applied', 8], ['application status', 7], ['any responses', 6], ['heard back', 6]],
    words: [['application', 4], ['applications', 4], ['applied', 4], ['tracker', 5], ['pipeline', 5], ['progress', 3], ['outcome', 4], ['outcomes', 4], ['response', 4], ['responses', 4], ['interview', 2]],
    against: [],
  },
  {
    name: 'score',
    phrases: [['career score', 8], ['my score', 7], ['how am i doing', 7], ['how do i score', 7], ['my rating', 6], ['assess me', 6]],
    words: [['score', 5], ['scores', 5], ['rating', 4], ['assess', 4], ['assessment', 4], ['employability', 4], ['percentile', 2]],
    against: [],
  },
];

function tokens(q) {
  return String(q || '')
    .toLowerCase()
    .replace(/[’']/g, ' ')
    .replace(/[^a-z0-9\s]/g, ' ')
    .split(/\s+/)
    .filter(Boolean);
}

// A word scores only when it is a whole token, so "rate" never fires inside "separate" and "pay"
// never fires inside "payload". Phrases score on the normalised string, which is why "what s the date"
// and "what's the date" reach the same intent.
function plan(question) {
  const q = String(question || '').toLowerCase().replace(/[’']/g, ' ').replace(/\s+/g, ' ').trim();
  const toks = tokens(question).filter((t) => !STOP.has(t));
  const set = new Set(toks);
  const ranked = INTENTS.map((it) => {
    let score = 0;
    const hits = [];
    for (const [phrase, w] of it.phrases || []) {
      if (q.includes(phrase)) { score += w; hits.push(phrase); }
    }
    for (const [word, w] of it.words || []) {
      if (set.has(word)) { score += w; hits.push(word); }
    }
    for (const [word, w] of it.against || []) {
      if (set.has(word) || q.includes(word)) { score += w; hits.push('-' + word); }
    }
    return { name: it.name, score, hits };
  }).sort((a, b) => b.score - a.score || b.hits.length - a.hits.length);
  const best = ranked[0];
  const second = ranked[1] || { name: null, score: 0 };
  const confident = best && best.score >= 4 && best.score > second.score;
  return {
    name: confident ? best.name : 'unknown',
    score: best ? best.score : 0,
    runnerUp: second.name,
    runnerUpScore: second.score,
    hits: best ? best.hits : [],
    ranked: ranked.slice(0, 4),
  };
}

module.exports = { plan, INTENTS, tokens, STOP };
