import { expect, test } from '@playwright/test';

/**
 * The dashboard login.
 *
 * Needs ADMIN_TOKEN in the environment; skipped rather than failed when it is
 * absent, so a contributor without the secret still gets a green suite.
 */

const TOKEN = process.env.ADMIN_TOKEN;

test.describe('dashboard access', () => {
	test.skip(!TOKEN, 'ADMIN_TOKEN is not set in this environment.');

	test('asks for a token before showing anything', async ({ page }) => {
		await page.goto('/dashboard');

		await expect(page.locator('form.dash__login')).toBeVisible();
		await expect(page.locator('#token')).toHaveAttribute('type', 'password');
		// No numbers on screen until someone has signed in.
		await expect(page.locator('table')).toHaveCount(0);
	});

	test('is never indexable, in any environment', async ({ page }) => {
		await page.goto('/dashboard');
		await expect(page.locator('meta[name="robots"]')).toHaveAttribute(
			'content',
			'noindex, nofollow',
		);
	});

	test('rejects a wrong token without hinting at what was wrong', async ({
		page,
	}) => {
		await page.goto('/dashboard');
		await page.locator('#token').fill('definitely-not-the-token');
		await page.locator('.dash__submit').click();

		const error = page.locator('.dash__error');
		await expect(error).toHaveText('That token is not valid.');
		await expect(error).toHaveAttribute('role', 'alert');
		await expect(page.locator('#token')).toHaveAttribute('aria-invalid', 'true');
		await expect(page.locator('table')).toHaveCount(0);
	});

	test('signs in, sets an httpOnly session and never puts the token in the URL', async ({
		page,
	}) => {
		await page.goto('/dashboard');
		await page.locator('#token').fill(TOKEN!);
		await page.locator('.dash__submit').click();

		await expect(page.locator('#funnel-title')).toBeVisible();
		// A token in a URL ends up in logs, referer headers and history.
		expect(page.url()).not.toContain(TOKEN!);
		expect(page.url()).toMatch(/\/dashboard$/);

		const cookie = (await page.context().cookies()).find(
			(c) => c.name === 'fxr_admin',
		)!;
		expect(cookie.httpOnly).toBe(true);
		expect(cookie.sameSite).toBe('Strict');
		// The cookie holds a hash; a stolen one must not open the API too.
		expect(cookie.value).not.toBe(TOKEN);
		expect(cookie.value).toMatch(/^[0-9a-f]{64}$/);

		// And the token is not sitting in the DOM either.
		expect(await page.content()).not.toContain(TOKEN!);
	});

	test('toggles QA data and says which view is on screen', async ({ page }) => {
		await page.goto('/dashboard');
		await page.locator('#token').fill(TOKEN!);
		await page.locator('.dash__submit').click();
		await expect(page.locator('#funnel-title')).toBeVisible();

		await expect(page.locator('.dash__toggle--on')).toHaveText('Production only');

		await page.getByRole('link', { name: 'Include QA data' }).click();
		await expect(page.locator('.dash__toggle--on')).toHaveText('Include QA data');
		// The demo view must say out loud that it is not a readout.
		await expect(page.locator('.dash__controls')).toContainText(
			'Not an experiment readout',
		);
	});

	test('shows sample progress and holds Continue until the sample is reached', async ({
		page,
	}) => {
		await page.goto('/dashboard');
		await page.locator('#token').fill(TOKEN!);
		await page.locator('.dash__submit').click();

		await expect(page.locator('.decision')).toHaveCount(3);
		await expect(page.locator('.decision__progress').first()).toContainText(
			'/ 16,900',
		);

		// The rule that exists to stop us: nothing ships on a partial sample.
		// Scoped to the decision cards: `.badge` alone would also pick up any
		// badge added elsewhere on the page later.
		await expect(page.locator('.decision .badge')).toHaveCount(3);
		const badges = await page.locator('.decision .badge').allTextContents();
		expect(badges.every((b) => b.trim() === 'Continue')).toBe(true);
		await expect(page.locator('.notice')).toContainText(
			'An early lead is not a decision',
		);
	});

	test('masks emails server-side and never renders a name', async ({ page }) => {
		await page.goto('/dashboard?include_qa=true');
		await page.locator('#token').fill(TOKEN!);
		await page.locator('.dash__submit').click();
		await page.goto('/dashboard?include_qa=true');

		await expect(page.locator('#signups-title')).toBeVisible();

		const html = await page.content();
		// A screenshot of this page must not be a customer list, so the full
		// address is never in the DOM to begin with.
		expect(html).not.toMatch(/demo-\w+-\d+@example\.com/);
		expect(html).toMatch(/\w\*+@/);
		// Names are not rendered at all.
		expect(html).not.toMatch(/>\s*Demo\s*</);
	});

	test('keeps the session across a reload', async ({ page }) => {
		await page.goto('/dashboard');
		await page.locator('#token').fill(TOKEN!);
		await page.locator('.dash__submit').click();
		await expect(page.locator('#funnel-title')).toBeVisible();

		await page.reload();
		await expect(page.locator('#funnel-title')).toBeVisible();
		await expect(page.locator('form.dash__login')).toHaveCount(0);
	});
});
