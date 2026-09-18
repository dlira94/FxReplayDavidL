# Research — "Try FX Replay Free"

Input for messaging (StoryBrand), quiz design and the copy experiment.
Desk research conducted Sep 17, 2026. Sources at the bottom. Pain selection is a human decision — see `decisions.md`.

---

## 1. Product snapshot

- **What it is:** a browser-based manual backtesting and market-replay platform. Traders replay real historical price action candle by candle, place simulated trades, and review results. Forex, futures, crypto, indices, commodities.
- **Core features relevant to messaging:** TradingView-style charts, multi-chart / multi-asset sessions, built-in journal, prop firm simulator (custom drawdown / profit-target rules), Mentor AI on simulated sessions, Monte Carlo and R:R analytics, economic calendar context.
- **Offer structure:** a **Free plan** (no credit card, never expires) plus a **5-day trial of paid plans** (card required). Paid tiers: Intermediate ≈ $17.99/mo, Pro ≈ $35/mo, with regional pricing.
- **Social proof in market:** "Trusted by 1M+ traders" on the homepage; ~600 Trustpilot reviews.

  **Figures used on the landing** — the social-proof bar shows numbers only, so each one is pinned to where it comes from. Nothing else on the page is allowed to become a number.

  | Figure | Claim | Source |
  |---|---|---|
  | `1M+` | traders | FX Replay's own homepage ("Trusted by 1M+ traders") |
  | `600+` | reviews on Trustpilot | Trustpilot profile. **Verified 2026-09-18: still 600+.** A review count moves, so re-check if this sits unshipped for long — a stale number is a wrong number, and this is the only figure on the bar that can go out of date without anyone noticing |
  | `$0` | real money at risk | Product fact, not a metric: FX Replay is a replay/simulation platform (§1 Positioning, "zero real money involved"). The only figure here that cannot go out of date |
- **Positioning:** a *practice room*, not a broker, not an automated strategy engine. Educational framing: zero real money involved.

