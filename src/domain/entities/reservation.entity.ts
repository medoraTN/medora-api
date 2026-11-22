export type ReservationStatus = "CONFIRMED" | "PENDING" | "CANCELLED";
export interface Reservation {
  id: string; patientId: string; service: string; practitioner: string | null; examination: string | null;
  scheduledAt: Date; durationMinutes: number; status: ReservationStatus; createdAt: Date; updatedAt: Date;
}
