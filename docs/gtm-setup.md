# GTM and GA4 setup

Everything below is taken from the code, not from memory. Where a name has to
match exactly, it is because something in `src/` reads or writes that exact
string — the file is named each time so you can check rather than trust.

Do it in order. Steps 1–6 are GTM, steps 7–9 are GA4, step 10 is how you prove
it works before anyone relies on it.

**Before you start you need:** the GTM container ID (`GTM-XXXXXXX`), which goes
in `PUBLIC_GTM_ID`, and the GA4 measurement ID (`G-XXXXXXXXXX`).

---

## How the page feeds GTM

Worth understanding before clicking anything, because it explains why the
trigger is shaped the way it is.

`window.dataLayer` is created by the page, not by GTM
(`src/components/Gtm.astro`), and every event goes in through one typed helper,
`track()` (`src/lib/analytics/track.ts`). GTM itself is loaded **late** — on the
first interaction, or when the page goes idle after load, whichever comes first
(decision D10).

So events can be pushed **before GTM exists**. That is fine and intended: GTM
replays whatever is already in `dataLayer` when it initialises. It does mean a
tag will sometimes fire a second or two after the action that caused it.

Two events are pushed by a small inline script rather than by `track()`, because
they happen before the quiz island hydrates: `experiment_exposure` and
`cta_click` (`src/layouts/Landing.astro`). They carry the same common
properties, so nothing downstream needs to know the difference.

---

## 1. Data Layer Variables

**Tags → Variables → User-Defined Variables → New → Data Layer Variable.**

Create one per row. The **Data Layer Variable Name** must match the key exactly —
these are the keys `track()` writes (`src/lib/analytics/track.ts`) and GA4 will
receive `undefined` for a typo, silently.

| Variable name (yours) | Data Layer Variable Name (exact) | What it holds |
|---|---|---|
| `DLV - variant` | `variant` | `money`, `time` or `discipline` |
| `DLV - experiment_id` | `experiment_id` | always `try_free_pain_v1` |
| `DLV - is_qa` | `is_qa` | boolean; `true` for previews, local and forced variants (D18) |
| `DLV - page_path` | `page_path` | e.g. `/` |
| `DLV - cta_location` | `cta_location` | `header`, `hero`, `plan_preview`, `final` |
| `DLV - entry_cta_location` | `entry_cta_location` | which CTA opened the quiz |
| `DLV - step_number` | `step_number` | 1–6 |
| `DLV - step_name` | `step_name` | `name`, `market`, `experience`, `weekly_hours`, `goal`, `email` |
| `DLV - answer` | `answer` | enum value; **absent** on the name and email steps, by design |
| `DLV - from_step` | `from_step` | on `quiz_step_back` |
| `DLV - error_code` | `error_code` | `network`, `validation`, `server` |
| `DLV - converted` | `converted` | boolean on `plan_view`; `false` after a 409 |
| `DLV - utm_source` | `utm_source` | first touch |
| `DLV - utm_medium` | `utm_medium` | |
| `DLV - utm_campaign` | `utm_campaign` | |
| `DLV - utm_content` | `utm_content` | |
| `DLV - utm_term` | `utm_term` | |

Leave **Data Layer Version** at **Version 2** for all of them.

> There is no variable for a name or an email, and there must never be one.
> `track()` drops any value matching an email pattern and logs the violation
> (`src/lib/analytics/track.ts`), so a PII variable would collect `undefined` —
> but the rule is the point, not the safety net.

## 2. Trigger — all client events

**Triggers → New → Custom Event.**

- **Trigger name:** `CE - all landing events`
- **Event name:** paste exactly, and tick **use regex matching**:

```
^(experiment_exposure|cta_click|plan_preview_view|quiz_start|quiz_step_complete|quiz_step_back|quiz_error|signup_submit|signup_email_exists|plan_view|open_app_click)$
```

- **This trigger fires on:** All Custom Events

These eleven are every client-side event in `src/lib/analytics/events.ts`. The
anchors matter: without `^` and `$`, `quiz_start` also matches a future
`quiz_started`. `account_created` is deliberately **not** in the list — it is
sent server-side (step 8).

## 3. Trigger — QA exclusion (optional but recommended)

**Triggers → New → Custom Event**, same regex as above, then **Some Custom
Events** with the condition `DLV - is_qa` **equals** `false`.

Name it `CE - all landing events (production only)` and use it on the GA4 event
tag instead of the unfiltered one if you would rather QA traffic never reach GA4
at all. The alternative is to let it in and filter in reports (step 9) — both
work; filtering at the tag is harder to forget.

## 4. Tag — Google tag

**Tags → New → Google Tag.**

- **Tag ID:** your `G-XXXXXXXXXX`
- **Trigger:** Initialization — All Pages
- **Configuration settings:** add `send_page_view` = `true`

This is what creates the `_ga` and `_ga_<CONTAINER>` cookies. The quiz reads
those to send `client_id` and `session_id` with the signup
(`src/lib/analytics/ga-cookies.ts`), so the server-side `account_created` lands
in the same GA4 session as the browser events. **If this tag does not fire, the
server event still sends but loses its session attribution.**

## 5. Tag — GA4 event

**Tags → New → Google Analytics: GA4 Event.**

- **Measurement ID:** `G-XXXXXXXXXX`
- **Event Name:** `{{Event}}` — the built-in variable, so one tag covers all
  eleven events rather than eleven near-identical tags
- **Trigger:** `CE - all landing events` (or the production-only one from step 3)

