import { Prisma, type PrismaClient } from "@prisma/client";
import { ConflictError } from "../../../domain/errors/conflict-error";
import type { Unit, UnitKind } from "../../../domain/entities/unit.entity";
import type { CreateUnitRecord, UnitRepository } from "../../../domain/repositories/unit.repository";

export class PrismaUnitRepository implements UnitRepository {
  constructor(private readonly prisma: PrismaClient) {}

  async create(unit: CreateUnitRecord): Promise<Unit> {
    try {
      return await this.prisma.unit.create({ data: unit });
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
        throw new ConflictError("Une unité existe déjà avec ce nom.");
      }
      throw error;
    }
  }

  findById(id: string): Promise<Unit | null> {
    return this.prisma.unit.findUnique({ where: { id } });
  }

  list(kind?: UnitKind): Promise<Unit[]> {
    return this.prisma.unit.findMany({
      ...(kind ? { where: { kind } } : {}),
      orderBy: [{ kind: "asc" }, { name: "asc" }],
    });
  }
}
