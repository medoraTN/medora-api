import type { PatientRepository } from "../../domain/repositories/patient.repository";
import type { ReservationRepository } from "../../domain/repositories/reservation.repository";
import { NotFoundError } from "../../domain/errors/not-found-error";
import { ValidationError } from "../../domain/errors/domain-error";
import type { CreateReservationDto } from "../dto/create-reservation.dto";

export class CreateReservationUseCase {
  constructor(
    private readonly reservations: ReservationRepository,
    private readonly patients: PatientRepository,
    private readonly now: () => Date = () => new Date(),
  ) {}

  async execute(input: CreateReservationDto) {
    if (!Number.isFinite(input.scheduledAt.getTime()) || input.scheduledAt <= this.now()) {
      throw new ValidationError("La date de réservation doit être dans le futur.", [
        { field: "scheduledAt", message: "La date de réservation doit être dans le futur." },
      ]);
    }
    if (!await this.patients.findById(input.patientId)) throw new NotFoundError("Patient");

    return this.reservations.create({
      patientId: input.patientId,
      service: input.service,
      practitioner: input.practitioner ?? null,
      examination: input.examination ?? null,
      scheduledAt: input.scheduledAt,
      durationMinutes: input.durationMinutes,
      status: "PENDING",
    });
  }
}
