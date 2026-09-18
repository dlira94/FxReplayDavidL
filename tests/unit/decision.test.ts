import { describe, expect, it } from 'vitest';

import { REQUIRED_PER_ARM, decide, type DecisionInput } from '../../src/lib/decision';
import { maskEmail } from '../../src/lib/mask';
import { sampleRatioMismatch } from '../../src/lib/stats';

const CLEAN_SRM = sampleRatioMismatch([1000, 1000, 1000]);
const BROKEN_SRM = sampleRatioMismatch([1500, 750, 750]);

function input(over: Partial<DecisionInput> = {}): DecisionInput {
	return {
		variant: 'time',
		exposures: REQUIRED_PER_ARM,
		conversions: Math.round(REQUIRED_PER_ARM * 0.036),
		controlExposures: REQUIRED_PER_ARM,
		controlConversions: Math.round(REQUIRED_PER_ARM * 0.03),
		srm: CLEAN_SRM,
		...over,
	};
}

describe('decide', () => {
	it('ships a variant that beats control at full sample', () => {
		// +20% on the planned sample is exactly what the test was powered for.
		const result = decide(input());
		expect(result.status).toBe('ship');
		expect(result.decisionLift!.interval.low).toBeGreaterThan(0);
		expect(result.sampleReached).toBe(true);
	});

	it('says Continue on an early lead, however good it looks', () => {
		// The rule that exists to stop us: a huge lift on 10% of the sample.
		const result = decide(
			input({
				exposures: 1690,
				conversions: 120, // 7.1% vs 3%
				controlExposures: 1690,
				controlConversions: 51,
			}),
		);

		expect(result.decisionLift!.interval.low).toBeGreaterThan(0);
		expect(result.status).toBe('continue');
		expect(result.reason).toContain('early lead is not a decision');
		expect(result.sampleProgress).toBeCloseTo(0.1, 2);
	});

	it('rejects a variant that is significantly worse', () => {
		const result = decide(
			input({ conversions: Math.round(REQUIRED_PER_ARM * 0.02) }),
		);
		expect(result.status).toBe('reject');
		expect(result.decisionLift!.interval.high).toBeLessThan(0);
	});

	it('rejects a flat result at full sample', () => {
		// Interval spans zero, effect below the MDE: nothing left to find.
		const result = decide(
			input({ conversions: Math.round(REQUIRED_PER_ARM * 0.031) }),
		);
		expect(result.status).toBe('reject');
		expect(result.reason).toContain('below the MDE');
	});

	it('extends once when the effect is real-sized but not yet resolved', () => {
		// +25% point estimate on few conversions: the effect is at least the
		// MDE, but at α = 0.025 the interval still spans zero. Full sample,
		// low base rate — exactly the case the rule is written for.
		const result = decide(
			input({
				exposures: REQUIRED_PER_ARM,
				conversions: 75,
				controlExposures: REQUIRED_PER_ARM,
				controlConversions: 60,
			}),
		);
		expect(result.decisionLift!.relative).toBeCloseTo(0.25, 6);
		expect(result.decisionLift!.interval.low).toBeLessThan(0);
		expect(result.status).toBe('continue');
		expect(result.reason).toContain('Extend once');
	});

	it('invalidates everything on a sample ratio mismatch', () => {
		// Even a variant that would otherwise ship.
		const result = decide(input({ srm: BROKEN_SRM }));
		expect(result.status).toBe('invalid');
		expect(result.reason).toContain('assignment is skewed');
	});

	it('never ships the control against itself', () => {
		const result = decide(input({ variant: 'money' }));
		expect(result.status).toBe('continue');
		expect(result.decisionLift).toBeNull();
	});

	it('uses the corrected alpha, not the 95% display interval', () => {
		// A case that clears 95% but not the Bonferroni-corrected 97.5%: the
		// dashboard would show an interval above zero while the decision
		// correctly withholds a Ship.
		const result = decide(
			input({ conversions: Math.round(REQUIRED_PER_ARM * 0.0335) }),
		);
		expect(result.decisionLift!.interval.low).toBeLessThan(0);
		expect(result.status).not.toBe('ship');
	});

	it('reports progress against the required sample', () => {
		const result = decide(input({ exposures: 8450 }));
		expect(result.sampleProgress).toBeCloseTo(0.5, 5);
		expect(result.sampleReached).toBe(false);
	});

	it('waits for the control to reach the sample too', () => {
		const result = decide(input({ controlExposures: 100 }));
		expect(result.sampleReached).toBe(false);
		expect(result.status).toBe('continue');
	});
});

describe('maskEmail', () => {
	it.each([
		['david@example.com', 'd****@example.com'],
		['a@b.com', 'a*@b.com'],
		['long.address.here@sub.domain.co', 'l****************@sub.domain.co'],
	])('masks %s', (input_, expected) => {
		expect(maskEmail(input_)).toBe(expected);
	});

	it('keeps the domain, which is the part that is useful', () => {
		expect(maskEmail('someone@fxreplay.com')).toContain('@fxreplay.com');
	});

	it('handles missing and malformed values without throwing', () => {
		expect(maskEmail(null)).toBe('—');
		expect(maskEmail('not-an-email')).toBe('•••');
	});
});
