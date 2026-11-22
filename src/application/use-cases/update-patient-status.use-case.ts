import type { Patient, PatientStatus } from "../../domain/entities/patient.entity";
import { InvalidPatientStatusTransitionError } from "../../domain/errors/invalid-patient-status-transition-error";
import { NotFoundError } from "../../domain/errors/not-found-error";
import type { PatientRepository } from "../../domain/repositories/patient.repository";
import { canTransitionPatientStatus } from "../../domain/value-objects/patient-status.vo";

export class UpdatePatientStatusUseCase {
  constructor(private readonly patients: PatientRepository) {}

  async execute(id: string, status: PatientStatus, changedById: string): Promise<Patient> {
    const patient = await this.patients.findById(id);
    if (!patient) throw new NotFoundError("Patient");
    if (!canTransitionPatientStatus(patient.status, status)) {
      throw new InvalidPatientStatusTransitionError(patient.status, status);
    }
    return this.patients.updateStatus(id, patient.status, status, changedById);
  }
}
