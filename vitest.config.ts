import { defineConfig } from 'vitest/config';

export default defineConfig({
	test: {
		// Scoped on purpose: the default glob also walks dist/ and .vercel/,
		// where a built artefact could match *.test.js.
		include: ['tests/unit/**/*.test.ts'],
	},
});
