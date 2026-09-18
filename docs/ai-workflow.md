# AI workflow — what runs here, what would run in production

The AI system in `.claude/` is sized for this challenge. This file separates what actually works in the repo from what a real growth team would wire up, so the gap is a stated design choice rather than something missing.

For the record of who delegated what and where the output was corrected, see `docs/ai-log.md`. For the decisions behind these choices, `docs/decisions.md`.

## 1. What runs here

| Piece | Kind | What it does |
|---|---|---|
| `storybrand-copy` | Skill | Drafts and validates variant copy against the StoryBrand frame and the guardrails in `messaging.md` |
| `add-tracking-event` | Skill | Adds an analytics event end to end: typed definition, call site, `analytics.md`, e2e assertion |
| `pre-deploy-auditor` | Agent | A11y, performance budgets, SEO and tracking coverage against a production build in a real browser |
| `growth-analyst` | Agent | Post-deploy experiment readout: conversion per variant, funnel, SRM, CWV, decision |
| Mobbin | MCP | UI pattern research for the quiz, stepper and result screens |
| Playwright | MCP | Drives the browser for the auditor and for e2e tests |

## 2. What is proposed, not available

### Vercel MCP — deploys, logs, analytics

**Status: proposed for production. Disabled in this project** (decision D15).

It was wired in and then removed. OAuth authorized on a Hobby scope never granted access to the project — `list_teams` returned empty and `get_project` answered `403 Forbidden`. On a Pro team with the integration installed at team scope, this is the piece that closes the loop between "the experiment moved" and "something shipped".

How the agents would use it:

**`growth-analyst`** — deploy state as the control variable for any reading of the data:
- `list_deployments` / `get_deployment` — which build served the traffic in the window, and when it was promoted. A deploy inside the analysis window invalidates a before/after comparison; the agent should detect that itself instead of asking.
- `get_runtime_logs` / `get_runtime_errors` — the real 5xx and 409 rates behind a drop in completion, separating a delivery failure from a copy effect. Today the agent can only see the 409s that reached the database.
- `get_web_analytics` — page views and referrers as an independent cross-check on exposure counts when Postgres and GA4 disagree.

**`pre-deploy-auditor`** — audit the preview that will actually be promoted:
- `list_deployments` to resolve the branch's current preview URL rather than being handed one.
- `get_deployment_build_logs` to catch a build warning that a green local build hides.

The rule in both cases: Vercel is operational context, never the conversion source of truth. That stays the Users API.

### GA4 MCP — acquisition and attribution

**Status: proposed.** `growth-analyst` currently infers source and medium from the `utm_*` fields stored with each signup, which only covers traffic that reached step 1. A GA4 MCP would give it the exposure side — sessions, source/medium, campaign — so cost per account created becomes answerable, and the readout could segment by channel rather than flagging it as exploratory.

### What we deliberately don't propose

- **Writing to production from an agent.** Deploys go through `git push` and a human merge. An agent that can deploy is an agent that can deploy a mistake at 2 a.m.
- **An LLM in the request path.** The practice plan is deterministic rules in `src/lib/plan.ts`: free, instant, testable, and it can't hallucinate a promise the copy guardrails forbid.
- **An agent that edits copy autonomously.** `storybrand-copy` drafts; a human accepts. Copy is the independent variable of the experiment — silent edits would invalidate it.

## 3. Operating today without Vercel access

Deploys happen on `git push` to `github-dlira94`; `main` is production, every branch gets a preview. **David reads deploy state and preview URLs from the Vercel dashboard** and passes the URL to the agents that need one. Claude verifies what it can locally — `npm run build`, `astro check`, unit and e2e tests — and reports what it pushed without claiming anything about the deploy.

It's a slower loop with a human in the middle. It's also the honest one: the alternative on this machine was an identity belonging to a different account.