**Event Parameters** — add every row:

| Parameter name | Value |
|---|---|
| `variant` | `{{DLV - variant}}` |
| `experiment_id` | `{{DLV - experiment_id}}` |
| `is_qa` | `{{DLV - is_qa}}` |
| `page_path` | `{{DLV - page_path}}` |
| `cta_location` | `{{DLV - cta_location}}` |
| `entry_cta_location` | `{{DLV - entry_cta_location}}` |
| `step_number` | `{{DLV - step_number}}` |
| `step_name` | `{{DLV - step_name}}` |
| `answer` | `{{DLV - answer}}` |
| `from_step` | `{{DLV - from_step}}` |
| `error_code` | `{{DLV - error_code}}` |
| `converted` | `{{DLV - converted}}` |
| `utm_source` | `{{DLV - utm_source}}` |
| `utm_medium` | `{{DLV - utm_medium}}` |
| `utm_campaign` | `{{DLV - utm_campaign}}` |
| `utm_content` | `{{DLV - utm_content}}` |
| `utm_term` | `{{DLV - utm_term}}` |

Parameters that do not apply to a given event simply arrive empty; that is
cheaper than maintaining one tag per event.

**User Properties** — add one:

| Property name | Value |
|---|---|
| `experiment_variant` | `{{DLV - variant}}` |

This is what lets you segment *users* by arm in GA4 reports, not just events.

## 6. Turn off enhanced measurement form events

**GA4 → Admin → Data streams → your stream → Enhanced measurement → gear icon →
untick "Form interactions".**

The quiz already emits `quiz_step_complete` per step. Leaving this on would
double-count every step, and GA4's automatic form events can capture field
names — which on the email step is exactly the data that must never leave the
browser.

Leave page views, scrolls and outbound clicks on.

## 7. GA4 — custom dimensions

**Admin → Custom definitions → Custom dimensions → Create.**

All **Event-scoped** except the last:

| Dimension name | Scope | Event parameter |
|---|---|---|
| Variant | Event | `variant` |
| Experiment ID | Event | `experiment_id` |
| Is QA | Event | `is_qa` |
| Step name | Event | `step_name` |
| CTA location | Event | `cta_location` |
| Answer | Event | `answer` |
| Error code | Event | `error_code` |
| Experiment variant | **User** | `experiment_variant` |

GA4 only collects a parameter into reports **from the moment its dimension
exists** — it does not backfill. Create these before sending real traffic, or
the first days of the experiment are unsegmentable.

## 8. GA4 — `account_created` as a key event

`account_created` does not come from GTM. It is sent server-side via the
Measurement Protocol when a user transitions to `converted`
(`src/pages/api/users/[id].ts` → `src/lib/analytics/measurement-protocol.ts`),
because it is the one event the experiment cannot afford to lose to an ad
blocker or a closed tab.

1. **Admin → Data streams → your stream → Measurement Protocol API secrets →
   Create.** Put the value in `GA4_API_SECRET` and the stream's measurement ID
   in `GA4_MEASUREMENT_ID` (both server-side only — never `PUBLIC_`).
2. Send one conversion so GA4 has seen the event at least once.
3. **Admin → Events →** find `account_created` **→ Mark as key event.**

It arrives with `user_id`, `client_id`, `session_id`, `variant`,
`experiment_id`, `is_qa`, `market`, `experience`, `weekly_hours` and `goal`.
No name, no email.

## 9. GA4 — keep QA traffic out of reports

Two layers, because either one alone can be forgotten:

- **Admin → Data settings → Data filters:** create an **Internal traffic**
  filter if you use one, and set it to Active (it ships as Testing).
- **In every experiment report:** add the condition `Is QA` **exactly matches**
  `false`. Preview deployments, local dev and any `?variant=` override all send
  `is_qa: true` (D18), and none of them are real traffic.

## 10. Verify before trusting any of it

In this order — each step catches something the next one assumes:

1. **GTM Preview** on the deployed URL. Walk the quiz. You should see, in order:
   `experiment_exposure`, `cta_click`, `quiz_start`, six `quiz_step_complete`,
   `signup_submit`, `plan_view`. Click one and confirm `variant` and
   `experiment_id` are populated, not `undefined`.
2. **The console, before GTM loads.** Reload and immediately run
   `window.dataLayer.map(e => e.event)`. Events pushed before GTM initialised
   must already be in the array — that is the deferred-loading contract
   (`src/components/Gtm.astro`), and if they are missing the events are being
   lost rather than queued.
3. **No PII.** Run `JSON.stringify(window.dataLayer).includes('@')` after
   completing the quiz. It must be `false`. This is asserted in
   `tests/e2e/quiz.spec.ts`, but check it by hand once against the real
   container — a GTM variable added later could reintroduce it.
4. **GA4 DebugView** (Admin → DebugView) with GTM Preview open. Confirm the
   events arrive and carry the custom dimensions.
5. **`account_created`.** Complete one real conversion in production and confirm
   it appears in DebugView with `user_id`. The payload shape is already
   validated against GA4's `/debug/mp/collect` in
   `tests/integration/measurement-protocol.test.ts`, which catches a malformed
   event — the production endpoint answers `204` to anything, including events
   it then silently drops.
6. **Reconcile.** After a day, compare GA4's `account_created` count with
   `GET /api/stats`. They should agree within ~2% (`docs/analytics.md` §6). The
   exposure counts will not agree, and are not meant to: Postgres is the source
   of truth and the gap is the ad-block rate, measured rather than assumed.
