import type { Reservation } from "../../domain/entities/reservation.entity";
import { NotFoundError } from "../../domain/errors/not-found-error";
import type { PatientRepository } from "../../domain/repositories/patient.repository";
import type { ReservationRepository } from "../../domain/repositories/reservation.repository";
import type { CreateReservationDto } from "../dto/create-reservation.dto";

export class CreateReservationUseCase {
  constructor(
    private readonly reservations: ReservationRepository,
    private readonly patients: PatientRepository,
  ) {}

  async execute(input: CreateReservationDto): Promise<Reservation> {
    const patient = await this.patients.findById(input.patientId);
    if (!patient) throw new NotFoundError("Patient");

    return this.reservations.create({
      patientId: input.patientId,
      service: input.service.trim(),
      practitioner: input.practitioner?.trim() || null,
      examination: input.examination?.trim() || null,
      scheduledAt: new Date(input.scheduledAt),
      durationMinutes: input.durationMinutes,
      status: input.status ?? "PENDING",
    });
  }
}
