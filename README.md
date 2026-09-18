# Try FX Replay Free

A marketing landing page and quiz-style signup built to answer one question:
**does framing a free trial around a specific, felt pain convert better than the
generic "practice risk-free" message?**

Take-home challenge for FX Replay (Growth Engineer). It is a marketing
experience, not the trading app — no live charts, no real-time data, no real
auth.

> **Live: https://fxreplaydavidlira.vercel.app**

---

## The shape of it

Marketing traffic lands on a page whose copy is one of three pain framings,
assigned server-side. The CTA opens a 6-step quiz, which creates a user on step
1 and converts them on step 6 (email). The result screen returns a personalized
practice plan built from their answers by deterministic rules — no LLM in the
request path. Every step is recorded, so the funnel is measurable per variant.

```
Landing (variant: money | time | discipline)
  └─ CTA → Quiz: name → market → experience → weekly time → goal → email
       └─ POST /api/users (step 1) · PATCH /api/users/:id (steps 2–6)
            └─ Result: personalized practice plan
                 └─ account_created → GA4 (server-side, exactly once)
```

**The experiment** (`try_free_pain_v1`) is copy-only: same components, same
layout, same quiz, same plan logic. One variable, so the read is clean.
Assignment is server-side and sticky; the client never picks it.

**Measurement** is part of the product. Behavioural events go through a typed
`track()` helper into GTM/GA4; the conversion is sent server-side so ad blockers
cannot eat it; Postgres is the source of truth for both sides of the ratio. No
PII ever reaches analytics.

**Performance:** the landing ships **zero application JavaScript**. The quiz
island (~21 KB gzip) is fetched only when someone opens it.

## Stack

Astro 7 (static by default) · TypeScript strict · Preact for the quiz island
only · plain CSS with brand tokens · Zod · Drizzle + Neon Postgres · Vercel ·
GTM + GA4 · Vitest · Playwright · GitHub Actions · Node 22

## Running it locally

```bash
nvm use                 # Node 22, pinned in .nvmrc
npm install
cp .env.example .env.local   # every variable is documented inline
npm run db:migrate           # applies drizzle/ to your database
npm run dev
```

`.env.example` explains each variable. You need `DATABASE_URL` (pooled) and
`DATABASE_URL_UNPOOLED` (migrations) for the quiz to save anything; the landing
renders without them. `PUBLIC_GTM_ID`, `GA4_MEASUREMENT_ID` and `GA4_API_SECRET`
are optional locally — leave them empty and analytics is skipped rather than
broken. `ADMIN_TOKEN` gates `/dashboard` and the admin endpoints.

| Command | What it does |
|---|---|
| `npm run dev` | Dev server (loads `.env.local`) |
| `npm run build` | Production build |
| `npm run check` | `astro check` — types across `.astro`, `.ts`, `.tsx` |
| `npm test` | Unit tests. Offline, no database |
| `npm run test:integration` | API + GA4 payload against the real database. Needs `DATABASE_URL` |
| `npm run test:e2e` | Playwright. Start `npm run dev` first, or set `E2E_BASE_URL` to a deployment |
| `npm run db:generate` / `db:migrate` | Drizzle migrations over the unpooled URL |

CI runs types, build and unit tests on every pull request and on `main`.

## Demoing it

**See each variant.** `?variant=money`, `?variant=time`, `?variant=discipline`
force an arm. Any forced variant is flagged `is_qa: true` and excluded from the
readout, so exploring the demo cannot contaminate the experiment
([D18](docs/decisions.md)).

**The dashboard.** `/dashboard`, with the `ADMIN_TOKEN` — shared separately,
never in this repo. It shows conversion per variant with Wilson intervals, lift
vs control, drop-off by step, the sample-ratio check, and a decision status per
arm against the sample the test was powered for. The **"Include QA data"**
toggle switches to the seeded demo dataset; the QA view says on screen that it
is not an experiment readout.

