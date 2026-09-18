import type { VariantId } from '../variants';

/**
 * Every analytics event, typed. A typo does not compile, and a property shape
 * that drifts from docs/analytics.md §4 is a type error rather than a column
 * of nulls discovered weeks later.
 *
 * Adding one goes through the `add-tracking-event` skill: typed here, fired
 * through `track()`, documented in analytics.md, asserted in e2e.
 */

export const EXPERIMENT_ID = 'try_free_pain_v1';

export type CtaLocation = 'header' | 'hero' | 'plan_preview' | 'final';
export type QuizErrorCode = 'network' | 'validation' | 'server';

/** Step names, so `step_number` is never the only thing identifying a step. */
export const STEP_NAMES = [
	'name',
	'market',
	'experience',
	'weekly_hours',
	'goal',
	'email',
] as const;

export type StepName = (typeof STEP_NAMES)[number];

export interface EventMap {
	experiment_exposure: undefined;
	cta_click: { cta_location: CtaLocation };
	plan_preview_view: undefined;
	quiz_start: { entry_cta_location: CtaLocation };
	quiz_step_complete: {
		step_number: number;
		step_name: StepName;
		/** Enum value. Omitted for name and email — those are PII. */
		answer?: string;
	};
	quiz_step_back: { from_step: number };
	quiz_error: { step_number: number; error_code: QuizErrorCode };
	signup_submit: undefined;
	signup_email_exists: undefined;
	plan_view: { converted: boolean };
	open_app_click: undefined;
}

export type EventName = keyof EventMap;

/** Attached to every event by `track()`, never by the call site. */
export interface CommonProperties {
	variant: VariantId;
	experiment_id: string;
	is_qa: boolean;
	page_path: string;
	utm_source?: string;
	utm_medium?: string;
	utm_campaign?: string;
	utm_content?: string;
	utm_term?: string;
}
