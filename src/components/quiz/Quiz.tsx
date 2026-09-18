import { useCallback, useEffect, useRef, useState } from 'react';

import { SHARED_COPY } from '../../content/shared';
import type { VariantCopy } from '../../content/variants';
import { readGaIdentity } from '../../lib/analytics/ga-cookies';
import { track } from '../../lib/analytics/track';
import { initAnalytics } from '../../lib/analytics/track';
import type { CtaLocation } from '../../lib/analytics/events';
import { buildPlan } from '../../lib/plan';
import { createUser, updateUser, type ApiFailure } from '../../lib/quiz-client';
import {
	emailSchema,
	firstNameSchema,
	quizAnswersSchema,
	type QuizAnswers,
} from '../../lib/schemas';
import type { VariantId } from '../../lib/variants';
import { Result } from './Result';
import { FIELD_FOR_STEP, STEPS, TOTAL_STEPS } from './steps';
import './quiz.css';

const STORAGE_KEY = 'fxr_quiz';

interface Props {
	variant: VariantId;
	copy: VariantCopy;
	isQa: boolean;
	anonymousId: string;
	utm: Record<string, string | null>;
}

type Answers = Partial<Record<string, string>>;

interface Saved {
	step: number;
	answers: Answers;
	userId: string | null;
}

/** sessionStorage can throw (private mode, blocked storage); never fatal. */
function readSaved(): Saved | null {
	try {
		const raw = sessionStorage.getItem(STORAGE_KEY);
		return raw ? (JSON.parse(raw) as Saved) : null;
	} catch {
		return null;
	}
}

/**
 * The email never goes to sessionStorage.
 *
 * The name does, because the result title is "{name}'s practice plan" and
 * losing it would mean showing a plan addressed to nobody. The address buys
 * nothing on restore: a visitor who reloads at step 6 is looking at the email
 * field and can retype it, so storing it would be keeping a piece of personal
 * data for no benefit at all (D33).
 */
function persistable(answers: Answers): Answers {
	const { email: _email, ...rest } = answers;
	return rest;
}

function writeSaved(saved: Saved): void {
	try {
		sessionStorage.setItem(
			STORAGE_KEY,
			JSON.stringify({ ...saved, answers: persistable(saved.answers) }),
		);
	} catch {
		/* A visitor who blocks storage still gets a working quiz. */
	}
}

/** Cleared the moment the quiz is done: the record lives in Postgres now. */
function clearSaved(): void {
	try {
		sessionStorage.removeItem(STORAGE_KEY);
	} catch {
		/* Nothing to do; the data is gone with the tab either way. */
	}
}

