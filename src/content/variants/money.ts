import type { VariantCopy } from './types';

/** Control (decision D5): closest to FX Replay's current homepage messaging. */
export const money: VariantCopy = {
	id: "money",
	pain: "The market is an expensive classroom",

	hero: {
		headline: "Stop paying the market to learn.",
		subheadline:
			"Practice your strategy on real historical markets with zero money at risk. Get a practice plan built around how you trade.",
	},

	problem: {
		title: "Every live mistake has a price.",
		body: "Testing a new setup with real money turns every lesson into a loss. It makes each trade stressful, and it makes it impossible to tell a bad strategy from bad luck. You deserve a place to make mistakes for free.",
	},

	quizIntro: "Let's build your risk-free practice plan.",
	emailHeadline: "Your plan is ready. Where should we save it?",

	result: {
		title: "{name}'s risk-free practice plan",
		previewTitle: "Risk-free practice plan",
		lead: "Every rep below costs you nothing. Make your mistakes here, not in your account.",
	},

	quizHelpers: {
		market: "We'll load the markets you care about.",
		experience: "So your plan starts at the right level.",
		weeklyHours: "Even 2 hours adds up fast.",
	},
};
