import type { ReservationStatus } from "../entities/reservation.entity";
import { ConflictError } from "./conflict-error";

export class InvalidReservationStatusTransitionError extends ConflictError {
  constructor(from: ReservationStatus, to: ReservationStatus) {
    super(
      `Transition de statut de réservation invalide : ${from} → ${to}.`,
      "INVALID_RESERVATION_STATUS_TRANSITION",
    );
  }
}
