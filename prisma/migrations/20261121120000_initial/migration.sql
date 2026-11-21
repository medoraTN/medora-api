-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateEnum
CREATE TYPE "Role" AS ENUM ('ADMIN', 'MEDICAL', 'ADMIN_STAFF', 'SUPERVISOR');

-- CreateEnum
CREATE TYPE "PatientStatus" AS ENUM ('WAITING', 'IN_PROGRESS', 'IN_EXAMINATION', 'WAITING_RESULT', 'READY_FOR_DISCHARGE', 'DISCHARGED', 'TRANSFERRED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "ReservationStatus" AS ENUM ('PENDING', 'CONFIRMED', 'CANCELLED', 'COMPLETED');

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "role" "Role" NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Patient" (
    "id" TEXT NOT NULL,
    "recordNumber" TEXT NOT NULL,
    "firstName" TEXT NOT NULL,
    "lastName" TEXT NOT NULL,
    "dateOfBirth" DATE NOT NULL,
    "sex" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "residence" TEXT NOT NULL,
    "arrivalReason" TEXT NOT NULL,
    "priority" TEXT NOT NULL,
    "comments" TEXT,
    "status" "PatientStatus" NOT NULL DEFAULT 'WAITING',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Patient_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PatientStatusChange" (
    "id" TEXT NOT NULL,
    "patientId" TEXT NOT NULL,
    "actorId" TEXT NOT NULL,
    "previousStatus" "PatientStatus" NOT NULL,
    "nextStatus" "PatientStatus" NOT NULL,
    "changedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PatientStatusChange_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Reservation" (
    "id" TEXT NOT NULL,
    "patientId" TEXT NOT NULL,
    "service" TEXT NOT NULL,
    "practitioner" TEXT,
    "startsAt" TIMESTAMP(3) NOT NULL,
    "durationMinutes" INTEGER NOT NULL,
    "status" "ReservationStatus" NOT NULL DEFAULT 'PENDING',

    CONSTRAINT "Reservation_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "Patient_recordNumber_key" ON "Patient"("recordNumber");

-- CreateIndex
CREATE INDEX "Patient_createdAt_id_idx" ON "Patient"("createdAt", "id");

-- CreateIndex
CREATE INDEX "PatientStatusChange_patientId_changedAt_idx" ON "PatientStatusChange"("patientId", "changedAt");

-- CreateIndex
CREATE INDEX "Reservation_startsAt_status_idx" ON "Reservation"("startsAt", "status");

-- AddForeignKey
ALTER TABLE "PatientStatusChange" ADD CONSTRAINT "PatientStatusChange_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "Patient"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PatientStatusChange" ADD CONSTRAINT "PatientStatusChange_actorId_fkey" FOREIGN KEY ("actorId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Reservation" ADD CONSTRAINT "Reservation_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "Patient"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
