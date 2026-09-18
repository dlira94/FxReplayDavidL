# Performance

Budgets, the measurements that back them, and the one architectural trade-off this project
made knowingly.

## Budgets

Lighthouse mobile, against a production build. These are the numbers in `CLAUDE.md`, repeated
here because this is where they get measured.

| Metric | Budget |
|---|---|
| Performance | ≥ 95 |
| Accessibility | 100 |
| SEO | 100 |
| Best Practices | 100 |
| LCP | < 2.0 s |
| CLS | < 0.05 |
| INP | < 200 ms |
| Landing JS before interaction, excluding GTM | < 60 KB gzip |

The quiz island hydrates on intent (`client:visible` / on CTA), never `client:load`. GTM is
deferred. No other third-party script without a row in `decisions.md`.

## The trade-off we took: `/` is server-rendered

D16 chose option A — `export const prerender = false` on `/`, with the middleware assigning
the variant per request. That buys one page, one copy source and no flicker. It costs the
CDN: `/` is served by a function, so **TTFB is a function cold/warm start instead of an edge
cache hit**, and LCP inherits whatever TTFB costs.

This is the project's main self-inflicted performance risk, so it is the thing to measure
first.

### What to measure

1. **TTFB on `/`, cold and warm**, against a production deployment — not local, where there
   is no cold start. Cold means first request after idle; Neon's free tier adds its own cold
   start, but the exposure insert is behind `waitUntil()` and must not appear in TTFB. If it
   does, the non-blocking write is not actually non-blocking.
2. **LCP p75 per variant** (`experiment.md` guardrail). A variant that loses on LCP is not a
   copy result, it is a delivery difference, and it invalidates the comparison.
3. **The gap vs option B.** B (three prerendered pages + an edge rewrite) would serve HTML
   from the CDN. Measuring A's TTFB gives the size of what B would have bought, which is what
   turns "we picked A for time budget" into a number.

### Measured — preview `e3yi11pms`, 2026-09-18 (3 Lighthouse runs)

| Metric | Value | Budget |
|---|---|---|
| Lighthouse Performance (mobile) | **99–100** (99, 100, 100) | ≥ 95 ✅ |
| Accessibility / Best Practices | **100 / 100** (3/3 runs) | 100 ✅ |
| SEO | 69 on preview — `is-crawlable` is the *only* failing audit, because preview is `noindex` by design. Every other SEO audit passes, so production reads 100 | 100 (confirm in production) |
| LCP | **1.7 / 1.5 / 1.5 s** | < 2.0 ✅ |
| CLS | **0** (3/3 runs) | < 0.05 ✅ |
| TBT (INP proxy) | **0 ms** (3/3 runs) | < 200 ✅ |
| Application JS | **2,489 B raw · 982 B gzip · 0 script requests** | < 5 KB ✅ |
| LCP element | `p.hero__sub`, 6 of 6 loads — **not** the `h1`, since the hero visual arrived | — |
| Total page weight | 67 KiB, 10 requests (doc 32.0 raw / 7.9 transferred, 2 CSS, 3 woff2, 1 SVG) | — |

**The D16 cost, quantified.** `/` answers `private, no-store` with `x-vercel-cache: MISS`
on every request, as it must — a shared cache would pin every visitor to one arm.

Two numbers, and they measure different things:

| | Value | What it is |
|---|---|---|
| Lighthouse `server-response-time` | **63 ms** (62 / 63 / 71) | server work on the root document |
| curl TTFB, 20 warm samples | min 310 · p25 334 · **median 352** · p75 361 · p90 368 · max 397 ms | end-to-end from a distant client to `sfo1`, network RTT included |

Quote **70 ms as server time** and 343 ms as end-to-end from far away. The earlier "≈117 ms
of function overhead vs a CDN hit" came from comparing curl-to-curl on the same client and
is the fairer like-for-like figure for what option B would buy back.