export default function Quiz({
	variant,
	copy,
	isQa,
	anonymousId,
	utm,
}: Props) {
	const [step, setStep] = useState(1);
	const [answers, setAnswers] = useState<Answers>({});
	const [userId, setUserId] = useState<string | null>(null);
	const [pending, setPending] = useState(false);
	const [fieldError, setFieldError] = useState<string | null>(null);
	const [failure, setFailure] = useState<ApiFailure | null>(null);
	const [emailExists, setEmailExists] = useState(false);
	const [done, setDone] = useState(false);

	const headingRef = useRef<HTMLHeadingElement>(null);
	const inputRef = useRef<HTMLInputElement>(null);
	const restored = useRef(false);
	/** quiz_start fires once per session, on intent — never on visibility. */
	const startedQuiz = useRef(false);
	/** True when the pending selection came from a pointer, not an arrow key. */
	const pointerSelect = useRef(false);
	/**
	 * The step effect focuses the input itself, and a focus we caused is not
	 * intent. Without this flag `quiz_start` fired the moment the island
	 * hydrated — the exact bug this change exists to fix, reintroduced one
	 * line lower.
	 */
	const programmaticFocus = useRef(false);
	/** Steps 2-5 save in the background; a failure is retried, not shown. */
	const backlog = useRef<Record<string, unknown>>({});

	const definition = STEPS[step - 1]!;

	useEffect(() => {
		initAnalytics({
			variant,
			isQa,
			pagePath: window.location.pathname,
			utm,
		});
	}, [variant, isQa, utm]);

	// Restore an interrupted session once, before the first paint of step 1.
	useEffect(() => {
		if (restored.current) return;
		restored.current = true;
		const saved = readSaved();
		if (saved && saved.step > 1) {
			setAnswers(saved.answers);
			setUserId(saved.userId);
			setStep(Math.min(saved.step, TOTAL_STEPS));
		}
	}, []);

	useEffect(() => {
		// `done` guards it: recording the email changes `answers`, which would
		// otherwise re-run this effect straight after clearSaved() and write the
		// state back for a quiz that has already finished.
		if (!restored.current || done) return;
		writeSaved({ step, answers, userId });
	}, [step, answers, userId, done]);

	// Focus the new step's heading so a screen reader announces it and a
	// keyboard user lands inside the step rather than back at the top.
	useEffect(() => {
		if (done) return;
		headingRef.current?.focus();
		if (definition.kind !== 'choice') {
			// A text or email step: put the cursor where the work is.
			window.setTimeout(() => {
				programmaticFocus.current = true;
				inputRef.current?.focus();
				// Cleared after the focus event has been dispatched.
				window.setTimeout(() => {
					programmaticFocus.current = false;
				}, 0);
			}, 60);
		}
	}, [step, done, definition.kind]);

	/**
	 * `quiz_start` means someone decided to start, not that the section
	 * scrolled past. The quiz is inline, so firing on mount counted every
	 * visitor who reached the bottom of the page and inflated the start rate —
	 * caught in Tag Assistant, where quiz_start arrived *before* cta_click
	 * with a scroll in between (D42).
	 *
	 * Intent is a CTA click, or the first focus or keystroke in the name
	 * field, whichever comes first. Once per session, so a Back-and-forward
	 * walk does not count twice.
	 */
	const markQuizStart = useCallback((entry?: CtaLocation) => {
		if (startedQuiz.current) return;
		try {
			if (sessionStorage.getItem('fxr_quiz_started')) {
				startedQuiz.current = true;
				return;
			}
			sessionStorage.setItem('fxr_quiz_started', '1');
		} catch {
			/* Storage blocked: the ref still guards this page view. */
		}
		startedQuiz.current = true;
		track('quiz_start', {
			entry_cta_location:
				entry ??
				(document.body.dataset.quizEntry as CtaLocation | undefined) ??
				'hero',
		});
	}, []);

	useEffect(() => {
		const onCtaClick = (event: Event) => {
			const target = event.target as HTMLElement | null;
			const cta = target?.closest?.('[data-cta-location]') as HTMLElement | null;
			if (!cta) return;
			const where = cta.dataset.ctaLocation as CtaLocation | undefined;
			// The transitional CTA scrolls to the plan preview, not the quiz.
			if (cta.getAttribute('href') !== '#plan') return;
			markQuizStart(where);
		};
		document.addEventListener('click', onCtaClick);
		return () => document.removeEventListener('click', onCtaClick);
	}, [markQuizStart]);

	const flushBacklog = useCallback(
		async (id: string) => {
			const payload = backlog.current;
			if (!id || Object.keys(payload).length === 0) return;
			backlog.current = {};
			const result = await updateUser(id, payload);
			if (!result.ok) {
				// Put it back and try again with the next answer. Steps 2-5 are
				// non-blocking: the visitor keeps moving and nothing is lost,
				// because the final blocking step sends whatever is still owed.
				backlog.current = { ...payload, ...backlog.current };
			}
		},
		[],
	);

	const goTo = (next: number, answersNow: Answers = answers) => {
		setFieldError(null);
		setFailure(null);
		setStep(next);
		// Persisted here and not only in the effect below: useEffect is
		// deferred, so the new step paints before the effect that saves it runs.
		// A visitor who closes the tab in that window would come back one step
		// behind the one they were looking at.
		writeSaved({ step: next, answers: answersNow, userId });
	};

	const recordAnswer = (field: string, value: string) => {
		setAnswers((prev) => ({ ...prev, [field]: value }));
	};

	/** Step 1: blocking. Nothing else can happen until the user exists. */
	const submitName = async (value: string) => {
		const parsed = firstNameSchema.safeParse(value);
		if (!parsed.success) {
			setFieldError(parsed.error.issues[0]?.message ?? 'Enter your first name.');
			track('quiz_error', { step_number: 1, error_code: 'validation' });
			return;
		}

		recordAnswer('firstName', parsed.data);
		setPending(true);
		setFailure(null);

		const honeypot =
			(document.querySelector('[name="website"]') as HTMLInputElement | null)
				?.value ?? '';

		const result = await createUser({
			anonymousId,
			firstName: parsed.data,
			variant,
			landingPath: window.location.pathname,
			website: honeypot,
			// Both can be null here: GTM loads deferred, so a fast visitor
			// reaches this step before the _ga cookies exist. The server takes
			// null and the conversion PATCH fills them in (D34).
			...readGaIdentity(),
			...utm,
		});
		setPending(false);

		if (!result.ok) {
			setFailure(result.error);
			track('quiz_error', {
				step_number: 1,
				error_code: result.error.kind === 'network' ? 'network' : 'server',
			});
			return;
		}

		setUserId(result.data.user.id);
		track('quiz_step_complete', { step_number: 1, step_name: 'name' });
		// userId is not in state yet on this tick, so save it explicitly.
		writeSaved({ step: 2, answers: { ...answers, firstName: parsed.data }, userId: result.data.user.id });
		goTo(2, { ...answers, firstName: parsed.data });
	};

	/** Records a choice without advancing. Arrow keys land here and stop. */
	const selectChoice = (value: string) => {
		setFieldError(null);
		recordAnswer(FIELD_FOR_STEP[definition.name]!, value);
	};

	/** Steps 2-5: non-blocking. The answer is queued and the quiz moves on. */
	const submitChoice = (value: string) => {
		const field = FIELD_FOR_STEP[definition.name]!;
		recordAnswer(field, value);
		backlog.current = {
			...backlog.current,
			[field]: value,
			lastStep: step + 1,
		};
		if (userId) void flushBacklog(userId);

		track('quiz_step_complete', {
			step_number: step,
			step_name: definition.name,
			answer: value,
		});
		goTo(step + 1, { ...answers, [field]: value });
	};

	/** Step 6: blocking, and the conversion. */
	const submitEmail = async (value: string) => {
		const parsed = emailSchema.safeParse(value);
		if (!parsed.success) {
			setFieldError(
				parsed.error.issues[0]?.message ?? 'Enter a valid email address.',
			);
			track('quiz_error', { step_number: 6, error_code: 'validation' });
			return;
		}

		if (!userId) {
			setFailure({ kind: 'server' });
			return;
		}

		setPending(true);
		setFailure(null);
		track('signup_submit');

		// Anything steps 2-5 could not deliver goes with the conversion, so a
		// flaky connection mid-quiz cannot cost us the answers.
		// The conversion is the last chance to attach GA identity before the
		// server-side account_created needs it.
		const identity = readGaIdentity();
		const payload = {
			...backlog.current,
			...(identity.gaClientId ? { gaClientId: identity.gaClientId } : {}),
			...(identity.gaSessionId ? { gaSessionId: identity.gaSessionId } : {}),
			email: parsed.data,
			lastStep: 6,
		};
		backlog.current = {};

		const result = await updateUser(userId, payload);
		setPending(false);

		if (!result.ok) {
			if (result.error.kind === 'email_taken') {
				// Not a failure of the quiz: this person already has an account.
				// Show the plan anyway (experience.md §3).
				track('signup_email_exists');
				setEmailExists(true);
				clearSaved();
				setDone(true);
				return;
			}
			if (result.error.kind === 'validation') {
				setFieldError(
					result.error.fields.email ?? 'Enter a valid email address.',
				);
				track('quiz_error', { step_number: 6, error_code: 'validation' });
				return;
			}
			backlog.current = payload;
			setFailure(result.error);
			track('quiz_error', {
				step_number: 6,
				error_code: result.error.kind === 'network' ? 'network' : 'server',
			});
			return;
		}

		recordAnswer('email', parsed.data);
		track('quiz_step_complete', { step_number: 6, step_name: 'email' });
		// Nothing left to resume, and the signup is safely in Postgres.
		clearSaved();
		setDone(true);
	};

	const retry = () => {
		setFailure(null);
		if (step === 1) {
			void submitName(answers.firstName ?? '');
		} else if (step === 6) {
			void submitEmail(answers.email ?? '');
		}
	};

	const back = () => {
		if (step === 1 || pending) return;
		track('quiz_step_back', { from_step: step });
		goTo(step - 1);
	};

	if (done) {
		const parsed = quizAnswersSchema.safeParse(answers);
		if (parsed.success) {
			return (
				<Result
					plan={buildPlan(parsed.data as QuizAnswers, copy)}
					emailExists={emailExists}
				/>
			);
		}
		// Should not happen: every step is required to reach here. If it does,
		// the visitor still converted, so say so rather than showing a broken
		// plan built from missing answers.
		return (
			<div class="quiz quiz--done">
				<h2 class="quiz__heading" tabIndex={-1} ref={headingRef}>
					{copy.result.title.replace('{name}', answers.firstName ?? 'there')}
				</h2>
				<p>Your free account is ready.</p>
			</div>
		);
	}

	const errorId = `quiz-error-${step}`;
	const helperId = `quiz-helper-${step}`;
	const helper = definition.helper?.(copy);

	return (
		<div class="quiz">
			{/* Announced politely so a screen reader hears the step change
			    without interrupting whatever it is reading. */}
			<p class="visually-hidden" role="status" aria-live="polite">
				Step {step} of {TOTAL_STEPS}
			</p>

			<div class="quiz__progress" aria-hidden="true">
				<div class="quiz__bar">
					<span style={{ width: `${(step / TOTAL_STEPS) * 100}%` }} />
				</div>
				<p class="quiz__count">
					Step {step} of {TOTAL_STEPS}
				</p>
			</div>

			<h2 class="quiz__heading" tabIndex={-1} ref={headingRef}>
				{step === 1 ? copy.quizIntro : definition.question}
			</h2>

			{step === 1 && <p class="quiz__question">{definition.question}</p>}
			{step === 6 && <p class="quiz__question">{copy.emailHeadline}</p>}
			{helper && (
				<p class="quiz__helper" id={helperId}>
					{helper}
				</p>
			)}

			{definition.kind === 'choice' && definition.options && (
				<fieldset class="quiz__fieldset">
					<legend class="visually-hidden">{definition.question}</legend>
					<div class="quiz__options">
						{definition.options.map((option) => (
							<label class="quiz__option" key={option.value}>
								<input
									type="radio"
									name={definition.name}
									value={option.value}
									checked={
										answers[FIELD_FOR_STEP[definition.name]!] === option.value
									}
									// A pointer means "this one, go" — the one-tap
									// behaviour experience.md §2 asks for on mobile.
									// An arrow key means "let me look at this one",
									// and must not submit: moving through options
									// with the keyboard changing context on every
									// press is WCAG 3.2.2 (D41).
									onPointerDown={() => {
										pointerSelect.current = true;
									}}
									onChange={() => {
										const byPointer = pointerSelect.current;
										pointerSelect.current = false;
										if (byPointer) submitChoice(option.value);
										else selectChoice(option.value);
									}}
									onKeyDown={(event: KeyboardEvent) => {
										if (event.key === 'Enter') {
											event.preventDefault();
											submitChoice(option.value);
										}
									}}
									aria-describedby={helper ? helperId : undefined}
								/>
								<span>{option.label}</span>
							</label>
						))}
					</div>

					{/* Visible and always available: a keyboard user needs a way
					    to commit that is not "select an option", and a screen
					    reader user needs to know one exists. */}
					<button
						class="quiz__submit"
						type="button"
						onClick={() => {
							const chosen = answers[FIELD_FOR_STEP[definition.name]!];
							if (!chosen) {
								setFieldError('Choose an option to continue.');
								track('quiz_error', {
									step_number: step,
									error_code: 'validation',
								});
								return;
							}
							submitChoice(chosen);
						}}
					>
						Continue
					</button>
				</fieldset>
			)}

			{(definition.kind === 'text' || definition.kind === 'email') && (
				<form
					class="quiz__form"
					noValidate
					onSubmit={(event) => {
						event.preventDefault();
						const value = inputRef.current?.value ?? '';
						if (step === 1) void submitName(value);
						else void submitEmail(value);
					}}
				>
					<label class="quiz__label" for={`quiz-input-${step}`}>
						{step === 1 ? 'First name' : 'Email address'}
					</label>
					<input
						id={`quiz-input-${step}`}
						ref={inputRef}
						class="quiz__input"
						type={step === 1 ? 'text' : 'email'}
						name={step === 1 ? 'firstName' : 'email'}
						autocomplete={step === 1 ? 'given-name' : 'email'}
						defaultValue={
							answers[step === 1 ? 'firstName' : 'email'] ?? ''
						}
						aria-invalid={fieldError ? 'true' : undefined}
						aria-describedby={fieldError ? errorId : undefined}
						onFocus={() => {
							if (step === 1 && !programmaticFocus.current) markQuizStart();
						}}
						onInput={() => {
							if (step === 1) markQuizStart();
							if (fieldError) setFieldError(null);
						}}
						disabled={pending}
					/>

					{/* Honeypot: off-screen, not hidden from the accessibility tree
					    by display:none, and explicitly skipped by assistive tech. */}
					<div class="quiz__trap" aria-hidden="true">
						<label for="website">Website</label>
						<input id="website" name="website" type="text" tabIndex={-1} autocomplete="off" />
					</div>

					{step === 6 && <p class="quiz__consent">{SHARED_COPY.consentLine}</p>}

					<button class="quiz__submit" type="submit" disabled={pending} aria-busy={pending}>
						{pending ? 'Saving…' : step === 1 ? 'Continue' : SHARED_COPY.primaryCta}
					</button>
				</form>
			)}

			{fieldError && (
				<p class="quiz__error" id={errorId} role="alert">
					{fieldError}
				</p>
			)}

			{failure && (
				<div class="quiz__alert" role="alert">
					<p>
						{failure.kind === 'network'
							? "We couldn't save that. Check your connection and try again."
							: 'Something went wrong on our side. Your answers are safe.'}
					</p>
					<button type="button" class="quiz__retry" onClick={retry}>
						Try again
					</button>
				</div>
			)}

			{step > 1 && (
				<button type="button" class="quiz__back" onClick={back} disabled={pending}>
					Back
				</button>
			)}
		</div>
	);
}
