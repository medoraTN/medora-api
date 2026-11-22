CREATE TYPE "PatientStatus" AS ENUM ('WAITING', 'IN_CARE', 'IN_EXAM', 'AWAITING_RESULTS', 'READY_FOR_DISCHARGE', 'DISCHARGED', 'TRANSFERRED', 'CANCELLED');
CREATE TYPE "ReservationStatus" AS ENUM ('CONFIRMED', 'PENDING', 'CANCELLED');
CREATE TYPE "UserRole" AS ENUM ('ADMIN', 'MEDICAL_STAFF', 'ADMINISTRATIVE_STAFF', 'EMERGENCY_SUPERVISOR');
CREATE TYPE "PatientSex" AS ENUM ('FEMALE', 'MALE', 'OTHER', 'UNKNOWN');

CREATE TABLE "patients" (
  "id" TEXT NOT NULL,
  "record_number" TEXT NOT NULL,
  "first_name" TEXT NOT NULL,
  "last_name" TEXT NOT NULL,
  "date_of_birth" DATE NOT NULL,
  "sex" "PatientSex" NOT NULL DEFAULT 'UNKNOWN',
  "phone" TEXT NOT NULL,
  "address" TEXT,
  "arrival_reason" TEXT NOT NULL,
  "urgency_level" INTEGER NOT NULL,
  "status" "PatientStatus" NOT NULL DEFAULT 'WAITING',
  "internal_notes" TEXT,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "patients_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "users" (
  "id" TEXT NOT NULL,
  "email" TEXT NOT NULL,
  "password_hash" TEXT NOT NULL,
  "first_name" TEXT NOT NULL,
  "last_name" TEXT NOT NULL,
  "role" "UserRole" NOT NULL,
  "is_active" BOOLEAN NOT NULL DEFAULT true,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "reservations" (
  "id" TEXT NOT NULL,
  "patient_id" TEXT NOT NULL,
  "service" TEXT NOT NULL,
  "practitioner" TEXT,
  "examination" TEXT,
  "scheduled_at" TIMESTAMP(3) NOT NULL,
  "duration_minutes" INTEGER NOT NULL,
  "status" "ReservationStatus" NOT NULL DEFAULT 'PENDING',
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "reservations_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "patient_status_history" (
  "id" TEXT NOT NULL,
  "patient_id" TEXT NOT NULL,
  "status" "PatientStatus" NOT NULL,
  "changed_by_id" TEXT NOT NULL,
  "changed_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "patient_status_history_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "patients_record_number_key" ON "patients"("record_number");
CREATE UNIQUE INDEX "patients_phone_key" ON "patients"("phone");
CREATE INDEX "patients_last_name_first_name_idx" ON "patients"("last_name", "first_name");
CREATE INDEX "patients_status_idx" ON "patients"("status");
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");
CREATE INDEX "reservations_patient_id_idx" ON "reservations"("patient_id");
CREATE INDEX "reservations_scheduled_at_status_idx" ON "reservations"("scheduled_at", "status");
CREATE INDEX "patient_status_history_patient_id_changed_at_idx" ON "patient_status_history"("patient_id", "changed_at");

ALTER TABLE "reservations" ADD CONSTRAINT "reservations_patient_id_fkey" FOREIGN KEY ("patient_id") REFERENCES "patients"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "patient_status_history" ADD CONSTRAINT "patient_status_history_patient_id_fkey" FOREIGN KEY ("patient_id") REFERENCES "patients"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "patient_status_history" ADD CONSTRAINT "patient_status_history_changed_by_id_fkey" FOREIGN KEY ("changed_by_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
