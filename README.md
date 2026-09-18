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

**Measurement** is part of the product. Behavioral events go through a typed
`track()` helper into GTM/GA4; the conversion is sent server-side so ad blockers
cannot eat it; Postgres is the source of truth for both sides of the ratio. No
PII ever reaches analytics.

**Performance:** before any interaction the landing runs **~4.2 KB gzip of
JavaScript**, all of it inline in the document — **zero script requests**. The
quiz island (~21.8 KB gzip) is fetched only when someone opens the quiz.

### Measured in production

Lighthouse mobile, with GTM and GA4 live — not a version with analytics
switched off. Full detail and method in
[`performance.md`](docs/performance.md).

| | |
|---|---|
| Lighthouse | **99 / 100 / 100 / 100** — performance · accessibility · best practices · SEO |
| LCP · CLS | **1.26 s** · **0** |
| JS before interaction | **4.2 KB gzip**, 0 script requests |
| JS on opening the quiz | **21.8 KB gzip** |
| Tests | **240** — 172 unit · 31 integration · 37 e2e |

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

## Deliverables

Mapped to the six in [`challenge.pdf`](docs/challenge.pdf).

| # | Deliverable | Where it is |
|---|---|---|
| **1** | **Working Implementation** | Live at **https://fxreplaydavidlira.vercel.app** · this repository · ["Running it locally"](#running-it-locally) above |
| **2** | **Architecture Overview** | [`architecture.md`](docs/architecture.md) — structure, diagram, trade-offs, infrastructure, what production would change · [`api.md`](docs/api.md) — contract, data model, persistence |
| **3** | **Analytics Plan** | [`analytics.md`](docs/analytics.md) — event spec, funnel, identity, data quality · [`gtm-setup.md`](docs/gtm-setup.md) — the GTM and GA4 setup, step by step |
| **4** | **Experiment Proposal** | [`experiment.md`](docs/experiment.md) — hypothesis, control, metrics, sample size, decision rules |
| **5** | **AI-Native Workflow** | [`ai-workflow.md`](docs/ai-workflow.md) — the two layers and how they fit · [`ai-log.md`](docs/ai-log.md) — what was delegated, corrected and rejected · [`CLAUDE.md`](CLAUDE.md) · [`.claude/`](.claude) — skills and agents · [`.mcp.json`](.mcp.json) |
| **6** | **Performance Review** | [`performance.md`](docs/performance.md) — budgets, measured production numbers, and the costs a Lighthouse score does not show |

**Brand & design interpretation:** [`design.md`](docs/design.md) — what I did
with the provided typography and palette, the scales the brand kit did not
include, the blue rule, measured contrast ratios, and where I evolved the visual
direction.

**Supporting context:** [`brief.md`](docs/brief.md) (goal and scope) ·
[`research.md`](docs/research.md) (audience, pains, sourced claims) ·
[`messaging.md`](docs/messaging.md) (every word on the page) ·
[`experience.md`](docs/experience.md) (sections, quiz flow, states,
accessibility) · [`decisions.md`](docs/decisions.md) (46 numbered decisions,
each with its trade-off).

## Scope & priorities

### What I built

The whole path a visitor takes, instrumented end to end: a ten-section landing
in three copy variants assigned server-side, a six-step quiz that converts to a
free account, a deterministic practice plan, a Users API backed by Postgres,
client and server-side analytics, and an internal dashboard that reads the
experiment out with confidence intervals and a decision status.

### What I prioritized, and why

**Measurement over surface area.** The brief asks for a conversion experiment,
so the parts that decide whether a result is trustworthy got the most care:
exposures stored server-side so both sides of the ratio come from the same
place ([D17](docs/decisions.md)), a sample-ratio check that can invalidate the
readout, Wilson intervals rather than the normal approximation because at a 3 %
conversion rate the textbook interval goes below zero, and decision rules
written down *before* any data existed ([`experiment.md`](docs/experiment.md)).
A dashboard that says "Continue" while an interval already excludes zero is the
whole point.

**Experiment integrity over features.** Everything that could make the three
arms non-comparable was closed: assignment server-side with no flicker, a DOM
skeleton byte-identical across variants, an identical CTA label, and QA traffic
excluded at write time rather than filtered later
([D18](docs/decisions.md), [D46](docs/decisions.md)). Copy is asserted
character-for-character against `messaging.md`, because copy is the independent
variable and a paraphrase quietly changes the question being asked.

**Correctness of the things that fail silently.** Several defects here produced
no error and no failing test — dead CSS, an observer that deadlocked its own
reveal, a GTM loader that never ran, an event measuring the wrong thing. Those
got browser-level verification and regression tests rather than a second look
at the source.

**Honest numbers over flattering ones.** Every performance figure is measured
and dated, including the ones that are not free: GTM is 285 KiB and 100 % of the
page's blocking time, and [`performance.md`](docs/performance.md) says so.

### What I deliberately left out

- **Real authentication.** Signup and "Open FX Replay" are simulated — out of
  scope per [`brief.md`](docs/brief.md), and the largest gap.
- **Rate limiting and managed bot protection.** A honeypot and a user-agent
  heuristic ship; a public signup endpoint in production needs more.
- **An outbox for GA4 delivery.** `account_created` retries with backoff, which
  survives a blip, not an outage.
- **Field performance data.** Every number is lab data; the LCP p75 guardrail
  needs CrUX or Vercel Analytics to become a measurement.
- **A pass with a real screen reader.** Semantics, roles, focus order and
  contrast were verified programmatically and in a browser; what VoiceOver
  announces was not.
- **Traffic.** The experiment is designed, instrumented and demonstrable on
  seeded data. It has never run.

### What I would do next

In this order: real auth, then rate limiting at the edge, then a durable outbox
for analytics delivery, then feature flags so experiments can be started and
stopped without a deploy. The reasoning for each is in
[`architecture.md`](docs/architecture.md).
