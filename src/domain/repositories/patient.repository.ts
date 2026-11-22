import type { Patient, PatientStatus } from "../entities/patient.entity";

export type CreatePatientRecord = Omit<Patient, "id" | "createdAt" | "updatedAt">;

export interface PatientListQuery {
  page: number;
  pageSize: number;
  search?: string | undefined;
  status?: PatientStatus | undefined;
}

export interface PatientPage {
  items: Patient[];
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
}

export interface PatientRepository {
  create(patient: CreatePatientRecord): Promise<Patient>;
  findById(id: string): Promise<Patient | null>;
  findByRecordNumber(recordNumber: string): Promise<Patient | null>;
  findByPhone(phone: string): Promise<Patient | null>;
  list(query: PatientListQuery): Promise<PatientPage>;
  updateStatus(id: string, status: PatientStatus, changedById: string): Promise<Patient>;
}
