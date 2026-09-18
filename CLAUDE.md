# CLAUDE.md

Project instructions for Claude Code. Read this first, every session.

## What this is

A take-home challenge for FX Replay (Growth Engineer): a **"Try FX Replay Free"** marketing experience whose goal is to **increase conversion from marketing traffic to free account creation**.

It is a marketing landing page + a quiz-style signup + a small Users API + analytics + a copy A/B/C experiment. It is **not** the FX Replay trading app: no live charts, no real-time data, no real auth.

Evaluators care about judgment, trade-offs, measurement and the AI workflow more than feature count. Prefer small and well-executed over big.

## Read before working

| Need | File |
|---|---|
| Goal, scope, out-of-scope, stack | `docs/brief.md` |
| Audience, pains, copy guardrails | `docs/research.md` |
| Every word on the page (3 variants) | `docs/messaging.md` |
| Sections, quiz flow, states, plan rules, a11y | `docs/experience.md` |
| API contract, data model, persistence | `docs/api.md` |
| Event spec, funnel, data quality | `docs/analytics.md` |
| Hypothesis, metrics, sample size, decision rules | `docs/experiment.md` |
| Budgets, the `/` on-demand trade-off, fonts | `docs/performance.md` |
| Past decisions — don't relitigate silently | `docs/decisions.md` |
| Brand tokens | `docs/brand/tokens.css`, `docs/brand/README.md` |
| AI system: what runs vs what's proposed | `docs/ai-workflow.md` |
| Original challenge | `docs/challenge.pdf` |

If a task conflicts with these docs, **stop and ask** rather than guessing.

## Language

- Talk to David in **Spanish**.
- Code, comments, commit messages, docs and UI copy in **English**.

## Stack

Astro 7 (static by default) · TypeScript strict · Preact (compat mode) only for the quiz island · plain CSS with brand tokens (no Tailwind) · Zod · Drizzle + Neon Postgres · Vercel adapter · GTM + GA4 · Vitest · Playwright · GitHub Actions · Node 22 (`.nvmrc`)

Astro 7 is newer than most training data. **Check the installed version's docs before using an API from memory** (config, adapters, middleware, actions, fonts). Record anything surprising in `docs/decisions.md`.

## Commands

```bash
nvm use            # Node 22
npm run dev        # local dev
npm run build      # production build
npx astro check    # types
npm test           # unit (Vitest)
npm run test:e2e   # Playwright
```

## Structure (target)

```
src/
  pages/
    index.astro               landing (variant resolved by middleware)
    dashboard.astro           internal funnel dashboard (admin token)
    api/users/index.ts        POST, GET
    api/users/[id].ts         PATCH
  middleware.ts               variant assignment, UTM capture
  components/                 .astro sections (zero JS)
  components/quiz/            React island
  content/variants/           copy per variant, typed, from docs/messaging.md
  lib/
    schemas.ts                Zod — shared by quiz and API
    plan.ts                   pure function: answers → practice plan
    variants.ts               variant ids, assignment
    analytics/                typed events, track(), Measurement Protocol
    db/                       Drizzle schema + client
  styles/                     tokens.css (copy of docs/brand/tokens.css), global.css
tests/unit/  tests/e2e/
```

## Non-negotiable rules

**Brand & UI**
- Use **semantic tokens only** (`var(--bg-primary)`, `var(--text-primary)`, `var(--border-brand)`…). Never raw hex, never primitives in components.
- Brand blue `#0260FD` is never used for small text (contrast 4.02:1 fails AA). Small blue text uses `blue-500` or `blue-400` via a semantic alias.
- **Never use `--text-brand` for text.** It resolves to `#0260FD` and fails AA at any body size — it is the token whose name invites the mistake. Use `--text-link` (`blue-400`, 7.00:1). Flagged to design in `docs/brand/README.md`; `tokens.css` is a verbatim copy of the brand kit and is not edited here.
- Headings Lato, body Nunito Sans; self-hosted, only the weights used, `font-display: swap`.
- Mobile-first. Touch targets ≥ 44 px. Respect `prefers-reduced-motion`.

**Copy**
- All copy comes from `src/content/variants/*`, mirrored from `docs/messaging.md`. No copy hard-coded in components.
- No profit, win-rate or income promises. Only sourced claims.
- The primary CTA label is identical across variants.

