# Analytics plan

Analytics is part of the product: every interaction in `experience.md` has an event here, and events are typed in code (`src/lib/analytics/events.ts`). Adding an event means using the `add-tracking-event` skill, which updates code and this file together.

## 1. Architecture

```
Browser    ── track() ──▶ dataLayer ──▶ GTM (deferred) ──▶ GA4       behavioral events
Server     ── Measurement Protocol ────────────────────▶ GA4         account_created only
Middleware ── waitUntil(insert) ───────────────────────▶ Postgres    exposures  (denominator)
Server     ── Drizzle ─────────────────────────────────▶ Postgres    users      (numerator)
/dashboard ◀── GET /api/stats ◀── Postgres                           live experiment readout
```

**Why two sinks.** GA4 is where marketing lives: attribution, audiences, ad platform integrations. It is also delayed 24–48 h, applies thresholds at low volume, and loses events to ad blockers. Postgres records every signup step exactly, so the **experiment readout uses Postgres**, and GA4 is reconciled against it (§6).

**Both sides of the ratio come from the same sink.** The primary metric is conversions ÷ exposures. Taking the numerator from Postgres and the denominator from GA4 would overstate the rate by exactly the amount GA4 loses to ad blockers — unevenly across arms, if blocking correlates with the audience. So the middleware writes an `exposures` row (`api.md`) and both numbers come from the database. `experiment_exposure` still fires to GA4 as the marketing-side mirror, and the gap between the two is measured in §6.

**Why GA4 + GTM** (not PostHog / Segment). It's the stack the challenge names and the one marketing teams already operate; GTM lets them add ad pixels without deploys. In production I would evaluate PostHog for experimentation (flags + stats), keeping GA4 for acquisition.

## 2. Identity

| Id | Where | Purpose |
|---|---|---|
| `anonymous_id` | first-party cookie `fxr_aid` (UUID, set by middleware) | Dedupes POSTs; joins pre-signup behavior |
| `variant` | cookie `fxr_variant` (set by middleware) | Experiment arm; on every event |
| GA4 `client_id` + `session_id` | read from `_ga` cookies on the client, sent with `POST /api/users`, stored on the user | Lets the server-side `account_created` land in the **same GA4 session** as the browser events, keeping source/medium attribution |

**When the `_ga` cookies do not exist yet.** GTM loads deferred (D10), so a visitor who converts quickly can have no `client_id` at all. The server then derives one from `anonymous_id` — a stable hash, not a random value, so the same visitor always maps to the same GA4 client and a retry cannot invent a second user. **That conversion is counted but loses its session attribution:** it will not join the browser session, so source/medium for that user comes from the `utm_*` fields stored with the signup rather than from GA4. Counting it wrong beats not counting it, and the server logs which conversions used a derived id so the rate is knowable rather than silent (decision D43).

Delivery is retried with backoff (0.5s, 2s, 6s) inside `waitUntil`, so a transient GA4 failure does not cost the event and the visitor never waits. A 4xx is not retried — a malformed payload stays malformed.
| `user_id` | internal UUID after step 1 | Sent to GA4 as `user_id` (not PII) |

## 3. Common properties (every event)

`variant` · `experiment_id` (`try_free_pain_v1`) · `is_qa` (true when `?variant=` override used) · `page_path` · first-touch `utm_source / utm_medium / utm_campaign / utm_content / utm_term` (stored on landing, persisted for the session)

**Never:** name, email, free text. `track()` rejects any value that matches an email pattern and logs the violation.

## 4. Events

| Event | Trigger | Specific properties |
|---|---|---|
| `experiment_exposure` | Landing rendered with an assigned variant (once per session). **GA4 mirror** of the `exposures` row the middleware writes; the table is the source of truth | — |
| `cta_click` | Any CTA that opens the quiz | `cta_location` (`header`, `hero`, `plan_preview`, `final`) |
| `plan_preview_view` | Plan preview section ≥ 50 % visible (once) | — |
| `quiz_start` | **Intent, not visibility** — a click on a CTA that opens the quiz, or the first focus or keystroke in the name field, whichever comes first. Once per session | `entry_cta_location` |
| `quiz_step_complete` | A step is submitted successfully | `step_number`, `step_name`, `answer` (enum value; **omitted** for name and email) |
| `quiz_step_back` | Back pressed | `from_step` |
| `quiz_error` | Error shown to the user | `step_number`, `error_code` (`network`, `validation`, `server`) |
| `signup_submit` | Email step submitted (attempt) | — |
| `signup_email_exists` | API returned 409 on the email step | — |
| **`account_created`** | **Server**, when a user transitions to `converted` (exactly once) | `user_id`, `market`, `experience`, `weekly_hours`, `goal` |
| `plan_view` | Result screen shown | `converted` (bool: false after a 409) |
| `open_app_click` | "Open FX Replay" on the result | — |

