export type ReservationStatus = "PENDING" | "CONFIRMED" | "CANCELLED" | "COMPLETED";

export interface Reservation {
  id: string; patientId: string; service: string; practitioner: string | null; examination: string | null;
  scheduledAt: Date; durationMinutes: number; status: ReservationStatus; createdAt: Date; updatedAt: Date;
}
