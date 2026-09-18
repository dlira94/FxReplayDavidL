ALTER TABLE "users" ADD COLUMN "ga_client_id" text;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "ga_session_id" text;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "account_created_sent_at" timestamp with time zone;