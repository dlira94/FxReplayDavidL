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
- **Population:** all landing traffic; `is_qa`, internal and bot traffic excluded
- **Source of truth:** Postgres (exposures logged server-side by middleware; conversions by status transition)

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

## Demo note

The challenge deployment has no real traffic. The dashboard shows the readout mechanics on test data; the numbers above are the plan for production.
