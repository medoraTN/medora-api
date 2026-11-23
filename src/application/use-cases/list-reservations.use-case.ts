import type { ReservationListQuery, ReservationRepository } from "../../domain/repositories/reservation.repository";

export class ListReservationsUseCase {
  constructor(private readonly reservations: ReservationRepository) {}

  execute(query: ReservationListQuery) {
    return this.reservations.list(query);
  }
}
