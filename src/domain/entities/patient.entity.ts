export type PatientStatus =
  | "WAITING"
  | "IN_PROGRESS"
  | "IN_EXAMINATION"
  | "WAITING_RESULT"
  | "READY_FOR_DISCHARGE"
  | "DISCHARGED"
  | "TRANSFERRED"
  | "CANCELLED";
export type PatientSex = "FEMALE" | "MALE" | "OTHER" | "UNKNOWN";

export interface PatientStatusHistoryEntry {
  id: string;
  patientId: string;
  previousStatus: PatientStatus | null;
  status: PatientStatus;
  changedById: string;
  changedAt: Date;
}

export interface Patient {
  id: string; recordNumber: string; firstName: string; lastName: string; dateOfBirth: Date;
  sex: PatientSex; phone: string; address: string | null; arrivalReason: string;
  urgencyLevel: number; status: PatientStatus; internalNotes: string | null; createdAt: Date; updatedAt: Date;
}
