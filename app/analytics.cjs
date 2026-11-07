// Funnel instrumentation.
//
// Without this you cannot tell whether the product works. Every meaningful step is recorded,
// and the dashboard is built from the same events the product fires — no second source of truth.
'use strict';
const { db } = require('./db.cjs');

// The funnel, in order. Each step has the event that marks it and what it means.
const FUNNEL = [
  { key: 'visited', event: 'app.visit', label: 'Visited', meaning: 'opened the product' },
  { key: 'signed_up', event: 'auth.verified', label: 'Signed up', meaning: 'verified a login code' },
  { key: 'onboarded', event: 'profile.created', label: 'Built a twin', meaning: 'submitted a CV or loaded the demo' },
  { key: 'scored', event: 'feed.viewed', label: 'Saw scores', meaning: 'opened a scored feed' },
  { key: 'opened', event: 'opportunity.opened', label: 'Opened one', meaning: 'looked at a specific opportunity' },
  { key: 'saved', event: 'application.saved', label: 'Saved', meaning: 'tracked an opportunity' },
  { key: 'applied', event: 'application.applied', label: 'Applied', meaning: 'marked as applied' },
  { key: 'outcome', event: 'outcome.reported', label: 'Reported outcome', meaning: 'recorded a real result' },
  { key: 'paid', event: 'plan.activated', label: 'Paid', meaning: 'activated Pro' },
];

function track(userId, name, props = {}, path = null) {
  try {
    db.prepare('INSERT INTO events (user_id, name, props, path) VALUES (?,?,?,?)')
      .run(userId || null, name, JSON.stringify(props), path);
  } catch { /* analytics must never break a request */ }
}

function funnel({ sinceDays = 30, userId = null } = {}) {
  const since = `datetime('now','-${Number(sinceDays)} days')`;
  // Head-count per event, not distinct-user count: someone who opens five opportunities is
  // counted five times, because the funnel is about behaviour, not unique people.
  const rows = db.prepare(`SELECT name, COUNT(*) n
    FROM events WHERE created_at > ${since} ${userId ? 'AND user_id = ?' : ''} GROUP BY name`).all(...(userId ? [userId] : []));
  const byName = Object.fromEntries(rows.map((r) => [r.name, r]));
  // People who reached at least this step (distinct users who fired this event or any later one).
  const reached = new Set();
  const reachedByStep = {};

  let previous = null;
  const steps = FUNNEL.map((step) => {
    const row = byName[step.event] || { n: 0 };
    const conversion = previous != null && previous > 0 ? Math.round((row.n / previous) * 100) : null;
    const stepOut = { ...step, events: row.n, users: row.n, conversionFromPrevious: conversion };
    previous = row.n || previous;
    return stepOut;
  });

  // Where the biggest drop is — the only number that matters for what to fix next.
  let worst = null;
  for (let i = 1; i < steps.length; i++) {
    const drop = steps[i].conversionFromPrevious;
    if (drop != null && (worst == null || drop < worst.conversion)) worst = { step: steps[i], conversion: drop, previous: steps[i - 1] };
  }

  const top = steps[0]?.users || 0;
  const end = steps[steps.length - 1]?.users || 0;

  return {
    windowDays: sinceDays,
    steps,
    overallConversion: top ? Math.round((end / top) * 100) : 0,
    biggestDrop: worst,
    verdict: worst
      ? `The biggest leak is between "${worst.previous.label}" and "${worst.step.label}" — only ${worst.conversion}% get through. Fix that before adding anything new.`
      : 'Not enough data yet to find a leak.',
  };
}

function summary(userId, days = 14) {
  const since = `datetime('now','-${Number(days)} days')`;
  const total = db.prepare(`SELECT COUNT(*) n FROM events WHERE created_at > ${since}`).get().n;
  const byName = db.prepare(`SELECT name, COUNT(*) n FROM events WHERE created_at > ${since} GROUP BY name ORDER BY n DESC LIMIT 20`).all();
  const daily = db.prepare(`SELECT date(created_at) d, COUNT(*) n FROM events WHERE created_at > ${since} GROUP BY d ORDER BY d`).all();
  const mine = userId ? db.prepare(`SELECT name, COUNT(*) n FROM events WHERE user_id=? AND created_at > ${since} GROUP BY name ORDER BY n DESC LIMIT 10`).all(userId) : [];
  return { days, total, byName, daily, mine };
}

module.exports = { track, funnel, summary, FUNNEL };
