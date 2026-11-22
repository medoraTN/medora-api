-- MED-5: align patient workflow enum labels with the API contract.
-- PostgreSQL renames enum labels in-place, preserving patient and history rows.
ALTER TYPE "PatientStatus" RENAME VALUE 'IN_CARE' TO 'IN_PROGRESS';
ALTER TYPE "PatientStatus" RENAME VALUE 'IN_EXAM' TO 'IN_EXAMINATION';
ALTER TYPE "PatientStatus" RENAME VALUE 'AWAITING_RESULTS' TO 'WAITING_RESULT';

-- Old history entries cannot reliably reconstruct their previous status.
-- New status transitions always populate this column in the same transaction.
ALTER TABLE "patient_status_history"
  ADD COLUMN "previous_status" "PatientStatus";
