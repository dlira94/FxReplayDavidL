/**
 * Reads GA4's identity out of the cookies GTM writes.
 *
 * `_ga` holds the client id as `GA1.1.<clientId>` — the last two dot-separated
 * segments joined. `_ga_<CONTAINER>` holds the session id inside a packed
 * string, `GS1.1.<sessionId>.<n>....`.
 *
 * Both can be absent: GTM loads deferred, so a fast visitor reaches step 1
 * before the cookies exist. That is not an error, it is the reason the server
 * accepts null and a later PATCH fills them in.
 */

function cookie(name: string): string | null {
	if (typeof document === 'undefined') return null;
	const match = document.cookie.match(
		new RegExp('(^|;\\s*)' + name + '=([^;]*)'),
	);
	return match?.[2] ? decodeURIComponent(match[2]) : null;
}

export function readGaClientId(): string | null {
	const raw = cookie('_ga');
	if (!raw) return null;
	const parts = raw.split('.');
	// GA1.1.1234567890.1700000000 -> "1234567890.1700000000"
	return parts.length >= 4 ? parts.slice(-2).join('.') : null;
}

export function readGaSessionId(): string | null {
	if (typeof document === 'undefined') return null;
	// The container id is not known to this code, so match the family.
	const match = document.cookie.match(/_ga_[A-Z0-9]+=([^;]*)/);
	if (!match?.[1]) return null;
	const parts = decodeURIComponent(match[1]).split('.');
	// GS1.1.<sessionId>.<sessionNumber>....
	return parts[2] ?? null;
}

export function readGaIdentity(): {
	gaClientId: string | null;
	gaSessionId: string | null;
} {
	return { gaClientId: readGaClientId(), gaSessionId: readGaSessionId() };
}
