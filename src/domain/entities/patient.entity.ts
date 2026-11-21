export const patientStatuses = [
  'WAITING', 'IN_PROGRESS', 'IN_EXAMINATION', 'WAITING_RESULT',
  'READY_FOR_DISCHARGE', 'DISCHARGED', 'TRANSFERRED', 'CANCELLED',
] as const;

export type PatientStatus = typeof patientStatuses[number];

export interface PatientFields {
  recordNumber: string;
  firstName: string;
  lastName: string;
  dateOfBirth: Date;
  sex: string;
  phone: string;
  residence: string;
  arrivalReason: string;
  priority: string;
  comments?: string | null;
}

export interface Patient extends PatientFields {
  id: string;
  status: PatientStatus;
  createdAt: Date;
  updatedAt: Date;
}

export type PatientSummary = Pick<Patient,
  'id' | 'recordNumber' | 'firstName' | 'lastName' | 'phone' | 'priority' | 'status'>;

export interface PatientStatusChange {
  id: string;
  actorId: string;
  actor: { email: string };
  previousStatus: PatientStatus;
  nextStatus: PatientStatus;
  changedAt: Date;
}

export interface PatientDetail extends Patient {
  statusHistory: PatientStatusChange[];
}

export function isStatusChange(previous: PatientStatus, next: PatientStatus): boolean {
  return previous !== next;
}
