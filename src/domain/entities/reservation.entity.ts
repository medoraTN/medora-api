export const RESERVATION_STATUSES = ["CONFIRMED", "PENDING", "CANCELLED"] as const;
export type ReservationStatus = (typeof RESERVATION_STATUSES)[number];

export function isReservationStatus(value: unknown): value is ReservationStatus {
  return typeof value === "string" && (RESERVATION_STATUSES as readonly string[]).includes(value);
}

export interface Reservation {
  id: string;
  patientId: string;
  service: string;
  practitioner: string | null;
  examination: string | null;
  scheduledAt: Date;
  durationMinutes: number;
  status: ReservationStatus;
  createdAt: Date;
  updatedAt: Date;
}
