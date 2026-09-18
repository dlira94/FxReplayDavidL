import type { VariantCopy } from '../../content/variants';
import type { StepName } from '../../lib/analytics/events';
import {
	EXPERIENCE_LEVELS,
	GOALS,
	MARKETS,
	WEEKLY_HOURS,
} from '../../lib/schemas';

/**
 * The six steps, from docs/experience.md §2.
 *
 * Question text is [shared] and option labels come from experience.md; only
 * the one-line helper under questions 2-4 is [variant], which is why `helper`
 * is a function of the variant copy rather than a string.
 */

export type StepKind = 'text' | 'choice' | 'email';

export interface StepOption {
	value: string;
	label: string;
}

export interface StepDefinition {
	number: number;
	name: StepName;
	kind: StepKind;
	question: string;
	helper?: (copy: VariantCopy) => string;
	options?: StepOption[];
	/** Blocking steps wait for the server; the rest save in the background. */
	blocking: boolean;
}

const zip = (values: readonly string[], labels: string[]): StepOption[] =>
	values.map((value, i) => ({ value, label: labels[i] as string }));

export const STEPS: StepDefinition[] = [
	{
		number: 1,
		name: 'name',
		kind: 'text',
		question: 'What should we call you?',
		blocking: true,
	},
	{
		number: 2,
		name: 'market',
		kind: 'choice',
		question: 'What do you trade?',
		helper: (copy) => copy.quizHelpers.market,
		options: zip(MARKETS, ['Forex', 'Futures', 'Crypto', 'Indices / other']),
		blocking: false,
	},
	{
		number: 3,
		name: 'experience',
		kind: 'choice',
		question: 'How long have you been trading?',
		helper: (copy) => copy.quizHelpers.experience,
		options: zip(EXPERIENCE_LEVELS, [
			'Just starting',
			'< 1 year',
			'1–3 years',
			'3+ years',
		]),
		blocking: false,
	},
	{
		number: 4,
		name: 'weekly_hours',
		kind: 'choice',
		question: 'How much time can you practice per week?',
		helper: (copy) => copy.quizHelpers.weeklyHours,
		options: zip(WEEKLY_HOURS, ['< 2 h', '2–5 h', '5–10 h', '10+ h']),
		blocking: false,
	},
	{
		number: 5,
		name: 'goal',
		kind: 'choice',
		question: "What's your main goal right now?",
		options: zip(GOALS, [
			'Validate a strategy',
			'Pass a prop challenge',
			'Build discipline',
			'Get more screen time',
		]),
		blocking: false,
	},
	{
		number: 6,
		name: 'email',
		kind: 'email',
		question: 'Email',
		blocking: true,
	},
];

export const TOTAL_STEPS = STEPS.length;

/** Maps a step to the answers key it writes. */
export const FIELD_FOR_STEP: Record<StepName, string> = {
	name: 'firstName',
	market: 'market',
	experience: 'experience',
	weekly_hours: 'weeklyHours',
	goal: 'goal',
	email: 'email',
};
