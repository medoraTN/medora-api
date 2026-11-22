export type PatientStatus = "WAITING" | "IN_CARE" | "IN_EXAM" | "AWAITING_RESULTS" | "READY_FOR_DISCHARGE" | "DISCHARGED" | "TRANSFERRED" | "CANCELLED";
export type PatientSex = "FEMALE" | "MALE" | "OTHER" | "UNKNOWN";

export interface Patient {
  id: string; recordNumber: string; firstName: string; lastName: string; dateOfBirth: Date;
  sex: PatientSex; phone: string; address: string | null; arrivalReason: string;
  urgencyLevel: number; status: PatientStatus; internalNotes: string | null; createdAt: Date; updatedAt: Date;
}
