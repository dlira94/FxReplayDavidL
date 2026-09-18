import { sql } from 'drizzle-orm';
import {
	boolean,
	index,
	pgTable,
	smallint,
	text,
	timestamp,
	uniqueIndex,
	uuid,
} from 'drizzle-orm/pg-core';

import type { VariantId } from '../variants';

/** Signup status. `email_exists` keeps "already a customer" out of the step-6 abandons. */
export type UserStatus = 'in_progress' | 'converted' | 'email_exists';

/**
 * The denominator of the experiment (decision D17).
 *
 * Written by the middleware on `/` only — there is no endpoint, so nothing the
 * client sends can create a row. `anonymous_id` is the primary key, which is what
 * makes the insert idempotent: a returning visitor never switches arms and never
 * inflates the count.
 */
export const exposures = pgTable(
	'exposures',
	{
		anonymousId: text('anonymous_id').primaryKey(),
		variant: text('variant').$type<VariantId>().notNull(),
		isQa: boolean('is_qa').notNull().default(false),
		isBot: boolean('is_bot').notNull().default(false),
		utmSource: text('utm_source'),
		utmMedium: text('utm_medium'),
		utmCampaign: text('utm_campaign'),
		utmContent: text('utm_content'),
		utmTerm: text('utm_term'),
		landingPath: text('landing_path').notNull(),
		createdAt: timestamp('created_at', { withTimezone: true })
			.notNull()
			.defaultNow(),
	},
	(table) => [
		// Every readout groups by variant after dropping QA and bot rows.
		index('exposures_variant_idx').on(table.variant, table.isQa, table.isBot),
		index('exposures_created_at_idx').on(table.createdAt),
	],
);

/** One row per signup, created at quiz step 1 and converted at step 6. */
export const users = pgTable(
	'users',
	{
		id: uuid('id').primaryKey().defaultRandom(),
		anonymousId: text('anonymous_id').notNull(),
		firstName: text('first_name'),
		email: text('email'),
		market: text('market'),
		experience: text('experience'),
		weeklyHours: text('weekly_hours'),
		goal: text('goal'),
		variant: text('variant').$type<VariantId>().notNull(),
		status: text('status').$type<UserStatus>().notNull().default('in_progress'),
		lastStep: smallint('last_step').notNull().default(1),
		utmSource: text('utm_source'),
		utmMedium: text('utm_medium'),
		utmCampaign: text('utm_campaign'),
		utmContent: text('utm_content'),
		utmTerm: text('utm_term'),
		landingPath: text('landing_path').notNull(),
		isQa: boolean('is_qa').notNull().default(false),
		isBot: boolean('is_bot').notNull().default(false),
		/**
		 * GA4 identity, read from the `_ga` / `_ga_*` cookies in the browser.
		 * Nullable on purpose: GTM loads deferred, so a fast visitor can reach
		 * step 1 before the cookies exist. A later PATCH fills them in.
		 */
		gaClientId: text('ga_client_id'),
		gaSessionId: text('ga_session_id'),
		/**
		 * Stamped when the server-side `account_created` is accepted by GA4.
		 * The status transition already happens once, but this makes "exactly
		 * once" a fact in the database rather than a property of control flow.
		 */
		accountCreatedSentAt: timestamp('account_created_sent_at', {
			withTimezone: true,
		}),
		editTokenHash: text('edit_token_hash').notNull(),
		createdAt: timestamp('created_at', { withTimezone: true })
			.notNull()
			.defaultNow(),
		updatedAt: timestamp('updated_at', { withTimezone: true })
			.notNull()
			.defaultNow(),
		convertedAt: timestamp('converted_at', { withTimezone: true }),
	},
	(table) => [
		index('users_anonymous_id_idx').on(table.anonymousId),
		// Uniqueness is the database's job, not the app's: two concurrent
		// conversions with the same email must not both win.
		uniqueIndex('users_email_unique')
			.on(table.email)
			.where(sql`${table.email} is not null`),
		index('users_variant_idx').on(table.variant, table.isQa, table.isBot),
		index('users_status_idx').on(table.status),
	],
);

export type Exposure = typeof exposures.$inferSelect;
export type NewExposure = typeof exposures.$inferInsert;
export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;
