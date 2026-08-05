CREATE TABLE "shopping_purchases" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"edition_id" uuid NOT NULL,
	"store_id" uuid,
	"purchaser_member_id" uuid NOT NULL,
	"purchased_at" timestamp with time zone NOT NULL,
	"total_amount" numeric(12, 2) NOT NULL,
	"notes" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "shopping_purchases" ADD CONSTRAINT "shopping_purchases_edition_id_editions_id_fk" FOREIGN KEY ("edition_id") REFERENCES "public"."editions"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "shopping_purchases" ADD CONSTRAINT "shopping_purchases_store_id_shopping_stores_id_fk" FOREIGN KEY ("store_id") REFERENCES "public"."shopping_stores"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "shopping_purchases" ADD CONSTRAINT "shopping_purchases_purchaser_member_id_members_id_fk" FOREIGN KEY ("purchaser_member_id") REFERENCES "public"."members"("id") ON DELETE restrict ON UPDATE no action;