- **Plan tiers and market access** *(third-party source)*: LuxAlgo's platform overview reports three tiers — Beginner (free; 2 sessions, 50 trades per session, one-week retention), Intermediate (≈$17.99/mo), Pro (≈$35/mo; unlimited sessions and retention) — and states that **"the pricing table reserves seconds data and futures/CME access for Pro."**
  Source: [LuxAlgo, *FX Replay backtesting platform overview*, July 2025](https://www.luxalgo.com/blog/fx-replay-backtesting-platform-overview/).
  **Caveat:** this is a third party, not FX Replay's own pricing page, and it is from July 2025. It is the basis for the futures line in the practice plan (`decisions.md` D26), so **re-check it against FX Replay's live pricing page before production.** The same source also describes the free tier as *capped* (2 sessions, 50 trades), which is narrower than "free forever" alone implies — worth confirming before any copy leans on free-plan generosity.

**Implication for this challenge:** "Try FX Replay Free" should lead to the **Free plan** (no card). That is the lowest-friction conversion and matches the business objective (account creation), so the landing never mentions a card.

## 2. Who we're talking to

| Segment | Situation | What they want |
|---|---|---|
| Aspiring / beginner discretionary trader | Learning, often losing on live or demo | Proof a strategy works before risking money |
| Part-time trader with a day job | 1–3 h/day, markets closed on weekends | Screen time without being in front of live charts |
| Prop firm candidate | Paying evaluation fees, often failing | Rehearse under challenge rules before paying |
| Active backtester | Using TradingView replay + spreadsheets | A faster, cleaner workflow |

## 3. Voice of customer (paraphrased patterns)

- Reviewers praise eliminating screen fatigue and improving discipline.
- Several say they got through years of historical data in a few weeks.
- Prop firm prep is a recurring reason to use it; reviewers call it the go-to option for that.
- Confidence from having data before going live is a repeated theme.
- Price sensitivity exists; regional pricing is appreciated by traders who don't yet have an edge.
- Forum culture: "be a part-time trader and a full-time backtester."
- Competing workflow pain: TradingView replay has multi-timeframe issues (higher-timeframe candles can reveal future data) and some tools don't work in replay.

## 4. Competitive context

- **TradingView Bar Replay:** the default free alternative; familiar, but not built for structured backtesting (no journal, no challenge rules, replay quirks).
- **Forex Tester Online / desktop:** direct competitor; also markets prop challenge simulation and automated testing.
- **Tradewell, TradingSim:** narrower or pricier; stock / day-trading focus.

Differentiation to lean on: browser-based, TradingView feel, journal + prop sim + AI in one place, a free plan that doesn't expire.

## 5. Copy guardrails (apply to every variant)

1. **No profit promises.** No "become profitable" or "win more". FX Replay positions itself as educational. We sell *practice, evidence, and confidence*, not returns.
2. No invented statistics. Only claims we can source (e.g. "1M+ traders" from FX Replay's own site).
3. Same structure, same UI, same quiz questions across variants. **Only copy changes** (hero, problem section, quiz intro microcopy, result framing).
4. The pain must continue through the whole flow (hero → quiz intro → result), not just the headline.

---

## 6. Six pain angles (pick 3)

Each angle maps to the StoryBrand frame: **Hero** (the trader) · **Villain** · **External / Internal / Philosophical problem** · **Guide** (FX Replay) · **Plan** (the quiz) · **Success** · **Failure avoided**.

### Option 1 — "The market is an expensive classroom" (money)
- **Villain:** learning with real money.
- **External:** losing capital while testing ideas live.
- **Internal:** anxiety every time they click buy; feeling like they're gambling.
- **Philosophical:** you shouldn't have to pay the market to learn.
- **Sample hero:** *Stop paying the market to learn. Practice on real historical data with zero money at risk.*
- **Result framing:** "Your risk-free practice plan"
- **Audience fit:** broadest (beginners + intermediate). **Risk:** generic; many competitors say it.

### Option 2 — "I don't have time to watch charts" (time)
- **Villain:** the clock (day job, market hours, weekends closed).
- **External:** not enough screen time to get good.
- **Internal:** frustration of progressing slowly; feeling behind full-time traders.
- **Philosophical:** skill should come from reps, not from quitting your job.
- **Sample hero:** *Get years of screen time in weeks — on your schedule, even on weekends.*
- **Result framing:** "Your practice schedule for [X] hours a week"
- **Audience fit:** part-timers (large segment). **Strength:** concrete, product-specific benefit (compressing time).

### Option 3 — "I keep failing prop firm challenges" (evaluation fees)
- **Villain:** challenge rules + pressure.
- **External:** paying evaluation fees and failing on drawdown or daily loss limits.
- **Internal:** self-doubt; "maybe I'm not good enough."
- **Philosophical:** you should know you can pass before you pay.
- **Sample hero:** *Pass your next prop firm challenge before you pay for it.*
- **Result framing:** "Your challenge rehearsal plan"
- **Audience fit:** narrower but highly motivated; matches an existing feature and FX Replay content. **Risk:** alienates non-prop traffic.

### Option 4 — "I don't trust my strategy" (confidence / evidence)
- **Villain:** guesswork and hope.
- **External:** no data on whether their setup actually works.
- **Internal:** hesitation, second-guessing entries, jumping between strategies.
- **Philosophical:** decisions should be backed by evidence, not feelings.
- **Sample hero:** *Know your edge before you risk a dollar.*
- **Result framing:** "Your strategy validation plan"
- **Audience fit:** broad; strong emotional pull. **Risk:** overlaps with Options 1 and 5.

### Option 5 — "My strategy isn't the problem, my discipline is" (psychology)
- **Villain:** their own impulses (revenge trading, breaking rules, overtrading).
- **External:** inconsistent execution despite having a plan.
- **Internal:** shame and frustration after breaking their own rules.
- **Philosophical:** discipline is a skill you train, not a trait you're born with.
- **Sample hero:** *Train discipline like a skill. Rehearse your rules until they're automatic.*
- **Result framing:** "Your discipline training plan"
- **Audience fit:** intermediate traders who've already lost; journal + Mentor AI support it. **Risk:** harder message for beginners.

### Option 6 — "Backtesting is tedious" (workflow friction)
- **Villain:** spreadsheets, manual logging, replay hacks.
- **External:** hours lost to logging trades and fighting tools.
- **Internal:** backtesting feels like a chore, so they skip it.
- **Philosophical:** practice should feel like trading, not accounting.
- **Sample hero:** *Backtest like you trade — no spreadsheets, no replay hacks.*
- **Result framing:** "Your streamlined backtesting setup"
- **Audience fit:** people already backtesting (bottom of funnel). **Risk:** smallest audience; less relevant for paid acquisition of new users.

---

## 7. How to choose

For the experiment to teach us something, the three variants should be **as different from each other as possible**. If two variants appeal to overlapping pains (e.g. 1 and 4), a flat result tells us nothing.

**Recommended set: 1 (money) + 2 (time) + 5 (discipline).** These cover three distinct dimensions: an external money cost, an external time constraint, and an internal self-trust problem. All three apply to broad paid-acquisition traffic.

**Alternative:** swap 5 → 3 (prop firm) if we assume a significant share of paid traffic comes from prop firm keywords. The trade-off is a stronger match for that segment but a weaker read on general traffic.

## 8. Quiz inputs (shared across variants)

The questions stay identical; only the intro microcopy per question adapts to the variant's pain.

1. First name — used to personalize the result.
2. What do you trade? (Forex · Futures · Crypto · Indices / other)
3. How long have you been trading? (Just starting · < 1 year · 1–3 years · 3+ years)
4. How much time can you practice per week? (< 2 h · 2–5 h · 5–10 h · 10+ h)
5. What's your main goal right now? (Validate a strategy · Pass a prop challenge · Build discipline · Get more screen time)
6. Email → creates the free account and delivers the plan.

Q5 also works as a **self-reported pain signal**: across variants, it tells us which pain users identify with, independent of which copy they saw. That's a useful secondary insight.

---

## Sources

- FX Replay homepage — https://fxreplay.com/
- FX Replay support: free trial — https://support.fxreplay.com/articles/does-fx-replay-offer-a-free-trial
- FX Replay blog: prop firm challenge — https://fxreplay.com/learn/how-to-pass-a-prop-firm-challenge-using-fx-replay
- Trustpilot reviews — https://www.trustpilot.com/review/fxreplay.com
- NYC Servers review (May 2026) — https://newyorkcityservers.com/blog/fx-replay-review
- Find My Moat — https://www.findmymoat.com/tools/fx-replay
- QuantVPS review — https://www.quantvps.com/blog/fx-replay-review
- Traders Second Brain review — https://traderssecondbrain.com/guides/fxreplay-review
- Forex Tester: alternatives — https://forextester.com/blog/fxreplay-alternatives/
- BabyPips forum: trading with a day job — https://forums.babypips.com/t/is-trading-forex-a-full-time-job/50284
- TradingView: replay multi-timeframe issue — https://www.tradingview.com/script/D5f1EYfJ-Mark-Fix-Backtest
