# Analytics plan

Analytics is part of the product: every interaction in `experience.md` has an event here, and events are typed in code (`src/lib/analytics/events.ts`). Adding an event means using the `add-tracking-event` skill, which updates code and this file together.

## 1. Architecture

```
Browser ── track() ──▶ dataLayer ──▶ GTM (deferred) ──▶ GA4          behavioral events
Server  ── Measurement Protocol ───────────────────────▶ GA4          account_created only
Server  ── Drizzle ────────────────────────────────────▶ Postgres     source of truth for the funnel
/dashboard ◀── Postgres                                                live experiment readout
```

**Why two sinks.** GA4 is where marketing lives: attribution, audiences, ad platform integrations. It is also delayed 24–48 h, applies thresholds at low volume, and loses events to ad blockers. Postgres records every signup step exactly, so the **experiment readout uses Postgres**, and GA4 is reconciled against it (§6).

**Why GA4 + GTM** (not PostHog / Segment). It's the stack the challenge names and the one marketing teams already operate; GTM lets them add ad pixels without deploys. In production I would evaluate PostHog for experimentation (flags + stats), keeping GA4 for acquisition.

## 2. Identity

| Id | Where | Purpose |
|---|---|---|
| `anonymous_id` | first-party cookie `fxr_aid` (UUID, set by middleware) | Dedupes POSTs; joins pre-signup behavior |
| `variant` | cookie `fxr_variant` (set by middleware) | Experiment arm; on every event |
| GA4 `client_id` + `session_id` | read from `_ga` cookies on the client, sent with `POST /api/users`, stored on the user | Lets the server-side `account_created` land in the **same GA4 session** as the browser events, keeping source/medium attribution |
| `user_id` | internal UUID after step 1 | Sent to GA4 as `user_id` (not PII) |

## 3. Common properties (every event)

`variant` · `experiment_id` (`try_free_pain_v1`) · `is_qa` (true when `?variant=` override used) · `page_path` · first-touch `utm_source / utm_medium / utm_campaign / utm_content / utm_term` (stored on landing, persisted for the session)

**Never:** name, email, free text. `track()` rejects any value that matches an email pattern and logs the violation.

## 4. Events

| Event | Trigger | Specific properties |
|---|---|---|
| `experiment_exposure` | Landing rendered with an assigned variant (once per session) | — |
| `cta_click` | Any CTA that opens the quiz | `cta_location` (`header`, `hero`, `plan_preview`, `final`) |
| `plan_preview_view` | Plan preview section ≥ 50 % visible (once) | — |
| `quiz_start` | Quiz step 1 shown | `entry_cta_location` |
| `quiz_step_complete` | A step is submitted successfully | `step_number`, `step_name`, `answer` (enum value; **omitted** for name and email) |
| `quiz_step_back` | Back pressed | `from_step` |
| `quiz_error` | Error shown to the user | `step_number`, `error_code` (`network`, `validation`, `server`) |
| `signup_submit` | Email step submitted (attempt) | — |
| `signup_email_exists` | API returned 409 on the email step | — |
| **`account_created`** | **Server**, when a user transitions to `converted` (exactly once) | `user_id`, `market`, `experience`, `weekly_hours`, `goal` |
| `plan_view` | Result screen shown | `converted` (bool: false after a 409) |
| `open_app_click` | "Open FX Replay" on the result | — |

GA4 automatic `page_view` stays on; enhanced-measurement form events are **disabled** (they'd duplicate the quiz events and can capture field names).

**GA4 setup:** `account_created` marked as a key event; custom dimensions for `variant`, `experiment_id`, `is_qa`, `step_name`, `cta_location`; user property `experiment_variant`; data filter excluding internal traffic; `is_qa = true` excluded in reports.

## 5. Funnel

| Stage | Event | Metric |
|---|---|---|
| Entry | `experiment_exposure` | unique exposed users per variant |
| Intent | `quiz_start` | start rate = starts ÷ exposed |
| Engaged | `quiz_step_complete` step 1 (user created) | |
| Qualified | `quiz_step_complete` step 5 | completion = step 5 ÷ starts |
| Submit | `signup_submit` | |
| **Conversion** | **`account_created`** | email-step conversion = created ÷ step 5 |

**Primary conversion event:** `account_created`
**Primary metric:** users with `account_created` ÷ unique users with `experiment_exposure`, per variant.

Drop-off per step comes from `users.last_step` in Postgres, which also catches users who closed the tab mid-request.

A 409 is not an account creation: the user already had one. It's reported as its own outcome (`signup_email_exists`), not counted as a conversion.

Those records stay `in_progress` at `last_step = 6` (`api.md`), which looks identical to an abandon in the `last_step` drop-off. Subtract `signup_email_exists` from step-6 drop-off before reading it as friction, and report the 409 rate separately as a guardrail.

## 6. Data quality

1. **Typed events.** Event names and property shapes are TypeScript types; a typo doesn't compile.
2. **Server-side conversion.** `account_created` doesn't depend on the browser, ad blockers or GTM loading. It fires only on the status transition, carries an `event_id` (the user id) and can't fire twice.
3. **Reconciliation.** Daily: Postgres conversions vs GA4 `account_created`. They should match within ~2 %. Browser events (exposures) will be lower in GA4 because of blockers and consent; that gap is measured, not hidden.
4. **Sample ratio mismatch check.** Exposures per variant are compared with the expected ⅓ split (chi-square, p < 0.001 = alert). An SRM means assignment or tracking is broken and **invalidates the readout**.
5. **QA isolation.** Forced variants, preview deployments and internal traffic are flagged and excluded.
6. **Automated verification.** Playwright e2e runs the quiz and asserts the exact sequence of dataLayer pushes. The `pre-deploy-auditor` agent checks every interactive element has its event.
7. **No PII.** Enforced in `track()`, plus GA4 enhanced form tracking disabled.
8. **Bots.** GA4 bot filtering, plus a honeypot field on the quiz; flagged submissions are stored but excluded.

## 7. Dashboard (`/dashboard`)

Admin-token protected, server-rendered from Postgres:
- Conversion per variant with 95 % CI, and delta vs control
- Funnel per variant (start → step 1…5 → converted)
- Drop-off by `last_step`
- Conversions by `utm_source` / `utm_campaign`
- SRM check status
- Time series of daily signups per variant
