---
name: add-tracking-event
description: Add or change an analytics event end-to-end (types, call site, docs, e2e assertion) so tracking never drifts from the analytics plan. Use whenever a new interaction needs measuring or an existing event's properties change.
---

# Add a tracking event

Tracking is part of the product. An event exists only when it is typed, fired, documented and tested. All four happen in the same change.

## Before writing code: check the design

Answer these and show them to David:
1. **Name:** `snake_case`, `object_action` (e.g. `quiz_step_complete`). Reuse an existing event with a property before creating a new one.
2. **Trigger:** the exact user action or system condition, and whether it fires once per session or every time.
3. **Properties:** name, type, allowed values. Prefer enums over free text.
4. **Client or server?** Anything that represents a conversion or must be exact → server (Measurement Protocol). Behavior → client `track()`.
5. **Funnel role:** which stage in `docs/analytics.md` §5 it belongs to, or "diagnostic".

Stop if any property could contain PII (name, email, free text, IP). Redesign it.

## Implementation checklist

- [ ] `src/lib/analytics/events.ts`: add the event to the typed event map with its property shape
- [ ] Call site uses `track('<event>', {...})`. Never push to `dataLayer` directly. Common properties (variant, experiment_id, is_qa, UTMs) are added by `track()`, not the call site.
- [ ] Server events go through `src/lib/analytics/measurement-protocol.ts` with an `event_id` for dedupe
- [ ] `docs/analytics.md` §4: add or update the row (event, trigger, properties)
- [ ] If it's a new GA4 custom dimension, note it under "GA4 setup" in `docs/analytics.md`
- [ ] `tests/e2e/`: assert the event appears in `window.dataLayer` with the expected properties during the relevant flow
- [ ] `npx astro check` and tests pass

## Output

Summarize: event name, trigger, properties, files changed, and how to see it in GA4 DebugView.
