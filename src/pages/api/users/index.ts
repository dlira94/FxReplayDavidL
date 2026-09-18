import type { APIRoute } from 'astro';
import { and, eq, inArray } from 'drizzle-orm';

import {
	EDIT_TOKEN_COOKIE,
	hashEditToken,
	newEditToken,
} from '../../../lib/api/edit-token';
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
