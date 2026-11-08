// Interview preparation.
//
// Built from what the posting actually asks for plus the user's own gaps. The questions are
// derived, not scraped; the answer scaffolds use only real experience from the profile.
'use strict';

const QUESTION_BANK = {
  data_science: [
    { q: 'Walk me through a model you shipped to production. What did it do, and what broke?', probe: 'They are testing whether you own outcomes or only notebooks.', evidence: 'Use a model you actually deployed. Name the failure mode.' },
    { q: 'How do you decide whether a result is real and not noise?', probe: 'Statistical judgement under commercial pressure.', evidence: 'Describe your experimentation process end to end.' },
    { q: 'Tell me about an experiment you killed. Why?', probe: 'Willingness to say no to a result you wanted.', evidence: 'A concrete experiment and the decision it forced.' },
    { q: 'How do you explain a model\'s behaviour to a non-technical stakeholder?', probe: 'Communication is half of this job.', evidence: 'An actual stakeholder and what you said.' },
  ],
  ml_engineering: [
    { q: 'Design the serving path for a model that must return in under 100ms.', probe: 'Systems thinking, not modelling.', evidence: 'Talk about batching, caching, and where you would fail fast.' },
    { q: 'How do you detect that a deployed model has degraded?', probe: 'Whether you think in production or in notebooks.', evidence: 'Monitoring you actually built.' },
    { q: 'What is the hardest model you have had to make cheap enough to run?', probe: 'Cost awareness.', evidence: 'Numbers: latency, cost, what you traded away.' },
  ],
  ai_engineering: [
    { q: 'Describe a RAG system you built. What did you measure, and what did you change because of it?', probe: 'Evaluation discipline over demo-building.', evidence: 'Retrieval metrics, failure analysis, iterations.' },
    { q: 'How do you stop an LLM feature from confidently making things up?', probe: 'Grounding and guardrails.', evidence: 'Concrete guardrails you shipped.' },
    { q: 'What is the cost per request of your system, and how did you bring it down?', probe: 'Production economics.', evidence: 'A real number and a real optimisation.' },
  ],
  data_engineering: [
    { q: 'Walk me through a pipeline you built that had to be trustworthy. How did you know it was?', probe: 'Correctness culture.', evidence: 'Tests, contracts, alerting.' },
    { q: 'A daily job silently produces wrong numbers for three weeks. What happens next?', probe: 'Incident thinking.', evidence: 'Detection, backfill, prevention.' },
  ],
  backend: [
    { q: 'Describe the most complex system you have designed. What would you do differently?', probe: 'Judgement and reflection.', evidence: 'Trade-offs, not a feature list.' },
    { q: 'Tell me about a production incident you caused or fixed.', probe: 'Ownership under pressure.', evidence: 'The actual sequence, and what changed after.' },
    { q: 'How do you decide when a monolith should be split?', probe: 'Pragmatism over fashion.', evidence: 'A decision you made and its cost.' },
  ],
  frontend: [
    { q: 'How do you keep a large frontend fast as it grows?', probe: 'Performance as a discipline.', evidence: 'Metrics you tracked, regressions you caught.' },
    { q: 'Tell me about a UI decision you fought for. What was the outcome?', probe: 'Product judgement.', evidence: 'The disagreement and the data.' },
  ],
  platform: [
    { q: 'What is the hardest reliability problem you have solved?', probe: 'Depth under real constraints.', evidence: 'SLOs, failure modes, what you measured.' },
    { q: 'How do you make a deploy boring?', probe: 'Whether you have actually owned deploys.', evidence: 'Rollback, canaries, the first time it went wrong.' },
  ],
  mobile: [
    { q: 'What is the hardest mobile performance problem you have hit?', probe: 'Device-level thinking.', evidence: 'Frame budgets, memory, real devices.' },
    { q: 'How do you ship a mobile release without breaking users on old versions?', probe: 'Backwards compatibility.', evidence: 'Versioning strategy you have run.' },
  ],
  product: [
    { q: 'Tell me about a feature you killed after building it. What did you learn?', probe: 'Evidence over ego.', evidence: 'The metric that changed your mind.' },
    { q: 'How do you decide what not to build?', probe: 'Prioritisation judgement.', evidence: 'A concrete trade-off you made.' },
  ],
  security: [
    { q: 'Describe a vulnerability you found and how you handled disclosure.', probe: 'Judgement and ethics.', evidence: 'The process, not just the bug.' },
  ],
  design: [
    { q: 'Show me a design decision that tested badly. What did you do?', probe: 'Response to evidence.', evidence: 'The test and what it changed.' },
  ],
  default: [
    { q: 'Walk me through the project you are most proud of and why.', probe: 'What you value, and how you reason.', evidence: 'Specifics: scope, constraints, outcome.' },
    { q: 'Tell me about a time you disagreed with a decision. What happened?', probe: 'How you handle conflict.', evidence: 'What you did, not what you felt.' },
    { q: 'What are you trying to get better at right now, and how?', probe: 'Self-awareness and honesty.', evidence: 'A real gap and a real practice.' },
  ],
};

