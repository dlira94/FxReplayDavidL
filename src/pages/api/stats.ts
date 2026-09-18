import type { APIRoute } from 'astro';

import { ADMIN_SESSION_COOKIE, isAuthorised, unauthorised } from '../../lib/api/admin';
import { json, requestId } from '../../lib/api/respond';
import { buildStats } from '../../lib/stats-query';

export const prerender = false;

/**
 * `GET /api/stats` — the experiment readout (docs/api.md, D19).
 *
 * Counts only, no PII, which is exactly what makes it safe for the
 * `growth-analyst` agent to read: "never print an email" stops being a rule
 * the agent has to follow and becomes something it cannot do.
 */
export const GET: APIRoute = async ({ request, cookies, url }) => {
	const rid = requestId();

	const cookie = cookies.get(ADMIN_SESSION_COOKIE)?.value;
	if (!(await isAuthorised(request, cookie))) return unauthorised(rid);

	// Opt-in, never a default: QA rows are previews, local dev and forced
	// variants, and letting them into the readout by accident is the failure
	// D18 exists to prevent.
	const includeQa = url.searchParams.get('include_qa') === 'true';

	try {
		return json(await buildStats(includeQa), 200, rid);
	} catch (error) {
		console.error(`[api] GET /api/stats failed, request ${rid}`, error);
		return json(
			{ error: { code: 'internal_error', message: 'Something went wrong.' } },
			500,
			rid,
		);
	}
};
