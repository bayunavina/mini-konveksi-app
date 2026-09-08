CREATE TABLE "transfer_photos" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"transfer_id" uuid NOT NULL,
	"photo_url" text NOT NULL,
	"label" text NOT NULL,
	"timestamp" timestamp DEFAULT now(),
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
ALTER TABLE "material_lots" ADD COLUMN "supplier" text;--> statement-breakpoint
ALTER TABLE "notifications" ADD COLUMN "actor_id" uuid;--> statement-breakpoint
ALTER TABLE "transfer_photos" ADD CONSTRAINT "transfer_photos_transfer_id_transfers_id_fk" FOREIGN KEY ("transfer_id") REFERENCES "public"."transfers"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_actor_id_employees_id_fk" FOREIGN KEY ("actor_id") REFERENCES "public"."employees"("id") ON DELETE no action ON UPDATE no action;