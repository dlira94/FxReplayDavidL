import type { ErrorEnvelope } from './schemas';

/**
 * The quiz's view of the API. Every failure is turned into a discriminated
 * result rather than a thrown error, so the component renders a state instead
 * of guessing what went wrong from a message string.
 */

export type ApiFailure =
	| { kind: 'network' }
	| { kind: 'validation'; fields: Record<string, string> }
	| { kind: 'email_taken' }
	| { kind: 'unauthorized' }
	| { kind: 'server' };

export type ApiResult<T> =
	| { ok: true; data: T }
	| { ok: false; error: ApiFailure };

export interface ApiUser {
	id: string;
	firstName: string | null;
	status: 'in_progress' | 'converted' | 'email_exists';
	lastStep: number;
	variant: string;
}

async function call<T>(
	input: string,
	init: RequestInit,
): Promise<ApiResult<T>> {
	let response: Response;
	try {
		response = await fetch(input, {
			...init,
			headers: { 'content-type': 'application/json', ...init.headers },
			// The edit-token cookie is httpOnly, so it rides along automatically;
			// the island never sees it.
			credentials: 'same-origin',
		});
	} catch {
		// Offline, DNS, CORS, a cancelled navigation. Retryable.
		return { ok: false, error: { kind: 'network' } };
	}

	if (response.ok) {
		return { ok: true, data: (await response.json()) as T };
	}

	let envelope: ErrorEnvelope | null = null;
	try {
		envelope = (await response.json()) as ErrorEnvelope;
	} catch {
		envelope = null;
	}

	switch (envelope?.error.code) {
		case 'validation_error':
			return {
				ok: false,
				error: { kind: 'validation', fields: envelope.error.fields ?? {} },
			};
		case 'email_taken':
			return { ok: false, error: { kind: 'email_taken' } };
		case 'unauthorized':
			return { ok: false, error: { kind: 'unauthorized' } };
		default:
			// 5xx, or a shape we do not recognise. Both are "the server failed",
			// which is a different message and a different event from "you are
			// offline" — conflating them makes the funnel unreadable.
			return { ok: false, error: { kind: 'server' } };
	}
}

export interface CreateUserBody {
	anonymousId: string;
	firstName: string;
	variant?: string;
	landingPath?: string;
	website?: string;
	utmSource?: string | null;
	utmMedium?: string | null;
	utmCampaign?: string | null;
	utmContent?: string | null;
	utmTerm?: string | null;
	gaClientId?: string | null;
	gaSessionId?: string | null;
}

export function createUser(
	body: CreateUserBody,
): Promise<ApiResult<{ user: ApiUser }>> {
	return call('/api/users', { method: 'POST', body: JSON.stringify(body) });
}

export function updateUser(
	id: string,
	body: Record<string, unknown>,
): Promise<ApiResult<{ user: ApiUser }>> {
	return call(`/api/users/${id}`, {
		method: 'PATCH',
		body: JSON.stringify(body),
	});
}
