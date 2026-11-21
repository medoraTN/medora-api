import type {
  Patient, PatientDetail, PatientFields, PatientStatus, PatientSummary,
} from '../entities/patient.entity';

export interface PatientListQuery {
  search?: string | undefined;
  status?: PatientStatus | undefined;
  page: number;
  pageSize: number;
}

export interface PatientPage {
  items: PatientSummary[];
  total: number;
  page: number;
  pageSize: number;
}

export interface PatientRepository {
  create(fields: PatientFields): Promise<Patient>;
  update(id: string, fields: Partial<PatientFields>): Promise<Patient | null>;
  find(id: string): Promise<PatientDetail | null>;
  list(query: PatientListQuery): Promise<PatientPage>;
  changeStatus(id: string, status: PatientStatus, actorId: string): Promise<Patient | null>;
}
