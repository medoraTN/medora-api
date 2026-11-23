import type { Reservation, ReservationStatus } from "../entities/reservation.entity";

export type CreateReservationRecord = Omit<Reservation, "id" | "createdAt" | "updatedAt">;
export type UpdateReservationRecord = Partial<Pick<Reservation,
  "service" | "practitioner" | "examination" | "scheduledAt" | "durationMinutes" | "status"
>>;

export interface ReservationListQuery {
  date?: string | undefined;
  status?: ReservationStatus | undefined;
  patientId?: string | undefined;
}

export interface ReservationRepository {
  create(reservation: CreateReservationRecord): Promise<Reservation>;
  findById(id: string): Promise<Reservation | null>;
  listByPatient(patientId: string): Promise<Reservation[]>;
  list(query: ReservationListQuery): Promise<Reservation[]>;
  update(id: string, data: UpdateReservationRecord): Promise<Reservation>;
  updateStatus(id: string, status: ReservationStatus): Promise<Reservation>;
}
