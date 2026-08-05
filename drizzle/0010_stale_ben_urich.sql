CREATE TABLE "shopping_edition_preferences" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"member_id" uuid NOT NULL,
	"edition_id" uuid NOT NULL,
	"query" text DEFAULT '' NOT NULL,
	"status" text,
	"category_id" uuid,
	"store_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "shopping_edition_preferences_status_allowed" CHECK ("shopping_edition_preferences"."status" is null or "shopping_edition_preferences"."status" in ('pending', 'in_cart', 'purchased', 'not_buying', 'gifted'))
);
--> statement-breakpoint
CREATE TABLE "shopping_preferences" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"member_id" uuid NOT NULL,
	"group_by" text DEFAULT 'category' NOT NULL,
	"sort_by" text DEFAULT 'description' NOT NULL,
	"sort_direction" text DEFAULT 'asc' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "shopping_preferences_group_allowed" CHECK ("shopping_preferences"."group_by" in ('category', 'store', 'assignment', 'status')),
	CONSTRAINT "shopping_preferences_sort_allowed" CHECK ("shopping_preferences"."sort_by" in ('description', 'unit_price', 'quantity', 'total')),
	CONSTRAINT "shopping_preferences_direction_allowed" CHECK ("shopping_preferences"."sort_direction" in ('asc', 'desc'))
);
--> statement-breakpoint
ALTER TABLE "shopping_edition_preferences" ADD CONSTRAINT "shopping_edition_preferences_member_id_members_id_fk" FOREIGN KEY ("member_id") REFERENCES "public"."members"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "shopping_edition_preferences" ADD CONSTRAINT "shopping_edition_preferences_edition_id_editions_id_fk" FOREIGN KEY ("edition_id") REFERENCES "public"."editions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "shopping_edition_preferences" ADD CONSTRAINT "shopping_edition_preferences_category_id_shopping_categories_id_fk" FOREIGN KEY ("category_id") REFERENCES "public"."shopping_categories"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "shopping_edition_preferences" ADD CONSTRAINT "shopping_edition_preferences_store_id_shopping_stores_id_fk" FOREIGN KEY ("store_id") REFERENCES "public"."shopping_stores"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "shopping_preferences" ADD CONSTRAINT "shopping_preferences_member_id_members_id_fk" FOREIGN KEY ("member_id") REFERENCES "public"."members"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "shopping_edition_preferences_member_edition_unique" ON "shopping_edition_preferences" USING btree ("member_id","edition_id");--> statement-breakpoint
CREATE UNIQUE INDEX "shopping_preferences_member_unique" ON "shopping_preferences" USING btree ("member_id");