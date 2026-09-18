import { getDb } from './index';
import { exposures, type NewExposure } from './schema';

/**
 * Record one exposure, idempotently (decision D17).
 *
 * ON CONFLICT DO NOTHING on the anonymous_id primary key: the first variant a
 * visitor is assigned is the one that counts, so a returning visitor can
 * neither switch arms nor be counted twice in the denominator.
 */
export async function recordExposure(row: NewExposure): Promise<void> {
	await getDb().insert(exposures).values(row).onConflictDoNothing();
}
