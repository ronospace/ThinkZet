# /de indexing check

Verified 17 November 2026 against production, `7d6687f`.

**Conclusion: nothing on the site blocks `/de`. The Search Console submission error is theirs, not ours.** Every signal a crawler reads is present and correct.

---

## 1. Sitemap

| Check | Result |
|---|---|
| `/de` present in `sitemap.xml` | yes, exactly once |
| Total URLs in sitemap | 219 |
| `robots.txt` advertises the sitemap | `Sitemap: https://thinkzet.com/sitemap.xml` |

## 2. Canonical and hreflang

| Tag | Value |
|---|---|
| `<html lang>` | `de` |
| `<link rel="canonical">` | `https://thinkzet.com/de` |
| `<meta property="og:url">` | `https://thinkzet.com/de` |
| `<title>` | Germany Salaries and Opportunities – Live Market Data \| ThinkZet |
| `hreflang` tags | 16, including a self-reference `de-de` to `/de` and `x-default` to `/` |

The self-reference matters: a page that does not name itself in its own hreflang set is ignored by Google for that cluster. `/de` names itself.

## 3. Robots and headers

| Check | Result |
|---|---|
| `robots.txt` | `Allow: /`, with `/?app=1`, `/api/` and `/strategy.html` disallowed. `/de` is not restricted |
| `<meta name="robots">` on `/de` | absent, which means index, follow |
| `X-Robots-Tag` header | absent |
| HTTP status | 200 |
| `Cache-Control` | `no-cache` |

## 4. What Googlebot actually receives

Fetched with the Googlebot user agent:

- status 200, 388,474 bytes
- `<html lang="de">`
- `<h1>Der Markt hat dich ohne dich eingepreist.</h1>`

The page is served in German to a crawler, not an empty shell. That is the check that matters, and it passes.

---

## What "Discovered – currently not indexed" means

It is a queue state, not a rejection. Google knows the URL from the sitemap and has chosen not to spend crawl budget on it yet. For a new site with 219 URLs and one indexed page, this is the normal state for weeks. Nothing to fix.

## What the submission error means

"We had a problem submitting your indexing request. Please try again later." is a Search Console service error. It returns the same message for properties of every size, and it is unrelated to the URL being submitted. Two things make it more likely:

1. More than a handful of requests in one day on the same property.
2. A request made while the property's data is still being refreshed.

## What to do

1. Wait 24 hours, then request `/de` once. One request, not four.
2. If it fails again, request nothing and wait for the crawl. The sitemap already carries the URL, and the sitemap is the channel Google actually uses.
3. Check `Sitemaps` reads **Success, 219 discovered**. If it does, the URL is queued and no manual request is needed.
4. Optional, and the only real lever: one internal link to `/de` from an indexed page. Crawl follows links faster than it follows a sitemap.

Do not change `robots.txt`, the canonical or the hreflang set. All three are correct, and changing them to chase a queue state would cost more than waiting.
