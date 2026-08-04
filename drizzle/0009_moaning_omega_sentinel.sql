CREATE TABLE "shopping_categories" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"edition_id" uuid NOT NULL,
	"name" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "shopping_products" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"edition_id" uuid NOT NULL,
	"description" text DEFAULT '' NOT NULL,
	"category_id" uuid,
	"store_id" uuid,
	"assigned_member_id" uuid,
	"assignment" text,
	"planned_quantity" numeric(12, 2),
	"real_quantity" numeric(12, 2),
	"planned_unit_price" numeric(12, 2),
	"real_unit_price" numeric(12, 2),
	"notes" text,
	"status" text DEFAULT 'pending' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "shopping_products_status_allowed" CHECK ("shopping_products"."status" in ('pending', 'in_cart', 'purchased', 'not_buying', 'gifted'))
);
--> statement-breakpoint
CREATE TABLE "shopping_stores" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"edition_id" uuid NOT NULL,
	"name" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "shopping_categories" ADD CONSTRAINT "shopping_categories_edition_id_editions_id_fk" FOREIGN KEY ("edition_id") REFERENCES "public"."editions"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "shopping_products" ADD CONSTRAINT "shopping_products_edition_id_editions_id_fk" FOREIGN KEY ("edition_id") REFERENCES "public"."editions"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "shopping_products" ADD CONSTRAINT "shopping_products_category_id_shopping_categories_id_fk" FOREIGN KEY ("category_id") REFERENCES "public"."shopping_categories"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "shopping_products" ADD CONSTRAINT "shopping_products_store_id_shopping_stores_id_fk" FOREIGN KEY ("store_id") REFERENCES "public"."shopping_stores"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "shopping_products" ADD CONSTRAINT "shopping_products_assigned_member_id_members_id_fk" FOREIGN KEY ("assigned_member_id") REFERENCES "public"."members"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "shopping_stores" ADD CONSTRAINT "shopping_stores_edition_id_editions_id_fk" FOREIGN KEY ("edition_id") REFERENCES "public"."editions"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "shopping_categories_edition_name_unique" ON "shopping_categories" USING btree ("edition_id","name");--> statement-breakpoint
CREATE UNIQUE INDEX "shopping_stores_edition_name_unique" ON "shopping_stores" USING btree ("edition_id","name");