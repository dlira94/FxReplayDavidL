# AI workflow

How this was actually built. Two layers with different jobs, and a human
between them who decides.

```
Claude (chat)          strategy, research, first drafts, second opinion
       ↕                        at checkpoints
     David              decides · corrects · rejects
       ↕                        every step
Claude Code            execution: code, tests, docs, verification in a browser
```

**Claude Code executes, I decide, the chat reviews at the points that matter.**
The separation is deliberate: the layer writing the code is the worst possible
reviewer of it, because it shares every assumption that produced it.

---

## Layer 1 — Claude (chat): strategy and review

Used before there was a repository, and at every checkpoint after.

**Where the project came from.** The approach, the desk research on FX Replay
and its audience, and the choice of which pains to test. Six pain angles came
out of that research; I picked three — money, time, discipline — because they
cover three different dimensions (an external cost, an external constraint, an
internal problem) rather than three flavours of the same one
(`research.md` §7, `decisions.md` D5).

**The documents came first, and the code followed them.** `brief.md`,
`research.md`, `messaging.md`, `experience.md`, `api.md`, `analytics.md`,
`experiment.md` and the first `CLAUDE.md` were all drafted in chat before a
single component existed. That ordering is the reason the build stayed
coherent: when Claude Code had to choose, the answer was usually already
written down, and when it was not, that absence was itself the finding — twice
the missing definition was the bug (`experience.md` §4 had a plan row with no
options; `analytics.md` had a denominator with nowhere to live, D17).

**Second opinion at checkpoints**, where I wanted a reader who had not just
written the thing: the visual direction before implementing it, the
architectural decisions, the review of `gtm-setup.md` before touching GTM, and
the close of each block.

## Layer 2 — Claude Code: execution

| Piece | What it does |
|---|---|
| `CLAUDE.md` | The rules the executing layer cannot drift from: semantic tokens only, copy only from `messaging.md`, no PII in analytics, performance budgets, and the Vercel access boundary |
| `storybrand-copy` (skill) | Drafts and validates variant copy against the StoryBrand frame and the guardrails. Step 5 — copy verbatim, then run the assertion — was added *after* the failure below |
| `add-tracking-event` (skill) | An event end to end: typed definition, call site, `analytics.md`, e2e assertion. Four places, one step, so tracking cannot drift from the plan |
| `pre-deploy-auditor` (agent) | A11y, budgets, SEO and experiment integrity against a real browser. Read-only. Ran before every merge |
| `growth-analyst` (agent) | Post-deploy readout from `/api/stats`, applying the `experiment.md` decision rules. Deliberately pointed away from the PII endpoint (D37) |
| Mobbin (MCP) | UI pattern research for the landing sections and the quiz |
| Playwright (MCP) | Drove the browser for every behavioural check in this file |

**Settings do the enforcing, not good intentions.** `.claude/settings.json`
pins the MCP servers to those two (D12), denies the Vercel CLI and `gh` because
both are signed in to work accounts on this machine (D14), and denies reading
`.env*`. Migrations ran with `node --env-file`, so credentials were used
without ever entering the conversation.

### MCP proposed, not used

- **Vercel MCP** — deploys, runtime logs, Web Analytics. Wired up and removed:
  OAuth on a Hobby scope never granted project access (`403`). Disabled (D15);
  deploy state is read by a human.
- **GA4 MCP** — would give `growth-analyst` the acquisition side, so cost per
  account created becomes answerable and channel segmentation stops being
  exploratory.

---

## Where the AI improved the execution

Not "wrote code faster" — specific things that get skipped when the priority is
shipping the next thing.

- **It measured instead of assuming, when asked to.** React was chosen in
  `CLAUDE.md`; before writing the quiz it measured a trivial island at **67 KB
  gzip against a 60 KB budget**, measured Preact at ~10 KB, and stopped for my
  decision rather than picking a library on my behalf. Then it found the second
  problem nobody had predicted: classic Zod does not tree-shake and put the
  island 67% over the new budget (D29, D30).
- **It found what the checks could not see.** A scoped CSS rule in
  `Header.astro` compiled to a selector matching nothing — no build error, no
  type error, a duplicate CTA wrapped across two lines on every phone. Later,
  `clip-path` shrank an element's intersection rectangle to zero, so
  `IntersectionObserver` never fired and twenty elements stayed invisible
  forever. Both were silent. Both got browser assertions afterwards.
- **It refused to fabricate.** No `aggregateRating` in the JSON-LD without
  rating data. No invented figures on the social-proof bar — only `1M+` has a
  source, so only `1M+` is a number. No "where to practice" row in the plan
  preview while `experience.md` had not defined its options.
- **It reported failure plainly.** Four e2e tests it could not make pass were
  marked `fixme` with the reason attached and called out in its summary, rather
  than deleted or left red.
- **It caught its own bug reappearing inside its own fix.** After changing
  `quiz_start` to fire on intent, its `onFocus` signal re-created the original
  problem one line lower, because the island focuses its own input on mount. It
  verified in a browser instead of assuming and added the guard.

## Where I corrected or rejected it

Full record in [`ai-log.md`](ai-log.md). The ones that matter:

- **It invented copy that read better than the approved copy** (Sep 18). Two
  variants' hero and problem text were reconstructed from memory rather than
  copied. Fluent, on-brand, consistent with the pain — and not what was
  approved. It would have passed `storybrand-copy`'s own validation, because a
  good invention obeys every guardrail. Copy is the *independent variable*
  here, so a paraphrase does not fail: it runs for two weeks and answers a
  question nobody asked. Fixed with an assertion that all 33 rendered strings
  appear character-for-character in `messaging.md`, and the skill now ends by
  running it.
- **It cited a source that did not say what it claimed.** I told it futures
  require a paid plan "per `research.md`". It checked, found the document does
  not map markets to tiers, implemented my copy anyway because the domain call
  was mine, and wrote the decision with the sourcing split explicit. I later
  found the real source; it read that before citing it.
- **Its first diagnosis of a flaky suite was wrong, and it said so.** It blamed
  database latency. Measuring found two real causes — Astro server-renders an
  island before hydrating, so tests were clicking inert markup, and `useEffect`
  is deferred, so a step painted before it was persisted. The second was a
  product bug the test had been correctly reporting. It corrected the decision
  record rather than keeping the tidier story.
- **A doc review turned into a code fix.** I found four errors in
  `gtm-setup.md`; correcting one exposed that the API skipped `account_created`
  for QA rows, which would have made the verification step I had just asked for
  show nothing.
- **I found a measurement bug no test could.** `quiz_start` fired when the
  island hydrated. Because the quiz is inline, that counted everyone who
  scrolled to the footer as a start. Every test passed: the events fired and
  carried the right properties. No automated check knows what an event is
  *supposed to mean* (D42).
- **I found a focus bug by reading its own report.** It wrote that the island
  focuses its input on mount and that it had guarded the analytics event
  against that. It had fixed the metric and left the behaviour: scrolling past
  the quiz stole focus, opening the keyboard on a phone (D44).

## The pattern

Every genuinely dangerous thing in this project was **silent** — no error, no
failing test, plausible output. Dead CSS, a deadlocked observer, an inert GTM
loader, invented copy, an event measuring the wrong thing.

Automation catches loud failures. The quiet ones needed a browser, a
second reader, or someone asking what a number was supposed to mean. That is
the argument for the shape of this workflow: not that the AI is unreliable, but
that it is *confidently* reliable in exactly the cases where confidence is the
problem.
