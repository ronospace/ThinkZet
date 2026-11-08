// Rebrand in one command.
//
//   node scripts/rebrand.cjs "New Name"
//
// Replaces the display brand everywhere it is user-visible, renames the storage keys, and
// leaves the repo folder alone (renaming the folder would break the running server and the
// git history for no user-facing gain). Internal identifiers stay stable on purpose:
// changing a DB table or a cookie name mid-flight loses sessions for no benefit.
'use strict';
const fs = require('node:fs');
const path = require('node:path');

const NEW = process.argv[2];
if (!NEW || NEW.startsWith('-') || NEW.trim().length < 2 || NEW.trim() === 'ThinkZet') {
  console.error('usage: node scripts/rebrand.cjs "New Name"');
  console.error('       pass a genuinely new name — running it with the current name does nothing useful.');
  process.exit(1);
}
const OLD = 'ThinkZet';
const OLD_LOWER = 'careeros';

const ROOT = path.join(__dirname, '..');
// Every text file that can contain the brand. Deliberately broad: a half-rebranded product
// is worse than either name, because the logo and the email footer disagree.
const TARGETS = [];
function walk(dir) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (entry.name === 'node_modules' || entry.name === '.git' || entry.name === 'data') continue;
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(full);
    else if (/\.(cjs|js|html|md|css|sh|webmanifest|svg|json)$/.test(entry.name) && entry.name !== 'package-lock.json') {
      TARGETS.push(path.relative(ROOT, full));
    }
  }
}
walk(path.join(ROOT, 'app'));
walk(path.join(ROOT, 'docs'));
walk(path.join(ROOT, 'scripts'));
TARGETS.push('README.md');

let changed = 0;
for (const rel of TARGETS) {
  const file = path.join(ROOT, rel);
  if (!fs.existsSync(file)) continue;
  const before = fs.readFileSync(file, 'utf8');
  let after = before.split(OLD).join(NEW);

  // Storage keys must move together or returning users lose their theme and tour state.
  after = after.split(`${OLD_LOWER}-theme`).join(`${NEW.toLowerCase().replace(/[^a-z0-9]+/g, '')}-theme`);
  after = after.split(`${OLD_LOWER}-taught`).join(`${NEW.toLowerCase().replace(/[^a-z0-9]+/g, '')}-taught`);
  after = after.split(`${OLD_LOWER}-visit`).join(`${NEW.toLowerCase().replace(/[^a-z0-9]+/g, '')}-visit`);

  if (after !== before) {
    fs.writeFileSync(file, after);
    changed++;
    console.log('  updated', rel);
  }
}
console.log(`\nRebranded to "${NEW}" across ${changed} files.`);
console.log('Not changed on purpose: the repo folder name, the database file, the session cookie name,');
console.log('the email addresses in test fixtures, and the git history. None of those are user-visible.');
