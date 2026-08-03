ALTER TABLE "budget_participants" DISABLE ROW LEVEL SECURITY;--> statement-breakpoint
DROP TABLE "budget_participants" CASCADE;--> statement-breakpoint
ALTER TABLE "edition_participants" ADD COLUMN "rate_id" uuid;--> statement-breakpoint
ALTER TABLE "edition_participants" ADD CONSTRAINT "edition_participants_rate_id_budget_rates_id_fk" FOREIGN KEY ("rate_id") REFERENCES "public"."budget_rates"("id") ON DELETE restrict ON UPDATE no action;