import { Prisma, type PrismaClient } from "@prisma/client";
import type { Bed, BedAssignmentEvent, BedStatus } from "../../../domain/entities/bed.entity";
import { ConflictError } from "../../../domain/errors/conflict-error";
import { NotFoundError } from "../../../domain/errors/not-found-error";
import type { BedListQuery, BedRepository, CreateBedRecord } from "../../../domain/repositories/bed.repository";

export class PrismaBedRepository implements BedRepository {
  constructor(private readonly prisma: PrismaClient) {}

  async create(bed: CreateBedRecord): Promise<Bed> {
    try {
      return await this.prisma.bed.create({
        data: {
          unitId: bed.unitId,
          code: bed.code,
          type: bed.type,
          status: bed.status ?? "FREE",
          currentPatientId: bed.currentPatientId ?? null,
        },
      });
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
        throw new ConflictError("Un lit existe déjà avec ce code dans cette unité.");
      }
      throw error;
    }
  }

  findById(id: string): Promise<Bed | null> {
    return this.prisma.bed.findUnique({ where: { id } });
  }

  findByPatientId(patientId: string): Promise<Bed | null> {
    return this.prisma.bed.findFirst({ where: { currentPatientId: patientId } });
  }

  list(query: BedListQuery = {}): Promise<Bed[]> {
    return this.prisma.bed.findMany({
      where: {
        ...(query.unitId ? { unitId: query.unitId } : {}),
        ...(query.status ? { status: query.status } : {}),
        ...(query.unitKind ? { unit: { kind: query.unitKind } } : {}),
      },
      orderBy: [{ unitId: "asc" }, { code: "asc" }],
    });
  }

  async updateStatus(id: string, status: BedStatus): Promise<Bed> {
    try {
      return await this.prisma.bed.update({ where: { id }, data: { status } });
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2025") {
        throw new NotFoundError("Lit");
      }
      throw error;
    }
  }

  assignPatient(bedId: string, patientId: string, actorUserId: string): Promise<Bed> {
    return this.prisma.$transaction(async (tx) => {
      const updated = await tx.bed.updateMany({
        where: {
          id: bedId,
          currentPatientId: null,
          status: { in: ["FREE", "RESERVED"] },
        },
        data: { status: "OCCUPIED", currentPatientId: patientId },
      });
      if (updated.count !== 1) {
        const bed = await tx.bed.findUnique({ where: { id: bedId } });
        if (!bed) throw new NotFoundError("Lit");
        throw new ConflictError("Ce lit n’est pas disponible pour une attribution.", "BED_NOT_AVAILABLE");
      }
      await tx.bedAssignmentHistory.create({
        data: {
          bedId,
          patientId,
          event: "ASSIGNED",
          toBedId: bedId,
          actorUserId,
        },
      });
      const bed = await tx.bed.findUnique({ where: { id: bedId } });
      if (!bed) throw new NotFoundError("Lit");
      return bed;
    });
  }

  transferPatient(fromBedId: string, toBedId: string, actorUserId: string): Promise<{ from: Bed; to: Bed }> {
    return this.prisma.$transaction(async (tx) => {
      const from = await tx.bed.findUnique({ where: { id: fromBedId } });
      if (!from) throw new NotFoundError("Lit");
      if (from.status !== "OCCUPIED" || !from.currentPatientId) {
        throw new ConflictError("Aucun patient à transférer depuis ce lit.", "BED_NOT_OCCUPIED");
      }
      const patientId = from.currentPatientId;

      const released = await tx.bed.updateMany({
        where: { id: fromBedId, currentPatientId: patientId, status: "OCCUPIED" },
        data: { status: "FREE", currentPatientId: null },
      });
      if (released.count !== 1) {
        throw new ConflictError("Aucun patient à transférer depuis ce lit.", "BED_NOT_OCCUPIED");
      }

      const occupied = await tx.bed.updateMany({
        where: {
          id: toBedId,
          currentPatientId: null,
          status: { in: ["FREE", "RESERVED"] },
        },
        data: { status: "OCCUPIED", currentPatientId: patientId },
      });
      if (occupied.count !== 1) {
        throw new ConflictError("Le lit de destination n’est pas disponible.", "BED_NOT_AVAILABLE");
      }

      await tx.bedAssignmentHistory.create({
        data: {
          bedId: toBedId,
          patientId,
          event: "TRANSFERRED",
          fromBedId,
          toBedId,
          actorUserId,
        },
      });

      const [fromBed, toBed] = await Promise.all([
        tx.bed.findUnique({ where: { id: fromBedId } }),
        tx.bed.findUnique({ where: { id: toBedId } }),
      ]);
      if (!fromBed || !toBed) throw new NotFoundError("Lit");
      return { from: fromBed, to: toBed };
    });
  }

  releasePatient(bedId: string, actorUserId: string): Promise<Bed> {
    return this.prisma.$transaction(async (tx) => {
      const bed = await tx.bed.findUnique({ where: { id: bedId } });
      if (!bed) throw new NotFoundError("Lit");
      if (bed.status !== "OCCUPIED" || !bed.currentPatientId) {
        throw new ConflictError("Ce lit n’est pas occupé.", "BED_NOT_OCCUPIED");
      }
      const patientId = bed.currentPatientId;
      const released = await tx.bed.updateMany({
        where: { id: bedId, currentPatientId: patientId, status: "OCCUPIED" },
        data: { status: "FREE", currentPatientId: null },
      });
      if (released.count !== 1) {
        throw new ConflictError("Ce lit n’est pas occupé.", "BED_NOT_OCCUPIED");
      }
      await tx.bedAssignmentHistory.create({
        data: {
          bedId,
          patientId,
          event: "RELEASED",
          fromBedId: bedId,
          actorUserId,
        },
      });
      const updated = await tx.bed.findUnique({ where: { id: bedId } });
      if (!updated) throw new NotFoundError("Lit");
      return updated;
    });
  }

  listHistory(bedId: string): Promise<BedAssignmentEvent[]> {
    return this.prisma.bedAssignmentHistory.findMany({
      where: {
        OR: [{ bedId }, { fromBedId: bedId }, { toBedId: bedId }],
      },
      orderBy: { createdAt: "desc" },
    });
  }
}
