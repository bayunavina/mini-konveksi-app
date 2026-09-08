-- Track the employee who performed the action (not just the recipient)
ALTER TABLE "notifications" ADD COLUMN IF NOT EXISTS "actor_id" uuid REFERENCES employees(id);

CREATE INDEX IF NOT EXISTS "notifications_actor_id_idx" ON "notifications"("actor_id");