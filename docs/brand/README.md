# FX Replay — Brand Kit

> **Note on what was actually received (decision D11).**
> The brand kit arrived without its folder structure, so the files are **flattened
> directly into `docs/brand/`** — there are no `logos/`, `tokens/` or `source/`
> subfolders. `tokens.json` and the `source/` PDFs (`Color Tokens.pdf`,
> `Typography.pdf`) were **not provided**, and `tokens.css` was **regenerated from
> `brand-kit.html`**, which is therefore the effective source of truth for color.
> The folder tree below describes the kit as originally designed, not as it exists
> here. See `docs/decisions.md` → D11.

The single source of truth for the FX Replay visual identity: logo, color, and type.
Everything here is generated from the design-system reference files in `source/`.

## What's in this folder

```
Brand Kit/
├── README.md              ← you are here
├── brand-kit.html         ← open in any browser: the visual brand kit (logo, colors, fonts)
├── logos/                 ← the marks, as SVG
│   ├── FXReplayLogo.svg   ← primary wordmark
│   ├── isotypeBlack.svg   ← isotype (play arrow) — black, for light backgrounds
│   └── isotypeWhite.svg   ← isotype — white, for dark backgrounds
├── tokens/                ← for engineers
│   ├── tokens.css         ← CSS custom properties (import once, use var(--token))
│   └── tokens.json        ← W3C-style design tokens (Style Dictionary / Tailwind codegen)
└── source/                ← original design-system reference exports
    ├── Color Tokens.pdf
    └── Typography.pdf
```

## The essentials

**Brand color** — Electric Blue `#0260FD`
**Ground** — dark-first, `dark-900` `#030303`
**Headings** — Lato (400 · 700 · 900)
**Body / UI** — Nunito Sans (400 · 600 · 700)

## How to use it

- **Designers / anyone:** open `brand-kit.html` to browse the marks, copy any hex, and see the fonts.
- **Engineers:** import `tokens/tokens.css` and reference the **semantic** tokens in product
  code — `var(--bg-primary)`, `var(--text-primary)`, `var(--border-brand)` — never the raw
  primitives (`dark-900`) and never hard-coded hex. Semantic tokens alias primitives, so
  re-theming is a one-line change.

## Colors, in two tiers

- **Primitives** (44) — the raw palette; the only place literal hex lives.
- **Semantic** (60) — purpose-named aliases that point at primitives
  (background, border, text, button, icon, banner, card). Build with these.

## Open questions for design

- ~~`btn-bg-primary-disabled` points at `blue-950`, which isn't defined in the primitive
  scale (it stops at `blue-900` `#012054`).~~ **Resolved (decision D6):** repointed to
  `blue-900`. Flagged for design to confirm — if `blue-950` is meant to exist, it should
  be added to the primitive scale and the token pointed back at it.
- `card-bg-translucent` = `dark-900` at 60% — implemented as `color-mix()` in `tokens.css`.
- **`text-brand` points at `blue-600` (`#0260FD`), which fails AA for small text.** Measured
  against `bg-primary` (`#030303`) it is **4.02:1**, below the 4.5:1 AA threshold for body
  copy — the same problem as decision D7, but on the one token whose *name* invites exactly
  that use. Nothing in the product uses it today (verified at runtime), and product code uses
  a project-owned alias `--text-link` → `blue-400` (**7.00:1**) instead.
  **Suggestion for design:** repoint `text-brand` to `blue-500` (5.26:1) or `blue-400`
  (7.00:1), or rename it to something that does not read as "the brand colour for text".
  Left unchanged here because `tokens.css` is a verbatim copy of the brand kit and this is
  the brand's call, not ours.

---
_Brand Kit v1 · colors + font families. No type-scale/sizing is enforced here by design._
