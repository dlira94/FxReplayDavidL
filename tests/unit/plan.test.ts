import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { describe, expect, it } from 'vitest';

import { HOURS_LABEL, PLAN_COPY, buildPlan, fillTokens } from '../../src/lib/plan';
import {
	EXPERIENCE_LEVELS,
	GOALS,
	MARKETS,
	WEEKLY_HOURS,
	type QuizAnswers,
} from '../../src/lib/schemas';
import { getVariantCopy } from '../../src/content/variants';
import { VARIANT_IDS } from '../../src/lib/variants';

const EXPERIENCE_DOC = readFileSync(
	join(process.cwd(), 'docs/experience.md'),
	'utf8',
);
const MESSAGING_DOC = readFileSync(
	join(process.cwd(), 'docs/messaging.md'),
	'utf8',
);

const BASE: QuizAnswers = {
	firstName: 'David',
	market: 'forex',
	experience: 'lt_1y',
	weeklyHours: '2_5',
	goal: 'validate',
};

describe('plan copy mirrors the docs', () => {
	// Same rule as the variant copy: the plan is what the visitor converts for,
	// so its words are approved words, not reconstructed ones.
	it.each(Object.entries(PLAN_COPY.WEEKLY_ROUTINE))(
		'weekly routine %s is in experience.md §4',
		(_key, routine) => {
			expect(EXPERIENCE_DOC).toContain(routine.label);
		},
	);

	it.each(Object.entries(PLAN_COPY.STARTING_FOCUS))(
		'starting focus %s is in experience.md §4',
		(_key, value) => {
			expect(EXPERIENCE_DOC).toContain(value);
		},
	);

	it.each(Object.entries(PLAN_COPY.TOOLS))(
		'tools %s is in experience.md §4',
		(_key, value) => {
			expect(EXPERIENCE_DOC).toContain(value);
		},
	);

	it.each(Object.entries(PLAN_COPY.WHERE))(
		'where to practice %s is in both docs',
		(_key, value) => {
			expect(EXPERIENCE_DOC).toContain(value);
			expect(MESSAGING_DOC).toContain(value);
		},
	);

	it.each(Object.entries(HOURS_LABEL))(
		'{hours} label for %s is in messaging.md',
		(_key, label) => {
			expect(MESSAGING_DOC).toContain(label);
		},
	);
});

describe('fillTokens', () => {
	it('fills both tokens', () => {
		expect(
			fillTokens("{name}'s plan for {hours} a week", {
				name: 'Ana',
				hours: '2–5 hours',
			}),
		).toBe("Ana's plan for 2–5 hours a week");
	});

	it('leaves a template with no tokens untouched', () => {
		expect(fillTokens('No tokens here', { name: 'Ana', hours: '2–5 hours' })).toBe(
			'No tokens here',
		);
	});

	it('replaces every occurrence, not just the first', () => {
		expect(fillTokens('{name} and {name}', { name: 'Ana', hours: 'x' })).toBe(
			'Ana and Ana',
		);
	});

	it('inserts a name containing markup as literal text', () => {
		// The island renders this as text, never as HTML; this pins the
		// contract so a future change to the renderer is a visible decision.
		const out = fillTokens('{name}', {
			name: '<script>alert(1)</script>',
			hours: 'x',
		});
		expect(out).toBe('<script>alert(1)</script>');
	});
});

describe('buildPlan', () => {
	it('covers every combination of answers', () => {
		let combinations = 0;

		for (const variant of VARIANT_IDS) {
			for (const market of MARKETS) {
				for (const experience of EXPERIENCE_LEVELS) {
					for (const weeklyHours of WEEKLY_HOURS) {
						for (const goal of GOALS) {
							const plan = buildPlan(
								{ ...BASE, market, experience, weeklyHours, goal },
								getVariantCopy(variant),
							);
							combinations++;

							expect(plan.rows).toHaveLength(5);
							for (const row of plan.rows) {
								expect(row.value.length).toBeGreaterThan(0);
								// An unfilled token means a slot the renderer will
								// print raw at the visitor.
								expect(row.value).not.toContain('{');
							}
							expect(plan.title).not.toContain('{');
							expect(plan.lead).not.toContain('{');
						}
					}
				}
			}
		}

		// 3 variants × 4 markets × 4 experience × 4 hours × 4 goals
		expect(combinations).toBe(768);
	});

	it('maps weekly hours to sessions and to the milestone', () => {
		const expected: Record<string, [string, number]> = {
			lt_2: ['2 × 45 min', 8],
			'2_5': ['3 × 60 min', 12],
			'5_10': ['4 × 90 min', 16],
			'10_plus': ['5 × 2 h', 20],
		};

		for (const [hours, [routine, milestone]] of Object.entries(expected)) {
			const plan = buildPlan(
				{ ...BASE, weeklyHours: hours as QuizAnswers['weeklyHours'] },
				getVariantCopy('money'),
			);
			expect(plan.rows[0]).toEqual({ label: 'Weekly routine', value: routine });
			expect(plan.milestoneSessions).toBe(milestone);
			expect(plan.rows[4]!.value).toBe(
				`After ${milestone} sessions, review your stats`,
			);
		}
	});

	it('renders {hours} as the label, never the raw enum value', () => {
		// `time` is the one variant whose lead uses {hours}.
		const plan = buildPlan({ ...BASE, weeklyHours: '5_10' }, getVariantCopy('time'));
		expect(plan.lead).toContain('5–10 hours');
		expect(plan.lead).not.toContain('5_10');
	});

	it('puts the name in the title', () => {
		const plan = buildPlan({ ...BASE, firstName: '  Ana  ' }, getVariantCopy('discipline'));
		expect(plan.title).toContain('Ana');
		expect(plan.title).not.toContain('  Ana');
	});

	it('changes only the framing between variants, never the plan', () => {
		// The experiment is copy-only: if the plan itself differed by arm, a
		// difference in conversion could be the plan rather than the message.
		const answers = { ...BASE, market: 'crypto' as const };
		const [a, b, c] = VARIANT_IDS.map((v) => buildPlan(answers, getVariantCopy(v)));

		expect(a!.rows).toEqual(b!.rows);
		expect(b!.rows).toEqual(c!.rows);
		expect(new Set([a!.title, b!.title, c!.title]).size).toBe(3);
	});
});
