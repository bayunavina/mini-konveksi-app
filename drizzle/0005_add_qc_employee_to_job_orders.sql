-- Add qc_employee_id to job_orders table
ALTER TABLE "job_orders" ADD COLUMN IF NOT EXISTS "qc_employee_id" uuid REFERENCES employees(id);

-- Create index for faster lookup
CREATE INDEX IF NOT EXISTS "job_orders_qc_employee_idx" ON "job_orders"("qc_employee_id");
