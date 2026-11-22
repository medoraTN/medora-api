import type { PatientSex } from "../../domain/entities/patient.entity";

export interface CreatePatientDto {
  recordNumber: string;
  firstName: string;
  lastName: string;
  dateOfBirth: string;
  sex?: PatientSex | undefined;
  phone: string;
  address?: string | null | undefined;
  arrivalReason: string;
  urgencyLevel: number;
  internalNotes?: string | null | undefined;
}