**GTM and GA4.** [`docs/gtm-setup.md`](docs/gtm-setup.md) is the step-by-step
configuration, written from the code rather than from memory — every data-layer
variable name is the key `track()` actually writes.

## Layout

```
src/
  pages/            landing · dashboard · API routes
  middleware.ts     variant assignment, UTM capture, exposure write
  components/       .astro sections (zero JS) + the Preact quiz island
  content/          all copy, typed, mirrored from docs/messaging.md
  lib/              schemas · plan rules · statistics · analytics · db
  styles/           brand tokens (verbatim) + project scales
docs/               the thinking, listed below
tests/              unit · integration · e2e
.claude/            the skills and agents used to build this
```

## Documents, mapped to the six deliverables

The written thinking is as much the deliverable as the code.

| Challenge deliverable | Where it lives |
|---|---|
| **1. Strategy and audience** | [`brief.md`](docs/brief.md) — goal, scope, what is deliberately out · [`research.md`](docs/research.md) — audience, pains, voice of customer, sourced claims |
| **2. Messaging and copy** | [`messaging.md`](docs/messaging.md) — every word on the page, per variant, StoryBrand frame and guardrails |
| **3. The experience** | [`experience.md`](docs/experience.md) — sections, quiz flow, every state, plan rules, accessibility baseline |
| **4. Technical implementation** | [`architecture.md`](docs/architecture.md) — structure, diagram, trade-offs, infrastructure, what production would change · [`api.md`](docs/api.md) — contract, data model, persistence |
| **5. Measurement** | [`analytics.md`](docs/analytics.md) — event spec, funnel, data quality · [`experiment.md`](docs/experiment.md) — hypothesis, metrics, sample size, decision rules · [`gtm-setup.md`](docs/gtm-setup.md) — the setup, step by step |
| **6. AI workflow** | [`ai-workflow.md`](docs/ai-workflow.md) — the two layers and how they fit · [`ai-log.md`](docs/ai-log.md) — what was delegated, corrected and rejected, with the reasoning |

Cross-cutting: [`decisions.md`](docs/decisions.md) — 44 numbered decisions, each
with its trade-off. [`performance.md`](docs/performance.md) — budgets, measured
production numbers, and the costs that a Lighthouse score does not show.

## Time spent, honestly

**About 9 hours, in one session** — 17 September, ~8 pm to 18 September, ~5 am.
The brief suggested 6.

That number includes everything, not just the coding: preparation and desk
research, isolating this work from the client accounts already signed in on this
machine (the Vercel CLI and `gh` are both authenticated to other organisations,
which is why they are denied in `.claude/settings.json` — see
[D14](docs/decisions.md)), and learning Astro 7, which is new enough that its
behaviour had to be checked against the installed version rather than recalled.
Several decisions in `decisions.md` exist because a check like that came back
different from what I expected.

I went over because I chose depth in the parts I think the role is actually
about — the experiment design, the measurement plan, and not shipping numbers I
could not defend — rather than breadth. Given the same six hours I would cut the
same things listed below, and I would not cut the statistics or the decision
log.

### What is deliberately not here

- **Real authentication.** The signup and "Open FX Replay" are simulated. Out of
  scope per [`brief.md`](docs/brief.md); it is also the largest gap and the
  least interesting to fake.
- **Rate limiting and managed bot protection.** There is a honeypot and a
  user-agent heuristic. A public signup endpoint in production needs more —
  named first in [`architecture.md`](docs/architecture.md).
- **An outbox for GA4 delivery.** `account_created` retries with backoff, which
  survives a blip and not an outage.
- **Field performance data.** Every number in `performance.md` is lab data. The
  LCP p75 guardrail in `experiment.md` needs CrUX or Vercel Web Analytics to
  become a measurement.
- **A screen-reader pass with a real screen reader.** The accessibility tree,
  roles, names, focus order and contrast were verified programmatically and in a
  browser; what VoiceOver actually announces was not.
- **Traffic.** The experiment is designed, instrumented and demonstrable on
  seeded data. It has never run.
