import type { PatientFields, PatientStatus } from '../domain/entities/patient.entity';
import { DomainError } from '../domain/errors';
import type { PatientListQuery, PatientRepository } from '../domain/repositories/patient.repository';

function requirePatient<T>(patient: T | null): T {
  if (patient === null) throw new DomainError('PATIENT_NOT_FOUND', 'Patient introuvable.');
  return patient;
}

export function patientUseCases(repository: PatientRepository) {
  return {
    create: (fields: PatientFields) => repository.create(fields),
    list: (query: PatientListQuery) => repository.list(query),
    find: async (id: string) => requirePatient(await repository.find(id)),
    update: async (id: string, fields: Partial<PatientFields>) =>
      requirePatient(await repository.update(id, fields)),
    changeStatus: async (id: string, status: PatientStatus, actorId: string) =>
      requirePatient(await repository.changeStatus(id, status, actorId)),
  };
}
