import { useCallback, useEffect, useRef, useState } from 'react';

import { SHARED_COPY } from '../../content/shared';
import type { VariantCopy } from '../../content/variants';
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

function writeSaved(saved: Saved): void {
	try {
		sessionStorage.setItem(STORAGE_KEY, JSON.stringify(saved));
	} catch {
		/* A visitor who blocks storage still gets a working quiz. */
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
	const [started, setStarted] = useState(false);

	const headingRef = useRef<HTMLHeadingElement>(null);
	const inputRef = useRef<HTMLInputElement>(null);
	const restored = useRef(false);
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
		if (restored.current) writeSaved({ step, answers, userId });
	}, [step, answers, userId]);

	// Focus the new step's heading so a screen reader announces it and a
	// keyboard user lands inside the step rather than back at the top.
	useEffect(() => {
		if (done) return;
		headingRef.current?.focus();
		if (definition.kind !== 'choice') {
			// A text or email step: put the cursor where the work is.
			window.setTimeout(() => inputRef.current?.focus(), 60);
		}
	}, [step, done, definition.kind]);

	useEffect(() => {
		if (!started) {
			setStarted(true);
			const entry =
				(document.body.dataset.quizEntry as CtaLocation | undefined) ?? 'hero';
			track('quiz_start', { entry_cta_location: entry });
		}
	}, [started]);

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
		const payload = { ...backlog.current, email: parsed.data, lastStep: 6 };
		backlog.current = {};

		const result = await updateUser(userId, payload);
		setPending(false);

		if (!result.ok) {
			if (result.error.kind === 'email_taken') {
				// Not a failure of the quiz: this person already has an account.
				// Show the plan anyway (experience.md §3).
				track('signup_email_exists');
				setEmailExists(true);
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
									onChange={() => submitChoice(option.value)}
									aria-describedby={helper ? helperId : undefined}
								/>
								<span>{option.label}</span>
							</label>
						))}
					</div>
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
						onInput={() => fieldError && setFieldError(null)}
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