LCP lands at 1.3–1.7 s, so the trade-off is affordable at this page weight. Still a **floor,
not the worst case**: every sample hit a warm instance. Read p75/p95 from the Vercel
dashboard after an idle period before treating any of this as the ceiling.

### Measured — **production**, 2026-09-18

The preview numbers below were always caveated with "SEO should read 100 in production,
but that is inference from the code path". Measured, it does.

| Metric | Production | Preview `e3yi11pms` |
|---|---|---|
| Performance | **100** | 99–100 |
| Accessibility | **100** | 100 |
| Best Practices | **100** | 100 |
| **SEO** | **100 — zero failing audits** | 69 (`is-crawlable` only, by design) |
| LCP | **1.1 s** | 1.5–1.7 s |
| CLS | **0** | 0 |
| TBT | **0 ms** | 0 ms |
| FCP | 1.0 s | — |
| `server-response-time` | **70 ms** | 63 ms |

Production is faster than preview on LCP, which is expected: the preview injects Vercel's
toolbar and the production deployment is not carrying it.

Indexability confirmed at the same time: **no `x-robots-tag` header, no `<meta name="robots">`**,
canonical is **self-referential** (`https://fxreplaydavidlira.vercel.app/` served at that
URL), `og:image` resolves 200 — the 404 the previous audit flagged self-resolved on merge, as
predicted — `robots.txt` 200, and `/lab/hero-visual` answers **404**, so the internal review
page really is absent from production.

### Where the numbers go

- Ad-hoc: `pre-deploy-auditor`, which runs Lighthouse against a production build or a preview
  URL and reports against the budgets above.
- Continuous: LCP p75 per variant is a guardrail in the experiment readout
  (`GET /api/stats` covers conversion; field CWV needs CrUX or Vercel Web Analytics, neither
  of which is wired up here — see `ai-workflow.md`).

### If A proves too expensive

B stays documented in D16 as the production optimisation: prerender the three variants,
rewrite `/` at the edge, and send the exposure from the client to an own endpoint by beacon
instead of writing it in the request. It is more moving parts and three pages to keep in
sync, which is why it was not the first move.

## Caching

`/` varies by the `fxr_variant` cookie, so it is served `Cache-Control: private` and must
never be cached by the CDN. A cached `/` would pin every visitor to one arm and destroy the
experiment — this is a correctness constraint, not a performance tuning knob.

Static assets should keep hashed-filename immutable caching, but on the `jpmayivtm` preview
they did not: `/_astro/*`, `/fonts/*` and `/brand/*` all answered
`cache-control: public, max-age=0, must-revalidate`. The adapter does emit an immutable
header route in `.vercel/output/config.json`, but it sits *after* `{ "handle": "filesystem" }`,
so for a file the filesystem already served it never runs. Every repeat visit revalidated the
CSS and all three fonts.

A root `vercel.json` now sets the headers explicitly, and **this is verified on `q0l88ugm2`**:
`/_astro/*.css` and `/fonts/*.woff2` return `public, max-age=31536000, immutable`,
`/brand/*.svg` returns `public, max-age=604800`. The control case proves the rules are what
changed it — `/favicon.svg`, which no rule covers, still returns the adapter default
`public, max-age=0, must-revalidate`. `handle: filesystem` does not override `vercel.json`.

## Fonts

Lato (headings) and Nunito Sans (body), self-hosted, **only the weights actually used**,
`font-display: swap`, preloaded for the weights in the LCP element. Not yet implemented:
Implemented: Lato 700 and Nunito Sans 400/600, latin subset, 56 KB total, served from
`/fonts/` with `font-display: swap`. Verified on preview: three woff2 requests, no calls to
Google Fonts.

**Lato 700 is the only preloaded weight, and it is no longer the LCP font.** Since the hero
visual landed, the LCP element measures as `p.hero__sub` (Nunito Sans 400) in 6 of 6 loads.
Preloading a second weight was rejected rather than overlooked: under `font-display: swap`
the LCP paints with the fallback regardless, and a second preload competes for the same early
bandwidth. Revisit only if LCP starts missing the budget.
