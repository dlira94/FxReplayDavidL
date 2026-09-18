# Try FX Replay Free

A marketing landing page and quiz-style signup built to answer one question: **does framing a free trial around a specific, felt pain convert better than the generic "practice risk-free" message?**

Take-home challenge for FX Replay (Growth Engineer). It is a marketing experience, not the trading app — no live charts, no real-time data, no real auth.

> **Live:** _add the production URL here once `main` is deployed._

---

## The shape of it

Marketing traffic lands on a page whose copy is one of three pain framings, assigned server-side. The CTA opens a 6-step quiz, which creates a user on step 1 and converts them on step 6 (email). The result screen returns a personalized practice plan built from their answers by deterministic rules — no LLM in the request path. Every step is recorded, so the funnel is measurable per variant.

```
Landing (variant: money | time | discipline)
  └─ CTA → Quiz: name → market → experience → weekly time → goal → email
       └─ POST /api/users (step 1)  ·  PATCH /api/users/:id (steps 2–6)
            └─ Result: personalized practice plan
                 └─ account_created → GA4 (server-side, exactly once)
```

**The experiment** (`try_free_pain_v1`) is copy-only: same components, same layout, same quiz, same plan logic. One variable, so the read is clean. Variant assignment is server-side and sticky; the client never picks it. Full design, sample size and decision rules in [`docs/experiment.md`](docs/experiment.md).

**Measurement** is treated as part of the product, not an afterthought. Behavioral events go through a typed `track()` helper into GTM/GA4; the conversion is sent server-side via the Measurement Protocol so ad blockers can't eat it; Postgres is the source of truth for the readout. No PII ever reaches analytics. See [`docs/analytics.md`](docs/analytics.md).

## Stack

Astro 7 (static by default) · TypeScript strict · React only for the quiz island · plain CSS with brand tokens (no Tailwind) · Zod · Drizzle + Neon Postgres · Vercel adapter · GTM + GA4 · Vitest · Playwright · GitHub Actions · Node 22

Choices and their trade-offs are logged in [`docs/decisions.md`](docs/decisions.md).

## Getting started

```bash
nvm use                 # Node 22, pinned in .nvmrc
npm install
cp .env.example .env    # every variable is documented inline
npm run dev
```

The app runs without a database or analytics configured; leave `PUBLIC_GTM_ID` empty in local dev to skip loading GTM entirely.

| Command | What it does |
|---|---|
| `npm run dev` | Dev server |
| `npm run build` | Production build |
| `npm run preview` | Serve the production build locally |
| `npm run check` | `astro check` — types across `.astro`, `.ts` and `.tsx` |
| `npm test` | Unit tests (Vitest) |
| `npm run test:e2e` | End-to-end tests (Playwright) |

CI runs types, build and unit tests on every pull request and on `main`.

## Layout

Where things go as the build progresses — `docs/` and `.claude/` are in place, `src/` is filling in.

```
src/
  pages/            landing, dashboard, API routes
  middleware.ts     variant assignment, UTM capture
  components/       .astro sections (zero JS) + the React quiz island
  content/variants/ copy per variant, typed
  lib/              schemas · plan rules · analytics · db
  styles/           brand tokens, global CSS
docs/               brief, research, messaging, experience, api, analytics,
                    experiment, decisions, AI workflow and log
tests/              unit · e2e
.claude/            skills and agents used to build this
```

## Docs

The written thinking is the deliverable as much as the code.

| | |
|---|---|
| [`brief.md`](docs/brief.md) | Goal, scope, what's deliberately out |
| [`research.md`](docs/research.md) | Audience, pains, voice of customer, copy guardrails |
| [`messaging.md`](docs/messaging.md) | Every word on the page, per variant |
| [`experience.md`](docs/experience.md) | Sections, quiz flow, states, plan rules, accessibility |
| [`api.md`](docs/api.md) | API contract, data model, persistence |
| [`analytics.md`](docs/analytics.md) | Event spec, funnel, data quality |
| [`experiment.md`](docs/experiment.md) | Hypothesis, metrics, sample size, decision rules |
| [`decisions.md`](docs/decisions.md) | Every trade-off, and why |
| [`ai-workflow.md`](docs/ai-workflow.md) | The AI system: what runs, what's only proposed |
| [`ai-log.md`](docs/ai-log.md) | What was delegated to AI, and where it was corrected |

## Deployment

Vercel. Pushing a branch creates a preview; `main` is production. Deploys happen only through `git push` — never by hand — so every deploy is traceable to a commit.
