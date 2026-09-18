/**
 * The statistics behind the experiment readout.
 *
 * Pure functions with no I/O, unit-tested against values worked out by hand,
 * because these are the numbers a ship/reject decision rests on. A conversion
 * rate with the wrong interval is worse than no interval: it looks like
 * evidence.
 */

export interface Interval {
	low: number;
	high: number;
}

/**
 * Wilson score interval for a binomial proportion.
 *
 * Not the normal approximation (p ± 1.96·√(p(1−p)/n)), which is the one most
 * people reach for and which breaks exactly where this experiment lives: small
 * conversion rates and moderate n. At 3% and n = 500 it happily produces a
 * lower bound below zero. Wilson stays inside [0, 1] and behaves at the edges.
 */
export function wilsonInterval(
	successes: number,
	trials: number,
	z = 1.959963985, // 95%
): Interval {
	if (trials <= 0) return { low: 0, high: 0 };

	const p = successes / trials;
	const z2 = z * z;
	const denominator = 1 + z2 / trials;
	const centre = p + z2 / (2 * trials);
	const spread =
		z * Math.sqrt((p * (1 - p)) / trials + z2 / (4 * trials * trials));

	return {
		low: Math.max(0, (centre - spread) / denominator),
		high: Math.min(1, (centre + spread) / denominator),
	};
}

export interface Lift {
	/** Relative lift vs control, e.g. 0.2 = +20%. */
	relative: number;
	interval: Interval;
}

/**
 * Relative lift and its 95% interval, via the delta method on log(p1/p0).
 *
 * Working on the log scale keeps the interval multiplicative, which is what a
 * relative lift is: "+20%" and "−17%" are the same size of move in opposite
 * directions, and a symmetric interval around the ratio would not say that.
 */
export function relativeLift(
	variantSuccesses: number,
	variantTrials: number,
	controlSuccesses: number,
	controlTrials: number,
	z = 1.959963985,
): Lift | null {
	if (variantTrials <= 0 || controlTrials <= 0) return null;
	if (variantSuccesses <= 0 || controlSuccesses <= 0) return null;

	const p1 = variantSuccesses / variantTrials;
	const p0 = controlSuccesses / controlTrials;

	const logRatio = Math.log(p1 / p0);
	const standardError = Math.sqrt(
		(1 - p1) / variantSuccesses + (1 - p0) / controlSuccesses,
	);

	return {
		relative: p1 / p0 - 1,
		interval: {
			low: Math.exp(logRatio - z * standardError) - 1,
			high: Math.exp(logRatio + z * standardError) - 1,
		},
	};
}

export interface SrmResult {
	chiSquare: number;
	pValue: number;
	degreesOfFreedom: number;
	status: 'ok' | 'alert' | 'insufficient_data';
}

/**
 * Sample ratio mismatch: are the arms getting the traffic they should?
 *
 * This is the check that decides whether the rest of the readout means
 * anything. If assignment is skewed, every conversion comparison is between
 * populations that were never equivalent, and a "winner" may be an artefact of
 * who landed where. p < 0.001 rather than 0.05 on purpose: it runs on every
 * refresh of the dashboard, and at 0.05 it would cry wolf constantly.
 */
export function sampleRatioMismatch(
	observed: number[],
	expectedShare: number[] = observed.map(() => 1 / observed.length),
	alpha = 0.001,
): SrmResult {
	const total = observed.reduce((sum, n) => sum + n, 0);
	const degreesOfFreedom = observed.length - 1;

	// Pearson's chi-square wants an expected count of at least 5 per cell.
	// Below that the approximation is not trustworthy, and reporting a p-value
	// anyway would be inventing precision.
	const minExpected = Math.min(...expectedShare.map((share) => share * total));
	if (total === 0 || minExpected < 5) {
		return {
			chiSquare: 0,
			pValue: 1,
			degreesOfFreedom,
			status: 'insufficient_data',
		};
	}

	let chiSquare = 0;
	for (let i = 0; i < observed.length; i++) {
		const expected = (expectedShare[i] ?? 0) * total;
		const diff = (observed[i] ?? 0) - expected;
		chiSquare += (diff * diff) / expected;
	}

	const pValue = chiSquareUpperTail(chiSquare, degreesOfFreedom);

	return {
		chiSquare,
		pValue,
		degreesOfFreedom,
		status: pValue < alpha ? 'alert' : 'ok',
	};
}

/** P(X > x) for a chi-square with k degrees of freedom. */
export function chiSquareUpperTail(x: number, k: number): number {
	if (x <= 0) return 1;
	if (k <= 0) return 0;
	// The upper tail is the regularised upper incomplete gamma Q(k/2, x/2).
	return upperIncompleteGammaRegularised(k / 2, x / 2);
}

/**
 * Q(s, x) — series expansion below the transition point, continued fraction
 * above it, which is where each converges quickly. Standard Numerical Recipes
 * split; the alternative was a dependency for three call sites.
 */
function upperIncompleteGammaRegularised(s: number, x: number): number {
	if (x < 0 || s <= 0) return Number.NaN;
	if (x === 0) return 1;

	if (x < s + 1) {
		// Series for the lower tail P(s, x), then Q = 1 − P.
		let term = 1 / s;
		let sum = term;
		for (let n = 1; n < 1000; n++) {
			term *= x / (s + n);
			sum += term;
			if (Math.abs(term) < Math.abs(sum) * 1e-15) break;
		}
		return 1 - sum * Math.exp(-x + s * Math.log(x) - logGamma(s));
	}

	// Lentz's continued fraction for Q directly.
	const tiny = 1e-300;
	let b = x + 1 - s;
	let c = 1 / tiny;
	let d = 1 / b;
	let h = d;
	for (let i = 1; i < 1000; i++) {
		const an = -i * (i - s);
		b += 2;
		d = an * d + b;
		if (Math.abs(d) < tiny) d = tiny;
		c = b + an / c;
		if (Math.abs(c) < tiny) c = tiny;
		d = 1 / d;
		const delta = d * c;
		h *= delta;
		if (Math.abs(delta - 1) < 1e-15) break;
	}
	return h * Math.exp(-x + s * Math.log(x) - logGamma(s));
}

/** Lanczos approximation; accurate to ~15 significant figures for s > 0. */
function logGamma(s: number): number {
	const coefficients = [
		76.18009172947146, -86.50532032941677, 24.01409824083091,
		-1.231739572450155, 0.1208650973866179e-2, -0.5395239384953e-5,
	];
	let y = s;
	let tmp = s + 5.5;
	tmp -= (s + 0.5) * Math.log(tmp);
	let series = 1.000000000190015;
	for (const coefficient of coefficients) series += coefficient / ++y;
	return -tmp + Math.log((2.5066282746310005 * series) / s);
}