const BEHAVIOURAL = [
  { q: 'Tell me about a time you shipped something that failed. What did you do next?', probe: 'Ownership without defensiveness.' },
  { q: 'Describe a disagreement with a manager or stakeholder. How did it resolve?', probe: 'Influence without authority.' },
  { q: 'What is the hardest feedback you have received?', probe: 'Receptiveness and self-knowledge.' },
  { q: 'How do you decide what to work on when everything is urgent?', probe: 'Prioritisation under pressure.' },
];

function buildPlan(profile, twin, opportunity, missingSkills) {
  const family = opportunity.role_family || 'default';
  const familyQs = QUESTION_BANK[family] || QUESTION_BANK.default;
  const skills = (twin.skillDetail || []).map((s) => s.canonical);
  const oppSkills = Array.isArray(opportunity.skills) ? opportunity.skills : JSON.parse(opportunity.skills || '[]');
  const matched = oppSkills.filter((s) => skills.includes(s));

  // Gap questions are the ones that actually decide the interview.
  const gapQuestions = missingSkills.slice(0, 2).map((s) => ({
    q: `This role uses ${s}, which is not yet on your profile. How would you get productive in it in the first month?`,
    probe: 'Learning velocity and honesty about gaps.',
    evidence: `Name a specific comparable you have learned fast – and say plainly that ${s} is new.`,
  }));

  const roleQuestions = [...familyQs.slice(0, 3), ...gapQuestions, ...BEHAVIOURAL.slice(0, 2)];

  const star = (q) => ({
    q: q.q,
    probe: q.probe,
    structure: {
      situation: 'One sentence of context – where, when, what was at stake.',
      task: 'What you specifically owned. Not the team – you.',
      action: 'Two or three decisions you made, in order.',
      result: 'A number. If there is no number, say what changed instead.',
    },
    evidence: q.evidence || 'Use something you actually did.',
  });

  const prepPlan = [
    { day: 'Day 1', focus: `Re-read the ${opportunity.title} posting and write down the three things they care most about.`, why: 'Most candidates never do this, and it shows.' },
    { day: 'Day 1', focus: `Draft STAR answers for ${Math.min(3, roleQuestions.length)} questions using real projects.`, why: 'Structured answers beat improvised ones by a wide margin.' },
    { day: 'Day 2', focus: `Prepare one honest answer about ${missingSkills[0] || 'a gap'} and how you would close it.`, why: 'Gaps are tested. Denying them is the failure mode.' },
    { day: 'Day 3', focus: `Rehearse the compensation conversation: know your floor, target and walk-away.`, why: 'The number you cannot say out loud is the number you will not get.' },
    { day: 'Day 4', focus: 'Prepare three questions that show you have thought about their problem, not their perks.', why: 'Questions signal seniority more than answers do.' },
  ];

  const questionsToAsk = [
    `What does success look like in this role after six months?`,
    `What is the hardest part of the ${opportunity.role_family ? opportunity.role_family.replace(/_/g, ' ') : 'team'} problem right now?`,
    `How are technical decisions made, and who decides?`,
    `What would make you regret this hire in a year?`,
    `How is compensation reviewed – and against what?`,
  ];

  return {
    role: opportunity.title,
    company: opportunity.company,
    family,
    matchedSkills: matched,
    gapSkills: missingSkills.slice(0, 4),
    questions: roleQuestions.map(star),
    questionsToAsk,
    prepPlan,
    note: 'Questions are derived from the posting\'s role family and your own skill gaps. Every scaffold asks you to use something you actually did – none of them hand you a fabricated answer.',
  };
}

module.exports = { buildPlan, QUESTION_BANK };
