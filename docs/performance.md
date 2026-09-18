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

Static assets keep Astro's default hashed-filename immutable caching.

## Fonts

Lato (headings) and Nunito Sans (body), self-hosted, **only the weights actually used**,
`font-display: swap`, preloaded for the weights in the LCP element. Not yet implemented:
`tokens.css` declares the families but there are no `@font-face` rules or font files, so
today both fall back to `system-ui`.
