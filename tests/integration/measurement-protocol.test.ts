import { describe, expect, it } from 'vitest';

import {
	buildAccountCreatedBody,
	mpConfig,
	validateAccountCreated,
} from '../../src/lib/analytics/measurement-protocol';

/**
 * The production Measurement Protocol endpoint answers 204 to anything —
 * including a malformed event, which then simply never appears in a report.
 * GA4's `/debug/mp/collect` is the only way to find out before shipping, so
 * the payload is validated against it here rather than trusted.
 */

const config = mpConfig();
const describeIfConfigured = config ? describe : describe.skip;

const PAYLOAD = {
	userId: '11111111-2222-4333-8444-555555555555',
	clientId: '1234567890.1700000000',
	sessionId: '1700000000',
	variant: 'time' as const,
	isQa: true,
	market: 'forex' as const,
	experience: 'lt_1y' as const,
	weeklyHours: '2_5' as const,
	goal: 'validate' as const,
};

describe('buildAccountCreatedBody', () => {
	it('carries the properties analytics.md §4 specifies, and no PII', () => {
		const body = buildAccountCreatedBody(PAYLOAD);
		const params = body.events[0]!.params;

		expect(body.events[0]!.name).toBe('account_created');
		expect(body.user_id).toBe(PAYLOAD.userId);
		expect(body.client_id).toBe(PAYLOAD.clientId);
		expect(params.variant).toBe('time');
		expect(params.experiment_id).toBe('try_free_pain_v1');
		expect(params.is_qa).toBe('true');
		expect(params.market).toBe('forex');
		expect(params.weekly_hours).toBe('2_5');

		// Nothing that could carry a name or an address.
		const serialised = JSON.stringify(body);
		expect(serialised).not.toContain('@');
		expect(serialised).not.toMatch(/firstName|email|name":"[A-Z]/);
	});

	it('omits answers that were never given rather than sending empty strings', () => {
		const params = buildAccountCreatedBody({
			...PAYLOAD,
			market: null,
			goal: null,
		}).events[0]!.params;

		expect(params.market).toBeUndefined();
		expect(params.goal).toBeUndefined();
		expect(params.experience).toBe('lt_1y');
	});
});

describeIfConfigured('GA4 /debug/mp/collect', () => {
	it('accepts the payload with zero validation messages', async () => {
		const result = await validateAccountCreated(PAYLOAD, config!);

		// GA4 returns a list of complaints; anything in it means the event
		// would have been silently dropped in production.
		expect(result.validationMessages).toEqual([]);
		expect(result.ok).toBe(true);
	}, 15_000);

	it('refuses to send without a client_id instead of inventing one', async () => {
		// A random client_id would create a phantom user in GA4 that never
		// matches a real browser session — worse than a late event.
		const result = await validateAccountCreated(
			{ ...PAYLOAD, clientId: null },
			config!,
		);
		expect(result.ok).toBe(false);
		expect(result.error).toBe('missing_client_id');
	});
});
