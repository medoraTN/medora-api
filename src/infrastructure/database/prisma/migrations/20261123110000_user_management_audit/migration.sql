CREATE TYPE "UserAuditAction" AS ENUM (
  'USER_CREATED',
  'USER_ROLE_CHANGED',
  'USER_DEACTIVATED',
  'USER_REACTIVATED',
  'USER_PASSWORD_RESET'
);

CREATE TABLE "user_audit_logs" (
  "id" TEXT NOT NULL,
  "actor_user_id" TEXT NOT NULL,
  "target_user_id" TEXT NOT NULL,
  "action" "UserAuditAction" NOT NULL,
  "metadata" JSONB,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "user_audit_logs_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "user_audit_logs_actor_user_id_created_at_idx"
  ON "user_audit_logs"("actor_user_id", "created_at");
CREATE INDEX "user_audit_logs_target_user_id_created_at_idx"
  ON "user_audit_logs"("target_user_id", "created_at");

ALTER TABLE "user_audit_logs"
  ADD CONSTRAINT "user_audit_logs_actor_user_id_fkey"
  FOREIGN KEY ("actor_user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "user_audit_logs"
  ADD CONSTRAINT "user_audit_logs_target_user_id_fkey"
  FOREIGN KEY ("target_user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
