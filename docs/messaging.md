# Messaging — StoryBrand framework and variant copy

Source of truth for every word on the page. Components read copy from `src/content/variants/*` generated from this file; don't hard-code copy in components.

**Experiment rule:** only the blocks marked **[variant]** change. Everything marked **[shared]** is identical across variants, including the primary CTA label, so the test isolates the *pain framing*.

---

## Shared frame [shared]

| StoryBrand element | Content |
|---|---|
| Hero | A discretionary trader who wants to get better without risking money |
| Guide: empathy | "We've been there: learning the hard way is expensive." |
| Guide: authority | Trusted by 1M+ traders · replay real historical markets · journal, analytics and AI mentor built in |
| Plan | 1. Answer a few quick questions → 2. Get your personalized practice plan → 3. Start practicing free |
| Primary CTA | **Build my free practice plan** |
| Transitional CTA | "See a sample plan" (scrolls to the plan preview) |
| Success | Walk into the live market with reps, data and a routine behind every decision |
| Failure avoided | Learning with real money, guessing, repeating the same mistakes |

**Plan preview section title:** "Here's what you'll get in 2 minutes"
**Trust line under CTA:** "Free forever plan · No credit card"

**Where to practice [shared]** — one line per answer to quiz question 2. Shared across variants: the plan logic is identical between arms, only the framing differs (`experiment.md`).

| Market | Line |
|---|---|
| Forex | EUR/USD and GBP/USD, during the London–New York overlap |
| Futures | ES and NQ at the New York open (futures data requires a paid plan; practice the same setup on an index meanwhile) |
| Crypto | BTC/USD and ETH/USD; the market runs 24/7, so weekends count too |
| Indices / other | Your market's main index, at its opening session |

**Social proof bar [shared]** — three figures, each sourced in `research.md` §1. A number with no source does not go on this bar.

| Figure | Title | Body |
|---|---|---|
| 1M+ | traders | Already practising on FX Replay. |
| 600+ | reviews on Trustpilot | Public, and you can read every one. |
| $0 | real money at risk | Historical data, simulated orders, every session. |

**Testimonials [shared]** — every card carries a visible "Sample testimonial" label. These are written examples of the kind of feedback the product gets, not quotes from real people (`decisions.md` D27).

| Attribution | Quote |
|---|---|
| Part-time trader, 2 years in | I was getting four trades a week around my job. Now I get four hundred, and I can tell which setup actually works. |
| Prop challenge candidate | I blew two evaluations on the same mistake. Replaying it fifty times was cheaper than a third attempt. |
| Beginner, six months in | I stopped guessing whether my strategy was bad or I was. The journal answered it in a week. |

**Hero visual indicators [shared]** — the hero visual is identical across arms, so it must speak to all three pains at once rather than to the one the variant happens to frame. One indicator per pain:

| Pain | Indicator | Reads as |
|---|---|---|
| money | `$0 at risk` | nothing to lose while you learn |
| time | `3 months replayed in 2 hours` | screen time without the calendar |
| discipline | `Rules followed: 47/50` | execution you can actually measure |

The trade drawn on the chart is a *simulated* one — entry, stop and target — which is the product doing the thing the copy promises.

**SEO [shared]** — identical across arms on purpose: a title that varied by variant would give search engines whichever arm the crawler happened to be assigned.
- Title: "Try FX Replay Free — Practice trading on real historical markets"
- Meta description: "Practice on real historical markets with no money at risk. Answer a few quick questions and get a personalized practice plan. Free forever plan, no credit card."

**Footer disclaimer [shared]:** "FX Replay is an educational practice tool. You practice on historical market data — no real money is involved. Trading live markets carries risk of loss."

Stated plainly, once, in the footer: it is an honest description of what the product is, not a warning bolted on. Rendered at `--text-sm` in `--text-secondary`; never styled as an alert.

**FAQ (shared)**
- *Is it really free?* Yes. The free plan needs no credit card and doesn't expire.
- *Do I trade real money?* No. You practice on real historical market data; no money is involved.
- *What happens with my email?* It creates your free FX Replay account so your plan is saved. No spam.
- *I'm a beginner. Is this for me?* Yes. Your plan adapts to your experience level.

---

## Variant `money` — "The market is an expensive classroom" (control)

- **Villain:** learning with real money
- **External:** losing capital while testing ideas live
- **Internal:** anxiety every time you click buy
- **Philosophical:** you shouldn't have to pay the market to learn

**[variant] Hero**
- H1: **Stop paying the market to learn.**
- Sub: Practice your strategy on real historical markets with zero money at risk. Get a practice plan built around how you trade.

**[variant] Problem section**
- Title: Every live mistake has a price.
- Body: Testing a new setup with real money turns every lesson into a loss. It makes each trade stressful, and it makes it impossible to tell a bad strategy from bad luck. You deserve a place to make mistakes for free.

