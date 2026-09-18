import { defineConfig, devices } from '@playwright/test';

const PORT = 4321;

/**
 * Scoped to tests/e2e so Playwright never picks up the Vitest suites in
 * tests/unit — same extension, different runner.
 *
 * Mobile first, because the audience is (docs/research.md) and because the
 * performance budgets in docs/performance.md are mobile numbers.
 */
export default defineConfig({
	testDir: './tests/e2e',
	fullyParallel: true,
	forbidOnly: !!process.env.CI,
	retries: process.env.CI ? 2 : 0,
	reporter: process.env.CI ? 'github' : 'list',

	use: {
		baseURL: process.env.E2E_BASE_URL ?? `http://localhost:${PORT}`,
		trace: 'on-first-retry',
	},

	projects: [
		{
			name: 'mobile-chrome',
			// channel: 'chrome' drives the Chrome already on the machine instead
			// of Playwright's own download, which this environment cannot fetch.
			// CI installs the bundled browser instead — see PLAYWRIGHT_CHANNEL.
			use: { ...devices['Pixel 7'], channel: process.env.PLAYWRIGHT_CHANNEL ?? 'chrome' },
		},
	],

	// No `webServer`: Astro 7's dev server detaches and the foreground process
	// exits, which Playwright reads as "the server died" (decision D21).
	// Start it yourself before running e2e:
	//
	//   npm run dev                       # backgrounds itself
	//   npm run test:e2e
	//
	// or point at a deployed preview and skip the local server entirely:
	//
	//   E2E_BASE_URL=https://<preview>.vercel.app npm run test:e2e
});
