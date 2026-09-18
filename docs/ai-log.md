# AI log — delegated, corrected, rejected

Filled as the build progresses. The point is not volume; it's showing where judgment was applied.

| When | Tool | Delegated / did myself | What happened | Outcome |
|---|---|---|---|---|
| Setup | Claude (chat) | Delegated | Desk research on FX Replay, audience and 6 pain angles | **Accepted with judgment:** I picked 3 of 6 (money, time, discipline) |
| Setup | Claude (chat) | Delegated | Generated `tokens.css` from `brand-kit.html`; flagged brand-blue contrast failure (4.02:1) | **Accepted**, verified contrast values, logged as D7 |
| Setup | Claude Code | Delegated | Project status audit flagged README/structure mismatch and missing `decisions.md` | **Accepted**, fixed (D11) |
| Sep 17 | Claude Code | Delegated | Find whether MCP scoping can be pinned per project instead of per machine | **Accepted:** found `disableClaudeAiConnectors` + `enabledMcpjsonServers`, both settable in a checked-in `.claude/settings.json` (D12) |
| Sep 17 | Claude Code | Delegated | Set up Astro 7 config: static by default, on-demand only where needed | **Accepted with a correction I hadn't seen:** middleware isn't a route and has no mode of its own — it runs at build time on prerendered pages, with no cookies or headers. My instruction "only /api and the middleware on demand" was impossible as written. Logged as D13 and deferred rather than decided under time pressure |
| Sep 17 | Claude Code | Delegated | Check the 409 / duplicate-email path across api, analytics and experience docs | **Corrected:** it verified the three docs agreed and documented the gap in prose. Prose doesn't stop the dashboard from counting those users as step-6 abandons. I asked for a third status (`email_exists`) in the model instead |
| Sep 17 | Claude Code | Did myself | Decide whether to connect the repo to Vercel | Claude stopped at reporting that no project exists rather than creating one. Correct call: first deploy is mine to make |

**Outcome values:** Accepted · Accepted with edits · Rejected (and why)
