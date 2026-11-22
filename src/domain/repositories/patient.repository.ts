import type { Patient, PatientStatus } from "../entities/patient.entity";
export type CreatePatientRecord = Omit<Patient, "id" | "createdAt" | "updatedAt">;
export interface PatientRepository {
  create(patient: CreatePatientRecord): Promise<Patient>;
  findById(id: string): Promise<Patient | null>;
  findByRecordNumber(recordNumber: string): Promise<Patient | null>;
  findByPhone(phone: string): Promise<Patient | null>;
  list(): Promise<Patient[]>;
  updateStatus(id: string, status: PatientStatus, changedById: string): Promise<Patient>;
}
