import { ConflictError } from "../../domain/errors/conflict-error";
import { NotFoundError } from "../../domain/errors/not-found-error";
import { ValidationError } from "../../domain/errors/domain-error";
import type { ReservationRepository, UpdateReservationRecord } from "../../domain/repositories/reservation.repository";
import { canTransitionReservationStatus, isTerminalReservationStatus } from "../../domain/value-objects/reservation-status.vo";

export class UpdateReservationUseCase {
  constructor(
    private readonly reservations: ReservationRepository,
    private readonly now: () => Date = () => new Date(),
  ) {}

  async execute(id: string, update: UpdateReservationRecord) {
    const current = await this.reservations.findById(id);
    if (!current) throw new NotFoundError("Réservation");

    if (isTerminalReservationStatus(current.status)) {
      throw new ConflictError("Une réservation annulée ou terminée ne peut plus être modifiée.", "INVALID_RESERVATION_TRANSITION");
    }
    if (update.scheduledAt && (!Number.isFinite(update.scheduledAt.getTime()) || update.scheduledAt <= this.now())) {
      throw new ValidationError("La date de réservation doit être dans le futur.", [
        { field: "scheduledAt", message: "La date de réservation doit être dans le futur." },
      ]);
    }
    if (update.status && update.status !== current.status && !canTransitionReservationStatus(current.status, update.status)) {
      throw new ConflictError(
        `Transition de réservation impossible : ${current.status} → ${update.status}.`,
        "INVALID_RESERVATION_TRANSITION",
      );
    }
    return this.reservations.update(id, update);
  }
}
