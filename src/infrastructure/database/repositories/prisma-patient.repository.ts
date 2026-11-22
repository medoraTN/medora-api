import { Prisma, type PrismaClient } from "@prisma/client";
import { ConflictError } from "../../../domain/errors/conflict-error";
import { InvalidPatientStatusTransitionError } from "../../../domain/errors/invalid-patient-status-transition-error";
import { NotFoundError } from "../../../domain/errors/not-found-error";
import type { Patient, PatientStatus } from "../../../domain/entities/patient.entity";
import type {
  CreatePatientRecord,
  PatientListQuery,
  PatientPage,
  PatientRepository,
} from "../../../domain/repositories/patient.repository";

export class PrismaPatientRepository implements PatientRepository {
  constructor(private readonly prisma: PrismaClient) {}
  async create(patient: CreatePatientRecord): Promise<Patient> {
    try {
      return await this.prisma.patient.create({ data: patient });
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
        throw new ConflictError("Un patient existe déjà avec ce numéro de dossier ou ce téléphone.");
      }
      throw error;
    }
  }
  findById(id: string): Promise<Patient | null> { return this.prisma.patient.findUnique({ where: { id } }); }
  findByRecordNumber(recordNumber: string): Promise<Patient | null> {
    return this.prisma.patient.findUnique({ where: { recordNumber } });
  }
  findByPhone(phone: string): Promise<Patient | null> { return this.prisma.patient.findUnique({ where: { phone } }); }
  async list(query: PatientListQuery): Promise<PatientPage> {
    const where: Prisma.PatientWhereInput = {
      ...(query.status ? { status: query.status } : {}),
      ...(query.search
        ? {
            OR: [
              { firstName: { contains: query.search, mode: "insensitive" } },
              { lastName: { contains: query.search, mode: "insensitive" } },
              { recordNumber: { contains: query.search, mode: "insensitive" } },
              { phone: { contains: query.search } },
            ],
          }
        : {}),
    };
    const [items, total] = await this.prisma.$transaction([
      this.prisma.patient.findMany({
        where,
        skip: (query.page - 1) * query.pageSize,
        take: query.pageSize,
        orderBy: [{ lastName: "asc" }, { firstName: "asc" }, { id: "asc" }],
      }),
      this.prisma.patient.count({ where }),
    ]);
    return { items, page: query.page, pageSize: query.pageSize, total, totalPages: Math.ceil(total / query.pageSize) };
  }
  updateStatus(id: string, expectedStatus: PatientStatus, status: PatientStatus, changedById: string): Promise<Patient> {
    return this.prisma.$transaction(async (tx) => {
      const update = await tx.patient.updateMany({ where: { id, status: expectedStatus }, data: { status } });
      if (update.count !== 1) {
        const current = await tx.patient.findUnique({ where: { id }, select: { status: true } });
        if (!current) throw new NotFoundError("Patient");
        throw new InvalidPatientStatusTransitionError(current.status, status);
      }
      await tx.patientStatusHistory.create({
        data: { patientId: id, previousStatus: expectedStatus, status, changedById },
      });
      const patient = await tx.patient.findUnique({ where: { id } });
      if (!patient) throw new NotFoundError("Patient");
      return patient;
    });
  }
}
