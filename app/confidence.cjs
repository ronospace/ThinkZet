// Confidence layer: how much should the user trust this number?
//
// A score built on three comparables and a guessed salary is not the same product as a
// score built on forty comparables with disclosed pay. Saying so is the difference between
// a tool people trust and a tool people stop using after one wrong call.
'use strict';

function band(value, thresholds) {
  for (const [min, label] of thresholds) if (value >= min) return label;
  return thresholds[thresholds.length - 1][1];
}

// Evidence quality for a single opportunity.
function opportunityConfidence(o) {
  const factors = [];
  let score = 50;

  const compDisclosed = o.comp_min != null;
  if (compDisclosed) { score += 18; factors.push({ k: 'compensation disclosed', d: '+18' }); }
  else factors.push({ k: 'no compensation disclosed', d: '-0', note: 'income potential is inferred from market, not this posting' });

  const descLen = (o.description || '').length;
  if (descLen > 800) { score += 12; factors.push({ k: 'detailed description', d: '+12' }); }
  else if (descLen < 200) { score -= 15; factors.push({ k: 'thin description', d: '-15' }); }

  if (o.visa_sponsorship === 'yes' || o.visa_sponsorship === 'no') {
    score += 8; factors.push({ k: 'sponsorship explicitly stated', d: '+8' });
  } else {
    factors.push({ k: 'sponsorship unstated', d: '-0', note: 'most employers never say — treat as unknown, not as no' });
  }

  const ageDays = o.posted_at ? (Date.now() - new Date(o.posted_at).getTime()) / 86400000 : 30;
  if (ageDays <= 7) { score += 10; factors.push({ k: 'posted this week', d: '+10' }); }
  else if (ageDays > 45) { score -= 20; factors.push({ k: `posted ${Math.round(ageDays)} days ago`, d: '-20' }); }

  if (o.source_count > 1) { score += 6; factors.push({ k: `seen on ${o.source_count} sources`, d: '+6' }); }

  const skills = Array.isArray(o.skills) ? o.skills : JSON.parse(o.skills || '[]');
  if (skills.length >= 5) { score += 6; factors.push({ k: `${skills.length} skills specified`, d: '+6' }); }
  else if (skills.length === 0) { score -= 10; factors.push({ k: 'no skills specified', d: '-10' }); }

  score = Math.max(5, Math.min(95, score));
  return {
    score,
    level: band(score, [[75, 'high'], [50, 'medium'], [0, 'low']]),
    factors,
    label: score >= 75 ? 'Well evidenced' : score >= 50 ? 'Partly evidenced' : 'Thin evidence',
  };
}

// Confidence in the rate benchmark itself.
function rateConfidence(exactComparables, sampleSize, confidenceLabel) {
  const factors = [
    { k: `${exactComparables} exact-profile comparables`, d: exactComparables >= 25 ? 'strong' : exactComparables >= 10 ? 'adequate' : 'thin' },
    { k: `${sampleSize} comparables after widening`, d: sampleSize >= 100 ? 'strong' : sampleSize >= 30 ? 'adequate' : 'thin' },
  ];
  return {
    level: confidenceLabel,
    factors,
    caveat: exactComparables < 10
      ? 'Few people with your exact profile are visible in this market right now. Widen your target or re-check in a week — the benchmark sharpens as inventory grows.'
      : null,
  };
}

module.exports = { opportunityConfidence, rateConfidence };
