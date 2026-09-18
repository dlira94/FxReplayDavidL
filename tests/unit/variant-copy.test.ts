import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { describe, expect, it } from 'vitest';

import { VARIANT_COPY } from '../../src/content/variants';
import type { VariantCopy } from '../../src/content/variants/types';
import { VARIANT_IDS } from '../../src/lib/variants';

const MESSAGING = readFileSync(
	join(process.cwd(), 'docs/messaging.md'),
	'utf8',
);

/**
 * Every string in a VariantCopy that is shown to a visitor.
 *
 * `id` and `pain` are excluded: `id` is a key, and `pain` is a one-line
 * summary for review that never reaches the page.
 */
function renderedStrings(copy: VariantCopy): Array<[string, string]> {
	return [
		['hero.headline', copy.hero.headline],
		['hero.subheadline', copy.hero.subheadline],
		['problem.title', copy.problem.title],
		['problem.body', copy.problem.body],
		['quizIntro', copy.quizIntro],
		['emailHeadline', copy.emailHeadline],
		['result.title', copy.result.title],
		['result.lead', copy.result.lead],
		['quizHelpers.market', copy.quizHelpers.market],
		['quizHelpers.experience', copy.quizHelpers.experience],
		['quizHelpers.weeklyHours', copy.quizHelpers.weeklyHours],
	];
}

/**
 * Copy is the independent variable of this experiment: the layout, the
 * components, the questions and the plan logic are identical across arms so
 * that copy is the only thing that differs.
 *
 * That makes a paraphrase worse than a typo. It does not break anything, it
 * runs for two weeks and answers a question nobody approved, and the readout
 * looks exactly as trustworthy as a real one. It also passes every copy
 * guardrail, because a fluent invention obeys them all.
 *
 * So the words in code must be the words in the doc, character for character.
 */
describe('variant copy mirrors docs/messaging.md', () => {
	it.each(VARIANT_IDS)('%s matches the doc verbatim', (variant) => {
		const copy = VARIANT_COPY[variant];

		for (const [slot, value] of renderedStrings(copy)) {
			expect(
				MESSAGING.includes(value),
				`${variant}.${slot} is not in docs/messaging.md verbatim:\n  ${value}`,
			).toBe(true);
		}
	});

	it('covers every declared arm', () => {
		expect(Object.keys(VARIANT_COPY).sort()).toEqual([...VARIANT_IDS].sort());
	});

	it('gives each arm its own words', () => {
		// Two arms sharing a hero would mean the experiment is comparing a
		// variant against itself.
		const headlines = VARIANT_IDS.map((id) => VARIANT_COPY[id].hero.headline);
		expect(new Set(headlines).size).toBe(VARIANT_IDS.length);
	});

	it('keeps the {name} and {hours} tokens the doc declares', () => {
		for (const id of VARIANT_IDS) {
			expect(VARIANT_COPY[id].result.title).toContain('{name}');
		}
		// Only `time` uses {hours}; the others must not introduce a token that
		// nothing renders.
		expect(VARIANT_COPY.time.result.lead).toContain('{hours}');
		expect(VARIANT_COPY.money.result.lead).not.toContain('{');
		expect(VARIANT_COPY.discipline.result.lead).not.toContain('{');
	});
});