**Experiment integrity**
- Variants differ in copy only: same components, same layout, same quiz questions, same plan logic.
- Variant is assigned server-side (cookie `fxr_variant`, uniform random, sticky). The client never picks it. No flicker.
- QA override `?variant=<id>` is allowed but flags the session as `qa` so it's excluded from analysis.

**Data & privacy**
- **No PII in analytics** (no name, no email in GA4 / dataLayer). PII lives only in Postgres.
- `account_created` is sent **server-side** (GA4 Measurement Protocol) when the user converts, exactly once.
- Every analytics event goes through the typed `track()` helper and includes `variant`. Event names: `snake_case`, defined in `src/lib/analytics/events.ts` and documented in `docs/analytics.md`. Use the `add-tracking-event` skill to add one.
- Secrets only in env vars; keep `.env.example` current.

**API**
- Follow `docs/api.md` exactly: error envelope, status codes, idempotent POST, edit-token cookie for PATCH, admin token for GET.
- Validate with the shared Zod schemas on both client and server. Server never trusts the client.

**Performance budgets** (Lighthouse mobile, production build)
- Performance ≥ 95, Accessibility 100, SEO 100, Best Practices 100
- LCP < 2.0 s, CLS < 0.05, INP < 200 ms
- Landing JS before interaction (excluding GTM) < 60 KB gzip. Currently ~1 KB.
- **Quiz island on open < 25 KB gzip** (runtime + quiz component). The island hydrates on intent (`client:visible` / on CTA), never `client:load` — but "it only loads on intent" is not a licence for it to be any size, because intent is the conversion moment (D29).
- GTM is loaded deferred. No other third-party scripts without a decision entry.

## How to work

1. **Plan before code** for anything beyond a trivial change: state the approach and the files you'll touch, then wait for a go-ahead.
2. Small, focused commits using Conventional Commits (`feat:`, `fix:`, `chore:`, `docs:`, `test:`). One concern per commit.
3. Work on feature branches; each push gets a Vercel preview URL. `main` = production.
4. When you make or discover a decision, add a row to `docs/decisions.md`.
5. Don't add dependencies without saying why. Prefer platform features.
6. Never delete or overwrite files in `docs/` without asking.
7. **You have no access to Vercel. Don't try to get any** (decisions D14, D15).
   - The Vercel MCP is **disabled in this project** — OAuth on a Hobby scope never granted access to the project (403). The Vercel CLI and `gh` are **denied in `.claude/settings.json`**: both are signed in to David's work accounts (Vercel CLI → Receptive, `gh` → `davidPettable`), so a command meant for this project would act on a client's infrastructure. This holds for read-only commands too: an identity that can't be trusted for writes can't be trusted as evidence either.
   - **Deploys happen only through `git push`** to the `github-dlira94` remote. Never deploy by hand.
   - **Deploy state, preview URLs, build and runtime logs, Web Analytics: David reads them from the Vercel dashboard.** Don't claim a deploy succeeded, don't quote a preview URL you haven't been given, and don't infer either from a green build here. Say what you pushed, and ask him to confirm.
   - Vercel MCP stays in `docs/ai-workflow.md` as proposed production tooling, not as something available now.

## Definition of done

- `npm run build`, `npx astro check` and tests pass
- Keyboard-only and screen-reader pass on anything interactive
- Every new interaction has its analytics event and shows up in the dataLayer / debug view
- Relevant `docs/` updated

## AI system (in `.claude/`)

- **Skills:** `storybrand-copy` (draft/validate variant copy against the StoryBrand frame and guardrails), `add-tracking-event` (event → types → docs in one step)
- **Agents:** `pre-deploy-auditor` (a11y, performance, SEO, tracking coverage; uses Playwright MCP), `growth-analyst` (post-deploy: funnel per variant, drop-off, CWV, recommendations)
- **MCP:** Mobbin (UI pattern research), Playwright (browser testing) — config in `.mcp.json`. That's all of them.
- Everything else is off in `.claude/settings.json`: `disableClaudeAiConnectors` (claude.ai account connectors, D12) and `enabledPlugins` (the `vercel` plugin and its MCP, D15). Only MCP that earns its context (D12).
- What a production setup would add, and how the agents would use it: `docs/ai-workflow.md`.

David logs delegated / corrected / rejected AI work in `docs/ai-log.md`. When he rejects or corrects your output, suggest the log entry.
