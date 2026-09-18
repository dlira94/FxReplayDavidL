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

### Measured — preview `jpmayivtm`, 2026-09-18

| Metric | Value | Budget |
|---|---|---|
| Lighthouse Performance (mobile) | **99** | ≥ 95 ✅ |
| Accessibility / Best Practices | **100 / 100** | 100 ✅ |
| SEO | 66 on preview — `is-crawlable` only, because preview is `noindex` by design. Every other SEO audit scores 1, so production reads 100 | 100 (confirm in production) |
| LCP | **1.7 s** | < 2.0 ✅ |
| CLS | **0** | < 0.05 ✅ |
| TBT (INP proxy) | **0 ms** | — ✅ |
| Application JS | **0 KB** | < 60 KB ✅ |

**The D16 cost, quantified.** `/` answers `private, no-store` with `x-vercel-cache: MISS`
on every request, as it must. Warm TTFB on `/` (a function) measured 337–359 ms, median
≈ 350 ms; a CDN hit on `/fonts/*.woff2` from the same client measured ≈ 233 ms.

→ **≈ 117 ms of warm function overhead** is what option B would have bought back. LCP still
lands at 1.7 s, so the trade-off is affordable at this page weight. This is a **floor, not
the worst case**: every measurement hit a warm instance, so cold start is not in the number.
Read p75/p95 TTFB from the Vercel dashboard after an idle period before treating 117 ms as
the answer.

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

A root `vercel.json` now sets the headers explicitly. **Unverified**: it has not been through
a deployment yet, so confirm the response headers on the next preview before believing this
paragraph.

## Fonts

Lato (headings) and Nunito Sans (body), self-hosted, **only the weights actually used**,
`font-display: swap`, preloaded for the weights in the LCP element. Not yet implemented:
Implemented: Lato 700 and Nunito Sans 400/600, latin subset, 56 KB total, served from
`/fonts/` with `font-display: swap`. Lato 700 is preloaded as the weight of the LCP element.
Verified on preview: three woff2 requests, no calls to Google Fonts.
