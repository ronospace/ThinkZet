// One global market registry. No country is the default and no country is the home market: a market
// is a configuration record, and every route, page, currency and language reads from here.
//
// Three settings stay separate on purpose, because they are three different questions:
//   market   - which labour market the numbers describe      (/de)
//   language - which language the interface is written in    (?lang=de, or Accept-Language)
//   currency - which currency money is printed in            (market currency, overridable)
//
// A market route is valid when this registry knows the code. The sitemap lists only markets that
// also have enough live postings to defend a page, so a route can never be listed and 404, and a
// route can never 404 while the sitemap advertises it.
const MARKETS = {
  ae: { name: 'United Arab Emirates', currency: 'AED', lang: 'en', region: 'Middle East' },
  ar: { name: 'Argentina', currency: 'ARS', lang: 'es', region: 'Latin America' },
  at: { name: 'Austria', currency: 'EUR', lang: 'de', region: 'Europe' },
  au: { name: 'Australia', currency: 'AUD', lang: 'en', region: 'Asia Pacific' },
  be: { name: 'Belgium', currency: 'EUR', lang: 'nl', region: 'Europe' },
  bg: { name: 'Bulgaria', currency: 'BGN', lang: 'en', region: 'Europe' },
  br: { name: 'Brazil', currency: 'BRL', lang: 'pt', region: 'Latin America' },
  ca: { name: 'Canada', currency: 'CAD', lang: 'en', region: 'North America' },
  ch: { name: 'Switzerland', currency: 'CHF', lang: 'de', region: 'Europe' },
  cl: { name: 'Chile', currency: 'CLP', lang: 'es', region: 'Latin America' },
  cn: { name: 'China', currency: 'CNY', lang: 'en', region: 'Asia Pacific' },
  co: { name: 'Colombia', currency: 'COP', lang: 'es', region: 'Latin America' },
  cz: { name: 'Czechia', currency: 'CZK', lang: 'en', region: 'Europe' },
  de: { name: 'Germany', currency: 'EUR', lang: 'de', region: 'Europe' },
  dk: { name: 'Denmark', currency: 'DKK', lang: 'en', region: 'Europe' },
  ee: { name: 'Estonia', currency: 'EUR', lang: 'en', region: 'Europe' },
  eg: { name: 'Egypt', currency: 'EGP', lang: 'en', region: 'Middle East' },
  es: { name: 'Spain', currency: 'EUR', lang: 'es', region: 'Europe' },
  fi: { name: 'Finland', currency: 'EUR', lang: 'en', region: 'Europe' },
  fr: { name: 'France', currency: 'EUR', lang: 'fr', region: 'Europe' },
  gb: { name: 'United Kingdom', currency: 'GBP', lang: 'en', region: 'Europe' },
  gr: { name: 'Greece', currency: 'EUR', lang: 'en', region: 'Europe' },
  hk: { name: 'Hong Kong', currency: 'HKD', lang: 'en', region: 'Asia Pacific' },
  hr: { name: 'Croatia', currency: 'EUR', lang: 'en', region: 'Europe' },
  hu: { name: 'Hungary', currency: 'HUF', lang: 'en', region: 'Europe' },
  id: { name: 'Indonesia', currency: 'IDR', lang: 'en', region: 'Asia Pacific' },
  ie: { name: 'Ireland', currency: 'EUR', lang: 'en', region: 'Europe' },
  il: { name: 'Israel', currency: 'ILS', lang: 'en', region: 'Middle East' },
  in: { name: 'India', currency: 'INR', lang: 'en', region: 'Asia Pacific' },
  it: { name: 'Italy', currency: 'EUR', lang: 'it', region: 'Europe' },
  jp: { name: 'Japan', currency: 'JPY', lang: 'en', region: 'Asia Pacific' },
  ke: { name: 'Kenya', currency: 'KES', lang: 'en', region: 'Africa' },
  kr: { name: 'South Korea', currency: 'KRW', lang: 'en', region: 'Asia Pacific' },
  lt: { name: 'Lithuania', currency: 'EUR', lang: 'en', region: 'Europe' },
  lu: { name: 'Luxembourg', currency: 'EUR', lang: 'fr', region: 'Europe' },
  lv: { name: 'Latvia', currency: 'EUR', lang: 'en', region: 'Europe' },
  ma: { name: 'Morocco', currency: 'MAD', lang: 'fr', region: 'Africa' },
  mx: { name: 'Mexico', currency: 'MXN', lang: 'es', region: 'Latin America' },
  my: { name: 'Malaysia', currency: 'MYR', lang: 'en', region: 'Asia Pacific' },
  ng: { name: 'Nigeria', currency: 'NGN', lang: 'en', region: 'Africa' },
  nl: { name: 'Netherlands', currency: 'EUR', lang: 'nl', region: 'Europe' },
  no: { name: 'Norway', currency: 'NOK', lang: 'en', region: 'Europe' },
  nz: { name: 'New Zealand', currency: 'NZD', lang: 'en', region: 'Asia Pacific' },
  ph: { name: 'Philippines', currency: 'PHP', lang: 'en', region: 'Asia Pacific' },
  pk: { name: 'Pakistan', currency: 'PKR', lang: 'en', region: 'Asia Pacific' },
  pl: { name: 'Poland', currency: 'PLN', lang: 'pl', region: 'Europe' },
  pt: { name: 'Portugal', currency: 'EUR', lang: 'pt', region: 'Europe' },
  ro: { name: 'Romania', currency: 'RON', lang: 'en', region: 'Europe' },
  rs: { name: 'Serbia', currency: 'RSD', lang: 'en', region: 'Europe' },
  sa: { name: 'Saudi Arabia', currency: 'SAR', lang: 'en', region: 'Middle East' },
  se: { name: 'Sweden', currency: 'SEK', lang: 'en', region: 'Europe' },
  sg: { name: 'Singapore', currency: 'SGD', lang: 'en', region: 'Asia Pacific' },
  si: { name: 'Slovenia', currency: 'EUR', lang: 'en', region: 'Europe' },
  sk: { name: 'Slovakia', currency: 'EUR', lang: 'en', region: 'Europe' },
  th: { name: 'Thailand', currency: 'THB', lang: 'en', region: 'Asia Pacific' },
  tr: { name: 'Turkey', currency: 'TRY', lang: 'en', region: 'Middle East' },
  tw: { name: 'Taiwan', currency: 'TWD', lang: 'en', region: 'Asia Pacific' },
  ua: { name: 'Ukraine', currency: 'UAH', lang: 'en', region: 'Europe' },
  us: { name: 'United States', currency: 'USD', lang: 'en', region: 'North America' },
  vn: { name: 'Vietnam', currency: 'VND', lang: 'en', region: 'Asia Pacific' },
  za: { name: 'South Africa', currency: 'ZAR', lang: 'en', region: 'Africa' },
};

