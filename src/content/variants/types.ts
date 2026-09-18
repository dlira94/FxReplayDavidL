import type { VariantId } from '../../lib/variants';

/**
 * Every [variant] copy slot in docs/messaging.md, and nothing else.
 *
 * Shared copy (primary CTA label, question text, FAQ, consent line) is
 * deliberately absent: the experiment is copy-only and those slots must be
 * identical across arms, so there is no place here to accidentally differ.
 */
export interface VariantCopy {
	id: VariantId;
	/** The pain this arm frames the product around. One sentence, for review. */
	pain: string;

	hero: {
		/** ≤ 8 words. May not promise profit, win rate or income. */
		headline: string;
		subheadline: string;
	};

	problem: {
		title: string;
		/** external → internal → philosophical, in three sentences. */
		body: string;
	};

	/** ≤ 8 words, frames the quiz as building something for them. */
	quizIntro: string;

	/** Headline above the email step. */
	emailHeadline: string;

	result: {
		/** Uses {name}. */
		title: string;
		/**
		 * The same plan, titled for the preview on the landing — where nobody
		 * has given a name yet. Declared rather than derived from `title`:
		 * stripping "{name}'s " would be string surgery on approved copy, and
		 * it would leave the first word lowercased.
		 */
		previewTitle: string;
		/** May use {hours}, rendered as the range label. */
		lead: string;
	};

	/**
	 * One-line helper under quiz questions 2–4. Questions 1, 5 and 6 have no
	 * [variant] helper in messaging.md, so they are not representable here.
	 */
	quizHelpers: {
		market: string;
		experience: string;
		weeklyHours: string;
	};
}
