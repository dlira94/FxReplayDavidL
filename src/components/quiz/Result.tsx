import { useEffect, useRef } from 'react';

import { SHARED_COPY } from '../../content/shared';
import { track } from '../../lib/analytics/track';
import type { PracticePlan } from '../../lib/plan';

interface Props {
	plan: PracticePlan;
	/** True when the email already belonged to a converted account (409). */
	emailExists: boolean;
}

export function Result({ plan, emailExists }: Props) {
	const headingRef = useRef<HTMLHeadingElement>(null);

	useEffect(() => {
		headingRef.current?.focus();
		// `converted: false` after a 409 — they have an account, but this visit
		// did not create one, and the funnel must be able to tell them apart.
		track('plan_view', { converted: !emailExists });
	}, [emailExists]);

	return (
		<div class="quiz quiz--result">
			<p class="visually-hidden" role="status" aria-live="polite">
				Your practice plan is ready.
			</p>

			{emailExists && (
				<div class="quiz__notice" role="status">
					<p>{SHARED_COPY.result.emailExistsHeading}</p>
					<a href="#log-in" class="quiz__link">
						{SHARED_COPY.result.logIn}
					</a>
				</div>
			)}

			<h2 class="quiz__heading" tabIndex={-1} ref={headingRef}>
				{plan.title}
			</h2>
			<p class="quiz__lead">{plan.lead}</p>

			<dl class="result__rows">
				{plan.rows.map((row) => (
					<div class="result__row" key={row.label}>
						<dt class="result__label">{row.label}</dt>
						<dd class="result__value">{row.value}</dd>
					</div>
				))}
			</dl>

			<a
				class="quiz__submit quiz__submit--link"
				href="#open-app"
				onClick={() => track('open_app_click')}
			>
				{SHARED_COPY.result.openApp}
			</a>
			<p class="quiz__consent">{SHARED_COPY.trustLine}</p>
		</div>
	);
}
