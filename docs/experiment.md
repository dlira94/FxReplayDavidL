# Experiment proposal — `try_free_pain_v1`

## Hypothesis

Framing "Try FX Replay Free" around a **specific, felt pain** converts better than framing it around the generic benefit of risk-free practice.

The control (`money`, "stop paying the market to learn") is the category message: FX Replay and its competitors all say some version of it, so it's familiar and easy to ignore. `time` and `discipline` name a situation the trader recognizes in their own week ("the market is closed when I finally have time", "I break my own rules"). StoryBrand's premise is that people act when they see their own problem described precisely.

**Prediction:** at least one of `time` / `discipline` beats `money` on account creation. `time` is expected to lead on paid traffic, because part-time traders with day jobs are the largest segment in the research.

## Control

Variant `money`: the full experience (landing → quiz → result) with the risk-free / money framing. Chosen as control because it's closest to FX Replay's current homepage messaging (`decisions.md` D5).

## Variants

| Variant | Pain | Hero |
|---|---|---|
| `time` | No time to watch charts | "Years of screen time. On your schedule." |
| `discipline` | Execution, not strategy | "Train discipline like a skill." |

**What changes:** only the copy slots marked [variant] in `messaging.md`: hero, problem section, quiz intro, per-question helper text, email headline, result title and lead.
**What doesn't:** layout, components, CTA label, quiz questions, plan logic, performance. One variable → a clean read.

## Design

- **Unit:** user (`fxr_aid` cookie); assignment sticky for 30 days
- **Allocation:** ⅓ / ⅓ / ⅓, server-side at the edge (no flicker, no client bias)
- **Population:** all landing traffic; rows flagged `is_qa` (non-production: previews, local, `?variant=` overrides) or `is_bot` are excluded
- **Source of truth:** Postgres. The middleware writes one `exposures` row per visitor (`api.md`), idempotent on `anonymous_id`; conversions are a status transition on `users`. Both sides of the ratio come from the same sink, and `GET /api/stats` serves them

## Metrics

**Primary:** account creation rate = users with `account_created` ÷ exposed users.

**Secondary (diagnostic):** quiz start rate · quiz completion rate (step 5 ÷ start) · email-step conversion (created ÷ step 5). These explain *where* a variant wins: does the message pull people in, or keep them going?

**Guardrails (must not get worse):** quiz error rate · 409 rate · LCP p75 per variant · bounce rate.

**Quality check (production):** D7 activation (first replay session within 7 days). A pain message could attract signups that never use the product. A variant that wins signups but loses activation is not a win.

## Sample size & duration

Assumptions to be validated against FX Replay's real baseline: baseline conversion **3 %**, minimum detectable effect **+20 % relative** (3.0 % → 3.6 %), power **80 %**, α = 0.05 with Bonferroni correction for 2 comparisons against control (α = 0.025 each).

→ **~16,900 exposed users per arm, ~51,000 total.**

Run **at least 2 full weeks** (weekday/weekend cycles) **and** until the sample is reached; maximum 6 weeks. With a lower baseline or less traffic, the options are: raise the MDE, drop to two arms (control vs the best-supported variant), or accept a longer run. That trade-off is exactly why a 3-arm test is a deliberate choice, not a free one.

No early stopping on the primary metric (no peeking). Guardrails and SRM are monitored daily and **can** stop the test.

## Decision rules

Evaluated only when the sample is reached (or at the maximum duration).

**Ship the variant** when:
- it beats control on the primary metric at α = 0.025, and the 95 % CI of the lift is above 0;
- no guardrail is significantly worse;
- (production) D7 activation is not significantly worse.

If both variants win, ship the larger lift. If they're statistically tied, ship the one with better activation.

**Continue the experiment** when:
- the sample isn't reached yet; or
- at the planned sample the lift is positive and ≥ the MDE but the CI still crosses 0 → extend once, up to the 6-week maximum.

**Reject the variant** when:
- it's significantly worse than control; or
- any guardrail is breached; or
- at full sample the CI includes 0 and the point estimate is below the MDE: no practically meaningful difference, so keep the simpler control.

**Invalidate and restart** on a sample ratio mismatch (p < 0.001).

## After the test

- Break the result down by `utm_source` / `utm_content` and by the quiz goal answer (Q5) as **exploratory**, not decision-making. If `discipline` wins for email traffic and `time` for paid social, the next step is personalization by channel, run as its own test.
- Q5 gives a free signal: which pain users self-select, independent of the copy they saw.

## Next experiments

**The next test is the quiz itself: six steps versus a single email field.**

This experiment varies the copy *inside* the quiz. It does not test the quiz —
and the quiz is the larger bet. Six steps between a visitor and a free account
is a real amount of friction, and nothing here tells us whether it pays for
itself.

**Why copy first.** Two reasons, and the second is the one that matters.

It isolates one variable: same components, same flow, same plan logic, so a
difference in conversion is a difference in message and nothing else. Testing
the flow and the copy at once would produce a result nobody could attribute.

And it makes the funnel legible. Six steps mean six measurable drop-off points,
so this experiment does not just say *which* message wins — it says *where* each
one loses people. A single-field form converts or it does not, and there is
nothing between those two states to learn from. Running the high-resolution
version first means the low-resolution test that follows starts with a map of
where friction actually lives.

**What the next test would measure.** Not the same primary metric, because the
two arms are not comparable on start rate — a single field has no "start" worth
the name.

| | Quiz (control) | Single email field |
|---|---|---|
| **Primary** | Account creation ÷ exposed | same |
| **Secondary** | Drop-off per step | Time from landing to submit |
| **The real question** | | D7 activation: does a signup that answered five questions come back? |

The quiz adds friction *and* intention. Someone who answered five questions
about how they trade has told us what they want and has invested something in
getting it; someone who typed an address has not. So the honest read is not
signups alone — **a single field that wins on conversion and loses on
activation is not a win**, it is a cheaper way to acquire people who never
return. That is the same rule the current experiment already applies (§Quality
check), and it is why the next test cannot be decided on the primary metric
either.

Also worth testing eventually, in this order: the personalized plan versus a
generic one (does the personalization earn its build cost?), and the number of
steps rather than their presence — four questions instead of five is a cheaper
change than removing the quiz.

## Demo note

The challenge deployment has no real traffic. The dashboard shows the readout mechanics on test data; the numbers above are the plan for production.
