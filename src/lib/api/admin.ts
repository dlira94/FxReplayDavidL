import { fail, requestId } from './respond';

/**
 * Admin authorisation for the two surfaces that can see real data.
 *
 * Two ways in: a bearer token (for the `growth-analyst` agent and curl) and a
 * session cookie the dashboard sets after a login form. The token never
 * appears in a URL in either path, so it cannot end up in a server log, a
 * referer header or someone's browser history (D36).
 */

export const ADMIN_SESSION_COOKIE = 'fxr_admin';
export const ADMIN_SESSION_MAX_AGE = 60 * 60 * 8; // one working day

function constantTimeEquals(a: string, b: string): boolean {
	if (a.length !== b.length) return false;
	let diff = 0;
	for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
	return diff === 0;
}

export async function sessionValue(token: string): Promise<string> {
	// The cookie holds a hash, not the token: a stolen cookie should not hand
	// over the token itself, which also opens the API.
	const digest = await crypto.subtle.digest(
		'SHA-256',
		new TextEncoder().encode(`fxr-admin:${token}`),
	);
	return Array.from(new Uint8Array(digest), (b) =>
		b.toString(16).padStart(2, '0'),
	).join('');
}

export function adminToken(): string | null {
	return process.env.ADMIN_TOKEN || null;
}

export async function isAuthorised(request: Request, cookieValue?: string) {
	const expected = adminToken();
	if (!expected) return false;

	const header = request.headers.get('authorization');
	if (header?.startsWith('Bearer ')) {
		return constantTimeEquals(header.slice(7).trim(), expected);
	}

	if (cookieValue) {
		return constantTimeEquals(cookieValue, await sessionValue(expected));
	}

	return false;
}

/** 401 with the documented envelope, and no hint about which part was wrong. */
export function unauthorised(rid = requestId()) {
	return fail('unauthorized', 'Missing or invalid admin token.', rid);
}
