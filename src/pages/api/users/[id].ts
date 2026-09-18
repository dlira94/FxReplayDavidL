import type { APIRoute } from 'astro';
import { and, eq, ne } from 'drizzle-orm';

import {
	EDIT_TOKEN_COOKIE,
	hashEditToken,
	tokensMatch,
} from '../../../lib/api/edit-token';
import { fail, json, readJson, requestId } from '../../../lib/api/respond';
import { getDb } from '../../../lib/db';
import { users } from '../../../lib/db/schema';
import { fieldErrors, updateUserSchema } from '../../../lib/schemas';

export const prerender = false;

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function publicUser(row: typeof users.$inferSelect) {
	return {
		id: row.id,
		firstName: row.firstName,
		status: row.status,
		lastStep: row.lastStep,
		variant: row.variant,
		convertedAt: row.convertedAt?.toISOString() ?? null,
	};
}

/**
 * `PATCH /api/users/:id` — quiz steps 2 to 6 (docs/api.md).
 *
 * Requires the `fxr_edit` cookie issued at step 1, so nobody can edit a user
 * by guessing an id. When a valid email arrives the record converts; if the
 * email already belongs to a converted user it becomes `email_exists` with a
 * 409, which keeps "already a customer" out of the step-6 abandons (D17).
 */
export const PATCH: APIRoute = async ({ request, params, cookies }) => {
	const rid = requestId();
	const id = params.id;

	if (!id || !UUID.test(id)) return fail('not_found', 'Unknown user.', rid);

	const presented = cookies.get(EDIT_TOKEN_COOKIE)?.value;
	if (!presented) return fail('unauthorized', 'Missing edit token.', rid);

	const body = await readJson(request);
	if (!body.ok) return fail('bad_request', 'Malformed JSON.', rid);

	const parsed = updateUserSchema.safeParse(body.data);
	if (!parsed.success) {
		return fail(
			'validation_error',
			'Some fields are invalid.',
			rid,
			fieldErrors(parsed.error),
		);
	}
	const input = parsed.data;

	if (input.website) {
		console.warn(`[api] honeypot tripped on PATCH, request ${rid}`);
		return fail('unauthorized', 'Missing edit token.', rid);
	}

	try {
		const db = getDb();

		const [user] = await db.select().from(users).where(eq(users.id, id)).limit(1);
		if (!user) return fail('not_found', 'Unknown user.', rid);

		const presentedHash = await hashEditToken(presented);
		if (!tokensMatch(presentedHash, user.editTokenHash)) {
			return fail('unauthorized', 'Invalid edit token.', rid);
		}

		// Converting twice is a no-op: 200, no second conversion, and in block 4
		// no second account_created event either.
		if (user.status === 'converted' && input.email) {
			return json({ user: publicUser(user) }, 200, rid);
		}

		const patch: Partial<typeof users.$inferInsert> = { updatedAt: new Date() };
		if (input.market) patch.market = input.market;
		if (input.experience) patch.experience = input.experience;
		if (input.weeklyHours) patch.weeklyHours = input.weeklyHours;
		if (input.goal) patch.goal = input.goal;
		if (input.lastStep) {
			// Furthest reached, never backwards: the drop-off report asks how far
			// someone got, not where they were last.
			patch.lastStep = Math.max(input.lastStep, user.lastStep);
		}

		if (input.email) {
			const [taken] = await db
				.select({ id: users.id })
				.from(users)
				.where(
					and(
						eq(users.email, input.email),
						eq(users.status, 'converted'),
						ne(users.id, id),
					),
				)
				.limit(1);

			if (taken) {
				// The caller's own record moves to email_exists; the email is not
				// stored on it and the existing user is not touched.
				await db
					.update(users)
					.set({ ...patch, status: 'email_exists', lastStep: 6 })
					.where(eq(users.id, id));

				return fail(
					'email_taken',
					'You already have an FX Replay account with this email.',
					rid,
				);
			}

			patch.email = input.email;
			patch.status = 'converted';
			patch.convertedAt = new Date();
			patch.lastStep = 6;
		}

		const [updated] = await db
			.update(users)
			.set(patch)
			.where(eq(users.id, id))
			.returning();

		if (!updated) return fail('internal_error', 'Could not save.', rid);

		return json({ user: publicUser(updated) }, 200, rid);
	} catch (error) {
		// The partial unique index on email is the real guard against two
		// concurrent conversions on the same address; app code cannot win that
		// race on its own.
		if (
			error instanceof Error &&
			/users_email_unique|duplicate key/i.test(error.message)
		) {
			await getDb()
				.update(users)
				.set({ status: 'email_exists', lastStep: 6, updatedAt: new Date() })
				.where(eq(users.id, id))
				.catch(() => undefined);
			return fail(
				'email_taken',
				'You already have an FX Replay account with this email.',
				rid,
			);
		}

		console.error(`[api] PATCH /api/users/${id} failed, request ${rid}`, error);
		return fail('internal_error', 'Something went wrong.', rid);
	}
};