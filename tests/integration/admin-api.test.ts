import { afterAll, describe, expect, it } from 'vitest';

import { GET as getStats } from '../../src/pages/api/stats';
import { GET as getUsers } from '../../src/pages/api/users/index';

/**
 * The two surfaces that can see real data. The thing being defended here is
 * not "does the query work" — that is the dashboard's job — it is that the
 * door is shut and that `/api/stats` cannot leak a person.
 */

const TOKEN = process.env.ADMIN_TOKEN;
const PREFIX = `admintest-${Date.now()}-`;

function ctx(options: {
	auth?: string;
	cookie?: string;
	search?: string;
} = {}) {
	const headers = new Headers();
	if (options.auth) headers.set('authorization', options.auth);
	const url = new URL(`http://localhost/api/x${options.search ?? ''}`);
	return {
		request: new Request(url, { headers }),
		url,
		cookies: {
			get: (name: string) =>
				options.cookie && name === 'fxr_admin'
					? { value: options.cookie }
					: undefined,
		},
	} as never as Parameters<typeof getStats>[0];
}

afterAll(async () => {
	const { getDb } = await import('../../src/lib/db');
	const { users } = await import('../../src/lib/db/schema');
	const { like } = await import('drizzle-orm');
	await getDb().delete(users).where(like(users.anonymousId, `${PREFIX}%`));
});

describe('authorisation', () => {
	it.each([
		['no header at all', undefined],
		['an empty bearer', 'Bearer '],
		['a wrong token', 'Bearer not-the-token'],
		['the right token without the scheme', TOKEN],
	])('refuses %s on /api/stats', async (_label, auth) => {
		const response = await getStats(ctx({ auth: auth ?? undefined }));
		expect(response.status).toBe(401);
		const body = (await response.json()) as { error: { code: string } };
		expect(body.error.code).toBe('unauthorized');
	});

	it('refuses an unauthenticated /api/users listing', async () => {
		const response = await getUsers(ctx());
		expect(response.status).toBe(401);
	});

	it('accepts the bearer token', async () => {
		const response = await getStats(ctx({ auth: `Bearer ${TOKEN}` }));
		expect(response.status).toBe(200);
	});

	it('accepts a session cookie holding the hash, not the token', async () => {
		const { sessionValue } = await import('../../src/lib/api/admin');
		const hash = await sessionValue(TOKEN!);

		expect(hash).not.toBe(TOKEN);
		expect(hash).toMatch(/^[0-9a-f]{64}$/);

		const response = await getStats(ctx({ cookie: hash }));
		expect(response.status).toBe(200);
	});

	it('refuses the raw token presented as a cookie', async () => {
		// The cookie is a hash. Presenting the token itself must not work, or
		// the hashing would be decoration.
		const response = await getStats(ctx({ cookie: TOKEN }));
		expect(response.status).toBe(401);
	});
});

describe('GET /api/stats', () => {
	it('returns counts only — no PII anywhere in the response', async () => {
		const response = await getStats(
			ctx({ auth: `Bearer ${TOKEN}`, search: '?include_qa=true' }),
		);
		const text = await response.text();

		// This is the property that lets an agent read it (D19): not "the agent
		// is careful", but "there is nothing here to be careless with".
		expect(text).not.toContain('@');
		expect(text).not.toMatch(/"email"|"firstName"|"anonymousId"|"editTokenHash"/);

		const body = JSON.parse(text) as {
			variants: Array<Record<string, unknown>>;
			srm: { status: string };
			excluded: string[];
		};
		expect(body.variants).toHaveLength(3);
		for (const variant of body.variants) {
			expect(Object.keys(variant).sort()).toEqual([
				'conversionInterval',
				'conversionRate',
				'conversions',
				'dropOffByStep',
				'emailExists',
				'exposures',
				'lift',
				'quizStarts',
				'variant',
			]);
		}
		expect(['ok', 'alert', 'insufficient_data']).toContain(body.srm.status);
	});

	it('excludes QA rows by default and includes them on request', async () => {
		const clean = (await (
			await getStats(ctx({ auth: `Bearer ${TOKEN}` }))
		).json()) as { excluded: string[]; variants: Array<{ exposures: number }> };
		const withQa = (await (
			await getStats(ctx({ auth: `Bearer ${TOKEN}`, search: '?include_qa=true' }))
		).json()) as { excluded: string[]; variants: Array<{ exposures: number }> };

		expect(clean.excluded).toEqual(['is_qa', 'is_bot']);
		expect(withQa.excluded).toEqual([]);

		const sum = (r: { variants: Array<{ exposures: number }> }) =>
			r.variants.reduce((total, v) => total + v.exposures, 0);
		// Everything this project has written locally is QA, so the default
		// view must be the smaller one.
		expect(sum(withQa)).toBeGreaterThanOrEqual(sum(clean));
	});

	it('names the control so the lift column cannot be read backwards', async () => {
		const body = (await (
			await getStats(ctx({ auth: `Bearer ${TOKEN}` }))
		).json()) as { control: string; variants: Array<{ variant: string; lift: unknown }> };

		expect(body.control).toBe('money');
		expect(body.variants.find((v) => v.variant === 'money')!.lift).toBeNull();
	});
});

describe('GET /api/users', () => {
	it('is the only surface that returns PII, and it needs the token', async () => {
		const response = await getUsers(
			ctx({ auth: `Bearer ${TOKEN}`, search: '?limit=1' }),
		);
		expect(response.status).toBe(200);

		const body = (await response.json()) as {
			users: Array<Record<string, unknown>>;
			nextCursor: string | null;
		};
		expect(Array.isArray(body.users)).toBe(true);
		expect(body).toHaveProperty('nextCursor');
	});

	it('caps the page size so a listing cannot be asked for everything', async () => {
		const response = await getUsers(
			ctx({ auth: `Bearer ${TOKEN}`, search: '?limit=9999' }),
		);
		const body = (await response.json()) as { users: unknown[] };
		expect(body.users.length).toBeLessThanOrEqual(100);
	});

	it('rejects a malformed cursor instead of returning page one', async () => {
		// Silently ignoring it would make a paginating client loop forever on
		// the first page without ever noticing.
		const response = await getUsers(
			ctx({ auth: `Bearer ${TOKEN}`, search: '?cursor=!!!not-base64!!!' }),
		);
		expect(response.status).toBe(400);
	});
});
