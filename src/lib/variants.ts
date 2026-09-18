/**
 * Experiment arm identity and assignment.
 *
 * Assignment is server-side and sticky (CLAUDE.md, decision D16). Nothing in
 * this file touches the network or the clock, so every rule below is unit
 * testable and the randomness is injectable.
 */

export const EXPERIMENT_ID = 'try_free_pain_v1';

export const VARIANT_IDS = ['money', 'time', 'discipline'] as const;

export type VariantId = (typeof VARIANT_IDS)[number];

/** Closest to FX Replay's current homepage messaging (decision D5). */
export const CONTROL_VARIANT: VariantId = 'money';

export const VARIANT_COOKIE = 'fxr_variant';
export const ANONYMOUS_ID_COOKIE = 'fxr_aid';
/** httpOnly; authorises PATCH on the user it was issued for (docs/api.md). */
export const EDIT_TOKEN_COOKIE = 'fxr_edit';
/**
 * Marks a session as QA for the rest of its life.
 *
 * Without it, `?variant=` only flagged the request that carried the parameter:
 * the arm cookie persisted, so the next load without the parameter resolved as
 * ordinary production traffic and the QA session's conversion landed in the
 * readout. Found in the final cleanup — the row was David's own verification
 * conversion (D46).
 */
export const QA_SESSION_COOKIE = 'fxr_qa';

/** Sticky for 30 days, matching the assignment unit in docs/experiment.md. */
export const COOKIE_MAX_AGE_SECONDS = 60 * 60 * 24 * 30;

export function isVariantId(value: unknown): value is VariantId {
	return (
		typeof value === 'string' && (VARIANT_IDS as readonly string[]).includes(value)
	);
}

/**
 * Uniform over the three arms.
 *
 * `random` is injected so the split can be asserted in tests instead of
 * hoped for: an assignment that drifts off ⅓ shows up as a sample ratio
 * mismatch weeks later, which invalidates the whole readout.
 */
export function assignVariant(random: () => number = Math.random): VariantId {
	const index = Math.floor(random() * VARIANT_IDS.length);
	// Math.random() is [0, 1), but a stubbed random returning exactly 1 would
	// index past the end. Clamp rather than trust the caller.
	return VARIANT_IDS[Math.min(index, VARIANT_IDS.length - 1)] as VariantId;
}

export type VariantSource = 'override' | 'cookie' | 'assigned';

export interface VariantResolution {
	variant: VariantId;
	/** True when this session must be kept out of the experiment readout. */
	isQa: boolean;
	source: VariantSource;
}

export interface ResolveVariantInput {
	/** Value of the `fxr_variant` cookie, if the visitor has one. */
	cookie?: string | null;
	/** Value of the `?variant=` query parameter, if present. */
	override?: string | null;
	/** Set once a session has ever been flagged QA (`fxr_qa` cookie). */
	qaSession?: boolean;
	/** `import.meta.env.VERCEL_ENV` — anything but `production` is QA (D18). */
	vercelEnv?: string | undefined;
	random?: () => number;
}

/**
 * Anything that is not production traffic is QA traffic (decision D18).
 *
 * Previews get a URL per branch and get clicked during review; without this,
 * every QA pass contaminates the arm it happened to land on.
 */
export function isNonProductionTraffic(vercelEnv: string | undefined): boolean {
	return vercelEnv !== 'production';
}

/**
 * Decide which arm this request belongs to.
 *
 * Precedence: a valid `?variant=` override wins, then the existing cookie,
 * then a fresh uniform draw. An override always flags the session as QA so a
 * forced variant can never reach the analysis (CLAUDE.md, experiment integrity).
 *
 * An *invalid* override is not honoured — there is no arm to switch to — but it
 * **is** still flagged as QA. A real visitor does not append `?variant=` to a
 * URL; someone testing does, and a typo in a QA link is still a person testing.
 * Letting a mistyped override land in the readout is the contamination D18
 * exists to prevent, and it outweighs the sample this costs (D45, reversing an
 * earlier call that ignored invalid values entirely).
 */
export function resolveVariant(input: ResolveVariantInput = {}): VariantResolution {
	const { cookie, override, vercelEnv, random, qaSession } = input;

	// QA is sticky: a session that was ever forced stays excluded, even on
	// later requests that no longer carry the parameter (D46).
	const environmentIsQa = isNonProductionTraffic(vercelEnv) || qaSession === true;

	if (isVariantId(override)) {
		return { variant: override, isQa: true, source: 'override' };
	}

	// Present but unrecognised: no arm to force, but still someone testing.
	const attemptedOverride = override !== null && override !== undefined;

	if (isVariantId(cookie)) {
		return {
			variant: cookie,
			isQa: environmentIsQa || attemptedOverride,
			source: 'cookie',
		};
	}

	return {
		variant: assignVariant(random),
		isQa: environmentIsQa || attemptedOverride,
		source: 'assigned',
	};
}
