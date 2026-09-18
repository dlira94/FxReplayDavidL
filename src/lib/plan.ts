import { WHERE_TO_PRACTICE } from '../content/shared';
import type { VariantCopy } from '../content/variants/types';
import type {
	ExperienceLevel,
	Goal,
	Market,
	QuizAnswers,
	WeeklyHours,
} from './schemas';

/**
 * Answers → practice plan. A pure function with no I/O and no clock, so every
 * branch is unit testable and the same answers always produce the same plan.
 *
 * Deliberately not an LLM (decision, docs/ai-workflow.md): free, instant,
 * predictable, and it cannot hallucinate a promise the copy guardrails forbid.
 *
 * Every string below is copied verbatim from docs/experience.md §4 or
 * docs/messaging.md. tests/unit/plan.test.ts asserts that against the docs —
 * the same guard the variant copy has, for the same reason.
 */

/** §4.2 — sessions per week and session length, from weekly time. */
const WEEKLY_ROUTINE: Record<WeeklyHours, { label: string; sessions: number }> = {
	lt_2: { label: '2 × 45 min', sessions: 2 },
	'2_5': { label: '3 × 60 min', sessions: 3 },
	'5_10': { label: '4 × 90 min', sessions: 4 },
	'10_plus': { label: '5 × 2 h', sessions: 5 },
};

/** §4.3 — starting focus, from experience. */
const STARTING_FOCUS: Record<ExperienceLevel, string> = {
	just_starting:
		'one setup, one market, one timeframe; 30 trades before changing anything',
	lt_1y: 'one setup, log every trade, review weekly',
	'1_3y': 'test the same setup across 2 markets / sessions',
	'3y_plus': 'stress-test drawdowns and bad periods',
};

/** §4.4 — where to practice, from market. Shared copy, see messaging.md. */
const WHERE: Record<Market, string> = {
	forex: WHERE_TO_PRACTICE.forex,
	futures: WHERE_TO_PRACTICE.futures,
	crypto: WHERE_TO_PRACTICE.crypto,
	other: WHERE_TO_PRACTICE.other,
};

/** §4.5 — tools to use in FX Replay, from goal. */
const TOOLS: Record<Goal, string> = {
	validate: 'journal + performance analytics',
	prop_challenge: "prop firm simulator with your firm's rules",
	discipline: 'checklist + journal tags + Mentor AI review',
	screen_time: 'fast replay speed + multi-chart',
};

/**
 * messaging.md "Copy tokens" — the label `{hours}` renders as, phrased to read
 * naturally inside "… into {hours} a week". Never the raw enum value.
 */
export const HOURS_LABEL: Record<WeeklyHours, string> = {
	lt_2: 'less than 2 hours',
	'2_5': '2–5 hours',
	'5_10': '5–10 hours',
	'10_plus': '10+ hours',
};

export interface PlanRow {
	label: string;
	value: string;
}

export interface PracticePlan {
	/** From the variant, with {name} filled in. */
	title: string;
	/** From the variant, with {hours} filled in where the variant uses it. */
	lead: string;
	rows: PlanRow[];
	/** Sessions × 4, the number inside the milestone row. Exposed for tests. */
	milestoneSessions: number;
}

/**
 * Replaces `{name}` and `{hours}` in a copy slot.
 *
 * Values are inserted as plain text and rendered as text by the island, never
 * as markup — `{name}` is free input from the visitor.
 */
export function fillTokens(
	template: string,
	values: { name: string; hours: string },
): string {
	return template
		.replaceAll('{name}', values.name)
		.replaceAll('{hours}', values.hours);
}

/**
 * Takes the variant's copy rather than its id: the island already has the one
 * arm it is rendering, and importing the lookup would pull all three arms'
 * copy into a bundle that only ever needs one.
 */
export function buildPlan(
	answers: QuizAnswers,
	copy: VariantCopy,
): PracticePlan {
	const routine = WEEKLY_ROUTINE[answers.weeklyHours];
	const hours = HOURS_LABEL[answers.weeklyHours];
	const name = answers.firstName.trim();

	// §4.6 — N from sessions per week × 4.
	const milestoneSessions = routine.sessions * 4;

	return {
		title: fillTokens(copy.result.title, { name, hours }),
		lead: fillTokens(copy.result.lead, { name, hours }),
		milestoneSessions,
		// Order follows §4: routine, focus, where, tools, milestone.
		rows: [
			{ label: 'Weekly routine', value: routine.label },
			{ label: 'Starting focus', value: STARTING_FOCUS[answers.experience] },
			{ label: 'Where to practice', value: WHERE[answers.market] },
			{ label: 'Tools to use in FX Replay', value: TOOLS[answers.goal] },
			{
				label: 'Milestone',
				value: `After ${milestoneSessions} sessions, review your stats`,
			},
		],
	};
}

/** Exported for the copy-vs-docs assertions in tests/unit/plan.test.ts. */
export const PLAN_COPY = {
	WEEKLY_ROUTINE,
	STARTING_FOCUS,
	WHERE,
	TOOLS,
} as const;
