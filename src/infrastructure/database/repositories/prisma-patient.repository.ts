import type { PrismaClient } from "@prisma/client";
import type { Patient, PatientStatus } from "../../../domain/entities/patient.entity";
import type { CreatePatientRecord, PatientRepository } from "../../../domain/repositories/patient.repository";

export class PrismaPatientRepository implements PatientRepository {
  constructor(private readonly prisma: PrismaClient) {}
  create(patient: CreatePatientRecord): Promise<Patient> { return this.prisma.patient.create({ data: patient }); }
  findById(id: string): Promise<Patient | null> { return this.prisma.patient.findUnique({ where: { id } }); }
  findByRecordNumber(recordNumber: string): Promise<Patient | null> {
    return this.prisma.patient.findUnique({ where: { recordNumber } });
  }
  findByPhone(phone: string): Promise<Patient | null> { return this.prisma.patient.findUnique({ where: { phone } }); }
  list(): Promise<Patient[]> {
    return this.prisma.patient.findMany({ orderBy: [{ lastName: "asc" }, { firstName: "asc" }] });
  }
  updateStatus(id: string, status: PatientStatus, changedById: string): Promise<Patient> {
    return this.prisma.$transaction(async (tx) => {
      const patient = await tx.patient.update({ where: { id }, data: { status } });
      await tx.patientStatusHistory.create({ data: { patientId: id, status, changedById } });
      return patient;
    });
  }
}
