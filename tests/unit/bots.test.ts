import { describe, expect, it } from 'vitest';

import { isBot } from '../../src/lib/bots';

const REAL_BROWSERS = [
	'Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Mobile/15E148 Safari/604.1',
	'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36',
	'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:127.0) Gecko/20100101 Firefox/127.0',
	'Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Mobile Safari/537.36',
];

const AUTOMATION = [
	'Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)',
	'Mozilla/5.0 (X11; Linux x86_64) HeadlessChrome/126.0.0.0 Safari/537.36',
	'curl/8.4.0',
	'python-requests/2.32.3',
	'facebookexternalhit/1.1',
	'Mozilla/5.0 (compatible; bingbot/2.0; +http://www.bing.com/bingbot.htm)',
];

describe('isBot', () => {
	it.each(REAL_BROWSERS)('lets a real browser through: %s', (ua) => {
		expect(isBot(ua)).toBe(false);
	});

	it.each(AUTOMATION)('flags automation: %s', (ua) => {
		expect(isBot(ua)).toBe(true);
	});

	it.each([null, undefined, ''])('flags a missing user-agent (%s)', (ua) => {
		// A browser always sends one. No UA is automation or a stripped header,
		// and neither belongs in the experiment sample.
		expect(isBot(ua)).toBe(true);
	});

	it('is case insensitive', () => {
		expect(isBot('CURL/8.4.0')).toBe(true);
	});
});
