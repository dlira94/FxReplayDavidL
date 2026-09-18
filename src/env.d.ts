declare namespace App {
	interface Locals {
		/** Experiment arm for this request, assigned by the middleware. */
		variant: import('./lib/variants').VariantId;
		/** True for non-production traffic or a ?variant= override (D18). */
		isQa: boolean;
		/** User-agent heuristic; recorded, never blocked (D18). */
		isBot: boolean;
		/** Stable per-visitor id, also the exposures primary key. */
		anonymousId: string;
		/**
		 * Vercel's waitUntil, injected by @astrojs/vercel at runtime (D20).
		 * Not in the adapter's published types, and absent in `astro dev`.
		 */
		waitUntil?: (promise: Promise<unknown>) => void;
	}
}
