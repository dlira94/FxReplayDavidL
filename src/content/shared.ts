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

	/**
	 * Written examples, not quotes from real people — every card says so on its
	 * face (decisions.md D27). In production this section is fed from real
	 * Trustpilot reviews; invented testimonials are never published.
	 */
	testimonials: [
		{
			attribution: 'Part-time trader, 2 years in',
			quote:
				'I was getting four trades a week around my job. Now I get four hundred, and I can tell which setup actually works.',
		},
		{
			attribution: 'Prop challenge candidate',
			quote:
				'I blew two evaluations on the same mistake. Replaying it fifty times was cheaper than a third attempt.',
		},
		{
			attribution: 'Beginner, six months in',
			quote:
				'I stopped guessing whether my strategy was bad or I was. The journal answered it in a week.',
		},
	],

	/** The label every testimonial card carries, visibly. */
	testimonialLabel: 'Sample testimonial',

	/**
	 * Three figures, each pinned to a source in research.md §1. A number with no
	 * source does not go on this bar — that is the whole rule, and it is why the
	 * other two columns of the old strip were capability labels rather than
	 * invented metrics.
	 */
	socialProof: [
		{
			figure: '1M+',
			countTo: 1_000_000,
			compact: true,
			suffix: '+',
			title: 'traders',
			body: 'Already practising on FX Replay.',
		},
		{
			figure: '600+',
			countTo: 600,
			compact: false,
			suffix: '+',
			title: 'reviews on Trustpilot',
			body: 'Public, and you can read every one.',
		},
		{
			// No counter: counting from zero to zero is theatre, and this is the
			// one figure that is a product fact rather than a metric.
			figure: '$0',
			countTo: null,
			compact: false,
			suffix: '',
			title: 'real money at risk',
			body: 'Historical data, simulated orders, every session.',
		},
	],

	/**
	 * The hero visual is shared across arms, so it speaks to all three pains at
	 * once: one indicator each for money, time and discipline. A visual that
	 * only answered the variant's pain would make the image part of the
	 * experiment, and the experiment is copy-only.
	 */
	heroIndicators: [
		{ pain: 'money', label: '$0 at risk' },
		{ pain: 'time', label: '3 months replayed in 2 hours' },
		{ pain: 'discipline', label: 'Rules followed: 47/50' },
	],

	consentLine:
		"By continuing you'll create a free FX Replay account. No credit card. We won't share your email.",

	/** The result screen's own actions. Both simulated — see brief.md. */
	result: {
		openApp: 'Open FX Replay',
		emailExistsHeading:
			'You already have an FX Replay account with this email.',
		logIn: 'Log in',
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
 * "Where to practice", one line per answer to quiz question 2.
 *
 * Shared across arms: the plan logic is identical between variants and only
 * the framing differs, so these lines are a constant of the experiment
 * (docs/experiment.md). Block 3's plan.ts consumes this map; the preview uses
 * the forex line.
 */
export const WHERE_TO_PRACTICE = {
	forex: 'EUR/USD and GBP/USD, during the London–New York overlap',
	futures:
		'ES and NQ at the New York open (futures data requires a paid plan; practice the same setup on an index meanwhile)',
	crypto: 'BTC/USD and ETH/USD; the market runs 24/7, so weekends count too',
	other: "Your market's main index, at its opening session",
} as const;

/**
 * The static example shown in the plan-preview section.
 *
 * Every value is taken from the plan rules in docs/experience.md §4 for one
 * concrete profile — 2–5 h a week, under a year trading, validating a strategy
 * — so the preview shows the real output of the real rules rather than an
 * idealised mock-up.
 *
 * The profile trades forex, so the "where to practice" row shows that line.
 */
export const SAMPLE_PLAN = {
	/** Shown as a caption so nobody reads the sample as their own result. */
	caption: 'Sample plan · Forex · 2–5 h a week · under a year trading',
	rows: [
		{ label: 'Weekly routine', value: '3 × 60 min' },
		{
			label: 'Starting focus',
			value: 'one setup, log every trade, review weekly',
		},
		{ label: 'Where to practice', value: WHERE_TO_PRACTICE.forex },
		{
			label: 'Tools to use in FX Replay',
			value: 'journal + performance analytics',
		},
		{ label: 'Milestone', value: 'After 12 sessions, review your stats' },
	],
} as const;
