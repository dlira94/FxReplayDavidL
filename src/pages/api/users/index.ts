import type { APIRoute } from 'astro';
import { and, desc, eq, inArray, sql } from 'drizzle-orm';

import {
	EDIT_TOKEN_COOKIE,
	hashEditToken,
	newEditToken,
} from '../../../lib/api/edit-token';
import {
	ADMIN_SESSION_COOKIE,
	isAuthorised,
	unauthorised,
} from '../../../lib/api/admin';
import { fail, json, readJson, requestId } from '../../../lib/api/respond';
import { getDb } from '../../../lib/db';
import { users } from '../../../lib/db/schema';
import { createUserSchema, fieldErrors } from '../../../lib/schemas';
import {
	COOKIE_MAX_AGE_SECONDS,
	CONTROL_VARIANT,
	VARIANT_COOKIE,
	isVariantId,
} from '../../../lib/variants';

export const prerender = false;

/**
 * `GET /api/users` — admin listing (docs/api.md).
 *
 * **This response contains PII.** It is the only surface that does, it needs
 * the admin token, and the dashboard does not use it — `/api/stats` covers
 * every number the dashboard and the agent need. Kept because the contract in
 * api.md specifies it and an operator occasionally needs the records.
 */
export const GET: APIRoute = async ({ request, cookies, url }) => {
	const rid = requestId();

	const cookie = cookies.get(ADMIN_SESSION_COOKIE)?.value;
	if (!(await isAuthorised(request, cookie))) return unauthorised(rid);

	const status = url.searchParams.get('status');
	const variant = url.searchParams.get('variant');
	const limit = Math.min(
		Math.max(Number(url.searchParams.get('limit') ?? 50) || 50, 1),
		100,
	);
	const cursor = url.searchParams.get('cursor');

	const conditions = [];
	if (status && ['in_progress', 'converted', 'email_exists'].includes(status)) {
		conditions.push(eq(users.status, status as never));
	}
	if (isVariantId(variant)) conditions.push(eq(users.variant, variant));

	// Cursor on (createdAt, id): stable under concurrent inserts, unlike an
	// offset, which silently skips or repeats rows as the table grows.
	if (cursor) {
		const decoded = decodeCursor(cursor);
		if (!decoded) return fail('bad_request', 'Invalid cursor.', rid);
		conditions.push(
			sql`(${users.createdAt}, ${users.id}) < (${decoded.createdAt}, ${decoded.id})`,
		);
	}

	try {
		const rows = await getDb()
			.select()
			.from(users)
			.where(conditions.length ? and(...conditions) : undefined)
			.orderBy(desc(users.createdAt), desc(users.id))
			.limit(limit + 1);

		const page = rows.slice(0, limit);
		const last = page.at(-1);

		return json(
			{
				users: page.map((row) => ({
					id: row.id,
					firstName: row.firstName,
					email: row.email,
					market: row.market,
					experience: row.experience,
					weeklyHours: row.weeklyHours,
					goal: row.goal,
					variant: row.variant,
					status: row.status,
					lastStep: row.lastStep,
					isQa: row.isQa,
					isBot: row.isBot,
					createdAt: row.createdAt.toISOString(),
					convertedAt: row.convertedAt?.toISOString() ?? null,
				})),
				nextCursor:
					rows.length > limit && last
						? encodeCursor(last.createdAt, last.id)
						: null,
			},
			200,
			rid,
		);
	} catch (error) {
		console.error(`[api] GET /api/users failed, request ${rid}`, error);
		return fail('internal_error', 'Something went wrong.', rid);
	}
};

function encodeCursor(createdAt: Date, id: string): string {
	return btoa(`${createdAt.toISOString()}|${id}`);
}

function decodeCursor(value: string): { createdAt: string; id: string } | null {
	try {
		const [createdAt, id] = atob(value).split('|');
		return createdAt && id ? { createdAt, id } : null;
	} catch {
		return null;
	}
}

