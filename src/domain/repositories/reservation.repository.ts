import type { Reservation, ReservationStatus } from "../entities/reservation.entity";

export type CreateReservationRecord = Omit<Reservation, "id" | "createdAt" | "updatedAt">;

export type UpdateReservationRecord = Partial<{
  service: string;
  practitioner: string | null;
  examination: string | null;
  scheduledAt: Date;
  durationMinutes: number;
  status: ReservationStatus;
}>;

export interface ReservationListQuery {
  page: number;
  pageSize: number;
  patientId?: string | undefined;
  status?: ReservationStatus | undefined;
  from?: Date | undefined;
  to?: Date | undefined;
}

export interface ReservationPage {
  items: Reservation[];
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
}

export interface ReservationRepository {
  create(reservation: CreateReservationRecord): Promise<Reservation>;
  findById(id: string): Promise<Reservation | null>;
  list(query: ReservationListQuery): Promise<ReservationPage>;
  listByPatient(patientId: string): Promise<Reservation[]>;
  update(id: string, data: UpdateReservationRecord): Promise<Reservation>;
  updateStatus(id: string, status: ReservationStatus): Promise<Reservation>;
}
