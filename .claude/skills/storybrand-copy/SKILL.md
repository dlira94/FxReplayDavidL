---
name: storybrand-copy
description: Draft, rewrite or validate landing-page copy for an experiment variant using the StoryBrand framework and this project's copy guardrails. Use when creating a new pain variant, editing any [variant] copy slot in docs/messaging.md, or reviewing copy before it ships.
---

# StoryBrand copy for experiment variants

Every variant in this project is a *pain framing* of the same product. Your job is to fill every copy slot for one pain, keep it on-brand and honest, and keep the experiment clean.

## Inputs

1. The pain (from `docs/research.md` §6 or given by David)
2. `docs/messaging.md`: the shared frame and the list of [variant] slots
3. `docs/research.md` §3 (voice of customer) and §5 (guardrails)

## Step 1: Frame the pain

Write these before any copy:
- **Villain:** the thing causing the problem (never a person or a competitor)
- **External problem:** the tangible situation
- **Internal problem:** how it makes the trader feel
- **Philosophical problem:** why it's just plain wrong ("you shouldn't have to…")

## Step 2: Fill every [variant] slot

| Slot | Rule |
|---|---|
| Hero H1 | ≤ 8 words. Names the pain or its opposite. No jargon. |
| Hero sub | 1–2 sentences: guide + plan in plain words; ends pointing to the practice plan |
| Problem title | The external problem in the trader's own words |
| Problem body | 3 sentences: external → internal → philosophical |
| Quiz intro | ≤ 8 words, frames the quiz as building something for them |
| Question helpers (steps 2–4) | ≤ 10 words each, explains why we ask *in terms of this pain* |
| Email headline | Plan is ready + where to save it |
| Result title | Uses `{name}`; names the plan in the pain's terms |
| Result lead | 1 sentence; may use `{hours}` (rendered as the range label, e.g. "2–5 hours") |

Do **not** change shared slots: primary CTA label, question text, FAQ, consent line.

## Step 3: Validate (all must pass)

- [ ] No promise of profit, win rate, income or "becoming profitable"
- [ ] Every factual claim is sourced in `docs/research.md` (e.g. "1M+ traders")
- [ ] The trader is the hero; FX Replay is the guide (no "we're the best")
- [ ] Pain is consistent from hero → quiz → result (read them in sequence)
- [ ] Distinct from existing variants: summarize each variant's pain in one sentence; if two sentences overlap, flag it
- [ ] Reading level: short sentences, no trading jargon a beginner wouldn't know
- [ ] Nothing depends on color or visuals to make sense

Report any failure with the slot and the reason, and propose a fix.

## Step 4: Deliver

1. Show the filled slots as a table for David's approval. **Do not write files before approval.**
2. After approval, update `docs/messaging.md` (new variant section, same structure as the others) and `src/content/variants/<id>.ts` (typed; must satisfy the `VariantCopy` type).
3. If a new variant is added to the experiment, add a row to `docs/decisions.md` and flag that `docs/experiment.md` (allocation, sample size) must be updated.

## Step 5: Copy literally, then prove it — not optional

`docs/messaging.md` is the source of truth. When writing copy into
`src/content/variants/<id>.ts`, **open the file and copy the strings across
character for character.** Never reconstruct a slot from memory, from the pain
framing, from a section heading, or from what you wrote a moment ago in the
approval table. Do not "improve" punctuation: `It's` does not become `It is`,
and an em dash stays an em dash.

This has already gone wrong once (`docs/ai-log.md`, Sep 18). Two variants were
written from memory. The result was fluent, on-brand, consistent with the pain,
and passed every check in Step 3 — because a good invention obeys all of them.
Nothing in this skill caught it.

**Why it matters more than it looks.** Copy is the *independent variable* of
this experiment. Layout, components, questions and plan logic are identical
across arms precisely so that copy is the only difference. Invented copy does
not fail loudly: it ships, runs for two weeks, and produces a readout that looks
exactly as trustworthy as a real one while answering a question nobody approved.

**Before you report the work as done, run:**

```bash
npm test -- tests/unit/variant-copy.test.ts
```

It asserts every rendered string appears verbatim in `docs/messaging.md`. If a
slot legitimately changed, the doc changes first and the test follows — never
the other way round. **A failure here is never fixed by editing the test.**

If you added a new slot to `VariantCopy`, add it to `renderedStrings()` in that
test too, or it ships unchecked.
