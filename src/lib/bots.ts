/**
 * User-agent bot heuristic.
 *
 * Bots are recorded, never blocked (decision D18): they are flagged at write
 * time and dropped from the readout. A false positive costs one row of sample,
 * a false negative costs a little noise — neither is worth blocking a real
 * visitor over, so this stays deliberately simple and errs toward flagging
 * obvious automation only.
 *
 * This is not bot *protection*. Abuse of the signup endpoint is handled
 * separately (honeypot, rate limiting — see docs/api.md).
 */

const BOT_PATTERNS = [
	'bot',
	'crawler',
	'spider',
	'crawling',
	'headless',
	'playwright',
	'puppeteer',
	'selenium',
	'phantomjs',
	'lighthouse',
	'pagespeed',
	'gtmetrix',
	'curl/',
	'wget',
	'python-requests',
	'axios/',
	'go-http-client',
	'java/',
	'okhttp',
	'postman',
	'preview',
	'monitoring',
	'uptime',
	'pingdom',
	'facebookexternalhit',
	'slackbot',
	'whatsapp',
	'telegrambot',
	'discordbot',
	'embedly',
	'quora link preview',
	'vercelbot',
	'vercel-screenshot',
	'vercel-favicon',
];

export function isBot(userAgent: string | null | undefined): boolean {
	if (!userAgent) {
		// A browser always sends one. No UA is either automation or something
		// stripping headers; neither is a visitor we want in the sample.
		return true;
	}

	const ua = userAgent.toLowerCase();
	return BOT_PATTERNS.some((pattern) => ua.includes(pattern));
}
