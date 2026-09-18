import { and, eq, sql } from 'drizzle-orm';

import { getDb } from './db';
import { exposures, users } from './db/schema';
import {
	relativeLift,
	sampleRatioMismatch,
	wilsonInterval,
	type Interval,
	type Lift,
	type SrmResult,
} from './stats';
import { CONTROL_VARIANT, VARIANT_IDS, type VariantId } from './variants';

/**
 * The experiment readout, aggregated in the database and shaped here.
 *
 * Counts only — the response has no PII, which is what lets an agent read it
 * (D19). Everything excludes QA and bot rows unless asked otherwise.
 */

export interface VariantStats {
	variant: VariantId;
	exposures: number;
	quizStarts: number;
	conversions: number;
	emailExists: number;
	conversionRate: number;
	conversionInterval: Interval;
	lift: Lift | null;
	dropOffByStep: Record<string, number>;
}

export interface StatsResponse {
	experimentId: string;
	generatedAt: string;
	includeQa: boolean;
	excluded: string[];
	control: VariantId;
	variants: VariantStats[];
	srm: SrmResult & { expectedShare: number };
}

export async function buildStats(includeQa: boolean): Promise<StatsResponse> {
	const db = getDb();

	// `is_qa` covers previews, local dev and forced variants (D18); `is_bot`
	// covers automation. Including QA is a demo affordance, never a default.
	const exposureFilter = includeQa
		? sql`true`
		: and(eq(exposures.isQa, false), eq(exposures.isBot, false));
	const userFilter = includeQa
		? sql`true`
		: and(eq(users.isQa, false), eq(users.isBot, false));

	const exposureRows = await db
		.select({
			variant: exposures.variant,
			count: sql<number>`count(*)::int`,
		})
		.from(exposures)
		.where(exposureFilter)
		.groupBy(exposures.variant);

	const userRows = await db
		.select({
			variant: users.variant,
			status: users.status,
			lastStep: users.lastStep,
			count: sql<number>`count(*)::int`,
		})
		.from(users)
		.where(userFilter)
		.groupBy(users.variant, users.status, users.lastStep);

	const exposureByVariant = new Map(
		exposureRows.map((row) => [row.variant, row.count]),
	);

	const controlExposures = exposureByVariant.get(CONTROL_VARIANT) ?? 0;
	const controlConversions = userRows
		.filter((r) => r.variant === CONTROL_VARIANT && r.status === 'converted')
		.reduce((sum, r) => sum + r.count, 0);

	const variants: VariantStats[] = VARIANT_IDS.map((variant) => {
		const rows = userRows.filter((r) => r.variant === variant);
		const exposed = exposureByVariant.get(variant) ?? 0;
		const quizStarts = rows.reduce((sum, r) => sum + r.count, 0);
		const conversions = rows
			.filter((r) => r.status === 'converted')
			.reduce((sum, r) => sum + r.count, 0);
		const emailExists = rows
			.filter((r) => r.status === 'email_exists')
			.reduce((sum, r) => sum + r.count, 0);

		// Drop-off is "how far did people who did not convert get", so
		// converted rows are excluded rather than counted at step 6.
		const dropOffByStep: Record<string, number> = {};
		for (const row of rows) {
			if (row.status === 'converted') continue;
			const key = String(row.lastStep);
			dropOffByStep[key] = (dropOffByStep[key] ?? 0) + row.count;
		}

		return {
			variant,
			exposures: exposed,
			quizStarts,
			conversions,
			emailExists,
			conversionRate: exposed > 0 ? conversions / exposed : 0,
			conversionInterval: wilsonInterval(conversions, exposed),
			lift:
				variant === CONTROL_VARIANT
					? null
					: relativeLift(conversions, exposed, controlConversions, controlExposures),
			dropOffByStep,
		};
	});

	const srm = sampleRatioMismatch(variants.map((v) => v.exposures));

	return {
		experimentId: 'try_free_pain_v1',
		generatedAt: new Date().toISOString(),
		includeQa,
		excluded: includeQa ? [] : ['is_qa', 'is_bot'],
		control: CONTROL_VARIANT,
		variants,
		srm: { ...srm, expectedShare: 1 / VARIANT_IDS.length },
	};
}
