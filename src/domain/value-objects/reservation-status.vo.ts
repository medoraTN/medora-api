import type { ReservationStatus } from "../entities/reservation.entity";

/** Cancelled reservations are terminal; active ones may move between PENDING and CONFIRMED or be cancelled. */
export function canTransitionReservationStatus(
  from: ReservationStatus,
  to: ReservationStatus,
): boolean {
  if (from === to) return false;
  if (from === "CANCELLED") return false;
  if (to === "CANCELLED") return true;
  return (from === "PENDING" && to === "CONFIRMED") || (from === "CONFIRMED" && to === "PENDING");
}
