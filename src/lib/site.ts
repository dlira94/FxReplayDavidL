/**
 * Absolute site origin, for canonical and Open Graph URLs.
 *
 * Preview deployments resolve to the *production* origin on purpose: a canonical
 * pointing at a throwaway preview URL is worse than none. Previews are noindex
 * anyway (see `isIndexable`).
 */
export function getSiteUrl(): string {
	const explicit = process.env.PUBLIC_SITE_URL;
	if (explicit) return explicit.replace(/\/+$/, '');

	const production = process.env.VERCEL_PROJECT_PRODUCTION_URL;
	if (production) return `https://${production}`;

	return 'http://localhost:4321';
}

/**
 * Only production is indexable. Previews are QA traffic (D18); letting one get
 * indexed would compete with production for the same queries.
 */
export function isIndexable(): boolean {
	return process.env.VERCEL_ENV === 'production';
}
