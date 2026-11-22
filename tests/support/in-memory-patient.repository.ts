import { randomUUID } from "node:crypto";
import type { Patient, PatientStatus } from "../../src/domain/entities/patient.entity";
import { ConflictError } from "../../src/domain/errors/conflict-error";
import type {
  CreatePatientRecord,
  PatientListQuery,
  PatientPage,
  PatientRepository,
} from "../../src/domain/repositories/patient.repository";

export class InMemoryPatientRepository implements PatientRepository {
  private readonly records = new Map<string, Patient>();

  async create(record: CreatePatientRecord): Promise<Patient> {
    if ([...this.records.values()].some((patient) => patient.recordNumber === record.recordNumber)) {
      throw new ConflictError("Un patient existe déjà avec ce numéro de dossier ou ce téléphone.");
    }
    if ([...this.records.values()].some((patient) => patient.phone === record.phone)) {
      throw new ConflictError("Un patient existe déjà avec ce numéro de dossier ou ce téléphone.");
    }
    const now = new Date();
    const patient: Patient = { ...record, id: randomUUID(), createdAt: now, updatedAt: now };
    this.records.set(patient.id, patient);
    return patient;
  }

  async findById(id: string): Promise<Patient | null> {
    return this.records.get(id) ?? null;
  }

  async findByRecordNumber(recordNumber: string): Promise<Patient | null> {
    return [...this.records.values()].find((patient) => patient.recordNumber === recordNumber) ?? null;
  }

  async findByPhone(phone: string): Promise<Patient | null> {
    return [...this.records.values()].find((patient) => patient.phone === phone) ?? null;
  }

  async list(query: PatientListQuery): Promise<PatientPage> {
    const search = query.search?.toLocaleLowerCase();
    const filtered = [...this.records.values()]
      .filter((patient) => !query.status || patient.status === query.status)
      .filter((patient) => !search || [patient.firstName, patient.lastName, patient.recordNumber, patient.phone]
        .some((value) => value.toLocaleLowerCase().includes(search)))
      .sort((a, b) => a.lastName.localeCompare(b.lastName) || a.firstName.localeCompare(b.firstName) || a.id.localeCompare(b.id));
    const start = (query.page - 1) * query.pageSize;
    return {
      items: filtered.slice(start, start + query.pageSize),
      page: query.page,
      pageSize: query.pageSize,
      total: filtered.length,
      totalPages: Math.ceil(filtered.length / query.pageSize),
    };
  }

  async updateStatus(id: string, status: PatientStatus, _changedById: string): Promise<Patient> {
    const patient = this.records.get(id);
    if (!patient) throw new Error("Patient not found in in-memory test repository");
    const updated = { ...patient, status, updatedAt: new Date() };
    this.records.set(id, updated);
    return updated;
  }
}
