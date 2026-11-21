import { Prisma, type PrismaClient } from '@prisma/client';
import { isStatusChange, type PatientFields, type PatientStatus } from '../../../domain/entities/patient.entity';
import { DomainError } from '../../../domain/errors';
import type { PatientListQuery, PatientRepository } from '../../../domain/repositories/patient.repository';

function isPrismaError(error: unknown, code: string) {
  return error instanceof Prisma.PrismaClientKnownRequestError && error.code === code;
}

export class PrismaPatientRepository implements PatientRepository {
  constructor(private readonly db: PrismaClient) {}

  async create(fields: PatientFields) {
    try {
      return await this.db.patient.create({ data: fields });
    } catch (error) {
      if (isPrismaError(error, 'P2002')) {
        throw new DomainError('DUPLICATE_RECORD', 'Ce numéro de dossier existe déjà.');
      }
      throw error;
    }
  }

  async update(id: string, fields: Partial<PatientFields>) {
    try {
      return await this.db.patient.update({ where: { id }, data: fields });
    } catch (error) {
      if (isPrismaError(error, 'P2025')) return null;
      if (isPrismaError(error, 'P2002')) {
        throw new DomainError('DUPLICATE_RECORD', 'Ce numéro de dossier existe déjà.');
      }
      throw error;
    }
  }

  find(id: string) {
    return this.db.patient.findUnique({
      where: { id },
      include: {
        statusHistory: {
          orderBy: [{ changedAt: 'desc' }, { id: 'desc' }],
          include: { actor: { select: { email: true } } },
        },
      },
    });
  }

  async list({ page, pageSize, search, status }: PatientListQuery) {
    const where: Prisma.PatientWhereInput = status ? { status } : {};
    if (search) {
      where.OR = [
        { id: { equals: search } },
        {
          AND: search.split(/\s+/).map((part) => ({
            OR: [
              { firstName: { contains: part, mode: 'insensitive' } },
              { lastName: { contains: part, mode: 'insensitive' } },
            ],
          })),
        },
        { recordNumber: { contains: search, mode: 'insensitive' } },
        { phone: { contains: search } },
      ];
    }
    const [items, total] = await this.db.$transaction([
      this.db.patient.findMany({
        where,
        select: {
          id: true, firstName: true, lastName: true, recordNumber: true,
          phone: true, priority: true, status: true,
        },
        orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      this.db.patient.count({ where }),
    ], { isolationLevel: 'RepeatableRead' });
    return { items, total, page, pageSize };
  }

  changeStatus(id: string, status: PatientStatus, actorId: string) {
    return this.db.$transaction(async (tx) => {
      const current = await tx.patient.findUnique({ where: { id } });
      if (!current) return null;
      if (!isStatusChange(current.status, status)) {
        throw new DomainError('UNCHANGED_STATUS', 'Le nouveau statut doit être différent.');
      }
      const updated = await tx.patient.updateMany({
        where: { id, status: current.status },
        data: { status },
      });
      if (updated.count === 0) {
        throw new DomainError('STATUS_CONFLICT', 'Le statut a changé. Rechargez la fiche.');
      }
      await tx.patientStatusChange.create({
        data: { patientId: id, actorId, previousStatus: current.status, nextStatus: status },
      });
      return tx.patient.findUniqueOrThrow({ where: { id } });
    });
  }
}
