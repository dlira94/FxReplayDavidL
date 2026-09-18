import { expect, test, type Page, type Route } from '@playwright/test';

/**
 * The quiz, end to end in a browser.
 *
 * **The split** (decision D31): everything here that is about *the interface*
 * runs against mocked API responses, because a UI test should fail when the UI
 * is wrong and for no other reason. Latency against a shared free-tier
 * database is not a property of the interface, and letting it decide the
 * result produces a suite that fails at random and therefore gets ignored.
 *
 * Exactly one test talks to the real database — the full happy path, so the
 * wiring between island, endpoint and Postgres is genuinely exercised. The
 * rest of that wiring is covered by the 13 integration tests in
 * tests/integration, which call the handlers directly.
 *
 * Every run writes `is_qa` rows (D18), so nothing reaches the readout.
 */

const unique = () => `e2e-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

const FAKE_USER = {
	id: '11111111-2222-4333-8444-555555555555',
	firstName: 'Ana',
	status: 'in_progress',
	lastStep: 1,
	variant: 'money',
	createdAt: '2026-09-18T00:00:00.000Z',
};

function jsonRoute(route: Route, status: number, body: unknown) {
	return route.fulfill({
		status,
		contentType: 'application/json',
		body: JSON.stringify(body),
	});
}

/** Intercepts both endpoints; `onPatch` is the only thing tests need to vary. */
async function mockApi(
	page: Page,
	options: {
		failFirstPost?: boolean;
		onPatch?: (route: Route, body: Record<string, unknown>) => Promise<void>;
	} = {},
) {
	let postCount = 0;

	await page.route('**/api/users', async (route) => {
		if (route.request().method() !== 'POST') return route.continue();
		postCount += 1;
		if (options.failFirstPost && postCount === 1) return route.abort('failed');
		return jsonRoute(route, 201, { user: FAKE_USER });
	});

	await page.route('**/api/users/*', async (route) => {
		if (route.request().method() !== 'PATCH') return route.continue();
		const body = JSON.parse(route.request().postData() ?? '{}') as Record<
			string,
			unknown
		>;
		if (options.onPatch) return options.onPatch(route, body);
		return jsonRoute(route, 200, {
			user: {
				...FAKE_USER,
				status: body.email ? 'converted' : 'in_progress',
				lastStep: (body.lastStep as number) ?? 1,
			},
		});
	});
}

async function openQuiz(page: Page) {
	await page.goto('/?variant=money');
	await page.addStyleTag({ content: 'html { scroll-behavior: auto !important; }' });
	// `:visible` matters: at 390px the header CTA is deliberately hidden until
	// the hero scrolls past (D28), so `.first()` alone resolves to an element
	// that can never be clicked.
	await page.locator('a.cta--primary:visible').first().click();
	await expect(page.locator('.quiz')).toBeVisible();
	await expect(page.locator('.quiz__input')).toBeVisible();

	// Visible is not the same as interactive. Astro server-renders the island's
	// markup and only then hydrates it, so the input exists — and clicks on it
	// do nothing — until Preact has attached. `<astro-island>` carries an `ssr`
	// attribute that hydration removes, which is the only honest signal that
	// the component is live. Without this wait the suite fails at random, and
	// the failures move around depending on how fast the bundle arrives.
	await page.waitForFunction(() => {
		const island = document.querySelector('astro-island');
		return island !== null && !island.hasAttribute('ssr');
	});
}

async function answerAllChoices(page: Page) {
	for (const step of [2, 3, 4, 5]) {
		await expect(page.locator('.quiz__count')).toHaveText(`Step ${step} of 6`);
		// Re-queried each iteration and clicked rather than checked: choosing
		// advances the step immediately, so the element is replaced under us and
		// check()'s post-verification would race the re-render.
		const radio = page.locator('.quiz__option input[type=radio]').first();
		await expect(radio).toBeVisible();
		await radio.click();
		await expect(page.locator('.quiz__count')).toHaveText(`Step ${step + 1} of 6`);
	}
}

async function completeQuiz(page: Page, email: string, name = 'Ana') {
	await page.locator('.quiz__input').fill(name);
	await page.locator('.quiz__submit').click();
	await answerAllChoices(page);
	await expect(page.locator('.quiz__count')).toHaveText('Step 6 of 6');
	await page.locator('.quiz__input').fill(email);
	await page.locator('.quiz__submit').click();
}

test.describe('against the real database', () => {
	test('walks the whole path and stores the signup', async ({ page }) => {
		// The one test that exercises island -> endpoint -> Postgres for real.
		await openQuiz(page);
		await completeQuiz(page, `${unique()}@example.com`);

		const result = page.locator('.quiz--result');
		await expect(result).toBeVisible();
		await expect(result.locator('.quiz__heading')).toHaveText(
			"Ana's risk-free practice plan",
		);
		await expect(result.locator('.result__row')).toHaveCount(5);
		await expect(result).toContainText('Open FX Replay');
	});
});

test.describe('the interface', () => {
	test.beforeEach(async ({ page }) => {
		await mockApi(page);
	});

	test('renders the plan from the answers given', async ({ page }) => {
		await openQuiz(page);
		await completeQuiz(page, 'ui@example.com');

		const result = page.locator('.quiz--result');
		await expect(result).toBeVisible();
		// First option of every choice step: forex, just_starting, lt_2, validate.
		await expect(result).toContainText('2 × 45 min');
		await expect(result).toContainText('After 8 sessions, review your stats');
		await expect(result).toContainText('London–New York overlap');
	});

	test('sends no email or name to the dataLayer', async ({ page }) => {
		await openQuiz(page);
		await completeQuiz(page, 'private@example.com', 'Ana');
		await expect(page.locator('.quiz--result')).toBeVisible();

		const layer = await page.evaluate(() => JSON.stringify(window.dataLayer ?? []));
		expect(layer).not.toContain('private@example.com');
		expect(layer).not.toContain('@example.com');
		expect(layer).not.toContain('Ana');
	});

	test('fires the documented events in order', async ({ page }) => {
		await openQuiz(page);
		await completeQuiz(page, 'events@example.com');
		await expect(page.locator('.quiz--result')).toBeVisible();

		const events = await page.evaluate(() =>
			(window.dataLayer ?? []).map((e) => e.event as string),
		);

		expect(events).toContain('cta_click');
		expect(events).toContain('quiz_start');
		expect(events.filter((e) => e === 'quiz_step_complete')).toHaveLength(6);
		expect(events.indexOf('signup_submit')).toBeLessThan(
			events.indexOf('plan_view'),
		);

		// Every event carries the arm, or the readout cannot be split by it.
		const withoutVariant = await page.evaluate(
			() => (window.dataLayer ?? []).filter((e) => !e.variant).length,
		);
		expect(withoutVariant).toBe(0);
	});

	test('completes a choice step with the keyboard alone', async ({ page }) => {
		await openQuiz(page);
		await page.locator('.quiz__input').fill('Ana');
		await page.keyboard.press('Enter');
		await expect(page.locator('.quiz__count')).toHaveText('Step 2 of 6');

		// Focus lands on the step heading, so a screen reader reads the question
		// instead of leaving the user wherever the previous step was.
		//
		// toBeFocused() and not a one-shot evaluate: the step count updates when
		// the DOM commits and the focus effect runs just after, so reading
		// activeElement once races a gap of a few milliseconds. The matcher
		// retries; the evaluate reported `body` roughly one run in three.
		await expect(page.locator('.quiz__heading')).toBeFocused();

		await page.keyboard.press('Tab');
		await page.keyboard.press('Space');
		await expect(page.locator('.quiz__count')).toHaveText('Step 3 of 6');
	});

	test('goes back without losing the answer', async ({ page }) => {
		await openQuiz(page);
		await page.locator('.quiz__input').fill('Ana');
		await page.locator('.quiz__submit').click();
		await expect(page.locator('.quiz__count')).toHaveText('Step 2 of 6');

		await page.locator('.quiz__back').click();
		await expect(page.locator('.quiz__count')).toHaveText('Step 1 of 6');
		await expect(page.locator('.quiz__input')).toHaveValue('Ana');

		const backs = await page.evaluate(
			() =>
				(window.dataLayer ?? []).filter((e) => e.event === 'quiz_step_back').length,
		);
		expect(backs).toBeGreaterThan(0);
	});

	test('restores an interrupted session on reload', async ({ page }) => {
		await openQuiz(page);
		await page.locator('.quiz__input').fill('Ana');
		await page.locator('.quiz__submit').click();
		await answerAllChoices(page);
		await expect(page.locator('.quiz__count')).toHaveText('Step 6 of 6');

		await page.reload();
		await page.locator('a.cta--primary:visible').first().click();
		await page.waitForFunction(() => {
			const island = document.querySelector('astro-island');
			return island !== null && !island.hasAttribute('ssr');
		});

		// Back where they were, not back at the beginning.
		await expect(page.locator('.quiz__count')).toHaveText('Step 6 of 6');
	});
});

test.describe('errors', () => {
	test('shows validation errors and ties them to the input', async ({ page }) => {
		await mockApi(page);
		await openQuiz(page);

		await page.locator('.quiz__submit').click();
		const error = page.locator('.quiz__error');
		await expect(error).toHaveText('Enter your first name.');
		await expect(error).toHaveAttribute('role', 'alert');

		const input = page.locator('.quiz__input');
		await expect(input).toHaveAttribute('aria-invalid', 'true');
		expect(await input.getAttribute('aria-describedby')).toBe(
			await error.getAttribute('id'),
		);

		// Typing clears it rather than leaving a stale complaint on screen.
		await input.fill('A');
		await expect(error).toHaveCount(0);
	});

	test('rejects a malformed email at step 6', async ({ page }) => {
		await mockApi(page);
		await openQuiz(page);
		await page.locator('.quiz__input').fill('Ana');
		await page.locator('.quiz__submit').click();
		await answerAllChoices(page);

		await page.locator('.quiz__input').fill('not-an-email');
		await page.locator('.quiz__submit').click();

		await expect(page.locator('.quiz__error')).toHaveText(
			'Enter a valid email address.',
		);
		// Still on step 6: a bad email never advances.
		await expect(page.locator('.quiz__count')).toHaveText('Step 6 of 6');
	});

	test('offers a retry when the network fails, and recovers', async ({ page }) => {
		// The first POST is aborted; the retry is allowed through.
		await mockApi(page, { failFirstPost: true });
		await openQuiz(page);

		await page.locator('.quiz__input').fill('Ana');
		await page.locator('.quiz__submit').click();

		const alert = page.locator('.quiz__alert');
		await expect(alert).toBeVisible();
		await expect(alert).toContainText('Check your connection');
		await expect(alert).toHaveAttribute('role', 'alert');

		// The answer survives the failure: retry resends it, no retyping.
		await page.locator('.quiz__retry').click();
		await expect(page.locator('.quiz__count')).toHaveText('Step 2 of 6');

		const networkErrors = await page.evaluate(
			() =>
				(window.dataLayer ?? []).filter(
					(e) => e.event === 'quiz_error' && e.error_code === 'network',
				).length,
		);
		expect(networkErrors).toBeGreaterThan(0);
	});

	test('separates a server failure from a network failure', async ({ page }) => {
		// Same visible shape, different message and different error_code: the
		// funnel cannot read "we broke" and "you are offline" as one number.
		await mockApi(page, {
			onPatch: (route) =>
				jsonRoute(route, 500, {
					error: { code: 'internal_error', message: 'Something went wrong.' },
				}),
		});
		await openQuiz(page);
		await completeQuiz(page, 'server-error@example.com');

		await expect(page.locator('.quiz__alert')).toContainText('on our side');

		const codes = await page.evaluate(() =>
			(window.dataLayer ?? [])
				.filter((e) => e.event === 'quiz_error')
				.map((e) => e.error_code as string),
		);
		expect(codes).toContain('server');
		expect(codes).not.toContain('network');
	});

	test('shows the plan anyway when the email already has an account', async ({
		page,
	}) => {
		await mockApi(page, {
			onPatch: (route, body) =>
				body.email
					? jsonRoute(route, 409, {
							error: {
								code: 'email_taken',
								message:
									'You already have an FX Replay account with this email.',
							},
						})
					: jsonRoute(route, 200, { user: FAKE_USER }),
		});

		await openQuiz(page);
		await completeQuiz(page, 'taken@example.com');

		const result = page.locator('.quiz--result');
		await expect(result).toBeVisible();
		await expect(result.locator('.quiz__notice')).toContainText(
			'You already have an FX Replay account',
		);
		await expect(result.locator('.quiz__notice')).toContainText('Log in');
		// The plan is still there: they came for it and they get it.
		await expect(result.locator('.result__row')).toHaveCount(5);

		const events = await page.evaluate(() =>
			(window.dataLayer ?? []).map((e) => e.event as string),
		);
		expect(events).toContain('signup_email_exists');

		// A 409 is not a conversion, and plan_view has to say so or the funnel
		// counts "already a customer" as a signup.
		const converted = await page.evaluate(
			() =>
				(window.dataLayer ?? []).find((e) => e.event === 'plan_view')?.converted,
		);
		expect(converted).toBe(false);
	});
});
