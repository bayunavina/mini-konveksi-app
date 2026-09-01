-- Create production_assignments table
CREATE TABLE IF NOT EXISTS "production_assignments" (
    "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    "job_order_id" uuid REFERENCES job_orders(id),
    "material_lot_id" uuid REFERENCES material_lots(id),
    "employee_id" uuid REFERENCES employees(id) NOT NULL,
    "target_qty" integer NOT NULL,
    "completed_qty" integer DEFAULT 0,
    "rejected_qty" integer DEFAULT 0,
    "rate_per_unit" decimal(10, 2) DEFAULT '0',
    "status" text DEFAULT 'ASSIGNED',
    "notes" text,
    "assigned_at" timestamp DEFAULT NOW(),
    "started_at" timestamp,
    "completed_at" timestamp,
    "created_at" timestamp DEFAULT NOW(),
    "updated_at" timestamp DEFAULT NOW()
);

-- Create production_progress table
CREATE TABLE IF NOT EXISTS "production_progress" (
    "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    "assignment_id" uuid REFERENCES production_assignments(id) NOT NULL,
    "employee_id" uuid REFERENCES employees(id) NOT NULL,
    "qty_completed" integer NOT NULL,
    "qty_rejected" integer DEFAULT 0,
    "notes" text,
    "created_at" timestamp DEFAULT NOW()
);

-- Create production_salary table
CREATE TABLE IF NOT EXISTS "production_salary" (
    "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    "employee_id" uuid REFERENCES employees(id) NOT NULL,
    "assignment_id" uuid REFERENCES production_assignments(id),
    "period_week" text NOT NULL,
    "period_year" integer NOT NULL,
    "completed_qty" integer DEFAULT 0,
    "rejected_qty" integer DEFAULT 0,
    "accepted_qty" integer DEFAULT 0,
    "rate_per_unit" decimal(10, 2) DEFAULT '0',
    "base_salary" integer DEFAULT 0,
    "production_salary" integer DEFAULT 0,
    "total_salary" integer DEFAULT 0,
    "status" text DEFAULT 'PENDING',
    "created_at" timestamp DEFAULT NOW()
);

-- Create indexes
CREATE INDEX IF NOT EXISTS "production_assignments_employee_idx" ON "production_assignments"("employee_id");
CREATE INDEX IF NOT EXISTS "production_assignments_job_order_idx" ON "production_assignments"("job_order_id");
CREATE INDEX IF NOT EXISTS "production_progress_assignment_idx" ON "production_progress"("assignment_id");
CREATE INDEX IF NOT EXISTS "production_salary_employee_idx" ON "production_salary"("employee_id");
