const fs = require('fs');
const path = require('path');

const files = [
  ['01-executive-summary.md', 'Executive Summary'],
  ['04-market-opportunity.md', 'Market Opportunity'],
  ['05-personas.md', 'Customer Personas'],
  ['06-tam-sam-som.md', 'TAM / SAM / SOM'],
  ['07-competitive-analysis.md', 'Competitive Analysis'],
  ['08-moat-strategy.md', 'Moat Strategy'],
  ['09-revenue-model.md', 'Revenue Model'],
  ['11-gtm-strategy.md', 'Go-To-Market'],
  ['12-roadmap.md', '3-Year Roadmap'],
  ['13-exit-scenarios.md', 'Exit Scenarios'],
  ['17-financial-model.md', 'Financial Model'],
  ['18-risk-analysis.md', 'Risk Analysis'],
  ['19-founder-review.md', 'Founder Review'],
];

const esc = (s) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
function inline(t) {
  t = esc(t);
  t = t.replace(/`([^`]+)`/g, '<code>$1</code>');
  t = t.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
  t = t.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2">$1</a>');
  return t;
}

function md2html(md) {
  const lines = md.split('\n');
  const res = [];
  let i = 0;
  while (i < lines.length) {
    const l = lines[i];
    if (/^```/.test(l)) {
      const buf = []; i++;
      while (i < lines.length && !/^```/.test(lines[i])) { buf.push(esc(lines[i])); i++; }
      i++; res.push('<pre><code>' + buf.join('\n') + '</code></pre>'); continue;
    }
    if (/^\|/.test(l) && i + 1 < lines.length && /^\|[\s:|-]+\|?\s*$/.test(lines[i + 1].trim())) {
      const header = l.split('|').slice(1, -1).map((c) => c.trim());
      i += 2; const rows = [];
      while (i < lines.length && /^\|/.test(lines[i])) { rows.push(lines[i].split('|').slice(1, -1).map((c) => c.trim())); i++; }
      res.push('<div class="tw"><table><thead><tr>' + header.map((h) => '<th>' + inline(h) + '</th>').join('') +
        '</tr></thead><tbody>' + rows.map((r) => '<tr>' + r.map((c) => '<td>' + inline(c) + '</td>').join('') + '</tr>').join('') +
        '</tbody></table></div>'); continue;
    }
    if (/^-{3,}\s*$/.test(l)) { res.push('<hr/>'); i++; continue; }
    const h = l.match(/^(#{1,4})\s+(.*)$/);
    if (h) {
      const lvl = h[1].length;
      const id = h[2].toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
      res.push('<h' + lvl + ' id="' + id + '">' + inline(h[2]) + '</h' + lvl + '>'); i++; continue;
    }
    if (/^>\s?/.test(l)) {
      const buf = [];
      while (i < lines.length && /^>\s?/.test(lines[i])) { buf.push(lines[i].replace(/^>\s?/, '')); i++; }
      res.push('<blockquote>' + md2html(buf.join('\n')) + '</blockquote>'); continue;
    }
    if (/^\s*([-*]|\d+\.)\s+/.test(l)) {
      const items = [];
      while (i < lines.length && (/^\s*([-*]|\d+\.)\s+/.test(lines[i]) || (/^\s{2,}\S/.test(lines[i]) && lines[i].trim() !== ''))) {
        if (/^\s*([-*]|\d+\.)\s+/.test(lines[i])) items.push(lines[i].replace(/^\s*([-*]|\d+\.)\s+/, ''));
        else items[items.length - 1] += ' ' + lines[i].trim();
        i++;
      }
      res.push('<ul>' + items.map((t) => '<li>' + inline(t) + '</li>').join('') + '</ul>'); continue;
    }
    if (l.trim() === '') { i++; continue; }
    const buf = [];
    while (i < lines.length && lines[i].trim() !== '' && !/^[#|>`]|^\s*([-*]|\d+\.)\s/.test(lines[i])) { buf.push(lines[i]); i++; }
    if (!buf.length) { i++; continue; }
    res.push('<p>' + inline(buf.join(' ')) + '</p>');
  }
  return res.join('\n');
}

const sections = [];
for (const [file, label] of files) {
  const p = path.join(__dirname, '..', 'docs', file);
  if (!fs.existsSync(p)) continue;
  const md = fs.readFileSync(p, 'utf8');
  const body = md2html(md).replace(/<h1[^>]*>[\s\S]*?<\/h1>/, '');
  sections.push(
    '<section class="doc" id="doc-' + file.replace('.md', '') + '">' +
    '<div class="doc-label">Strategy document · ' + esc(label) + '</div>' + body + '</section>'
  );
}

const css = fs.readFileSync(path.join(__dirname, 'style.css'), 'utf8');
const hero = fs.readFileSync(path.join(__dirname, 'hero.html'), 'utf8');

const html = '<!doctype html>\n<html lang="en"><head><meta charset="utf-8"/>' +
'<meta name="viewport" content="width=device-width, initial-scale=1"/>' +
'<title>Karyvo AI — Strategy</title><style>' + css + '</style></head><body>' +
'<div class="wrap"><aside><div class="brand">Karyvo AI<small>Strategy documents<br/>7 November 2026</small></div>' +
'<a class="navlink" href="/">&larr; Back to the product</a>' +
'</aside><main>' + hero + sections.join('\n') + '</main></div></body></html>';

fs.writeFileSync(path.join(__dirname, '..', 'app', 'public', 'strategy.html'), html);
console.log('strategy.html', (html.length / 1024).toFixed(0) + 'KB', sections.length, 'docs');
