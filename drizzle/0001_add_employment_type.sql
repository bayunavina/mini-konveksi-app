-- Add employment_type column to employees table
ALTER TABLE "employees" ADD COLUMN IF NOT EXISTS "employment_type" text DEFAULT 'HARIAN';
