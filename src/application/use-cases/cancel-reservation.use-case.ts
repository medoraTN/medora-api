import type { Reservation } from "../../domain/entities/reservation.entity";
import { InvalidReservationStatusTransitionError } from "../../domain/errors/invalid-reservation-status-transition-error";
import { NotFoundError } from "../../domain/errors/not-found-error";
import type { ReservationRepository } from "../../domain/repositories/reservation.repository";
import { canTransitionReservationStatus } from "../../domain/value-objects/reservation-status.vo";

export class CancelReservationUseCase {
  constructor(private readonly reservations: ReservationRepository) {}

  async execute(id: string): Promise<Reservation> {
    const current = await this.reservations.findById(id);
    if (!current) throw new NotFoundError("Réservation");
    if (!canTransitionReservationStatus(current.status, "CANCELLED")) {
      throw new InvalidReservationStatusTransitionError(current.status, "CANCELLED");
    }
    return this.reservations.updateStatus(id, "CANCELLED");
  }
}
