CREATE TABLE "editions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"year" integer NOT NULL,
	"status" text DEFAULT 'open' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "editions_status_allowed" CHECK ("editions"."status" in ('open', 'closed'))
);
--> statement-breakpoint
CREATE TABLE "role_assignments" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"member_id" uuid NOT NULL,
	"edition_id" uuid,
	"area" text NOT NULL,
	"role" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "role_assignments_role_allowed" CHECK ("role_assignments"."role" in ('admin', 'editor', 'reader')),
	CONSTRAINT "role_assignments_area_allowed" CHECK ("role_assignments"."area" in ('global', 'identity', 'editions', 'budget', 'shopping', 'catering', 'public-content', 'audit')),
	CONSTRAINT "role_assignments_scope_valid" CHECK (("role_assignments"."role" = 'admin' and "role_assignments"."area" = 'global' and "role_assignments"."edition_id" is null) or ("role_assignments"."role" in ('editor', 'reader') and "role_assignments"."area" <> 'global' and "role_assignments"."edition_id" is not null))
);
--> statement-breakpoint
ALTER TABLE "role_assignments" ADD CONSTRAINT "role_assignments_member_id_members_id_fk" FOREIGN KEY ("member_id") REFERENCES "public"."members"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "role_assignments" ADD CONSTRAINT "role_assignments_edition_id_editions_id_fk" FOREIGN KEY ("edition_id") REFERENCES "public"."editions"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "editions_year_unique" ON "editions" USING btree ("year");--> statement-breakpoint
CREATE UNIQUE INDEX "role_assignments_member_edition_area_unique" ON "role_assignments" USING btree ("member_id","edition_id","area");