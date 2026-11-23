import type { ReservationStatus } from "../entities/reservation.entity";

const ALLOWED_TRANSITIONS: Record<ReservationStatus, readonly ReservationStatus[]> = {
  PENDING: ["CONFIRMED", "CANCELLED"],
  CONFIRMED: ["CANCELLED", "COMPLETED"],
  CANCELLED: [],
  COMPLETED: [],
};

export function canTransitionReservationStatus(from: ReservationStatus, to: ReservationStatus): boolean {
  return ALLOWED_TRANSITIONS[from].includes(to);
}

export function isTerminalReservationStatus(status: ReservationStatus): boolean {
  return ALLOWED_TRANSITIONS[status].length === 0;
}
