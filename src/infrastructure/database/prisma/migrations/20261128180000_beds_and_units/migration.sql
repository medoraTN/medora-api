-- CreateEnum
CREATE TYPE "UnitKind" AS ENUM ('EMERGENCY', 'OR', 'ICU');

-- CreateEnum
CREATE TYPE "BedType" AS ENUM ('STANDARD', 'MONITORING', 'ISOLATION');

-- CreateEnum
CREATE TYPE "BedStatus" AS ENUM ('FREE', 'OCCUPIED', 'CLEANING', 'MAINTENANCE', 'RESERVED');

-- CreateEnum
CREATE TYPE "BedAssignmentEvent" AS ENUM ('ASSIGNED', 'TRANSFERRED', 'RELEASED');

-- CreateTable
CREATE TABLE "units" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "kind" "UnitKind" NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "units_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "beds" (
    "id" TEXT NOT NULL,
    "unit_id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "type" "BedType" NOT NULL DEFAULT 'STANDARD',
    "status" "BedStatus" NOT NULL DEFAULT 'FREE',
    "current_patient_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "beds_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "bed_assignment_history" (
    "id" TEXT NOT NULL,
    "bed_id" TEXT NOT NULL,
    "patient_id" TEXT NOT NULL,
    "event" "BedAssignmentEvent" NOT NULL,
    "from_bed_id" TEXT,
    "to_bed_id" TEXT,
    "actor_user_id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "bed_assignment_history_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "units_name_key" ON "units"("name");

-- CreateIndex
CREATE INDEX "units_kind_idx" ON "units"("kind");

-- CreateIndex
CREATE UNIQUE INDEX "beds_current_patient_id_key" ON "beds"("current_patient_id");

-- CreateIndex
CREATE INDEX "beds_status_idx" ON "beds"("status");

-- CreateIndex
CREATE INDEX "beds_unit_id_status_idx" ON "beds"("unit_id", "status");

-- CreateIndex
CREATE UNIQUE INDEX "beds_unit_id_code_key" ON "beds"("unit_id", "code");

-- CreateIndex
CREATE INDEX "bed_assignment_history_bed_id_created_at_idx" ON "bed_assignment_history"("bed_id", "created_at");

-- CreateIndex
CREATE INDEX "bed_assignment_history_patient_id_created_at_idx" ON "bed_assignment_history"("patient_id", "created_at");

-- AddForeignKey
ALTER TABLE "beds" ADD CONSTRAINT "beds_unit_id_fkey" FOREIGN KEY ("unit_id") REFERENCES "units"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "beds" ADD CONSTRAINT "beds_current_patient_id_fkey" FOREIGN KEY ("current_patient_id") REFERENCES "patients"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bed_assignment_history" ADD CONSTRAINT "bed_assignment_history_bed_id_fkey" FOREIGN KEY ("bed_id") REFERENCES "beds"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bed_assignment_history" ADD CONSTRAINT "bed_assignment_history_patient_id_fkey" FOREIGN KEY ("patient_id") REFERENCES "patients"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bed_assignment_history" ADD CONSTRAINT "bed_assignment_history_from_bed_id_fkey" FOREIGN KEY ("from_bed_id") REFERENCES "beds"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bed_assignment_history" ADD CONSTRAINT "bed_assignment_history_to_bed_id_fkey" FOREIGN KEY ("to_bed_id") REFERENCES "beds"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bed_assignment_history" ADD CONSTRAINT "bed_assignment_history_actor_user_id_fkey" FOREIGN KEY ("actor_user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
