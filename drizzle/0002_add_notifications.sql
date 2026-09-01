-- Create notifications table
CREATE TABLE IF NOT EXISTS "notifications" (
    "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    "employee_id" uuid REFERENCES employees(id),
    "type" text NOT NULL,
    "title" text NOT NULL,
    "message" text NOT NULL,
    "reference" text,
    "reference_id" text,
    "is_read" boolean DEFAULT false,
    "created_at" timestamp DEFAULT NOW()
);

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS "notifications_employee_id_idx" ON "notifications"("employee_id");
CREATE INDEX IF NOT EXISTS "notifications_is_read_idx" ON "notifications"("is_read");
CREATE INDEX IF NOT EXISTS "notifications_created_at_idx" ON "notifications"("created_at");
