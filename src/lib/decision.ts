import { relativeLift, type Lift, type SrmResult } from './stats';
import { CONTROL_VARIANT, type VariantId } from './variants';

/**
 * The decision rules from docs/experiment.md, applied literally.
 *
 * The rules exist so the call is made before the data arrives rather than
 * argued about afterwards, so this file does not get to be clever: it reads
 * the numbers and returns the verdict the document already committed to.
 */

/** docs/experiment.md: baseline 3%, MDE +20% relative, 80% power, α = 0.025. */
export const REQUIRED_PER_ARM = 16_900;
export const MINIMUM_DETECTABLE_EFFECT = 0.2;

/**
 * Bonferroni-corrected for two comparisons against control: α = 0.025
 * two-sided, so z = 2.2414 rather than the 1.96 the 95% display interval uses.
 * The dashboard shows a 95% interval because that is what people read; the
 * decision uses the corrected one because that is what was pre-registered.
 */
const Z_DECISION = 2.241402728;

export type DecisionStatus = 'ship' | 'continue' | 'reject' | 'invalid';

export interface Decision {
	status: DecisionStatus;
	/** One sentence, written for someone reading the dashboard, not a log. */
	reason: string;
	/** The Bonferroni-corrected interval the verdict was made on. */
	decisionLift: Lift | null;
	sampleProgress: number;
	sampleReached: boolean;
}

export interface DecisionInput {
	variant: VariantId;
	exposures: number;
	conversions: number;
	controlExposures: number;
	controlConversions: number;
	srm: SrmResult;
	requiredPerArm?: number;
}

export function decide(input: DecisionInput): Decision {
	const required = input.requiredPerArm ?? REQUIRED_PER_ARM;
	const sampleProgress = required > 0 ? input.exposures / required : 0;
	const sampleReached =
		input.exposures >= required && input.controlExposures >= required;

	const decisionLift =
		input.variant === CONTROL_VARIANT
			? null
			: relativeLift(
					input.conversions,
					input.exposures,
					input.controlConversions,
					input.controlExposures,
					Z_DECISION,
				);

	const base = { decisionLift, sampleProgress, sampleReached };

	// A sample ratio mismatch means the arms were never comparable, so every
	// other number on the page is describing populations that differ for a
	// reason nobody chose. Nothing else is worth evaluating.
	if (input.srm.status === 'alert') {
		return {
			...base,
			status: 'invalid',
			reason:
				'Sample ratio mismatch: assignment is skewed, so the comparison is not valid. Investigate before reading anything else.',
		};
	}

	if (input.variant === CONTROL_VARIANT) {
		return {
			...base,
			status: sampleReached ? 'continue' : 'continue',
			reason: sampleReached
				? 'Control. Compare the variants against this.'
				: `Control. ${Math.round(sampleProgress * 100)}% of the required sample.`,
		};
	}

	// **The rule that exists to stop us.** An early lead is noise until the
	// sample is reached, no matter how good the interval looks — peeking and
	// stopping on a winner is how an A/B test manufactures a result.
	if (!sampleReached) {
		const looksAhead = decisionLift && decisionLift.interval.low > 0;
		return {
			...base,
			status: 'continue',
			reason: looksAhead
				? `Ahead, but only ${Math.round(sampleProgress * 100)}% of the required sample. An early lead is not a decision.`
				: `${Math.round(sampleProgress * 100)}% of the required sample.`,
		};
	}

	if (!decisionLift) {
		return {
			...base,
			status: 'continue',
			reason: 'Not enough conversions on one side to compare yet.',
		};
	}

	if (decisionLift.interval.low > 0) {
		return {
			...base,
			status: 'ship',
			reason:
				'Beats control at α = 0.025 with the interval above zero. Check the guardrails and D7 activation before shipping.',
		};
	}

	if (decisionLift.interval.high < 0) {
		return {
			...base,
			status: 'reject',
			reason: 'Significantly worse than control. Keep the control.',
		};
	}

	// At full sample with an interval spanning zero and a point estimate below
	// the MDE, there is no practically meaningful difference left to find.
	if (decisionLift.relative < MINIMUM_DETECTABLE_EFFECT) {
		return {
			...base,
			status: 'reject',
			reason:
				'At full sample the interval includes zero and the effect is below the MDE. No meaningful difference; keep the simpler control.',
		};
	}

	return {
		...base,
		status: 'continue',
		reason:
			'Positive and at least the MDE, but the interval still crosses zero. Extend once, up to the six-week maximum.',
	};
}
