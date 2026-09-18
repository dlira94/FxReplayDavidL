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
| Plan | 1. Answer 4 quick questions → 2. Get your personalized practice plan → 3. Start practicing free |
| Primary CTA | **Build my free practice plan** |
| Transitional CTA | "See a sample plan" (scrolls to the plan preview) |
| Success | Walk into the live market with reps, data and a routine behind every decision |
| Failure avoided | Learning with real money, guessing, repeating the same mistakes |

**Plan preview section title:** "Here's what you'll get in 2 minutes"
**Trust line under CTA:** "Free forever plan · No credit card"

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

## Copy guardrails

1. No profit, win-rate or income promises.
2. Only sourced claims ("1M+ traders" is from FX Replay's own site).
3. Brand blue is never used for small body text (contrast 4.02:1, see `decisions.md`).
4. New variants are drafted with the `storybrand-copy` skill and must fill every [variant] slot above.
