# Brand & design interpretation

What I did with FX Replay's typography and colour palette, what the brand kit
did not provide, and where I evolved the visual direction. Decisions are
numbered and live in [`decisions.md`](decisions.md).

## The interpretation

**A trading terminal, not a fintech brochure.** Near-black background, surfaces
separated by luminosity rather than shadow, and Electric Blue spent sparingly.
That reading comes from the product itself: FX Replay is a tool people sit in
front of for hours, and the brand's own dark palette is doing that work
already.

References were pulled through the Mobbin MCP — Figma's left-aligned hero,
Mailchimp's figure-and-caption proof strip, V7's two-panel contrast, Railway's
connected numbered steps, Mixpanel's dark FAQ rows. Patterns only; every pixel
resolves to a brand token.

## What the brand kit provided, and what it did not

`docs/brand/tokens.css` ships **colours and two font families**. No spacing
scale, no type scale, no radii, no elevation model. Components had no vocabulary
for size or rhythm and were reaching for raw pixel values.

So the project owns its own scales in `src/styles/scale.css`, while
`tokens.css` stays a **verbatim copy** of the brand kit and is never edited
(**D22**). The rule is: anything the brand defines lives in `tokens.css`;
anything I invented lives in `scale.css`, and if the brand ships a scale later,
mine gives way.

**Type** is fluid via `clamp()`, so there are no breakpoint jumps and no
per-breakpoint overrides to keep in sync. Lato for headings, Nunito Sans for
body, as the kit specifies — self-hosted, latin subset, only the three weights
actually used (Lato 700, Nunito Sans 400/600), 56 KB total.

| Token | Mobile → Desktop |
|---|---|
| `--text-display` | 36 → 64 px |
| `--text-2xl` | 28 → 44 px |
| `--text-xl` | 20 → 24 px |
| `--text-lg` | 17 → 20 px |

**Spacing** is a 4 px base with widening steps, plus a fluid section rhythm
(`--section-pad: clamp(3.5rem, 2rem + 7vw, 7.5rem)`). **Radii** are moderate —
6 px chips, 10 px buttons, 16 px cards — because this is a data tool, not a
consumer app.

## Elevation without shadow

`--bg-primary` and `--card-bg-primary` are **both** `dark-900` (`#030303`): a
card drawn with brand tokens alone is invisible against the page. And on a
near-black background a shadow does not exist.

So elevation is surface lightness plus a 1 px border (**D23**):

| Level | Use | Token |
|---|---|---|
| 0 | Page | `--bg-primary` `#030303` |
| 1 | Alternating section bands | `--bg-secondary` `#0A0A0A` |
| 2 | Cards, FAQ rows | `--card-bg-secondary` `#1A1A1A` + border |
| 3 | The plan-preview card | level 2 + `--border-brand` |

This also survives OLED screens, where shadow-based depth disappears entirely.

## The blue rule

Electric Blue marks **where FX Replay enters the story** (**D24**). Not
"sparingly" — that is a quantity, and quantities drift. A rule about meaning
holds.

StoryBrand casts the brand as the *guide*, so the colour appears exactly where
the guide, the plan, success and the call to action are:

- **Blue:** primary CTA · chart playhead · focus ring · plan-preview card
  border · eyebrows · the numbered steps and their connector · the "with FX
  Replay" panel.
- **Never blue:** the problem section · the villain · the "before" panel · the
  not-yet-played candles in the hero.

The absence is the point. A landing where the accent appears everywhere teaches
the eye that it means nothing, and the contrast between a neutral problem and a
blue solution is doing argumentative work.

## Contrast, measured

Computed rather than eyeballed, against `--bg-primary` `#030303`:

| Pair | Ratio | AA body text |
|---|---|---|
| `neutral-50` (body) | **19.08:1** | pass |
| `neutral-200` (secondary) | **13.51:1** | pass |
| `neutral-300` | **9.51:1** | pass |
| `neutral-50` on `blue-600` (CTA) | **4.75:1** | pass |
| `blue-400` — `--text-link`, `--focus-ring` | **7.00:1** | pass |
| `blue-500` | 5.26:1 | pass |
| **`blue-600` — brand blue** | **4.02:1** | **fails** |
| **`--error` `#CD3636`** | **4.10:1** | **fails** |

Brand blue never touches text. Small blue text resolves to `--text-link`
(`blue-400`) so no component has to remember the rule (**D7**). `--error` is
correct as a *background*; inline errors use `--text-error` (`error-light`),
recorded before the quiz shipped its validation (**D25**). Verified in the
production audit: **zero elements render text in `#0260FD`**.

### An open question for FX Replay's design team

**`--text-brand` points at `blue-600` — 4.02:1, failing AA at any body size.**
It is the one token whose *name* invites exactly the use that breaks it.
Nothing in the product uses it today, and `tokens.css` is a verbatim copy of the
brand kit, so I did not change it. The suggestion — repoint it to `blue-500` or
`blue-400`, or rename it — is in
[`docs/brand/README.md`](brand/README.md) alongside the `blue-950` question,
with the measured ratios. `CLAUDE.md` bans its use for text in the meantime.

## The hero visual

There are no product screenshots, so the hero is built in code: **inline SVG,
no network request, no layout shift, no dependency on assets that do not
exist.**

A generic candlestick chart would say "trading". What this product sells is
*replay*, so the visual says control of time: candles left of the playhead are
solid because they already happened, candles to the right are hollow ghosts
because you decide when they print. A simulated trade sits on top — entry, stop
and target — which is the product doing the thing the copy promises.

One playhead sweep on load, none at all under `prefers-reduced-motion`, and
`aria-hidden` throughout: the headline beside it carries the meaning.

### Three options, reviewed on the real background

Rather than describe a direction, I built three and put them on a page at the
exact width the hero column gets (468 px) and at 390 px:
[`/lab/hero-visual`](../src/pages/lab/hero-visual.astro) — **Chart first**,
**App panel**, **Split metrics**. All three shared one dataset, so they differed
in presentation only. David picked Split metrics.

The lab route answers **404 in production**. Deleting it before merge would
have worked too, but a route that refuses to exist cannot be forgotten about.

## Two places the design tells the truth about itself

**Testimonials are labelled "Sample testimonial", on the card.** They are
written examples, not quotes from real people. A fabricated testimonial
presented as genuine is a lie about a real person's opinion, and no conversion
is worth it — so the label is on the card face rather than in a footnote, since
a disclaimer someone has to go looking for is one designed not to be found. In
production the section is fed from the ~600 real Trustpilot reviews already
recorded in `research.md`, and whoever does that swap deletes the label
(**D27**).

**The hero indicators describe a session, not the product.** "$0 at risk",
"3 months replayed in 2 hours" and "Rules followed: 47/50" are illustrative of
what one replay session looks like — they are not product statistics, not
averages, and not claims about outcomes. They sit inside a decorative,
`aria-hidden` visual for that reason. The only figures presented *as* figures
are on the social-proof bar, and each of those is sourced in `research.md`:
`1M+` from FX Replay's homepage, `600+` from Trustpilot, `$0` from the fact that
the product is a simulator.

## Accessibility as a design constraint

Not a pass at the end. Touch targets ≥ 44 px, a visible focus ring everywhere
that is never removed, `prefers-reduced-motion` honoured globally, native
`fieldset` and radios rather than styled fakes, and contrast computed before a
colour was used rather than checked after. The measured outcome is
**Lighthouse Accessibility 100 in production**, but the number is the
consequence, not the goal — the choices above are.