// A country code that people type but ISO does not use for the market they mean. Resolved by a
// permanent redirect, never by a second page, so there is exactly one address per market.
const ALIAS = { uk: 'gb', el: 'gr', en: 'gb' };

const LANGS = ['en', 'de', 'nl', 'fr', 'es', 'pt', 'it', 'pl'];
const LANG_NAME = { en: 'English', de: 'Deutsch', nl: 'Nederlands', fr: 'Français', es: 'Español', pt: 'Português', it: 'Italiano', pl: 'Polski' };

const has = (cc) => Object.prototype.hasOwnProperty.call(MARKETS, String(cc || '').toLowerCase());
const get = (cc) => MARKETS[String(cc || '').toLowerCase()] || null;
const alias = (cc) => ALIAS[String(cc || '').toLowerCase()] || null;
const names = () => Object.fromEntries(Object.entries(MARKETS).map(([k, v]) => [k, v.name]));

// A country is written in the language of the page that names it. Only the markets the sitemap can
// defend carry a local spelling; anything else falls back to the registry's own name rather than a
// half-translated guess.
const LOCAL_NAME = {
  de: { de: 'Deutschland' }, at: { de: 'Österreich' }, ch: { de: 'Schweiz' },
  gb: { de: 'Vereinigtes Königreich' }, us: { de: 'Vereinigte Staaten' },
  ie: { de: 'Irland' }, nl: { de: 'Niederlande' }, pl: { de: 'Polen' },
  pt: { de: 'Portugal' }, se: { de: 'Schweden' }, es: { de: 'Spanien' },
  fr: { de: 'Frankreich' }, ca: { de: 'Kanada' }, ae: { de: 'Vereinigte Arabische Emirate' },
  in: { de: 'Indien' }, it: { de: 'Italien' }, be: { de: 'Belgien' }, dk: { de: 'Dänemark' },
  fi: { de: 'Finnland' }, no: { de: 'Norwegen' }, cz: { de: 'Tschechien' },
};
const nameIn = (cc, lang) => {
  const k = String(cc || '').toLowerCase();
  const rec = MARKETS[k];
  if (!rec) return '';
  const local = LOCAL_NAME[k];
  return (local && lang && local[lang]) || rec.name;
};

