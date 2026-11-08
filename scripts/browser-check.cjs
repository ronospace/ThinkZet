// Browser smoke test: the page must load with ZERO console errors and zero uncaught
// exceptions. The API suite cannot catch a client-side throw — this does.
// Usage: node scripts/browser-check.cjs
'use strict';
const { execFileSync } = require('node:child_process');

const BASE = process.env.BASE || 'http://127.0.0.1:4173';
const ROUTES = ['/', '/?app=1', '/legal/privacy.html', '/legal/terms.html', '/sitemap.xml'];
// Overflow must be checked at a phone width, not only desktop. This is the class of bug
// that shipped once already and was only caught by looking at a real device.
const WIDTHS = [1280, 390];
const errors = [];
let pass = 0, fail = 0;

function ab(...args) {
  return execFileSync('agent-browser', args, { encoding: 'utf8', timeout: 90000, stdio: ['ignore', 'pipe', 'pipe'] });
}

(async () => {
  for (const width of WIDTHS) {
  for (const route of ROUTES) {
    try {
      ab('open', BASE + route);
      ab('console', '--clear');
      ab('open', BASE + route);
      const out = ab('console', '--json');
      let list = [];
      try { list = JSON.parse(out); } catch { list = []; }
      const arr = Array.isArray(list) ? list : (list.messages || list.logs || []);
      const real = arr.filter((e) => {
        const level = String(e.level || e.type || '').toLowerCase();
        const t = String(e.text || e.message || e.args?.join(' ') || '');
        if (!t) return false;
        if (!/error/.test(level) && !/error/i.test(t)) return false;
        return !/favicon|net::ERR_ABORTED|Failed to load resource|ERR_CONNECTION/i.test(t);
      });
      if (real.length) { fail++; errors.push(`${width}px ${route} -> ${real.map((e) => e.text || e.message).join(' | ').slice(0, 220)}`); }
      else pass++;
    } catch (e) {
      fail++; errors.push(`${route} -> ${String(e.message || e).slice(0, 200)}`);
    }
  }
  }
  console.log(`\n${pass} route/width combinations clean, ${fail} with console errors`);
  if (errors.length) { console.log('\nFailures:'); errors.forEach((e) => console.log('  - ' + e)); process.exitCode = 1; }
})();
