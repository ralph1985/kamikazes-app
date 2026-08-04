CREATE TABLE "budget_transactions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"edition_id" uuid NOT NULL,
	"member_id" uuid NOT NULL,
	"kind" text NOT NULL,
	"amount" numeric(12, 2) NOT NULL,
	"occurred_at" timestamp with time zone NOT NULL,
	"method" text NOT NULL,
	"notes" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "budget_transactions_kind_allowed" CHECK ("budget_transactions"."kind" in ('payment', 'refund')),
	CONSTRAINT "budget_transactions_method_allowed" CHECK ("budget_transactions"."method" in ('cash', 'bizum', 'transfer')),
	CONSTRAINT "budget_transactions_amount_sign" CHECK (("budget_transactions"."kind" = 'payment' and "budget_transactions"."amount" >= 0) or ("budget_transactions"."kind" = 'refund' and "budget_transactions"."amount" <= 0))
);
--> statement-breakpoint
ALTER TABLE "budget_transactions" ADD CONSTRAINT "budget_transactions_edition_id_editions_id_fk" FOREIGN KEY ("edition_id") REFERENCES "public"."editions"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "budget_transactions" ADD CONSTRAINT "budget_transactions_member_id_members_id_fk" FOREIGN KEY ("member_id") REFERENCES "public"."members"("id") ON DELETE restrict ON UPDATE no action;