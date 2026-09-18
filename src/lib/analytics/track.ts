import type {
	CommonProperties,
	EventMap,
	EventName,
} from './events';
import { EXPERIMENT_ID } from './events';
import type { VariantId } from '../variants';

declare global {
	interface Window {
		dataLayer?: Array<Record<string, unknown>>;
	}
}

let common: CommonProperties | null = null;

export interface AnalyticsContext {
	variant: VariantId;
	isQa: boolean;
	pagePath: string;
	utm?: Partial<
		Record<
			'utmSource' | 'utmMedium' | 'utmCampaign' | 'utmContent' | 'utmTerm',
			string | null
		>
	>;
}

/** Called once when the island mounts. Until then `track()` is a no-op. */
export function initAnalytics(context: AnalyticsContext): void {
	common = {
		variant: context.variant,
		experiment_id: EXPERIMENT_ID,
		is_qa: context.isQa,
		page_path: context.pagePath,
		...cleanUtm(context.utm),
	};
}

function cleanUtm(utm: AnalyticsContext['utm']): Partial<CommonProperties> {
	if (!utm) return {};
	const out: Record<string, string> = {};
	const keys = {
		utmSource: 'utm_source',
		utmMedium: 'utm_medium',
		utmCampaign: 'utm_campaign',
		utmContent: 'utm_content',
		utmTerm: 'utm_term',
	} as const;
	for (const [from, to] of Object.entries(keys)) {
		const value = utm[from as keyof typeof keys];
		if (value) out[to] = value;
	}
	return out as Partial<CommonProperties>;
}

const EMAIL_PATTERN = /[^\s@]+@[^\s@]+\.[^\s@]+/;

/**
 * No PII reaches analytics — enforced here rather than trusted to every call
 * site (CLAUDE.md). A value that looks like an email is dropped and the
 * violation is logged, so the event still fires with the rest of its
 * properties instead of the whole measurement disappearing over one bad field.
 */
function stripPii(
	event: EventName,
	properties: Record<string, unknown>,
): Record<string, unknown> {
	const safe: Record<string, unknown> = {};
	for (const [key, value] of Object.entries(properties)) {
		if (typeof value === 'string' && EMAIL_PATTERN.test(value)) {
			console.error(
				`[analytics] dropped "${key}" from "${event}": looks like an email address`,
			);
			continue;
		}
		safe[key] = value;
	}
	return safe;
}

/**
 * The only way an event reaches the dataLayer. Call sites never push directly,
 * so common properties cannot be forgotten and PII cannot slip past.
 *
 * GTM, GA4 and the server-side `account_created` are wired in block 4; today
 * this fills `window.dataLayer` and nothing reads it yet.
 */
export function track<E extends EventName>(
	event: E,
	...args: EventMap[E] extends undefined ? [] : [EventMap[E]]
): void {
	if (typeof window === 'undefined') return;
	if (!common) {
		console.error(`[analytics] "${event}" fired before initAnalytics()`);
		return;
	}

	const properties = (args[0] ?? {}) as Record<string, unknown>;
	window.dataLayer = window.dataLayer ?? [];
	window.dataLayer.push({
		event,
		...common,
		...stripPii(event, properties),
	});
}

/** Test seam: lets e2e assert on a clean dataLayer. */
export function resetAnalyticsForTests(): void {
	common = null;
}
