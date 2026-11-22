import type { PatientStatus } from "../entities/patient.entity";

const ALLOWED_TRANSITIONS: Record<PatientStatus, readonly PatientStatus[]> = {
  WAITING: ["IN_PROGRESS", "TRANSFERRED", "CANCELLED"],
  IN_PROGRESS: ["IN_EXAMINATION", "WAITING_RESULT", "READY_FOR_DISCHARGE", "TRANSFERRED", "CANCELLED"],
  IN_EXAMINATION: ["IN_PROGRESS", "WAITING_RESULT", "READY_FOR_DISCHARGE", "TRANSFERRED", "CANCELLED"],
  WAITING_RESULT: ["IN_PROGRESS", "IN_EXAMINATION", "READY_FOR_DISCHARGE", "TRANSFERRED", "CANCELLED"],
  READY_FOR_DISCHARGE: ["IN_PROGRESS", "DISCHARGED", "TRANSFERRED"],
  DISCHARGED: [],
  TRANSFERRED: [],
  CANCELLED: [],
};

export function canTransitionPatientStatus(from: PatientStatus, to: PatientStatus): boolean {
  return ALLOWED_TRANSITIONS[from].includes(to);
}

export function allowedPatientStatusTransitions(from: PatientStatus): readonly PatientStatus[] {
  return ALLOWED_TRANSITIONS[from];
}
