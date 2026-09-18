import * as z from 'zod/mini';

import { VARIANT_IDS } from './variants';

/**
 * One source of truth for what a valid answer is.
 *
 * The quiz imports these to validate before sending and the API imports them
 * to validate on arrival. The server still runs them on every request — the
 * client's copy is a convenience for the visitor, never a reason to trust the
 * payload (docs/api.md).
 *
 * Built on `zod/mini` rather than the classic entry point. Same library, same
 * validation, but the classic builder API does not tree-shake: importing three
 * schemas into the quiz island pulled in ~80 KB raw of Zod and put the island
 * 67% over its budget. Mini's functional API ships only the checks actually
 * used, which keeps CLAUDE.md's "shared schemas on both client and server"
 * rule intact instead of trading it away for kilobytes (D30).
 */

export const MARKETS = ['forex', 'futures', 'crypto', 'other'] as const;
export const EXPERIENCE_LEVELS = [
	'just_starting',
	'lt_1y',
	'1_3y',
	'3y_plus',
] as const;
export const WEEKLY_HOURS = ['lt_2', '2_5', '5_10', '10_plus'] as const;
export const GOALS = [
	'validate',
	'prop_challenge',
	'discipline',
	'screen_time',
] as const;
export const USER_STATUSES = ['in_progress', 'converted', 'email_exists'] as const;

export type Market = (typeof MARKETS)[number];
export type ExperienceLevel = (typeof EXPERIENCE_LEVELS)[number];
export type WeeklyHours = (typeof WEEKLY_HOURS)[number];
export type Goal = (typeof GOALS)[number];

export const firstNameSchema = z.pipe(
	z.transform((value: unknown) => String(value ?? '').trim()),
	z.string().check(
		z.minLength(1, 'Enter your first name.'),
		z.maxLength(40, 'Keep it under 40 characters.'),
	),
);

export const emailSchema = z.pipe(
	z.transform((value: unknown) => String(value ?? '').trim().toLowerCase()),
	z.email('Enter a valid email address.').check(
		z.maxLength(254, 'That email address is too long.'),
	),
);

const utmValue = z.nullish(z.string().check(z.maxLength(200)));

export const utmShape = {
	utmSource: utmValue,
	utmMedium: utmValue,
	utmCampaign: utmValue,
	utmContent: utmValue,
	utmTerm: utmValue,
} as const;

/**
 * `POST /api/users` — quiz step 1.
 *
 * `variant` is accepted but never trusted: the server reads the arm from the
 * assignment cookie and only uses this to detect and log a mismatch
 * (docs/api.md). `.strict()` so an unknown field is a 422 rather than silently
 * ignored data.
 */
export const createUserSchema = z.strictObject({
		anonymousId: z.string().check(z.minLength(8), z.maxLength(64)),
		firstName: firstNameSchema,
		variant: z.optional(z.enum(VARIANT_IDS)),
		landingPath: z._default(z.string().check(z.maxLength(512)), '/'),
		/** Honeypot. A real visitor never fills a field they cannot see. */
		website: z.optional(z.string().check(z.maxLength(0))),
		/** GA4 identity; null until GTM has loaded (D34). */
		gaClientId: z.nullish(z.string().check(z.maxLength(64))),
		gaSessionId: z.nullish(z.string().check(z.maxLength(64))),
		...utmShape,
	});

/**
 * `PATCH /api/users/:id` — quiz steps 2 to 6. Every field optional: the quiz
 * sends one answer at a time and an empty body is a no-op, not an error.
 */
export const updateUserSchema = z.strictObject({
	market: z.optional(z.enum(MARKETS)),
	experience: z.optional(z.enum(EXPERIENCE_LEVELS)),
	weeklyHours: z.optional(z.enum(WEEKLY_HOURS)),
	goal: z.optional(z.enum(GOALS)),
	email: z.optional(emailSchema),
	lastStep: z.optional(z.int().check(z.minimum(1), z.maximum(6))),
	gaClientId: z.optional(z.string().check(z.maxLength(64))),
	gaSessionId: z.optional(z.string().check(z.maxLength(64))),
	website: z.optional(z.string().check(z.maxLength(0))),
});

export type CreateUserInput = z.infer<typeof createUserSchema>;
export type UpdateUserInput = z.infer<typeof updateUserSchema>;

/** The answers the plan needs. Complete by the time the result screen renders. */
export const quizAnswersSchema = z.object({
	firstName: firstNameSchema,
	market: z.enum(MARKETS),
	experience: z.enum(EXPERIENCE_LEVELS),
	weeklyHours: z.enum(WEEKLY_HOURS),
	goal: z.enum(GOALS),
});

export type QuizAnswers = z.infer<typeof quizAnswersSchema>;

/** Error codes, exactly as docs/api.md lists them. */
export const ERROR_CODES = [
	'bad_request',
	'unauthorized',
	'not_found',
	'email_taken',
	'validation_error',
	'internal_error',
] as const;

export type ErrorCode = (typeof ERROR_CODES)[number];

export interface ErrorEnvelope {
	error: {
		code: ErrorCode;
		message: string;
		fields?: Record<string, string>;
	};
}

/** Turns a Zod failure into the `fields` map the error envelope specifies. */
export function fieldErrors(error: z.core.$ZodError): Record<string, string> {
	const fields: Record<string, string> = {};
	for (const issue of error.issues) {
		const key = issue.path.join('.') || 'body';
		if (!fields[key]) fields[key] = issue.message;
	}
	return fields;
}
