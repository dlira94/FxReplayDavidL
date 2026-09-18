import { EDIT_TOKEN_COOKIE } from '../variants';

/**
 * The edit token is what stops anyone from PATCHing a user by guessing an id.
 *
 * It lives in an httpOnly cookie and is stored **hashed**: a leaked database
 * dump should not hand over the ability to edit live records (docs/api.md).
 */

export function newEditToken(): string {
	const bytes = crypto.getRandomValues(new Uint8Array(32));
	return Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('');
}

export async function hashEditToken(token: string): Promise<string> {
	const digest = await crypto.subtle.digest(
		'SHA-256',
		new TextEncoder().encode(token),
	);
	return Array.from(new Uint8Array(digest), (b) =>
		b.toString(16).padStart(2, '0'),
	).join('');
}

/**
 * Compared in constant time. A timing difference on a 64-character hex string
 * is a slow but real oracle, and the fix costs nothing.
 */
export function tokensMatch(a: string, b: string): boolean {
	if (a.length !== b.length) return false;
	let diff = 0;
	for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
	return diff === 0;
}

export { EDIT_TOKEN_COOKIE };
