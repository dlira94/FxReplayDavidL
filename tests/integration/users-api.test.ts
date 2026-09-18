import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { POST } from '../../src/pages/api/users/index';
import { PATCH } from '../../src/pages/api/users/[id]';

/**
 * Integration: the real handlers against the real database.
 *
 * No HTTP server — the routes are plain functions, so calling them directly
 * exercises the same code a request would, including Drizzle and the partial
 * unique index, without a server to start and stop.
 *
 * Everything written here is `is_qa: true` (D18) and deleted in afterAll, so a
 * run can never contaminate the experiment readout even if it fails halfway.
 */

const PREFIX = `vitest-${Date.now()}-`;
const created: string[] = [];

/** Minimal stand-ins for the parts of Astro's context these routes touch. */
function ctx(options: {
	cookies?: Record<string, string>;
	params?: Record<string, string>;
	body?: unknown;
	raw?: string;
}) {
	const jar = new Map(Object.entries(options.cookies ?? {}));
	return {
		request: new Request('http://localhost/api/users', {
			method: 'POST',
			body: options.raw ?? JSON.stringify(options.body ?? {}),
		}),
		params: options.params ?? {},
		cookies: {
			get: (name: string) =>
				jar.has(name) ? { value: jar.get(name)! } : undefined,
			set: (name: string, value: string) => jar.set(name, value),
		},
		locals: { isQa: true, isBot: false },
		jar,
	} as never as Parameters<typeof POST>[0] & { jar: Map<string, string> };
}

async function body<T>(response: Response): Promise<T> {
	return (await response.json()) as T;
}

beforeAll(() => {
	if (!process.env.DATABASE_URL) {
		throw new Error(
			'DATABASE_URL is required. Run: node --env-file=.env.local node_modules/.bin/vitest run tests/integration',
		);
	}
});

afterAll(async () => {
	const { getDb } = await import('../../src/lib/db');
	const { users } = await import('../../src/lib/db/schema');
	const { like } = await import('drizzle-orm');
	await getDb().delete(users).where(like(users.anonymousId, `${PREFIX}%`));
});

describe('POST /api/users', () => {
	it('creates a user, issues an edit cookie and flags QA', async () => {
		const anonymousId = `${PREFIX}create`;
		created.push(anonymousId);
		const c = ctx({
			cookies: { fxr_variant: 'discipline' },
			body: { anonymousId, firstName: 'Vitest' },
		});

		const response = await POST(c);
		expect(response.status).toBe(201);

		const data = await body<{ user: { id: string; variant: string } }>(response);
		expect(data.user.variant).toBe('discipline');
		// The token is set as a cookie and only its hash is stored.
		expect(c.jar.get('fxr_edit')).toMatch(/^[0-9a-f]{64}$/);
		expect(response.headers.get('x-request-id')).toBeTruthy();
	});

	it('is idempotent by anonymousId', async () => {
		const anonymousId = `${PREFIX}idem`;
		const first = await POST(
			ctx({ body: { anonymousId, firstName: 'Vitest' } }),
		);
		const second = await POST(
			ctx({ body: { anonymousId, firstName: 'Vitest' } }),
		);

		expect(first.status).toBe(201);
		expect(second.status).toBe(200);
		const a = await body<{ user: { id: string } }>(first);
		const b = await body<{ user: { id: string } }>(second);
		expect(b.user.id).toBe(a.user.id);
	});

	it('reads the arm from the cookie, never from the body', async () => {
		const anonymousId = `${PREFIX}variant`;
		const response = await POST(
			ctx({
				cookies: { fxr_variant: 'money' },
				body: { anonymousId, firstName: 'Vitest', variant: 'time' },
			}),
		);
		const data = await body<{ user: { variant: string } }>(response);
		expect(data.user.variant).toBe('money');
	});

	it('rejects an invalid body with the documented envelope', async () => {
		const response = await POST(
			ctx({ body: { anonymousId: `${PREFIX}bad`, firstName: '' } }),
		);
		expect(response.status).toBe(422);
		const data = await body<{ error: { code: string; fields: Record<string, string> } }>(
			response,
		);
		expect(data.error.code).toBe('validation_error');
		expect(data.error.fields.firstName).toBeTruthy();
	});

	it('answers 400 for malformed JSON', async () => {
		const response = await POST(ctx({ raw: '{nope' }));
		expect(response.status).toBe(400);
		expect((await body<{ error: { code: string } }>(response)).error.code).toBe(
			'bad_request',
		);
	});

	it('swallows a honeypot submission without creating a real user', async () => {
		const anonymousId = `${PREFIX}trap`;
		const response = await POST(
			ctx({
				body: { anonymousId, firstName: 'Bot', website: 'http://spam.example' },
			}),
		);
		// 422: the schema caps `website` at zero characters, so a filled trap
		// never even reaches the handler's own check.
		expect([201, 422]).toContain(response.status);

		const { getDb } = await import('../../src/lib/db');
		const { users } = await import('../../src/lib/db/schema');
		const { eq } = await import('drizzle-orm');
		const rows = await getDb()
			.select()
			.from(users)
			.where(eq(users.anonymousId, anonymousId));
		expect(rows).toHaveLength(0);
	});
});

