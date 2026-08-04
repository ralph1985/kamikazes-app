CREATE TABLE "budget_balances" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"edition_id" uuid NOT NULL,
	"amount" numeric(12, 2) NOT NULL,
	"concept" text NOT NULL,
	"origin_year" integer,
	"origin_edition_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "budget_movements" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"edition_id" uuid NOT NULL,
	"kind" text NOT NULL,
	"amount" numeric(12, 2) NOT NULL,
	"is_planned" boolean DEFAULT false NOT NULL,
	"occurred_at" timestamp with time zone NOT NULL,
	"concept" text NOT NULL,
	"notes" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "budget_movements_kind_allowed" CHECK ("budget_movements"."kind" in ('income', 'expense')),
	CONSTRAINT "budget_movements_amount_sign" CHECK (("budget_movements"."kind" = 'income' and "budget_movements"."amount" >= 0) or ("budget_movements"."kind" = 'expense' and "budget_movements"."amount" <= 0))
);
--> statement-breakpoint
ALTER TABLE "budget_balances" ADD CONSTRAINT "budget_balances_edition_id_editions_id_fk" FOREIGN KEY ("edition_id") REFERENCES "public"."editions"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "budget_balances" ADD CONSTRAINT "budget_balances_origin_edition_id_editions_id_fk" FOREIGN KEY ("origin_edition_id") REFERENCES "public"."editions"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "budget_movements" ADD CONSTRAINT "budget_movements_edition_id_editions_id_fk" FOREIGN KEY ("edition_id") REFERENCES "public"."editions"("id") ON DELETE restrict ON UPDATE no action;