// The market a request is about, in order: an explicit query parameter, the route, the profile, the
// browser's own language header. Nothing is assumed and nothing is locked in: the caller can always
// pass a different market, and the interface can always be switched to another language.
function fromRequest(req, url, explicit) {
  const q = url && url.searchParams ? url.searchParams : null;
  const wanted = String(explicit || (q && q.get('market')) || '').toLowerCase();
  if (has(wanted)) return wanted;
  const path = url ? url.pathname : '';
  const m = /^\/([a-z]{2})\/?$/.exec(path);
  if (m && has(m[1])) return m[1];
  const hdr = String((req && req.headers && req.headers['accept-language']) || '');
  for (const part of hdr.split(',')) {
    const tag = part.trim().split(';')[0].toLowerCase();
    const region = /^[a-z]{2}-([a-z]{2})$/.exec(tag);
    if (region && has(region[1])) return region[1];
    if (has(tag)) return tag;
  }
  return null;
}

// Language is its own setting: the market suggests one, the visitor decides.
function languageFor(req, url, market) {
  const q = url && url.searchParams ? url.searchParams : null;
  const wanted = String((q && q.get('lang')) || '').toLowerCase();
  if (LANGS.includes(wanted)) return wanted;
  const hdr = String((req && req.headers && req.headers['accept-language']) || '');
  for (const part of hdr.split(',')) {
    const tag = part.trim().split(';')[0].toLowerCase().slice(0, 2);
    if (LANGS.includes(tag)) return tag;
  }
  return (market && MARKETS[market] && MARKETS[market].lang) || 'en';
}

function config(cc, lang) {
  const code = has(cc) ? String(cc).toLowerCase() : null;
  const rec = code ? MARKETS[code] : null;
  return {
    code,
    name: rec ? rec.name : null,
    currency: rec ? rec.currency : 'EUR',
    region: rec ? rec.region : null,
    language: LANGS.includes(lang) ? lang : (rec ? rec.lang : 'en'),
    languages: LANGS.map((l) => ({ code: l, name: LANG_NAME[l] })),
    url: code ? `/${code}` : '/',
  };
}

// hreflang alternates for one market page: every market that can defend a page, plus x-default.
// The tag names the language the page is actually written in and the market it describes, so an
// English page about the German market is `en-de`, never a bare `de` that promises German words.
function alternates(origin, codes, lang) {
  const list = (codes || []).filter(has);
  const l = LANGS.includes(lang) ? lang : 'en';
  return list.map((c) => ({ hreflang: `${l}-${c}`, href: `${origin}/${c}` }))
    .concat([{ hreflang: l, href: `${origin}/` }, { hreflang: 'x-default', href: `${origin}/` }]);
}

module.exports = { MARKETS, ALIAS, LANGS, LANG_NAME, has, get, alias, names, nameIn, fromRequest, languageFor, config, alternates };
