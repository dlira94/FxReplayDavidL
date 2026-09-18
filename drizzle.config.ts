import { defineConfig } from 'drizzle-kit';

/**
 * Migrations run over the UNPOOLED connection: PgBouncer in transaction mode
 * does not support the session-level statements DDL needs.
 *
 * The app itself uses the pooled DATABASE_URL (src/lib/db/index.ts).
 *
 * Env is not read from a file here — run drizzle-kit with the vars loaded:
 *   node --env-file=.env.local node_modules/drizzle-kit/bin.cjs generate
 */
export default defineConfig({
	schema: './src/lib/db/schema.ts',
	out: './drizzle',
	dialect: 'postgresql',
	dbCredentials: {
		url: process.env.DATABASE_URL_UNPOOLED ?? '',
	},
	strict: true,
	verbose: true,
});
