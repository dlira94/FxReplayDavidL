import { describe, expect, it } from 'vitest';

import {
	chiSquareUpperTail,
	relativeLift,
	sampleRatioMismatch,
	wilsonInterval,
} from '../../src/lib/stats';

/**
 * Checked against values computed independently, not against this
 * implementation's own output. A statistics test that only asserts "what it
 * returns today" is a change detector, and these numbers decide whether a
 * variant ships.
 */

describe('wilsonInterval', () => {
	it('matches known textbook values', () => {
		// The canonical worked example: 12 successes in 20 trials.
		// Wilson 95% ≈ [0.3866, 0.7811].
		const a = wilsonInterval(12, 20);
		expect(a.low).toBeCloseTo(0.3866, 3);
		expect(a.high).toBeCloseTo(0.7811, 3);

		// 3% on 1000 trials ≈ [0.0210, 0.0427].
		const b = wilsonInterval(30, 1000);
		expect(b.low).toBeCloseTo(0.021, 3);
		expect(b.high).toBeCloseTo(0.0427, 3);
	});

	it('stays inside [0, 1] where the normal approximation does not', () => {
		// The case that motivates Wilson: the normal interval would put the
		// lower bound below zero here.
		const zero = wilsonInterval(0, 100);
		expect(zero.low).toBe(0);
		expect(zero.high).toBeGreaterThan(0);
		expect(zero.high).toBeLessThan(0.05);

		const all = wilsonInterval(100, 100);
		expect(all.high).toBe(1);
		expect(all.low).toBeLessThan(1);
		expect(all.low).toBeGreaterThan(0.9);
	});

	it('narrows as the sample grows', () => {
		const small = wilsonInterval(30, 1000);
		const large = wilsonInterval(300, 10_000);
		expect(large.high - large.low).toBeLessThan(small.high - small.low);
	});

	it('returns a degenerate interval with no data', () => {
		expect(wilsonInterval(0, 0)).toEqual({ low: 0, high: 0 });
	});
});

describe('relativeLift', () => {
	it('computes the point estimate', () => {
		// 3.6% vs 3.0% is exactly +20%.
		const lift = relativeLift(36, 1000, 30, 1000)!;
		expect(lift.relative).toBeCloseTo(0.2, 10);
	});

	it('puts the interval around the estimate, asymmetrically', () => {
		const lift = relativeLift(36, 1000, 30, 1000)!;
		expect(lift.interval.low).toBeLessThan(lift.relative);
		expect(lift.interval.high).toBeGreaterThan(lift.relative);
		// A ratio's interval is multiplicative, so it is not symmetric.
		const below = lift.relative - lift.interval.low;
		const above = lift.interval.high - lift.relative;
		expect(above).toBeGreaterThan(below);
	});

	it('crosses zero when the difference is not significant', () => {
		// 36 vs 30 on 1000 each: a real-looking lift, nowhere near significant.
		const lift = relativeLift(36, 1000, 30, 1000)!;
		expect(lift.interval.low).toBeLessThan(0);
		expect(lift.interval.high).toBeGreaterThan(0);
	});

	it('excludes zero once the sample is large enough', () => {
		// The same +20% at ten times the sample.
		const lift = relativeLift(360, 10_000, 300, 10_000)!;
		expect(lift.relative).toBeCloseTo(0.2, 10);
		expect(lift.interval.low).toBeGreaterThan(0);
	});

	it('reports a negative lift for a losing variant', () => {
		const lift = relativeLift(24, 1000, 30, 1000)!;
		expect(lift.relative).toBeCloseTo(-0.2, 10);
	});

	it('refuses to compute without data on both sides', () => {
		expect(relativeLift(0, 1000, 30, 1000)).toBeNull();
		expect(relativeLift(30, 1000, 0, 1000)).toBeNull();
		expect(relativeLift(30, 0, 30, 1000)).toBeNull();
	});
});

describe('chiSquareUpperTail', () => {
	it('matches table values', () => {
		// Critical values every stats table carries.
		expect(chiSquareUpperTail(3.841, 1)).toBeCloseTo(0.05, 3);
		expect(chiSquareUpperTail(5.991, 2)).toBeCloseTo(0.05, 3);
		expect(chiSquareUpperTail(13.816, 2)).toBeCloseTo(0.001, 4);
		expect(chiSquareUpperTail(6.635, 1)).toBeCloseTo(0.01, 3);
	});

	it('is 1 at zero and falls monotonically', () => {
		expect(chiSquareUpperTail(0, 2)).toBe(1);
		expect(chiSquareUpperTail(1, 2)).toBeGreaterThan(
			chiSquareUpperTail(5, 2),
		);
		expect(chiSquareUpperTail(50, 2)).toBeLessThan(1e-9);
	});
});

describe('sampleRatioMismatch', () => {
	it('passes a clean three-way split', () => {
		const result = sampleRatioMismatch([1000, 1000, 1000]);
		expect(result.chiSquare).toBeCloseTo(0, 10);
		expect(result.pValue).toBeCloseTo(1, 10);
		expect(result.status).toBe('ok');
		expect(result.degreesOfFreedom).toBe(2);
	});

	it('tolerates ordinary random variation', () => {
		// ±2% off a third is noise, not a broken assigner.
		const result = sampleRatioMismatch([1020, 990, 990]);
		expect(result.status).toBe('ok');
		expect(result.pValue).toBeGreaterThan(0.001);
	});

	it('alerts on a genuinely skewed split', () => {
		// One arm getting half the traffic: chi-square = 375 on 2 df.
		const result = sampleRatioMismatch([1500, 750, 750]);
		expect(result.chiSquare).toBeCloseTo(375, 6);
		expect(result.pValue).toBeLessThan(0.001);
		expect(result.status).toBe('alert');
	});

	it('refuses to judge a sample too small for the approximation', () => {
		// Chi-square needs ≥5 expected per cell; below that a p-value would be
		// invented precision.
		const result = sampleRatioMismatch([2, 1, 0]);
		expect(result.status).toBe('insufficient_data');
		expect(result.pValue).toBe(1);
	});

	it('handles no data at all', () => {
		expect(sampleRatioMismatch([0, 0, 0]).status).toBe('insufficient_data');
	});

	it('supports an uneven expected split', () => {
		const result = sampleRatioMismatch([500, 250, 250], [0.5, 0.25, 0.25]);
		expect(result.chiSquare).toBeCloseTo(0, 10);
		expect(result.status).toBe('ok');
	});
});
