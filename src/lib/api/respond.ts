import type { ErrorCode, ErrorEnvelope } from '../schemas';

/**
 * Every response leaves through here, so the envelope in docs/api.md is a
 * property of the API rather than something each handler remembers.
 */

const STATUS_FOR: Record<ErrorCode, number> = {
	bad_request: 400,
	unauthorized: 401,
	not_found: 404,
	email_taken: 409,
	validation_error: 422,
	internal_error: 500,
};

export function requestId(): string {
	return crypto.randomUUID();
}

export function json(
	body: unknown,
	status: number,
	rid: string,
	headers: Record<string, string> = {},
): Response {
	return new Response(JSON.stringify(body), {
		status,
		headers: {
			'content-type': 'application/json',
			'x-request-id': rid,
			'cache-control': 'no-store',
			...headers,
		},
	});
}

export function fail(
	code: ErrorCode,
	message: string,
	rid: string,
	fields?: Record<string, string>,
): Response {
	const envelope: ErrorEnvelope = {
		error: { code, message, ...(fields ? { fields } : {}) },
	};
	return json(envelope, STATUS_FOR[code], rid);
}

/** Bodies are parsed here so malformed JSON is a 400, never a 500. */
export async function readJson(
	request: Request,
): Promise<{ ok: true; data: unknown } | { ok: false }> {
	try {
		const text = await request.text();
		if (!text) return { ok: true, data: {} };
		return { ok: true, data: JSON.parse(text) };
	} catch {
		return { ok: false };
	}
}
