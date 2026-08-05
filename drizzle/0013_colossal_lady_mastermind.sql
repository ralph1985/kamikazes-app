CREATE TABLE "catering_attendance" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"meal_id" uuid NOT NULL,
	"member_id" uuid NOT NULL,
	"status" text DEFAULT 'yes' NOT NULL,
	"payment_status" text DEFAULT 'pending' NOT NULL,
	"payment_notes" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "catering_attendance_status_allowed" CHECK ("catering_attendance"."status" in ('yes', 'no', 'cancelled')),
	CONSTRAINT "catering_attendance_payment_status_allowed" CHECK ("catering_attendance"."payment_status" in ('pending', 'partial', 'paid'))
);
--> statement-breakpoint
CREATE TABLE "catering_meals" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"edition_id" uuid NOT NULL,
	"name" text NOT NULL,
	"planned_price" numeric(12, 2) DEFAULT '0.00' NOT NULL,
	"real_price" numeric(12, 2),
	"sort_order" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "catering_attendance" ADD CONSTRAINT "catering_attendance_meal_id_catering_meals_id_fk" FOREIGN KEY ("meal_id") REFERENCES "public"."catering_meals"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "catering_attendance" ADD CONSTRAINT "catering_attendance_member_id_members_id_fk" FOREIGN KEY ("member_id") REFERENCES "public"."members"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "catering_meals" ADD CONSTRAINT "catering_meals_edition_id_editions_id_fk" FOREIGN KEY ("edition_id") REFERENCES "public"."editions"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "catering_attendance_meal_member_unique" ON "catering_attendance" USING btree ("meal_id","member_id");--> statement-breakpoint
CREATE UNIQUE INDEX "catering_meals_edition_name_unique" ON "catering_meals" USING btree ("edition_id","name");