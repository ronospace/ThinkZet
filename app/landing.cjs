// Renders the landing hero's first paint on the server.
//
// The page used to ship empty placeholders and fill them from two fetches after load, so a visitor
// saw three dashes, "Reading the live corpus…" and a card that grew when the data arrived. The same
// numbers are now printed into the initial response from a validated cache, and the client replaces
// them only when the visitor changes something.
//
// One payload, two renderers: the markup here uses the same class names the client prints, and both
// read the same object, so a figure can never disagree with itself. No number is invented here.

const NUM = new Intl.NumberFormat('en-GB');
const int = (n) => (n == null || n === '' || Number.isNaN(Number(n)) ? '–' : NUM.format(Math.round(Number(n))));
const money = (n, cur = 'EUR', d = 0) =>
  n == null ? '–' : new Intl.NumberFormat('en-GB', { style: 'currency', currency: cur, maximumFractionDigits: d }).format(n);
const esc = (s) => String(s == null ? '' : s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

const SMALL = new Set(['of', 'and', 'the', 'for', 'to', 'in', 'on', 'at', 'by', 'or', 'a', 'an']);
function titleCase(s) {
  return String(s || '')
    .split(/\s+/)
    .filter(Boolean)
    .map((w, i) => (i > 0 && SMALL.has(w.toLowerCase()) ? w.toLowerCase() : w.charAt(0).toUpperCase() + w.slice(1)))
    .join(' ');
}

const scoreTone = (n) => (n >= 75 ? '' : n >= 55 ? 'mid' : 'low');

// Which pool the benchmark was actually computed from. A country pool is named by its country; a
// currency or global pool is named by its currency area, because claiming a country would be a lie.
function srcLabel(b, de) {
  if (b.mode === 'country' && b.sourceMarket) return b.sourceMarket;
  const cur = b.sourceCurrency || 'EUR';
  return de ? `${cur}-Raum` : `${cur} area`;
}

function rangeHTML(b, lang) {
  const cur = b.currency || 'EUR';
  const per = b.period === 'hour' ? '/hr' : '/yr';
  const min = b.p25 * 0.92;
  const max = b.p90 * 1.05;
  const pos = (x) => Math.max(0, Math.min(100, ((x - min) / (max - min)) * 100));
  const de = lang === 'de';
  // A converted figure says so, names the market it came from and the date of the rate, and never
  // presents itself as local evidence.
  const conv = b.estimated
    ? `<span class="tp-chip tp-chip-est">${de
      ? `Geschätzter umgerechneter Benchmark · Quelle ${esc(srcLabel(b, true))} · Kurs vom ${esc(b.rateAsOf || 'letzten')}`
      : `Estimated converted benchmark · source ${esc(srcLabel(b, false))} · rate ${esc(b.rateAsOf || 'latest')}`}</span>`
    : '';
  return `<div class="tp-range">
      <div class="tp-rk">${de ? 'Marktspanne' : 'Market range'} · ${esc(titleCase(b.segment || ''))}${b.estimated ? ` <span class="tp-est">${de ? 'geschätzt' : 'estimated'}</span>` : ''}</div>
      <div class="tp-med">${money(b.p50, cur)}${per}<small>${de ? 'Median' : 'median'}</small></div>
      <div class="tp-track" role="img" aria-label="${de ? 'Gehaltsspanne' : 'Salary range'} ${money(b.p25, cur)} ${de ? 'bis' : 'to'} ${money(b.p75, cur)}, ${de ? 'Median' : 'median'} ${money(b.p50, cur)}">
        <div class="band" style="left:${pos(b.p25)}%;width:${Math.max(2, pos(b.p75) - pos(b.p25))}%"></div>
        <div class="mid" style="left:${pos(b.p50)}%"></div>
      </div>
      <div class="tp-scale"><span>P25 <b>${money(b.p25, cur)}</b></span><span>P50 <b>${money(b.p50, cur)}</b></span><span>P75 <b>${money(b.p75, cur)}</b></span></div>
      <div class="tp-meta">
        <span class="tp-chip">${esc(cur)}</span>
        <span class="tp-chip">${int(b.sampleSize)} ${de ? 'Anzeigen' : 'postings'}</span>
        <span class="tp-chip">${esc(titleCase(b.confidence || 'unknown'))} ${de ? 'Aussagekraft' : 'confidence'}</span>
        ${conv}
      </div>
    </div>`;
}

function oppsHTML(list, lang) {
  const de = lang === 'de';
  if (!list || !list.length) {
    return `<div class="tp-empty">${de ? 'Keine bewertete Chance passte zu diesem Profil im aktuellen Bestand. Das vollständige Produkt bewertet jede offene Anzeige.' : 'No scored opportunity matched this profile in the current corpus. The full product scores every open posting.'}</div>`;
  }
  const thin =
    list.length === 1
      ? `<div class="tp-note">${
          de
            ? 'Nur eine Anzeige in diesem Markt nennt das Gehalt. Das vollständige Produkt bewertet jede offene Anzeige.'
            : 'Only one role in this market discloses pay. The full product scores every open posting.'
        }</div>`
      : '';
  return `<div class="tp-opps">${list
    .map((o) => {
      const where = o.remote === 'remote' ? (de ? 'Remote' : 'Remote') : [o.city, o.country].filter(Boolean).join(', ') || (de ? 'Ort nicht angegeben' : 'Location not stated');
      const per = o.period === 'hour' ? '/hr' : o.period === 'year' ? '/yr' : '';
      const pay = o.compMin != null
        ? `${money(o.compMin, o.currency || 'EUR')}${o.compMax != null && o.compMax !== o.compMin ? '–' + money(o.compMax, o.currency || 'EUR') : ''}${per}`
        : de ? 'Keine Gehaltsangabe' : 'Salary undisclosed';
      return `<div class="tp-opp">
      <div class="tp-score ${scoreTone(o.matchScore)}" aria-label="${de ? 'Passung' : 'Match score'} ${o.matchScore} ${de ? 'von 100' : 'out of 100'}">${int(o.matchScore)}</div>
      <div class="tp-oi">
        <div class="tp-ot">${esc(o.title || (de ? 'Rolle ohne Titel' : 'Untitled role'))}</div>
        <div class="tp-os">${esc(where)}</div>
        <div class="tp-op">${esc(pay)}</div>
      </div>
    </div>`;
    })
    .join('')}${thin}</div>`;
}

function previewHTML(data, lang) {
  if (!data || data.available === false || !data.benchmark) {
    const reason = (data && data.reason) || (lang === 'de'
      ? 'Zu wenige Live-Gehaltsangaben für diese Rolle und diesen Markt.'
      : 'Insufficient live salary data for this role and market.');
    return `<div class="tp-empty">${esc(reason)}</div>`;
  }
  const foot = data.topSkill
    ? `<div class="tp-foot">${lang === 'de' ? 'Stärkste Skill-Chance' : 'Top skill opportunity'}: <b>${esc(data.topSkill)}</b></div>`
    : '';
  return rangeHTML(data.benchmark, lang) + oppsHTML(data.opportunities, lang) + foot;
}

function proofHTML(p, lang) {
  const de = lang === 'de';
  // No aggregate means no cards. Three dashes and a promise that something is still loading is the
  // state this whole change exists to remove, so the bar is dropped and one line says why.
  if (!p || p.available === false || p.paidBelowPct == null) {
    return { available: false, src: de ? 'Kennzahlen sind gerade nicht verfügbar.' : 'Aggregate figures are unavailable right now.' };
  }
  const conv = p.gapConverted
    ? de
      ? ` Umgerechnet aus ${esc(p.reportingCurrency)} zum Kurs vom ${esc(p.rateAsOf || 'letzten')}.`
      : ` Converted from ${esc(p.reportingCurrency)} at the ${esc(p.rateAsOf || 'latest')} rate.`
    : '';
  const postings = de ? 'Live-Anzeigen' : 'live postings';
  const disclosed = de ? 'mit Gehaltsangabe' : 'with pay disclosed';
  const how = de ? 'Wie diese Zahlen berechnet werden' : 'How these are computed';
  return {
    available: true,
    below: `${p.paidBelowPct}%`,
    gap: p.gapAmount == null ? '–' : money(p.gapAmount, p.gapCurrency),
    hidden: p.undisclosedPct == null ? '–' : `${p.undisclosedPct}%`,
    src: `${int(p.openPostings)} ${postings}, ${int(p.withPay)} ${disclosed}.${conv} <a href="#how">${esc(how)}</a>`,
  };
}

module.exports = { previewHTML, proofHTML, rangeHTML, oppsHTML, srcLabel, int, money, esc, titleCase };