GA4 automatic `page_view` and `scroll` stay on — `scroll` emits `percent_scrolled` and appears alongside the funnel; it carries no PII and collides with nothing, but it is in the property, so it is named here rather than discovered. Enhanced-measurement form events are **disabled** (they'd duplicate the quiz events and can capture field names).

**GA4 setup:** `account_created` marked as a key event; custom dimensions for `variant`, `experiment_id`, `is_qa`, `step_name`, `cta_location`; user property `experiment_variant`; data filter excluding internal traffic; `is_qa = true` excluded in reports.

## 5. Funnel

| Stage | Event | Metric |
|---|---|---|
| Entry | `exposures` table | unique exposed users per variant (`is_qa` / `is_bot` excluded) |
| Intent | `quiz_start` | start rate = starts ÷ exposed |
| Engaged | `quiz_step_complete` step 1 (user created) | |
| Qualified | `quiz_step_complete` step 5 | completion = step 5 ÷ starts |
| Submit | `signup_submit` | |
| **Conversion** | **`account_created`** | email-step conversion = created ÷ step 5 |

> `quiz_start` originally fired when the island hydrated. Because the quiz is **inline** rather than a modal, that counted every visitor who scrolled to the bottom of the page as a start, inflating the start rate and making the intent stage meaningless. Caught in Tag Assistant, where `quiz_start` arrived *before* `cta_click` with a scroll in between (D42). A programmatic focus — the island focusing its own input on mount — does not count either.

**Primary conversion event:** `account_created`
**Primary metric:** `users` with `status = 'converted'` ÷ rows in `exposures`, per variant — both from Postgres, served by `GET /api/stats`.

Drop-off per step comes from `users.last_step` in Postgres, which also catches users who closed the tab mid-request. Everything in this section is exposed as counts by `GET /api/stats` (`api.md`), which is what `/dashboard` and the `growth-analyst` agent read — neither touches PII.

A 409 is not an account creation: the user already had one. It's reported as its own outcome (`signup_email_exists`), not counted as a conversion.

Those records carry status **`email_exists`** (`api.md`), so the dashboard excludes them from the step-6 drop-off instead of counting them as abandons. They are reported as their own line — "already had an account" — next to the 409 rate guardrail. They stay in the denominator of the primary metric: they were exposed and they didn't create an account.

## 6. Data quality

1. **Typed events.** Event names and property shapes are TypeScript types; a typo doesn't compile.
2. **Server-side conversion.** `account_created` doesn't depend on the browser, ad blockers or GTM loading. It fires only on the status transition, carries an `event_id` (the user id) and can't fire twice.
3. **Reconciliation.** Daily: Postgres conversions vs GA4 `account_created`. They should match within ~2 %. GA4 `experiment_exposure` will be lower than the `exposures` table because of blockers and consent; that gap is measured, not hidden, and it is the reason the table exists.
4. **Sample ratio mismatch check.** Rows in `exposures` per variant are compared with the expected ⅓ split (chi-square, p < 0.001 = alert), computed by `GET /api/stats`. Running this on server-written rows rather than on browser events is the point: an ad blocker must not be able to look like broken assignment. An SRM means assignment is broken and **invalidates the readout**.
5. **QA isolation.** `is_qa = true` on both `exposures` and `users` whenever `VERCEL_ENV !== 'production'` — previews, local dev — or a `?variant=` override was used. Flagged at write time, excluded from every number in `GET /api/stats`. Nothing that isn't production traffic can reach the readout (decision D18).
6. **Automated verification.** Playwright e2e runs the quiz and asserts the exact sequence of dataLayer pushes. The `pre-deploy-auditor` agent checks every interactive element has its event.
7. **No PII.** Enforced in `track()`, plus GA4 enhanced form tracking disabled.
8. **Bots.** `is_bot` is set from a user-agent heuristic when the exposure is written, and carried to the user record. Bots are recorded, never blocked, and excluded from the readout — plus GA4 bot filtering and a honeypot field on the quiz.

## 7. Dashboard (`/dashboard`)

Admin-token protected, server-rendered from `GET /api/stats` (counts only, no PII):
- Conversion per variant with 95 % CI, and delta vs control
- Funnel per variant (start → step 1…5 → converted), with `email_exists` broken out so drop-off isn't inflated
- Drop-off by `last_step`
- Conversions by `utm_source` / `utm_campaign`
- SRM check status
- Time series of daily signups per variant
