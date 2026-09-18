# Decisions & assumptions

Lightweight log. Newest at the bottom. Format: **decision** · why · trade-off · who decided.

| # | Decision | Why | Trade-off | By |
|---|---|---|---|---|
| D1 | Astro (static) + React island for the quiz | Landing is content; zero JS by default protects Core Web Vitals. Only the quiz needs interactivity | Less common than Next.js; team may use Next | David |
| D2 | Vercel hosting (Hobby) | Static CDN + serverless API + edge middleware + preview URLs per branch, free | Hobby is non-commercial; production would need Pro | David |
| D3 | Neon Postgres + Drizzle | Persistence that survives serverless; DB-enforced unique email; real dashboard queries | Free-tier cold starts; external dependency | David |
| D4 | Copy-only test, 3 pains: `money` / `time` / `discipline` | Maximally distinct pains (money cost, time constraint, self-trust) so a result is informative | 3 arms need more traffic than 2 | David (from 6 researched options) |
| D5 | `money` is the control | Closest to FX Replay's current risk-free messaging on the homepage | Assumption about their baseline; not verified with the team | David |
| D6 | `btn-bg-primary-disabled` → `blue-900` | `blue-950` is referenced but undefined in the brand kit | Deviates from source tokens; flagged for design | David |
| D7 | Brand blue `#0260FD` not used for small text | Contrast 4.02:1 on `#030303` fails WCAG AA (4.5:1). Use `blue-500` (5.26:1) or `blue-400` (7:1) for small blue text | Slight visual deviation from pure brand blue | David |
| D8 | Target the Free plan (no card), not the 5-day paid trial | Lowest friction; matches "account creation" objective | Doesn't measure paid intent | David |
| D9 | No email delivery; result shown on screen | No free provider without a verified domain; instant gratification converts better anyway | Email promise removed from copy | David |
| D10 | GTM loaded deferred | Protects LCP / INP from the heaviest third-party script | May miss page views of very fast bounces; `account_created` is also sent server-side | David |
| D11 | Brand kit files flattened into `docs/brand/`; `tokens.json` and source PDFs not provided | Received without them; `tokens.css` regenerated from `brand-kit.html` | README structure differs from actual files | David |
