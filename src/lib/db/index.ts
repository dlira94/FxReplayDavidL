import { neon } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-http';

import * as schema from './schema';

export type Database = ReturnType<typeof createDb>;

function createDb(url: string) {
	// Neon's HTTP driver: one fetch per query, no connection to keep alive.
	// That is what makes it usable from a serverless function that may never
	// handle a second request.
	return drizzle(neon(url), { schema });
}

let cached: Database | undefined;

/**
 * Lazily built so importing this module never throws at build time, when
 * DATABASE_URL is not present. Use the pooled URL here; the unpooled one is
 * for drizzle-kit migrations only.
 */
export function getDb(): Database {
	if (!cached) {
		const url = process.env.DATABASE_URL;
		if (!url) {
			throw new Error(
				'DATABASE_URL is not set. Copy .env.example to .env.local and fill it in.',
			);
		}
		cached = createDb(url);
	}
	return cached;
}

export { schema };