**[variant] Quiz intro:** "Let's build your risk-free practice plan."
**[variant] Email step:** "Your plan is ready. Where should we save it?"
**[variant] Result title:** "{name}'s risk-free practice plan"
**[variant] Result lead:** "Every rep below costs you nothing. Make your mistakes here, not in your account."

---

## Variant `time` — "I don't have time to watch charts"

- **Villain:** the clock: day job, market hours, weekends closed
- **External:** not enough screen time to improve
- **Internal:** frustration of progressing slowly; feeling behind
- **Philosophical:** skill should come from reps, not from quitting your job

**[variant] Hero**
- H1: **Years of screen time. On your schedule.**
- Sub: Replay real markets at your own speed — evenings, weekends, whenever you have an hour. Get a practice plan that fits the time you actually have.

**[variant] Problem section**
- Title: The market doesn't wait for your day job to end.
- Body: The best setups happen while you're at work, and the market is closed when you finally have time. So you get a few trades a week and progress feels painfully slow. Screen time shouldn't depend on your calendar.

**[variant] Quiz intro:** "Let's fit practice into your week."
**[variant] Email step:** "Your schedule is ready. Where should we save it?"
**[variant] Result title:** "{name}'s weekly practice schedule"
**[variant] Result lead:** "Here's how to fit months of market experience into {hours} a week."

---

## Variant `discipline` — "My strategy isn't the problem, my discipline is"

- **Villain:** your own impulses: revenge trading, breaking rules, overtrading
- **External:** inconsistent execution despite having a plan
- **Internal:** frustration after breaking your own rules
- **Philosophical:** discipline is a skill you train, not a trait you're born with

**[variant] Hero**
- H1: **Train discipline like a skill.**
- Sub: Rehearse your rules on real historical markets until following them is automatic. Get a practice plan built around the habits you want to fix.

**[variant] Problem section**
- Title: You know the rules. Following them is the hard part.
- Body: You have a plan, then one loss turns into a revenge trade, and a good week turns into a blown one. It's not a knowledge problem; it's a reps problem. Discipline gets built the same way as any skill: practice, feedback, repeat.

**[variant] Quiz intro:** "Let's build your discipline training plan."
**[variant] Email step:** "Your training plan is ready. Where should we save it?"
**[variant] Result title:** "{name}'s discipline training plan"
**[variant] Result lead:** "Each session below trains one habit until it sticks."

---

## Quiz microcopy

Question text is **[shared]**; the one-line helper under each question is **[variant]**.

| Step | Question [shared] | `money` helper | `time` helper | `discipline` helper |
|---|---|---|---|---|
| 1 | What should we call you? | — | — | — |
| 2 | What do you trade? | We'll load the markets you care about. | We'll pick the sessions that fit your hours. | We'll use markets where your habits show up. |
| 3 | How long have you been trading? | So your plan starts at the right level. | So we don't waste your time on basics. | So we target the right habits. |
| 4 | How much time can you practice per week? | Even 2 hours adds up fast. | Be honest; the plan fits around it. | Short, focused sessions beat long, sloppy ones. |
| 5 | What's your main goal right now? | — | — | — |
| 6 | Email | Creates your free account and saves your plan. | (same) | (same) |

**Consent line (email step, shared):** "By continuing you'll create a free FX Replay account. No credit card. We won't share your email."

## Copy tokens

Copy strings may contain `{token}` placeholders, replaced at render time from the user's answers. A slot that has no answer yet never renders — the tokens only appear on the result screen, after every step is filled.

| Token | Source | Rendered as |
|---|---|---|
| `{name}` | step 1, free text | The name as typed, trimmed. Escaped on render |
| `{hours}` | step 4, `weekly_hours` enum | The range label below, not the raw enum value |

**`{hours}` mapping** — one label per option, phrased to read naturally inside "… into {hours} a week":

| Option (step 4) | Stored value | Renders as |
|---|---|---|
| < 2 h | `lt_2` | less than 2 hours |
| 2–5 h | `2_5` | 2–5 hours |
| 5–10 h | `5_10` | 5–10 hours |
| 10+ h | `10_plus` | 10+ hours |

The labels are shared across variants: only the sentence around the token is `[variant]`. The mapping lives with the plan logic in `src/lib/plan.ts` and is unit-tested, so a new option can't ship without a label.

## Copy guardrails

1. No profit, win-rate or income promises.
2. Only sourced claims ("1M+ traders" is from FX Replay's own site).
3. Brand blue is never used for small body text (contrast 4.02:1, see `decisions.md`).
4. New variants are drafted with the `storybrand-copy` skill and must fill every [variant] slot above.
