export const BED_TYPES = ["STANDARD", "MONITORING", "ISOLATION"] as const;
export type BedType = (typeof BED_TYPES)[number];

export const BED_STATUSES = ["FREE", "OCCUPIED", "CLEANING", "MAINTENANCE", "RESERVED"] as const;
export type BedStatus = (typeof BED_STATUSES)[number];

export const BED_ASSIGNMENT_EVENTS = ["ASSIGNED", "TRANSFERRED", "RELEASED"] as const;
export type BedAssignmentEventType = (typeof BED_ASSIGNMENT_EVENTS)[number];

export interface Bed {
  id: string;
  unitId: string;
  code: string;
  type: BedType;
  status: BedStatus;
  currentPatientId: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface BedAssignmentEvent {
  id: string;
  bedId: string;
  patientId: string;
  event: BedAssignmentEventType;
  fromBedId: string | null;
  toBedId: string | null;
  actorUserId: string;
  createdAt: Date;
}
