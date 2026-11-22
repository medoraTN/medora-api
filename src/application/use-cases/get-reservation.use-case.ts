import type { Reservation } from "../../domain/entities/reservation.entity";
import { NotFoundError } from "../../domain/errors/not-found-error";
import type { ReservationRepository } from "../../domain/repositories/reservation.repository";

export class GetReservationUseCase {
  constructor(private readonly reservations: ReservationRepository) {}

  async execute(id: string): Promise<Reservation> {
    const reservation = await this.reservations.findById(id);
    if (!reservation) throw new NotFoundError("Réservation");
    return reservation;
  }
}
