/**
 * Copy that is identical across every experiment arm.
 *
 * Mirrored verbatim from the `[shared]` blocks of docs/messaging.md. The same
 * rule as the variant copy applies and for the same reason: these strings are
 * the *constant* of the experiment, so an accidental edit here changes all
 * three arms at once and silently rewrites what is being compared.
 *
 * tests/unit/variant-copy.test.ts asserts every string below appears verbatim
 * in the doc.
 */
export const SHARED_COPY = {
	/**
	 * Identical across arms on purpose. A title or description that varied by
	 * variant would hand search engines whichever arm the crawler was assigned,
	 * and make the indexed page a coin flip.
	 */
	seo: {
		title: 'Try FX Replay Free — Practice trading on real historical markets',
		description:
			'Practice on real historical markets with no money at risk. Answer a few quick questions and get a personalized practice plan. Free forever plan, no credit card.',
	},

	/** Identical across arms on purpose: the test isolates the pain framing. */
	primaryCta: 'Build my free practice plan',
	transitionalCta: 'See a sample plan',
	trustLine: 'Free forever plan · No credit card',

	guide: {
		empathy: "We've been there: learning the hard way is expensive.",
		authority: [
			'Trusted by 1M+ traders',
			'replay real historical markets',
			'journal, analytics and AI mentor built in',
		],
	},

	planPreview: {
		title: "Here's what you'll get in 2 minutes",
	},

	steps: [
		'Answer a few quick questions',
		'Get your personalized practice plan',
		'Start practicing free',
	],

	outcome: {
		success:
			'Walk into the live market with reps, data and a routine behind every decision',
		failure: 'Learning with real money, guessing, repeating the same mistakes',
	},

	faq: [
		{
			question: 'Is it really free?',
			answer: "Yes. The free plan needs no credit card and doesn't expire.",
		},
		{
			question: 'Do I trade real money?',
			answer:
				'No. You practice on real historical market data; no money is involved.',
		},
		{
			question: 'What happens with my email?',
			answer:
				'It creates your free FX Replay account so your plan is saved. No spam.',
		},
		{
			question: "I'm a beginner. Is this for me?",
			answer: 'Yes. Your plan adapts to your experience level.',
		},
	],

	footerDisclaimer:
		'FX Replay is an educational practice tool. You practice on historical market data — no real money is involved. Trading live markets carries risk of loss.',
} as const;

/**
 * The static example shown in the plan-preview section.
 *
 * Every value is taken from the plan rules in docs/experience.md §4 for one
 * concrete profile — 2–5 h a week, under a year trading, validating a strategy
 * — so the preview shows the real output of the real rules rather than an
 * idealised mock-up.
 *
 * "Where to practice" is deliberately missing: §4 names it as a plan row but
 * does not define its option strings yet, and inventing instruments here would
 * put unsourced copy on the page. It joins the preview when block 3 defines it.
 */
export const SAMPLE_PLAN = {
	/** Shown as a caption so nobody reads the sample as their own result. */
	caption: 'Sample plan · 2–5 h a week · under a year trading',
	rows: [
		{ label: 'Weekly routine', value: '3 × 60 min' },
		{
			label: 'Starting focus',
			value: 'one setup, log every trade, review weekly',
		},
		{
			label: 'Tools to use in FX Replay',
			value: 'journal + performance analytics',
		},
		{ label: 'Milestone', value: 'After 12 sessions, review your stats' },
	],
} as const;
