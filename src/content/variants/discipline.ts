import type { VariantCopy } from './types';

export const discipline: VariantCopy = {
	id: "discipline",
	pain: "My strategy isn't the problem, my discipline is",

	hero: {
		headline: "Train discipline like a skill.",
		subheadline:
			"Rehearse your rules on real historical markets until following them is automatic. Get a practice plan built around the habits you want to fix.",
	},

	problem: {
		title: "You know the rules. Following them is the hard part.",
		body: "You have a plan, then one loss turns into a revenge trade, and a good week turns into a blown one. It's not a knowledge problem; it's a reps problem. Discipline gets built the same way as any skill: practice, feedback, repeat.",
	},

	quizIntro: "Let's build your discipline training plan.",
	emailHeadline: "Your training plan is ready. Where should we save it?",

	result: {
		title: "{name}'s discipline training plan",
		previewTitle: "Discipline training plan",
		lead: "Each session below trains one habit until it sticks.",
	},

	quizHelpers: {
		market: "We'll use markets where your habits show up.",
		experience: "So we target the right habits.",
		weeklyHours: "Short, focused sessions beat long, sloppy ones.",
	},
};
