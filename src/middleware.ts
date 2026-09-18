import { defineMiddleware } from 'astro:middleware';

import { isBot } from './lib/bots';
import { recordExposure } from './lib/db/exposures';
import {
	ANONYMOUS_ID_COOKIE,
	COOKIE_MAX_AGE_SECONDS,
	QA_SESSION_COOKIE,
	VARIANT_COOKIE,
	resolveVariant,
} from './lib/variants';

const UTM_PARAMS = [
	'utm_source',
	'utm_medium',
	'utm_campaign',
	'utm_content',
	'utm_term',
] as const;

/**
 * Variant assignment and exposure logging.
 *
 * Runs on `/` only (decision D16). Every other path — `/api/*`, `/dashboard`,
 * assets — returns before any of this, so nothing else pays for it and nothing
 * else can write an exposure.
 */
export const onRequest = defineMiddleware(async (context, next) => {
	const { url, cookies, request, locals } = context;

	if (url.pathname !== '/') {
		return next();
	}

	const resolution = resolveVariant({
		cookie: cookies.get(VARIANT_COOKIE)?.value,
		override: url.searchParams.get('variant'),
		vercelEnv: process.env.VERCEL_ENV,
		qaSession: cookies.get(QA_SESSION_COOKIE)?.value === '1',
	});

	const anonymousId =
		cookies.get(ANONYMOUS_ID_COOKIE)?.value ?? crypto.randomUUID();

	const bot = isBot(request.headers.get('user-agent'));

	locals.variant = resolution.variant;
	locals.isQa = resolution.isQa;
	locals.isBot = bot;
	locals.anonymousId = anonymousId;

	// httpOnly: the client never picks or changes the arm. A QA override goes
	// through ?variant=, which the server honours and flags as QA.
	const cookieOptions = {
		path: '/',
		httpOnly: true,
		sameSite: 'lax',
		secure: process.env.VERCEL_ENV !== undefined,
		maxAge: COOKIE_MAX_AGE_SECONDS,
	} as const;

	cookies.set(VARIANT_COOKIE, resolution.variant, cookieOptions);
	cookies.set(ANONYMOUS_ID_COOKIE, anonymousId, cookieOptions);
	// Written once and never cleared: a QA session stays QA for its whole life,
	// including the requests that no longer carry ?variant= (D46).
	if (resolution.isQa) cookies.set(QA_SESSION_COOKIE, '1', cookieOptions);

	const response = await next();

	// `/` varies by cookie. A shared cache holding one arm would pin every
	// visitor to it and destroy the experiment, so this is a correctness
	// constraint, not a tuning knob (docs/performance.md).
	response.headers.set('Cache-Control', 'private, no-store');

	const utm = Object.fromEntries(
		UTM_PARAMS.map((param) => [
			camelCase(param),
			url.searchParams.get(param) ?? null,
		]),
	) as Record<'utmSource' | 'utmMedium' | 'utmCampaign' | 'utmContent' | 'utmTerm', string | null>;

	// Never blocks the response: the visitor gets HTML whether or not the
	// database answers, and a failed insert costs one row, not a page (D16).
	const write = recordExposure({
		anonymousId,
		variant: resolution.variant,
		isQa: resolution.isQa,
		isBot: bot,
		landingPath: url.pathname,
		...utm,
	}).catch((error: unknown) => {
		console.error('[exposure] insert failed', error);
	});

	if (typeof locals.waitUntil === 'function') {
		locals.waitUntil(write);
	}

	return response;
});

function camelCase(param: string): string {
	return param.replace(/_([a-z])/g, (_, letter: string) => letter.toUpperCase());
}
