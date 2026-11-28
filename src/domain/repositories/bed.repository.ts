import type { Bed, BedAssignmentEvent, BedStatus, BedType } from "../entities/bed.entity";

export type CreateBedRecord = Omit<Bed, "id" | "createdAt" | "updatedAt" | "currentPatientId" | "status"> & {
  status?: BedStatus;
  currentPatientId?: string | null;
};

export interface BedListQuery {
  unitId?: string;
  status?: BedStatus;
  unitKind?: "EMERGENCY" | "OR" | "ICU";
}

export interface BedRepository {
  create(bed: CreateBedRecord): Promise<Bed>;
  findById(id: string): Promise<Bed | null>;
  findByPatientId(patientId: string): Promise<Bed | null>;
  list(query?: BedListQuery): Promise<Bed[]>;
  updateStatus(id: string, status: BedStatus): Promise<Bed>;
  assignPatient(bedId: string, patientId: string, actorUserId: string): Promise<Bed>;
  transferPatient(fromBedId: string, toBedId: string, actorUserId: string): Promise<{ from: Bed; to: Bed }>;
  releasePatient(bedId: string, actorUserId: string): Promise<Bed>;
  listHistory(bedId: string): Promise<BedAssignmentEvent[]>;
}
