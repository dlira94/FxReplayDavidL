import type { Goal, ExperienceLevel, Market, WeeklyHours } from '../schemas';
import type { VariantId } from '../variants';
import { EXPERIMENT_ID } from './events';

/**
 * Server-side `account_created` (docs/analytics.md §4).
 *
 * Sent from the server and not the browser because it is the one event the
 * experiment cannot afford to lose: an ad blocker or a closed tab between the
 * PATCH and the pixel would cost a conversion, and conversions are the
 * numerator of the only metric that decides anything.
 */

const ENDPOINT = 'https://www.google-analytics.com/mp/collect';
const DEBUG_ENDPOINT = 'https://www.google-analytics.com/debug/mp/collect';

export interface AccountCreatedPayload {
	/** Internal user UUID. Not PII, and the dedupe key GA4 sees. */
	userId: string;
	/** From the browser's `_ga` cookie, so the event lands in the right session. */
	clientId: string | null;
	sessionId: string | null;
	variant: VariantId;
	isQa: boolean;
	market: Market | null;
	experience: ExperienceLevel | null;
	weeklyHours: WeeklyHours | null;
	goal: Goal | null;
}

export interface MpResult {
	ok: boolean;
	status?: number;
	/** Only populated by `validateAccountCreated`. */
	validationMessages?: unknown[];
	error?: string;
}

/**
 * A client_id is required by the Measurement Protocol. When GTM has not run
 * yet we have none, and inventing a random one would create a phantom user in
 * GA4 that never matches a browser session — worse than the event being late.
 * The caller decides; this only builds the body.
 */
export function buildAccountCreatedBody(payload: AccountCreatedPayload) {
	const params: Record<string, string | number> = {
		// Ties the server event to the browser's session so source/medium
		// attribution survives (docs/analytics.md §2).
		session_id: payload.sessionId ?? '',
		engagement_time_msec: 1,
		variant: payload.variant,
		experiment_id: EXPERIMENT_ID,
		is_qa: String(payload.isQa),
	};

	// Only the enum answers. No name, no email, ever (CLAUDE.md).
	if (payload.market) params.market = payload.market;
	if (payload.experience) params.experience = payload.experience;
	if (payload.weeklyHours) params.weekly_hours = payload.weeklyHours;
	if (payload.goal) params.goal = payload.goal;

	return {
		client_id: payload.clientId,
		user_id: payload.userId,
		// GA4 dedupes on this, so a retry cannot double-count a conversion.
		events: [{ name: 'account_created', params }],
	};
}

async function send(
	url: string,
	payload: AccountCreatedPayload,
	config: { measurementId: string; apiSecret: string },
): Promise<MpResult> {
	if (!payload.clientId) {
		return { ok: false, error: 'missing_client_id' };
	}

	const endpoint = `${url}?measurement_id=${encodeURIComponent(
		config.measurementId,
	)}&api_secret=${encodeURIComponent(config.apiSecret)}`;

	try {
		const response = await fetch(endpoint, {
			method: 'POST',
			headers: { 'content-type': 'application/json' },
			body: JSON.stringify(buildAccountCreatedBody(payload)),
		});

		// The production endpoint answers 204 with no body and validates
		// nothing. That is why the debug endpoint exists and why there is a
		// test against it: a malformed event would otherwise be accepted in
		// silence and simply never appear in a report.
		if (url === DEBUG_ENDPOINT) {
			const body = (await response.json()) as {
				validationMessages?: unknown[];
			};
			const messages = body.validationMessages ?? [];
			return {
				ok: messages.length === 0,
				status: response.status,
				validationMessages: messages,
			};
		}

		return { ok: response.ok, status: response.status };
	} catch (error) {
		return {
			ok: false,
			error: error instanceof Error ? error.message : 'fetch_failed',
		};
	}
}

export function sendAccountCreated(
	payload: AccountCreatedPayload,
	config: { measurementId: string; apiSecret: string },
): Promise<MpResult> {
	return send(ENDPOINT, payload, config);
}

/** Same body, GA4's validation endpoint. Used by the integration test. */
export function validateAccountCreated(
	payload: AccountCreatedPayload,
	config: { measurementId: string; apiSecret: string },
): Promise<MpResult> {
	return send(DEBUG_ENDPOINT, payload, config);
}

export function mpConfig(): { measurementId: string; apiSecret: string } | null {
	const measurementId = process.env.GA4_MEASUREMENT_ID;
	const apiSecret = process.env.GA4_API_SECRET;
	if (!measurementId || !apiSecret) return null;
	return { measurementId, apiSecret };
}
