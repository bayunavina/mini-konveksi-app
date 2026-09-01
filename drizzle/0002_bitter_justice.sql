CREATE TABLE "master_skus" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"code" text NOT NULL,
	"name" text NOT NULL,
	"category" text,
	"unit" text DEFAULT 'Pcs',
	"price" numeric(12, 2) DEFAULT '0',
	"is_active" boolean DEFAULT true,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	CONSTRAINT "master_skus_code_unique" UNIQUE("code")
);
--> statement-breakpoint
ALTER TABLE "advances" ADD COLUMN "kode" text;--> statement-breakpoint
ALTER TABLE "material_lots" ADD COLUMN "is_ready_for_production" boolean DEFAULT false;--> statement-breakpoint
ALTER TABLE "production_salary" ADD COLUMN "kode" text;--> statement-breakpoint
ALTER TABLE "transactions" ADD COLUMN "kode" text;--> statement-breakpoint
ALTER TABLE "advances" ADD CONSTRAINT "advances_kode_unique" UNIQUE("kode");--> statement-breakpoint
ALTER TABLE "production_salary" ADD CONSTRAINT "production_salary_kode_unique" UNIQUE("kode");--> statement-breakpoint
ALTER TABLE "transactions" ADD CONSTRAINT "transactions_kode_unique" UNIQUE("kode");