# Experience — landing, quiz and result

Mobile-first. Dark-first brand (`--bg-primary`). One primary action per screen.

## 1. Landing sections (StoryBrand order)

| # | Section | Purpose | Copy source |
|---|---|---|---|
| 1 | Header | Logo + CTA (sticky on mobile after hero) | shared |
| 2 | Hero | Pain-led promise + primary CTA + trust line | [variant] |
| 3 | Social proof strip | "1M+ traders" + 2–3 short feature proofs | shared |
| 4 | Problem | Villain, external/internal/philosophical problem | [variant] |
| 5 | Guide | Empathy + authority (product visual) | shared |
| 6 | Plan preview ("demo") | Static sample of a practice plan: shows the value before asking for anything | shared layout, [variant] title |
| 7 | 3-step plan | Answer → Get plan → Practice free | shared |
| 8 | Success vs failure | Short contrast block | shared |
| 9 | FAQ | Objection handling (`<details>`) | shared |
| 10 | Final CTA + footer | Repeat primary CTA | shared |

All CTAs open the quiz. The quiz opens **inline** (replaces the page content area, URL `#plan`) rather than as a modal: better on mobile, simpler focus management, and it survives back-button use.

Visual references: pull quiz / stepper / result patterns via the Mobbin MCP before building. References inform patterns only; visuals come from the brand tokens.

## 2. Quiz flow

```
[CTA] → 1 Name → 2 Market → 3 Experience → 4 Weekly time → 5 Goal → 6 Email → Result
          POST      PATCH       PATCH          PATCH          PATCH     PATCH (converts)
```

| Step | Input | Options | API |
|---|---|---|---|
| 1 | First name (text, 1–40 chars) | — | `POST /api/users` (creates `in_progress` user) |
| 2 | Market (single choice) | Forex · Futures · Crypto · Indices / other | `PATCH` |
| 3 | Experience | Just starting · < 1 year · 1–3 years · 3+ years | `PATCH` |
| 4 | Weekly practice time | < 2 h · 2–5 h · 5–10 h · 10+ h | `PATCH` |
| 5 | Main goal | Validate a strategy · Pass a prop challenge · Build discipline · Get more screen time | `PATCH` |
| 6 | Email + consent line | — | `PATCH` with email → status `converted` |

**Interaction rules**
- Choice steps advance on selection (one tap); a Back button is always available.
- Progress indicator: "Step 2 of 6" plus a bar.
- Answers are kept client-side; a failed PATCH on steps 2–5 **does not block** progress. It retries in the background and the final PATCH sends the full payload. Only steps 1 and 6 block on the server.
- Refresh mid-quiz restores progress from `sessionStorage` (user id + answers).

## 3. States

| State | Where | Behavior |
|---|---|---|
| Idle | every step | CTA disabled until input is valid |
| Inline validation | name, email | On blur, then on change; message linked via `aria-describedby` |
| Submitting | steps 1 and 6 | Button shows spinner + "Saving…", inputs disabled, `aria-busy` |
| Network / 5xx error | any blocking step | Inline alert "We couldn't save that. Check your connection and try again." + Retry; answers preserved |
| 409 email exists | step 6 | "You already have an FX Replay account with this email." Show the plan anyway + "Log in" link (simulated). Record moves to status `email_exists`; editing the email and resubmitting still converts |
| 422 validation | any | Map server field errors to inputs |
| Success | result | Personalized plan + "Open FX Replay" CTA (simulated) |

## 4. Result: the practice plan

Generated client-side from answers by **deterministic rules** in `src/lib/plan.ts` (pure function, unit-tested). No LLM: free, instant, predictable, testable.

**Plan contents**
1. **Title + lead** from the variant (`messaging.md`)
2. **Weekly routine:** sessions per week and session length, from weekly time
   - < 2 h → 2 × 45 min · 2–5 h → 3 × 60 min · 5–10 h → 4 × 90 min · 10+ h → 5 × 2 h
3. **Starting focus**, from experience
   - Just starting → one setup, one market, one timeframe; 30 trades before changing anything
   - < 1 year → one setup, log every trade, review weekly
   - 1–3 years → test the same setup across 2 markets / sessions
   - 3+ years → stress-test drawdowns and bad periods
4. **Where to practice**, from market: suggested instruments and session
5. **Tools to use in FX Replay**, from goal
   - Validate → journal + performance analytics
   - Prop challenge → prop firm simulator with your firm's rules
   - Discipline → checklist + journal tags + Mentor AI review
   - Screen time → fast replay speed + multi-chart
6. **Milestone:** "After {N} sessions, review your stats" (N from sessions/week × 4)

Variant affects only the framing (title, lead). The plan logic is identical, so the result doesn't bias the experiment.

## 5. Accessibility baseline

- Semantic landmarks (`header`, `main`, `section` with headings, `footer`); one `h1`
- Choice steps are a native `fieldset` + radio group styled as cards (keyboard and screen reader for free)
- Focus moves to each new step's heading; live region announces "Step 3 of 6"
- Visible focus ring using `--border-brand`; targets ≥ 44 px
- Brand blue not used for small text (contrast); `prefers-reduced-motion` respected
- Errors are announced (`role="alert"`) and never conveyed by color alone
