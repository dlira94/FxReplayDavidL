import { expect, test } from '@playwright/test';

/**
 * Landing guards.
 *
 * The header-CTA case exists because it already shipped broken: a scoped style
 * in Header.astro targeted a class on a *child component's* root element, so
 * Astro compiled it to a selector that matched nothing. Nothing failed — no
 * build error, no type error, no test — the rule was simply inert and a
 * duplicate CTA wrapped onto two lines in the sticky header on every phone.
 *
 * Silent CSS is exactly what a unit test cannot see, so it gets a browser.
 *
 * Run against a server you started (`npm run dev`) or a deployed preview:
 *   E2E_BASE_URL=https://<preview>.vercel.app npm run test:e2e
 *
 * Every structural locator is scoped under our own landmarks. Playwright
 * pierces shadow DOM, so a bare `h1` locator also finds the five headings
 * inside Astro's dev toolbar and the suite fails on a UI that is not ours.
 */

/** True when pointed at a deployed build rather than `astro dev`. */
const AGAINST_DEPLOYMENT = Boolean(process.env.E2E_BASE_URL);

test.describe('header', () => {
	test('hides the duplicate CTA on phones', async ({ page }) => {
		await page.setViewportSize({ width: 390, height: 844 });
		await page.goto('/');

		const headerCta = page.locator('.header__cta');
		await expect(headerCta).toBeHidden();

		// The rule's real purpose: one primary action in the first viewport.
		const visibleCtas = page.locator('header a.cta:visible, .hero a.cta:visible');
		expect(await visibleCtas.count()).toBeLessThanOrEqual(2); // hero primary + transitional
	});

	test('shows the CTA from 48rem up', async ({ page }) => {
		await page.setViewportSize({ width: 1280, height: 900 });
		await page.goto('/');

		await expect(page.locator('.header__cta')).toBeVisible();
	});
});

test.describe('structure', () => {
	test('has exactly one h1 and named landmarks', async ({ page }) => {
		await page.goto('/');

		await expect(page.locator('main#main h1')).toHaveCount(1);
		await expect(page.locator('body > header')).toHaveCount(1);
		await expect(page.locator('body > main#main')).toHaveCount(1);
		await expect(page.locator('body > footer')).toHaveCount(1);
	});

	test('points every primary CTA at the quiz anchor', async ({ page }) => {
		await page.goto('/');

		const primary = page.locator('a.cta--primary');
		expect(await primary.count()).toBeGreaterThanOrEqual(4);

		for (const href of await primary.evaluateAll((els) =>
			els.map((el) => el.getAttribute('href')),
		)) {
			expect(href).toBe('#plan');
		}

		await expect(page.locator('#plan')).toHaveCount(1);
	});

	test('keeps every touch target at 44px or more', async ({ page }) => {
		await page.setViewportSize({ width: 390, height: 844 });
		await page.goto('/');

		const small = await page
			.locator(
				'body > header a:visible, body > main a:visible, body > main summary:visible, body > footer a:visible',
			)
			.evaluateAll((els) =>
				els
					.map((el) => ({
						text: (el.textContent ?? '').trim().slice(0, 30),
						height: el.getBoundingClientRect().height,
					}))
					.filter((el) => el.height < 44),
			);

		expect(small).toEqual([]);
	});
});

test.describe('experiment integrity', () => {
	test('forces the arm from ?variant= and flags it as QA', async ({ page }) => {
		await page.goto('/?variant=discipline');

		const main = page.locator('main');
		await expect(main).toHaveAttribute('data-variant', 'discipline');
		await expect(main).toHaveAttribute('data-qa', 'true');
		await expect(page.locator('main#main h1')).toHaveText(
			'Train discipline like a skill.',
		);
	});

	test('keeps the arm stable across navigations', async ({ page }) => {
		await page.goto('/?variant=time');
		await page.goto('/');

		await expect(page.locator('main')).toHaveAttribute('data-variant', 'time');
	});

	test('ships no application JavaScript', async ({ page }) => {
		// Only meaningful against a build: `astro dev` serves Vite's HMR client
		// and the dev toolbar, neither of which exists in production.
		test.skip(
			!AGAINST_DEPLOYMENT,
			'Run with E2E_BASE_URL against a deployment.',
		);

		const scripts: string[] = [];
		page.on('request', (request) => {
			if (request.resourceType() === 'script') scripts.push(request.url());
		});

		await page.goto('/', { waitUntil: 'networkidle' });

		// Vercel injects its own toolbar on preview deployments; nothing of ours
		// should appear here.
		const ours = scripts.filter((url) => !url.includes('vercel.live'));
		expect(ours).toEqual([]);
	});
});
