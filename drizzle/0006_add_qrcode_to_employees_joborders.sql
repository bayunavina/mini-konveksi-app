ALTER TABLE "employees" ADD COLUMN "qr_code" text;--> statement-breakpoint
ALTER TABLE "job_orders" ADD COLUMN "qr_code" text;--> statement-breakpoint
ALTER TABLE "employees" ADD CONSTRAINT "employees_qr_code_unique" UNIQUE("qr_code");--> statement-breakpoint
ALTER TABLE "job_orders" ADD CONSTRAINT "job_orders_qr_code_unique" UNIQUE("qr_code");