describe('PATCH /api/users/:id', () => {
	async function makeUser(suffix: string) {
		const anonymousId = `${PREFIX}${suffix}`;
		const c = ctx({ body: { anonymousId, firstName: 'Vitest' } });
		const response = await POST(c);
		const data = await body<{ user: { id: string } }>(response);
		return { id: data.user.id, token: c.jar.get('fxr_edit')! };
	}

	it('refuses without an edit token', async () => {
		const { id } = await makeUser('noauth');
		const response = await PATCH(
			ctx({ params: { id }, body: { market: 'forex' } }),
		);
		expect(response.status).toBe(401);
	});

	it('refuses a token belonging to someone else', async () => {
		const { id } = await makeUser('mine');
		const other = await makeUser('theirs');
		const response = await PATCH(
			ctx({
				params: { id },
				cookies: { fxr_edit: other.token },
				body: { market: 'forex' },
			}),
		);
		expect(response.status).toBe(401);
	});

	it('saves answers and converts on a valid email', async () => {
		const { id, token } = await makeUser('convert');
		const email = `${PREFIX}convert@example.com`;

		const answers = await PATCH(
			ctx({
				params: { id },
				cookies: { fxr_edit: token },
				body: {
					market: 'crypto',
					experience: '3y_plus',
					weeklyHours: '10_plus',
					goal: 'discipline',
					lastStep: 5,
				},
			}),
		);
		expect(answers.status).toBe(200);

		const converted = await PATCH(
			ctx({ params: { id }, cookies: { fxr_edit: token }, body: { email } }),
		);
		expect(converted.status).toBe(200);
		const data = await body<{ user: { status: string; lastStep: number } }>(
			converted,
		);
		expect(data.user.status).toBe('converted');
		expect(data.user.lastStep).toBe(6);
	});

	it('never moves lastStep backwards', async () => {
		const { id, token } = await makeUser('backwards');
		await PATCH(
			ctx({ params: { id }, cookies: { fxr_edit: token }, body: { lastStep: 5 } }),
		);
		const response = await PATCH(
			ctx({ params: { id }, cookies: { fxr_edit: token }, body: { lastStep: 2 } }),
		);
		const data = await body<{ user: { lastStep: number } }>(response);
		expect(data.user.lastStep).toBe(5);
	});

	it('answers 409 and moves the caller to email_exists without storing the email', async () => {
		const email = `${PREFIX}taken@example.com`;
		const first = await makeUser('owner');
		await PATCH(
			ctx({
				params: { id: first.id },
				cookies: { fxr_edit: first.token },
				body: { email },
			}),
		);

		const second = await makeUser('collider');
		const response = await PATCH(
			ctx({
				params: { id: second.id },
				cookies: { fxr_edit: second.token },
				body: { email },
			}),
		);

		expect(response.status).toBe(409);
		expect((await body<{ error: { code: string } }>(response)).error.code).toBe(
			'email_taken',
		);

		const { getDb } = await import('../../src/lib/db');
		const { users } = await import('../../src/lib/db/schema');
		const { eq } = await import('drizzle-orm');
		const [row] = await getDb()
			.select()
			.from(users)
			.where(eq(users.id, second.id));

		expect(row!.status).toBe('email_exists');
		expect(row!.lastStep).toBe(6);
		// The email belongs to the other account; storing it here would be
		// recording a fact about someone else's record.
		expect(row!.email).toBeNull();
	});

	it('treats a second conversion as a no-op', async () => {
		const { id, token } = await makeUser('twice');
		const email = `${PREFIX}twice@example.com`;
		const first = await PATCH(
			ctx({ params: { id }, cookies: { fxr_edit: token }, body: { email } }),
		);
		const second = await PATCH(
			ctx({ params: { id }, cookies: { fxr_edit: token }, body: { email } }),
		);

		expect(second.status).toBe(200);
		const a = await body<{ user: { status: string } }>(first);
		const b = await body<{ user: { status: string } }>(second);
		expect(a.user.status).toBe('converted');
		expect(b.user.status).toBe('converted');
	});

	it('answers 404 for an id that is not a UUID', async () => {
		const response = await PATCH(
			ctx({ params: { id: 'not-a-uuid' }, cookies: { fxr_edit: 'x' }, body: {} }),
		);
		expect(response.status).toBe(404);
	});
});
