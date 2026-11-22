import type { Reservation } from "../../domain/entities/reservation.entity";
import { InvalidReservationStatusTransitionError } from "../../domain/errors/invalid-reservation-status-transition-error";
import { NotFoundError } from "../../domain/errors/not-found-error";
import type { ReservationRepository } from "../../domain/repositories/reservation.repository";
import { canTransitionReservationStatus } from "../../domain/value-objects/reservation-status.vo";
import type { UpdateReservationDto } from "../dto/create-reservation.dto";

export class UpdateReservationUseCase {
  constructor(private readonly reservations: ReservationRepository) {}

  async execute(id: string, input: UpdateReservationDto): Promise<Reservation> {
    const current = await this.reservations.findById(id);
    if (!current) throw new NotFoundError("Réservation");
    if (current.status === "CANCELLED") {
      throw new InvalidReservationStatusTransitionError(current.status, input.status ?? current.status);
    }

    if (input.status && input.status !== current.status) {
      if (!canTransitionReservationStatus(current.status, input.status)) {
        throw new InvalidReservationStatusTransitionError(current.status, input.status);
      }
    }

    return this.reservations.update(id, {
      ...(input.service !== undefined ? { service: input.service.trim() } : {}),
      ...(input.practitioner !== undefined ? { practitioner: input.practitioner?.trim() || null } : {}),
      ...(input.examination !== undefined ? { examination: input.examination?.trim() || null } : {}),
      ...(input.scheduledAt !== undefined ? { scheduledAt: new Date(input.scheduledAt) } : {}),
      ...(input.durationMinutes !== undefined ? { durationMinutes: input.durationMinutes } : {}),
      ...(input.status !== undefined ? { status: input.status } : {}),
    });
  }
}
