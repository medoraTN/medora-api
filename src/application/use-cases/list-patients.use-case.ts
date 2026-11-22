import type { PatientListQuery, PatientPage, PatientRepository } from "../../domain/repositories/patient.repository";

export class ListPatientsUseCase {
  constructor(private readonly patients: PatientRepository) {}

  execute(query: PatientListQuery): Promise<PatientPage> {
    return this.patients.list({ ...query, search: query.search?.trim() || undefined });
  }
}
