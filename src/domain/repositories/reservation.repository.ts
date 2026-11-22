import type { Reservation, ReservationStatus } from "../entities/reservation.entity";
export type CreateReservationRecord = Omit<Reservation, "id" | "createdAt" | "updatedAt">;
export interface ReservationRepository {
  create(reservation: CreateReservationRecord): Promise<Reservation>;
  findById(id: string): Promise<Reservation | null>;
  listByPatient(patientId: string): Promise<Reservation[]>;
  updateStatus(id: string, status: ReservationStatus): Promise<Reservation>;
}
