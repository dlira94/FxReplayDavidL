# Users API — contract

Astro server endpoints under `src/pages/api/`, deployed as Vercel serverless functions. Validation schemas live in `src/lib/schemas.ts` and are **shared by the quiz and the API** (one source of truth).

## Conventions

- JSON in and out; `Content-Type: application/json`
- IDs: UUID v4, server-generated
- Timestamps: ISO 8601 UTC
- Unknown fields are rejected (`strict` schemas)
- Every response carries `x-request-id` (also in logs)

**Error envelope**
```json
{
  "error": {
    "code": "validation_error",
    "message": "Some fields are invalid.",
    "fields": { "email": "Enter a valid email address." }
  }
}
```

| HTTP | `code` | When |
|---|---|---|
| 400 | `bad_request` | Malformed JSON |
| 401 | `unauthorized` | Missing / invalid edit token or admin token |
| 404 | `not_found` | Unknown user id |
| 409 | `email_taken` | Email already belongs to a converted user |
| 422 | `validation_error` | Schema failure; `fields` populated |
| 500 | `internal_error` | Anything else (details only in logs) |

## Endpoints

### `POST /api/users` — start a signup
Called at quiz step 1.

```json
{
  "firstName": "David",
  "variant": "time",
  "anonymousId": "c2f1…",
  "utm": { "source": "meta", "medium": "paid_social", "campaign": "try-free-q4", "content": "time-hook", "term": null },
  "landingPath": "/"
}
```
- `variant` is **not trusted from the body**: the server reads it from the assignment cookie set by the middleware. The body value is only used to detect mismatches, which are logged.
- **Idempotent by `anonymousId`:** if an `in_progress` user already exists for it, returns that user with `200` instead of creating a duplicate (double clicks, retries).
- Sets an httpOnly cookie `fxr_edit` with a random edit token (stored hashed). Required for PATCH.

`201 Created`
```json
{ "user": { "id": "5b0e…", "firstName": "David", "status": "in_progress", "variant": "time", "createdAt": "…" } }
```

### `PATCH /api/users/:id` — update answers / convert
Called at steps 2–6. Partial body; any subset of:

```json
{ "market": "forex", "experience": "lt_1y", "weeklyHours": "2_5", "goal": "screen_time", "email": "david@example.com" }
```
- Requires the `fxr_edit` cookie matching this user → otherwise `401`. Nobody can edit a user by guessing an id.
- When `email` is present and valid: status → `converted`, `convertedAt` set, and the server sends `account_created` to GA4 via Measurement Protocol (fire-and-forget; failure is logged, never fails the request).
- Converting twice is a no-op (`200`, no second GA4 event).
- `409 email_taken` if another converted user has the email.

`200 OK` → `{ "user": { … } }`

### `GET /api/users` — list
Used by `/dashboard`. **Admin only:** `Authorization: Bearer $ADMIN_TOKEN`. The response contains PII.

Query: `status` (`in_progress` | `converted`), `variant`, `limit` (1–100, default 50), `cursor`.

`200 OK`
```json
{ "data": [ { "id": "…", "firstName": "…", "email": "…", "status": "converted", "variant": "money", "lastStep": 6, "utm": { … }, "createdAt": "…", "convertedAt": "…" } ], "nextCursor": "…" }
```
Cursor pagination on `(createdAt, id)`: stable under concurrent inserts, unlike offsets.

## Data model (`users`)

| Column | Type | Notes |
|---|---|---|
| `id` | uuid PK | |
| `anonymous_id` | text | client id; indexed |
| `first_name` | text | |
| `email` | text, nullable | stored lowercased; unique where not null |
| `market` / `experience` / `weekly_hours` / `goal` | enum text, nullable | |
| `variant` | text | `money` / `time` / `discipline` |
| `status` | text | `in_progress` / `converted` |
| `last_step` | smallint | furthest step reached → drop-off analysis |
| `utm_source` … `utm_term` | text, nullable | |
| `landing_path` | text | |
| `edit_token_hash` | text | SHA-256 of the edit token |
| `created_at` / `updated_at` / `converted_at` | timestamptz | |

## Persistence choice

**Neon Postgres (free tier) + Drizzle ORM**, provisioned through the Vercel Marketplace.

- **Why not in-memory or a file:** serverless functions are ephemeral and run in parallel. Data would vanish or diverge between instances, and the live dashboard would be meaningless.
- **Why not Notion / Sheets:** rate limits, no uniqueness constraints, no transactions.
- **Why Postgres:** unique email constraint enforced by the database (not by app code racing itself), real queries for the dashboard, and the same technology a production system would use.
- **Trade-offs:** cold starts on the free tier (~hundreds of ms on the first request after idle); an external dependency to operate. Mitigated with Neon's serverless driver over HTTP and non-blocking PATCHes on steps 2–5.

## Production changes (for `architecture.md`)

Replace the simulated account with FX Replay's real auth / account service. Add rate limiting per IP + anonymousId, bot protection on POST, a PII retention policy, and an outbox table for reliable GA4 / CRM delivery instead of fire-and-forget.