/** Public shape. No edit token hash, no internal columns. */
function publicUser(row: typeof users.$inferSelect) {
	return {
		id: row.id,
		firstName: row.firstName,
		status: row.status,
		lastStep: row.lastStep,
		variant: row.variant,
		createdAt: row.createdAt.toISOString(),
	};
}

/**
 * `POST /api/users` — quiz step 1 (docs/api.md).
 *
 * Idempotent by `anonymousId`: a double click or a retry returns the existing
 * unconverted user with 200 instead of creating a second one. A `converted`
 * record is never reused — that signup is finished, so a new one starts.
 */
export const POST: APIRoute = async ({ request, cookies, locals }) => {
	const rid = requestId();

	const body = await readJson(request);
	if (!body.ok) return fail('bad_request', 'Malformed JSON.', rid);

	const parsed = createUserSchema.safeParse(body.data);
	if (!parsed.success) {
		return fail(
			'validation_error',
			'Some fields are invalid.',
			rid,
			fieldErrors(parsed.error),
		);
	}
	const input = parsed.data;

	// Honeypot: a real visitor never fills a field they cannot see. Answer as
	// if it worked — telling a bot it was caught just teaches it.
	if (input.website) {
		console.warn(`[api] honeypot tripped, request ${rid}`);
		return json(
			{ user: { id: crypto.randomUUID(), status: 'in_progress', lastStep: 1 } },
			201,
			rid,
		);
	}

	// The arm comes from the assignment cookie, never from the body. The body
	// value is only used to notice a mismatch worth logging (docs/api.md).
	const cookieVariant = cookies.get(VARIANT_COOKIE)?.value;
	const variant = isVariantId(cookieVariant) ? cookieVariant : CONTROL_VARIANT;
	if (input.variant && input.variant !== variant) {
		console.warn(
			`[api] variant mismatch: body ${input.variant}, cookie ${variant}, request ${rid}`,
		);
	}

	// Non-production traffic never counts (D18). Read from the middleware's
	// locals so one rule decides it for exposures and users alike.
	const isQa = locals.isQa ?? process.env.VERCEL_ENV !== 'production';
	const isBot = locals.isBot ?? false;

	try {
		const db = getDb();

		const [existing] = await db
			.select()
			.from(users)
			.where(
				and(
					eq(users.anonymousId, input.anonymousId),
					inArray(users.status, ['in_progress', 'email_exists']),
				),
			)
			.limit(1);

		if (existing) {
			// Same visitor, same signup. Re-issue the edit cookie so a returning
			// tab can still PATCH, but do not rotate the stored hash.
			return json({ user: publicUser(existing) }, 200, rid);
		}

		const token = newEditToken();
		const [created] = await db
			.insert(users)
			.values({
				anonymousId: input.anonymousId,
				firstName: input.firstName,
				variant,
				status: 'in_progress',
				lastStep: 1,
				landingPath: input.landingPath,
				isQa,
				isBot,
				utmSource: input.utmSource ?? null,
				utmMedium: input.utmMedium ?? null,
				utmCampaign: input.utmCampaign ?? null,
				utmContent: input.utmContent ?? null,
				utmTerm: input.utmTerm ?? null,
				gaClientId: input.gaClientId ?? null,
				gaSessionId: input.gaSessionId ?? null,
				editTokenHash: await hashEditToken(token),
			})
			.returning();

		if (!created) return fail('internal_error', 'Could not save.', rid);

		cookies.set(EDIT_TOKEN_COOKIE, token, {
			path: '/',
			httpOnly: true,
			sameSite: 'lax',
			secure: process.env.VERCEL_ENV !== undefined,
			maxAge: COOKIE_MAX_AGE_SECONDS,
		});

		return json({ user: publicUser(created) }, 201, rid);
	} catch (error) {
		console.error(`[api] POST /api/users failed, request ${rid}`, error);
		return fail('internal_error', 'Something went wrong.', rid);
	}
};
