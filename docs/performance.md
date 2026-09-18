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
   turns "we picked A and deferred B" into a number.

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

### Measured — **production**, 2026-09-18 · the final record

Lighthouse 13.4.1, mobile, simulated throttling, 3 runs, median reported.

| Metric | Production | Budget |
|---|---|---|
| Performance | **99** | ≥ 95 ✅ |
| Accessibility | **100** | 100 ✅ |
| Best Practices | **100** | 100 ✅ |
| **SEO** | **100 — zero failing audits** | 100 ✅ |
| LCP | **1.26 s** | < 2.0 s ✅ |
| CLS | **0** | < 0.05 ✅ |
| TBT (INP proxy) | **100 ms** | < 200 ms ✅ |
| FCP / Speed Index | 1.11 s / 2.60 s | — |
| **JS before interaction** | **4.15 KB gzip**, 0 external script requests | < 60 KB ✅ (7%) |
| **JS on opening the quiz** | **21.8 KB gzip** / 23.3 KB brotli, 4 chunks | < 25 KB ✅ |
| Page weight · requests | **357 KiB · 11** (72 KiB · 9 without GTM) | — |

LCP element is `p.hero__sub`, not the `h1` — the hero visual pushed it into the
largest-paint slot. See the fonts section below for why the preload was left
alone.

**TTFB — three numbers, because they measure different things:**

| Source | Value | What it is |
|---|---|---|
| Lighthouse `server-response-time` | **87 ms** | server work on the root document |
| Browser `navigation.responseStart` | 69 ms | the same, from a real navigation |
| curl, 20 warm samples | min 284 · **median 296** · p90 326 ms | end-to-end from a distant client, network included |

Quote **~87 ms server** and **~296 ms end-to-end warm**. Every sample hit a warm
function, so both are a floor. `/` answers `private, no-store` with
`x-vercel-cache: MISS` on every request, as D16 requires.

> **These numbers replace an earlier production row that read 100 / 1.1 s /
> 0 ms.** That row was captured before GTM was live on the deployment, so it was
> measuring a page that no longer exists. The difference is entirely GTM, and it
> is quantified below rather than averaged away.

### What GTM costs, isolated

Measured by re-running Lighthouse with `googletagmanager.com` and
`google-analytics.com` blocked, and diffing.

| | As shipped | GTM blocked | **GTM's cost** |
|---|---|---|---|
| Performance | 99 | 100 | **−1 point** |
| TBT | 100 ms | 0 ms | **+100 ms — all of the page's blocking time** |
| Speed Index | 2.60 s | 1.59 s | **+1.00 s** |
| LCP | 1.26 s | 1.49 s | **none** — GTM does not delay LCP |
| CLS | 0 | 0 | none |
| Page weight | 357 KiB | 72 KiB | **+285 KiB** |

Per file: `gtm.js` 127 KB, `gtag/js` 164 KB, plus GA `collect` beacons.
**GTM is 80% of the page's weight and 100% of its blocking time.**

This is the cost of the measurement layer, accepted deliberately (D10): it loads
after the page is interactive, so it buys reporting without touching LCP. But
"it does not hurt the score" and "it is free" are different claims and only the
first is true — the honest figure is on the record so nobody has to rediscover
it.

**One precision about D10.** GTM loads on whichever comes first: a real
interaction, or `requestIdleCallback` after the `load` event with a 3 s timeout.
The idle path exists so a visitor who never interacts still gets measured, and
so Safari — which lacks `requestIdleCallback` — is not left without analytics.
So every visit pays the 285 KiB, just never on the critical path. Anywhere this
project says GTM loads "on intent", read it as "on intent or once the page is
idle, whichever is first".

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
