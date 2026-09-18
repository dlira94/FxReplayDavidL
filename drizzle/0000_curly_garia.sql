CREATE TABLE "exposures" (
	"anonymous_id" text PRIMARY KEY NOT NULL,
	"variant" text NOT NULL,
	"is_qa" boolean DEFAULT false NOT NULL,
	"is_bot" boolean DEFAULT false NOT NULL,
	"utm_source" text,
	"utm_medium" text,
	"utm_campaign" text,
	"utm_content" text,
	"utm_term" text,
	"landing_path" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"anonymous_id" text NOT NULL,
	"first_name" text,
	"email" text,
	"market" text,
	"experience" text,
	"weekly_hours" text,
	"goal" text,
	"variant" text NOT NULL,
	"status" text DEFAULT 'in_progress' NOT NULL,
	"last_step" smallint DEFAULT 1 NOT NULL,
	"utm_source" text,
	"utm_medium" text,
	"utm_campaign" text,
	"utm_content" text,
	"utm_term" text,
	"landing_path" text NOT NULL,
	"is_qa" boolean DEFAULT false NOT NULL,
	"is_bot" boolean DEFAULT false NOT NULL,
	"edit_token_hash" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"converted_at" timestamp with time zone
);
--> statement-breakpoint
CREATE INDEX "exposures_variant_idx" ON "exposures" USING btree ("variant","is_qa","is_bot");--> statement-breakpoint
CREATE INDEX "exposures_created_at_idx" ON "exposures" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "users_anonymous_id_idx" ON "users" USING btree ("anonymous_id");--> statement-breakpoint
CREATE UNIQUE INDEX "users_email_unique" ON "users" USING btree ("email") WHERE "users"."email" is not null;--> statement-breakpoint
CREATE INDEX "users_variant_idx" ON "users" USING btree ("variant","is_qa","is_bot");--> statement-breakpoint
CREATE INDEX "users_status_idx" ON "users" USING btree ("status");