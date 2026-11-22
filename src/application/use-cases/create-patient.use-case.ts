import type { Patient } from "../../domain/entities/patient.entity";
import type { PatientRepository } from "../../domain/repositories/patient.repository";
import type { CreatePatientDto } from "../dto/create-patient.dto";

export class CreatePatientUseCase {
  constructor(private readonly patients: PatientRepository) {}

  execute(input: CreatePatientDto): Promise<Patient> {
    return this.patients.create({
      recordNumber: input.recordNumber.trim(),
      firstName: input.firstName.trim(),
      lastName: input.lastName.trim(),
      dateOfBirth: new Date(input.dateOfBirth),
      sex: input.sex ?? "UNKNOWN",
      phone: input.phone.trim(),
      address: input.address?.trim() || null,
      arrivalReason: input.arrivalReason.trim(),
      urgencyLevel: input.urgencyLevel,
      status: "WAITING",
      internalNotes: input.internalNotes?.trim() || null,
    });
  }
}
