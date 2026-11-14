// Currency conversion for display only. The corpus reports salaries in EUR, so a market page that
// prints GBP, USD or PLN is showing a converted figure and must say so, with the date of the rate.
//
// One rate table, fetched once and cached, with the capture date carried alongside it. If the fetch
// fails the table is null and callers fall back to the reporting currency rather than inventing a
// number: an unconverted EUR figure labelled EUR is honest, a guessed rate is not.
const ENDPOINT = 'https://api.frankfurter.dev/v1/latest?base=EUR';
const TTL_MS = 12 * 60 * 60 * 1000;

let cache = { rates: null, asOf: null, fetchedAt: 0, pending: null };

async function refresh() {
  const res = await fetch(ENDPOINT, { headers: { accept: 'application/json' } });
  if (!res.ok) throw new Error(`fx ${res.status}`);
  const body = await res.json();
  const rates = { EUR: 1, ...(body.rates || {}) };
  cache = { rates, asOf: body.date || null, fetchedAt: Date.now(), pending: null };
  return cache;
}

// Never blocks a request on the network: the first caller gets the cached table if there is one,
// otherwise null, and a refresh runs in the background for the next caller.
function table() {
  if (cache.rates && Date.now() - cache.fetchedAt < TTL_MS) return cache;
  if (!cache.pending) cache.pending = refresh().catch(() => { cache.pending = null; return cache; });
  return cache.rates ? cache : { rates: null, asOf: null, fetchedAt: 0 };
}

function supported(code) {
  const t = table();
  return !!(t.rates && t.rates[String(code || '').toUpperCase()]);
}

// Returns { amount, currency, converted, asOf } - converted is false when the target is EUR or when
// no rate is available, and the caller prints the reporting currency in that case.
function convert(amount, target) {
  const to = String(target || 'EUR').toUpperCase();
  if (amount == null || !Number.isFinite(Number(amount))) return { amount: null, currency: to, converted: false, asOf: null };
  if (to === 'EUR') return { amount: Math.round(Number(amount)), currency: 'EUR', converted: false, asOf: null };
  const t = table();
  const rate = t.rates && t.rates[to];
  if (!rate) return { amount: Math.round(Number(amount)), currency: 'EUR', converted: false, asOf: null };
  return { amount: Math.round(Number(amount) * rate), currency: to, converted: true, asOf: t.asOf };
}

module.exports = { table, supported, convert };
