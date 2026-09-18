import { defineConfig } from 'vitest/config';

/**
 * Integration runs separately from `npm test` on purpose: it needs
 * DATABASE_URL and writes to the real database, so the default suite stays
 * offline, fast and safe to run anywhere.
 *
 *   npm run test:integration
 */
export default defineConfig({
	test: {
		include: ['tests/integration/**/*.test.ts'],
		// One database, so no parallel files racing each other's fixtures.
		fileParallelism: false,
		testTimeout: 20_000,
	},
});
