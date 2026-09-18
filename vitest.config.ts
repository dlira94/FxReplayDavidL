import { defineConfig } from 'vitest/config';

export default defineConfig({
	test: {
		// Scoped on purpose: the default glob also walks dist/ and .vercel/,
		// where a built artefact could match *.test.js.
		// Unit only. Integration has its own config because it needs a database
		// (vitest.integration.config.ts).
		include: ['tests/unit/**/*.test.ts'],
	},
});
