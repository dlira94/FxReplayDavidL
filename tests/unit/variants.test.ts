import { describe, expect, it } from 'vitest';

import {
	CONTROL_VARIANT,
	VARIANT_IDS,
	assignVariant,
	isNonProductionTraffic,
	isVariantId,
	resolveVariant,
} from '../../src/lib/variants';

/** Returns each value in turn, so a "random" draw can be asserted exactly. */
function sequence(values: number[]): () => number {
	let index = 0;
	return () => values[index++ % values.length] as number;
}

describe('isVariantId', () => {
	it('accepts every declared arm', () => {
		for (const id of VARIANT_IDS) {
			expect(isVariantId(id)).toBe(true);
		}
	});

	it.each([
		['unknown string', 'control'],
		['empty string', ''],
		['casing mismatch', 'Money'],
		['whitespace', ' money'],
	])('rejects %s', (_label, value) => {
		expect(isVariantId(value)).toBe(false);
	});

	it.each([undefined, null, 0, {}, []])('rejects the non-string %s', (value) => {
		expect(isVariantId(value)).toBe(false);
	});
});

describe('assignVariant', () => {
	it('maps each third of the range to one arm', () => {
		expect(assignVariant(() => 0)).toBe('money');
		expect(assignVariant(() => 0.34)).toBe('time');
		expect(assignVariant(() => 0.67)).toBe('discipline');
	});

	it('clamps a random source that returns 1 instead of indexing past the end', () => {
		expect(assignVariant(() => 1)).toBe('discipline');
	});

	it('splits uniformly over many draws', () => {
		const draws = 30_000;
		const counts: Record<string, number> = { money: 0, time: 0, discipline: 0 };

		for (let i = 0; i < draws; i++) {
			const variant = assignVariant();
			counts[variant] = (counts[variant] ?? 0) + 1;
		}

		const expected = draws / VARIANT_IDS.length;
		// ±3 % of the expected share. An assignment that drifts off a third
		// surfaces as a sample ratio mismatch weeks later and invalidates the
		// whole readout, so it is worth asserting here.
		for (const id of VARIANT_IDS) {
			expect(counts[id]).toBeGreaterThan(expected * 0.97);
			expect(counts[id]).toBeLessThan(expected * 1.03);
		}
	});
});

describe('isNonProductionTraffic', () => {
	it('treats production as the only real traffic', () => {
		expect(isNonProductionTraffic('production')).toBe(false);
	});

	it.each(['preview', 'development', undefined, ''])(
		'flags %s as QA',
		(env) => {
			expect(isNonProductionTraffic(env)).toBe(true);
		},
	);
});

describe('resolveVariant', () => {
	it('keeps the arm in the cookie', () => {
		expect(
			resolveVariant({ cookie: 'discipline', vercelEnv: 'production' }),
		).toEqual({ variant: 'discipline', isQa: false, source: 'cookie' });
	});

	it('assigns a fresh arm when there is no cookie', () => {
		expect(
			resolveVariant({
				vercelEnv: 'production',
				random: sequence([0.5]),
			}),
		).toEqual({ variant: 'time', isQa: false, source: 'assigned' });
	});

	it('honours ?variant= and flags the session as QA', () => {
		expect(
			resolveVariant({ override: 'time', vercelEnv: 'production' }),
		).toEqual({ variant: 'time', isQa: true, source: 'override' });
	});

	it('lets the override win over an existing cookie', () => {
		const result = resolveVariant({
			cookie: 'money',
			override: 'discipline',
			vercelEnv: 'production',
		});

		expect(result.variant).toBe('discipline');
		expect(result.isQa).toBe(true);
	});

	it('does not honour an invalid override but still flags it as QA', () => {
		// No arm to switch to, so the cookie stands — but a real visitor does
		// not append ?variant= to a URL. A typo in a QA link is still someone
		// testing, and letting it into the readout is the contamination D18
		// exists to prevent (D45).
		const result = resolveVariant({
			cookie: 'money',
			override: 'nonsense',
			vercelEnv: 'production',
		});

		expect(result).toEqual({ variant: 'money', isQa: true, source: 'cookie' });
	});

	it('flags an invalid override as QA even with no cookie', () => {
		const result = resolveVariant({
			override: 'typo',
			vercelEnv: 'production',
			random: sequence([0]),
		});
		expect(result.isQa).toBe(true);
		expect(result.source).toBe('assigned');
	});

	it('flags everything outside production as QA, cookie or not', () => {
		expect(resolveVariant({ cookie: 'money', vercelEnv: 'preview' }).isQa).toBe(
			true,
		);
		expect(
			resolveVariant({ vercelEnv: undefined, random: sequence([0]) }).isQa,
		).toBe(true);
	});

	it('keeps a session QA after the ?variant= parameter is gone', () => {
		// The bug this prevents: force an arm, then reload without the
		// parameter. The cookie persists, so the arm is right — but the
		// session used to resolve as production traffic and its conversion
		// landed in the readout (D46).
		const forced = resolveVariant({ override: 'time', vercelEnv: 'production' });
		expect(forced.isQa).toBe(true);

		const laterLoad = resolveVariant({
			cookie: 'time',
			vercelEnv: 'production',
			qaSession: true,
		});
		expect(laterLoad.isQa).toBe(true);
		expect(laterLoad.variant).toBe('time');
	});

	it('leaves a genuine production session alone', () => {
		expect(
			resolveVariant({ cookie: 'money', vercelEnv: 'production', qaSession: false })
				.isQa,
		).toBe(false);
	});

	it('always returns a declared arm', () => {
		for (let i = 0; i < 200; i++) {
			expect(VARIANT_IDS).toContain(resolveVariant().variant);
		}
	});

	it('names a control that is one of the arms', () => {
		expect(VARIANT_IDS).toContain(CONTROL_VARIANT);
	});
});
