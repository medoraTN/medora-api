import { ConflictError } from "../../domain/errors/conflict-error";
import { NotFoundError } from "../../domain/errors/not-found-error";
import type { ReservationRepository } from "../../domain/repositories/reservation.repository";

export class CancelReservationUseCase {
  constructor(private readonly reservations: ReservationRepository) {}

  async execute(id: string) {
    const reservation = await this.reservations.findById(id);
    if (!reservation) throw new NotFoundError("Réservation");
    if (reservation.status === "CANCELLED") return reservation;
    if (reservation.status === "COMPLETED") {
      throw new ConflictError("Une réservation terminée ne peut pas être annulée.", "INVALID_RESERVATION_TRANSITION");
    }
    return this.reservations.updateStatus(id, "CANCELLED");
  }
}
