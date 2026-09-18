# Brief — "Try FX Replay Free"

Entry point for humans and for Claude Code. Short by design; each area links to its own spec.

## Objective

Increase the conversion rate from marketing traffic (paid ads + email campaigns) to **free account creation**.

**Primary metric:** `account_created` ÷ unique landing visitors, per variant.

## The bet

Most signup pages ask for data *to create an account*. We ask for data *to build something for the user*: a personalized practice plan. The signup becomes a short quiz, and the email step both delivers the plan and creates the free account, with explicit, honest consent. Value first, account second.

The message follows **StoryBrand**: the trader is the hero, FX Replay is the guide, the quiz is the plan.

## What we test

A **copy-only** A/B/C experiment. Same layout, same UI, same quiz questions. Each variant speaks to a different pain, carried through the whole flow (hero → quiz → result):

| Variant | Pain | Role |
|---|---|---|
| `money` | "The market is an expensive classroom" | **Control** (closest to FX Replay's current risk-free messaging) |
| `time` | "I don't have time to watch charts" | Variant |
| `discipline` | "My strategy isn't the problem, my discipline is" | Variant |

Selection rationale: `research.md` §7. Copy: `messaging.md`.

## Scope

**In scope**
- Responsive landing (Astro, static) with 3 copy variants assigned at the edge, no flicker
- Quiz signup flow (React island) with full states: validation, loading, errors, success
- Users API (create / update / list) with shared validation, persisted in Postgres
- Result screen with a personalized plan (deterministic rules, no LLM)
- GTM + GA4 (deferred load), UTM capture, server-side `account_created` via GA4 Measurement Protocol
- Internal `/dashboard`: funnel and conversion per variant, drop-off per step, UTM source
- Claude Code system: `CLAUDE.md`, skills, agents, MCP (Mobbin, Playwright)
- Deploy on Vercel with preview URLs per branch

**Out of scope (documented, not built)**
- Real authentication and FX Replay account provisioning (simulated)
- Sending the plan by email (no email provider; result shown on screen)
- Looker Studio dashboard (GA4 data latency makes it useless for a live demo)
- Consent banner / Consent Mode, rate limiting, i18n

## Stack

Astro · TypeScript (strict) · React island for the quiz · Zod · Drizzle + Neon Postgres · Vercel (static + serverless functions + edge middleware) · GTM + GA4 · Vitest · Playwright · GitHub Actions

## Constraints

- **Zero cost:** free tiers only.
- **Time box:** ~6 hours.
- **Brand:** semantic tokens from `brand/tokens.css` only; never raw hex.
- **Copy:** no profit promises (see `research.md` §5).
- **No PII in analytics:** name and email live only in the database.

## Documents

| File | Purpose | Challenge deliverable |
|---|---|---|
| `research.md` | Product, audience, pain angles | — |
| `messaging.md` | StoryBrand + copy for 3 variants | — |
| `experience.md` | Page sections, quiz flow, states, result rules | — |
| `api.md` | Users API contract + data model | Architecture (API section) |
| `analytics.md` | Events, funnel, data quality | Analytics Plan |
| `experiment.md` | Hypothesis, metrics, decision rules | Experiment Proposal |
| `architecture.md` | Structure, trade-offs, infra, production changes | Architecture Overview |
| `performance.md` | CWV, SEO, a11y, caching, risks | Performance Review |
| `ai-workflow.md` | Claude Code setup and how it was used | AI-Native Workflow |
| `decisions.md` | Decisions and assumptions log | — |
| `ai-log.md` | Delegated / corrected / rejected AI work | Human Judgment |

The last five are written as the build progresses.
