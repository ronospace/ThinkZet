// Career trajectory simulator.
//
// The question nobody answers: "if I take path A instead of path B, where am I in 24 months?"
// This is a transparent model – every multiplier is visible and adjustable – not a prediction.
'use strict';
const { CURRENCY_RATES, SENIORITY_MULT } = require('./corpus.cjs');

const LEVELS = ['junior', 'mid', 'senior', 'staff', 'lead', 'principal'];
const LEVEL_INDEX = Object.fromEntries(LEVELS.map((l, i) => [l, i]));

// Typical time-to-next-level in years, by current level, in a healthy company.
const PROMOTION_YEARS = { junior: 2.0, mid: 2.5, senior: 3.0, staff: 3.5, lead: 3.0, principal: 4.0 };

// Learning a high-growth skill accelerates the next level; a declining one slows it.
function skillVelocity(skills) {
  if (!skills.length) return { velocity: 1, drivers: [] };
  const avgGrowth = skills.reduce((a, s) => a + (s.growth_rate || 0), 0) / skills.length;
  const emerging = skills.filter((s) => (s.growth_rate || 0) > 20).length;
  const declining = skills.filter((s) => (s.growth_rate || 0) < 0).length;
  const velocity = Math.max(0.7, Math.min(1.45, 1 + avgGrowth / 100 + emerging * 0.06 - declining * 0.05));
  return {
    velocity,
    drivers: [
      { k: 'Average Skill Growth', v: Math.round(avgGrowth) + '%' },
      { k: 'Emerging Skills', v: String(emerging) },
      { k: 'Declining Skills', v: String(declining) },
    ],
  };
}

function projectPath({ currentAnnual, level, skills, path, months }) {
  const years = months / 12;
  const basePromotion = PROMOTION_YEARS[level] || 3;
  const vel = skillVelocity(skills).velocity;

  // Path multipliers are assumptions, and they are shown to the user as assumptions.
  const PATHS = {
    stay: { label: 'Stay and grow in role', promotion: 1.25, raise: 0.03, risk: 0.1, note: 'Stable, slowest compounding.' },
    switch: { label: 'Switch company now', promotion: 0.75, raise: 0.12, risk: 0.35, note: 'Highest immediate jump; resets tenure and equity clock.' },
    contract: { label: 'Go contract / fractional', promotion: 1.6, raise: 0.18, risk: 0.55, note: 'Highest rate, no benefits, income is lumpy and less compounding.' },
    move_abroad: { label: 'Relocate to a higher-paying market', promotion: 1.0, raise: 0.22, risk: 0.45, note: 'Big step change, one-off relocation cost, visa risk.' },
    pivot: { label: 'Pivot into an adjacent discipline', promotion: 1.9, raise: 0.05, risk: 0.6, note: 'Resets the level for 12-18 months, then compounds faster.' },
  };
  const p = PATHS[path] || PATHS.stay;

  let salary = currentAnnual;
  let levelIdx = LEVEL_INDEX[level] ?? 2;
  let promotions = 0;
  const timeline = [];
  for (let m = 3; m <= months; m += 3) {
    const q = 0.25;
    // annualised raise, applied quarterly
    salary *= Math.pow(1 + p.raise, q);
    // promotion clock
    const effectiveYears = basePromotion / vel / p.promotion;
    if (m / 12 >= effectiveYears * (promotions + 1) && levelIdx < LEVELS.length - 1) {
      levelIdx += 1;
      promotions += 1;
      salary *= 1 + 0.12 * p.promotion; // promotion uplift
      timeline.push({ month: m, event: `promoted to ${LEVELS[levelIdx]}`, salary: Math.round(salary) });
    }
    timeline.push({ month: m, salary: Math.round(salary) });
  }

  const endSalary = Math.round(salary);
  const totalEarnings = timeline.reduce((a, t) => a + (t.salary || 0) / 4, 0);

  return {
    path,
    label: p.label,
    note: p.note,
    risk: p.risk,
    endSalary,
    totalEarnings: Math.round(totalEarnings),
    promotions,
    endLevel: LEVELS[levelIdx],
    deltaPct: Math.round(((endSalary - currentAnnual) / currentAnnual) * 100),
    timeline: timeline.filter((t) => t.event),
  };
}

function simulate({ currentAnnual, level, skills, months = 24 }) {
  const paths = ['stay', 'switch', 'contract', 'move_abroad', 'pivot']
    .map((p) => projectPath({ currentAnnual, level, skills, path: p, months }))
    .sort((a, b) => b.endSalary - a.endSalary);

  // Risk-adjusted comparison: expected value after a risk penalty, applied to BOTH the
  // earnings and the end salary so a high-rate, high-risk path cannot win on volume alone.
  const adjusted = paths
    .map((p) => ({
      ...p,
      riskAdjusted: Math.round(p.totalEarnings * (1 - p.risk * 0.35)),
      riskAdjustedSalary: Math.round(p.endSalary * (1 - p.risk * 0.25)),
    }))
    .sort((a, b) => b.riskAdjustedSalary - a.riskAdjustedSalary);

  const rawBest = paths[0];
  const safeBest = adjusted[0];

  return {
    months,
    currentAnnual,
    level,
    velocity: skillVelocity(skills),
    paths,
    bestRaw: rawBest,
    bestRiskAdjusted: safeBest,
    riskAdjusted: adjusted.map((a) => ({ path: a.path, riskAdjusted: a.riskAdjusted, riskAdjustedSalary: a.riskAdjustedSalary })),
    insight: rawBest.path === safeBest.path
      ? `Over ${months} months "${rawBest.label}" wins on both the raw and the risk-adjusted numbers (+${rawBest.deltaPct}%). The unusual part: its risk does not eat the upside.`
      : `Over ${months} months "${rawBest.label}" has the highest raw outcome (+${rawBest.deltaPct}%), but once its risk is priced in, "${safeBest.label}" produces the better expected result. The gap between those two answers is the decision.`,
    assumptions: [
      'Salary growth is applied quarterly at a path-specific annual rate.',
      'Promotion timing uses typical tenure for your level, accelerated by the growth rate of your skills.',
      'Contract income is gross and excludes holiday, pension and employer contributions.',
      'Relocation is modelled as a one-off step change, not a one-off cost – subtract relocation cost separately.',
      'This is a transparent model, not a forecast. Change the assumptions and the answer changes.',
    ],
  };
}

module.exports = { simulate, LEVELS };
