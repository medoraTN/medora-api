import type { Patient } from "../../domain/entities/patient.entity";
import { NotFoundError } from "../../domain/errors/not-found-error";
import type { PatientRepository } from "../../domain/repositories/patient.repository";

export class GetPatientUseCase {
  constructor(private readonly patients: PatientRepository) {}

  async execute(id: string): Promise<Patient> {
    const patient = await this.patients.findById(id);
    if (!patient) throw new NotFoundError("Patient");
    return patient;
  }
}
